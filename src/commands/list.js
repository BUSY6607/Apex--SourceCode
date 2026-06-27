const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField
} = require('discord.js');

const FOOTER = { text: 'Apex • List System' };
const COLOR  = '#5865F2';
const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Pagination helper — sends or edits a reply with prev/next buttons
// ─────────────────────────────────────────────────────────────────────────────
async function paginate(interaction, pages, title) {
  let page = 0;

  const buildEmbed = (i) =>
    new EmbedBuilder()
      .setColor(COLOR)
      .setTitle(title)
      .setDescription(pages[i])
      .setFooter({ text: `Apex • List System  •  Page ${i + 1} / ${pages.length}` })
      .setTimestamp();

  const buildRow = (i) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀  Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(i === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next  ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(i === pages.length - 1)
    );

  const msg = await interaction.editReply({
    embeds: [buildEmbed(page)],
    components: pages.length > 1 ? [buildRow(page)] : []
  });

  if (pages.length <= 1) return;

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (btn) => btn.user.id === interaction.user.id,
    time: 120_000
  });

  collector.on('collect', async (btn) => {
    if (btn.customId === 'prev') page = Math.max(0, page - 1);
    if (btn.customId === 'next') page = Math.min(pages.length - 1, page + 1);

    await btn.update({
      embeds: [buildEmbed(page)],
      components: [buildRow(page)]
    });
  });

  collector.on('end', async () => {
    await msg.edit({ components: [] }).catch(() => {});
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk array into pages of n items each
// ─────────────────────────────────────────────────────────────────────────────
function chunkToPages(items, perPage = ITEMS_PER_PAGE) {
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage).join('\n'));
  }
  return pages.length ? pages : ['*No entries found.*'];
}

// ─────────────────────────────────────────────────────────────────────────────
// Centralised permission checker — both user AND bot must have Administrator
// Returns true if the check passed, false (and already replied) if it failed
// ─────────────────────────────────────────────────────────────────────────────
async function checkPerms(interaction) {
  const userHas = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  const botHas  = interaction.guild.members.me.permissions.has(PermissionFlagsBits.Administrator);

  if (!userHas) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Permission Denied')
          .setDescription('You need **Administrator** permission to use this command.')
          .setFooter(FOOTER)
      ],
      ephemeral: true
    });
    return false;
  }

  if (!botHas) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('❌ Missing Bot Permission')
          .setDescription('I need **Administrator** permission to run this command.')
          .setFooter(FOOTER)
      ],
      ephemeral: true
    });
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission name formatter
// ─────────────────────────────────────────────────────────────────────────────
function formatPermName(perm) {
  return perm
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Module export
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  name: 'list',
  description: 'List various server information',

  options: [
    // ── 1. bans ────────────────────────────────────────────────────────────────
    {
      name: 'bans',
      description: 'List all banned members with reason, tag, ID, and moderator',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── 2. role-members ────────────────────────────────────────────────────────
    {
      name: 'role-members',
      description: 'List all members that have a specific role',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          description: 'Role to look up',
          type: ApplicationCommandOptionType.Role,
          required: true
        }
      ]
    },

    // ── 3. role-perms ──────────────────────────────────────────────────────────
    {
      name: 'role-perms',
      description: 'Display all permissions of a specific role',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          description: 'Role to inspect',
          type: ApplicationCommandOptionType.Role,
          required: true
        }
      ]
    },

    // ── 4. roles ───────────────────────────────────────────────────────────────
    {
      name: 'roles',
      description: 'Display all roles in the server',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── 5. bots ────────────────────────────────────────────────────────────────
    {
      name: 'bots',
      description: 'Display all bots in the server',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── 6. emojis ──────────────────────────────────────────────────────────────
    {
      name: 'emojis',
      description: 'Display all custom emojis in the server',
      type: ApplicationCommandOptionType.Subcommand
    }
  ],

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── Centralised permission gate — runs for ALL subcommands ────────────────
    if (!await checkPerms(interaction)) return;

    // ── /list bans ─────────────────────────────────────────────────────────────
    if (sub === 'bans') {
      await interaction.deferReply();

      const bans = await interaction.guild.bans.fetch();

      if (bans.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLOR)
              .setTitle('🔨 Ban List')
              .setDescription('*No banned members found.*')
              .setFooter(FOOTER)
              .setTimestamp()
          ]
        });
      }

      // Fetch audit logs to find the moderator for each ban (up to 100)
      let auditBans = new Map();
      try {
        const logs = await interaction.guild.fetchAuditLogs({ type: 22 /* MemberBanAdd */, limit: 100 });
        for (const entry of logs.entries.values()) {
          auditBans.set(entry.target.id, entry.executor);
        }
      } catch { /* no audit log access — gracefully skip */ }

      const entries = [...bans.values()].map((ban, idx) => {
        const mod = auditBans.get(ban.user.id);
        const modStr = mod ? `${mod.tag}` : 'Unknown';
        return (
          `**${idx + 1}.** \`${ban.user.tag}\` — ID: \`${ban.user.id}\`\n` +
          `   📄 Reason: ${ban.reason || 'No reason provided'}\n` +
          `   👮 Moderator: ${modStr}`
        );
      });

      const pages = chunkToPages(entries, ITEMS_PER_PAGE);
      return paginate(interaction, pages, `🔨 Ban List — ${bans.size} banned`);
    }

    // ── /list role-members ─────────────────────────────────────────────────────
    if (sub === 'role-members') {
      const role    = interaction.options.getRole('role');
      await interaction.deferReply();

      await interaction.guild.members.fetch();
      const members = role.members;

      if (members.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLOR)
              .setTitle(`👥 Members with ${role.name}`)
              .setDescription('*No members have this role.*')
              .setFooter(FOOTER)
              .setTimestamp()
          ]
        });
      }

      const entries = [...members.values()].map((m, idx) =>
        `**${idx + 1}.** ${m.user.tag} — <@${m.id}> — \`${m.id}\``
      );

      const pages = chunkToPages(entries, ITEMS_PER_PAGE);
      return paginate(interaction, pages, `👥 Members with ${role.name} — ${members.size} total`);
    }

    // ── /list role-perms ───────────────────────────────────────────────────────
    if (sub === 'role-perms') {
      const role = interaction.options.getRole('role');
      await interaction.deferReply();

      const perms = new PermissionsBitField(role.permissions.bitfield);
      const allPerms = Object.keys(PermissionFlagsBits);

      const hasPerms   = allPerms.filter((p) => perms.has(PermissionFlagsBits[p]));
      const hasNotPerms = allPerms.filter((p) => !perms.has(PermissionFlagsBits[p]));

      const isAdmin = perms.has(PermissionFlagsBits.Administrator);

      const desc =
        (isAdmin ? '> ⚡ This role has **Administrator** — all permissions granted.\n\n' : '') +
        `✅ **Granted (${hasPerms.length})**\n` +
        (hasPerms.length
          ? hasPerms.map((p) => `• ${formatPermName(p)}`).join('\n')
          : '*None*') +
        `\n\n❌ **Denied (${hasNotPerms.length})**\n` +
        (hasNotPerms.length
          ? hasNotPerms.map((p) => `• ${formatPermName(p)}`).join('\n')
          : '*None*');

      // Split into pages of 1800 chars max to stay under Discord embed limit
      const lines  = desc.split('\n');
      const pages  = [];
      let current  = '';
      for (const line of lines) {
        if ((current + '\n' + line).length > 1800) {
          pages.push(current);
          current = line;
        } else {
          current += (current ? '\n' : '') + line;
        }
      }
      if (current) pages.push(current);

      return paginate(interaction, pages, `🔐 Permissions for @${role.name}`);
    }

    // ── /list roles ────────────────────────────────────────────────────────────
    if (sub === 'roles') {
      await interaction.deferReply();

      const roles = [...interaction.guild.roles.cache.values()]
        .filter((r) => r.id !== interaction.guild.id)          // skip @everyone
        .sort((a, b) => b.position - a.position);

      if (roles.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLOR)
              .setTitle('🎭 Server Roles')
              .setDescription('*No roles found.*')
              .setFooter(FOOTER)
              .setTimestamp()
          ]
        });
      }

      const entries = roles.map((r, idx) =>
        `**${idx + 1}.** ${r.toString()} — \`${r.id}\` — Members: **${r.members.size}**`
      );

      const pages = chunkToPages(entries, ITEMS_PER_PAGE);
      return paginate(interaction, pages, `🎭 Server Roles — ${roles.length} total`);
    }

    // ── /list bots ─────────────────────────────────────────────────────────────
    if (sub === 'bots') {
      await interaction.deferReply();
      await interaction.guild.members.fetch();

      const bots = interaction.guild.members.cache.filter((m) => m.user.bot);

      if (bots.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLOR)
              .setTitle('🤖 Server Bots')
              .setDescription('*No bots found.*')
              .setFooter(FOOTER)
              .setTimestamp()
          ]
        });
      }

      const entries = [...bots.values()].map((m, idx) =>
        `**${idx + 1}.** \`${m.user.tag}\` — <@${m.id}> — ID: \`${m.id}\``
      );

      const pages = chunkToPages(entries, ITEMS_PER_PAGE);
      return paginate(interaction, pages, `🤖 Server Bots — ${bots.size} total`);
    }

    // ── /list emojis ───────────────────────────────────────────────────────────
    if (sub === 'emojis') {
      await interaction.deferReply();

      const emojis = [...interaction.guild.emojis.cache.values()];

      if (emojis.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLOR)
              .setTitle('😄 Server Emojis')
              .setDescription('*No custom emojis found.*')
              .setFooter(FOOTER)
              .setTimestamp()
          ]
        });
      }

      const entries = emojis.map((e, idx) =>
        `**${idx + 1}.** ${e.toString()} — \`:${e.name}:\` — ID: \`${e.id}\` — ${e.animated ? '🎞️ Animated' : '🖼️ Static'}`
      );

      const pages = chunkToPages(entries, ITEMS_PER_PAGE);
      return paginate(interaction, pages, `😄 Server Emojis — ${emojis.length} total`);
    }
  }
};
