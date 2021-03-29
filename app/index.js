const { BrowserWindow, app, Tray, Menu, ipcMain, shell } = require("electron");
require("dotenv").config();
const fetch = require("node-fetch");

let mainWindow, cachedEvent;
let showNotifications = true;
app.whenReady().then(() => {
  createWindow();
  ipcMain.on("closeApp", async (e, args) => {
    if (args) {
      try {
        await fetch(`http://localhost:${process.env.PORT}/quit`);
      } catch (error) {}
      process.exit();
    }
  });
  const tray = new Tray("./app/assets/icon.ico");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Recieve notifications",
      click: function () {
        showNotifications = !showNotifications;
        notificationsTooltip(tray);
      },
    },
    { label: "Open Window", click: createWindow },
    {
      label: "Quit",
      click: confirmClose,
    },
  ]);
  tray.setContextMenu(contextMenu);
  notificationsTooltip(tray);
});
setInterval(() => {
  checkNotifications();
}, 1000);

function checkNotifications() {
  fetch(`http://localhost:${process.env.PORT}/notifications`)
    .then((res) => res.text())
    .then(async (data) => {
      if (!data || data.length <= 0) return;
      const events = JSON.parse(data);
      const event = events.filter(
        (x) => Date.parse(x.end.dateTime) > Date.now()
      )[0];
      // const event = events[0];
      console.log(
        `Current Time: ${new Date(
          Date.now()
        ).toLocaleString()}, Event Start: ${new Date(
          Date.parse(event.start.dateTime) - 15 * 1000
        ).toLocaleString()}`
      );
      if (!cachedEvent || event.id !== cachedEvent.id) {
        if (
          (cachedEvent &&
            Date.parse(event.start.dateTime) - 15 * 1000 > Date.now()) ||
          !showNotifications ||
          Date.parse(event.start.dateTime) - 15 * 1000 > Date.now()
        ) {
          return;
        }
        cachedEvent = event;
        const notification = {
          title: "Lesson Started",
          body: `Meeting Name: <strong>${event.subject}</strong><br>Organiser: <strong>${event.organizer.emailAddress.name}</strong>`,
        };
        const window = new BrowserWindow({
          frame: false,
          title: "Calendar Notification",
          resizable: false,
          width: 350,
          height: 200,
          alwaysOnTop: true,
          movable: false,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
          },
          icon: "./app/assets/icon.ico",
        });
        ipcMain.on("buttonClick", (e, args) => {
          if (args) window.destroy();
        });
        window.on("close", (e) => e.preventDefault());
        await window.loadURL(`file://${__dirname}/assets/index.html`);
        window.webContents.send("calendarInformation", notification);
      }
    })
    .catch(() => {});
}
function confirmClose() {
  const window = new BrowserWindow({
    frame: false,
    title: "Close Confirm",
    resizable: false,
    width: 350,
    height: 200,
    alwaysOnTop: true,
    movable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: "./app/assets/icon.ico",
  });
  window.loadURL(`file://${__dirname}/assets/confirm.html`);
}
async function createWindow() {
  if (mainWindow) return;
  mainWindow = new BrowserWindow({
    title: "Teams Notifications",
    resizable: true,
    autoHideMenuBar: true,
    icon: "./app/assets/icon.ico",
  });
  mainWindow.loadURL(`file://${__dirname}/assets/loading.html`);
  setTimeout(async () => {
    await mainWindow.loadURL(`http://localhost:${process.env.PORT}`);
  }, 2 * 1000);
  mainWindow.on("page-title-updated", (e, title) => {
    e.preventDefault();
  });
  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (url.endsWith("/github")) {
      shell.openExternal("https://github.com/mic0ishere/teams-notifications");
      e.preventDefault();
    }
  });
  mainWindow.on("close", (e) => {
    mainWindow.hide();
    mainWindow = null;
    e.preventDefault();
  });
}
function notificationsTooltip(tray) {
  tray.setToolTip(`Notifications: ${showNotifications ? "on" : "off"}`);
}
