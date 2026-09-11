const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const PORT = 3210;
const APP_URL = `http://127.0.0.1:${PORT}`;
let serverProcess = null;
let mainWindow = null;

function appDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
}

function startServer() {
  const dir = appDir();
  const nextBin = path.join(dir, "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: dir,
    env: { ...process.env, NODE_ENV: "production", ELECTRON_RUN_AS_NODE: "1" },
    stdio: "ignore",
    windowsHide: true,
  });
  serverProcess.on("exit", (code) => {
    if (code && !app.isQuitting) {
      dialog.showErrorBox(
        "چاپینو",
        "سرور برنامه متوقف شد. مطمئن شوید PostgreSQL در حال اجرا است و دوباره برنامه را باز کنید.",
      );
      app.quit();
    }
  });
}

function waitForServer(retries = 120) {
  return new Promise((resolve, reject) => {
    const tryOnce = (left) => {
      const request = http.get(`${APP_URL}/api/health`, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (left <= 0) reject(new Error("timeout"));
        else setTimeout(() => tryOnce(left - 1), 500);
      });
      request.setTimeout(1500, () => request.destroy(new Error("timeout")));
    };
    tryOnce(retries);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "چاپینو | مدیریت مرکز کپی و چاپ",
    backgroundColor: "#f5f7f8",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.loadURL(APP_URL);
}

app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer();
    createWindow();
  } catch {
    dialog.showErrorBox(
      "چاپینو",
      "اتصال به سرور برنامه برقرار نشد.\n\n۱) مطمئن شوید سرویس PostgreSQL روشن است.\n۲) فایل db-setup.bat را یک بار اجرا کرده باشید.\n۳) برنامه را دوباره باز کنید.",
    );
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (serverProcess) serverProcess.kill();
});

app.on("window-all-closed", () => app.quit());
