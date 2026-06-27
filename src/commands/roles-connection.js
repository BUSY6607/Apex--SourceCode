const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const RolesConnection  = require('../models/RolesConnection');
const { applyBulk }   = require('../utils/applyConditions');

const FOOTER = { text: 'Apex • Roles Connection' };

function genId() {
  return `RC-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function errReply(interaction, desc) {
  const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
  return interaction[method]({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor('Red').setDescription(desc).setFooter(FOOTER)]
  });
}

module.exports = {
  name: 'roles-connection',
  description: 'Manage role conditions — auto add/remove roles based on other roles',

  options: [

    // ── /roles-connection setup ─────────────────────────────────────────────
    {
      name: 'setup',
      description: 'Add, view, toggle or remove role conditions',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'action',
          description: 'What to do',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '➕ Add Condition',     value: 'add'    },
            { name: '📋 List Conditions',   value: 'list'   },
            { name: '✏️ Edit Condition',    value: 'edit'   },
            { name: '🔁 Toggle Condition',  value: 'toggle' },
            { name: '🗑️ Remove Condition',  value: 'remove' },
            { name: '🧹 Clear All',         value: 'clear'  }
          ]
        },
        {
          name: 'trigger_role',
          description: 'If a member HAS this role → (required for add/edit)',
          type: ApplicationCommandOptionType.Role,
          required: false
        },
        {
          name: 'effect',
          description: 'Add or remove the target role (required for add/edit)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '➕ Add target role',    value: 'add'    },
            { name: '➖ Remove target role', value: 'remove' }
          ]
        },
        {
          name: 'target_role',
          description: 'The role to add or remove (required for add/edit)',
          type: ApplicationCommandOptionType.Role,
          required: false
        },
        {
          name: 'condition_id',
          description: 'Condition ID — required for edit, toggle, remove',
          type: ApplicationCommandOptionType.String,
          required: false
        }
      ]
    },

    // ── /roles-connection apply ─────────────────────────────────────────────
    {
      name: 'apply',
      description: 'Apply all conditions to every member in the server',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'bots_included',
          description: 'Also apply conditions to bots?',
          type: ApplicationCommandOptionType.Boolean,
          required: true
        },
        {
          name: 'dry_run',
          description: 'Preview what would change without actually changing anything (default: false)',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        }
      ]
    },

    // ── /roles-connection history ───────────────────────────────────────────
    {
      name: 'history',
      description: 'View the last 10 apply run logs',
      type: ApplicationCommandOptionType.Subcommand
    }
  ],

  async execute(interaction) {

    // ── Permission gate ──────────────────────────────────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor('Red')
          .setTitle('❌ Permission Denied')
          .setDescription('You need **Manage Roles** permission to use this command.')
          .setFooter(FOOTER)]
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor('Red')
          .setTitle('❌ Bot Missing Permission')
          .setDescription('I need **Manage Roles** permission to add or remove roles from members.')
          .setFooter(FOOTER)]
      });
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    // ══════════════════════════════════════════════════════════════════════════
    // SETUP
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'setup') {
      const action = interaction.options.getString('action');

      // ── ADD ────────────────────────────────────────────────────────────────
      if (action === 'add') {
        const triggerRole = interaction.options.getRole('trigger_role');
        const effect      = interaction.options.getString('effect');
        const targetRole  = interaction.options.getRole('target_role');

        if (!triggerRole || !effect || !targetRole) {
          return errReply(interaction,
            '❌ **Missing options for Add.**\n\n' +
            'Required:\n' +
            '• `trigger_role` — role that triggers the condition\n' +
            '• `effect` — add or remove\n' +
            '• `target_role` — role to add or remove'
          );
        }

        if (triggerRole.id === targetRole.id) {
          return errReply(interaction, '❌ Trigger role and target role cannot be the same.');
        }

        const botHighest = interaction.guild.members.me.roles.highest.position;
        if (targetRole.position >= botHighest) {
          return errReply(interaction,
            `❌ I cannot manage **${targetRole.name}** — it is above my highest role.\n` +
            `Move my role above **${targetRole.name}** in Server Settings → Roles.`
          );
        }

        let doc = await RolesConnection.findOne({ guildId: gid });
        if (!doc) doc = await RolesConnection.create({ guildId: gid });

        if (doc.conditions.length >= 25) {
          return errReply(interaction, '❌ Maximum of **25 conditions** per server reached.');
        }

        // ── Conflict detection ────────────────────────────────────────────────
        const conflict = doc.conditions.find(c =>
          c.triggerRoleId === triggerRole.id &&
          c.action        !== effect &&
          c.targetRoleId  === targetRole.id
        );
        if (conflict) {
          return errReply(interaction,
            `⚠️ **Conflicting Condition Detected**\n\n` +
            `Condition \`${conflict.id}\` does the **opposite** of what you're trying to add:\n` +
            `> If has <@&${conflict.triggerRoleId}> → **${conflict.action}** <@&${conflict.targetRoleId}>\n\n` +
            `Remove or edit the conflicting condition first.`
          );
        }

        // Duplicate check
        const duplicate = doc.conditions.find(c =>
          c.triggerRoleId === triggerRole.id &&
          c.action        === effect &&
          c.targetRoleId  === targetRole.id
        );
        if (duplicate) {
          return errReply(interaction, `❌ This exact condition already exists with ID \`${duplicate.id}\`.`);
        }

        const condId = genId();
        doc.conditions.push({
          id:            condId,
          triggerRoleId: triggerRole.id,
          action:        effect,
          targetRoleId:  targetRole.id,
          enabled:       true
        });
        await doc.save();

        return interaction.reply({
          embeds: [new EmbedBuilder().setColor('Green')
            .setTitle('✅ Condition Added')
            .addFields(
              { name: '🆔 Condition ID', value: `\`${condId}\``,                              inline: true },
              { name: '🎯 Trigger Role', value: `<@&${triggerRole.id}>`,                      inline: true },
              { name: '⚡ Effect',       value: effect === 'add' ? '➕ Add' : '➖ Remove',     inline: true },
              { name: '🎭 Target Role',  value: `<@&${targetRole.id}>`,                       inline: true },
              { name: '🟢 Status',       value: 'Enabled',                                    inline: true },
              { name: '📖 Meaning',      value: `If member has <@&${triggerRole.id}> → **${effect}** <@&${targetRole.id}>`, inline: false }
            )
            .setFooter(FOOTER)
            .setTimestamp()]
        });
      }

      // ── LIST ───────────────────────────────────────────────────────────────
      if (action === 'list') {
        await interaction.deferReply({ ephemeral: true });

        const doc = await RolesConnection.findOne({ guildId: gid });

        if (!doc || doc.conditions.length === 0) {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor('Blue')
              .setTitle('📋 Role Conditions')
              .setDescription('No conditions configured yet.\nUse `/roles-connection setup action:Add Condition` to create one.')
              .setFooter(FOOTER)]
          });
        }

        const lines = doc.conditions.map((c, i) => {
          const status = c.enabled ? '🟢' : '🔴';
          return (
            `${status} **${i + 1}.** \`${c.id}\`\n` +
            `> If has <@&${c.triggerRoleId}> → ${c.action === 'add' ? '➕ add' : '➖ remove'} <@&${c.targetRoleId}>`
          );
        });

        const chunks = [];
        for (let i = 0; i < lines.length; i += 10) {
          chunks.push(lines.slice(i, i + 10).join('\n\n'));
        }

        const embeds = chunks.map((chunk, i) =>
          new EmbedBuilder()
            .setColor('Blue')
            .setTitle(i === 0 ? `📋 Role Conditions (${doc.conditions.length})` : '📋 cont.')
            .setDescription(chunk)
            .setFooter(FOOTER)
        );

        return interaction.editReply({ embeds });
      }

      // ── EDIT ───────────────────────────────────────────────────────────────
      if (action === 'edit') {
        const conditionId = interaction.options.getString('condition_id')?.trim().toUpperCase();
        const triggerRole = interaction.options.getRole('trigger_role');
        const effect      = interaction.options.getString('effect');
        const targetRole  = interaction.options.getRole('target_role');

        if (!conditionId) {
          return errReply(interaction, '❌ Provide `condition_id` of the condition to edit.');
        }

        if (!triggerRole && !effect && !targetRole) {
          return errReply(interaction, '❌ Provide at least one field to update: `trigger_role`, `effect`, or `target_role`.');
        }

        await interaction.deferReply({ ephemeral: true });

        const doc = await RolesConnection.findOne({ guildId: gid });
        if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No conditions configured.').setFooter(FOOTER)] });

        const cond = doc.conditions.find(c => c.id === conditionId);
        if (!cond) {
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No condition found with ID \`${conditionId}\`.`).setFooter(FOOTER)] });
        }

        const botHighest = interaction.guild.members.me.roles.highest.position;
        const newTarget  = targetRole || interaction.guild.roles.cache.get(cond.targetRoleId);

        if (newTarget && newTarget.position >= botHighest) {
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ I cannot manage **${newTarget.name}** — it is above my highest role.`).setFooter(FOOTER)] });
        }

        if (triggerRole) cond.triggerRoleId = triggerRole.id;
        if (effect)      cond.action        = effect;
        if (targetRole)  cond.targetRoleId  = targetRole.id;

        // Self-reference check after edit
        if (cond.triggerRoleId === cond.targetRoleId) {
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Trigger role and target role cannot be the same.').setFooter(FOOTER)] });
        }

        await doc.save();

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Green')
            .setTitle('✏️ Condition Updated')
            .addFields(
              { name: '🆔 ID',          value: `\`${cond.id}\``,                          inline: true },
              { name: '🎯 Trigger',     value: `<@&${cond.triggerRoleId}>`,               inline: true },
              { name: '⚡ Effect',      value: cond.action === 'add' ? '➕ Add' : '➖ Remove', inline: true },
              { name: '🎭 Target',      value: `<@&${cond.targetRoleId}>`,                inline: true }
            )
            .setFooter(FOOTER)
            .setTimestamp()]
        });
      }

      // ── TOGGLE ─────────────────────────────────────────────────────────────
      if (action === 'toggle') {
        const conditionId = interaction.options.getString('condition_id')?.trim().toUpperCase();

        if (!conditionId) {
          return errReply(interaction, '❌ Provide `condition_id` of the condition to toggle.\nRun `/roles-connection setup action:List Conditions` to see all IDs.');
        }

        await interaction.deferReply({ ephemeral: true });

        const doc = await RolesConnection.findOne({ guildId: gid });
        if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No conditions configured.').setFooter(FOOTER)] });

        const cond = doc.conditions.find(c => c.id === conditionId);
        if (!cond) {
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No condition found with ID \`${conditionId}\`.`).setFooter(FOOTER)] });
        }

        cond.enabled = !cond.enabled;
        await doc.save();

        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(cond.enabled ? 'Green' : 'Orange')
            .setTitle(cond.enabled ? '🟢 Condition Enabled' : '🔴 Condition Disabled')
            .addFields(
              { name: '🆔 ID',      value: `\`${cond.id}\``,                              inline: true },
              { name: '🎯 Trigger', value: `<@&${cond.triggerRoleId}>`,                   inline: true },
              { name: '⚡ Effect',  value: cond.action === 'add' ? '➕ Add' : '➖ Remove', inline: true },
              { name: '🎭 Target',  value: `<@&${cond.targetRoleId}>`,                    inline: true },
              { name: '📊 Status',  value: cond.enabled ? '🟢 Enabled' : '🔴 Disabled',  inline: true }
            )
            .setFooter(FOOTER)
            .setTimestamp()]
        });
      }

      // ── REMOVE ─────────────────────────────────────────────────────────────
      if (action === 'remove') {
        const conditionId = interaction.options.getString('condition_id')?.trim().toUpperCase();

        if (!conditionId) {
          return errReply(interaction, '❌ Provide `condition_id` of the condition to remove.');
        }

        await interaction.deferReply({ ephemeral: true });

        const doc = await RolesConnection.findOne({ guildId: gid });
        if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No conditions configured.').setFooter(FOOTER)] });

        const idx = doc.conditions.findIndex(c => c.id === conditionId);
        if (idx === -1) {
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No condition found with ID \`${conditionId}\`.`).setFooter(FOOTER)] });
        }

        const removed = doc.conditions[idx];
        doc.conditions.splice(idx, 1);
        await doc.save();

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Orange')
            .setTitle('🗑️ Condition Removed')
            .addFields(
              { name: '🆔 ID',      value: `\`${removed.id}\``,                              inline: true },
              { name: '🎯 Trigger', value: `<@&${removed.triggerRoleId}>`,                   inline: true },
              { name: '⚡ Effect',  value: removed.action === 'add' ? '➕ Add' : '➖ Remove', inline: true },
              { name: '🎭 Target',  value: `<@&${removed.targetRoleId}>`,                    inline: true }
            )
            .setFooter(FOOTER)
            .setTimestamp()]
        });
      }

      // ── CLEAR ALL ──────────────────────────────────────────────────────────
      if (action === 'clear') {
        await interaction.deferReply({ ephemeral: true });

        const doc = await RolesConnection.findOne({ guildId: gid });
        if (!doc || doc.conditions.length === 0) {
          return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Blue').setDescription('ℹ️ No conditions to clear.').setFooter(FOOTER)] });
        }

        const count = doc.conditions.length;
        doc.conditions = [];
        await doc.save();

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Orange')
            .setTitle('🧹 All Conditions Cleared')
            .setDescription(`Removed **${count}** condition(s).`)
            .setFooter(FOOTER)
            .setTimestamp()]
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPLY
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'apply') {
      const botsIncluded = interaction.options.getBoolean('bots_included');
      const dryRun       = interaction.options.getBoolean('dry_run') ?? false;

      await interaction.deferReply();

      const doc = await RolesConnection.findOne({ guildId: gid });

      if (!doc || doc.conditions.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Red')
            .setDescription('❌ No conditions configured. Use `/roles-connection setup action:Add Condition` first.')
            .setFooter(FOOTER)]
        });
      }

      const enabledCount = doc.conditions.filter(c => c.enabled).length;
      if (enabledCount === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Orange')
            .setDescription('⚠️ All conditions are currently **disabled**. Enable at least one condition first.')
            .setFooter(FOOTER)]
        });
      }

      // Initial status message
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Blue')
          .setTitle(`${dryRun ? '🔍 Dry Run' : '⚙️'} Fetching Members...`)
          .setDescription(
            `${dryRun ? '**Dry Run Mode** — No changes will be made.\n\n' : ''}` +
            `Loading all server members. This may take a moment.`
          )
          .setFooter(FOOTER)]
      });

      // Progress callback — updates embed every 50 members
      const progressCallback = async (processed, total, stats) => {
        const pct  = Math.floor((processed / total) * 100);
        const bar  = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));

        await interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Blue')
            .setTitle(`${dryRun ? '🔍 Dry Run' : '⚙️'} Applying Conditions...`)
            .setDescription(
              `${dryRun ? '**Dry Run Mode** — No changes will be made.\n\n' : ''}` +
              `\`${bar}\` **${pct}%**\n` +
              `**${processed}** / **${total}** members processed\n\n` +
              `➕ Would add: **${stats.rolesAdded}** | ➖ Would remove: **${stats.rolesRemoved}**`
            )
            .setFooter(FOOTER)]
        });
      };

      const result = await applyBulk(
        interaction.guild,
        doc.conditions.filter(c => c.enabled),
        botsIncluded,
        dryRun,
        progressCallback
      );

      // Save to audit log (keep last 10 runs)
      if (!dryRun) {
        doc.applyLog.push({
          runAt:        new Date(),
          runBy:        interaction.user.id,
          membersTotal: result.total,
          rolesAdded:   result.rolesAdded,
          rolesRemoved: result.rolesRemoved,
          skipped:      result.skipped,
          errors:       result.errors,
          dryRun:       false
        });
        if (doc.applyLog.length > 10) doc.applyLog.splice(0, doc.applyLog.length - 10);
        await doc.save();
      }

      const hasIssues = result.skipped > 0 || result.errors > 0;
      const color     = dryRun ? 'Blue' : (hasIssues ? 'Yellow' : 'Green');

      const resultEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(dryRun ? '🔍 Dry Run Complete' : '✅ Conditions Applied')
        .addFields(
          { name: '👥 Members Processed', value: `${result.total}`,                      inline: true },
          { name: '📋 Conditions Active', value: `${enabledCount}`,                      inline: true },
          { name: '🤖 Bots Included',     value: botsIncluded ? 'Yes' : 'No',            inline: true },
          { name: dryRun ? '➕ Would Add' : '➕ Roles Added',
            value: `${result.rolesAdded}`,  inline: true },
          { name: dryRun ? '➖ Would Remove' : '➖ Roles Removed',
            value: `${result.rolesRemoved}`, inline: true },
          { name: '⚠️ Skipped',           value: `${result.skipped}`,                    inline: true }
        )
        .setFooter(FOOTER)
        .setTimestamp();

      if (dryRun) {
        resultEmbed.setDescription('**This was a dry run — no roles were actually changed.**\nRun again without `dry_run:True` to apply for real.');
      }

      if (result.errors > 0) {
        resultEmbed.addFields({ name: '❌ Errors', value: `${result.errors} operation(s) failed (member likely left during processing).`, inline: false });
      }

      if (result.skipped > 0) {
        resultEmbed.addFields({ name: '⚠️ Why Skipped?', value: `${result.skipped} role(s) are above my highest role. Move my role higher in Server Settings → Roles.`, inline: false });
      }

      return interaction.editReply({ embeds: [resultEmbed] });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HISTORY
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'history') {
      await interaction.deferReply({ ephemeral: true });

      const doc = await RolesConnection.findOne({ guildId: gid });

      if (!doc || doc.applyLog.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Blue')
            .setTitle('📜 Apply History')
            .setDescription('No apply runs recorded yet.\nUse `/roles-connection apply` to run conditions.')
            .setFooter(FOOTER)]
        });
      }

      const logs = [...doc.applyLog].reverse(); // newest first

      const lines = logs.map((log, i) =>
        `**${i + 1}.** <t:${Math.floor(new Date(log.runAt).getTime() / 1000)}:R> by <@${log.runBy}>\n` +
        `> 👥 ${log.membersTotal} members | ➕ ${log.rolesAdded} added | ➖ ${log.rolesRemoved} removed` +
        (log.skipped > 0 ? ` | ⚠️ ${log.skipped} skipped` : '') +
        (log.errors  > 0 ? ` | ❌ ${log.errors} errors`   : '') +
        (log.dryRun      ? ` | 🔍 dry run`                : '')
      );

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Blue')
          .setTitle(`📜 Apply History (${logs.length} runs)`)
          .setDescription(lines.join('\n\n'))
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }
  }
};
