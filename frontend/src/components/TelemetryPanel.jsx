
import { nf, n0, ns } from '../utils/helpers.jsx'

function Label({c}){ return <div style={{fontFamily:'poppins',fontSize:8,color:'var(--t3)',letterSpacing:'.8px',textTransform:'uppercase',marginBottom:3}}>{c}</div> }

function Cell({label,value,color='var(--blue2)'}){
  return (
    <div style={{background:'var(--bg)',border:'1px solid var(--br)',borderRadius:8,padding:'9px 10px',transition:'border-color .15s'}}>
      <Label c={label}/>
      <div style={{fontFamily:'poppins',fontSize:14,fontWeight:500,color}}>{value}</div>
    </div>
  )
}

function AttBar({label,value,min=-45,max=45,color='var(--amber)'}){
  const v=isFinite(value)?Number(value):0
  const pct=Math.min(100,Math.max(0,((v-min)/(max-min))*100))
  const warn=Math.abs(v)>Math.abs(max)*.7
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
      <span style={{fontFamily:'poppins',fontSize:8,color:'var(--t3)',width:28,flexShrink:0,textTransform:'uppercase'}}>{label}</span>
      <div style={{flex:1,height:3,background:'var(--bg4)',borderRadius:2,overflow:'hidden',position:'relative'}}>
        {/* Center marker */}
        <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'rgba(0,0,0,.15)'}}/>
        <div style={{position:'absolute',left:`${Math.min(pct,50)}%`,width:`${Math.abs(pct-50)}%`,height:'100%',
          background:warn?'var(--red)':color,borderRadius:2,transition:'all .5s ease'}}/>
      </div>
      <span style={{fontFamily:'poppins',fontSize:10,color:warn?'var(--red)':color,minWidth:40,textAlign:'right',fontWeight:warn?600:400}}>{nf(v,1)}°</span>
    </div>
  )
}

export default function TelemetryPanel({drone}={}){
  const d=drone||{}
  const bat=isFinite(d.battery)?Number(d.battery):0
  const bc=bat>50?'var(--green)':bat>25?'var(--amber)':'var(--red)'
  return (
    <div style={{padding:14}}>
      <div style={{fontFamily:'poppins',fontSize:8,color:'var(--blue2)',letterSpacing:'1.2px',
        textTransform:'uppercase',marginBottom:12}}>Drone Telemetry — AIS MSG 8</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:10}}>
        <Cell label="Altitude"   value={nf(d.alt,1,' m')}/>
        <Cell label="Speed"      value={nf(d.sog,1,' m/s')}/>
        <Cell label="Heading"    value={n0(d.heading,'°')}/>
        <Cell label="Vert Spd"   value={nf(d.vertspeed,1,' m/s')} color="var(--teal)"/>
        <Cell label="Battery"    value={n0(d.battery,'%')} color={bc}/>
        <Cell label="Throttle"   value={n0(d.throttle,'%')} color="var(--t2)"/>
        <Cell label="RSSI"       value={n0(d.rssi,' dBm')} color="var(--t1)"/>
        <Cell label="Satellites" value={n0(d.satellites,' sat')} color="var(--green)"/>
      </div>

      {/* Battery bar */}
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
          <Label c="Battery Level"/>
          <span style={{fontFamily:'poppins',fontSize:10,color:bc,fontWeight:500}}>{n0(bat)}%</span>
        </div>
        <div style={{height:6,background:'var(--bg4)',borderRadius:3,overflow:'hidden'}}>
          <div style={{width:`${Math.min(100,bat)}%`,height:'100%',background:bc,
            borderRadius:3,transition:'width 1s ease, background .5s'}}/>
        </div>
      </div>

      {/* Attitude */}
      <div style={{background:'var(--bg)',border:'1px solid var(--br)',borderRadius:10,padding:'11px 12px',marginBottom:10}}>
        <Label c="Attitude"/>
        <div style={{marginTop:6}}>
          <AttBar label="Roll"  value={d.roll}  min={-45} max={45}/>
          <AttBar label="Pitch" value={d.pitch} min={-45} max={45} color="var(--blue2)"/>
          <AttBar label="Yaw"   value={d.yaw}   min={0}   max={360} color="var(--teal)"/>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:7}}>
        {[{l:'Mode',v:ns(d.mode),c:'var(--green)'},
          {l:'Dist', v:`${n0(d.distance)}m`,c:'var(--t1)'}].map(i=>(
          <div key={i.l} style={{background:'var(--bg)',border:'1px solid var(--br)',
            borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
            <Label c={i.l}/>
            <div style={{fontFamily:'poppins',fontSize:11,fontWeight:500,color:i.c}}>{i.v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
