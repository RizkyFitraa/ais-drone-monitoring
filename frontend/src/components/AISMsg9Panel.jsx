import { useState } from 'react'
import { nf, ns } from '../utils/helpers.jsx'

const fmtTs=ts=>{if(!ts&&ts!==0)return '—';if(typeof ts==='number')return new Date(ts).toLocaleTimeString('id-ID');const n=Number(ts);if(!isNaN(n)&&n>1e12)return new Date(n).toLocaleTimeString('id-ID');return String(ts)}

export default function AISMsg9Panel({vessels=[]}){
  const sar = vessels.filter(v => v.type === 'SAR Aircraft')
  const [idx, setIdx] = useState(0)
  const cur = sar[idx] || null
  const c = 'var(--coral)'

  if (sar.length === 0) return (
    <div style={{padding:24,textAlign:'center',fontFamily:'var(--fm)',fontSize:10,color:'var(--t3)'}}>
      No SAR Aircraft data
    </div>
  )

  return (
    <div style={{padding:14}}>
      {/* ── SAR selector ── */}
      <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
        {sar.map((v,i)=>(
          <button key={v.mmsi} onClick={()=>setIdx(i)} style={{
            padding:'5px 10px',border:'1px solid',borderRadius:7,
            borderColor:i===idx?c:'var(--br)',
            background:i===idx?`${c}15`:'var(--bg)',
            color:i===idx?c:'var(--t2)',
            fontFamily:'var(--fm)',fontSize:8.5,cursor:'pointer',
            transition:'all .13s',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200,
          }}>{v.name}</button>
        ))}
      </div>

      {cur && <>
        {/* ── Raw NMEA box ── */}
        <div style={{background:`${c}10`,border:`1px solid ${c}30`,borderRadius:10,padding:'12px 14px',marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontFamily:'var(--fm)',fontSize:8,color:c,letterSpacing:'1.2px',textTransform:'uppercase'}}>Raw NMEA — MSG 9 Output</span>
            <span style={{fontFamily:'var(--fm)',fontSize:7.5,color:'var(--t3)'}}>{fmtTs(cur.ts)}</span>
          </div>
          <div style={{fontFamily:'var(--fm)',fontSize:10,color:'var(--t2)',wordBreak:'break-all',lineHeight:2,marginBottom:6}}>
            {cur.rawNMEA||'— No data —'}
          </div>
          <div style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)'}}>
            MMSI: <span style={{color:c}}>{ns(cur.mmsi)}</span> · Type 9 · SAR Position Report
          </div>
        </div>

        {/* ── Decoded Fields ── */}
        <div style={{background:'var(--bg)',border:'1px solid var(--br)',borderRadius:10,overflow:'hidden'}}>
          <div style={{fontFamily:'var(--fm)',fontSize:8,color:'var(--t3)',letterSpacing:'1px',
            textTransform:'uppercase',padding:'8px 12px',background:'var(--bg3)',
            borderBottom:'1px solid var(--br)'}}>Decoded Fields</div>
          {[
            ['MMSI',         ns(cur.mmsi)],
            ['Name',         ns(cur.name)],
            ['Message Type', '9 — SAR Position Report'],
            ['Latitude',     nf(cur.lat,5,'°')],
            ['Longitude',    nf(cur.lon,5,'°')],
            ['Altitude',     cur.alt!=null?Math.round(cur.alt)+' m':'—'],
            ['SOG',          nf(cur.sog,1,' kn')],
            ['COG',          nf(cur.cog,0,'°')],
            ['Status',       cur.status||'Airborne'],
            ['Updated',      fmtTs(cur.ts)],
          ].map(([k,v])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'6px 12px',borderBottom:'1px solid var(--br)'}}>
              <span style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)'}}>{k}</span>
              <span style={{fontFamily:'var(--fm)',fontSize:10,color:k==='Updated'?'var(--t1)':c,fontWeight:500}}>{v}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}