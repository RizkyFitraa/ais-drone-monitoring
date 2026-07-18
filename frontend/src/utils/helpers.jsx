export const nf = (v, d=1, u='') => v!=null&&isFinite(Number(v))?`${Number(v).toFixed(d)}${u}`:'—'
export const n0 = (v, u='')    => v!=null&&isFinite(Number(v))?`${Math.round(Number(v))}${u}`:'—'
export const ns = (v, fb='—')  => v!=null&&String(v).trim()!==''?String(v):fb
export const clamp = (v,lo,hi) => Math.min(Math.max(Number(v)||0,lo),hi)
export function headingLabel(deg) {
  const d=((deg%360)+360)%360
  return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(d/22.5)%16]
}
export function sanitizeDrone(raw={}) {
  const n=(v,d=0)=>v!=null&&isFinite(Number(v))?Number(v):d
  const s=(v,d='—')=>v!=null&&v!==''?String(v):d
  return {mmsi:s(raw.mmsi,'999000001'),callsign:s(raw.callsign,'DRONE-01'),lat:n(raw.lat,-7.187),lon:n(raw.lon,112.745),alt:n(raw.alt),sog:n(raw.sog),cog:n(raw.cog),heading:n(raw.heading),battery:n(raw.battery,80),rssi:n(raw.rssi,-60),satellites:n(raw.satellites,12),mode:s(raw.mode,'UNKNOWN'),roll:n(raw.roll),pitch:n(raw.pitch),yaw:n(raw.yaw),vertspeed:n(raw.vertspeed),throttle:n(raw.throttle,40),flighttime:s(raw.flighttime,'00:00:00'),distance:n(raw.distance),rawNMEA:raw.rawNMEA||null,ts:raw.ts??new Date().toLocaleTimeString('id-ID'),source:s(raw.source,'mock')}
}
const TYPE_MAP={classA:'Class A',classB:'Class B',classBext:'Class B',staticA:'Class A',staticB0:'Class B',staticB1:'Class B',sar:'SAR Aircraft',longRange:'Long Range',aton:'AtoN',baseStation:'Base Station'}
export function sanitizeVessel(raw={}) {
  const n=(v,d=0)=>v!=null&&isFinite(Number(v))?Number(v):d
  const s=(v,d='—')=>v!=null&&v!==''?String(v):d
  const rt=raw.type||raw.aisType||''
  return {...raw,mmsi:s(raw.mmsi,'000000000'),name:s(raw.name,`MMSI-${s(raw.mmsi,'?')}`),type:TYPE_MAP[rt]||rt||'Class B',lat:n(raw.lat),lon:n(raw.lon),sog:n(raw.sog),cog:n(raw.cog),heading:n(raw.heading),status:s(raw.status,n(raw.sog)>0.5?'Under Way':'At Anchor'),ts:raw.ts??new Date().toLocaleTimeString('id-ID'),source:s(raw.source,'tcp')}
}
const BUOY_WORDS=['BUOY','BOUY','BEACON','PELAMPUNG','SUAR']
export function isBuoy(name) {
  if (!name) return false
  const n=String(name).toUpperCase()
  return BUOY_WORDS.some(w=>n.includes(w))
}
export function resolveSource(source, tcpConns=[]) {
  if (!source) return '—'
  if (source === 'serial') return 'Serial'
  if (source === 'udp') return 'UDP'
  if (source === 'mock') return 'Demo'
  if (source.startsWith('tcp-')) {
    const id = source.slice(4)
    const t = tcpConns.find(c => c.id === id)
    return t ? `${t.label || id} (TCP)` : `TCP ${id}`
  }
  return source
}
export function sanitizeGPS(raw={}) {
  const n=(v,d=null)=>v!=null&&isFinite(Number(v))?Number(v):d
  return {
    lat:     n(raw.lat),
    lon:     n(raw.lon),
    altitude: n(raw.altitude),
    sog:     raw.sog!=null&&isFinite(raw.sog)?+(raw.sog*0.514444).toFixed(2):null,
    cog:     n(raw.cog),
    satCount: raw.satCount||null,
    hdop:    n(raw.hdop),
    fixQuality: raw.fixQuality!=null?raw.fixQuality:null,
    ts:      raw.ts||Date.now(),
  }
}
export function sanitizeSAR(raw={}) {
  const n=(v,d=0)=>v!=null&&isFinite(Number(v))?Number(v):d
  const s=(v,d='—')=>v!=null&&v!==''?String(v):d
  return {mmsi:s(raw.mmsi,'000000000'),name:s(raw.name,`SAR-${s(raw.mmsi,'????').slice(-4)}`),type:'SAR Aircraft',lat:n(raw.lat),lon:n(raw.lon),alt:raw.alt!=null?n(raw.alt):null,sog:n(raw.sog),cog:n(raw.cog),status:'Airborne',rawNMEA:raw.rawNMEA||null,ts:raw.ts??new Date().toLocaleTimeString('id-ID'),source:s(raw.source,'tcp')}
}
