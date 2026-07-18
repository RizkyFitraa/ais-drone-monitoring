/*
 * dashboard.h — Drone Monitor Dashboard
 * Disimpan di PROGMEM, di-serve via HTTP oleh ESP32
 * WebSocket ws://192.168.4.1:81
 */

#pragma once
#include <pgmspace.h>

const char DASHBOARD_HTML[] PROGMEM = R"=====(
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DRONE MONITOR</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700&display=swap');

:root{
  --bg:#0a0c0f;
  --panel:#111318;
  --border:#1e2229;
  --accent:#00e5ff;
  --accent2:#ff6b35;
  --ok:#39ff14;
  --warn:#ffd600;
  --err:#ff1744;
  --txt:#c8cdd6;
  --dim:#4a5060;
  --font-mono:'Share Tech Mono',monospace;
  --font-ui:'Barlow Condensed',sans-serif;
}

*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--txt);font-family:var(--font-mono);font-size:13px;min-height:100vh;overflow-x:hidden}

/* TOPBAR */
#topbar{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 16px;border-bottom:1px solid var(--border);
  background:var(--panel);position:sticky;top:0;z-index:100;
}
#topbar .logo{font-family:var(--font-ui);font-weight:700;font-size:18px;letter-spacing:3px;color:var(--accent);text-transform:uppercase}
#topbar .logo span{color:var(--dim)}
#ws-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dim)}
#ws-dot{width:7px;height:7px;border-radius:50%;background:var(--err);transition:background .3s}
#ws-dot.ok{background:var(--ok);box-shadow:0 0 6px var(--ok)}
#topbar-right{display:flex;align-items:center;gap:16px}
#sd-info{font-size:11px;color:var(--dim)}
#sd-info.ok{color:var(--ok)}
#uptime{font-size:11px;color:var(--dim)}

/* GRID LAYOUT */
#grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:8px;padding:10px;
}

/* PANEL */
.pnl{
  background:var(--panel);border:1px solid var(--border);
  border-radius:4px;padding:10px 12px;
  position:relative;overflow:hidden;
}
.pnl::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:var(--accent);opacity:.15;
}
.pnl.accent-ok::before{background:var(--ok)}
.pnl.accent-warn::before{background:var(--warn)}
.pnl.accent-err::before{background:var(--err)}

.pnl-title{
  font-family:var(--font-ui);font-weight:600;font-size:10px;
  letter-spacing:2px;text-transform:uppercase;color:var(--dim);
  margin-bottom:8px;
}
.val{font-size:24px;color:var(--accent);line-height:1}
.val.big{font-size:30px}
.val.warn{color:var(--warn)}
.val.err{color:var(--err)}
.val.ok{color:var(--ok)}
.unit{font-size:10px;color:var(--dim);margin-left:2px}

/* ROW VALUES */
.row-vals{display:flex;gap:12px;flex-wrap:wrap}
.rv{display:flex;flex-direction:column;gap:2px}
.rv .lbl{font-size:9px;color:var(--dim);letter-spacing:1px;text-transform:uppercase}
.rv .v{font-size:16px;color:var(--txt)}
.rv .v.hi{color:var(--accent)}

/* ATTITUDE — HORIZON */
.horizon-wrap{display:flex;justify-content:center;margin:4px 0}
canvas{display:block}

/* MOTOR BARS */
.motor-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:4px}
.mbar-wrap{display:flex;flex-direction:column;align-items:center;gap:3px}
.mbar-lbl{font-size:9px;color:var(--dim)}
.mbar-bg{width:18px;height:60px;background:#1a1d22;border-radius:2px;overflow:hidden;display:flex;align-items:flex-end}
.mbar-fill{width:100%;background:var(--accent);border-radius:2px;transition:height .15s linear;min-height:1px}
.mbar-val{font-size:9px;color:var(--txt)}

/* RC BARS */
.rc-grid{display:grid;grid-template-columns:1fr;gap:4px;margin-top:4px}
.rcbar-row{display:flex;align-items:center;gap:6px}
.rcbar-lbl{font-size:9px;color:var(--dim);width:28px;text-align:right}
.rcbar-bg{flex:1;height:8px;background:#1a1d22;border-radius:2px;overflow:hidden}
.rcbar-fill{height:100%;background:var(--accent2);border-radius:2px;transition:width .1s linear}
.rcbar-val{font-size:9px;color:var(--txt);width:36px}

/* VBAT BAR */
.bat-bar-bg{height:8px;background:#1a1d22;border-radius:2px;overflow:hidden;margin-top:6px}
.bat-bar-fill{height:100%;border-radius:2px;transition:width .3s,background .3s}

/* GPS MAP MINI */
#minimap{width:100%;height:120px;background:#0d1117;border-radius:3px;overflow:hidden;position:relative;margin-top:6px}
#minimap canvas{position:absolute;top:0;left:0}

/* AIS LOG */
#ais-log{
  font-size:10px;height:90px;overflow-y:auto;
  background:#0d1117;border-radius:3px;padding:6px 8px;margin-top:6px;
}
#ais-log::-webkit-scrollbar{width:3px}
#ais-log::-webkit-scrollbar-thumb{background:var(--border)}
.ais-entry{padding:1px 0;border-bottom:1px solid #151820;display:flex;gap:6px}
.ais-tag{color:var(--accent2);min-width:36px}
.ais-nmea{color:var(--dim);word-break:break-all;font-size:9px}

/* IMU TABLE */
.imu-table{width:100%;border-collapse:collapse;margin-top:4px}
.imu-table td{padding:2px 4px;font-size:11px;border-bottom:1px solid var(--border)}
.imu-table td:first-child{color:var(--dim);font-size:9px;letter-spacing:1px;width:32px}
.imu-bar-bg{height:5px;background:#1a1d22;border-radius:1px;overflow:hidden}
.imu-bar-fill{height:100%;background:var(--accent);border-radius:1px;transition:width .1s}

/* SPAN FULL */
.span2{grid-column:span 2}
.span4{grid-column:span 4}

/* FLIGHT MODE BADGE */
#fmode{
  display:inline-block;padding:2px 8px;
  background:#1a1d22;border:1px solid var(--dim);
  border-radius:2px;font-size:11px;letter-spacing:1px;
  margin-top:4px;
}

/* STATUS LINE */
#statusbar{
  padding:4px 16px;background:var(--panel);
  border-top:1px solid var(--border);
  font-size:10px;color:var(--dim);
  display:flex;gap:16px;flex-wrap:wrap;
}

/* RESPONSIVE */
@media(max-width:900px){#grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){#grid{grid-template-columns:1fr}.span2{grid-column:span 1}}
</style>
</head>
<body>

<!-- TOPBAR -->
<div id="topbar">
  <div class="logo">S500<span>/</span>DRONE</div>
  <div id="topbar-right">
    <div id="sd-info">SD: --</div>
    <div id="uptime">UP: 00:00:00</div>
    <div id="ws-status"><div id="ws-dot"></div><span id="ws-label">OFFLINE</span></div>
  </div>
</div>

<!-- GRID -->
<div id="grid">

  <!-- ATTITUDE -->
  <div class="pnl span2" id="pnl-att">
    <div class="pnl-title">Attitude</div>
    <div class="horizon-wrap">
      <canvas id="horizon" width="220" height="100"></canvas>
    </div>
    <div class="row-vals" style="margin-top:6px">
      <div class="rv"><div class="lbl">Roll</div><div class="v hi" id="v-roll">0.0°</div></div>
      <div class="rv"><div class="lbl">Pitch</div><div class="v hi" id="v-pitch">0.0°</div></div>
      <div class="rv"><div class="lbl">Yaw</div><div class="v hi" id="v-yaw">0°</div></div>
    </div>
  </div>

  <!-- GPS -->
  <div class="pnl span2" id="pnl-gps">
    <div class="pnl-title">GPS</div>
    <div class="row-vals">
      <div class="rv"><div class="lbl">Fix</div><div class="v" id="v-fix">NO FIX</div></div>
      <div class="rv"><div class="lbl">Sats</div><div class="v" id="v-sats">0</div></div>
      <div class="rv"><div class="lbl">Lat</div><div class="v" id="v-lat">--</div></div>
      <div class="rv"><div class="lbl">Lon</div><div class="v" id="v-lon">--</div></div>
    </div>
    <div class="row-vals" style="margin-top:6px">
      <div class="rv"><div class="lbl">Alt GPS</div><div class="v" id="v-galt">-- m</div></div>
      <div class="rv"><div class="lbl">Speed</div><div class="v" id="v-spd">-- m/s</div></div>
      <div class="rv"><div class="lbl">COG</div><div class="v" id="v-cog">--°</div></div>
    </div>
    <div id="minimap"><canvas id="mapcanvas" width="300" height="120"></canvas></div>
  </div>

  <!-- ALTITUDE & VARIO -->
  <div class="pnl" id="pnl-alt">
    <div class="pnl-title">Altitude</div>
    <div class="val big" id="v-balt">0.00<span class="unit">m</span></div>
    <div style="margin-top:8px">
      <div class="pnl-title" style="margin-bottom:2px">Vario</div>
      <div class="val" id="v-vario" style="font-size:18px">0.00<span class="unit">m/s</span></div>
    </div>
  </div>

  <!-- ANALOG -->
  <div class="pnl" id="pnl-bat">
    <div class="pnl-title">Power</div>
    <div class="val big" id="v-vbat">--<span class="unit">V</span></div>
    <div class="bat-bar-bg"><div class="bat-bar-fill" id="bat-fill" style="width:0%"></div></div>
    <div class="row-vals" style="margin-top:6px">
      <div class="rv"><div class="lbl">Current</div><div class="v" id="v-curr">-- A</div></div>
      <div class="rv"><div class="lbl">mAh</div><div class="v" id="v-mah">--</div></div>
      <div class="rv"><div class="lbl">RSSI</div><div class="v" id="v-rssi">--</div></div>
    </div>
  </div>

  <!-- FLIGHT MODE -->
  <div class="pnl" id="pnl-fmode">
    <div class="pnl-title">Flight Mode</div>
    <div id="fmode">--</div>
    <div style="margin-top:10px">
      <div class="pnl-title" style="margin-bottom:4px">Status</div>
      <div class="row-vals">
        <div class="rv"><div class="lbl">Cycle</div><div class="v" id="v-cycle">-- µs</div></div>
        <div class="rv"><div class="lbl">i²C Err</div><div class="v" id="v-i2c">0</div></div>
        <div class="rv"><div class="lbl">Profile</div><div class="v" id="v-prof">0</div></div>
      </div>
    </div>
  </div>

  <!-- MOTORS -->
  <div class="pnl" id="pnl-motor">
    <div class="pnl-title">Motors</div>
    <div class="motor-grid">
      <div class="mbar-wrap"><div class="mbar-lbl">M1</div><div class="mbar-bg"><div class="mbar-fill" id="mb1" style="height:0%"></div></div><div class="mbar-val" id="mv1">1000</div></div>
      <div class="mbar-wrap"><div class="mbar-lbl">M2</div><div class="mbar-bg"><div class="mbar-fill" id="mb2" style="height:0%"></div></div><div class="mbar-val" id="mv2">1000</div></div>
      <div class="mbar-wrap"><div class="mbar-lbl">M3</div><div class="mbar-bg"><div class="mbar-fill" id="mb3" style="height:0%"></div></div><div class="mbar-val" id="mv3">1000</div></div>
      <div class="mbar-wrap"><div class="mbar-lbl">M4</div><div class="mbar-bg"><div class="mbar-fill" id="mb4" style="height:0%"></div></div><div class="mbar-val" id="mv4">1000</div></div>
    </div>
  </div>

  <!-- RC CHANNELS -->
  <div class="pnl span2" id="pnl-rc">
    <div class="pnl-title">RC Channels</div>
    <div class="rc-grid">
      <div class="rcbar-row"><span class="rcbar-lbl">CH1</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc1" style="width:50%"></div></div><span class="rcbar-val" id="rcv1">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH2</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc2" style="width:50%"></div></div><span class="rcbar-val" id="rcv2">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH3</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc3" style="width:50%"></div></div><span class="rcbar-val" id="rcv3">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH4</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc4" style="width:50%"></div></div><span class="rcbar-val" id="rcv4">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH5</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc5" style="width:50%"></div></div><span class="rcbar-val" id="rcv5">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH6</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc6" style="width:50%"></div></div><span class="rcbar-val" id="rcv6">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH7</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc7" style="width:50%"></div></div><span class="rcbar-val" id="rcv7">1500</span></div>
      <div class="rcbar-row"><span class="rcbar-lbl">CH8</span><div class="rcbar-bg"><div class="rcbar-fill" id="rc8" style="width:50%"></div></div><span class="rcbar-val" id="rcv8">1500</span></div>
    </div>
  </div>

  <!-- IMU -->
  <div class="pnl span2" id="pnl-imu">
    <div class="pnl-title">IMU Raw</div>
    <table class="imu-table">
      <tr><td>ACC X</td><td id="ia1">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ib1" style="width:50%"></div></div></td></tr>
      <tr><td>ACC Y</td><td id="ia2">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ib2" style="width:50%"></div></div></td></tr>
      <tr><td>ACC Z</td><td id="ia3">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ib3" style="width:50%"></div></div></td></tr>
      <tr><td>GYR X</td><td id="ig1">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ibg1" style="width:50%"></div></div></td></tr>
      <tr><td>GYR Y</td><td id="ig2">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ibg2" style="width:50%"></div></div></td></tr>
      <tr><td>GYR Z</td><td id="ig3">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ibg3" style="width:50%"></div></div></td></tr>
      <tr><td>MAG X</td><td id="im1">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ibm1" style="width:50%"></div></div></td></tr>
      <tr><td>MAG Y</td><td id="im2">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ibm2" style="width:50%"></div></div></td></tr>
      <tr><td>MAG Z</td><td id="im3">0</td><td><div class="imu-bar-bg"><div class="imu-bar-fill" id="ibm3" style="width:50%"></div></div></td></tr>
    </table>
  </div>

  <!-- AIS LOG -->
  <div class="pnl span4" id="pnl-ais">
    <div class="pnl-title">AIS NMEA Log</div>
    <div id="ais-log"></div>
  </div>

</div>

<!-- STATUS BAR -->
<div id="statusbar">
  <span>PKT: <span id="s-pkt">0</span></span>
  <span>RATE: <span id="s-rate">0</span>/s</span>
  <span>SD: <span id="s-sd">--</span></span>
  <span>WS: <span id="s-ws">--</span></span>
</div>

<script>
// ============================================================
// STATE
// ============================================================
const WS_URL = 'ws://' + location.hostname + ':81';
let ws, wsRetry = 0;
let pkt = 0, pktLast = 0, rateTimer = 0;
let startMs = Date.now();
let gpsTrack = []; // [{lat,lon}]

// ============================================================
// WEBSOCKET
// ============================================================
function wsConnect(){
  ws = new WebSocket(WS_URL);
  ws.onopen  = () => { wsSetStatus(true);  wsRetry=0; };
  ws.onclose = () => { wsSetStatus(false); setTimeout(wsConnect, 2000 + wsRetry*500); wsRetry++; };
  ws.onerror = () => ws.close();
  ws.onmessage = e => {
    try {
      const d = JSON.parse(e.data);
      pkt++;
      update(d);
    } catch(_){}
  };
}

function wsSetStatus(ok){
  document.getElementById('ws-dot').className   = ok ? 'ok' : '';
  document.getElementById('ws-label').textContent = ok ? 'LIVE' : 'OFFLINE';
  document.getElementById('s-ws').textContent   = ok ? 'OK' : 'DISC';
}

// ============================================================
// UPDATE
// ============================================================
function update(d){
  // --- Attitude ---
  if(d.roll!==undefined){
    set('v-roll',  d.roll.toFixed(1)+'°');
    set('v-pitch', d.pitch.toFixed(1)+'°');
    set('v-yaw',   d.yaw+'°');
    drawHorizon(d.roll, d.pitch);
  }

  // --- Altitude ---
  if(d.baro_alt!==undefined){
    set('v-balt', d.baro_alt.toFixed(2)+'<span class="unit">m</span>');
    const col = d.baro_alt > 50 ? 'warn' : '';
    document.getElementById('v-balt').className = 'val big ' + col;
  }
  if(d.vario!==undefined){
    const vc = d.vario > 0.5 ? 'ok' : d.vario < -0.5 ? 'err' : '';
    document.getElementById('v-vario').className = 'val ' + vc;
    set('v-vario', d.vario.toFixed(2)+'<span class="unit">m/s</span>');
  }

  // --- GPS ---
  if(d.gps_fix!==undefined){
    const fixEl = document.getElementById('v-fix');
    fixEl.textContent = d.gps_fix ? '3D FIX' : 'NO FIX';
    fixEl.className = 'v ' + (d.gps_fix ? 'ok' : 'err');
    document.getElementById('pnl-gps').className = 'pnl span2 ' + (d.gps_fix ? 'accent-ok' : 'accent-err');
  }
  if(d.sats!==undefined) set('v-sats', d.sats);
  if(d.lat!==undefined){
    set('v-lat', d.lat.toFixed(6));
    set('v-lon', d.lon.toFixed(6));
    set('v-galt', d.gps_alt+' m');
    set('v-spd',  d.speed.toFixed(2)+' m/s');
    set('v-cog',  d.cog+'°');
    if(d.gps_fix && d.lat !== 0){
      gpsTrack.push({lat:d.lat, lon:d.lon});
      if(gpsTrack.length > 200) gpsTrack.shift();
      drawMinimap();
    }
  }

  // --- Power ---
  if(d.vbat!==undefined){
    const volts = (d.vbat * 0.1).toFixed(1);
    const pct   = Math.max(0, Math.min(100, (parseFloat(volts)-13.2)/(16.8-13.2)*100));
    set('v-vbat', volts+'<span class="unit">V</span>');
    const fill = document.getElementById('bat-fill');
    fill.style.width = pct+'%';
    fill.style.background = pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--warn)' : 'var(--err)';
    document.getElementById('pnl-bat').className = 'pnl ' + (pct > 50 ? 'accent-ok' : pct > 25 ? 'accent-warn' : 'accent-err');
  }
  if(d.current!==undefined) set('v-curr', (d.current/100).toFixed(1)+' A');
  if(d.mah!==undefined)     set('v-mah',  d.mah);
  if(d.rssi!==undefined)    set('v-rssi', d.rssi);

  // --- Flight Mode ---
  if(d.flight_mode!==undefined){
    const modes = decodeModes(d.flight_mode);
    document.getElementById('fmode').textContent = modes.length ? modes.join(' | ') : 'ACRO';
  }
  if(d.cycleTime!==undefined) set('v-cycle', d.cycleTime+' µs');
  if(d.i2cError!==undefined)  set('v-i2c',   d.i2cError);
  if(d.profile!==undefined)   set('v-prof',   d.profile);

  // --- Motors ---
  ['m1','m2','m3','m4'].forEach((m,i)=>{
    if(d[m]===undefined) return;
    const pct = Math.max(0, Math.min(100, (d[m]-1000)/10));
    document.getElementById('mb'+(i+1)).style.height = pct+'%';
    document.getElementById('mv'+(i+1)).textContent  = d[m];
  });

  // --- RC ---
  for(let i=1;i<=8;i++){
    const v = d['ch'+i];
    if(v===undefined) continue;
    const pct = Math.max(0,Math.min(100,(v-1000)/10));
    document.getElementById('rc'+i).style.width = pct+'%';
    document.getElementById('rcv'+i).textContent = v;
  }

  // --- IMU ---
  const imuMap = [
    ['accX','ia1','ib1'],['accY','ia2','ib2'],['accZ','ia3','ib3'],
    ['gyrX','ig1','ibg1'],['gyrY','ig2','ibg2'],['gyrZ','ig3','ibg3'],
    ['magX','im1','ibm1'],['magY','im2','ibm2'],['magZ','im3','ibm3'],
  ];
  imuMap.forEach(([key,vid,bid])=>{
    if(d[key]===undefined) return;
    document.getElementById(vid).textContent = d[key];
    const pct = Math.max(0,Math.min(100,50+d[key]/655.36*50));
    document.getElementById(bid).style.width = pct+'%';
  });

  // --- AIS ---
  if(d.ais_msg9) addAisLog('MSG9', d.ais_msg9, 'm9');
  if(d.ais_msg8) addAisLog('MSG8', d.ais_msg8, 'm8');
  if(d.ais_msg24) addAisLog('MSG24', d.ais_msg24, 'm24');

  // --- SD ---
  if(d.sd!==undefined){
    const sdEl = document.getElementById('sd-info');
    sdEl.textContent = d.sd ? 'SD: '+d.sd_rows+' rows' : 'SD: --';
    sdEl.className = d.sd ? 'ok' : '';
    document.getElementById('s-sd').textContent = d.sd ? d.sd_rows : 'N/A';
  }
}

// ============================================================
// HELPERS
// ============================================================
function set(id, html){
  const el = document.getElementById(id);
  if(el) el.innerHTML = html;
}

function addAisLog(tag, nmea, cls){
  const log = document.getElementById('ais-log');
  const div = document.createElement('div');
  div.className = 'ais-entry';
  div.innerHTML = '<span class="ais-tag">'+tag+'</span><span class="ais-nmea">'+nmea+'</span>';
  log.insertBefore(div, log.firstChild);
  if(log.children.length > 30) log.removeChild(log.lastChild);
}

function decodeModes(flags){
  const names=['ARM','ANGLE','HORIZON','BARO','MAG','GPS_RESCUE','FAILSAFE','AIRMODE'];
  return names.filter((_,i)=>flags & (1<<i));
}

// ============================================================
// ARTIFICIAL HORIZON
// ============================================================
function drawHorizon(rollDeg, pitchDeg){
  const c = document.getElementById('horizon');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 4;

  ctx.clearRect(0,0,W,H);

  // Clip circle
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();

  const roll  = rollDeg  * Math.PI/180;
  const pitch = pitchDeg * (H/2) / 45; // px per 45°

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(roll);

  // Sky
  ctx.fillStyle='#0a2a4a';
  ctx.fillRect(-W,-H, W*2, H+pitch);
  // Ground
  ctx.fillStyle='#3d2200';
  ctx.fillRect(-W, pitch, W*2, H);
  // Horizon line
  ctx.strokeStyle='#00e5ff';
  ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-W, pitch); ctx.lineTo(W, pitch); ctx.stroke();
  // Pitch marks
  ctx.strokeStyle='rgba(0,229,255,0.3)';
  ctx.lineWidth=1;
  for(let p=-4;p<=4;p++){
    if(p===0) continue;
    const y = pitch + p*(H/2)/4;
    ctx.beginPath(); ctx.moveTo(-20,y); ctx.lineTo(20,y); ctx.stroke();
  }
  ctx.restore();

  // Center reticle
  ctx.strokeStyle='#ffffff';
  ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(cx-30,cy); ctx.lineTo(cx-10,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+10,cy); ctx.lineTo(cx+30,cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.stroke();

  ctx.restore();

  // Border
  ctx.strokeStyle='#1e2229';
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
}

// ============================================================
// MINI MAP
// ============================================================
function drawMinimap(){
  if(gpsTrack.length < 2) return;
  const canvas = document.getElementById('mapcanvas');
  // Resize canvas to container
  const cont = document.getElementById('minimap');
  canvas.width  = cont.clientWidth  || 300;
  canvas.height = cont.clientHeight || 120;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);

  const lats = gpsTrack.map(p=>p.lat), lons = gpsTrack.map(p=>p.lon);
  const minLat=Math.min(...lats), maxLat=Math.max(...lats);
  const minLon=Math.min(...lons), maxLon=Math.max(...lons);
  const pad=12;

  const toX = lon => pad + (lon-minLon)/(maxLon-minLon||1e-7) * (W-pad*2);
  const toY = lat => H-pad - (lat-minLat)/(maxLat-minLat||1e-7) * (H-pad*2);

  // Track
  ctx.strokeStyle='rgba(0,229,255,0.4)';
  ctx.lineWidth=1.5;
  ctx.beginPath();
  gpsTrack.forEach((p,i) => i===0 ? ctx.moveTo(toX(p.lon),toY(p.lat)) : ctx.lineTo(toX(p.lon),toY(p.lat)));
  ctx.stroke();

  // Current pos
  const last = gpsTrack[gpsTrack.length-1];
  const px = toX(last.lon), py = toY(last.lat);
  ctx.fillStyle='var(--ok)';
  ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(57,255,20,0.3)';
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.stroke();
}

// ============================================================
// UPTIME & RATE
// ============================================================
setInterval(()=>{
  // Uptime
  const s = Math.floor((Date.now()-startMs)/1000);
  const h = String(Math.floor(s/3600)).padStart(2,'0');
  const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const sc= String(s%60).padStart(2,'0');
  document.getElementById('uptime').textContent = 'UP: '+h+':'+m+':'+sc;

  // Packet rate
  const rate = pkt - pktLast; pktLast = pkt;
  document.getElementById('s-pkt').textContent  = pkt;
  document.getElementById('s-rate').textContent = rate;
}, 1000);

// ============================================================
// INIT
// ============================================================
wsConnect();
drawHorizon(0,0);
</script>
</body>
</html>
)=====";