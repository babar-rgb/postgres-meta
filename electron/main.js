const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Pool } = require('pg');

let mainWindow;
let dbPool = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#050505',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Determine URL: Dev server or production build
    const isDev = !app.isPackaged;
    const startUrl = isDev
        ? 'http://localhost:4000'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC Database Handlers ---

// 1. Connect
ipcMain.handle('db-connect', async (event, config) => {
    try {
        if (dbPool) {
            await dbPool.end();
        }
        dbPool = new Pool({
            host: config.host || 'localhost',
            port: config.port || 5432,
            user: config.user || 'postgres',
            password: config.password || 'postgres',
            database: config.database || 'postgres',
        });

        // Test connection
        const client = await dbPool.connect();
        client.release();
        return { success: true };
    } catch (err) {
        console.error('Connection Failed:', err);
        return { success: false, error: err.message };
    }
});

// 2. Query
ipcMain.handle('db-query', async (event, sql, params = []) => {
    if (!dbPool) return { error: 'No active connection. Please connect first.' };

    try {
        const result = await dbPool.query(sql, params);
        return {
            rows: result.rows,
            fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
            rowCount: result.rowCount,
            command: result.command
        };
    } catch (err) {
        console.error('Query Failed:', err);
        return { error: err.message };
    }
});
