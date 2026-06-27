# Apex

A moderation-focused Discord bot built with discord.js v14 and MongoDB.

Apex includes a full ticket system, application/recruitment system, member reports, anti-raid protection, auto-mod (censor + auto-responder), role automation, inactivity pinging, a no-code embed builder (Interaction Studio), and the standard moderation toolkit (ban/kick/mute/warn/etc).

For a full breakdown of every command and how each system works, see [Apex-Guide](https://github.com/) (link to your guide repo).

---

## Tech Stack

- **Node.js**
- **discord.js v14**
- **MongoDB** (via Mongoose)
- **dotenv** — environment variable management

---

## Prerequisites

Before you start, make sure you have:

- **Node.js** installed (v18 or higher recommended) — [nodejs.org](https://nodejs.org)
- **A MongoDB database** — either a local MongoDB instance or a free cluster from [MongoDB Atlas](https://www.mongodb.com/atlas)
- **A Discord Bot Application** — created at the [Discord Developer Portal](https://discord.com/developers/applications)
- **npm** (comes bundled with Node.js)

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/Apex-SourceCode.git
cd Apex-SourceCode
```

---

## 2. Install Dependencies

```bash
npm install
```

This installs everything listed in `package.json` — discord.js, mongoose, dotenv, axios, and a few small utility libraries.

---

## 3. Create a Discord Bot Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to the **Bot** tab → click **Reset Token** → copy the token (you'll need this for `.env`)
4. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent**
   - **Message Content Intent**
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (simplest for full functionality — Apex's individual systems check for narrower permissions internally, but Administrator avoids permission issues across every feature)
6. Use the generated URL to invite the bot to your server

---

## 4. Set Up MongoDB

**Option A — MongoDB Atlas (recommended, free tier available)**
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and password
3. Under Network Access, allow access from your hosting IP (or `0.0.0.0/0` for simplicity during setup)
4. Copy your connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/apex?retryWrites=true&w=majority
   ```

**Option B — Local MongoDB**
Install MongoDB locally and use:
```
mongodb://localhost:27017/apex
```

---

## 5. Configure Environment Variables

Create a `.env` file in the project root:

```env
TOKEN=your_bot_token_here
SAIM_ID=your_bot_application_id_here
GUILD_ID=your_test_server_id_here
welcome_channel_id=channel_id_for_welcome_messages
LOG_CHANNEL=fallback_log_channel_id
uri=your_mongodb_connection_string_here
```

| Variable | Description |
|---|---|
| `TOKEN` | Your bot's token from the Developer Portal |
| `SAIM_ID` | Your bot's Application (Client) ID — used to deploy slash commands |
| `GUILD_ID` | Your server's ID (used for guild-specific testing/setup if applicable) |
| `welcome_channel_id` | Default channel ID for welcome messages |
| `LOG_CHANNEL` | Fallback log channel ID |
| `uri` | Your MongoDB connection string |

> `.env` is already listed in `.gitignore` — never commit your real token or connection string to GitHub.

To get IDs (server, channel, user): enable **Developer Mode** in Discord (Settings → Advanced), then right-click anything and select **Copy ID**.

---

## 6. Deploy Slash Commands

Every time you add or change a command, run:

```bash
node deploy.js
```

This registers all commands found in `src/commands/` with Discord's API. It can take up to an hour for global commands to fully propagate the first time, but usually appears within a few minutes.

---

## 7. Start the Bot

```bash
node src/index.js
```

If everything is configured correctly, you should see a console log confirming the bot has logged in and connected to MongoDB.

---

## Project Structure

```
src/
├── commands/          Slash commands (one file per command)
├── events/             Discord.js event listeners (messageCreate, guildMemberAdd, etc.)
├── models/             MongoDB schemas (Mongoose models)
├── handlers/            Loads commands and events on startup
├── utils/                Shared logic, engines, and background checkers
├── database/            MongoDB connection setup
│
├── application/          Application/recruitment system
│   ├── design/             Panel editor (buttons, modals, publishing)
│   └── user/                Submission handling and review flow
│
├── ticket/                Ticket system
│   ├── design/              Panel editor
│   └── user/                 Ticket lifecycle (create, claim, close, transcripts)
│
└── interaction/             Interaction Studio (no-code embed/button builder)
    └── studio/
        ├── editor/            All editor UI components
        ├── runtime/            Temporary state stores
        ├── constants/          Shared enums
        └── utils/               Session and component helpers
```

---

## First-Time Setup Inside Discord

Once the bot is online in your server, each system needs its own setup command before it does anything (none are required — enable only what you want):

| System | Setup Command |
|---|---|
| Logging | `/logs set <category> <channel>` |
| Tickets | `/tickets setup` |
| Reports | `/reports enable` |
| Applications | `/application setup` then `/application design` |
| Anti-Raid | `/antiraid setup` |
| Censor | `/censor add` + `/censor toggle enabled:True` |
| Auto-Responder | `/autoresponder add` |
| Roles Connection | `/roles-connection setup` |
| Chat Reactivity | `/chat-reactivity setup` |
| Interaction Studio | `/interaction studio` |

See [Apex-Guide](https://github.com/) for the full command reference and detailed explanation of every option.

---

## Troubleshooting

**Bot doesn't respond to slash commands**
Run `node deploy.js` again, and double check `SAIM_ID` and `TOKEN` are correct in `.env`.

**MongoDB connection fails**
Verify your `uri` is correct, your database user's password doesn't contain unencoded special characters, and your IP is allowlisted in MongoDB Atlas Network Access.

**"Missing Permissions" errors on certain commands**
Apex's role needs to be positioned high enough in Server Settings → Roles to manage the roles/channels involved, and needs the relevant Discord permission (visible per-command in the Guide repo).

---

## License

This project is provided as-is for personal and educational use.
