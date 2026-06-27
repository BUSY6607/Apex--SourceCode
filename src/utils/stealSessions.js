// ── Session store with guaranteed cleanup ─────────────────────────────────────
const sessions = new Map();
const timers   = new Map();

const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

function createSession(data) {
  // If a session already exists for this ID, clear its old timer first
  if (timers.has(data.id)) {
    clearTimeout(timers.get(data.id));
  }

  sessions.set(data.id, { ...data, createdAt: Date.now() });

  const timer = setTimeout(() => {
    sessions.delete(data.id);
    timers.delete(data.id);
  }, SESSION_TTL);

  // Prevent the timer from blocking process exit
  if (timer.unref) timer.unref();

  timers.set(data.id, timer);
}

function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;

  // Double-check TTL in case timer was delayed
  if (Date.now() - session.createdAt > SESSION_TTL) {
    deleteSession(id);
    return null;
  }

  return session;
}

function deleteSession(id) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
  return sessions.delete(id);
}

function getSessionCount() {
  return sessions.size;
}

module.exports = {
  createSession,
  getSession,
  deleteSession,
  getSessionCount
};
