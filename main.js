const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;
let reminderWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 750,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.maximize();
    mainWindow.loadFile('renderer/index.html');
}

function createReminderWindow() {
    reminderWindow = new BrowserWindow({
        width: 800,
        height: 650,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    reminderWindow.loadFile('renderer/reminder.html');

    reminderWindow.on('closed', () => {
        reminderWindow = null;
    });
}

ipcMain.on('open-reminder-window', () => {
    createReminderWindow();
});

app.whenReady().then(createMainWindow);