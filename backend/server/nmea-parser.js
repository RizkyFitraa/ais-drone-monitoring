'use strict'

// ─── Bit helpers ────────────────────────────────────────────────────────────

const ARMOUR_BITS_LUT = (() => {
  const t = []
  for (let i = 0; i < 120; i++) {
    const c = i - 48
    if (c >= 0 && c <= 39) {
      t[i] = c.toString(2).padStart(6, '0')
    } else if (c >= 48 && c <= 71) {
      t[i] = (c - 8).toString(2).padStart(6, '0')
    } else {
      t[i] = '000000'
    }
  }
  return t
})()

function armourToBits(payload) {
  let bits = ''
  for (let i = 0; i < payload.length; i++) {
    bits += ARMOUR_BITS_LUT[payload.charCodeAt(i)]
  }
  return bits
}

function uint(bits, start, len) {
  return parseInt(bits.slice(start, start + len), 2)
}

function sint(bits, start, len) {
  const raw = parseInt(bits.slice(start, start + len), 2)
  return raw >= (1 << (len - 1)) ? raw - (1 << len) : raw
}

function str(bits, start, len) {
  let s = ''
  for (let i = 0; i < len; i += 6) {
    const c = uint(bits, start + i, 6)
    s += c < 32 ? String.fromCharCode(c + 64) : String.fromCharCode(c)
  }
  return s.replace(/@+$/, '').trim()
}

function checksumOk(sentence) {
  const m = sentence.match(/^!AIVD[MO],(\d+),(\d+),([^,]*),([^,]*),([^,]*),(\d)\*([0-9A-F]{2})$/i)
  if (!m) return false
  const body = sentence.slice(1, sentence.lastIndexOf('*'))
  let cs = 0
  for (let i = 0; i < body.length; i++) cs ^= body.charCodeAt(i)
  return cs === parseInt(m[7], 16)
}

// ─── Lookup tables ───────────────────────────────────────────────────────────

const NAV_STATUS = [
  'Under Way Engine', 'Anchored', 'Not Under Command', 'Restricted Manoeuv.',
  'Constrained Draft', 'Moored', 'Aground', 'Fishing', 'Under Way Sailing',
  'Reserved', 'Reserved', 'Power-driven Towing', 'Power-driven Pushing',
  'Reserved', 'AIS-SART', 'Undefined'
]

const SHIP_TYPE = [
  'Not available', 'Reserved', 'Reserved', 'Reserved', 'Reserved',
  'Reserved', 'Reserved', 'Reserved', 'Reserved', 'Reserved',                       // 0–9
  'Reserved', 'Reserved', 'Reserved', 'Reserved', 'Reserved',
  'Reserved', 'Reserved', 'Reserved', 'Reserved', 'Reserved',                       // 10–19
  'Wing in Ground', 'WIG Hazardous A', 'WIG Hazardous B', 'WIG Hazardous C',
  'WIG Hazardous D', 'WIG Reserved', 'WIG Reserved', 'WIG Reserved',
  'WIG Reserved', 'WIG No info',                                                     // 20–29
  'Fishing', 'Towing', 'Towing Large', 'Dredging', 'Diving',
  'Military', 'Sailing', 'Pleasure Craft', 'Reserved', 'Reserved',                  // 30–39
  'HSC', 'HSC Hazardous A', 'HSC Hazardous B', 'HSC Hazardous C',
  'HSC Hazardous D', 'HSC Reserved', 'HSC Reserved', 'HSC Reserved',
  'HSC Reserved', 'HSC No info',                                                     // 40–49
  'Pilot Vessel', 'SAR Vessel', 'Tug', 'Port Tender', 'Anti-pollution',
  'Law Enforcement', 'Spare Local', 'Spare Local', 'Medical Transport',
  'Non-combatant Ship',                                                              // 50–59
  'Passenger', 'Passenger Hazardous A', 'Passenger Hazardous B',
  'Passenger Hazardous C', 'Passenger Hazardous D', 'Passenger Reserved',
  'Passenger Reserved', 'Passenger Reserved', 'Passenger Reserved',
  'Passenger No info',                                                               // 60–69
  'Cargo', 'Cargo Hazardous A', 'Cargo Hazardous B', 'Cargo Hazardous C',
  'Cargo Hazardous D', 'Cargo Reserved', 'Cargo Reserved', 'Cargo Reserved',
  'Cargo Reserved', 'Cargo No info',                                                 // 70–79
  'Tanker', 'Tanker Hazardous A', 'Tanker Hazardous B', 'Tanker Hazardous C',
  'Tanker Hazardous D', 'Tanker Reserved', 'Tanker Reserved', 'Tanker Reserved',
  'Tanker Reserved', 'Tanker No info',                                               // 80–89
  'Other', 'Other Hazardous A', 'Other Hazardous B', 'Other Hazardous C',
  'Other Hazardous D', 'Other Reserved', 'Other Reserved', 'Other Reserved',
  'Other Reserved', 'Other No info'                                                  // 90–99
]

const EPFD = [
  'Undefined', 'GPS', 'GLONASS', 'GPS+GLONASS', 'Loran-C', 'Chayka',
  'Integrated Nav System', 'Surveyed', 'Galileo'
]

const DRONE_MODES = [
  'DISARM',
  'ARM',
  'ANGLE',
  'HORIZON',
  'BARO',
  'MAG',
  'HEADFREE',
  'HEADADJ',
  'CAMSTAB',
  'PASSTHRU',
  'BEEPER',
  'LEDMAX',
  'LEDLOW',
  'LLIGHTS',
  'CALIB',
  'OSD',
  'TELEMETRY',
  'SERVO1',
  'SERVO2',
  'SERVO3',
  'BLACKBOX',
  'FAILSAFE',
  'AIRMODE',
  '3D',
  'FPVANGLEMIX',
  'BLACKBOXERASE',
  'CAMERA1',
  'CAMERA2',
  'CAMERA3',
  'FLIPOVERAFTERCRASH',
  'PREARM',
  'GPSRESCUE',
  'VTXPITMODE',
  'PARALYZE',
  'USER1',
  'USER2',
  'USER3',
  'USER4'
]

// ─── Message decoders ────────────────────────────────────────────────────────

/**
 * MSG 1, 2, 3 — Position Report Class A
 */
function decodeMsg123(bits, mmsi, msgType) {
  return {
    type: 'classA',
    msgType,
    mmsi,
    status:      NAV_STATUS[uint(bits, 38, 4)] ?? 'Unknown',
    rot:         sint(bits, 42, 8),          // Rate of Turn, deg/min
    sog:         uint(bits, 50, 10) / 10,    // knot
    posAccuracy: uint(bits, 60, 1) === 1,    // true = high (<10 m)
    lon:         sint(bits, 61, 28) / 600000,
    lat:         sint(bits, 89, 27) / 600000,
    cog:         uint(bits, 116, 12) / 10,   // deg
    heading:     uint(bits, 128, 9),         // deg true
    utcSec:      uint(bits, 137, 6),
    maneuver:    uint(bits, 143, 2),         // 0=N/A,1=no,2=yes
    raim:        uint(bits, 148, 1) === 1,
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 4, 11 — Base Station / UTC & Date Response
 */
function decodeMsg4(bits, mmsi) {
  return {
    type:    'baseStation',
    mmsi,
    year:    uint(bits, 38, 14),
    month:   uint(bits, 52, 4),
    day:     uint(bits, 56, 5),
    hour:    uint(bits, 61, 5),
    minute:  uint(bits, 66, 6),
    second:  uint(bits, 72, 6),
    posAccuracy: uint(bits, 78, 1) === 1,
    lon:     sint(bits, 79, 28) / 600000,
    lat:     sint(bits, 107, 27) / 600000,
    epfd:    EPFD[uint(bits, 134, 4)] ?? 'Unknown',
    raim:    uint(bits, 148, 1) === 1,
    ts:      new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 5 — Static and Voyage Related Data (Class A)
 */
function decodeMsg5(bits, mmsi) {
  return {
    type:        'staticA',
    mmsi,
    aisVersion:  uint(bits, 38, 2),
    imo:         uint(bits, 40, 30).toString(),
    callsign:    str(bits, 70, 42),
    name:        str(bits, 112, 120),
    shipType:    SHIP_TYPE[uint(bits, 232, 8)] ?? 'Unknown',
    dimBow:      uint(bits, 240, 9),   // meters
    dimStern:    uint(bits, 249, 9),
    dimPort:     uint(bits, 258, 6),
    dimStbd:     uint(bits, 264, 6),
    epfd:        EPFD[uint(bits, 270, 4)] ?? 'Unknown',
    etaMonth:    uint(bits, 274, 4),
    etaDay:      uint(bits, 278, 5),
    etaHour:     uint(bits, 283, 5),
    etaMinute:   uint(bits, 288, 6),
    draught:     uint(bits, 294, 8) / 10,  // meters
    destination: str(bits, 302, 120),
    dte:         uint(bits, 422, 1),
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 6 — Addressed Binary Message
 */
function decodeMsg6(bits, mmsi) {
  return {
    type:     'addrBinary',
    mmsi,
    seqNo:    uint(bits, 38, 2),
    destMmsi: uint(bits, 40, 30).toString().padStart(9, '0'),
    retransmit: uint(bits, 70, 1) === 1,
    dac:      uint(bits, 72, 10),
    fi:       uint(bits, 82, 6),
    data:     bits.slice(88),
    ts:       new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 7, 13 — Binary / Safety Acknowledge
 */
function decodeMsg7(bits, mmsi) {
  const acks = []
  for (let i = 0; i + 30 <= bits.length - 40; i += 32) {
    acks.push({
      mmsi:  uint(bits, 40 + i, 30).toString().padStart(9, '0'),
      seqNo: uint(bits, 70 + i, 2)
    })
  }
  return { type: 'ack', mmsi, acks, ts: new Date().toLocaleTimeString('id-ID') }
}

/**
 * MSG 8 — Binary Broadcast (termasuk drone UAV DAC=366 FI=56)
 * Sesuai firmware terbaru: total 193 bit (di-pad ke 198 bit / 33 char saat armoring)
 *
 * CATATAN PERBAIKAN: Heading & Yaw sebelumnya 10 bit dengan skala ×10 deg,
 * tapi rentang asli 0–3599 tidak muat di 10 bit (maks 1023) -> data korup
 * di atas 102.3°. Sekarang diturunkan ke resolusi integer derajat (0–359)
 * yang cukup ditampung 9 bit. Field setelah Heading (Battery, Satellites,
 * Mode, Roll, Pitch, Yaw) ikut bergeser 1 bit lebih awal dibanding versi lama.
 *
 *   0–5   Message ID (6)
 *   6–7   Repeat Indicator (2)
 *   8–37  MMSI (30)
 *  38–39  Spare (2)
 *  40–49  DAC (10)
 *  50–55  FI (6)
 *  56–83  Longitude (28) × 1/10000 menit
 *  84–110 Latitude (27) × 1/10000 menit
 * 111–122 Altitude (12) meter
 * 123–132 SOG (10) × 10 knot
 * 133–141 Heading (9) integer deg, 0–359
 * 142–149 Battery (8) → percentage after conversion
 * 150–155 Satellite Count (6)
 * 156–159 Flight Mode (4)
 * 160–171 Roll (12) unsigned offset +1800, × 10 deg
 * 172–183 Pitch (12) unsigned offset +1800, × 10 deg
 * 184–192 Yaw (9) integer deg, 0–359
 */
function decodeMsg8(bits, mmsi) {
  const dac = uint(bits, 40, 10)
  const fi  = uint(bits, 50, 6)

  // Drone UAV: DAC=366, FI=56
  if (dac === 366 && fi === 56) {
    if (bits.length < 193) return { type: 'drone_incomplete', mmsi, dac, fi }

    const lonRaw     = sint(bits, 56, 28)
    const latRaw     = sint(bits, 84, 27)
    const altRaw     = uint(bits, 111, 12)
    const sogRaw     = uint(bits, 123, 10)
    const headingRaw = uint(bits, 133, 9)
    const vbatRaw    = uint(bits, 142, 8)        // 0.1V units (12.6V → 126)
    const battery    = Math.max(0, Math.min(100,
      Math.round((vbatRaw - 99) / (126 - 99) * 100)
    ))                                             // 3S LiPo: 9.9V–12.6V → 0–100%
    const sats       = uint(bits, 150, 6)
    const modeIdx    = uint(bits, 156, 4)
    const rollRaw    = uint(bits, 160, 12)
    const pitchRaw   = uint(bits, 172, 12)
    const yawRaw      = uint(bits, 184, 9)

    return {
      type:       'drone',
      mmsi,
      dac,
      fi,
      lon:        lonRaw / 600000,          // decimal degree
      lat:        latRaw / 600000,          // decimal degree
      alt:        altRaw,                   // meter (0–4094)
      sog:        sogRaw / 10,              // knot
      heading:    headingRaw,               // deg, integer 0-359
      cog:        headingRaw,               // alias
      battery,                             // percentage 0-100
      satellites: sats,
      mode:       DRONE_MODES[modeIdx] ?? 'UNKNOWN',
      roll:       (rollRaw  - 1800) / 10,  // deg ±180°
      pitch:      (pitchRaw - 1800) / 10,  // deg ±180°
      yaw:        yawRaw,                  // deg, integer 0-359
      ts:         new Date().toLocaleTimeString('id-ID')
    }
  }

  // Generic MSG 8
  return {
    type: 'binaryBroadcast',
    mmsi,
    dac,
    fi,
    data: bits.slice(56),
    ts:   new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 9 — Standard SAR Aircraft Position Report
 */
function decodeMsg9(bits, mmsi) {
  const altRaw = uint(bits, 38, 12)
  return {
    type:        'sar',
    mmsi,
    alt:         altRaw === 4095 ? null : altRaw,   // meter, null = not available
    sog:         uint(bits, 50, 10),                 // knot
    posAccuracy: uint(bits, 60, 1) === 1,
    lon:         sint(bits, 61, 28) / 600000,
    lat:         sint(bits, 89, 27) / 600000,
    cog:         uint(bits, 116, 12) / 10,
    utcSec:      uint(bits, 128, 6),
    raim:        uint(bits, 147, 1) === 1,
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 10 — UTC / Date Inquiry
 */
function decodeMsg10(bits, mmsi) {
  return {
    type:     'utcInquiry',
    mmsi,
    destMmsi: uint(bits, 40, 30).toString().padStart(9, '0'),
    ts:       new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 12 — Addressed Safety Related Message
 */
function decodeMsg12(bits, mmsi) {
  return {
    type:       'safetyAddr',
    mmsi,
    seqNo:      uint(bits, 38, 2),
    destMmsi:   uint(bits, 40, 30).toString().padStart(9, '0'),
    retransmit: uint(bits, 70, 1) === 1,
    text:       str(bits, 72, Math.min(936, bits.length - 72)),
    ts:         new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 14 — Safety Related Broadcast
 */
function decodeMsg14(bits, mmsi) {
  return {
    type: 'safetyBcast',
    mmsi,
    text: str(bits, 40, Math.min(968, bits.length - 40)),
    ts:   new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 15 — Interrogation
 */
function decodeMsg15(bits, mmsi) {
  return {
    type:     'interrogation',
    mmsi,
    dest1:    uint(bits, 40, 30).toString().padStart(9, '0'),
    msg1_1:   uint(bits, 70, 6),
    slotOff1: uint(bits, 76, 12),
    ts:       new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 16 — Assignment Mode Command
 */
function decodeMsg16(bits, mmsi) {
  return {
    type:     'assignMode',
    mmsi,
    dest1:    uint(bits, 40, 30).toString().padStart(9, '0'),
    offset1:  uint(bits, 70, 12),
    incr1:    uint(bits, 82, 10),
    ts:       new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 17 — DGNSS Broadcast Binary Message
 */
function decodeMsg17(bits, mmsi) {
  return {
    type: 'dgnss',
    mmsi,
    lon:  sint(bits, 40, 18) / 600,
    lat:  sint(bits, 58, 17) / 600,
    data: bits.slice(80),
    ts:   new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 18 — Standard Class B CS Position Report
 */
function decodeMsg18(bits, mmsi) {
  const sog = uint(bits, 46, 10) / 10
  return {
    type:        'classB',
    mmsi,
    sog,
    posAccuracy: uint(bits, 56, 1) === 1,
    lon:         sint(bits, 57, 28) / 600000,
    lat:         sint(bits, 85, 27) / 600000,
    cog:         uint(bits, 112, 12) / 10,
    heading:     uint(bits, 124, 9),
    utcSec:      uint(bits, 133, 6),
    status:      sog > 0.5 ? 'Under Way' : 'At Anchor',
    cs:          uint(bits, 141, 1) === 1,   // Carrier Sense unit
    display:     uint(bits, 142, 1) === 1,
    dsc:         uint(bits, 143, 1) === 1,
    band:        uint(bits, 144, 1) === 1,
    msg22:       uint(bits, 145, 1) === 1,
    assigned:    uint(bits, 146, 1) === 1,
    raim:        uint(bits, 147, 1) === 1,
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 19 — Extended Class B CS Position Report
 */
function decodeMsg19(bits, mmsi) {
  return {
    type:        'classBext',
    mmsi,
    sog:         uint(bits, 46, 10) / 10,
    posAccuracy: uint(bits, 56, 1) === 1,
    lon:         sint(bits, 57, 28) / 600000,
    lat:         sint(bits, 85, 27) / 600000,
    cog:         uint(bits, 112, 12) / 10,
    heading:     uint(bits, 124, 9),
    utcSec:      uint(bits, 133, 6),
    name:        str(bits, 143, 120),
    shipType:    SHIP_TYPE[uint(bits, 263, 8)] ?? 'Unknown',
    dimBow:      uint(bits, 271, 9),
    dimStern:    uint(bits, 280, 9),
    dimPort:     uint(bits, 289, 6),
    dimStbd:     uint(bits, 295, 6),
    epfd:        EPFD[uint(bits, 301, 4)] ?? 'Unknown',
    raim:        uint(bits, 305, 1) === 1,
    assigned:    uint(bits, 306, 1) === 1,
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 20 — Data Link Management
 */
function decodeMsg20(bits, mmsi) {
  const reservations = []
  for (let i = 0; i < 4 && 40 + i * 30 + 30 <= bits.length; i++) {
    const base = 40 + i * 30
    reservations.push({
      offset:   uint(bits, base, 12),
      number:   uint(bits, base + 12, 4),
      timeout:  uint(bits, base + 16, 3),
      incr:     uint(bits, base + 19, 11)
    })
  }
  return { type: 'dlm', mmsi, reservations, ts: new Date().toLocaleTimeString('id-ID') }
}

/**
 * MSG 21 — Aid-to-Navigation Report
 */
function decodeMsg21(bits, mmsi) {
  return {
    type:        'aton',
    mmsi,
    atonType:    uint(bits, 38, 5),
    name:        str(bits, 43, 120),
    posAccuracy: uint(bits, 163, 1) === 1,
    lon:         sint(bits, 164, 28) / 600000,
    lat:         sint(bits, 192, 27) / 600000,
    dimBow:      uint(bits, 219, 9),
    dimStern:    uint(bits, 228, 9),
    dimPort:     uint(bits, 237, 6),
    dimStbd:     uint(bits, 243, 6),
    epfd:        EPFD[uint(bits, 249, 4)] ?? 'Unknown',
    utcSec:      uint(bits, 253, 6),
    offPos:      uint(bits, 259, 1) === 1,   // off position indicator
    raim:        uint(bits, 268, 1) === 1,
    virtual:     uint(bits, 269, 1) === 1,   // virtual AtoN
    assigned:    uint(bits, 270, 1) === 1,
    nameExt:     bits.length > 272 ? str(bits, 272, Math.min(bits.length - 272, 84)) : '',
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 22 — Channel Management
 */
function decodeMsg22(bits, mmsi) {
  return {
    type:      'channelMgmt',
    mmsi,
    channel_a: uint(bits, 40, 12),
    channel_b: uint(bits, 52, 12),
    txrx:      uint(bits, 64, 4),
    power:     uint(bits, 68, 1) === 1,    // true = high
    addressed: uint(bits, 139, 1) === 1,
    band_a:    uint(bits, 140, 1) === 1,
    band_b:    uint(bits, 141, 1) === 1,
    ts:        new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 23 — Group Assignment Command
 */
function decodeMsg23(bits, mmsi) {
  return {
    type:      'groupAssign',
    mmsi,
    ne_lon:    sint(bits, 40, 18) / 600,
    ne_lat:    sint(bits, 58, 17) / 600,
    sw_lon:    sint(bits, 75, 18) / 600,
    sw_lat:    sint(bits, 93, 17) / 600,
    stationType: uint(bits, 110, 4),
    shipType:  uint(bits, 114, 8),
    txrx:      uint(bits, 144, 4),
    interval:  uint(bits, 148, 4),
    quiet:     uint(bits, 152, 4),
    ts:        new Date().toLocaleTimeString('id-ID')
  }
}

/**
 * MSG 24 — Static Data Report Class B
 * Part A (part=0): name
 * Part B (part=1): callsign, ship type, dimensions, MMSI of mother ship
 */
function decodeMsg24(bits, mmsi) {
  const part = uint(bits, 38, 2)
  if (part === 0) {
    return {
      type: 'staticB0',
      mmsi,
      name: str(bits, 40, 120),
      ts:   new Date().toLocaleTimeString('id-ID')
    }
  }
  if (part === 1) {
    return {
      type:        'staticB1',
      mmsi,
      callsign:    str(bits, 90, 42),
      shipType:    SHIP_TYPE[uint(bits, 40, 8)] ?? 'Unknown',
      vendorId:    str(bits, 48, 18),
      model:       uint(bits, 66, 4),
      serial:      uint(bits, 70, 20),
      dimBow:      uint(bits, 132, 9),
      dimStern:    uint(bits, 141, 9),
      dimPort:     uint(bits, 150, 6),
      dimStbd:     uint(bits, 156, 6),
      motherMmsi:  uint(bits, 162, 30).toString().padStart(9, '0'),
      ts:          new Date().toLocaleTimeString('id-ID')
    }
  }
  return { type: 'staticB_unknown', mmsi, part }
}

/**
 * MSG 25 — Single Slot Binary Message
 */
function decodeMsg25(bits, mmsi) {
  const addressed  = uint(bits, 38, 1) === 1
  const structured = uint(bits, 39, 1) === 1
  let offset = 40
  const result = { type: 'singleSlotBin', mmsi, addressed, structured }
  if (addressed) {
    result.destMmsi = uint(bits, offset, 30).toString().padStart(9, '0')
    offset += 30
  }
  if (structured) {
    result.appId = uint(bits, offset, 16)
    offset += 16
  }
  result.data = bits.slice(offset)
  result.ts   = new Date().toLocaleTimeString('id-ID')
  return result
}

/**
 * MSG 26 — Multiple Slot Binary Message with Comm State
 */
function decodeMsg26(bits, mmsi) {
  const addressed  = uint(bits, 38, 1) === 1
  const structured = uint(bits, 39, 1) === 1
  let offset = 40
  const result = { type: 'multiSlotBin', mmsi, addressed, structured }
  if (addressed) {
    result.destMmsi = uint(bits, offset, 30).toString().padStart(9, '0')
    offset += 30
  }
  if (structured) {
    result.appId = uint(bits, offset, 16)
    offset += 16
  }
  // last 20 bits = comm state
  const dataEnd = bits.length - 20
  result.data      = bits.slice(offset, dataEnd)
  result.commState = bits.slice(dataEnd)
  result.ts        = new Date().toLocaleTimeString('id-ID')
  return result
}

/**
 * MSG 27 — Long Range AIS Broadcast Message (e.g. from satellite)
 * Bit layout (96 bit total):
 *  0–5   Message ID (6)
 *  6–7   Repeat Indicator (2)
 *  8–37  MMSI (30)
 * 38     Position Accuracy (1)
 * 39     RAIM (1)
 * 40–43  Navigation Status (4)
 * 44–61  Longitude (18) × 1/10 menit
 * 62–78  Latitude (17) × 1/10 menit
 * 79–84  SOG (6) knot
 * 85–91  COG (9) deg
 * 92     GNSS Position Status (1)
 * 93–95  Spare (3)
 */
function decodeMsg27(bits, mmsi) {
  if (bits.length < 95) return { type: 'longRange_incomplete', mmsi }
  return {
    type:        'longRange',
    mmsi,
    posAccuracy: uint(bits, 38, 1) === 1,
    raim:        uint(bits, 39, 1) === 1,
    status:      NAV_STATUS[uint(bits, 40, 4)] ?? 'Unknown',
    lon:         sint(bits, 44, 18) / 600,  // 1/10 menit → deg
    lat:         sint(bits, 62, 17) / 600,
    sog:         uint(bits, 79, 6),          // knot, integer
    cog:         uint(bits, 85, 9),          // deg, integer
    gnssPos:     uint(bits, 94, 1) === 0,    // 0 = current GNSS
    ts:          new Date().toLocaleTimeString('id-ID')
  }
}

// ─── Master decoder ──────────────────────────────────────────────────────────

function decodeAIS(bits, msgType, mmsi) {
  switch (msgType) {
    case 1: case 2: case 3: return decodeMsg123(bits, mmsi, msgType)
    case 4: case 11:        return decodeMsg4(bits, mmsi)
    case 5:                 return decodeMsg5(bits, mmsi)
    case 6:                 return decodeMsg6(bits, mmsi)
    case 7: case 13:        return decodeMsg7(bits, mmsi)
    case 8:                 return decodeMsg8(bits, mmsi)
    case 9:                 return decodeMsg9(bits, mmsi)
    case 10:                return decodeMsg10(bits, mmsi)
    case 12:                return decodeMsg12(bits, mmsi)
    case 14:                return decodeMsg14(bits, mmsi)
    case 15:                return decodeMsg15(bits, mmsi)
    case 16:                return decodeMsg16(bits, mmsi)
    case 17:                return decodeMsg17(bits, mmsi)
    case 18:                return decodeMsg18(bits, mmsi)
    case 19:                return decodeMsg19(bits, mmsi)
    case 20:                return decodeMsg20(bits, mmsi)
    case 21:                return decodeMsg21(bits, mmsi)
    case 22:                return decodeMsg22(bits, mmsi)
    case 23:                return decodeMsg23(bits, mmsi)
    case 24:                return decodeMsg24(bits, mmsi)
    case 25:                return decodeMsg25(bits, mmsi)
    case 26:                return decodeMsg26(bits, mmsi)
    case 27:                return decodeMsg27(bits, mmsi)
    default:
      return { type: 'unknown', msgType, mmsi }
  }
}

// ─── Sentence parser ─────────────────────────────────────────────────────────

const _buf = {}
const _bufTs = {}
const BUF_TTL = 30000  // 30 detik
setInterval(() => {
  const now = Date.now()
  for (const k of Object.keys(_bufTs)) {
    if (now - _bufTs[k] > BUF_TTL) { delete _buf[k]; delete _bufTs[k] }
  }
}, 10000)

function parseSentence(line) {
  line = line.trim()
  if (!line.startsWith('!AIVDM') && !line.startsWith('!AIVDO')) return null
  if (!checksumOk(line)) return null
  const parts = line.slice(1).split(',')
  if (parts.length < 6) return null

  const count  = parseInt(parts[1])
  const partno = parseInt(parts[2])
  const seqid  = parts[3]
  const payload = parts[5]

  if (count === 1) {
    const bits = armourToBits(payload)
    return decodeAIS(bits, uint(bits, 0, 6), uint(bits, 8, 30).toString().padStart(9, '0'))
  }

  // Multi-sentence reassembly
  const key = `${count}-${seqid}`
  if (!_buf[key]) { _buf[key] = new Array(count); _bufTs[key] = Date.now() }
  _buf[key][partno - 1] = payload
  _bufTs[key] = Date.now()

  if (_buf[key].filter(Boolean).length === count) {
    const bits = armourToBits(_buf[key].join(''))
    delete _buf[key]
    return decodeAIS(bits, uint(bits, 0, 6), uint(bits, 8, 30).toString().padStart(9, '0'))
  }

  return null
}

module.exports = { parseSentence }