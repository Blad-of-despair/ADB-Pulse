const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const fs = require('fs');
const { fetchAllStats, listDevices, detectDevice, execAdbCommand, getAdbPath, runRawCommands } = require('./adb-parser');

const PORT = process.env.PORT || 3400;
const POLL_INTERVAL = 2000;
const DEVICE_REFRESH_INTERVAL = 5000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let latestStats = {
  timestamp: Date.now(),
  connected: false,
  device: null,
  devices: [],
  deviceInfo: null,
  battery: null,
  batteryHealth: null,
  cpu: null,
  cpuInfo: null,
  gpu: null,
  memory: null,
  processes: [],
  governor: null,
  activeSerial: null,
};
let polling = false;
let pollTimer = null;
let activeSerial = null;
let deviceRefreshTimer = null;

async function refreshDeviceList() {
  const all = await listDevices().catch(() => []);
  const connected = all.filter(d => d.state === 'device');
  const payload = {
    type: 'devices',
    devices: connected.map(d => ({ serial: d.serial, model: d.info?.model || 'Unknown' })),
    activeSerial,
  };
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(JSON.stringify(payload)); });
  latestStats.devices = connected;
  return connected;
}

async function pollStats() {
  if (!polling) return;
  try {
    latestStats = await fetchAllStats(activeSerial);
    latestStats.activeSerial = activeSerial;
  } catch {
    latestStats = {
      timestamp: Date.now(),
      connected: false,
      device: null,
      devices: latestStats.devices || [],
      deviceInfo: null,
      battery: null,
      batteryHealth: null,
      cpu: null,
      cpuInfo: null,
      gpu: null,
      memory: null,
      processes: [],
      governor: null,
      activeSerial,
    };
  }

  const payload = JSON.stringify(latestStats);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

function startPolling() {
  if (polling) return;
  polling = true;
  pollStats();
  pollTimer = setInterval(pollStats, POLL_INTERVAL);
  deviceRefreshTimer = setInterval(refreshDeviceList, DEVICE_REFRESH_INTERVAL);
  console.log(`[server] Polling started every ${POLL_INTERVAL}ms`);
}

function stopPolling() {
  polling = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (deviceRefreshTimer) { clearInterval(deviceRefreshTimer); deviceRefreshTimer = null; }
  console.log('[server] Polling stopped');
}

wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Monitoring relay established' }));
  ws.send(JSON.stringify({ type: 'stats', ...latestStats }));

  const connected = (latestStats.devices || []).filter(d => d.state === 'device');
  ws.send(JSON.stringify({
    type: 'devices',
    devices: connected.map(d => ({ serial: d.serial, model: d.info?.model || 'Unknown' })),
    activeSerial,
  }));

  startPolling();

  ws.on('close', () => {
    console.log('[ws] Client disconnected');
    if (wss.clients.size === 0) stopPolling();
  });
});

app.get('/api/stats', (_req, res) => res.json(latestStats));

app.get('/api/devices', async (_req, res) => {
  const all = await listDevices();
  res.json({ devices: all.filter(d => d.state === 'device').map(d => ({ serial: d.serial, model: d.info?.model || 'Unknown' })), activeSerial });
});

app.post('/api/select-device', (req, res) => {
  const { serial } = req.body || {};
  if (!serial) return res.status(400).json({ error: 'serial required' });
  activeSerial = serial;
  console.log(`[server] Switched to device: ${serial}`);
  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(JSON.stringify({ type: 'device-selected', serial }));
  });
  res.json({ success: true, activeSerial });
});

app.get('/api/diagnose', async (_req, res) => {
  const result = { adbPath: getAdbPath(), activeSerial };
  try {
    const version = await execAdbCommand('version');
    result.adbVersion = version.split('\n')[0];
  } catch (err) { result.adbVersion = null; result.adbError = err.message; }
  try {
    const devices = await execAdbCommand('devices');
    result.devicesRaw = devices;
  } catch (err) { result.devicesRaw = null; result.devicesError = err.message; }
  const device = await detectDevice(activeSerial);
  result.device = device;
  if (device.connected) {
    const raw = await runRawCommands(activeSerial);
    result.raw = raw;
  }
  res.json(result);
});

app.post('/api/adb/shell', async (req, res) => {
  const { command } = req.body || {};
  if (!command) return res.json({ output: 'No command entered', success: false });

  let serial = activeSerial;
  if (!serial) {
    const device = await detectDevice();
    if (device.connected) {
      serial = device.serial;
      activeSerial = serial;
      console.log(`[server] Auto-selected device for shell: ${serial}`);
    } else {
      return res.json({ output: 'No device connected', success: false });
    }
  }

  try {
    const output = await execAdbCommand(`shell ${command}`, serial);
    res.json({ output: output || '(empty output)', success: true });
  } catch (err) {
    res.json({ output: err.message, success: false });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok', uptime: process.uptime(), clients: wss.clients.size,
    polling, activeSerial, deviceCount: (latestStats.devices || []).filter(d => d.state === 'device').length,
  });
});

async function startupCheck() {
  const adbPath = getAdbPath();
  console.log(`[server] ADB path: ${adbPath}`);
  try {
    await fs.promises.access(adbPath, fs.constants.X_OK);
    console.log(`[server] ADB binary found and executable`);
  } catch {
    console.log(`[server] ⚠ ADB binary not found at: ${adbPath}`);
    if (adbPath === 'adb' || adbPath === 'adb.exe') {
      console.log(`[server]   → adb is not in your system PATH`);
      console.log(`[server]   → Create backend\\.env with: ADB_PATH=C:\\full\\path\\to\\adb.exe`);
      console.log(`[server]   → Or set: $env:ADB_PATH="C:\\full\\path\\to\\adb.exe"`);
    }
    return;
  }
  try {
    const version = await execAdbCommand('version');
    console.log(`[server] ${version.split('\n')[0]}`);
  } catch { console.log(`[server] ⚠ ADB binary exists but failed to execute`); }

  const all = await listDevices();
  const connected = all.filter(d => d.state === 'device');
  if (connected.length > 0) {
    activeSerial = connected[0].serial;
    console.log(`[server] ✓ ${connected.length} device(s) detected, active: ${activeSerial}`);
    for (const d of connected) {
      console.log(`[server]    ${d.serial} — ${d.info?.model || 'Unknown'}`);
    }
  } else {
    console.log(`[server] ⚠ No device connected — plug in a phone via USB`);
  }
}

server.listen(PORT, async () => {
  console.log(`[server] ═══════════════════════════════════════`);
  console.log(`[server]  Multi-Device Monitor Relay`);
  console.log(`[server]  Dashboard: http://localhost:${PORT}`);
  console.log(`[server]  API:       http://localhost:${PORT}/api/stats`);
  console.log(`[server]  Devices:   http://localhost:${PORT}/api/devices`);
  console.log(`[server] ═══════════════════════════════════════`);
  await startupCheck();
});
