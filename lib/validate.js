/** Accepts digits, optional leading +, 7-15 digits total (E.164-ish, generous on purpose). */
const MOBILE_REGEX = /^\+?[0-9]{7,15}$/;

function normalizeMobileNumber(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/[\s-]/g, '');
  if (!MOBILE_REGEX.test(trimmed)) return null;
  return trimmed;
}

/** Trims a required string field; returns null if missing/empty. */
function requiredString(raw, maxLength = 500) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

/** Trims an optional string field; returns null if absent, '' if empty is fine. */
function optionalString(raw, maxLength = 1000) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return null;
  return raw.trim().slice(0, maxLength);
}

module.exports = { normalizeMobileNumber, requiredString, optionalString };
