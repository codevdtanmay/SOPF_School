const { app, BrowserWindow } = require("electron");
const path = require("path");

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

    try {
      await mainWindow.loadURL(`http://127.0.0.1:${port}`);
    } catch (loadError) {
      console.warn("Falling back to local frontend bundle:", loadError.message);
      await mainWindow.loadFile(path.join(__dirname, "../backend/dist/index.html"));
    }
  } catch (err) {
    console.error("Failed to start app:", err);
  }
});
