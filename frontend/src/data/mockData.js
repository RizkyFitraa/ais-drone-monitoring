// ─── REFERENSI GEOGRAFIS ───────────────────────────────────────────────────────
// Area: Pesisir Pantai Utara Surabaya — Selat Madura Barat
//
//  Pelabuhan Tanjung Perak  : -7.1894, 112.7308
//  Terminal Teluk Lamong    : -7.1930, 112.6580
//  Selat Madura barat       : -7.17 ~ -7.25, 112.65 ~ 112.85
//  Ujung Pangkah (timur)    : -7.10, 112.88
//
// Drone ditempatkan di atas perairan pesisir utara Surabaya,
// terbang untuk monitoring kapal di sekitar Tanjung Perak.

// ─── DRONE ────────────────────────────────────────────────────────────────────
export const INITIAL_DRONE = {
  mmsi:        '999000001',
  callsign:    'DRONE-AIS',
  lat:         -7.1870,
  lon:         112.7450,
  alt:         92.0,
  sog:         5.4,
  cog:         270,
  battery:     82,
  rssi:        -58,
  satellites:  16,
  mode:        'LOITER',
  roll:        0.8,
  pitch:       -0.4,
  yaw:         270.0,
  heading:     270,
  groundspeed: 5.2,
  airspeed:    5.5,
  vertspeed:   0.0,
  throttle:    38,
  flighttime:  '00:09:14',
  distance:    870,
  ts:          '08:12:44',
}

// ─── 30 VESSEL DUMMY — Pantai Utara Surabaya / Tanjung Perak / Selat Madura ──
export const INITIAL_AIS_TARGETS = [

  // ── Kapal besar — transit Selat Madura arah timur-barat ──────────────────
  {
    mmsi: '525101001', name: 'MV MERATUS SURABAYA', type: 'Class A',
    lat: -7.1650, lon: 112.7800, sog: 9.4, cog: 278, status: 'Under Way', ts: '08:10:02',
  },
  {
    mmsi: '525101002', name: 'KM TANTO HARI',       type: 'Class A',
    lat: -7.1580, lon: 112.6900, sog: 7.8, cog: 92,  status: 'Under Way', ts: '08:10:08',
  },
  {
    mmsi: '525101003', name: 'MV SINAR KAPUAS',     type: 'Class A',
    lat: -7.1720, lon: 112.8100, sog: 11.2, cog: 265, status: 'Under Way', ts: '08:10:14',
  },
  {
    mmsi: '525101004', name: 'MT PERTAMINA PRIME',  type: 'Class A',
    lat: -7.1480, lon: 112.7600, sog: 8.6,  cog: 85,  status: 'Under Way', ts: '08:10:20',
  },
  {
    mmsi: '525101005', name: 'KM DHARMA KENCANA IX',type: 'Class A',
    lat: -7.1550, lon: 112.8400, sog: 10.1, cog: 270, status: 'Under Way', ts: '08:10:26',
  },

  // ── Kapal besar — sandar / anchor di Tanjung Perak ───────────────────────
  {
    mmsi: '525102001', name: 'KM PELNI KELIMUTU',   type: 'Class A',
    lat: -7.1900, lon: 112.7290, sog: 0.0,  cog: 180, status: 'Moored',    ts: '08:10:32',
  },
  {
    mmsi: '525102002', name: 'MV ORIENTAL RUBY',    type: 'Class A',
    lat: -7.1950, lon: 112.7350, sog: 0.0,  cog: 210, status: 'At Anchor', ts: '08:10:38',
  },
  {
    mmsi: '525102003', name: 'KM GUNUNG DEMPO',     type: 'Class A',
    lat: -7.1920, lon: 112.7180, sog: 0.2,  cog: 190, status: 'Moored',    ts: '08:10:44',
  },

  // ── Terminal Teluk Lamong — container & ro-ro ─────────────────────────────
  {
    mmsi: '525103001', name: 'MV APL CILEGON',      type: 'Class A',
    lat: -7.1960, lon: 112.6600, sog: 0.0,  cog: 270, status: 'Moored',    ts: '08:11:00',
  },
  {
    mmsi: '525103002', name: 'KM MARINA MAS',       type: 'Class A',
    lat: -7.1980, lon: 112.6650, sog: 0.1,  cog: 90,  status: 'Moored',    ts: '08:11:06',
  },
  {
    mmsi: '525103003', name: 'MV TANTO MULYA',      type: 'Class A',
    lat: -7.1890, lon: 112.6550, sog: 3.2,  cog: 155, status: 'Under Way', ts: '08:11:12',
  },

  // ── Kapal ferry / penyeberangan ke Madura ────────────────────────────────
  {
    mmsi: '525104001', name: 'KMP TANJUNG PERAK I', type: 'Class A',
    lat: -7.1760, lon: 112.7400, sog: 8.5,  cog: 55,  status: 'Under Way', ts: '08:11:18',
  },
  {
    mmsi: '525104002', name: 'KMP GAJAH MADA',      type: 'Class A',
    lat: -7.1620, lon: 112.7620, sog: 9.1,  cog: 240, status: 'Under Way', ts: '08:11:24',
  },
  {
    mmsi: '525104003', name: 'KMP PARAMESTI',       type: 'Class A',
    lat: -7.2010, lon: 112.7500, sog: 0.0,  cog: 110, status: 'At Anchor', ts: '08:11:30',
  },

  // ── Kapal patroli / KPLP / Syahbandar ────────────────────────────────────
  {
    mmsi: '525105001', name: 'KN TRISULA 302',      type: 'Class B',
    lat: -7.1800, lon: 112.7600, sog: 12.4, cog: 95,  status: 'Under Way', ts: '08:11:36',
  },
  {
    mmsi: '525105002', name: 'KP BINTANG LAUT 04',  type: 'Class B',
    lat: -7.1680, lon: 112.7100, sog: 14.8, cog: 310, status: 'Under Way', ts: '08:11:42',
  },
  {
    mmsi: '525105003', name: 'RB BASARNAS SBY',     type: 'Class B',
    lat: -7.1750, lon: 112.7800, sog: 18.5, cog: 180, status: 'Under Way', ts: '08:11:48',
  },

  // ── Kapal tunda (tugboat) ─────────────────────────────────────────────────
  {
    mmsi: '525106001', name: 'TB KUDA LAUT 01',     type: 'Class B',
    lat: -7.1910, lon: 112.7310, sog: 3.8,  cog: 45,  status: 'Under Way', ts: '08:11:54',
  },
  {
    mmsi: '525106002', name: 'TB SAMUDERA JAYA',    type: 'Class B',
    lat: -7.1930, lon: 112.7260, sog: 2.4,  cog: 220, status: 'Under Way', ts: '08:12:00',
  },
  {
    mmsi: '525106003', name: 'TB MITRA BAHARI',     type: 'Class B',
    lat: -7.1870, lon: 112.6640, sog: 4.1,  cog: 135, status: 'Under Way', ts: '08:12:06',
  },

  // ── Nelayan / kapal kecil pesisir ─────────────────────────────────────────
  {
    mmsi: '525107001', name: 'KMN BERKAH ILAHI',    type: 'Class B',
    lat: -7.1820, lon: 112.7550, sog: 3.1,  cog: 350, status: 'Under Way', ts: '08:12:12',
  },
  {
    mmsi: '525107002', name: 'KMN REZEKI BAHARI',   type: 'Class B',
    lat: -7.2050, lon: 112.7400, sog: 0.0,  cog: 90,  status: 'At Anchor', ts: '08:12:16',
  },
  {
    mmsi: '525107003', name: 'KMN CAHAYA NELAYAN',  type: 'Class B',
    lat: -7.1740, lon: 112.7020, sog: 4.6,  cog: 200, status: 'Under Way', ts: '08:12:20',
  },
  {
    mmsi: '525107004', name: 'KMN USAHA BERSAMA',   type: 'Class B',
    lat: -7.2100, lon: 112.7650, sog: 2.8,  cog: 75,  status: 'Under Way', ts: '08:12:24',
  },
  {
    mmsi: '525107005', name: 'KMN PUTRA MANDIRI',   type: 'Class B',
    lat: -7.1660, lon: 112.7340, sog: 0.0,  cog: 135, status: 'At Anchor', ts: '08:12:28',
  },

  // ── Kapal asing transit ───────────────────────────────────────────────────
  {
    mmsi: '477301001', name: 'EVER LOYAL',           type: 'Class A',
    lat: -7.1420, lon: 112.8200, sog: 12.8, cog: 275, status: 'Under Way', ts: '08:12:34',
  },
  {
    mmsi: '636019002', name: 'MV OCEAN PIONEER',    type: 'Class A',
    lat: -7.1380, lon: 112.6800, sog: 10.5, cog: 88,  status: 'Under Way', ts: '08:12:38',
  },
  {
    mmsi: '218200003', name: 'STELLAR WIND',        type: 'Class A',
    lat: -7.1500, lon: 112.8500, sog: 9.2,  cog: 262, status: 'Under Way', ts: '08:12:42',
  },

  // ── Kapal survei / riset ──────────────────────────────────────────────────
  {
    mmsi: '525108001', name: 'KR BARUNA JAYA IV',   type: 'Class A',
    lat: -7.1780, lon: 112.8050, sog: 2.5,  cog: 180, status: 'Under Way', ts: '08:12:48',
  },

  // ── Ponton / tongkang di perairan ─────────────────────────────────────────
  {
    mmsi: '525109001', name: 'BG SUMBER MAS 07',    type: 'Class B',
    lat: -7.2080, lon: 112.6900, sog: 0.0,  cog: 270, status: 'At Anchor', ts: '08:12:52',
  },
  {
    mmsi: '525109002', name: 'TB MAKMUR SENTOSA',   type: 'Class B',
    lat: -7.2020, lon: 112.7100, sog: 1.8,  cog: 315, status: 'Under Way', ts: '08:12:56',
  },
  // ── SAR Aircraft — AIS Message Type 9 ───────────────────────────────────────
  // Helikopter dan pesawat SAR beroperasi di atas perairan Surabaya utara
  {
    mmsi: '525200001', name: 'HELI BASARNAS BO-105',  type: 'SAR Aircraft',
    lat: -7.1550, lon: 112.7300, alt: 320,  sog: 82,  cog: 185, status: 'Airborne', ts: '08:12:01',
    rawNMEA: '!AIVDM,1,1,,B,85P6l0P4T1h00000KH08Hq@0000,0*1C',
  },
  {
    mmsi: '525200002', name: 'CN-235 SAR TNI-AU',     type: 'SAR Aircraft',
    lat: -7.1200, lon: 112.8000, alt: 1500, sog: 155, cog: 270, status: 'Airborne', ts: '08:12:05',
    rawNMEA: '!AIVDM,1,1,,B,85P6l0P4T1h00000KH08Hq@0001,0*1D',
  },
  {
    mmsi: '525200003', name: 'HELI NBO-105 BASARNAS', type: 'SAR Aircraft',
    lat: -7.1700, lon: 112.6700, alt: 250,  sog: 65,  cog: 90,  status: 'Airborne', ts: '08:12:09',
    rawNMEA: '!AIVDM,1,1,,B,85P6l0P4T1h00000KH08Hq@0002,0*1E',
  },
  {
    mmsi: '525200004', name: 'EC-725 CARACAL TNI-AD', type: 'SAR Aircraft',
    lat: -7.1400, lon: 112.7600, alt: 450,  sog: 110, cog: 220, status: 'Airborne', ts: '08:12:13',
    rawNMEA: '!AIVDM,1,1,,B,85P6l0P4T1h00000KH08Hq@0003,0*1F',
  },
  {
    mmsi: '525200005', name: 'PATMAR CASA-212',        type: 'SAR Aircraft',
    lat: -7.1100, lon: 112.7100, alt: 900,  sog: 130, cog: 95,  status: 'Airborne', ts: '08:12:17',
    rawNMEA: '!AIVDM,1,1,,B,85P6l0P4T1h00000KH08Hq@0004,0*1A',
  },
  {
    mmsi: '970123456', name: 'AIRCRAFT PROTOTIPE',      type: 'SAR Aircraft',
    lat: -7.1800, lon: 112.7500, alt: 200,  sog: 70,  cog: 150, status: 'Airborne', ts: '08:12:21',
    rawNMEA: '!AIVDM,1,1,,B,85P6l0P4T1h00000KH08Hq@0005,0*1B',
  },
]

// ─── MAP TILES ────────────────────────────────────────────────────────────────
export const MAP_TILES = {
  light: {
    url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom:     19,
  },
  satellite: {
    url:         'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom:     19,
  },
}

// ─── DUMMY NMEA ───────────────────────────────────────────────────────────────
export const DUMMY_NMEA = {
  drone:    '!AIVDM,1,1,,B,85MF`0P4T1h00000KH08Hq@0000,0*1C',
  vessel_0: '!AIVDM,1,1,,A,15M67N0P01G?Uf6E`FepT?vN0<0f,0*73',
  vessel_1: '!AIVDM,1,1,,B,35MsUV0Oh;G?nFVE`Q6PP?w220S2,0*11',
}
