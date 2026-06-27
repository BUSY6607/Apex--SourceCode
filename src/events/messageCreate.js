const { EmbedBuilder, AttachmentBuilder, Events } = require(`discord.js`);
const axios               = require(`axios`);
const ReportConfig        = require(`../models/ReportConfig`);
const Report              = require(`../models/Report`);
const { reportBuffers }   = require(`../utils/reportBuffer`);
const sendReportToReview  = require(`../utils/sendReportToReview`);
const { getState, resetTimeout } = require(`../utils/ticketState`);

// ── Application emoji capture ──────────────────────────────────────────────────
const { getAppState, resetAppTimeout } = require(`../utils/appState`);
const {
  buildAppEditorEmbed,
  buildAppEditorComponents,
  FOOTER: APP_FOOTER
} = require(`../application/design/appEditorBuilder`);

// ── Auto-Censor & Auto-Responder engines ─────────────────────────────────
const handleCensor        = require(`../utils/censorEngine`);
const handleAutoResponder = require(`../utils/autoResponderEngine`);
const trackChannelActivity = require(`../utils/trackChannelActivity`);

module.exports = {

  name: `messageCreate`,

  async execute(message) {

    if (!message.guild || message.author.bot) return;

    /*AUTO-CENSOR  (runs first — if message is deleted, stop here) */
    const wasCensored = await handleCensor(message);
    if (wasCensored) return; // message deleted, nothing else to do

    /*CHAT REACTIVITY  (track activity for inactivity monitors)*/
    trackChannelActivity(message); // fire-and-forget, non-blocking

    /*AUTO-RESPONDER*/
    await handleAutoResponder(message);

    /*TICKET EDITOR IMAGE HANDLER*/
    const config = await ReportConfig.findOne({ guildId: message.guild.id });
    const state  = getState(message.guild.id);

    if (
      state &&
      message.author.id === state.adminId &&
      message.channel.id !== config?.reportChannelId
    ) {
      resetTimeout(state, () => {});

      // REMOVE IMAGE
      if (message.content?.toLowerCase() === `remove`) {
        state.embed.image = null;
      }
      // IMAGE ATTACHMENT
      else if (message.attachments.size > 0) {
        const att = message.attachments.first();
        if (!att.contentType?.startsWith(`image/`)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(`Red`)
                .setDescription(`❌ Please upload a valid image.`)
                .setFooter({ text: `Apex • Ticket System` })
            ]
          });
        }
        state.embed.image = att.url;
      }
      // IMAGE URL
      else if (message.content.startsWith(`http`)) {
        state.embed.image = message.content;
      } else {
        return;
      }

      const preview = new EmbedBuilder()
        .setColor(state.embed.color || `Blue`)
        .setTitle(state.embed.title)
        .setDescription(state.embed.description)
        .setFooter({ text: `Apex • Ticket System` });

      if (state.embed.image) preview.setImage(state.embed.image);

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Green`)
            .setDescription(`✅ Panel image updated.`)
            .setFooter({ text: `Apex • Ticket System` })
        ]
      });

      try {
        const editorMsg = await message.channel.messages.fetch(state.messageId);
        await editorMsg.edit({ embeds: [preview] });
      } catch {}

      return;
    }

    /*APPLICATION EMOJI CAPTURE  (message-based emoji input)*/
    const appState = getAppState(message.guild.id);

    if (
      appState &&
      appState.pendingEmoji &&
      message.author.id === appState.adminId
    ) {
      const { appId, editorMessageId } = appState.pendingEmoji;
      const content = message.content.trim();

      // Clear pending state immediately
      appState.pendingEmoji = null;
      resetAppTimeout(appState, () => {});

      const app = appState.applications.find(a => a.id === appId);

      if (!app) {
        await message.reply({
          embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Application not found. Editor may have changed.').setFooter(APP_FOOTER)]
        });
        return;
      }

      // Handle remove
      if (content.toLowerCase() === 'remove') {
        app.emoji = null;
      } else {
        // Extract emoji from message
        // Custom emoji: <:name:id> or <a:name:id>
        const customMatch = content.match(/<a?:\w+:\d+>/);
        if (customMatch) {
          app.emoji = customMatch[0];
        } else {
          // Unicode emoji — grab first emoji character(s)
          const unicodeMatch = content.match(/\p{Emoji}/u);
          if (unicodeMatch) {
            app.emoji = unicodeMatch[0];
          } else {
            await message.reply({
              embeds: [new EmbedBuilder().setColor('Red')
                .setDescription('❌ Could not detect a valid emoji.\n\nSend a unicode emoji like `🎮` or a server emoji like `:youtube:`.')
                .setFooter(APP_FOOTER)]
            });
            return;
          }
        }
      }

      // Delete the admin's message to keep channel clean
      await message.delete().catch(() => {});

      // Update editor message in-place
      try {
        const editorMsg = await message.channel.messages.fetch(editorMessageId).catch(() => null);
        if (editorMsg) {
          await editorMsg.edit({
            embeds:     [buildAppEditorEmbed(app)],
            components: buildAppEditorComponents(app)
          });
        }
      } catch {}

      // Confirm to admin
      const confirmMsg = await message.channel.send({
        embeds: [new EmbedBuilder().setColor('Green')
          .setDescription(app.emoji ? `✅ Emoji set to ${app.emoji}` : '✅ Emoji removed.')
          .setFooter(APP_FOOTER)]
      });

      // Auto-delete the confirmation after 4 seconds to keep channel clean
      setTimeout(() => confirmMsg.delete().catch(() => {}), 4000);

      return;
    }

    /*REPORT SYSTEM*/
    if (!config || !config.enabled || config.paused || message.channel.id !== config.reportChannelId) return;

    const key     = `${message.guild.id}_${message.author.id}`;
    const content = message.content.trim();
    const lower   = content.toLowerCase();

    let buffer = reportBuffers.get(key);

    if (!buffer) {
      buffer = {
        messages:    [],
        attachments: [],
        startedAt:   Date.now(),
        timeout:     setTimeout(async () => {
          if (reportBuffers.has(key)) {
            reportBuffers.delete(key);
            const expireEmbed = new EmbedBuilder()
              .setColor(`Red`)
              .setTitle(`⏰ Report Expired`)
              .setDescription(`Your 10-minute window is up. Please start a new report if needed.`)
              .setFooter({ text: `Apex • Report System` });
            await message.author.send({ embeds: [expireEmbed] }).catch(() => {});
          }
        }, 10 * 60 * 1000)
      };
      reportBuffers.set(key, buffer);
    }

    if (content.length > 0 && lower !== 'done') {
      buffer.messages.push(content);
    }

    if (message.attachments.size > 0) {
      for (const attachment of message.attachments.values()) {
        try {
          const response = await axios.get(attachment.url, { responseType: `arraybuffer` });
          buffer.attachments.push({ buffer: Buffer.from(response.data), name: attachment.name });
        } catch (err) {
          console.log(`❌ Failed to download attachment at messageCreate`, err);
        }
      }
    }

    await message.delete().catch(() => {});

    if (lower === `done`) {
      if (buffer.timeout) clearTimeout(buffer.timeout);

      if (buffer.messages.length === 0 && buffer.attachments.length === 0) {
        reportBuffers.delete(key);
        const ne = new EmbedBuilder()
          .setColor(`Red`)
          .setTitle(`Report not submitted`)
          .setDescription(`❌ Your report was empty and was not submitted.`)
          .setFooter({ text: `Apex • Report System` });
        return message.author.send({ embeds: [ne] }).catch(() => {});
      }

      const reportId  = `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
      const reportDoc = await Report.create({
        reportId,
        guildId:         message.guild.id,
        reporterId:      message.author.id,
        reportedContent: buffer.messages.join(`\n`) || "No message content provided",
        attachments:     buffer.attachments.map(a => ({ name: a.name }))
      });

      await sendReportToReview(message.client, reportDoc, buffer.attachments);
      reportBuffers.delete(key);

      const successEmbed = new EmbedBuilder()
        .setColor(`Green`)
        .setTitle(`✅ Report Submitted`)
        .setDescription(`Report ID: ${reportId}\nStaff will review it shortly.`)
        .setFooter({ text: `Apex • Report System` });
      return message.author.send({ embeds: [successEmbed] }).catch(() => {});
    }
  }
};
