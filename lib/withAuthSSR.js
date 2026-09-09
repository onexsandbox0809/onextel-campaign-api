const { getSessionFromRequest } = require('./auth');

function requireAuth(context) {
  const session = getSessionFromRequest(context.req);
  if (!session) {
    return {
      redirect: { destination: '/login', permanent: false },
    };
  }
  return { props: { username: session.username } };
}

module.exports = { requireAuth };
