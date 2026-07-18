'use strict'
const http  = require('http')
const net   = require('net')
const dgram = require('dgram')
const crypto = require('crypto')
const { WebSocketServer } = require('ws')
const { parseSentence }   = require('./nmea-parser')
const { parseGPS }        = require('./gps-parser')
const { createPool, initSchema, query, getPool, verifyPassword, findUserByUsername, findUserById, getAllUsers, createUser, updateUser, deleteUser } = require('./db')
const { AISRecorder }     = require('./recorder')

let config = {
  serial: { enabled:false, port:'COM3', baudRate:38400 },
  tcp: [
    { id:'tcp0', enabled:false, label:'Connection 1', host:'vps2.osi.my.id', port:2026, reconnectMs:5000, timeoutMs:15000 }
  ],
  udp:    { enabled:false, listenPort:10110 },
  db: {
    enabled: true,
    recording: true,
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'ais_drone_monitor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    retentionDays: 30
  },
}

let recorder = null

function normalizeConfig(cfg) {
  if (!Array.isArray(cfg.tcp)) {
    const old = cfg.tcp || {}
    cfg.tcp = [{ id:'tcp0', label:'Connection 1', ...old }]
  }
  return cfg
}
normalizeConfig(config)

const state = {
  serial: { connected:false, rx:0, rxVessels:0 },
  tcp:    {},   // keyed by tcp id: { connected:false, rx:0, socket:null, reconnectTimer:null, activityTimer:null, rxVessels:0 }
  udp:    { listening:false, rx:0, socket:null, rxVessels:0 },
}

const vessels  = {}   // mmsi → vessel object
const atons    = {}   // mmsi → Aid-to-Navigation
const stations = {}   // mmsi → base station
let   drone    = null
let   gpsFix   = { lat:null, lon:null, altitude:null, sog:null, cog:null, satCount:null, hdop:null, fixQuality:null }

const serialPortRef = { port: null }

// ─── HTTP + WebSocket ────────────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(data))
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const sessions = new Map() // token → { userId, username, role }
const TOKEN_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')

function generateToken(user) {
  const raw = `${user.id}:${user.role}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`
  const token = raw + ':' + crypto.createHmac('sha256', TOKEN_SECRET).update(raw).digest('hex').slice(0, 12)
  sessions.set(token, { userId: user.id, username: user.username, role: user.role })
  return token
}

function verifyToken(token) {
  return sessions.get(token) || null
}

function getBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { resolve(null) }
    })
  })
}

function requireAuth(req, res) {
  const auth = req.headers['authorization']
  if (!auth || !auth.startsWith('Bearer ')) {
    json(res, { error: 'Unauthorized' }, 401)
    return null
  }
  const session = verifyToken(auth.slice(7))
  if (!session) {
    json(res, { error: 'Invalid token' }, 401)
    return null
  }
  return session
}

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  const params = Object.fromEntries(url.searchParams)

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': '*' })
    return res.end()
  }

  // ─── Auth routes (no DB required) ───────────────────────────────────────
  if (path === '/api/auth/login' && req.method === 'POST') {
    const body = await getBody(req)
    if (!body || !body.username || !body.password) {
      json(res, { error: 'Username dan password diperlukan' }, 400)
      return
    }
    try {
      const user = await findUserByUsername(body.username)
      if (!user || !verifyPassword(body.password, user.password)) {
        json(res, { error: 'Kredensial salah' }, 401)
        return
      }
      const token = generateToken(user)
      json(res, { token, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } })
    } catch (err) {
      json(res, { error: 'Database error' }, 500)
    }
    return
  }

  // Protected routes — require token
  const userMatch = path.match(/^\/api\/users(?:\/(\d+))?$/)
  if (userMatch) {
    const session = requireAuth(req, res)
    if (!session) return
    if (session.role !== 'admin') {
      json(res, { error: 'Forbidden — admin only' }, 403)
      return
    }

    try {
      // GET /api/users
      if (req.method === 'GET' && !userMatch[1]) {
        const users = await getAllUsers()
        json(res, users)
        return
      }

      // POST /api/users
      if (req.method === 'POST' && !userMatch[1]) {
        const body = await getBody(req)
        if (!body || !body.username || !body.password) {
          json(res, { error: 'Username dan password diperlukan' }, 400)
          return
        }
        const existing = await findUserByUsername(body.username)
        if (existing) {
          json(res, { error: 'Username sudah digunakan' }, 409)
          return
        }
        const user = await createUser(body.username, body.password, body.display_name || '', body.role || 'operator')
        json(res, user, 201)
        return
      }

      const userId = parseInt(userMatch[1])
      if (!userId) { json(res, { error: 'Invalid user ID' }, 400); return }

      // GET /api/users/:id
      if (req.method === 'GET') {
        const user = await findUserById(userId)
        if (!user) { json(res, { error: 'User not found' }, 404); return }
        json(res, user)
        return
      }

      // PUT /api/users/:id
      if (req.method === 'PUT') {
        const body = await getBody(req)
        if (!body || Object.keys(body).length === 0) {
          json(res, { error: 'No fields to update' }, 400)
          return
        }
        const user = await updateUser(userId, body)
        if (!user) { json(res, { error: 'User not found' }, 404); return }
        json(res, user)
        return
      }

      // DELETE /api/users/:id
      if (req.method === 'DELETE') {
        const target = await findUserById(userId)
        if (!target) { json(res, { error: 'User not found' }, 404); return }
        if (target.role === 'admin') {
          const adminCount = await countAdmins()
          if (adminCount <= 1) {
            json(res, { error: 'Tidak bisa menghapus admin terakhir' }, 400)
            return
          }
        }
        const ok = await deleteUser(userId)
        json(res, { ok: true })
        return
      }
    } catch (err) {
      json(res, { error: err.message }, 500)
      return
    }
  }

  if (path === '/health') {
    json(res, {
      ok: true,
      vessels: Object.keys(vessels).length,
      atons: Object.keys(atons).length,
      stations: Object.keys(stations).length,
      drone: !!drone,
      tcp: Object.values(state.tcp).some(s => s.connected),
      db:    !!(recorder && recorder.enabled),
      recording: recorder ? recorder.enabled : false,
    })
    return
  }

  if (!recorder || !recorder.enabled) {
    json(res, { error: 'Database not enabled' }, 503)
    return
  }

  try {
    // GET /api/stats — statistik semua tabel
    if (path === '/api/stats') {
      const stats = await recorder.getStats()
      json(res, stats)
      return
    }

    // GET /api/raw — raw NMEA records
    if (path === '/api/raw') {
      const limit = Math.min(parseInt(params.limit) || 100, 5000)
      const offset = parseInt(params.offset) || 0
      const { rows } = await query(
        'SELECT id, recorded_at, raw_sentence, source FROM raw_nmea ORDER BY id DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      )
      json(res, rows)
      return
    }

    // GET /api/vessels — daftar MMSI unik (dengan nama dari vessel_static)
    if (path === '/api/vessels') {
      const { rows } = await query(
        `WITH ranked AS (
          SELECT mmsi, ais_type, lat, lon, sog, heading, recorded_at,
            ROW_NUMBER() OVER (PARTITION BY mmsi ORDER BY recorded_at DESC) AS rn
          FROM vessel_positions
        )
        SELECT r.mmsi, r.ais_type, r.lat, r.lon, r.sog, r.heading, r.recorded_at,
          (SELECT s.name FROM vessel_static s
           WHERE s.mmsi = r.mmsi
           ORDER BY s.recorded_at DESC LIMIT 1) as name
        FROM ranked r
        WHERE r.rn = 1 ORDER BY r.mmsi`
      )
      json(res, rows)
      return
    }

    // GET /api/vessels/:mmsi — detail kapal
    const vesselMatch = path.match(/^\/api\/vessels\/(\d+)(?:\/(positions|static))?$/)
    if (vesselMatch) {
      const mmsi = vesselMatch[1]
      const sub = vesselMatch[2]

      // Static data
      if (sub === 'static') {
        const { rows } = await query(
          'SELECT * FROM vessel_static WHERE mmsi = $1 ORDER BY recorded_at DESC LIMIT 1',
          [mmsi]
        )
        json(res, rows[0] || null)
        return
      }

      // Position history
      if (sub === 'positions' || !sub) {
        const limit = Math.min(parseInt(params.limit) || 500, 10000)
        const from = params.from || '1970-01-01'
        const to = params.to || '2099-12-31'
        const { rows } = await query(
          `SELECT id, recorded_at, ais_type, lat, lon, sog, cog, heading, nav_status, altitude
           FROM vessel_positions WHERE mmsi = $1 AND recorded_at >= $2 AND recorded_at <= $3
           ORDER BY recorded_at DESC LIMIT $4`,
          [mmsi, from, to, limit]
        )
        json(res, rows)
        return
      }
    }

    // GET /api/drone — drone telemetry history
    if (path === '/api/drone') {
      const limit = Math.min(parseInt(params.limit) || 500, 10000)
      const from = params.from || '1970-01-01'
      const to = params.to || '2099-12-31'
      const { rows } = await query(
        `SELECT * FROM drone_telemetry WHERE recorded_at >= $1 AND recorded_at <= $2
         ORDER BY recorded_at DESC LIMIT $3`,
        [from, to, limit]
      )
      json(res, rows)
      return
    }

    // GET /api/base-stations
    if (path === '/api/base-stations') {
      const limit = Math.min(parseInt(params.limit) || 100, 5000)
      const { rows } = await query(
        'SELECT DISTINCT ON (mmsi) * FROM base_stations ORDER BY mmsi, recorded_at DESC LIMIT $1',
        [limit]
      )
      json(res, rows)
      return
    }

    // GET /api/atons
    if (path === '/api/atons') {
      const limit = Math.min(parseInt(params.limit) || 100, 5000)
      const { rows } = await query(
        'SELECT DISTINCT ON (mmsi) * FROM atons ORDER BY mmsi, recorded_at DESC LIMIT $1',
        [limit]
      )
      json(res, rows)
      return
    }

    // GET /api/gps — GPS fix history
    if (path === '/api/gps') {
      const limit = Math.min(parseInt(params.limit) || 100, 5000)
      const { rows } = await query(
        'SELECT * FROM gps_fix ORDER BY recorded_at DESC LIMIT $1',
        [limit]
      )
      json(res, rows)
      return
    }

    // GET /api/safety — safety messages
    if (path === '/api/safety') {
      const limit = Math.min(parseInt(params.limit) || 100, 5000)
      const { rows } = await query(
        'SELECT * FROM safety_messages ORDER BY recorded_at DESC LIMIT $1',
        [limit]
      )
      json(res, rows)
      return
    }
  } catch (err) {
    json(res, { error: err.message }, 500)
    return
  }

  json(res, { error: 'Not found' }, 404)
})

const wss = new WebSocketServer({ server: httpServer })

const bcastBuf = []
let bcastTimer = null

function broadcast(event, data) {
  bcastBuf.push({ event, data })
  if (!bcastTimer) {
    bcastTimer = setTimeout(() => {
      bcastTimer = null
      if (bcastBuf.length === 0) return
      const batch = bcastBuf.splice(0)
      const msg = JSON.stringify({ event: 'batch', data: batch, ts: Date.now() })
      wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg) })
    }, 100)
  }
}

function buildStatus() {
  const tcp = {}
  for (const t of config.tcp) {
    const s = state.tcp[t.id] || {}
    tcp[t.id] = {
      connected: !!s.connected, rx: s.rx || 0, rxVessels: s.rxVessels || 0,
      host: t.host, port: t.port, label: t.label,
    }
  }
  return {
    serial: { connected:state.serial.connected, port:config.serial.port,     rx:state.serial.rx, rxVessels:state.serial.rxVessels },
    tcp,
    udp:    { listening:state.udp.listening,    port:config.udp.listenPort,   rx:state.udp.rx, rxVessels:state.udp.rxVessels },
    db:     { connected: !!recorder, recording: recorder ? recorder.enabled : false },
  }
}
function sendStatus() { broadcast('status', buildStatus()) }

wss.on('connection', (ws) => {
  console.log('[WS] Client connected')
  ws.send(JSON.stringify({ event:'config',  data:config }))
  ws.send(JSON.stringify({ event:'status',  data:buildStatus() }))

  // Kirim semua data yang sudah ada ke client baru
  Object.values(vessels).forEach(v  => ws.send(JSON.stringify({ event:'vessel',  data:v })))
  Object.values(atons).forEach(a    => ws.send(JSON.stringify({ event:'aton',    data:a })))
  Object.values(stations).forEach(s => ws.send(JSON.stringify({ event:'station', data:s })))
  if (drone) ws.send(JSON.stringify({ event:'drone', data:drone }))

  ws.on('message', async (raw) => {
    let msg; try { msg = JSON.parse(raw) } catch { return }
    switch (msg.cmd) {
      case 'getConfig':
        ws.send(JSON.stringify({ event:'config', data:config }))
        break

      case 'setConfig': {
        const prev = JSON.stringify(config)
        const prevCfg = JSON.parse(JSON.stringify(config))
        const prevDb = JSON.stringify(config.db)
        config = normalizeConfig(deepMerge(config, msg.config))
        broadcast('config', config)
        if (prev !== JSON.stringify(config)) reconnectChanged(prevCfg)
        if (JSON.stringify(config.db) !== prevDb) {
          const prevDbObj = JSON.parse(prevDb)
          const connKeys = ['connectionString','host','port','database','user','password']
          const connChanged = connKeys.some(k => prevDbObj[k] !== config.db[k])
          if (connChanged) {
            console.log('[DB] Re-initializing (connection params changed)...')
            initDatabase()
          } else {
            if (recorder) recorder.enabled = config.db.recording !== false
            sendStatus()
            console.log('[DB] Recording ' + (recorder?.enabled ? 'enabled' : 'disabled'))
          }
        }
        break
      }

      case 'getStatus':
        ws.send(JSON.stringify({ event:'status', data:buildStatus() }))
        break

      case 'listPorts': {
        try {
          const { SerialPort } = require('serialport')
          const ports = await SerialPort.list()
          ws.send(JSON.stringify({ event:'ports', data:ports.map(p => ({ path:p.path, manufacturer:p.manufacturer })) }))
        } catch(e) {
          ws.send(JSON.stringify({ event:'ports', data:[], error:e.message }))
        }
        break
      }

      case 'testTCP': {
        const tcpCfg = config.tcp.find(t => t.id === msg.tcpId)
        if (!tcpCfg) {
          ws.send(JSON.stringify({ event:'tcpTest', ok:false, msg:'TCP connection not found', tcpId:msg.tcpId }))
          break
        }
        const s = new net.Socket(); s.setTimeout(8000)
        s.connect(tcpCfg.port, tcpCfg.host, () => {
          ws.send(JSON.stringify({ event:'tcpTest', ok:true, msg:`${tcpCfg.host}:${tcpCfg.port} dapat dijangkau`, tcpId:msg.tcpId }))
          s.destroy()
        })
        s.on('timeout', () => {
          ws.send(JSON.stringify({ event:'tcpTest', ok:false, msg:'Timeout — host tidak merespons', tcpId:msg.tcpId }))
          s.destroy()
        })
        s.on('error', (e) => {
          ws.send(JSON.stringify({ event:'tcpTest', ok:false, msg:e.message, tcpId:msg.tcpId }))
        })
        break
      }
    }
  })

  ws.on('close', () => console.log('[WS] Client disconnected'))
})

// ─── AIS sentence handler ────────────────────────────────────────────────────

function handleSentence(sentence, source) {
  broadcast('raw', { sentence, source })
  if (recorder) recorder.recordRaw(sentence, source, true)

  const decoded = parseSentence(sentence)
  if (!decoded) return

  // Track parseable messages per source (diagnostik)
  if (source === 'serial') state.serial.rxVessels++
  else if (source.startsWith('tcp-')) {
    const tcpId = source.slice(4)
    const s = state.tcp[tcpId]
    if (s) s.rxVessels++
  }
  else if (source === 'udp')   state.udp.rxVessels++

  const now = Date.now()

  switch (decoded.type) {

    // ── Drone UAV (MSG 8, DAC=366, FI=56) ───────────────────────────────────
    case 'drone': {
      drone = { ...decoded, rawNMEA: sentence, source, ts: now }
      broadcast('drone', drone)
      if (recorder) recorder.recordDrone(decoded, source)
      console.log(`[${source}] Drone ${decoded.mmsi} lat:${decoded.lat?.toFixed(4)} lon:${decoded.lon?.toFixed(4)} alt:${decoded.alt}m mode:${decoded.mode}`)
      break
    }

    // ── Posisi kapal bergerak (MSG 1/2/3 Class A) ────────────────────────────
    case 'classA': {
      const ex = vessels[decoded.mmsi] || {}
      vessels[decoded.mmsi] = {
        ...ex, ...decoded,
        aisType: 'Class A',
        type:    'Class A',
        source,  ts: now,
      }
      broadcast('vessel', vessels[decoded.mmsi])
      if (recorder) recorder.recordVesselPosition(decoded, source)
      console.log(`[${source}] Class A ${decoded.mmsi} sog:${decoded.sog}kn lat:${decoded.lat?.toFixed(4)} status:${decoded.status}`)
      break
    }

    // ── Posisi kapal bergerak (MSG 18/19 Class B) ────────────────────────────
    case 'classB':
    case 'classBext': {
      const ex = vessels[decoded.mmsi] || {}
      vessels[decoded.mmsi] = {
        ...ex, ...decoded,
        aisType: 'Class B',
        type:    'Class B',
        source,  ts: now,
      }
      broadcast('vessel', vessels[decoded.mmsi])
      if (recorder) recorder.recordVesselPosition(decoded, source)
      console.log(`[${source}] Class B ${decoded.mmsi} sog:${decoded.sog}kn lat:${decoded.lat?.toFixed(4)}`)
      break
    }

    // ── SAR Aircraft (MSG 9) ─────────────────────────────────────────────────
    case 'sar': {
      const ex = vessels[decoded.mmsi] || {}
      vessels[decoded.mmsi] = {
        ...ex, ...decoded,
        name: ex.name || (decoded.mmsi === '970123456' ? 'PROTOTIPE AIRCRAFT' : `SAR-${decoded.mmsi.slice(-4)}`),
        aisType: 'SAR Aircraft',
        type: 'SAR Aircraft',
        rawNMEA: sentence,
        source, ts: now,
      }
      broadcast('sar',    vessels[decoded.mmsi])
      broadcast('vessel', vessels[decoded.mmsi])
      if (recorder) recorder.recordVesselPosition(decoded, source)
      console.log(`[${source}] SAR ${decoded.mmsi} alt:${decoded.alt}m sog:${decoded.sog}kn`)
      break
    }

    // ── Long Range (MSG 27, misal dari satelit AIS) ──────────────────────────
    case 'longRange': {
      const ex = vessels[decoded.mmsi] || {}
      vessels[decoded.mmsi] = {
        ...ex, ...decoded,
        aisType: 'Long Range',
        type:    'Long Range',
        source,  ts: now,
      }
      broadcast('vessel', vessels[decoded.mmsi])
      if (recorder) recorder.recordVesselPosition(decoded, source)
      console.log(`[${source}] LongRange ${decoded.mmsi} lat:${decoded.lat?.toFixed(4)} sog:${decoded.sog}kn`)
      break
    }

    // ── Static & Voyage (MSG 5) ──────────────────────────────────────────────
    case 'staticA': {
      const ex = vessels[decoded.mmsi] || { mmsi: decoded.mmsi }
      const { type: _t, ...rest } = decoded
      vessels[decoded.mmsi] = { ...ex, ...rest, aisType: 'Class A', type: 'Class A', source, ts: now }
      broadcast('vessel', vessels[decoded.mmsi])
      if (recorder) recorder.recordStatic(decoded, source)
      console.log(`[${source}] Static A ${decoded.mmsi} name:"${decoded.name}" dest:"${decoded.destination}"`)
      break
    }

    // ── Static Class B Part A & B (MSG 24) ──────────────────────────────────
    case 'staticB0':
    case 'staticB1': {
      const ex = vessels[decoded.mmsi] || { mmsi: decoded.mmsi }
      const { type: _t, ...rest } = decoded
      vessels[decoded.mmsi] = { ...ex, ...rest, aisType: 'Class B', type: 'Class B', source, ts: now }
      broadcast('vessel', vessels[decoded.mmsi])
      if (recorder) recorder.recordStatic(decoded, source)
      console.log(`[${source}] Static B ${decoded.mmsi} ${decoded.type === 'staticB0' ? `name:"${decoded.name}"` : `callsign:"${decoded.callsign}"`}`)
      break
    }

    // ── Aid-to-Navigation (MSG 21) ───────────────────────────────────────────
    case 'aton': {
      atons[decoded.mmsi] = { ...decoded, source, ts: now }
      broadcast('aton', atons[decoded.mmsi])
      if (recorder) recorder.recordAton(decoded, source)
      console.log(`[${source}] AtoN ${decoded.mmsi} lat:${decoded.lat?.toFixed(4)} name:"${decoded.name}"`)
      break
    }

    // ── Base Station / UTC Response (MSG 4/11) ───────────────────────────────
    case 'baseStation': {
      stations[decoded.mmsi] = { ...decoded, source, ts: now }
      broadcast('station', stations[decoded.mmsi])
      if (recorder) recorder.recordBaseStation(decoded, source)
      console.log(`[${source}] BaseStation ${decoded.mmsi} lat:${decoded.lat?.toFixed(4)}`)
      break
    }

    // ── Binary Broadcast generik (MSG 8 non-drone) ───────────────────────────
    case 'binaryBroadcast': {
      broadcast('binaryBroadcast', { ...decoded, source, ts: now })
      if (recorder) recorder.recordBinary(decoded, source)
      console.log(`[${source}] BinBcast ${decoded.mmsi} DAC:${decoded.dac} FI:${decoded.fi}`)
      break
    }

    // ── Addressed Binary (MSG 6) ─────────────────────────────────────────────
    case 'addrBinary': {
      broadcast('addrBinary', { ...decoded, source, ts: now })
      if (recorder) recorder.recordBinary(decoded, source)
      console.log(`[${source}] AddrBin ${decoded.mmsi} → ${decoded.destMmsi} DAC:${decoded.dac} FI:${decoded.fi}`)
      break
    }

    // ── Safety Messages (MSG 12/14) ──────────────────────────────────────────
    case 'safetyAddr':
    case 'safetyBcast': {
      broadcast('safety', { ...decoded, source, ts: now })
      if (recorder) recorder.recordSafety(decoded, source)
      console.log(`[${source}] Safety ${decoded.mmsi}: "${decoded.text?.slice(0, 60)}"`)
      break
    }

    // ── Acknowledge (MSG 7/13) ───────────────────────────────────────────────
    case 'ack': {
      broadcast('ack', { ...decoded, source, ts: now })
      if (recorder) recorder.recordAck(decoded, source)
      break
    }

    // ── UTC Inquiry (MSG 10) ─────────────────────────────────────────────────
    case 'utcInquiry': {
      broadcast('utcInquiry', { ...decoded, source, ts: now })
      break
    }

    // ── Interrogation (MSG 15) ───────────────────────────────────────────────
    case 'interrogation': {
      broadcast('interrogation', { ...decoded, source, ts: now })
      break
    }

    // ── Assignment Mode (MSG 16) ─────────────────────────────────────────────
    case 'assignMode': {
      broadcast('assignMode', { ...decoded, source, ts: now })
      break
    }

    // ── DGNSS (MSG 17) ───────────────────────────────────────────────────────
    case 'dgnss': {
      broadcast('dgnss', { ...decoded, source, ts: now })
      console.log(`[${source}] DGNSS ${decoded.mmsi} lat:${decoded.lat?.toFixed(4)}`)
      break
    }

    // ── Data Link Management (MSG 20) ────────────────────────────────────────
    case 'dlm': {
      broadcast('dlm', { ...decoded, source, ts: now })
      break
    }

    // ── Channel Management (MSG 22) ──────────────────────────────────────────
    case 'channelMgmt': {
      broadcast('channelMgmt', { ...decoded, source, ts: now })
      break
    }

    // ── Group Assignment (MSG 23) ────────────────────────────────────────────
    case 'groupAssign': {
      broadcast('groupAssign', { ...decoded, source, ts: now })
      break
    }

    // ── Single/Multi Slot Binary (MSG 25/26) ─────────────────────────────────
    case 'singleSlotBin':
    case 'multiSlotBin': {
      broadcast('binaryData', { ...decoded, source, ts: now })
      if (recorder) recorder.recordBinary(decoded, source)
      break
    }

    // ── Raw / Unknown ─────────────────────────────────────────────────────────
    default: {
      broadcast('unknown', { ...decoded, source, ts: now })
      if (recorder) recorder.recordOther(decoded, source)
      break
    }
  }
}

// ─── GPS sentence handler ──────────────────────────────────────────────────

function handleGPS(sentence, source) {
  broadcast('raw', { sentence, source })
  if (recorder) recorder.recordRaw(sentence, source, true)
  const parsed = parseGPS(sentence)
  if (!parsed) return
  if (parsed.type === 'gga') {
    gpsFix.lat   = parsed.lat ?? gpsFix.lat
    gpsFix.lon   = parsed.lon ?? gpsFix.lon
    gpsFix.altitude   = parsed.altitude ?? gpsFix.altitude
    gpsFix.satCount   = parsed.satCount ?? gpsFix.satCount
    gpsFix.hdop       = parsed.hdop ?? gpsFix.hdop
    gpsFix.fixQuality = parsed.fixQuality ?? gpsFix.fixQuality
  } else if (parsed.type === 'rmc') {
    gpsFix.lat = parsed.lat ?? gpsFix.lat
    gpsFix.lon = parsed.lon ?? gpsFix.lon
    gpsFix.sog = parsed.sog ?? gpsFix.sog
    gpsFix.cog = parsed.cog ?? gpsFix.cog
  } else if (parsed.type === 'gsa') {
    gpsFix.hdop = parsed.hdop ?? gpsFix.hdop
  }
  const gpsData = { ...gpsFix, ts: Date.now() }
  broadcast('gps', gpsData)
  if (recorder) recorder.recordGPS(gpsFix, source)
  console.log(`[GPS] lat:${gpsFix.lat?.toFixed(4)} lon:${gpsFix.lon?.toFixed(4)} alt:${gpsFix.altitude}m sats:${gpsFix.satCount}`)
}

function clearSource(source) {
  let removed = 0
  Object.keys(vessels).forEach(mmsi => {
    if (vessels[mmsi].source === source) { delete vessels[mmsi]; broadcast('vesselRemoved', { mmsi }); removed++ }
  })
  Object.keys(atons).forEach(mmsi => {
    if (atons[mmsi].source === source) { delete atons[mmsi]; broadcast('atonRemoved', { mmsi }); removed++ }
  })
  Object.keys(stations).forEach(mmsi => {
    if (stations[mmsi].source === source) { delete stations[mmsi]; broadcast('stationRemoved', { mmsi }); removed++ }
  })
  if (drone && drone.source === source) { drone = null; broadcast('drone', null); removed++ }
  if (removed > 0) console.log(`[${source}] Cleared ${removed} objects`)
}

// ─── Line reader ─────────────────────────────────────────────────────────────

function makeLineReader(source) {
  let buf = ''
  return (chunk) => {
    buf += chunk.toString('utf8')
    const lines = buf.split(/\r?\n/)
    buf = lines.pop()
    for (let raw of lines) {
      raw = raw.trim()
      if (!raw) continue
      const m = raw.match(/(!AIVD[MO],.+)/)
      if (m) { handleSentence(m[1], source); continue }
      const g = raw.match(/^(\$G[NP](?:GGA|RMC|GSA),.*)/)
      if (g) { handleGPS(g[1], source); continue }
    }
  }
}

// ─── Serial ──────────────────────────────────────────────────────────────────

function connectSerial() {
  if (!config.serial.enabled) return
  if (serialPortRef.port) { try { serialPortRef.port.close() } catch {} serialPortRef.port = null }
  try {
    const { SerialPort } = require('serialport')
    serialPortRef.port = new SerialPort({ path:config.serial.port, baudRate:config.serial.baudRate })
    const reader = makeLineReader('serial')
    serialPortRef.port.on('open',  () => { console.log(`[Serial] ${config.serial.port} @ ${config.serial.baudRate}`); state.serial.connected = true; sendStatus(); if (recorder) recorder.recordConnectionLog('serial', 'connected', `${config.serial.port} @ ${config.serial.baudRate}`) })
    serialPortRef.port.on('data',  (c) => { state.serial.rx++; reader(c) })
    serialPortRef.port.on('error', (e) => { console.error('[Serial]', e.message); broadcast('error', { source:'serial', message:e.message }); clearSource('serial'); state.serial.connected = false; sendStatus(); if (recorder) recorder.recordConnectionLog('serial', 'error', e.message); if (config.serial.enabled) setTimeout(connectSerial, 5000) })
    serialPortRef.port.on('close', ()  => { clearSource('serial'); state.serial.connected = false; sendStatus(); if (recorder) recorder.recordConnectionLog('serial', 'disconnected', ''); if (config.serial.enabled) setTimeout(connectSerial, 5000) })
  } catch(e) {
    console.error('[Serial] Failed:', e.message)
    broadcast('error', { source:'serial', message:e.message })
    state.serial.connected = false; sendStatus()
    if (config.serial.enabled) setTimeout(connectSerial, 5000)
  }
}

// ─── TCP (multi-connection) ─────────────────────────────────────────────────

function clearAct(id) {
  const s = state.tcp[id]
  if (s && s.activityTimer) { clearTimeout(s.activityTimer); s.activityTimer = null }
}
function resetAct(id, sock) {
  clearAct(id)
  const tcpCfg = config.tcp.find(t => t.id === id)
  if (!tcpCfg || !tcpCfg.timeoutMs) return
  const s = state.tcp[id]
  if (!s) return
  s.activityTimer = setTimeout(() => {
    console.warn(`[TCP:${id}] No data timeout`)
    broadcast('error', { source:'tcp-'+id, message:`No data for ${tcpCfg.timeoutMs/1000}s, reconnecting...` })
    sock.destroy()
  }, tcpCfg.timeoutMs)
}

function disconnectTCP(id) {
  const s = state.tcp[id]
  if (!s) return
  clearSource('tcp-'+id)
  clearAct(id)
  if (s.reconnectTimer) { clearTimeout(s.reconnectTimer); s.reconnectTimer = null }
  if (s.socket) { s.socket.removeAllListeners(); try { s.socket.destroy() } catch {}; s.socket = null }
  s.connected = false; s.socket = null
  delete state.tcp[id]
  console.log(`[TCP:${id}] Disconnected`)
  sendStatus()
}

function connectTCP(id) {
  const tcpCfg = config.tcp.find(t => t.id === id)
  if (!tcpCfg || !tcpCfg.enabled) return
  if (!state.tcp[id]) state.tcp[id] = { connected:false, rx:0, rxVessels:0, socket:null, reconnectTimer:null, activityTimer:null }
  const s = state.tcp[id]
  disconnectTCP(id)
  // re-init after disconnect clears state
  state.tcp[id] = { connected:false, rx:0, rxVessels:0, socket:null, reconnectTimer:null, activityTimer:null }
  const ns = state.tcp[id]
  const source = 'tcp-'+id
  console.log(`[TCP:${id}] Connecting → ${tcpCfg.host}:${tcpCfg.port}`)
  const sock = new net.Socket(); ns.socket = sock; sock.setTimeout(15000)
  const reader = makeLineReader(source)
  sock.connect(tcpCfg.port, tcpCfg.host)
  sock.on('connect', ()  => { sock.setTimeout(0); console.log(`[TCP:${id}] ✓ Connected`); ns.connected = true; sendStatus(); resetAct(id, sock); if (recorder) recorder.recordConnectionLog('tcp-'+id, 'connected', `${tcpCfg.host}:${tcpCfg.port}`) })
  sock.on('data',    (c) => { ns.rx++; resetAct(id, sock); reader(c) })
  sock.on('timeout', ()  => { console.error(`[TCP:${id}] Timeout`); broadcast('error', { source, message:`Connection timeout → ${tcpCfg.host}:${tcpCfg.port}` }); sock.destroy() })
  sock.on('error',   (e) => { console.error(`[TCP:${id}]`, e.code||e.message); broadcast('error', { source, message:`${e.code||e.message} — ${tcpCfg.host}:${tcpCfg.port}` }); if (recorder) recorder.recordConnectionLog(source, 'error', e.code||e.message) })
  sock.on('close',   ()  => {
    clearAct(id); clearSource(source); ns.connected = false; ns.socket = null; sendStatus(); if (recorder) recorder.recordConnectionLog(source, 'disconnected', '')
    const cfg = config.tcp.find(t => t.id === id)
    if (cfg && cfg.enabled) {
      const d = cfg.reconnectMs || 5000
      console.log(`[TCP:${id}] Retry in ${d}ms`)
      ns.reconnectTimer = setTimeout(() => connectTCP(id), d)
    }
  })
}

// ─── UDP ─────────────────────────────────────────────────────────────────────

function startUDP() {
  if (!config.udp.enabled) return
  if (state.udp.socket) { try { state.udp.socket.close() } catch {}; state.udp.socket = null }
  const sock = dgram.createSocket('udp4'); state.udp.socket = sock
  const reader = makeLineReader('udp')
  sock.on('message',  (msg) => { state.udp.rx++; reader(msg) })
  sock.on('listening', ()   => { console.log(`[UDP] 0.0.0.0:${sock.address().port}`); state.udp.listening = true; sendStatus(); if (recorder) recorder.recordConnectionLog('udp', 'listening', `port ${config.udp.listenPort}`) })
  sock.on('error',    (e)   => { console.error('[UDP]', e.message); broadcast('error', { source:'udp', message:e.message }); clearSource('udp'); state.udp.listening = false; sendStatus(); if (recorder) recorder.recordConnectionLog('udp', 'error', e.message) })
  sock.bind(config.udp.listenPort)
}

// ─── Reconnect only changed sources ───────────────────────────────────────

function reconnectChanged(prev) {
  // Serial
  if (JSON.stringify(prev.serial) !== JSON.stringify(config.serial)) {
    clearSource('serial')
    if (serialPortRef.port) { try { serialPortRef.port.close() } catch {}; serialPortRef.port = null }
    state.serial.connected = false
    if (config.serial.enabled) connectSerial()
  }
  // TCP — compare per id
  const prevTcp = Array.isArray(prev.tcp) ? prev.tcp : [prev.tcp]
  const curTcp = config.tcp
  // disconnect removed or changed connections
  for (const pt of prevTcp) {
    const ct = curTcp.find(t => t.id === pt.id)
    if (!ct || JSON.stringify(ct) !== JSON.stringify(pt)) disconnectTCP(pt.id)
  }
  // (re)connect new or changed connections
  for (const ct of curTcp) {
    const pt = prevTcp.find(t => t.id === ct.id)
    if (!pt || JSON.stringify(ct) !== JSON.stringify(pt)) {
      if (ct.enabled) connectTCP(ct.id)
    }
  }
  // UDP
  if (JSON.stringify(prev.udp) !== JSON.stringify(config.udp)) {
    clearSource('udp')
    if (state.udp.socket) { try { state.udp.socket.close() } catch {}; state.udp.socket = null }
    state.udp.listening = false
    if (config.udp.enabled) startUDP()
  }
  sendStatus()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepMerge(target, source) {
  const out = { ...target }
  for (const k of Object.keys(source)) {
    if (source[k] !== null && typeof source[k] === 'object' && !Array.isArray(source[k]))
      out[k] = deepMerge(target[k] || {}, source[k])
    else
      out[k] = source[k]
  }
  return out
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

setInterval(sendStatus, 3000)

// ─── Pre-populate in-memory vessels with names from DB ──────────────────

async function enrichVesselsFromDb() {
  if (!recorder || !recorder.enabled) return
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (mmsi) mmsi, name
       FROM vessel_static
       WHERE name IS NOT NULL AND name != ''
       ORDER BY mmsi, recorded_at DESC`
    )
    let count = 0
    for (const row of rows) {
      if (vessels[row.mmsi]) {
        vessels[row.mmsi].name = row.name
        count++
      }
    }
    if (count > 0) console.log(`[DB] Enriched ${count} vessels with names from DB`)
  } catch (err) {
    console.error('[DB] Enrich vessels failed:', err.message)
  }
}

// ─── Database / Recorder init ────────────────────────────────────────────

async function initDatabase() {
  const pool = createPool(config.db)
  if (!pool) { recorder = null; sendStatus(); console.log('[DB] Disabled'); return }
  try {
    await initSchema()
    recorder = new AISRecorder({ query: pool.query.bind(pool) })
    recorder.enabled = config.db.recording !== false
    sendStatus()
    console.log('[DB] Recorder enabled' + (recorder.enabled ? '' : ' (recording disabled)'))
    await enrichVesselsFromDb()
  } catch (err) {
    console.error('[DB] Init failed:', err.message)
    recorder = null
    sendStatus()
  }
}
initDatabase()

// ─── DB retention cleanup (every 30 min) ───────────────────────────────────
setInterval(() => {
  if (!recorder || !recorder.enabled) return
  const days = config.db?.retentionDays || 30
  const cut = new Date(Date.now() - days * 86400000).toISOString()
  const tables = ['raw_nmea','vessel_positions','vessel_static','drone_telemetry','base_stations','atons','safety_messages','binary_messages','gps_fix','connection_log']
  for (const t of tables) {
    query(`DELETE FROM ${t} WHERE recorded_at < $1`, [cut]).catch(() => {})
  }
  console.log(`[DB] Cleanup done (retention: ${days}d)`)
}, 1800000)

// ─── Stale data cleanup (every 60s, remove entries >5min without update) ────
setInterval(() => {
  const cutoff = Date.now() - 300000 // 5 minutes
  let removed = 0
  Object.keys(vessels).forEach(mmsi => {
    if (vessels[mmsi].ts && vessels[mmsi].ts < cutoff) {
      delete vessels[mmsi]; broadcast('vesselRemoved', { mmsi }); removed++
    }
  })
  Object.keys(atons).forEach(mmsi => {
    if (atons[mmsi].ts && atons[mmsi].ts < cutoff) {
      delete atons[mmsi]; broadcast('atonRemoved', { mmsi }); removed++
    }
  })
  Object.keys(stations).forEach(mmsi => {
    if (stations[mmsi].ts && stations[mmsi].ts < cutoff) {
      delete stations[mmsi]; broadcast('stationRemoved', { mmsi }); removed++
    }
  })
  if (drone && drone.ts && drone.ts < cutoff) {
    drone = null; broadcast('drone', null); removed++
  }
  if (removed > 0) console.log(`[Cleanup] Removed ${removed} stale entries`)
}, 60000)

// Start enabled sources
if (config.serial.enabled) connectSerial()
config.tcp.forEach(t => { if (t.enabled) connectTCP(t.id) })
if (config.udp.enabled) startUDP()

const WS_PORT = process.env.PORT || 3001
httpServer.listen(WS_PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║    AIS Drone Monitor v2 — Backend Server    ║`)
  console.log(`║    WebSocket : ws://localhost:${WS_PORT}              ║`)
  console.log(`║    REST API  : http://localhost:${WS_PORT}/api/stats   ║`)
  console.log(`║    Health    : http://localhost:${WS_PORT}/health      ║`)
  console.log(`╚══════════════════════════════════════════════╝\n`)
})