'use strict'
const { Pool } = require('pg')
const crypto = require('crypto')

let pool = null

function createPool(cfg) {
  if (pool) { try { pool.end() } catch {}; pool = null }
  if (!cfg || !cfg.enabled) return null
  const opts = {
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  }
  if (cfg.connectionString) {
    opts.connectionString = cfg.connectionString
  } else {
    opts.host     = cfg.host || 'localhost'
    opts.port     = cfg.port || 5432
    opts.database = cfg.database || 'ais_drone_monitor'
    opts.user     = cfg.user || 'postgres'
    opts.password = cfg.password
  }
  pool = new Pool(opts)
  pool.on('error', err => console.error('[DB] Pool error:', err.message))
  return pool
}

function getPool() { return pool }

async function initSchema() {
  if (!pool) return
  const sql = `
    CREATE TABLE IF NOT EXISTS raw_nmea (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_sentence TEXT NOT NULL,
      source TEXT NOT NULL,
      checksum_valid BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS vessel_positions (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      ais_type TEXT NOT NULL,
      msg_type INTEGER,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      sog DOUBLE PRECISION,
      cog DOUBLE PRECISION,
      heading DOUBLE PRECISION,
      rot DOUBLE PRECISION,
      nav_status TEXT,
      pos_accuracy BOOLEAN,
      altitude DOUBLE PRECISION,
      source TEXT NOT NULL,
      raw_json JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_vp_mmsi_ts ON vessel_positions(mmsi, recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_vp_ts ON vessel_positions(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS vessel_static (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      name TEXT,
      callsign TEXT,
      ship_type TEXT,
      imo TEXT,
      dim_bow INTEGER,
      dim_stern INTEGER,
      dim_port INTEGER,
      dim_stbd INTEGER,
      destination TEXT,
      draught DOUBLE PRECISION,
      epfd TEXT,
      source TEXT NOT NULL,
      raw_json JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_vs_mmsi ON vessel_static(mmsi);

    CREATE TABLE IF NOT EXISTS drone_telemetry (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      altitude DOUBLE PRECISION,
      sog DOUBLE PRECISION,
      heading DOUBLE PRECISION,
      cog DOUBLE PRECISION,
      battery INTEGER,
      satellites INTEGER,
      mode TEXT,
      roll DOUBLE PRECISION,
      pitch DOUBLE PRECISION,
      yaw DOUBLE PRECISION,
      source TEXT NOT NULL,
      raw_json JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_dt_ts ON drone_telemetry(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS base_stations (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      epfd TEXT,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bs_mmsi ON base_stations(mmsi);

    CREATE TABLE IF NOT EXISTS atons (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      aton_type INTEGER,
      name TEXT,
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_aton_mmsi ON atons(mmsi);

    CREATE TABLE IF NOT EXISTS safety_messages (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      msg_type TEXT NOT NULL,
      text TEXT,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sm_ts ON safety_messages(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS binary_messages (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mmsi TEXT NOT NULL,
      msg_type TEXT NOT NULL,
      dac INTEGER,
      fi INTEGER,
      source TEXT NOT NULL,
      raw_json JSONB
    );
    CREATE INDEX IF NOT EXISTS idx_bm_ts ON binary_messages(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS gps_fix (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      lat DOUBLE PRECISION,
      lon DOUBLE PRECISION,
      altitude DOUBLE PRECISION,
      sog DOUBLE PRECISION,
      cog DOUBLE PRECISION,
      sat_count INTEGER,
      hdop DOUBLE PRECISION,
      fix_quality INTEGER,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gps_ts ON gps_fix(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS connection_log (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL,
      event TEXT NOT NULL,
      message TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_cl_ts ON connection_log(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      display_name VARCHAR(100),
      role VARCHAR(20) NOT NULL DEFAULT 'operator'
        CHECK (role IN ('admin', 'operator')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  try {
    await pool.query(sql)
    await pool.query(
      `INSERT INTO users (username, password, display_name, role)
       SELECT 'admin', $1, 'Administrator', 'admin'
       WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')`,
      [hashPassword('admin123')]
    )
    console.log('[DB] Schema initialized successfully')
  } catch (err) {
    console.error('[DB] Schema init failed:', err.message)
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return hash === derived
}

async function findUserByUsername(username) {
  if (!pool) return null
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username])
  return rows[0] || null
}

async function findUserById(id) {
  if (!pool) return null
  const { rows } = await pool.query('SELECT id, username, display_name, role, created_at, updated_at FROM users WHERE id = $1', [id])
  return rows[0] || null
}

async function getAllUsers() {
  if (!pool) return []
  const { rows } = await pool.query('SELECT id, username, display_name, role, created_at, updated_at FROM users ORDER BY id ASC')
  return rows
}

async function createUser(username, password, displayName, role) {
  if (!pool) return null
  const hashed = hashPassword(password)
  const { rows } = await pool.query(
    'INSERT INTO users (username, password, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, role, created_at, updated_at',
    [username, hashed, displayName, role]
  )
  return rows[0]
}

async function updateUser(id, fields) {
  if (!pool) return null
  const sets = []
  const vals = []
  let idx = 1
  if (fields.username != null) { sets.push(`username = $${idx++}`); vals.push(fields.username) }
  if (fields.password) { sets.push(`password = $${idx++}`); vals.push(hashPassword(fields.password)) }
  if (fields.display_name != null) { sets.push(`display_name = $${idx++}`); vals.push(fields.display_name) }
  if (fields.role != null) { sets.push(`role = $${idx++}`); vals.push(fields.role) }
  sets.push(`updated_at = NOW()`)
  vals.push(id)
  const { rows } = await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, username, display_name, role, created_at, updated_at`, vals)
  return rows[0]
}

async function deleteUser(id) {
  if (!pool) return false
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id])
  return rowCount > 0
}

async function countAdmins() {
  if (!pool) return 0
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
  return parseInt(rows[0].count) || 0
}

async function query(text, params) {
  if (!pool) throw new Error('Database not connected')
  return pool.query(text, params)
}

async function close() {
  if (pool) { try { await pool.end() } catch {}; pool = null }
}

module.exports = { createPool, getPool, initSchema, query, close, hashPassword, verifyPassword, findUserByUsername, findUserById, getAllUsers, createUser, updateUser, deleteUser, countAdmins }
