'use strict'

function checksumOk(sentence) {
  const m = sentence.match(/^\$(.+)\*([0-9A-F]{2})$/i)
  if (!m) return false
  let cs = 0
  for (let i = 0; i < m[1].length; i++) cs ^= m[1].charCodeAt(i)
  return cs === parseInt(m[2], 16)
}

function parseLatLon(raw, dir) {
  if (!raw) return null
  const dot = raw.indexOf('.')
  if (dot < 3) return null
  const deg = parseInt(raw.slice(0, dot - 2), 10)
  const min = parseFloat(raw.slice(dot - 2))
  if (isNaN(deg) || isNaN(min)) return null
  let val = deg + min / 60
  if (dir === 'S' || dir === 'W') val = -val
  return val
}

function parseGGA(sentence) {
  const p = sentence.split(',')
  if (p.length < 14 || !p[0].match(/^\$G[NP]GGA$/)) return null
  const lat = parseLatLon(p[2], p[3])
  const lon = parseLatLon(p[4], p[5])
  const altRaw = p[9] ? parseFloat(p[9]) : NaN
  return {
    type: 'gga',
    time: p[1] || null,
    lat,
    lon,
    fixQuality: p[6] ? parseInt(p[6], 10) : null,
    satCount: p[7] ? parseInt(p[7], 10) : null,
    hdop: p[8] ? parseFloat(p[8]) : null,
    altitude: isNaN(altRaw) ? null : altRaw,
  }
}

function parseRMC(sentence) {
  const p = sentence.split(',')
  if (p.length < 11 || !p[0].match(/^\$G[NP]RMC$/)) return null
  const lat = parseLatLon(p[3], p[4])
  const lon = parseLatLon(p[5], p[6])
  const sog = p[7] ? parseFloat(p[7]) : null
  const cog = p[8] ? parseFloat(p[8]) : null
  return {
    type: 'rmc',
    time: p[1] || null,
    status: p[2] || null,
    lat,
    lon,
    sog: sog != null && isFinite(sog) ? sog : null,
    cog: cog != null && isFinite(cog) ? cog : null,
    date: p[9] || null,
  }
}

function parseGSA(sentence) {
  const p = sentence.split(',')
  if (p.length < 18 || !p[0].match(/^\$G[NP]SA$/)) return null
  return {
    type: 'gsa',
    mode: p[1] || null,
    fix: p[2] ? parseInt(p[2], 10) : null,
    pdop: p[15] ? parseFloat(p[15]) : null,
    hdop: p[16] ? parseFloat(p[16]) : null,
    vdop: p[17] ? parseFloat(p[17].replace(/\*[0-9A-F]{2}$/, '')) : null,
  }
}

function parseGPS(sentence) {
  const raw = sentence.trim()
  if (!raw.startsWith('$')) return null
  const talker = raw.slice(1, 3)
  if (talker !== 'GP' && talker !== 'GN' && talker !== 'GL') return null
  if (!checksumOk(raw)) return null
  const type = raw.slice(3, 6)
  switch (type) {
    case 'GGA': return parseGGA(raw)
    case 'RMC': return parseRMC(raw)
    case 'GSA': return parseGSA(raw)
    default: return null
  }
}

module.exports = { parseGPS }
