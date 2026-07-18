
import { nf, n0, ns } from '../utils/helpers.jsx'

const fmtTs=ts=>{if(!ts&&ts!==0)return '—';if(typeof ts==='number')return new Date(ts).toLocaleTimeString('id-ID');const n=Number(ts);if(!isNaN(n)&&n>1e12)return new Date(n).toLocaleTimeString('id-ID');return String(ts)}

export default function AISMsg8Panel({drone={}}){
  drone = drone || {}
  const raw=drone.rawNMEA||'— No data —'
  const fields=[
    ['Message Type', '8 — Binary Broadcast'],
    ['MMSI',         ns(drone.mmsi)],
    ['DAC',          '366'],
    ['FI',           '56'],
    ['Latitude',     nf(drone.lat,     5, '°')],
    ['Longitude',    nf(drone.lon,     5, '°')],
    ['Altitude',     nf(drone.alt,     1, ' m')],
    ['SOG',          nf(drone.sog,     1, ' kn')],
    ['Heading',      nf(drone.heading, 1, '°')],
    ['Battery',      n0(drone.battery,    ' raw')],
    ['Satellites',   ns(drone.satellites)],
    ['Mode',         ns(drone.mode)],
    ['Roll',         nf(drone.roll,    2, '°')],
    ['Pitch',        nf(drone.pitch,   2, '°')],
    ['Yaw',          nf(drone.yaw,     1, '°')],
    ['Updated',      fmtTs(drone.ts)],
  ]

  return (
    <div style={{padding:14}}>
      <div style={{background:'var(--blue-bg)',border:'1px solid var(--blue-br)',borderRadius:10,padding:'12px 14px',marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <span style={{fontFamily:'var(--fm)',fontSize:8,color:'var(--blue2)',letterSpacing:'1.2px',textTransform:'uppercase'}}>Raw NMEA — MSG 8 Output</span>
          <span style={{fontFamily:'var(--fm)',fontSize:7.5,color:'var(--t3)'}}>{fmtTs(drone.ts)}</span>
        </div>
        <div style={{fontFamily:'var(--fm)',fontSize:10,color:'var(--t2)',wordBreak:'break-all',lineHeight:2,marginBottom:6}}>
          {raw}
        </div>
        <div style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)'}}>
          MMSI: <span style={{color:'var(--blue2)'}}>{ns(drone.mmsi)}</span> · Type 8 · DAC:366 FI:56
        </div>
      </div>

      <div style={{background:'var(--bg)',border:'1px solid var(--br)',borderRadius:10,overflow:'hidden'}}>
        <div style={{fontFamily:'var(--fm)',fontSize:8,color:'var(--t3)',letterSpacing:'1px',
          textTransform:'uppercase',padding:'8px 12px',background:'var(--bg3)',
          borderBottom:'1px solid var(--br)'}}>Decoded Fields</div>
        {fields.map(([k,v])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
            padding:'6px 12px',borderBottom:'1px solid var(--br)'}}>
            <span style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)'}}>{k}</span>
            <span style={{fontFamily:'var(--fm)',fontSize:10,color:k==='Updated'?'var(--t1)':'var(--blue2)',fontWeight:500}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}