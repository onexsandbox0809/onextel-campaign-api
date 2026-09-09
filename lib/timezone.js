const { DateTime } = require('luxon');

const APP_TIMEZONE = 'Europe/Istanbul';

/**
 * Returns the current moment in Europe/Istanbul split into a Postgres-ready
 * date string (YYYY-MM-DD) and time string (HH:mm:ss).
 */
function nowInIstanbul() {
  const dt = DateTime.now().setZone(APP_TIMEZONE);
  return {
    response_date: dt.toFormat('yyyy-LL-dd'),
    response_time: dt.toFormat('HH:mm:ss'),
    iso: dt.toISO(),
  };
}

module.exports = { APP_TIMEZONE, nowInIstanbul };
