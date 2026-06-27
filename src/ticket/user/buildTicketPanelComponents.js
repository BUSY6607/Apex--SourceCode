const {

  ActionRowBuilder,

  StringSelectMenuBuilder,

  ButtonBuilder,

  ButtonStyle

} = require(`discord.js`);

function resolveEmoji(raw) {

  if (!raw || typeof raw !== "string") return undefined;

  raw = raw.trim();

  // Custom emoji ID

  if (/^\d{17,20}$/.test(raw)) {

    return { id: raw };

  }

  // Full custom emoji <:name:id> or <a:name:id>

  const custom = raw.match(/^<a?:\w+:(\d{17,20})>$/);

  if (custom) {

    return { id: custom[1] };

  }

  // Unicode emoji — extract FIRST grapheme only

  const match = raw.match(/\p{Extended_Pictographic}/u);

  if (match) {

    return { name: match[0] }; //  ONLY ONE EMOJI

  }

  return undefined;

}

module.exports = function buildTicketPanelComponents(config) {

  // READ MODE FROM DB (EDITOR DECISION)

  const mode = config.ticketCreationMode || `select`;

  // ─────────────────────────────

  // SELECT MENU MODE

  // ─────────────────────────────

  if (mode === `select`) {

    const menu = new StringSelectMenuBuilder()

      .setCustomId(`ticket:create`)

      .setPlaceholder(`Select a ticket category`)

      .addOptions(

        config.categories.map(cat => ({

          label: cat.label,

          value: cat.value,

          description: cat.description || undefined,

          emoji: resolveEmoji(cat.emoji)

        }))

      );

    return [

      new ActionRowBuilder().addComponents(menu)

    ];

  }

  // ─────────────────────────────

  // BUTTON MODE (SECONDARY ONLY)

  // ─────────────────────────────

  if (mode === `buttons`) {

    const rows = [];

    let currentRow = new ActionRowBuilder();

    config.categories.forEach((cat, index) => {

      const button = new ButtonBuilder()

        .setCustomId(`ticket:create:${cat.value}`)

        .setLabel(cat.label)

        .setStyle(ButtonStyle.Secondary);

      const emoji = resolveEmoji(cat.emoji);

if (emoji) button.setEmoji(emoji);
      currentRow.addComponents(button);

      // Discord limit: 5 buttons per row

      if (currentRow.components.length === 5) {

        rows.push(currentRow);

        currentRow = new ActionRowBuilder();

      }

    });

    if (currentRow.components.length > 0) {

      rows.push(currentRow);

    }

    return rows;

  }

  // ─────────────────────────────

  // FALLBACK (SAFETY)

  // ─────────────────────────────

  return [];

};

