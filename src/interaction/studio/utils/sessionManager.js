const InteractionSession = require("../../../models/InteractionSession");

const { SESSION_MODE } = require("../constants/interactionEnums");

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

/**

 * Create a new editor session

 * - Clears old session if exists

 */

async function createSession({ userId, guildId, panelId }) {

  await InteractionSession.findOneAndDelete({ userId });

  return InteractionSession.create({

    userId,

    guildId,

    panelId,

    mode: SESSION_MODE.EDITOR,
      
      tempActionRows: [],

  activeTempRowId: null,

    lastUpdated: Date.now(),

  });

}

/**

 * Get active session for a user

 */

async function getSession(userId) {

  return InteractionSession.findOne({ userId });

}

/**

 * Update session mode or timestamp

 */

async function updateSession(userId, updates = {}) {

  return InteractionSession.findOneAndUpdate(

    { userId },

    {

      ...updates,

      lastUpdated: Date.now(),

    },

    { new: true }

  );

}

/**

 * Destroy session manually

 */

async function destroySession(userId) {

  return InteractionSession.findOneAndDelete({ userId });

}

/**

 * Check if session is expired

 */

function isSessionExpired(session) {

  if (!session) return true;

  return Date.now() - session.lastUpdated > SESSION_TIMEOUT;

}

/**

 * Auto-clean expired sessions (optional cron / interval)

 */

async function cleanupExpiredSessions() {

  const expiryTime = new Date(Date.now() - SESSION_TIMEOUT);

  await InteractionSession.deleteMany({

    lastUpdated: { $lt: expiryTime },

  });

}

async function lockSession(session, { skip = false } = {}) {

  if (skip) return;
    
    session.isProcessing = true;

  await session.save();

}

async function unlockSession(session) {

  session.isProcessing = false;

  await session.save();

}

module.exports = {

  createSession,

  getSession,

  updateSession,

  destroySession,

  isSessionExpired,

  cleanupExpiredSessions,
    
    lockSession,

  unlockSession

};

