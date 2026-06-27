// ── Check if "now" falls within the monitor's configured business hours ──────
// All math done in UTC, shifted by utcOffsetHours to represent the server's local time.
function isWithinBusinessHours(monitor) {
  if (!monitor.businessHoursEnabled) return true; // no restriction = always active

  const now = new Date();

  // Shift to the configured local time
  const localMs   = now.getTime() + (monitor.utcOffsetHours * 60 * 60 * 1000);
  const localDate = new Date(localMs);

  const localHour = localDate.getUTCHours();
  const localDay   = localDate.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Weekend check
  if (monitor.skipWeekends && (localDay === 0 || localDay === 6)) {
    return false;
  }

  const { businessHoursStart: start, businessHoursEnd: end } = monitor;

  // Handle overnight ranges (e.g. 22 → 6)
  if (start <= end) {
    return localHour >= start && localHour < end;
  } else {
    return localHour >= start || localHour < end;
  }
}

module.exports = { isWithinBusinessHours };
