'use strict'

class AISRecorder {
  constructor(db) {
    this.db = db
    this.enabled = true
  }

  async recordRaw(sentence, source, valid) {
    if (!this.enabled) return
    try {
      await this.db.query(
        'INSERT INTO raw_nmea (raw_sentence, source, checksum_valid) VALUES ($1, $2, $3)',
        [sentence, source, valid !== false]
      )
    } catch (err) { /* silent */ }
  }

  async recordVesselPosition(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO vessel_positions
         (mmsi, ais_type, msg_type, lat, lon, sog, cog, heading, rot, nav_status, pos_accuracy, altitude, source, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          mmsi, decoded.type, decoded.msgType || null,
          decoded.lat ?? null, decoded.lon ?? null,
          decoded.sog ?? null, decoded.cog ?? null,
          decoded.heading ?? null, decoded.rot ?? null,
          decoded.status ?? null, decoded.posAccuracy ?? null,
          decoded.alt ?? null, source,
          JSON.stringify(decoded)
        ]
      )
    } catch (err) { /* silent */ }
  }

  async recordDrone(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO drone_telemetry
         (mmsi, lat, lon, altitude, sog, heading, cog, battery, satellites, mode, roll, pitch, yaw, source, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          mmsi,
          decoded.lat ?? null, decoded.lon ?? null,
          decoded.alt ?? null, decoded.sog ?? null,
          decoded.heading ?? null, decoded.cog ?? null,
          decoded.battery ?? null, decoded.satellites ?? null,
          decoded.mode ?? null,
          decoded.roll ?? null, decoded.pitch ?? null, decoded.yaw ?? null,
          source, JSON.stringify(decoded)
        ]
      )
    } catch (err) { /* silent */ }
  }

  async recordStatic(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO vessel_static
         (mmsi, name, callsign, ship_type, imo, dim_bow, dim_stern, dim_port, dim_stbd, destination, draught, epfd, source, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          mmsi,
          decoded.name ?? null, decoded.callsign ?? null,
          decoded.shipType ?? null, decoded.imo ?? null,
          decoded.dimBow ?? null, decoded.dimStern ?? null,
          decoded.dimPort ?? null, decoded.dimStbd ?? null,
          decoded.destination ?? null, decoded.draught ?? null,
          decoded.epfd ?? null, source,
          JSON.stringify(decoded)
        ]
      )
    } catch (err) { /* silent */ }
  }

  async recordBaseStation(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO base_stations (mmsi, lat, lon, epfd, source) VALUES ($1,$2,$3,$4,$5)`,
        [mmsi, decoded.lat ?? null, decoded.lon ?? null, decoded.epfd ?? null, source]
      )
    } catch (err) { /* silent */ }
  }

  async recordAton(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO atons (mmsi, aton_type, name, lat, lon, source) VALUES ($1,$2,$3,$4,$5,$6)`,
        [mmsi, decoded.atonType ?? null, decoded.name ?? null, decoded.lat ?? null, decoded.lon ?? null, source]
      )
    } catch (err) { /* silent */ }
  }

  async recordSafety(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO safety_messages (mmsi, msg_type, text, source) VALUES ($1,$2,$3,$4)`,
        [mmsi, decoded.type, decoded.text ?? null, source]
      )
    } catch (err) { /* silent */ }
  }

  async recordBinary(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO binary_messages (mmsi, msg_type, dac, fi, source, raw_json) VALUES ($1,$2,$3,$4,$5,$6)`,
        [mmsi, decoded.type, decoded.dac ?? null, decoded.fi ?? null, source, JSON.stringify(decoded)]
      )
    } catch (err) { /* silent */ }
  }

  async recordGPS(decoded, source) {
    if (!this.enabled) return
    try {
      await this.db.query(
        `INSERT INTO gps_fix (lat, lon, altitude, sog, cog, sat_count, hdop, fix_quality, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          decoded.lat ?? null, decoded.lon ?? null,
          decoded.altitude ?? null, decoded.sog ?? null, decoded.cog ?? null,
          decoded.satCount ?? null, decoded.hdop ?? null,
          decoded.fixQuality ?? null, source
        ]
      )
    } catch (err) { /* silent */ }
  }

  async recordAck(decoded, source) {
    if (!this.enabled) return
    const mmsi = String(decoded.mmsi)
    try {
      await this.db.query(
        `INSERT INTO binary_messages (mmsi, msg_type, source, raw_json) VALUES ($1,$2,$3,$4)`,
        [mmsi, decoded.type, source, JSON.stringify(decoded)]
      )
    } catch (err) { /* silent */ }
  }

  async recordOther(decoded, source) {
    if (!this.enabled) return
    try {
      await this.db.query(
        `INSERT INTO binary_messages (mmsi, msg_type, source, raw_json) VALUES ($1,$2,$3,$4)`,
        [String(decoded.mmsi || '0'), decoded.type || 'unknown', source, JSON.stringify(decoded)]
      )
    } catch (err) { /* silent */ }
  }

  async recordConnectionLog(source, event, message) {
    if (!this.enabled) return
    try {
      await this.db.query(
        'INSERT INTO connection_log (source, event, message) VALUES ($1,$2,$3)',
        [source, event, message || null]
      )
    } catch (err) { /* silent */ }
  }

  async getStats() {
    if (!this.db) return null
    const tables = [
      'raw_nmea', 'vessel_positions', 'vessel_static', 'drone_telemetry',
      'base_stations', 'atons', 'safety_messages', 'binary_messages', 'gps_fix', 'connection_log'
    ]
    const result = {}
    for (const t of tables) {
      try {
        const { rows } = await this.db.query(`SELECT COUNT(*)::int AS cnt FROM ${t}`)
        result[t] = rows[0].cnt
      } catch { result[t] = -1 }
    }
    return result
  }
}

module.exports = { AISRecorder }
