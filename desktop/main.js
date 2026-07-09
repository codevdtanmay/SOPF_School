const { app, BrowserWindow } = require("electron");

let mainWindow;

app.whenReady().then(async () => {
  try {
    const { startServer } = await import("../backend/server.js");
    const { port } = await startServer();

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // // Open DevTools
    // mainWindow.webContents.openDevTools();

    mainWindow.loadURL(`http://127.0.0.1:${port}`);
  } catch (err) {
    console.error("Failed to start app:", err);
  }
});