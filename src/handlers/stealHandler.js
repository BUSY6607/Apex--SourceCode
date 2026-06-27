const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const axios  = require('axios');
const crypto = require('crypto');

const { createSession, getSession, deleteSession } = require('../utils/stealSessions');

const FOOTER = { text: 'Apex • Emoji Stealer' };

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_SIZE_BYTES  = 10 * 1024 * 1024; // 10 MB
const DOWNLOAD_TIMEOUT = 20_000;           // 20s (CDN can be slow)
const MAX_RETRIES      = 3;
const RETRY_DELAY_MS   = 1000;

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
]);

// ── Magic byte signatures for real mime detection ────────────────────────────
const SIGNATURES = [
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF]        },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } }
];

function detectMimeFromBuffer(buf) {
  for (const sig of SIGNATURES) {
    const start = sig.offset || 0;
    const match = sig.bytes.every((b, i) => buf[start + i] === b);
    if (!match) continue;

    // WEBP has an extra check at offset 8
    if (sig.extra) {
      const extraMatch = sig.extra.bytes.every((b, i) => buf[sig.extra.offset + i] === b);
      if (!extraMatch) continue;
    }

    return sig.mime;
  }
  return null;
}

// ── Strip expiring Discord CDN query params to get a stable base URL ─────────
// Discord CDN URLs have ?ex=...&is=...&hm=... tokens that expire.
// We strip them for display only; the actual download uses the original URL.
function cleanDiscordUrl(raw) {
  try {
    const u = new URL(raw);
    // Remove the expiry tokens that cause "sometimes works, sometimes not"
    ['ex', 'is', 'hm'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

// ── Download with retry ───────────────────────────────────────────────────────
async function downloadWithRetry(url, attempt = 1) {
  try {
    const response = await axios.get(url, {
      responseType:     'arraybuffer',
      timeout:          DOWNLOAD_TIMEOUT,
      maxContentLength: MAX_SIZE_BYTES,
      maxBodyLength:    MAX_SIZE_BYTES,
      // Send a browser-like UA so CDNs don't block us
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApexBot/1.0)'
      },
      // Don't throw on 4xx/5xx — handle manually for better errors
      validateStatus: () => true
    });

    if (response.status === 404) {
      throw new Error('ASSET_NOT_FOUND');
    }

    if (response.status === 403) {
      throw new Error('ASSET_FORBIDDEN');
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP_${response.status}`);
    }

    return response;

  } catch (err) {
    // Don't retry on known permanent errors
    if (['ASSET_NOT_FOUND', 'ASSET_FORBIDDEN'].includes(err.message)) throw err;

    // Timeout or network error — retry
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      return downloadWithRetry(url, attempt + 1);
    }

    throw err;
  }
}

// ── Error reply helper ────────────────────────────────────────────────────────
function errorEmbed(description) {
  return new EmbedBuilder()
    .setColor('Red')
    .setDescription(description)
    .setFooter(FOOTER);
}

// ── Friendly error message mapper ─────────────────────────────────────────────
function friendlyError(err) {
  const msg = err.message || '';

  if (msg === 'ASSET_NOT_FOUND')     return '❌ Asset not found (404). The URL may be expired or deleted.';
  if (msg === 'ASSET_FORBIDDEN')     return '❌ Access denied (403). The asset is private or the URL has expired.';
  if (msg.startsWith('HTTP_'))       return `❌ Failed to download asset (${msg}).`;
  if (msg.includes('timeout'))       return '❌ Download timed out. The server took too long to respond.';
  if (msg.includes('maxContentLength') || msg.includes('maxBodyLength'))
                                     return `❌ Asset is too large (max ${MAX_SIZE_BYTES / 1024 / 1024}MB).`;
  if (msg === 'UNSUPPORTED_MIME')    return '❌ Unsupported file type. Only PNG, JPEG, WEBP, and GIF are allowed.';
  if (msg === 'INVALID_IMAGE')       return '❌ The file does not appear to be a valid image.';

  return '❌ Failed to download the asset. Please check the URL and try again.';
}

// ══════════════════════════════════════════════════════════════════════════════
// START  —  /steal <url>
// ══════════════════════════════════════════════════════════════════════════════
async function start(interaction) {
  const source = interaction.options.getString('source').trim();

  await interaction.deferReply();

  // ── 1. Validate URL format ──────────────────────────────────────────────
  let parsedUrl;
  try {
    parsedUrl = new URL(source);
  } catch {
    return interaction.editReply({
      embeds: [errorEmbed('❌ Please provide a valid image URL.')]
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return interaction.editReply({
      embeds: [errorEmbed('❌ Only HTTP and HTTPS URLs are supported.')]
    });
  }

  // ── 2. Download with retry ─────────────────────────────────────────────
  let response;
  try {
    response = await downloadWithRetry(source);
  } catch (err) {
    console.error('[StealHandler] Download error:', err.message);
    return interaction.editReply({
      embeds: [errorEmbed(friendlyError(err))]
    });
  }

  const buffer = Buffer.from(response.data);

  // ── 3. Validate buffer size ────────────────────────────────────────────
  if (buffer.length === 0) {
    return interaction.editReply({
      embeds: [errorEmbed('❌ Downloaded file is empty.')]
    });
  }

  // ── 4. Detect MIME from magic bytes (don't trust headers alone) ────────
  const mimeFromBuffer = detectMimeFromBuffer(buffer);

  if (!mimeFromBuffer) {
    return interaction.editReply({
      embeds: [errorEmbed('❌ The file does not appear to be a valid image (PNG, JPEG, WEBP, GIF only).')]
    });
  }

  if (!ALLOWED_TYPES.has(mimeFromBuffer)) {
    return interaction.editReply({
      embeds: [errorEmbed(`❌ Unsupported file type: \`${mimeFromBuffer}\`. Only PNG, JPEG, WEBP, GIF allowed.`)]
    });
  }

  // ── 5. Create session ──────────────────────────────────────────────────
  const sessionId = crypto.randomUUID();

  createSession({
    id:        sessionId,
    userId:    interaction.user.id,
    guildId:   interaction.guild.id,
    sourceUrl: source,
    buffer,
    mimeType:  mimeFromBuffer
  });

  const isGif = mimeFromBuffer === 'image/gif';
  const sizeKb = (buffer.length / 1024).toFixed(1);

  // ── 6. Send preview ────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor('Blurple')
    .setTitle('🖼️ Asset Preview')
    .setDescription(
      `📦 **Type:** ${isGif ? 'Animated GIF' : 'Static Image'} (\`${mimeFromBuffer}\`)\n` +
      `📏 **Size:** ${sizeKb} KB\n` +
      `⏳ **Session Expires:** 5 minutes\n\n` +
      `Choose how you want to import this asset.\n` +
      (isGif ? `\n> ⚠️ GIFs cannot be used as stickers.` : '')
    )
    .setImage(source)
    .setFooter(FOOTER)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`steal_emoji_${sessionId}`)
      .setLabel('Use As Emoji')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`steal_sticker_${sessionId}`)
      .setLabel('Use As Sticker')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isGif), // GIFs can't be stickers — disable immediately

    new ButtonBuilder()
      .setCustomId(`steal_cancel_${sessionId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.editReply({ embeds: [embed], components: [row] });
}

// ══════════════════════════════════════════════════════════════════════════════
// BUTTON HANDLER
// ══════════════════════════════════════════════════════════════════════════════
async function handleButton(interaction) {
  // customId format: steal_<action>_<sessionId>
  const parts     = interaction.customId.split('_');
  const action    = parts[1];
  const sessionId = parts.slice(2).join('_'); // UUID may contain underscores

  const session = getSession(sessionId);

  if (!session) {
    return interaction.reply({
      embeds: [errorEmbed('❌ This steal session has expired. Please run the command again.')],
      ephemeral: true
    });
  }

  // Only the original user can interact
  if (interaction.user.id !== session.userId) {
    return interaction.reply({
      embeds: [errorEmbed('❌ This steal session belongs to another user.')],
      ephemeral: true
    });
  }

  // ── Cancel ────────────────────────────────────────────────────────────
  if (action === 'cancel') {
    deleteSession(sessionId);
    return interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setDescription('❌ Steal session cancelled.')
          .setFooter(FOOTER)
      ],
      components: []
    });
  }

  // ── Emoji modal ───────────────────────────────────────────────────────
  if (action === 'emoji') {
    const modal = new ModalBuilder()
      .setCustomId(`steal_emoji_modal_${sessionId}`)
      .setTitle('Create Emoji');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('emoji_name')
          .setLabel('Emoji Name (letters, numbers, underscores)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(32)
          .setPlaceholder('my_cool_emoji')
      )
    );

    return interaction.showModal(modal);
  }

  // ── Sticker modal ─────────────────────────────────────────────────────
  if (action === 'sticker') {
    if (session.mimeType === 'image/gif') {
      return interaction.reply({
        embeds: [errorEmbed('❌ GIF files cannot be used as stickers.')],
        ephemeral: true
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`steal_sticker_modal_${sessionId}`)
      .setTitle('Create Sticker');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('sticker_name')
          .setLabel('Sticker Name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(30)
          .setPlaceholder('My Cool Sticker')
      )
    );

    return interaction.showModal(modal);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL HANDLER
// ══════════════════════════════════════════════════════════════════════════════
async function handleModal(interaction) {
  // customId: steal_<type>_modal_<sessionId>
  const parts     = interaction.customId.split('_');
  const type      = parts[1];                   // 'emoji' or 'sticker'
  const sessionId = parts.slice(3).join('_');   // everything after 'modal_'

  const session = getSession(sessionId);

  if (!session) {
    return interaction.reply({
      embeds: [errorEmbed('❌ This steal session has expired. Please run the command again.')],
      ephemeral: true
    });
  }

  await interaction.deferReply();

  // ── Create emoji ──────────────────────────────────────────────────────
  if (type === 'emoji') {
    const rawName = interaction.fields.getTextInputValue('emoji_name').trim();

    // Sanitise: Discord emoji names must be alphanumeric + underscores
    const name = rawName.replace(/[^a-zA-Z0-9_]/g, '_');

    if (name.length < 2) {
      return interaction.editReply({
        embeds: [errorEmbed('❌ Emoji name must be at least 2 characters (letters, numbers, underscores only).')]
      });
    }

    try {
      const emoji = await interaction.guild.emojis.create({
        attachment: session.buffer,
        name
      });

      deleteSession(sessionId);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Emoji Created')
            .setDescription(
              `**Emoji:** ${emoji}\n` +
              `**Name:** \`${emoji.name}\`\n` +
              `**ID:** \`${emoji.id}\`\n` +
              `**Created By:** ${interaction.user}`
            )
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });

    } catch (err) {
      console.error('[StealHandler] Emoji create error:', err.message);
      return interaction.editReply({
        embeds: [errorEmbed(formatCreateError(err, 'emoji'))]
      });
    }
  }

  // ── Create sticker ────────────────────────────────────────────────────
  if (type === 'sticker') {
    const name = interaction.fields.getTextInputValue('sticker_name').trim();

    try {
      const attachment = new AttachmentBuilder(session.buffer, { name: 'sticker.png' });

      const sticker = await interaction.guild.stickers.create({
        file: attachment,
        name,
        tags: '🙂'
      });

      deleteSession(sessionId);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Sticker Created')
            .setDescription(
              `**Name:** \`${sticker.name}\`\n` +
              `**ID:** \`${sticker.id}\`\n` +
              `**Created By:** ${interaction.user}`
            )
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });

    } catch (err) {
      console.error('[StealHandler] Sticker create error:', err.message);
      return interaction.editReply({
        embeds: [errorEmbed(formatCreateError(err, 'sticker'))]
      });
    }
  }
}

// ── Friendly Discord API error messages ───────────────────────────────────────
function formatCreateError(err, type) {
  const code = err.code;
  const msg  = err.message || '';

  if (code === 30008) return `❌ This server has reached the maximum number of emojis.`;
  if (code === 30088) return `❌ This server has reached the maximum number of stickers.`;
  if (code === 50013) return `❌ I don't have permission to manage ${type}s in this server.`;
  if (code === 50035 || msg.includes('Invalid Form Body')) {
    return `❌ The image format is not valid for a Discord ${type}. Try converting it to PNG first.`;
  }

  return (
    `❌ Failed to create ${type}.\n\n` +
    `Possible reasons:\n` +
    `• ${type === 'emoji' ? 'Emoji' : 'Sticker'} slots are full\n` +
    `• Image format not supported by Discord\n` +
    `• Image file is corrupt or too small\n` +
    `• Bot is missing Manage Expressions permission`
  );
}

module.exports = { start, handleButton, handleModal };
