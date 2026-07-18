import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { MAP_TILES } from '../data/mockData.jsx'
import { resolveSource } from '../utils/helpers.jsx'

const GL = () => window.L

let _cssReady = false
function injectCSS() {
  if (_cssReady) return; _cssReady = true
  document.head.insertAdjacentHTML('beforeend', `<style>
    @keyframes _mSpin  { to { transform:rotate(360deg)  } }
    @keyframes _mSpinR { to { transform:rotate(-360deg) } }
    @keyframes _mBlink { 0%,100%{opacity:1} 50%{opacity:.12} }
    @keyframes _mPing  { 0%{transform:scale(.8);opacity:.85} 100%{transform:scale(2.8);opacity:0} }
    @keyframes _mPing2 { 0%{transform:scale(.8);opacity:.6}  100%{transform:scale(2.8);opacity:0} }
    ._ms  { animation:_mSpin  .42s linear infinite }
    ._msr { animation:_mSpinR .42s linear infinite }
    ._mb  { animation:_mBlink .9s step-end infinite }
    ._mp  { position:absolute;border-radius:50%;pointer-events:none;
            animation:_mPing 2s ease-out infinite }
    ._mp2 { position:absolute;border-radius:50%;pointer-events:none;
            animation:_mPing2 2s ease-out .65s infinite }
    .ruler-distance { background:white;border:1px solid rgba(0,0,0,.12);border-radius:6px;padding:4px 14px;font-family:poppins;font-size:12px;font-weight:600;color:#1e40af;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap }
    .ruler-distance::before { display:none!important }
    .auto-ruler-btn { background:rgba(255,255,255,.94);border:1px solid rgba(0,0,0,.08);border-radius:8px;padding:6px 12px;font-family:poppins;font-size:10px;color:#475569;box-shadow:0 2px 8px rgba(0,0,0,.1);backdropFilter:blur(12px);cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:5px }
    .auto-ruler-btn:hover { background:rgba(241,245,249,.94) }
    .auto-ruler-btn.active { color:#1e40af;border-color:rgba(30,64,175,.3);background:rgba(219,234,254,.94) }
    .auto-ruler-tooltip { background:#1e40af;color:white;border:none;border-radius:6px;padding:3px 10px;font-family:poppins;font-size:11px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap }
    .auto-ruler-tooltip::before { border-right-color:#1e40af!important }
    .ruler-label-a { background:#16a34a;border:2px solid white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-family:poppins;font-size:10px;font-weight:700;color:white;box-shadow:0 1px 3px rgba(0,0,0,.2) }
    .ruler-label-b { background:#dc2626;border:2px solid white;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-family:poppins;font-size:10px;font-weight:700;color:white;box-shadow:0 1px 3px rgba(0,0,0,.2) }
  </style>`)
}

/* ── DRONE icon — blue ── */
function droneHTML(cs, heading) {
  const h = heading ?? 0
  return `<div style="position:relative;width:52px;height:60px">
  <div class="_mp"  style="width:48px;height:48px;top:2px;left:2px;border:1.5px solid rgba(29,78,216,.4)"></div>
  <div class="_mp2" style="width:48px;height:48px;top:2px;left:2px;border:1px solid rgba(29,78,216,.25)"></div>
  <svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:0;overflow:visible;filter:drop-shadow(0 2px 4px rgba(29,78,216,.25))">
    <line x1="26" y1="26" x2="10" y2="10" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="42" y2="10" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="10" y2="42" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="26" y1="26" x2="42" y2="42" stroke="#93c5fd" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="10" cy="10" r="7" fill="rgba(219,234,254,.9)" stroke="#2563eb" stroke-width="1.4"/>
    <circle cx="42" cy="10" r="7" fill="rgba(219,234,254,.9)" stroke="#2563eb" stroke-width="1.4"/>
    <circle cx="10" cy="42" r="7" fill="rgba(219,234,254,.9)" stroke="#2563eb" stroke-width="1.4"/>
    <circle cx="42" cy="42" r="7" fill="rgba(219,234,254,.9)" stroke="#2563eb" stroke-width="1.4"/>
    <g class="_ms"  style="transform-origin:10px 10px"><line x1="10" y1="4"  x2="10" y2="16" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><line x1="4"  y1="10" x2="16" y2="10" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></g>
    <g class="_msr" style="transform-origin:42px 10px"><line x1="42" y1="4"  x2="42" y2="16" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><line x1="36" y1="10" x2="48" y2="10" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></g>
    <g class="_msr" style="transform-origin:10px 42px"><line x1="10" y1="36" x2="10" y2="48" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><line x1="4"  y1="42" x2="16" y2="42" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></g>
    <g class="_ms"  style="transform-origin:42px 42px"><line x1="42" y1="36" x2="42" y2="48" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><line x1="36" y1="42" x2="48" y2="42" stroke="#1d4ed8" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></g>
    <circle cx="10" cy="10" r="2.2" fill="#2563eb"/>
    <circle cx="42" cy="10" r="2.2" fill="#2563eb"/>
    <circle cx="10" cy="42" r="2.2" fill="#2563eb"/>
    <circle cx="42" cy="42" r="2.2" fill="#2563eb"/>
    <rect x="20" y="20" width="12" height="12" rx="3" fill="white" stroke="#2563eb" stroke-width="1.6"/>
    <circle cx="26" cy="26" r="3.2" fill="none" stroke="#2563eb" stroke-width="1.4"/>
    <circle cx="26" cy="26" r="1.4" fill="#2563eb"/>
    <polygon points="26,18 23.5,22 28.5,22" fill="#2563eb"/>
    <circle class="_mb" cx="26" cy="26" r="1" fill="#059669"/>
    <g transform="rotate(${h} 26 26)">
      <line x1="26" y1="26" x2="26" y2="6" stroke="#f43f5e" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
      <polygon points="26,4 23,9 29,9" fill="#f43f5e" opacity=".85"/>
    </g>
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1.5px solid #2563eb;border-radius:3px;
    padding:1px 6px;font-family:poppins;font-size:8px;color:#1d4ed8;
    white-space:nowrap;letter-spacing:.4px;font-weight:500;
    box-shadow:0 1px 4px rgba(29,78,216,.2)">${cs||'DRONE'}</div>
</div>`
}

/* ── VESSEL icon — Class A (blue) / Class B (amber) ── */
function vesselHTML(cog, moving, name, type) {
  const isA  = type === 'Class A'
  const hue  = moving ? (isA ? '#f43f5e' : '#d97706') : '#94a3b8'
  const fill = moving ? (isA ? 'rgba(255,228,230,.92)' : 'rgba(254,243,199,.92)') : 'rgba(241,245,249,.92)'
  const short = (name || '').replace(/^(KM|MV|MT|KMN|KN|RB|KP|KMP|BG|TB)\s*/i, '').slice(0, 10)
  const wake  = moving ? `<ellipse cx="14" cy="2" rx="3.5" ry="1.8" fill="${hue}" opacity=".18"/>` : ''
  return `<div style="position:relative;width:28px;height:42px">
  <svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:0;overflow:visible;
      transform:rotate(${cog}deg);transform-origin:14px 17px;transition:transform .9s ease;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,.18))">
    ${wake}
    <path d="M14,2 C14,2 21,9 21,16 L21,24 C21,28 18.5,31.5 14,32 C9.5,31.5 7,28 7,24 L7,16 C7,9 14,2 14,2Z"
      fill="${fill}" stroke="${hue}" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="10" y="14" width="8" height="9" rx="1.5" fill="${hue}" fill-opacity=".35" stroke="${hue}" stroke-width="1"/>
    <polygon points="14,4 11.5,11 16.5,11" fill="${hue}" opacity=".9"/>
    <circle cx="7.5"  cy="21" r="1.4" fill="#f87171" opacity=".9"/>
    <circle cx="20.5" cy="21" r="1.4" fill="#4ade80" opacity=".9"/>
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1px solid ${hue};border-radius:3px;
    padding:1px 4px;font-family:poppins;font-size:7px;color:${hue};
    white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 1px 2px rgba(0,0,0,.1)">${short}</div>
</div>`
}

/* ── SAR icon — orange, plane or helicopter ── */
function sarHTML(cog, name) {
  const c     = '#ea580c'
  const isH   = /heli|bo.?1|ec.?[0-9]|nbo|caracal/i.test(name || '')
  const short = (name || '').slice(0, 10)
  const shape = isH
    ? `<ellipse cx="16" cy="18" rx="3" ry="9" fill="rgba(254,215,170,.9)" stroke="${c}" stroke-width="1.3"/>
       <ellipse cx="16" cy="11" rx="12" ry="2.5" fill="rgba(254,215,170,.6)" stroke="${c}" stroke-width="1"/>
       <g class="_ms" style="transform-origin:16px 11px">
         <line x1="4" y1="11" x2="28" y2="11" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity=".75"/>
       </g>
       <ellipse cx="16" cy="7" rx="2" ry="3" fill="rgba(186,230,253,.7)" stroke="${c}" stroke-width=".8"/>`
    : `<ellipse cx="16" cy="16" rx="3" ry="11" fill="rgba(254,215,170,.9)" stroke="${c}" stroke-width="1.3"/>
       <path d="M16,15 L4,19.5 L4,22 L16,18.5 L28,22 L28,19.5 Z" fill="rgba(254,215,170,.7)" stroke="${c}" stroke-width="1" stroke-linejoin="round"/>
       <path d="M16,23.5 L10.5,27 L10.5,29 L16,26 L21.5,29 L21.5,27 Z" fill="rgba(254,215,170,.7)" stroke="${c}" stroke-width=".9" stroke-linejoin="round"/>
       <ellipse cx="16" cy="5.5" rx="2" ry="3" fill="${c}" opacity=".85"/>
       <ellipse cx="16" cy="8.5" rx="1.5" ry="2.5" fill="rgba(186,230,253,.6)" stroke="${c}" stroke-width=".7"/>`
  return `<div style="position:relative;width:36px;height:46px">
  <div class="_mp" style="width:34px;height:34px;top:1px;left:1px;border:1px solid rgba(234,88,12,.4)"></div>
  <svg width="34" height="36" viewBox="0 0 32 36" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:1px;overflow:visible;
      transform:rotate(${cog}deg);transform-origin:16px 18px;transition:transform .9s ease;
      filter:drop-shadow(0 1px 3px rgba(234,88,12,.3))">
    ${shape}
    <circle cx="8"  cy="18" r="1.2" fill="#f87171" opacity=".9"/>
    <circle cx="24" cy="18" r="1.2" fill="#4ade80" opacity=".9"/>
    <circle class="_mb" cx="16" cy="16" r="1.5" fill="white" opacity=".85"/>
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1.5px solid ${c};border-radius:3px;
    padding:1px 5px;font-family:poppins;font-size:7px;color:${c};
    white-space:nowrap;max-width:82px;overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 1px 3px rgba(234,88,12,.2)">${short}</div>
</div>`
}

/* ── LONG RANGE icon — MSG 27, satelit — teal, minimalis ── */
function longRangeHTML(cog, name) {
  const c     = '#0d9488'
  const short = (name || '').slice(0, 10)
  return `<div style="position:relative;width:28px;height:42px">
  <svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:0;overflow:visible;
      transform:rotate(${cog}deg);transform-origin:14px 17px;transition:transform .9s ease;
      filter:drop-shadow(0 1px 3px rgba(13,148,136,.25))">
    <path d="M14,2 L20,10 L20,24 C20,28 17,31 14,32 C11,31 8,28 8,24 L8,10 Z"
      fill="rgba(204,251,241,.9)" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
    <polygon points="14,3 11.5,10 16.5,10" fill="${c}" opacity=".85"/>
    <!-- dashed horizontal lines — long range indicator -->
    <line x1="6" y1="14" x2="22" y2="14" stroke="${c}" stroke-width=".8" stroke-dasharray="2,2" opacity=".6"/>
    <line x1="6" y1="19" x2="22" y2="19" stroke="${c}" stroke-width=".8" stroke-dasharray="2,2" opacity=".4"/>
    <circle cx="7.5"  cy="21" r="1.2" fill="#f87171" opacity=".9"/>
    <circle cx="20.5" cy="21" r="1.2" fill="#4ade80" opacity=".9"/>
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1px solid ${c};border-radius:3px;
    padding:1px 4px;font-family:poppins;font-size:7px;color:${c};
    white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 1px 2px rgba(0,0,0,.1)">${short || 'LR'}</div>
</div>`
}

/* ── ATON icon — Aid-to-Navigation, MSG 21 — merah/putih buoy ── */
function atonHTML(name, atonType) {
  // atonType 1–19 = buoy/beacon, 20–31 = fixed structure
  const isFixed = atonType >= 20
  const c       = '#dc2626'
  const short   = (name || '').slice(0, 8)
  const shape   = isFixed
    // Fixed: menara/mercusuar
    ? `<rect x="11" y="8" width="6" height="18" rx="1" fill="rgba(254,226,226,.9)" stroke="${c}" stroke-width="1.4"/>
       <polygon points="14,3 10,8 18,8" fill="${c}" opacity=".9"/>
       <rect x="10" y="22" width="8" height="3" rx="1" fill="${c}" opacity=".7"/>
       <circle class="_mb" cx="14" cy="5" r="2" fill="#fbbf24"/>`
    // Buoy: pelampung
    : `<ellipse cx="14" cy="18" rx="7" ry="9" fill="rgba(254,226,226,.9)" stroke="${c}" stroke-width="1.4"/>
       <line x1="14" y1="4" x2="14" y2="9" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
       <polygon points="14,4 11,9 17,9" fill="${c}" opacity=".85"/>
       <line x1="7" y1="18" x2="21" y2="18" stroke="${c}" stroke-width="1" opacity=".5"/>
       <circle class="_mb" cx="14" cy="14" r="1.8" fill="#fbbf24"/>`
  return `<div style="position:relative;width:28px;height:42px">
  <svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:0;overflow:visible;
      filter:drop-shadow(0 1px 3px rgba(220,38,38,.25))">
    ${shape}
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1px solid ${c};border-radius:3px;
    padding:1px 4px;font-family:poppins;font-size:7px;color:${c};
    white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 1px 2px rgba(0,0,0,.1)">${short || 'AtoN'}</div>
</div>`
}

/* ── BASE STATION icon — MSG 4/11, tower + pulse — purple ── */
function stationHTML(name) {
  const c     = '#7c3aed'
  const short = (name || '').slice(0, 8)
  return `<div style="position:relative;width:34px;height:44px">
  <div class="_mp" style="width:28px;height:28px;top:2px;left:3px;border:1px solid rgba(124,58,237,.35)"></div>
  <svg width="34" height="36" viewBox="0 0 34 36" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:0;overflow:visible;
      filter:drop-shadow(0 1px 3px rgba(124,58,237,.25))">
    <!-- Menara antena -->
    <line x1="17" y1="4"  x2="17" y2="28" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="10" y1="14" x2="17" y2="10" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="24" y1="14" x2="17" y2="10" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7"  y1="20" x2="17" y2="14" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="27" y1="20" x2="17" y2="14" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Base -->
    <line x1="10" y1="28" x2="24" y2="28" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="13" y1="28" x2="10" y2="33" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="21" y1="28" x2="24" y2="33" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Signal arcs -->
    <path d="M10,8 Q17,5 24,8"   fill="none" stroke="${c}" stroke-width="1" opacity=".5" stroke-dasharray="2,2"/>
    <path d="M7,11  Q17,7 27,11" fill="none" stroke="${c}" stroke-width=".8" opacity=".3" stroke-dasharray="2,2"/>
    <!-- Blink top -->
    <circle class="_mb" cx="17" cy="4" r="2.2" fill="#fbbf24"/>
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1px solid ${c};border-radius:3px;
    padding:1px 4px;font-family:poppins;font-size:7px;color:${c};
    white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis;
    box-shadow:0 1px 2px rgba(0,0,0,.1)">${short || 'BASE'}</div>
</div>`
}

/* ── GPS icon — green, crosshair + satellite ── */
function gpsHTML(gps) {
  const c = '#059669'
  const ql = ['Invalid','GPS','DGPS','PPS','RTK Fix','RTK Float','Estimated','Manual','Sim']
  const q = gps.fixQuality != null ? ql[gps.fixQuality] || 'Fix' : '—'
  return `<div style="position:relative;width:40px;height:50px">
  <div class="_mp" style="width:34px;height:34px;top:3px;left:3px;border:1px solid rgba(5,150,105,.3)"></div>
  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;top:0;left:0;overflow:visible;filter:drop-shadow(0 1px 3px rgba(5,150,105,.2))">
    <circle cx="20" cy="20" r="11" fill="rgba(209,250,229,.92)" stroke="${c}" stroke-width="1.6"/>
    <line x1="20" y1="7" x2="20" y2="33" stroke="${c}" stroke-width=".9" opacity=".4"/>
    <line x1="7" y1="20" x2="33" y2="20" stroke="${c}" stroke-width=".9" opacity=".4"/>
    <circle cx="20" cy="20" r="3.5" fill="${c}"/>
    <circle cx="20" cy="20" r="1.5" fill="white" opacity=".7"/>
    <path d="M13,7 Q20,0 27,7" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="20" y1="6" x2="20" y2="11" stroke="${c}" stroke-width="1.2"/>
    <circle class="_mb" cx="20" cy="20" r="1.8" fill="#10b981"/>
  </svg>
  <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
    background:white;border:1px solid ${c};border-radius:3px;
    padding:1px 5px;font-family:poppins;font-size:7px;color:${c};
    white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.1)">GPS ${q}</div>
</div>`
}

/* ── UNKNOWN / fallback icon ── */
function unknownHTML(mmsi) {
  return `<div style="width:24px;height:24px;background:rgba(241,245,249,.9);
    border:1.5px solid #94a3b8;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-family:poppins;font-size:8px;color:#64748b;font-weight:600;
    box-shadow:0 1px 3px rgba(0,0,0,.12)">?</div>`
}

/* ── Helper: resolve icon + popup by vessel type ── */
function resolveVesselIcon(Lf, v) {
  const cog    = Number(v.cog) || 0
  const moving = Number(v.sog) > 0.5
  const type   = v.type || ''

  switch (type) {
    case 'Class A':
    case 'Class B':
      return Lf.divIcon({
        className: '',
        html: vesselHTML(cog, moving, v.name, type),
        iconSize:   [28, 42],
        iconAnchor: [14, 18],
        popupAnchor:[0, -22],
      })
    case 'SAR Aircraft':
      return Lf.divIcon({
        className: '',
        html: sarHTML(cog, v.name),
        iconSize:   [36, 46],
        iconAnchor: [18, 18],
        popupAnchor:[0, -22],
      })
    case 'Long Range':
      return Lf.divIcon({
        className: '',
        html: longRangeHTML(cog, v.name),
        iconSize:   [28, 42],
        iconAnchor: [14, 18],
        popupAnchor:[0, -22],
      })
    case 'AtoN':
      return Lf.divIcon({
        className: '',
        html: atonHTML(v.name, v.atonType),
        iconSize:   [28, 42],
        iconAnchor: [14, 18],
        popupAnchor:[0, -22],
      })
    case 'Base Station':
      return Lf.divIcon({
        className: '',
        html: stationHTML(v.name || v.mmsi),
        iconSize:   [34, 44],
        iconAnchor: [17, 18],
        popupAnchor:[0, -22],
      })
    default:
      return Lf.divIcon({
        className: '',
        html: unknownHTML(v.mmsi),
        iconSize:   [24, 24],
        iconAnchor: [12, 12],
        popupAnchor:[0, -14],
      })
  }
}

/* ── Popups ── */
const nf = (v, d = 1) => v != null && isFinite(v) ? Number(v).toFixed(d) : '—'

const relTime = (ts) => {
  const t = typeof ts === 'number' ? ts : Number(ts)
  if (!t || isNaN(t) || t < 1e12) return '—'
  const diff = Math.floor((Date.now() - t) / 1000)
  if (diff < 0)     return '0s ago'
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const popup = (title, accent, rows) => `<div style="font-family:poppins;font-size:11px;color:#475569">
  <div style="color:${accent};font-size:12px;font-weight:600;margin-bottom:6px;
    padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,.07)">${title}</div>
  ${rows.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:1px 0">
    <span style="color:#94a3b8">${k}</span>
    <span style="color:#0f172a;font-weight:500">${v}</span>
  </div>`).join('')}
</div>`

const dronePopup = (d, tcpConns) => popup(
  `${d.callsign || 'DRONE'} <span style="color:#94a3b8;font-size:9px;font-weight:400">MSG 8</span>`,
  '#1d4ed8',
  [['MMSI', d.mmsi], ['LAT', `${nf(d.lat, 5)}°`], ['LON', `${nf(d.lon, 5)}°`],
   ['ALT', `${nf(d.alt, 1)} m`], ['SOG', `${nf(d.sog, 1)} kn`],
   ['MODE', d.mode || '—'], ['BAT', `${Math.round(d.battery || 0)}%`],
   ['SATS', d.satellites ?? '—'], ['ROLL', `${nf(d.roll, 1)}°`], ['PITCH', `${nf(d.pitch, 1)}°`],
   ['SOURCE', resolveSource(d.source, tcpConns)], ['UPDATED', relTime(d.ts)]])

const vesselPopup = (v, tcpConns) => popup(
  v.name || v.mmsi,
  v.type === 'Class A' ? '#f43f5e' : '#d97706',
  [['NAME', v.name || '—'], ['MMSI', v.mmsi], ['TYPE', v.type], ['LAT', `${nf(v.lat, 5)}°`],
   ['LON', `${nf(v.lon, 5)}°`], ['SOG', `${nf(v.sog, 1)} kn`],
   ['COG', `${nf(v.cog, 0)}°`], ['STATUS', v.status || '—'],
   ...(v.type==='Class A'?[['DESTINATION', v.destination || '—']]:[]),
   ['SOURCE', resolveSource(v.source, tcpConns)], ['LAST UPDATED', relTime(v.ts)]])

const sarPopup = (v, tcpConns) => popup(
  v.name || `SAR-${(v.mmsi || '').slice(-4)}`,
  '#ea580c',
  [['NAME', v.name || '—'], ['MMSI', v.mmsi], ['MSG', 'Type 9 SAR'], ['LAT', `${nf(v.lat, 5)}°`],
   ['LON', `${nf(v.lon, 5)}°`], ['ALT', v.alt != null ? `${nf(v.alt, 0)} m` : '—'],
   ['SOG', `${nf(v.sog, 1)} kn`],
   ['SOURCE', resolveSource(v.source, tcpConns)], ['LAST UPDATED', relTime(v.ts)]])

const longRangePopup = (v, tcpConns) => popup(
  v.name || v.mmsi,
  '#0d9488',
  [['NAME', v.name || '—'], ['MMSI', v.mmsi], ['MSG', 'Type 27 LR'], ['LAT', `${nf(v.lat, 5)}°`],
   ['LON', `${nf(v.lon, 5)}°`], ['SOG', `${nf(v.sog, 0)} kn`],
   ['COG', `${nf(v.cog, 0)}°`], ['STATUS', v.status || '—'],
   ['SOURCE', resolveSource(v.source, tcpConns)], ['LAST UPDATED', relTime(v.ts)]])

const atonPopup = (v, tcpConns) => popup(
  v.name || `AtoN-${(v.mmsi || '').slice(-4)}`,
  '#dc2626',
  [['NAME', v.name || '—'], ['MMSI', v.mmsi], ['MSG', 'Type 21 AtoN'], ['LAT', `${nf(v.lat, 5)}°`],
   ['LON', `${nf(v.lon, 5)}°`], ['TYPE ID', v.atonType ?? '—'],
   ['OFF POS', v.offPos ? 'YES ⚠' : 'No'], ['VIRTUAL', v.virtual ? 'Yes' : 'No'],
   ['SOURCE', resolveSource(v.source, tcpConns)], ['LAST UPDATED', relTime(v.ts)]])

const stationPopup = (v, tcpConns) => popup(
  v.name || `Station ${v.mmsi || '—'} (MSG 4/11)`,
  '#7c3aed',
  [['NAME', v.name || '—'], ['MMSI', v.mmsi], ['MSG', 'Type 4/11'], ['LAT', `${nf(v.lat, 5)}°`],
   ['LON', `${nf(v.lon, 5)}°`], ['EPFD', v.epfd && v.epfd !== 'Undefined' ? v.epfd : '—'],
   ['UTC', v.year ? `${v.year}-${String(v.month||0).padStart(2,'0')}-${String(v.day||0).padStart(2,'0')} ${String(v.hour||0).padStart(2,'0')}:${String(v.minute||0).padStart(2,'0')}:${String(v.second||0).padStart(2,'0')}` : '—'],
   ['SOURCE', resolveSource(v.source, tcpConns)], ['LAST UPDATED', relTime(v.ts)]])

const gpsPopup = g => {
  const ql = ['Invalid','GPS','DGPS','PPS','RTK Fix','RTK Float','Estimated','Manual','Sim']
  const q = g.fixQuality != null ? ql[g.fixQuality] || 'Fix' : '—'
  return popup(
    `GPS Receiver <span style="color:#94a3b8;font-size:9px;font-weight:400">${q}</span>`,
    '#059669',
    [['LAT', `${nf(g.lat, 5)}°`], ['LON', `${nf(g.lon, 5)}°`],
     ['ALT', `${nf(g.altitude, 1)} m`],
     ['SOG', g.sog != null ? `${nf(g.sog, 2)} m/s` : '—'],
     ['COG', `${nf(g.cog, 1)}°`],
     ['SAT', g.satCount ?? '—'], ['HDOP', g.hdop != null ? nf(g.hdop, 1) : '—'],
     ['FIX QUALITY', q], ['UPDATED', relTime(g.ts)]])
}

/* ── Helper: resolve popup by type ── */
function resolvePopup(v, tcpConns) {
  const src = resolveSource(v.source, tcpConns)
  switch (v.type) {
    case 'Class A':
    case 'Class B':    return vesselPopup(v, tcpConns)
    case 'SAR Aircraft': return sarPopup(v, tcpConns)
    case 'Long Range': return longRangePopup(v, tcpConns)
    case 'AtoN':       return atonPopup(v, tcpConns)
    case 'Base Station': return stationPopup(v, tcpConns)
    default:           return popup(v.name || v.mmsi, '#64748b',
                         [['NAME', v.name || '—'], ['MMSI', v.mmsi], ['TYPE', v.type || '—'], ['SOURCE', src], ['LAST UPDATED', relTime(v.ts)]])
  }
}

/* ── Measure helpers ── */
function formatDistance(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + ' km'
  return Math.round(m) + ' m'
}
function measureMarkerHTML(label, color) {
  return `<div style="position:relative;width:34px;height:34px">
  <div style="position:absolute;inset:0;background:white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
  <div style="position:absolute;top:4px;left:4px;width:26px;height:26px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:poppins;font-size:10px;font-weight:700;color:white;box-shadow:0 1px 3px rgba(0,0,0,.2)">${label}</div>
</div>`
}


/* ══ MAIN ══ */
const MapView = forwardRef(function MapView({ drone, gps, aisTargets, mapMode, tcpConns }, ref) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const tileRef      = useRef(null)
  const droneRef     = useRef(null)
  const gpsRef       = useRef(null)
  const vesselRefs    = useRef({})
  const iconCacheRef  = useRef({})
  const popupCacheRef = useRef({})
  const modeRef = useRef(mapMode)
  const tcpConnsRef = useRef(tcpConns)
  tcpConnsRef.current = tcpConns

  const [ctxMenu, setCtxMenu] = useState(null)
  const [rulerActive, setRulerActive] = useState(false)
  const [cursorLatLng, setCursorLatLng] = useState(null)
  const [autoRuler, setAutoRuler] = useState(true)
  const rulerGroupRef = useRef(null)
  const rulerStartRef = useRef(null)
  const rulerActiveRef = useRef(false)
  const autoRulerRef = useRef(null)
  const autoRulerDrawnRef = useRef(false)
  const ppnsMmsi = '005250052'

  const doRuler = () => {
    if (!rulerGroupRef.current || !ctxMenu) return
    const Lf = GL(); if (!Lf) return
    if (rulerStartRef.current?.marker) {
      try { rulerGroupRef.current.removeLayer(rulerStartRef.current.marker) } catch(e) {}
    }
    const marker = Lf.marker([ctxMenu.latlng.lat, ctxMenu.latlng.lng], {
      icon: Lf.divIcon({ className: '', html: measureMarkerHTML('A', '#16a34a'), iconSize: [34,34], iconAnchor: [17,17] }),
      zIndexOffset: 3000,
    }).addTo(rulerGroupRef.current)
    rulerStartRef.current = { latlng: ctxMenu.latlng, marker }
    rulerActiveRef.current = true
    setRulerActive(true)
    setCtxMenu(null)
  }

  const doClearAll = () => {
    if (rulerGroupRef.current) rulerGroupRef.current.clearLayers()
    if (autoRulerRef.current) autoRulerRef.current.clearLayers()
    rulerStartRef.current = null
    rulerActiveRef.current = false
    setRulerActive(false)
    setCtxMenu(null)
  }

  useImperativeHandle(ref, () => ({
    focusVessel(v) {
      if (!mapRef.current || !v) return
      mapRef.current.flyTo([v.lat, v.lon], 15, { animate: true, duration: .9 })
      setTimeout(() => vesselRefs.current[v.mmsi]?.openPopup(null, { autoPan: false }), 1100)
    },
    focusDrone() {
      if (!mapRef.current || !drone) return
      mapRef.current.flyTo([drone.lat, drone.lon], 15, { animate: true, duration: .9 })
      setTimeout(() => droneRef.current?.openPopup(null, { autoPan: false }), 1100)
    },
    focusGPS() {
      if (!mapRef.current || !gps || !isFinite(gps.lat)) return
      mapRef.current.flyTo([gps.lat, gps.lon], 15, { animate: true, duration: .9 })
      setTimeout(() => gpsRef.current?.openPopup(null, { autoPan: false }), 1100)
    },
  }))

  /* Init once */
  useEffect(() => {
    injectCSS()
    const Lf = GL(); if (!Lf || !containerRef.current || mapRef.current) return
    const map = Lf.map(containerRef.current, {
      center: [drone?.lat || -7.187, drone?.lon || 112.745],
      zoom: 13, zoomControl: false,
    })
    mapRef.current = map
    Lf.control.zoom({ position: 'bottomright' }).addTo(map)

    /* Compass rose */
    const CC = Lf.Control.extend({ options: { position: 'topright' }, onAdd() {
      const d = Lf.DomUtil.create('div')
      d.innerHTML = `<div style="width:60px;height:60px;background:white;
        border:1px solid rgba(0,0,0,.1);border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,.12)">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="24" fill="none" stroke="rgba(29,78,216,.1)" stroke-width="1.5"/>
          <polygon points="26,5 24,26 28,26" fill="#dc2626" opacity=".85"/>
          <polygon points="26,47 28,26 24,26" fill="rgba(0,0,0,.25)"/>
          <circle cx="26" cy="26" r="3.5" fill="white" stroke="rgba(29,78,216,.5)" stroke-width="1.2"/>
          <circle cx="26" cy="26" r="1.5" fill="rgba(29,78,216,.7)"/>
          <text x="26" y="18" text-anchor="middle" fill="#dc2626" font-size="8" font-family="DM Mono" font-weight="600">N</text>
          <text x="26" y="44" text-anchor="middle" fill="rgba(29,78,216,.7)" font-size="8" font-family="DM Mono">S</text>
          <text x="44" y="30" text-anchor="middle" fill="rgba(0,0,0,.4)" font-size="8" font-family="DM Mono">E</text>
          <text x="8"  y="30" text-anchor="middle" fill="rgba(0,0,0,.4)" font-size="8" font-family="DM Mono">W</text>
        </svg></div>`
      Lf.DomEvent.disableClickPropagation(d); Lf.DomEvent.disableScrollPropagation(d)
      return d
    }})
    new CC().addTo(map)

    /* ── Ruler layer group ── */
    rulerGroupRef.current = Lf.layerGroup().addTo(map)

    /* Right-click → context menu */
    map.on('contextmenu', function(e) {
      e.originalEvent.preventDefault()
      setCtxMenu({ x: e.containerPoint.x, y: e.containerPoint.y, latlng: e.latlng })
    })

    /* Mouse move → update cursor position */
    map.on('mousemove', function(e) {
      setCursorLatLng(e.latlng)
    })

    /* Click → ruler destination */
    map.on('click', function(e) {
      if (e.originalEvent.detail > 1) return
      if (!rulerActiveRef.current) return
      // Skip jika klik berasal dari marker (popup / divIcon)
      const target = e.originalEvent.target
      if (target && target.closest) {
        const inMarker = target.closest('.leaflet-marker-icon')
        if (inMarker) return
      }
      const start = rulerStartRef.current
      if (!start) { rulerActiveRef.current = false; setRulerActive(false); return }

      const Lf2 = GL(); if (!Lf2) return
      const endLL = e.latlng

      /* Marker B */
      Lf2.marker([endLL.lat, endLL.lng], {
        icon: Lf2.divIcon({ className: '', html: measureMarkerHTML('B', '#dc2626'), iconSize: [34,34], iconAnchor: [17,17] }),
        zIndexOffset: 3000,
      }).addTo(rulerGroupRef.current)

      /* Line */
      Lf2.polyline([start.latlng, endLL], {
        color: '#3b82f6', weight: 2.5, dashArray: '8,6', opacity: .8,
      }).addTo(rulerGroupRef.current)

      /* Distance label */
      const dist = start.latlng.distanceTo(endLL)
      const mid = [(start.latlng.lat + endLL.lat) / 2, (start.latlng.lng + endLL.lng) / 2]
      Lf2.tooltip({ permanent: true, direction: 'center', className: 'ruler-distance', offset: [0,0] })
        .setLatLng(mid)
        .setContent(formatDistance(dist))
        .addTo(rulerGroupRef.current)

      /* Remove start marker */
      if (start.marker) rulerGroupRef.current.removeLayer(start.marker)

      /* Reset */
      rulerActiveRef.current = false
      setRulerActive(false)
      rulerStartRef.current = null
    })

    /* ResizeObserver — fix map overlap saat layout berubah (panel toggle, full map) */
    const resizeObs = new ResizeObserver(() => { map.invalidateSize() })
    resizeObs.observe(containerRef.current)

    /* Tile */
    const url = MAP_TILES[modeRef.current] || MAP_TILES.light
    const maxNative = modeRef.current === 'satellite' ? 18 : 19
    tileRef.current = Lf.tileLayer(url, { attribution: '', maxNativeZoom: maxNative, maxZoom: 22 }).addTo(map)

    /* Drone — dibuat reaktif di useEffect([drone]) */

    /* Vessels / AtoN / Station */
    ;(aisTargets || []).forEach(v => {
      try {
        if (!v || !isFinite(v.lat) || !isFinite(v.lon) || (v.lat === 0 && v.lon === 0)) return
        const zOff = v.type === 'SAR Aircraft' ? 1500 : v.type === 'AtoN' ? -500 : 0
        vesselRefs.current[v.mmsi] = Lf.marker([v.lat, v.lon], {
          icon: resolveVesselIcon(Lf, v),
          zIndexOffset: zOff,
        }).addTo(map).bindPopup(resolvePopup(v, tcpConnsRef.current), { maxWidth: 240, autoPan: false })
      } catch(e) {}
    })

    return () => { resizeObs.disconnect(); map.remove(); mapRef.current = null; droneRef.current = null; gpsRef.current = null; vesselRefs.current = {}; iconCacheRef.current = {}; popupCacheRef.current = {}; rulerGroupRef.current = null; rulerStartRef.current = null; rulerActiveRef.current = false; autoRulerRef.current = null; autoRulerDrawnRef.current = false }
  }, [])

  /* Update drone — reactive: create, update, or remove marker */
  useEffect(() => {
    if (!mapRef.current) return
    if (!drone) {
      if (droneRef.current) {
        try { mapRef.current.removeLayer(droneRef.current) } catch(e) {}
        droneRef.current = null
      }
      return
    }
    if (!isFinite(drone.lat) || !isFinite(drone.lon)) return
    const Lf = GL(); if (!Lf) return
    try {
      if (!droneRef.current) {
        droneRef.current = Lf.marker([drone.lat, drone.lon], {
          icon: Lf.divIcon({ className: '', html: droneHTML(drone.callsign, drone.heading), iconSize: [52, 60], iconAnchor: [26, 26], popupAnchor: [0, -30] }),
          zIndexOffset: 2000,
        }).addTo(mapRef.current).bindPopup(dronePopup(drone, tcpConnsRef.current), { maxWidth: 240, autoPan: false })
      } else {
        droneRef.current?.setLatLng([drone.lat, drone.lon])
        droneRef.current?.setPopupContent(dronePopup(drone, tcpConnsRef.current))
      }
    } catch(e) {}
  }, [drone, tcpConns])

  /* Update GPS — reactive: create, update, or remove marker */
  useEffect(() => {
    if (!mapRef.current) return
    if (!gps || !isFinite(gps.lat) || !isFinite(gps.lon)) {
      if (gpsRef.current) {
        try { mapRef.current.removeLayer(gpsRef.current) } catch(e) {}
        gpsRef.current = null
      }
      return
    }
    const Lf = GL(); if (!Lf) return
    try {
      if (!gpsRef.current) {
        gpsRef.current = Lf.marker([gps.lat, gps.lon], {
          icon: Lf.divIcon({ className: '', html: gpsHTML(gps), iconSize: [40, 50], iconAnchor: [20, 25], popupAnchor: [0, -28] }),
          zIndexOffset: 1750,
        }).addTo(mapRef.current).bindPopup(gpsPopup(gps), { maxWidth: 240, autoPan: false })
      } else {
        gpsRef.current?.setLatLng([gps.lat, gps.lon])
        gpsRef.current?.setPopupContent(gpsPopup(gps))
      }
    } catch(e) {}
  }, [gps])

  /* Add / update / remove vessels */
  useEffect(() => {
    if (!mapRef.current) return
    const Lf  = GL(); if (!Lf) return
    const map = mapRef.current
    const currentIds = new Set((aisTargets || []).map(v => v.mmsi))

    // Remove yang sudah hilang
    Object.keys(vesselRefs.current).forEach(mmsi => {
      if (!currentIds.has(mmsi)) {
        try { map.removeLayer(vesselRefs.current[mmsi]) } catch(e) {}
        delete vesselRefs.current[mmsi]
      }
    })

    // Add / update — hanya update jika data benar-benar berubah
    ;(aisTargets || []).forEach(v => {
      if (!v || !isFinite(v.lat) || !isFinite(v.lon)) return
      let marker = vesselRefs.current[v.mmsi]
      const icon = resolveVesselIcon(Lf, v)
      const iconHtml = icon?.options?.html || ''

      if (!marker) {
        const zOff = v.type === 'SAR Aircraft' ? 1500 : v.type === 'AtoN' ? -500 : 0
        marker = Lf.marker([v.lat, v.lon], { icon, zIndexOffset: zOff })
          .addTo(map)
          .bindPopup(resolvePopup(v, tcpConnsRef.current), { maxWidth: 240, autoPan: false })
        vesselRefs.current[v.mmsi] = marker
        iconCacheRef.current[v.mmsi] = iconHtml
      } else {
        try {
          const prev = marker._latlng
          if (prev && (Math.abs(prev.lat - v.lat) > 1e-6 || Math.abs(prev.lng - v.lon) > 1e-6)) {
            marker.setLatLng([v.lat, v.lon])
          }
          if (iconCacheRef.current[v.mmsi] !== iconHtml) {
            marker.setIcon(icon)
            iconCacheRef.current[v.mmsi] = iconHtml
          }
          const newContent = resolvePopup(v, tcpConnsRef.current)
          if (popupCacheRef.current[v.mmsi] !== newContent) {
            marker.setPopupContent(newContent)
            popupCacheRef.current[v.mmsi] = newContent
          }
        } catch(e) {}
      }
    })
  }, [aisTargets, tcpConns])

  /* Auto ruler — PPNS Station ↔ SAR Aircraft */
  useEffect(() => {
    const Lf = GL(); if (!Lf || !mapRef.current) return
    const map = mapRef.current

    // Clean previous auto ruler layers
    if (autoRulerRef.current) {
      try { map.removeLayer(autoRulerRef.current) } catch(e) {}
    }
    if (!autoRuler) { autoRulerRef.current = null; autoRulerDrawnRef.current = false; return }

    const ppns = (aisTargets || []).find(v => v.mmsi === ppnsMmsi && v.type === 'Base Station')
    const sar  = (aisTargets || []).find(v => v.type === 'SAR Aircraft')
    if (!ppns || !sar || !isFinite(ppns.lat) || !isFinite(sar.lat)) {
      autoRulerRef.current = null; autoRulerDrawnRef.current = false; return
    }

    const lg = Lf.layerGroup().addTo(map)
    autoRulerRef.current = lg

    /* Marker A — PPNS */
    Lf.marker([ppns.lat, ppns.lon], {
      icon: Lf.divIcon({ className: '', html: measureMarkerHTML('A', '#16a34a'), iconSize: [34,34], iconAnchor: [17,17] }),
      zIndexOffset: 3000,
    }).addTo(lg).bindTooltip('PPNS Station', { permanent: false, direction: 'top', className: 'auto-ruler-tooltip', offset: [0,-8] })

    /* Marker B — SAR */
    Lf.marker([sar.lat, sar.lon], {
      icon: Lf.divIcon({ className: '', html: measureMarkerHTML('B', '#dc2626'), iconSize: [34,34], iconAnchor: [17,17] }),
      zIndexOffset: 3000,
    }).addTo(lg).bindTooltip(sar.name || 'SAR Aircraft', { permanent: false, direction: 'top', className: 'auto-ruler-tooltip', offset: [0,-8] })

    /* Polyline */
    Lf.polyline([[ppns.lat, ppns.lon], [sar.lat, sar.lon]], {
      color: '#3b82f6', weight: 2.5, dashArray: '8,6', opacity: .8,
    }).addTo(lg)

    /* Distance label */
    const dist = Lf.latLng(ppns.lat, ppns.lon).distanceTo(Lf.latLng(sar.lat, sar.lon))
    const mid = [(ppns.lat + sar.lat) / 2, (ppns.lon + sar.lon) / 2]
    Lf.tooltip({ permanent: true, direction: 'center', className: 'ruler-distance', offset: [0,0] })
      .setLatLng(mid)
      .setContent(formatDistance(dist))
      .addTo(lg)

    autoRulerDrawnRef.current = true
  }, [aisTargets, autoRuler])

  /* Switch tile */
  useEffect(() => {
    modeRef.current = mapMode
    const Lf = GL(); if (!mapRef.current || !Lf) return
    if (tileRef.current) { try { mapRef.current.removeLayer(tileRef.current) } catch(e) {}; tileRef.current = null }
    const maxNative2 = mapMode === 'satellite' ? 18 : 19
    tileRef.current = Lf.tileLayer(MAP_TILES[mapMode] || MAP_TILES.light, { attribution: '', maxNativeZoom: maxNative2, maxZoom: 22 }).addTo(mapRef.current)
  }, [mapMode])

  // Hitung breakdown untuk legend
  const counts = (aisTargets || []).reduce((acc, v) => {
    const t = v.type || 'Unknown'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  return (
      <div style={{ position: 'relative', width: '100%', height: '100%', cursor: rulerActive ? 'crosshair' : undefined }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* HUD — Cursor Position */}
      {cursorLatLng && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 999,
          background: 'rgba(255,255,255,.94)', border: '1px solid rgba(0,0,0,.08)',
          borderRadius: 8, padding: '7px 12px', backdropFilter: 'blur(12px)',
          fontFamily: 'poppins', boxShadow: '0 2px 8px rgba(0,0,0,.1)', pointerEvents: 'none' }}>
          <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '1px', marginBottom: 4, textTransform: 'uppercase' }}>Cursor Position</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[['LAT', Number(cursorLatLng.lat).toFixed(5) + '°'],
              ['LON', Number(cursorLatLng.lng).toFixed(5) + '°']].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 1 }}>{k}</div>
                <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend — sekarang dinamis sesuai tipe yang ada */}
      <div style={{ position: 'absolute', bottom: 10, right: 44, zIndex: 999,
        background: 'rgba(255,255,255,.94)', border: '1px solid rgba(0,0,0,.08)',
        borderRadius: 8, padding: '7px 12px', backdropFilter: 'blur(12px)',
        fontFamily: 'poppins', pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,.1)', fontSize: 9 }}>
        <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '1px', marginBottom: 5, textTransform: 'uppercase' }}>Legend</div>
        {[
          ['#1d4ed8', 'Drone',        !!drone],
          ['#059669', 'GPS Rx',       !!(gps && isFinite(gps.lat))],
          ['#d97706', 'Class B',      counts['Class B'] > 0],
          ['#94a3b8', 'Anchored',     true],
          ['#ea580c', 'SAR',          counts['SAR Aircraft'] > 0],
          ['#0d9488', 'Long Range',   counts['Long Range'] > 0],
          ['#dc2626', 'AtoN',         counts['AtoN'] > 0],
          ['#7c3aed', 'Base Station', counts['Base Station'] > 0],
        ].filter(([, , show]) => show).map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <span style={{ color: '#475569' }}>{l}{counts[l] ? ` (${counts[l]})` : ''}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(0,0,0,.07)', marginTop: 5, paddingTop: 5, fontSize: 8, color: '#94a3b8' }}>
          {(aisTargets || []).length} targets
        </div>
      </div>

      {/* Auto ruler toggle */}
      <div style={{
        position:'absolute', top:12, right:44, zIndex:999,
        display:'flex', flexDirection:'column', gap:4,
      }}>
        <button className={`auto-ruler-btn${autoRuler?' active':''}`} onClick={() => setAutoRuler(v => !v)}
          title="Auto ruler PPNS ↔ SAR">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>
          </svg>
          <span>PPNS ↔ SAR</span>
        </button>
      </div>

      {/* Ruler hint */}
      {rulerActive && (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: 'rgba(255,255,255,.95)', border: '1px solid rgba(0,0,0,.1)', borderRadius: 8, padding: '6px 16px', fontFamily: 'poppins', fontSize: 11, color: '#475569', boxShadow: '0 2px 8px rgba(0,0,0,.1)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          📏 Klik kiri di peta untuk menentukan titik tujuan
        </div>
      )}

      {/* Context menu backdrop */}
      {ctxMenu && (
        <div onClick={() => setCtxMenu(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} />
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div style={{ position: 'absolute', left: ctxMenu.x, top: ctxMenu.y, zIndex: 10000, background: 'rgba(255,255,255,.97)', border: '1px solid rgba(0,0,0,.1)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.15)', backdropFilter: 'blur(12px)', fontFamily: 'poppins', fontSize: 12, overflow: 'hidden', minWidth: 140 }}>
          <div onClick={doRuler}
            style={{ padding: '8px 14px', cursor: 'pointer', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(0,0,0,.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 14 }}>📏</span> Ruler
          </div>
          <div onClick={doClearAll}
            style={{ padding: '8px 14px', cursor: 'pointer', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 14 }}>🗑</span> Clear All
          </div>
        </div>
      )}
    </div>
  )
})

export default MapView
