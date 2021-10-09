const router = require("express-promise-router")();
const graph = require("../graph");

router.get("/signin", async (req, res) => {
  const urlParameters = {
    scopes: process.env.OAUTH_SCOPES.split(","),
    redirectUri: process.env.OAUTH_REDIRECT_URI,
  };

  try {
    const authUrl = await req.app.locals.msalClient.getAuthCodeUrl(
      urlParameters
    );
    res.redirect(authUrl);
  } catch (error) {
    console.log(`Error: ${error}`);
    req.app.locals.error_msg = {
      message: "Error getting auth URL",
      debug: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    };
    res.redirect("/");
  }
});

router.get("/callback", async (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: process.env.OAUTH_SCOPES.split(","),
    redirectUri: process.env.OAUTH_REDIRECT_URI,
  };

  try {
    const response = await req.app.locals.msalClient.acquireTokenByCode(
      tokenRequest
    );
    req.app.locals.userId = response.account.homeAccountId;

    const user = await graph.getUserDetails(
      req.app.locals.msalClient,
      req.app.locals.userId
    );

    req.app.locals.user = {
      id: response.account.homeAccountId,
      displayName: user.displayName,
      email: user.mail || user.userPrincipalName,
      // quick "fix" for now, as api permissions seem to messup
      timeZone: `${process.env.TIMEZONE}`,
    };
  } catch (error) {
    req.app.locals.error_msg = {
      message: "Error completing authentication",
      debug: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    };
  } finally {
    res.redirect("/");
  }
});

router.get("/signout", async (req, res) => {
  if (req.app.locals.user) {
    const accounts = await req.app.locals.msalClient
      .getTokenCache()
      .getAllAccounts();

    const userAccount = accounts.find(
      (a) => a.homeAccountId === req.app.locals.user.id
    );
    if (userAccount) {
      req.app.locals.msalClient.getTokenCache().removeAccount(userAccount);
    }
    req.app.locals.user = undefined;
  }
  res.redirect("/");
});

module.exports = router;
