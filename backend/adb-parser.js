const { exec } = require('child_process');

const ADB_PATH = process.env.ADB_PATH || 'adb';

function execAdbCommand(command, serial) {
  return new Promise((resolve, reject) => {
    const serialFlag = serial ? `-s ${serial}` : '';
    const fullCommand = `"${ADB_PATH}" ${serialFlag} ${command}`.trim();
    exec(fullCommand, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function listDevices() {
  try {
    const stdout = await execAdbCommand('devices');
    const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
    const devices = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      if (parts[0] === 'List' || parts[0] === '*') continue;
      const serial = parts[0];
      const state = parts[parts.length - 1];
      let info = null;
      try {
        const model = await execAdbCommand('shell getprop ro.product.model', serial);
        info = { model: model || 'Unknown' };
      } catch {}
      devices.push({ serial, state, info });
    }
    return devices;
  } catch (err) {
    return [];
  }
}

async function detectDevice(serial) {
  const all = await listDevices();
  if (serial) {
    const found = all.find(d => d.serial === serial && d.state === 'device');
    return found
      ? { connected: true, serial: found.serial, info: found.info }
      : { connected: false, serial, error: 'not_found' };
  }
  const first = all.find(d => d.state === 'device');
  if (first) return { connected: true, serial: first.serial, info: first.info };
  const unauth = all.find(d => d.state === 'unauthorized');
  if (unauth) return { connected: false, serial: unauth.serial, error: 'unauthorized' };
  return { connected: false, serial: null, error: 'no_device' };
}

function getAdbPath() {
  return ADB_PATH;
}

function parseBatteryStats(raw) {
  const result = {
    level: 0,
    voltage: 0,
    temperature: 0,
    technology: 'Unknown',
    health: 'Unknown',
    status: 'Unknown',
    scale: 100,
  };

  if (!raw) return result;

  const map = {
    level: 'level',
    voltage: 'voltage',
    temperature: 'temperature',
    technology: 'technology',
    health: 'health',
    status: 'status',
    scale: 'scale',
  };

  const lines = raw.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (!map[key]) continue;
    if (key === 'temperature') {
      result[key] = (parseInt(val, 10) || 0) / 10;
    } else if (key === 'voltage') {
      result[key] = parseInt(val, 10) || 0;
    } else if (key === 'level' || key === 'scale') {
      result[key] = parseInt(val, 10) || 0;
    } else {
      result[key] = val;
    }
  }

  const healthMap = {
    '1': 'Unknown',
    '2': 'Good',
    '3': 'Overheat',
    '4': 'Dead',
    '5': 'Over Voltage',
    '6': 'Unspecified Failure',
    '7': 'Cold',
  };
  result.health = healthMap[result.health] || result.health;

  const statusMap = {
    '1': 'Unknown',
    '2': 'Charging',
    '3': 'Discharging',
    '4': 'Not Charging',
    '5': 'Full',
  };
  result.status = statusMap[result.status] || result.status;

  return result;
}

function parseTopOutput(raw) {
  const result = {
    cpuUsagePercent: 0,
    totalMemoryKb: 0,
    usedMemoryKb: 0,
    freeMemoryKb: 0,
    buffersKb: 0,
    cachedKb: 0,
    availableKb: 0,
    processes: [],
  };

  if (!raw) return result;

  const rawClean = raw.replace(/\u001b\[.*?[a-zA-Z]/g, '');
  const lines = rawClean.split('\n').map(l => l.trim()).filter(Boolean);

  const cpuLine = lines.find(l => /%cpu/.test(l));
  if (cpuLine) {
    const userMatch = cpuLine.match(/(\d+\.?\d*)%user/);
    const niceMatch = cpuLine.match(/(\d+\.?\d*)%nice/);
    const sysMatch = cpuLine.match(/(\d+\.?\d*)%sys/);
    const user = parseFloat(userMatch?.[1] || 0);
    const nice = parseFloat(niceMatch?.[1] || 0);
    const sys = parseFloat(sysMatch?.[1] || 0);

    const maxMatch = cpuLine.match(/(\d+)%cpu/);
    const maxCpu = parseInt(maxMatch?.[1] || 100, 10);
    const numCores = maxCpu / 100;

    result.cpuUsagePercent = Math.round(((user + nice + sys) / numCores) * 10) / 10;
  }

  const memLine = lines.find(l => /^Mem:/i.test(l));
  if (memLine) {
    const totalMatch = memLine.match(/(\d+)k\s+total/i);
    const usedMatch = memLine.match(/(\d+)k\s+used/i);
    const freeMatch = memLine.match(/(\d+)k\s+free/i);
    const buffersMatch = memLine.match(/(\d+)k\s+buffers/i);
    result.totalMemoryKb = parseInt(totalMatch?.[1] || 0, 10);
    result.usedMemoryKb = parseInt(usedMatch?.[1] || 0, 10);
    result.freeMemoryKb = parseInt(freeMatch?.[1] || 0, 10);
    result.buffersKb = parseInt(buffersMatch?.[1] || 0, 10);
  }

  const swapLine = lines.find(l => /^Swap:/i.test(l));
  if (swapLine) {
    const cachedMatch = swapLine.match(/(\d+)k\s+cached/i);
    result.cachedKb = parseInt(cachedMatch?.[1] || 0, 10);
  }

  result.availableKb = result.freeMemoryKb + result.buffersKb + result.cachedKb;

  const headerIdx = lines.findIndex(l => /^\s*PID\s/.test(l));
  if (headerIdx >= 0) {
    let count = 0;
    for (let i = headerIdx + 1; i < lines.length && count < 8; i++) {
      const line = lines[i].replace(/\+$/, '').trim();
      const parts = line.split(/\s+/);
      if (parts.length < 12) continue;
      const pid = parseInt(parts[0], 10);
      if (!pid) continue;
      const cpuRaw = parts[8].replace(/[[\]%]/g, '');
      const cpu = parseFloat(cpuRaw) || 0;
      const name = parts.slice(11).join(' ');
      if (name) {
        result.processes.push({ pid, cpu, name });
        count++;
      }
    }
  }

  return result;
}

function parsePerformanceGovernor(raw) {
  const val = raw?.trim() || '';
  return {
    restricted: val.replace(/\s+/g, '') === '1,1',
    raw: val,
  };
}

async function getDeviceInfo(serial) {
  try {
    const [model, manufacturer, platform, release] = await Promise.all([
      execAdbCommand('shell getprop ro.product.model', serial).catch(() => 'Unknown'),
      execAdbCommand('shell getprop ro.product.manufacturer', serial).catch(() => 'Unknown'),
      execAdbCommand('shell getprop ro.board.platform', serial).catch(() => ''),
      execAdbCommand('shell getprop ro.build.version.release', serial).catch(() => ''),
    ]);
    return {
      model: model || 'Unknown',
      manufacturer: manufacturer || 'Unknown',
      platform: platform || '',
      androidVersion: release || '',
    };
  } catch {
    return { model: 'Unknown', manufacturer: 'Unknown', platform: '', androidVersion: '' };
  }
}

async function getCpuInfo(serial) {
  try {
    const [possibleRaw, maxFreqRaw, governorRaw] = await Promise.all([
      execAdbCommand('shell cat /sys/devices/system/cpu/possible', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', serial).catch(() => ''),
    ]);
    const cores = possibleRaw ? parseInt(possibleRaw.split('-')[1], 10) + 1 : 0;
    const maxFreqMhz = maxFreqRaw ? Math.round(parseInt(maxFreqRaw, 10) / 1000) : 0;
    return {
      cores: cores || 0,
      maxFreqMhz,
      governor: governorRaw || 'unknown',
    };
  } catch {
    return { cores: 0, maxFreqMhz: 0, governor: 'unknown' };
  }
}

async function getBatteryHealth(serial) {
  try {
    const [cycleSys, cycleAlt1, cycleAlt2, cycleAlt3, dumpsysRaw] = await Promise.all([
      execAdbCommand('shell cat /sys/class/power_supply/battery/cycle_count', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/class/power_supply/battery/battery_cycle', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/devices/platform/battery/power_supply/battery/cycle_count', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/class/battery/cycle_count', serial).catch(() => ''),
      execAdbCommand('shell dumpsys battery', serial).catch(() => ''),
    ]);

    let cycleCount = null;
    let chargeFull = null;
    let chargeFullDesign = null;

    const sysfsCandidates = [cycleSys, cycleAlt1, cycleAlt2, cycleAlt3];
    for (const val of sysfsCandidates) {
      if (val) {
        const parsed = parseInt(val.trim(), 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 10000) {
          cycleCount = parsed;
          break;
        }
      }
    }

    if (dumpsysRaw && cycleCount === null) {
      const mUsage = dumpsysRaw.match(/mSavedBatteryUsage:\s+(\d+)/i);
      if (mUsage) {
        const parsed = parseInt(mUsage[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 3000) {
          cycleCount = parsed;
        }
      }
      const fullMatch = dumpsysRaw.match(/charge_full:\s+(\d+)/i);
      if (fullMatch) chargeFull = parseInt(fullMatch[1], 10);
      const designMatch = dumpsysRaw.match(/charge_full_design:\s+(\d+)/i);
      if (designMatch) chargeFullDesign = parseInt(designMatch[1], 10);
    }

    return { cycleCount, chargeFull, chargeFullDesign };
  } catch {
    return { cycleCount: null, chargeFull: null, chargeFullDesign: null };
  }
}

async function getGpuUsage(serial) {
  try {
    const [gpubusyRaw, gpuModelRaw, gpuBusyAlt, gpuDumpsys] = await Promise.all([
      execAdbCommand('shell cat /sys/class/kgsl/kgsl-3d0/gpubusy', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/class/kgsl/kgsl-3d0/gpu_model', serial).catch(() => ''),
      execAdbCommand('shell cat /sys/kernel/gpu/gpu_busy', serial).catch(() => ''),
      execAdbCommand('shell dumpsys gpu --local', serial).catch(() => ''),
    ]);

    let model = gpuModelRaw || '';

    if (gpubusyRaw) {
      const parts = gpubusyRaw.trim().split(/\s+/);
      if (parts.length === 2) {
        const busy = parseInt(parts[0], 10);
        const total = parseInt(parts[1], 10);
        if (total > 0) {
          return {
            usagePercent: Math.round((busy / total) * 1000) / 10,
            model: model || 'Adreno (Qualcomm)',
          };
        }
      }
    }

    if (gpuBusyAlt) {
      const pct = parseInt(gpuBusyAlt.trim(), 10);
      if (!isNaN(pct)) {
        return { usagePercent: Math.min(pct, 100), model: model || 'GPU' };
      }
    }

    if (gpuDumpsys && gpuDumpsys.includes('GPU')) {
      const gpuLine = gpuDumpsys.split('\n').find(l => /GPU.*Busy/i.test(l) || /GPU.*Load/i.test(l));
      if (gpuLine) {
        const pctMatch = gpuLine.match(/(\d+\.?\d*)%/);
        if (pctMatch) {
          return { usagePercent: parseFloat(pctMatch[1]), model: model || 'GPU' };
        }
      }
      if (!model) {
        const nameLine = gpuDumpsys.split('\n').find(l => /GPU.*Renderer/i.test(l) || /GLES/i.test(l));
        if (nameLine) model = nameLine.split(':').pop()?.trim() || '';
      }
    }

    if (!model) {
      const mtkRaw = await execAdbCommand('shell cat /proc/gpumon/gpu_busy', serial).catch(() => '');
      if (mtkRaw) {
        const pct = parseInt(mtkRaw.trim(), 10);
        if (!isNaN(pct)) {
          return { usagePercent: pct, model: model || 'Mali (MediaTek)' };
        }
      }
    }

    if (!model) {
      const modelProp = await execAdbCommand('shell getprop ro.hardware.egl', serial).catch(() => '');
      if (modelProp) model = modelProp;
    }

    return { usagePercent: null, model: model || 'Unknown' };
  } catch {
    return { usagePercent: null, model: 'Unknown' };
  }
}

async function runTopCommand(serial) {
  let raw = await execAdbCommand('shell top -m 8 -n 1 -b', serial).catch(() => '');
  if (!raw || raw.length < 50) {
    raw = await execAdbCommand('shell top -m 8 -n 1', serial).catch(() => '');
  }
  if (!raw || raw.length < 50) {
    raw = await execAdbCommand('shell top -n 1', serial).catch(() => '');
  }
  return raw;
}

async function runRawCommands(serial) {
  return {
    battery: await execAdbCommand('shell dumpsys battery', serial).catch(() => null),
    top: await runTopCommand(serial),
    topAlt1: await execAdbCommand('shell top -m 8 -n 1', serial).catch(() => null),
    topAlt2: await execAdbCommand('shell top -n 1 -d 1', serial).catch(() => null),
    governor: await execAdbCommand('shell settings get global restricted_device_performance', serial).catch(() => null),
    deviceInfo: await getDeviceInfo(serial).catch(() => null),
    cpuInfo: await getCpuInfo(serial).catch(() => null),
    gpu: await getGpuUsage(serial).catch(() => null),
    devices: await listDevices().catch(() => []),
  };
}

async function getPerCoreFrequencies(serial) {
  const cores = [];
  for (let i = 0; i < 8; i++) {
    try {
      const raw = await execAdbCommand(`shell cat /sys/devices/system/cpu/cpu${i}/cpufreq/scaling_cur_freq`, serial);
      const freq = parseInt(raw.trim(), 10);
      cores.push({ core: i, freqMhz: isNaN(freq) ? null : Math.round(freq / 1000) });
    } catch {
      cores.push({ core: i, freqMhz: null });
    }
  }
  return cores;
}

async function getTemperature(serial) {
  try {
    const raw = await execAdbCommand('shell cat /sys/class/thermal/thermal_zone0/temp', serial);
    const t = parseInt(raw.trim(), 10);
    if (isNaN(t)) return null;
    return { celsius: t / 1000 };
  } catch {
    return null;
  }
}

async function getGpuFreqLevel(serial) {
  try {
    const raw = await execAdbCommand('shell cat /sys/kernel/debug/ged/hal/custom_upbound_gpu_freq', serial);
    return raw.trim();
  } catch {
    return null;
  }
}

async function fetchAllStats(serial) {
  const stats = {
    timestamp: Date.now(),
    connected: false,
    device: null,
    deviceInfo: null,
    battery: null,
    batteryHealth: null,
    cpu: null,
    cpuInfo: null,
    gpu: null,
    memory: null,
    processes: [],
    governor: null,
    devices: [],
    perCoreFrequencies: null,
    temperature: null,
    gpuFreqLevel: null,
  };

  const device = await detectDevice(serial);
  stats.device = device;
  stats.devices = await listDevices();

  if (!device.connected) return stats;

  try {
    const [batteryRaw, topRaw, govRaw, info, cpuSpec, gpu, battHealth, coreFreqs, temp, gpuLvl] = await Promise.all([
      execAdbCommand('shell dumpsys battery', serial).catch(() => ''),
      runTopCommand(serial).catch(() => ''),
      execAdbCommand('shell settings get global restricted_device_performance', serial).catch(() => ''),
      getDeviceInfo(serial).catch(() => null),
      getCpuInfo(serial).catch(() => null),
      getGpuUsage(serial).catch(() => null),
      getBatteryHealth(serial).catch(() => null),
      getPerCoreFrequencies(serial).catch(() => null),
      getTemperature(serial).catch(() => null),
      getGpuFreqLevel(serial).catch(() => null),
    ]);

    stats.connected = true;
    stats.deviceInfo = info;
    stats.cpuInfo = cpuSpec;
    stats.gpu = gpu;
    stats.batteryHealth = battHealth;
    stats.perCoreFrequencies = coreFreqs;
    stats.temperature = temp;
    stats.gpuFreqLevel = gpuLvl;

    const battery = parseBatteryStats(batteryRaw);
    stats.battery = battery;

    const top = parseTopOutput(topRaw);
    stats.cpu = { usagePercent: top.cpuUsagePercent };
    stats.memory = {
      totalKb: top.totalMemoryKb,
      usedKb: top.usedMemoryKb,
      freeKb: top.freeMemoryKb,
      buffersKb: top.buffersKb,
      cachedKb: top.cachedKb,
      availableKb: top.availableKb,
    };
    stats.processes = top.processes;
    stats.governor = parsePerformanceGovernor(govRaw);
  } catch {
    stats.connected = false;
  }

  return stats;
}

module.exports = { fetchAllStats, runRawCommands, listDevices, detectDevice, getAdbPath, execAdbCommand, parseBatteryStats, parseTopOutput, parsePerformanceGovernor, getDeviceInfo, getCpuInfo, getGpuUsage, getBatteryHealth, getPerCoreFrequencies, getTemperature, getGpuFreqLevel };
