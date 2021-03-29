const router = require('express-promise-router')();
const graph = require('../graph.js');
const moment = require('moment-timezone');
const iana = require('windows-iana');
let events;

router.get('/', async function (req, res) {
  if (!res.locals.user) return res.render('index');
  const params = {
    active: { calendar: true },
  };

  const user = res.locals.user;
  const timeZoneId = iana.findOneIana(user.timeZone);

  const startOfWeek = moment.tz(timeZoneId.valueOf()).startOf('week').utc();
  const endOfWeek = moment(startOfWeek).add(7, 'day');

  let accessToken;
  try {
    accessToken = await getAccessToken(
      user.homeAccountId,
      req.app.locals.msalClient
    );
  } catch (err) {
    req.app.locals.error_msg = {
      message:
        'Could not get access token. Try signing out and signing in again.',
      debug: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    };
    return;
  }

  if (accessToken && accessToken.length > 0) {
    try {
      const events = await graph.getCalendarView(
        accessToken,
        startOfWeek.format(),
        endOfWeek.format(),
        user.timeZone
      );

      params.events = events.value;
    } catch (err) {
      req.app.locals.error_msg = {
        message: 'Could not fetch events',
        debug: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      };
    }
  } else {
    req.app.locals.error_msg = 'Could not get an access token';
  }
  events = params.events;
  res.render('index', {
    events: events.filter((x) => Date.parse(x.end.dateTime) > Date.now()),
  });
});

router.get('/notifications', (req, res) => {
  res.json(events);
});
router.get('/github', (req, res) => {
  res.redirect("https://github.com/mic0ishere/teams-notifications")
})
router.get('/quit', (req, res) => process.exit());
async function getAccessToken(userId, msalClient) {
  try {
    const accounts = await msalClient.getTokenCache().getAllAccounts();

    const userAccount = accounts.find((a) => a.homeAccountId === userId);

    const response = await msalClient.acquireTokenSilent({
      scopes: process.env.OAUTH_SCOPES.split(','),
      redirectUri: process.env.OAUTH_REDIRECT_URI,
      account: userAccount,
    });

    return response.accessToken;
  } catch (err) {
    console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
}

module.exports = router;
