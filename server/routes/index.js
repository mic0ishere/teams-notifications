const router = require("express-promise-router")();
const graph = require("../graph.js");
const moment = require("moment-timezone");
let events = [];

router.get("/", async function (req, res) {
  if (!res.locals.user) return res.render("index");

  const user = res.locals.user;

  const startOfWeek = moment.tz("Etc/UTC".valueOf()).startOf("week").utc();
  const endOfWeek = moment(startOfWeek).add(7, "day");
  events = (
    await graph.getCalendarView(
      req.app.locals.msalClient,
      user.id,
      startOfWeek.format(),
      endOfWeek.format(),
      user.timeZone
    )
  ).value;
  res.render("index", {
    events: events,
  });
});

router.get("/notifications", (req, res) => {
  res.json(events);
});
router.get("/github", (req, res) => {
  res.redirect("https://github.com/mic0ishere/teams-notifications");
});
router.get("/quit", (req, res) => process.exit());

module.exports = router;
