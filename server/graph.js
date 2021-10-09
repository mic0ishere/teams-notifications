require("isomorphic-fetch");
const { Client } = require("@microsoft/microsoft-graph-client");
const iana = require("windows-iana")

module.exports = {
  getUserDetails: async function (msalClient, userId) {
    const client = getAuthenticatedClient(msalClient, userId);

    const user = await client
      .api("/me")
      .select("displayName,mail,userPrincipalName")
      .get();

    return user;
  },

  getCalendarView: async function (msalClient, id, start, end, timeZone) {
    const client = getAuthenticatedClient(msalClient, id);

    const events = await client
      .api('/me/calendarview')
      // Add Prefer header to get back times in user's timezone
      .header("Prefer", `outlook.timezone="${timeZone}"`)
      // Add the begin and end of the calendar window
      .query({ startDateTime: start, endDateTime: end })
      // Get just the properties used by the app
      .select("subject,organizer,start,end")
      // Order by start time
      .orderby("start/dateTime")
      // Get at most 50 results
      .top(50)
      .get();

    return events;
  },
};

function getAuthenticatedClient(msalClient, userId) {
  // Initialize Graph client
  const client = Client.init({
    // Implement an auth provider that gets a token
    // from the app's MSAL instance
    authProvider: async (done) => {
      try {
        // Get the user's account
        const account = await msalClient
          .getTokenCache()
          .getAccountByHomeId(userId);

        if (account) {
          // Attempt to get the token silently
          // This method uses the token cache and
          // refreshes expired tokens as needed
          const response = await msalClient.acquireTokenSilent({
            scopes: process.env.OAUTH_SCOPES.split(","),
            redirectUri: process.env.OAUTH_REDIRECT_URI,
            account: account,
          });

          // First param to callback is the error,
          // Set to null in success case
          done(null, response.accessToken);
        }
      } catch (err) {
        console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        done(err, null);
      }
    },
  });

  return client;
}
