# ADB Pulse

A real-time Android device monitoring dashboard that pulses system stats from your phone to your browser. Built for the Samsung J7 Max, but works with any ADB-connected Android device.

![Dashboard Screenshot](./dist/assets/react-refresh-light.svg)

## What It Does

ADB Pulse bridges your Android device and your computer by:

- **Fetching live stats** via ADB: battery level/health, CPU usage & frequency, GPU usage, memory, temperature, and running processes
- **Device switching** - select from available connected devices
- **ADB terminal** - run shell commands directly from the browser
- **WebSocket streaming** - real-time updates without refresh
- **Diagnostic tools** - ADB version, device detection, raw command execution

## 📋 Requirements

| Item | Minimum |
|------|---------|
| **OS** | Windows 10/11 (Linux/macOS compatible with path adjustments) |
| **ADB** | Android Debug Bridge installed and in PATH or specified via `.env` |
| **Device** | Samsung J7 Max (or any Android device with ADB enabled) |
| **USB** | Device connected via USB with USB debugging enabled |
| **Node.js** | v18+ (for backend & frontend) |

### ADB Setup

1. Download [Platform-Tools](https://developer.android.com-studio/releases/platform-tools)
2. Extract `adb.exe` to a path of your choice
3. Create `backend\.env` with:
   ```
   ADB_PATH=C:\full\path\to\adb.exe
   ```
   *The backend already includes a default path: `D:\bootablee\platform-tools-latest-windows\platform-tools\adb.exe`*

4. Enable on your phone: **Settings → Developer options → USB debugging**

## 🚀 Getting Started

```bash
# Install dependencies for both backend and frontend
npm install:all

# Start the backend server (PORT 3400)
npm run backend

# Start the frontend dev server (PORT 5173)
npm run frontend

# Open http://localhost:5173
```

Or start everything manually:
```bash
# Terminal 1
cd backend && npm start

# Terminal 2  
cd frontend && npm run dev
```

## 🛠️ Features

| Feature | Description |
|---------|-------------|
| **Battery Card** | Level, voltage, temperature, health status, charge cycles |
| **CPU Hardware** | Core count, max frequency, current governor |
| **CPU Frequency Chart** | Per-core real-time frequencies & temperature |
| **Memory Card** | Total/used/free memory with buffers & cache |
| **Process Table** | Top 8 processes by CPU usage with PID & name |
| **GPU Monitor** | Usage percentage & model (Adreno/Mali/Unknown) |
| **ADB Terminal** | Run shell commands directly from the interface |
| **Device Switching** | Select from multiple connected devices |
| **Diagnostics** | ADB version, device status, raw command output |

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | Latest system statistics |
| `GET /api/devices` | List connected ADB devices |
| `POST /api/select-device` | Switch active device (body: `{serial}`) |
| `GET /api/diagnose` | ADB version, device list, raw output |
| `POST /api/adb/shell` | Execute shell command (`{command}`) |
| `GET /api/health` | Server status & uptime |

## 📊 Data Refresh

- Stats polled every **2 seconds**
- Device list refreshed every **5 seconds**
- WebSocket pushes updates to all connected clients automatically

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| `ADB binary not found` | Set `ADB_PATH` in `backend\.env` to your `adb.exe` location |
| `No device connected` | Enable USB debugging on phone; try different USB cable/port |
| `Connection refused` | Ensure backend is running on port 3400 |
| WebSocket disconnects | Check firewall/antivirus blocking port 3400 |
| Stats not updating | Ensure device stays connected; polling interval is 2s |

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, WS (WebSocket), dotenv, cors
- **Frontend**: React, Vite, Tailwind CSS, Lucide React icons
- **Data**: ADB shell commands, dumpsys, sysfs, /proc interfaces

## 📦 Build & Deploy

```bash
# Build frontend for production
npm run build

# The dist/ folder contains static files ready for any web server
```

## 🙌 Credits

Inspired by the need to monitor Samsung J7 Max device performance in real-time. ADB commands parsed from Android's dumpsys, sysfs, and /proc interfaces.

---

*Made with ❤️ for developers who love digging into their device's internals.*