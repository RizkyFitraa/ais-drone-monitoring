
import { clamp, nf, headingLabel } from '../utils/helpers.jsx'

function ADI({ roll=0, pitch=0 }) {
  const r=clamp(roll,-90,90), p=clamp(pitch,-30,30), ps=p*3
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7}}>
      <svg width="158" height="158" viewBox="0 0 158 158" style={{borderRadius:'50%',filter:'drop-shadow(0 2px 6px rgba(0,0,0,.6))'}}>
        <defs>
          <clipPath id="ac"><circle cx="79" cy="79" r="73"/></clipPath>
          <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c2340"/><stop offset="100%" stopColor="#0a1a30"/></linearGradient>
          <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d200a"/><stop offset="100%" stopColor="#1e0e03"/></linearGradient>
        </defs>
        <g clipPath="url(#ac)" transform={`rotate(${r},79,79)`}>
          <rect x="-10" y={-10-ps} width="178" height={99+ps} fill="url(#sk)"/>
          <rect x="-10" y={79-ps}  width="178" height={99+ps} fill="url(#gd)"/>
          <line x1="-10" y1={79-ps} x2="168" y2={79-ps} stroke="rgba(255,255,255,.7)" strokeWidth="1.5"/>
          {[-20,-10,10,20].map(d=>{
            const y=79-ps-d*3, w=Math.abs(d)%10===0?32:18
            return <g key={d}>
              <line x1={79-w} y1={y} x2={79+w} y2={y} stroke="rgba(255,255,255,.4)" strokeWidth="1"/>
              {Math.abs(d)%10===0&&<text x={79-w-5} y={y+4} textAnchor="end" fill="rgba(255,255,255,.5)" fontSize="7" fontFamily="DM Mono">{d}</text>}
            </g>
          })}
        </g>
        {[-60,-45,-30,-20,-10,0,10,20,30,45,60].map(d=>{
          const rad=(d-90)*Math.PI/180, r1=70,r2=Math.abs(d)%30===0?61:67
          return <line key={d} x1={79+r1*Math.cos(rad)} y1={79+r1*Math.sin(rad)} x2={79+r2*Math.cos(rad)} y2={79+r2*Math.sin(rad)} stroke="rgba(255,255,255,.35)" strokeWidth={Math.abs(d)%30===0?1.5:1}/>
        })}
        <g transform={`rotate(${r},79,79)`}><polygon points="79,7 76.5,15 81.5,15" fill="var(--a2)" opacity=".9"/></g>
        <g transform="translate(79,79)">
          <rect x="-28" y="-2" width="18" height="4" rx="1.5" fill="var(--a2)"/>
          <rect x="10"  y="-2" width="18" height="4" rx="1.5" fill="var(--a2)"/>
          <rect x="-3"  y="-10" width="6" height="20" rx="3" fill="var(--a2)"/>
          <circle r="3" fill="var(--a2)"/>
        </g>
        <circle cx="79" cy="79" r="73" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5"/>
        <text x="79" y="152" textAnchor="middle" fill="var(--t3)" fontSize="7.5" fontFamily="DM Mono">ADI</text>
      </svg>
      <div style={{display:'flex',gap:16}}>
        {[['ROLL',r,Math.abs(r)>30],['PITCH',p,Math.abs(p)>20]].map(([k,v,w])=>(
          <div key={k} style={{textAlign:'center'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:7,color:'var(--t3)',letterSpacing:'1px',marginBottom:2}}>{k}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:500,color:w?'var(--r)':'var(--a2)'}}>{nf(v,1)}°</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HSI({ heading=0, cog=0 }) {
  const h=((heading%360)+360)%360
  const CARDS=[['N',0],['NE',45],['E',90],['SE',135],['S',180],['SW',225],['W',270],['NW',315]]
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7}}>
      <svg width="158" height="158" viewBox="0 0 158 158" style={{borderRadius:'50%',filter:'drop-shadow(0 2px 6px rgba(0,0,0,.6))'}}>
        <defs><radialGradient id="hg" cx="50%" cy="50%"><stop offset="0%" stopColor="#12182a"/><stop offset="100%" stopColor="#080a10"/></radialGradient></defs>
        <circle cx="79" cy="79" r="77" fill="url(#hg)"/>
        <g transform={`rotate(${-h},79,79)`}>
          {Array.from({length:72},(_,i)=>{
            const d=i*5,rad=(d-90)*Math.PI/180,iM=d%30===0,iMd=d%10===0
            const r1=73,r2=iM?60:iMd?65:70
            return <line key={d} x1={79+r1*Math.cos(rad)} y1={79+r1*Math.sin(rad)} x2={79+r2*Math.cos(rad)} y2={79+r2*Math.sin(rad)} stroke={iM?'rgba(255,255,255,.6)':'rgba(255,255,255,.2)'} strokeWidth={iM?1.5:1}/>
          })}
          {CARDS.map(([l,d])=>{
            const rad=(d-90)*Math.PI/180, r=l.length===1?50:52
            return <text key={l} x={79+r*Math.cos(rad)} y={79+r*Math.sin(rad)+4} textAnchor="middle"
              fill={l==='N'?'#ef4444':l==='S'?'var(--a2)':'rgba(255,255,255,.65)'}
              fontSize={l.length===1?10:7.5} fontFamily="DM Mono" fontWeight={l==='N'||l==='S'?'600':'400'}>{l}</text>
          })}
        </g>
        {(()=>{const rad=(cog-90)*Math.PI/180;return <line x1="79" y1="79" x2={79+66*Math.cos(rad)} y2={79+66*Math.sin(rad)} stroke="var(--y)" strokeWidth="1.5" strokeDasharray="4,3" opacity=".7"/>})()}
        <polygon points="79,5 76,16 82,16" fill="var(--a2)" opacity=".9"/>
        <circle cx="79" cy="79" r="5" fill="none" stroke="var(--a2)" strokeWidth="1.8"/>
        <line x1="79" y1="74" x2="79" y2="67" stroke="var(--a2)" strokeWidth="1.8"/>
        <line x1="73" y1="79" x2="85" y2="79" stroke="var(--a2)" strokeWidth="1.8"/>
        <rect x="63" y="100" width="32" height="14" rx="2" fill="rgba(0,0,0,.6)"/>
        <text x="79" y="111" textAnchor="middle" fill="var(--a2)" fontSize="10" fontFamily="DM Mono" fontWeight="600">{String(Math.round(h)).padStart(3,'0')}°</text>
        <circle cx="79" cy="79" r="77" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5"/>
        <text x="79" y="152" textAnchor="middle" fill="var(--t3)" fontSize="7.5" fontFamily="DM Mono">HSI</text>
      </svg>
      <div style={{display:'flex',gap:16}}>
        {[['HDG',`${String(Math.round(h)).padStart(3,'0')}° ${headingLabel(h)}`,'var(--a2)'],['COG',`${String(Math.round(cog)).padStart(3,'0')}°`,'var(--y)']].map(([k,v,c])=>(
          <div key={k} style={{textAlign:'center'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:7,color:'var(--t3)',letterSpacing:'1px',marginBottom:2}}>{k}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:12,fontWeight:500,color:c}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TurnCoord({ roll=0, vertspeed=0 }) {
  const r=clamp(roll,-60,60)
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{borderRadius:'50%',filter:'drop-shadow(0 1px 4px rgba(0,0,0,.5))'}}>
        <defs><radialGradient id="tg" cx="50%" cy="50%"><stop offset="0%" stopColor="#12182a"/><stop offset="100%" stopColor="#080a10"/></radialGradient></defs>
        <circle cx="55" cy="55" r="53" fill="url(#tg)"/>
        {[-60,-30,-20,-10,0,10,20,30,60].map(d=>{
          const rad=(d-90)*Math.PI/180,maj=Math.abs(d)%30===0,r1=49,r2=maj?41:46
          return <line key={d} x1={55+r1*Math.cos(rad)} y1={55+r1*Math.sin(rad)} x2={55+r2*Math.cos(rad)} y2={55+r2*Math.sin(rad)} stroke="rgba(255,255,255,.4)" strokeWidth={maj?1.5:1}/>
        })}
        <g transform={`rotate(${r},55,55)`}>
          <rect x="23" y="53" width="14" height="4" rx="2" fill="var(--a2)"/>
          <rect x="73" y="53" width="14" height="4" rx="2" fill="var(--a2)"/>
          <rect x="52" y="42" width="6" height="18" rx="3" fill="var(--a2)"/>
          <circle cx="55" cy="55" r="4" fill="var(--a2)"/>
        </g>
        <line x1="26" y1="89" x2="84" y2="89" stroke="rgba(255,255,255,.15)" strokeWidth="1"/>
        <circle cx={55+clamp(roll*.3,-24,24)} cy="89" r="5" fill="var(--y)" opacity=".85"/>
        <circle cx="55" cy="55" r="53" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5"/>
        <text x="55" y="107" textAnchor="middle" fill="var(--t3)" fontSize="7" fontFamily="DM Mono">TC</text>
      </svg>
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:'DM Mono,monospace',fontSize:7,color:'var(--t3)',letterSpacing:'1px',marginBottom:2}}>VSPD</div>
        <div style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:500,color:Math.abs(vertspeed)>1?'var(--y)':'var(--g)'}}>{vertspeed>0?'+':''}{nf(vertspeed,1)} m/s</div>
      </div>
    </div>
  )
}

function DirBadge({ heading=0 }) {
  const deg=((heading%360)+360)%360
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,
      padding:'9px 12px',background:'var(--s2)',border:'1px solid var(--b1)',borderRadius:2,minWidth:74}}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="24" fill="var(--s3)" stroke="var(--b2)" strokeWidth="1"/>
        {[0,90,180,270].map(d=>{const rad=(d-90)*Math.PI/180;return <circle key={d} cx={26+18*Math.cos(rad)} cy={26+18*Math.sin(rad)} r="1.8" fill={d===0?'#ef4444':d===180?'var(--a2)':'rgba(255,255,255,.25)'}/>})}
        <g transform={`rotate(${deg},26,26)`}>
          <polygon points="26,6 23.5,26 28.5,26" fill="#ef4444" opacity=".9"/>
          <polygon points="26,46 28.5,26 23.5,26" fill="rgba(255,255,255,.4)"/>
        </g>
        <circle cx="26" cy="26" r="3" fill="var(--a2)"/>
      </svg>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:17,fontWeight:700,color:'var(--a2)',letterSpacing:'1.5px',lineHeight:1}}>{headingLabel(deg)}</div>
      <div style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--t3)'}}>{String(Math.round(deg)).padStart(3,'0')}°</div>
    </div>
  )
}

export default function GyroPanel({ drone={} }) {
  drone = drone || {}
  const nv=(v,d=0)=>v!=null&&isFinite(v)?Number(v):d
  return (
    <div>
      <div style={{padding:'9px 12px 8px',borderBottom:'1px solid var(--b1)',display:'flex',alignItems:'center',gap:7}}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--a2)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
        <span style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--a2)',letterSpacing:'1.5px',textTransform:'uppercase'}}>Gyroscope & Attitude — MSG 8</span>
      </div>
      {/* Instruments */}
      <div style={{display:'flex',justifyContent:'space-around',padding:'14px 4px 8px',borderBottom:'1px solid var(--b1)',gap:4}}>
        <ADI roll={nv(drone.roll)} pitch={nv(drone.pitch)}/>
        <HSI heading={nv(drone.heading)} cog={nv(drone.cog)}/>
      </div>
      {/* Bottom row */}
      <div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',flexWrap:'wrap'}}>
        <TurnCoord roll={nv(drone.roll)} vertspeed={nv(drone.vertspeed)}/>
        <DirBadge  heading={nv(drone.heading)}/>
        {/* Numeric block */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:4,minWidth:0}}>
          {[['ALT',`${nf(drone.alt,1)}m`,'var(--a2)'],['SOG',`${nf(drone.sog,1)}m/s`,'var(--a2)'],
            ['YAW',`${nf(drone.yaw,1)}°`,'var(--y)'],
            ['ROLL',`${nf(drone.roll,1)}°`,Math.abs(nv(drone.roll))>30?'var(--r)':'var(--t1)'],
            ['PITCH',`${nf(drone.pitch,1)}°`,Math.abs(nv(drone.pitch))>20?'var(--r)':'var(--t1)'],
            ['SAT',`${nf(drone.satellites,0)}`,'var(--g)']].map(([k,v,c])=>(
            <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:'3px 8px',background:'var(--s2)',border:'1px solid var(--b1)'}}>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:7,color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>{k}</span>
              <span style={{fontFamily:'DM Mono,monospace',fontSize:10,fontWeight:500,color:c}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
