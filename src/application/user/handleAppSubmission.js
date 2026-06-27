const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const ApplicationConfig     = require('../../models/ApplicationConfig');
const ApplicationSubmission = require('../../models/ApplicationSubmission');
const { FOOTER } = require('../design/appEditorBuilder');

// ── Shared error helper ───────────────────────────────────────────────────────
function err(interaction, desc) {
  const method = interaction.deferred || interaction.replied ? 'followUp' : 'reply';
  return interaction[method]({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor('Red').setDescription(desc).setFooter(FOOTER)]
  });
}

// ── Generate short submission ID ──────────────────────────────────────────────
function genSubId() {
  return `SUB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ── Permission check: admin OR support role ───────────────────────────────────
function hasReviewPermission(interaction, config) {
  if (interaction.member.permissions.has('Administrator')) return true;
  if (config.supportRoleId && interaction.member.roles.cache.has(config.supportRoleId)) return true;
  return false;
}

// ── Safe answer truncation — keeps embed under Discord's 6000 char total limit ─
function safeAnswers(answers) {
  // Each answer: 256 (question name) + 1024 (value) max per field
  // With 5 questions max, cap each answer at 900 chars to stay safe
  return answers.map(qa => ({
    question: qa.question.slice(0, 100),
    answer:   (qa.answer || '*No answer*').slice(0, 900)
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — User clicks button or picks from select menu → open question modal
// ══════════════════════════════════════════════════════════════════════════════
async function handleApplyTrigger(interaction, appId) {
  try {
    const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });

    if (!config || !config.isLive) {
      return err(interaction, '❌ The application system is not currently active.');
    }

    const app = config.applications.find(a => a.id === appId);
    if (!app) {
      return err(interaction, '❌ This application no longer exists. The panel may be outdated.');
    }

    if (app.questions.length === 0) {
      return err(interaction, '❌ This application has no questions configured.');
    }

    // ── Duplicate / cooldown check ────────────────────────────────────────────
    const existing = await ApplicationSubmission.findOne({
      guildId:       interaction.guild.id,
      userId:        interaction.user.id,
      applicationId: app.id
    }).sort({ submittedAt: -1 });

    if (existing) {
      // Block if PENDING
      if (existing.status === 'PENDING') {
        return err(interaction,
          `❌ **Application Already Pending**\n\n` +
          `You already have a pending application for **${app.label}**.\n` +
          `**ID:** \`${existing.appId}\`\n\n` +
          `Please wait for it to be reviewed before applying again.`
        );
      }

      // Block if within cooldown window
      const cooldownMs = (app.cooldownHours || 24) * 60 * 60 * 1000;
      const elapsed    = Date.now() - new Date(existing.submittedAt).getTime();

      if (elapsed < cooldownMs) {
        const remaining   = cooldownMs - elapsed;
        const hoursLeft   = Math.ceil(remaining / (1000 * 60 * 60));
        const unixExpires = Math.floor((Date.now() + remaining) / 1000);
        return err(interaction,
          `❌ **Cooldown Active**\n\n` +
          `You can reapply for **${app.label}** <t:${unixExpires}:R>.\n` +
          `*(${hoursLeft}h remaining)*`
        );
      }
    }

    // Build modal from questions (max 5 — Discord limit)
    const modal = new ModalBuilder()
      .setCustomId(`app:submit:${app.id}`)
      .setTitle(app.label.slice(0, 45));

    for (const q of app.questions.slice(0, 5)) {
      const input = new TextInputBuilder()
        .setCustomId(q.id)
        .setLabel(q.label.slice(0, 45))
        .setStyle(q.style === 'short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
        .setRequired(q.required);

      if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100));
      modal.addComponents(new ActionRowBuilder().addComponents(input));
    }

    return interaction.showModal(modal);

  } catch (e) {
    console.error('[AppSubmit] handleApplyTrigger error:', e);
    return err(interaction, '❌ Something went wrong. Please try again.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — User submits modal → post review embed + ping support role
// ══════════════════════════════════════════════════════════════════════════════
async function handleModalSubmit(interaction) {
  try {
    const appId = interaction.customId.split(':')[2];

    await interaction.deferReply({ ephemeral: true });

    const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
    if (!config) return err(interaction, '❌ Application system not configured.');

    const app = config.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found. The panel may be outdated.');

    // Collect + truncate answers
    const answers = safeAnswers(app.questions.map(q => ({
      question: q.label,
      answer:   interaction.fields.getTextInputValue(q.id) || '*No answer provided*'
    })));

    const subId = genSubId();

    // Fetch review channel
    const reviewChannel = interaction.guild.channels.cache.get(config.reviewChannelId)
      || await interaction.guild.channels.fetch(config.reviewChannelId).catch(() => null);

    if (!reviewChannel) {
      return err(interaction, '❌ Review channel not found. Please contact an administrator.');
    }

    // Build review embed
    const reviewEmbed = buildReviewEmbed(interaction.user, app, subId, answers, 'PENDING');

    // Accept / Reject buttons
    const reviewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`app:accept:${subId}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`app:reject:${subId}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger)
    );

    // Ping support role if configured
    const pingContent = config.supportRoleId
      ? `<@&${config.supportRoleId}> — New application received!`
      : null;

    const reviewMsg = await reviewChannel.send({
      content:    pingContent,
      embeds:     [reviewEmbed],
      components: [reviewRow]
    });

    // Save to DB
    await ApplicationSubmission.create({
      appId:            subId,
      guildId:          interaction.guild.id,
      userId:           interaction.user.id,
      applicationId:    app.id,
      applicationLabel: app.label,
      answers,
      reviewMessageId:  reviewMsg.id,
      reviewChannelId:  reviewChannel.id,
      submittedAt:      new Date()
    });

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('Green')
        .setTitle('✅ Application Submitted')
        .setDescription(
          `Your application for **${app.label}** has been submitted!\n\n` +
          `**Application ID:** \`${subId}\`\n` +
          `Our team will review it shortly. You will be notified via DM.`
        ).setFooter(FOOTER)]
    });

  } catch (e) {
    console.error('[AppSubmit] handleModalSubmit error:', e);
    return err(interaction, '❌ Failed to submit application. Please try again.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3A — Reviewer clicks Accept
// ══════════════════════════════════════════════════════════════════════════════
async function handleAccept(interaction, subId) {
  try {
    const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
    if (!config) return err(interaction, '❌ Application system not configured.');

    if (!hasReviewPermission(interaction, config)) {
      return err(interaction, '❌ You do not have permission to review applications.\nOnly **Administrators** and the **Support Role** can accept or reject.');
    }

    // ── Atomic lock — prevents race condition if two mods click at once ───────
    const submission = await ApplicationSubmission.findOneAndUpdate(
      { appId: subId, status: 'PENDING', locked: false },
      { $set: { locked: true } },
      { new: true }
    );

    if (!submission) {
      // Either not found, already decided, or another mod got there first
      const check = await ApplicationSubmission.findOne({ appId: subId });
      if (!check) return err(interaction, '❌ Submission not found.');
      return err(interaction, `❌ This application has already been **${check.status.toLowerCase()}**.`);
    }

    // Grant role if configured
    const appDef = config.applications.find(a => a.id === submission.applicationId);
    let roleGranted = null;

    if (appDef?.roleId) {
      const role = interaction.guild.roles.cache.get(appDef.roleId)
        || await interaction.guild.roles.fetch(appDef.roleId).catch(() => null);
      if (role) {
        const member = interaction.guild.members.cache.get(submission.userId)
          || await interaction.guild.members.fetch(submission.userId).catch(() => null);
        if (member) {
          await member.roles.add(role).catch(() => {});
          roleGranted = role.id;
        }
      }
    }

    // Save final state
    submission.status      = 'ACCEPTED';
    submission.reviewedBy  = interaction.user.id;
    submission.reviewedAt  = new Date();
    submission.roleGranted = roleGranted;
    submission.locked      = false;
    await submission.save();

    // Edit review embed in-place
    const finalEmbed = buildReviewEmbed(
      { id: submission.userId },
      { label: submission.applicationLabel },
      subId,
      submission.answers,
      'ACCEPTED',
      { reviewerId: interaction.user.id, roleGranted }
    );

    await interaction.message.edit({ embeds: [finalEmbed], components: [] });

    // DM applicant
    const applicant = await interaction.client.users.fetch(submission.userId).catch(() => null);
    if (applicant) {
      applicant.send({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle('✅ Application Accepted!')
          .setDescription(
            `Your application for **${submission.applicationLabel}** has been **accepted**!\n\n` +
            `**Application ID:** \`${subId}\`` +
            (roleGranted ? `\n**Role Granted:** <@&${roleGranted}>` : '') +
            `\n\nCongratulations! Welcome to the team.`
          ).setFooter(FOOTER).setTimestamp()]
      }).catch(() => {});
    }

    return interaction.reply({
      ephemeral: true,
      embeds: [new EmbedBuilder().setColor('Green')
        .setDescription(`✅ Application \`${subId}\` accepted.${roleGranted ? ` Role <@&${roleGranted}> granted.` : ''}`)
        .setFooter(FOOTER)]
    });

  } catch (e) {
    console.error('[AppSubmit] handleAccept error:', e);
    // Release lock if something crashed mid-way
    await ApplicationSubmission.updateOne({ appId: subId }, { $set: { locked: false } }).catch(() => {});
    return err(interaction, '❌ Failed to accept application.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3B — Reviewer clicks Reject → opens reason modal
// ══════════════════════════════════════════════════════════════════════════════
async function handleRejectButton(interaction, subId) {
  try {
    const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
    if (!config) return err(interaction, '❌ Application system not configured.');

    if (!hasReviewPermission(interaction, config)) {
      return err(interaction, '❌ You do not have permission to review applications.\nOnly **Administrators** and the **Support Role** can accept or reject.');
    }

    const submission = await ApplicationSubmission.findOne({ appId: subId });
    if (!submission) return err(interaction, '❌ Submission not found.');
    if (submission.status !== 'PENDING') {
      return err(interaction, `❌ This application has already been **${submission.status.toLowerCase()}**.`);
    }

    const { showRejectReasonModal } = require('../design/appModals');
    return showRejectReasonModal(interaction, subId);

  } catch (e) {
    console.error('[AppSubmit] handleRejectButton error:', e);
    return err(interaction, '❌ Something went wrong. Please try again.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3C — Reject reason modal submitted
// ══════════════════════════════════════════════════════════════════════════════
async function handleRejectModal(interaction, subId) {
  try {
    const reason = interaction.fields.getTextInputValue('reason').trim();

    await interaction.deferReply({ ephemeral: true });

    // ── Atomic lock ───────────────────────────────────────────────────────────
    const submission = await ApplicationSubmission.findOneAndUpdate(
      { appId: subId, status: 'PENDING', locked: false },
      { $set: { locked: true } },
      { new: true }
    );

    if (!submission) {
      const check = await ApplicationSubmission.findOne({ appId: subId });
      if (!check) return err(interaction, '❌ Submission not found.');
      return err(interaction, `❌ This application has already been **${check.status.toLowerCase()}**.`);
    }

    submission.status       = 'REJECTED';
    submission.reviewedBy   = interaction.user.id;
    submission.reviewedAt   = new Date();
    submission.rejectReason = reason;
    submission.locked       = false;
    await submission.save();

    // Edit review message in-place
    const reviewChannel = interaction.guild.channels.cache.get(submission.reviewChannelId)
      || await interaction.guild.channels.fetch(submission.reviewChannelId).catch(() => null);

    if (reviewChannel) {
      const reviewMsg = await reviewChannel.messages.fetch(submission.reviewMessageId).catch(() => null);
      if (reviewMsg) {
        const finalEmbed = buildReviewEmbed(
          { id: submission.userId },
          { label: submission.applicationLabel },
          subId,
          submission.answers,
          'REJECTED',
          { reviewerId: interaction.user.id, rejectReason: reason }
        );
        await reviewMsg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
      }
    }

    // DM applicant
    const applicant = await interaction.client.users.fetch(submission.userId).catch(() => null);
    if (applicant) {
      applicant.send({
        embeds: [new EmbedBuilder().setColor('Red')
          .setTitle('❌ Application Rejected')
          .setDescription(
            `Your application for **${submission.applicationLabel}** has been **rejected**.\n\n` +
            `**Application ID:** \`${subId}\`\n` +
            `**Reason:** ${reason}`
          ).setFooter(FOOTER).setTimestamp()]
      }).catch(() => {});
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('Orange')
        .setDescription(`❌ Application \`${subId}\` rejected.`)
        .setFooter(FOOTER)]
    });

  } catch (e) {
    console.error('[AppSubmit] handleRejectModal error:', e);
    await ApplicationSubmission.updateOne({ appId: subId }, { $set: { locked: false } }).catch(() => {});
    return err(interaction, '❌ Failed to reject application.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REVIEW EMBED — permanent audit record
// ══════════════════════════════════════════════════════════════════════════════
function buildReviewEmbed(user, app, subId, answers, status, extras = {}) {
  const statusConfig = {
    PENDING:  { color: 0x5865F2, label: '⏳ Pending Review' },
    ACCEPTED: { color: 0x57F287, label: '✅ Accepted'        },
    REJECTED: { color: 0xED4245, label: '❌ Rejected'        }
  }[status] || { color: 0x5865F2, label: '⏳ Pending' };

  const embed = new EmbedBuilder()
    .setColor(statusConfig.color)
    .setTitle(`📋 Application — ${app.label}`)
    .setFooter(FOOTER)
    .setTimestamp();

  embed.addFields(
    { name: '👤 Applicant',      value: `<@${user.id}>`,    inline: true },
    { name: '🆔 Application ID', value: `\`${subId}\``,     inline: true },
    { name: '📊 Status',         value: statusConfig.label, inline: true }
  );

  if (extras.reviewerId)  embed.addFields({ name: '🛠️ Reviewed By',     value: `<@${extras.reviewerId}>`,   inline: true });
  if (extras.roleGranted) embed.addFields({ name: '🎭 Role Granted',     value: `<@&${extras.roleGranted}>`, inline: true });
  if (extras.rejectReason)embed.addFields({ name: '💬 Rejection Reason', value: extras.rejectReason,         inline: false });

  embed.addFields({ name: '━━━━━━━━━━━━━━━━━━━━━━━━━━', value: '** **', inline: false });

  for (const qa of safeAnswers(answers)) {
    embed.addFields({
      name:  `❓ ${qa.question.slice(0, 100)}`,
      value: qa.answer || '*No answer*',
      inline: false
    });
  }

  return embed;
}

module.exports = {
  handleApplyTrigger,
  handleModalSubmit,
  handleAccept,
  handleRejectButton,
  handleRejectModal
};
