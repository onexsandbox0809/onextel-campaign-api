const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const SESSION_COOKIE_NAME = 'onextel_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT_SECRET environment variable.');
  return secret;
}

function signSessionToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    getJwtSecret(),
    { expiresIn: SESSION_MAX_AGE_SECONDS }
  );
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
}

function buildSessionCookie(token) {
  return cookie.serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

function buildLogoutCookie() {
  return cookie.serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/** Reads and verifies the session cookie from an API request. Returns the decoded payload or null. */
function getSessionFromRequest(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Optional shared-secret check for the inbound keyword-collection APIs.
 * Enabled only when INBOUND_API_KEY is set, so external systems (SMS
 * gateway, IVR, etc.) posting into these endpoints can be authenticated
 * without a full login flow. Returns true if the request is allowed.
 */
function isInboundRequestAuthorized(req) {
  const expected = process.env.INBOUND_API_KEY;
  if (!expected) return true; // not configured -> open (add it in production)
  const provided = req.headers['x-api-key'];
  return provided === expected;
}

module.exports = {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  buildSessionCookie,
  buildLogoutCookie,
  getSessionFromRequest,
  isInboundRequestAuthorized,
};
