// Pure SVG icon library — no emoji, no external deps
// All icons use stroke (outline) style, Lucide-style paths

const Ico = ({ path, size=16, color='currentColor', fill='none', sw=1.6, vb='0 0 24 24', style }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink:0, display:'block', ...style }}>
    {[].concat(path).map((d,i) =>
      typeof d==='string' ? <path key={i} d={d}/> : d
    )}
  </svg>
)

export const IcSignal    = p => <Ico {...p} path={['M2 20h.01','M7 20v-4','M12 20v-8','M17 20V8','M22 4v16']}/>
export const IcDrone     = p => <Ico {...p} path={['M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0','M4.5 4.5l3 3','M16.5 4.5l-3 3','M4.5 19.5l3-3','M16.5 19.5l-3-3','M3 3h3v3H3z','M18 3h3v3h-3z','M3 18h3v3H3z','M18 18h3v3h-3z']}/>
export const IcCompass   = p => <Ico {...p} path={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z']}/>
export const IcActivity  = p => <Ico {...p} path="M22 12h-4l-3 9L9 3l-3 9H2"/>
export const IcRadio     = p => <Ico {...p} path={['M4.9 19.1C1 15.2 1 8.8 4.9 4.9','M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5','M10.7 13.3a2 2 0 1 0 2.6 2.6L21 6l-10.3 7.3z']}/>
export const IcSettings  = p => <Ico {...p} path={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']}/>
export const IcLogout    = p => <Ico {...p} path={['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9']}/>
export const IcMap       = p => <Ico {...p} path={['M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z','M9 4v13','M15 7v13']}/>
export const IcChevron   = p => <Ico {...p} path="M9 18l6-6-6-6"/>
export const IcPin       = p => <Ico {...p} path={['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z','M12 10m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0']}/>
export const IcShip      = p => <Ico {...p} path={['M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1','M4 18l-1-5h18l-1 5','M11 13V6H8l4-4 4 4h-3v7','M10 13H7.5a.5.5 0 0 0 0 1H10','M14 13h2.5a.5.5 0 0 1 0 1H14']}/>
export const IcPlane     = p => <Ico {...p} path="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
export const IcHeli      = p => <Ico {...p} path={['M5 12h14','M12 5v14','M8 8l8 8','M16 8l-8 8','M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0']}/>
export const IcAnchor    = p => <Ico {...p} path={['M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M12 8v14','M4.93 11h14.14','M4 18.5A8 8 0 0 0 12 22a8 8 0 0 0 8-3.5']}/>
export const IcBattery   = p => <Ico {...p} path={['M17 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z','M22 11v2']}/>
export const IcSat       = p => <Ico {...p} path={['M13 7L9 3 5 7l4 4','M13 7l4 4-4 4-4-4','M17 7l4 4-10.5 10.5-4-4L17 7z','M2 22l3-3']}/>
export const IcClock     = p => <Ico {...p} path={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M12 6v6l4 2']}/>
export const IcWifi      = p => <Ico {...p} path={['M5 12.55a11 11 0 0 1 14.08 0','M1.42 9a16 16 0 0 1 21.16 0','M8.53 16.11a6 6 0 0 1 6.95 0','M12 20h.01']}/>
export const IcAlert     = p => <Ico {...p} path={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z','M12 9v4','M12 17h.01']}/>
export const IcCheck     = p => <Ico {...p} path="M20 6L9 17l-5-5"/>
export const IcX         = p => <Ico {...p} path={['M18 6L6 18','M6 6l12 12']}/>
export const IcSearch    = p => <Ico {...p} path={['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z','M21 21l-4.35-4.35']}/>
export const IcArrowUp   = p => <Ico {...p} path={['M12 19V5','M5 12l7-7 7 7']}/>
export const IcServer    = p => <Ico {...p} path={['M2 3h20v6H2z','M2 9h20v6H2z','M2 15h20v6H2z','M6 6h.01','M6 12h.01','M6 18h.01']}/>
export const IcGlobe     = p => <Ico {...p} path={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M2 12h20','M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']}/>
export const IcFilter    = p => <Ico {...p} path="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
export const IcRefresh   = p => <Ico {...p} path={['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0 1 14.85-3.36L23 10','M1 14l4.64 4.36A9 9 0 0 0 20.49 15']}/>
export const IcChart     = p => <Ico {...p} path="M22 12h-4l-3 9L9 3l-3 9H2"/>
export const IcWaveform  = p => <Ico {...p} path={['M2 12h3l3-9 3 18 3-6 2 3h6']}/>

// ── Baru: tipe AIS tambahan ──────────────────────────────────────────────────

/** MSG 27 — Long Range / Satellite AIS */
export const IcLongRange = p => <Ico {...p} path={[
  // Badan kapal kecil
  'M12 3l4 7H8l4-7z',
  'M8 10v6a4 4 0 0 0 8 0v-6',
  // Sinyal satelit di kanan atas
  'M18 2l2 2',
  'M16.5 3.5a4 4 0 0 1 4 4',
  'M15 5a6 6 0 0 1 6 6',
]}/>

/** MSG 21 — Aid-to-Navigation (buoy / beacon) */
export const IcAton = p => <Ico {...p} path={[
  // Tiang
  'M12 2v6',
  // Segitiga flag
  'M12 2l4 4-4 2-4-2 4-4z',
  // Badan buoy
  'M8 12a4 4 0 0 0 8 0',
  'M8 12h8',
  'M9 16l-1 4h8l-1-4',
  // Lampu
  'M12 8h.01',
]}/>

/** MSG 4/11 — Base Station */
export const IcBaseStation = p => <Ico {...p} path={[
  // Menara
  'M12 22V12',
  'M9 22h6',
  'M8 15l4-4 4 4',
  // Signal arcs
  'M4.93 8.93a10 10 0 0 1 14.14 0',
  'M7.76 11.76a6 6 0 0 1 8.49 0',
  // Titik puncak
  'M12 6h.01',
]}/>

/** MSG 6/12 — Addressed / Safety message */
export const IcMessage = p => <Ico {...p} path={[
  'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
]}/>

/** MSG 8 generic binary broadcast */
export const IcBinary = p => <Ico {...p} path={[
  'M6 3v18',
  'M18 3v18',
  'M10 7h4',
  'M10 11h4',
  'M10 15h4',
  'M2 7h3',
  'M2 17h3',
  'M19 7h3',
  'M19 17h3',
]}/>

/** MSG 17 — DGNSS */
export const IcDgnss = p => <Ico {...p} path={[
  // Bola bumi
  'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  'M2 12h20',
  // Sinyal koreksi diferensial
  'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10',
  'M17 3.5l2-1.5v4l-2-1',
]}/>

/** MSG 20 — Data Link Management */
export const IcDlm = p => <Ico {...p} path={[
  'M8 6h13',
  'M8 12h13',
  'M8 18h13',
  'M3 6h.01',
  'M3 12h.01',
  'M3 18h.01',
]}/>

/** MSG 22 — Channel Management */
export const IcChannel = p => <Ico {...p} path={[
  // Dua gelombang paralel = dua channel
  'M2 8c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
  'M2 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
]}/>

/** Generic: vessel list item */
export const IcTarget = p => <Ico {...p} path={[
  'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  'M12 2v4',
  'M12 18v4',
  'M2 12h4',
  'M18 12h4',
]}/>

/** Heading / direction arrow */
export const IcHeading = p => <Ico {...p} path={[
  'M12 2v20',
  'M5 9l7-7 7 7',
]}/>

/** Roll / tilt */
export const IcRoll = p => <Ico {...p} path={[
  'M3 12a9 9 0 1 0 18 0',
  'M12 3v9l4-4',
  'M12 12l-4-4',
]}/>

/** Pitch */
export const IcPitch = p => <Ico {...p} path={[
  // Horizon line
  'M2 12h20',
  // Nose vector
  'M12 4v8',
  'M8 8l4-4 4 4',
  // Tail
  'M10 17l2 3 2-3',
]}/>

/** Yaw */
export const IcYaw = p => <Ico {...p} path={[
  // Top-down compass ring
  'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  // Rotating arrow
  'M12 7v5l3 3',
  'M15.5 8.5A5 5 0 0 1 17 12',
]}/>

/** Flight mode indicator */
export const IcFlightMode = p => <Ico {...p} path={[
  // Chip / processor look = autopilot
  'M9 3h6v18H9z',
  'M3 9v6',
  'M21 9v6',
  'M3 10h6',
  'M3 14h6',
  'M15 10h6',
  'M15 14h6',
  'M12 9v6',
]}/>
