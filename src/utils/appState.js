// ── Per-guild editor state ────────────────────────────────────────────────────
// Mirrors ticketState.js pattern exactly for consistency
const appStates = new Map();

const TTL = 10 * 60 * 1000; // 10 minutes

function createAppState(guildId, adminId) {
  const state = {
    guildId,
    adminId,
    messageId:   null,

    // Panel embed design
    embed: {
      title:       '📋 Applications',
      description: 'Select an application below to apply.',
      color:       'Blue',
      image:       null
    },

    // 'button' | 'select'
    displayMode: 'select',

    // List of application objects
    applications: [],

    // Editor sub-states
    // null            = main editor
    // 'app_editor'    = editing a specific application
    // 'question_editor' = editing questions of an application
    editorMode: null,

    // Which application is currently being edited
    editingAppId: null,

    // Which question is being edited (index)
    editingQuestionIndex: null,

    // Waiting for admin to send emoji via message
    // { appId, messageId (editor msg) } or null
    pendingEmoji: null,

    // Snapshot of main editor message (embeds + components) for "back" navigation
    mainEditorSnapshot: { embeds: [], components: [] },

    timeout: null
  };

  appStates.set(guildId, state);
  return state;
}

function getAppState(guildId) {
  return appStates.get(guildId) || null;
}

function deleteAppState(guildId) {
  const state = appStates.get(guildId);
  if (state?.timeout) clearTimeout(state.timeout);
  appStates.delete(guildId);
}

function resetAppTimeout(state, onExpire) {
  if (state.timeout) clearTimeout(state.timeout);
  state.timeout = setTimeout(() => onExpire(state), TTL);
  if (state.timeout.unref) state.timeout.unref();
}

// Generate a short random ID
function genId(prefix = 'APP') {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

module.exports = {
  createAppState,
  getAppState,
  deleteAppState,
  resetAppTimeout,
  genId
};
