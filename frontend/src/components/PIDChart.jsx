import { useEffect, useRef, useState } from 'react'
const MAX = 120
const COLORS = { roll:'#f59e0b', pitch:'#3b82f6', yaw:'#10b981' }

function Chart({ label, data, color, yMin=-30, yMax=30, unit='°' }) {
  const cvRef = useRef(null)
  const W=308, H=72
  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return
    const ctx=cv.getContext('2d'); ctx.clearRect(0,0,W,H)
    // bg
    ctx.fillStyle='rgba(255,255,255,.02)'; ctx.fillRect(0,0,W,H)
    // zero
    const zy=H-((0-yMin)/(yMax-yMin))*H
    ctx.strokeStyle='rgba(255,255,255,.07)'; ctx.lineWidth=1; ctx.setLineDash([3,3])
    ctx.beginPath(); ctx.moveTo(0,zy); ctx.lineTo(W,zy); ctx.stroke(); ctx.setLineDash([])
    if(data.length<2) return
    // fill
    const grad=ctx.createLinearGradient(0,0,0,H)
    grad.addColorStop(0,color+'28'); grad.addColorStop(1,color+'00')
    ctx.beginPath()
    data.forEach((v,i)=>{
      const x=(i/(MAX-1))*W, y=H-((v-yMin)/(yMax-yMin))*H
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
    })
    const lx=((data.length-1)/(MAX-1))*W
    ctx.lineTo(lx,H); ctx.lineTo(0,H); ctx.closePath()
    ctx.fillStyle=grad; ctx.fill()
    // line
    ctx.strokeStyle=color; ctx.lineWidth=1.4; ctx.lineJoin='round'; ctx.setLineDash([])
    ctx.beginPath()
    data.forEach((v,i)=>{
      const x=(i/(MAX-1))*W, y=H-((v-yMin)/(yMax-yMin))*H
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
    })
    ctx.stroke()
    // dot
    if(data.length>0){
      const lv=data[data.length-1]
      const x=((data.length-1)/(MAX-1))*W, y=H-((lv-yMin)/(yMax-yMin))*H
      ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fillStyle=color; ctx.fill()
    }
  },[data,color,yMin,yMax])
  const latest=data.length>0?data[data.length-1]:null
  const prev=data.length>1?data[data.length-2]:null
  const delta=latest!=null&&prev!=null?latest-prev:null
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:12,height:2,background:color}}/>
          <span style={{fontFamily:'poppins',fontSize:8,color:'var(--t2)',letterSpacing:'1px',textTransform:'uppercase'}}>{label}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {delta!=null&&<span style={{fontFamily:'poppins',fontSize:8,color:delta>0?'#ef4444':delta<0?'#3b82f6':'var(--t3)'}}>{delta>0?'+':''}{delta.toFixed(1)}{unit}</span>}
          <span style={{fontFamily:'poppins',fontSize:12,fontWeight:500,color}}>{latest!=null?`${latest.toFixed(1)}${unit}`:'—'}</span>
        </div>
      </div>
      <div style={{position:'relative',border:'1px solid var(--b1)',overflow:'hidden'}}>
        <canvas ref={cvRef} width={W} height={H} style={{display:'block',width:'100%',height:`${H}px`}}/>
        <div style={{position:'absolute',left:3,top:2,fontFamily:'poppins',fontSize:7,color:'var(--t3)',lineHeight:1}}>{yMax}{unit}</div>
        <div style={{position:'absolute',left:3,bottom:2,fontFamily:'poppins',fontSize:7,color:'var(--t3)',lineHeight:1}}>{yMin}{unit}</div>
      </div>
    </div>
  )
}

export default function PIDChart({ drone }) {
  const [hist,setHist]=useState({roll:[],pitch:[],yaw:[]})
  const [paused,setPaused]=useState(false)
  useEffect(()=>{
    if(!drone||paused) return
    setHist(h=>({
      roll:  [...h.roll.slice(-(MAX-1)),  Number(drone.roll)||0],
      pitch: [...h.pitch.slice(-(MAX-1)), Number(drone.pitch)||0],
      yaw:   [...h.yaw.slice(-(MAX-1)),   Number(drone.yaw)||0],
    }))
  },[drone?.roll,drone?.pitch,drone?.yaw,paused])

  const stats=arr=>{
    if(!arr.length) return{min:'—',max:'—',avg:'—',std:'—'}
    const min=Math.min(...arr),max=Math.max(...arr)
    const avg=arr.reduce((a,b)=>a+b,0)/arr.length
    const std=Math.sqrt(arr.reduce((a,b)=>a+(b-avg)**2,0)/arr.length)
    return{min:min.toFixed(1),max:max.toFixed(1),avg:avg.toFixed(1),std:std.toFixed(2)}
  }
  const rs=stats(hist.roll), ps=stats(hist.pitch), ys=stats(hist.yaw)

  return (
    <div style={{padding:12}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--a2)" strokeWidth="2" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span style={{fontFamily:'poppins',fontSize:8,color:'var(--a2)',letterSpacing:'1.5px',textTransform:'uppercase'}}>Attitude History — PID Analysis</span>
        </div>
        <div style={{display:'flex',gap:5}}>
          <button onClick={()=>setPaused(p=>!p)} style={{padding:'2px 8px',border:'1px solid',borderColor:paused?'rgba(245,158,11,.4)':'var(--b1)',background:paused?'var(--y-bg)':'transparent',color:paused?'var(--y)':'var(--t3)',fontFamily:'poppins',fontSize:8,cursor:'pointer',borderRadius:2,transition:'all .15s'}}>
            {paused?'RESUME':'PAUSE'}
          </button>
          <button onClick={()=>setHist({roll:[],pitch:[],yaw:[]})} style={{padding:'2px 8px',border:'1px solid var(--b1)',background:'transparent',color:'var(--t3)',fontFamily:'poppins',fontSize:8,cursor:'pointer',borderRadius:2}}>
            CLEAR
          </button>
        </div>
      </div>

      <Chart label="Roll"  data={hist.roll}  color={COLORS.roll}  yMin={-10} yMax={10}/>
      <Chart label="Pitch" data={hist.pitch} color={COLORS.pitch} yMin={-10} yMax={10}/>
      <Chart label="Yaw"   data={hist.yaw}   color={COLORS.yaw}   yMin={0}   yMax={360} unit="°"/>

      {/* Stats */}
      <div style={{background:'var(--s2)',border:'1px solid var(--b1)',padding:'9px 10px',marginTop:4}}>
        <div style={{fontFamily:'poppins',fontSize:7,color:'var(--t3)',letterSpacing:'1px',marginBottom:7,textTransform:'uppercase'}}>Statistics ({hist.roll.length} samples)</div>
        <div style={{display:'grid',gridTemplateColumns:'50px repeat(4,1fr)',gap:3,alignItems:'center'}}>
          {['','MIN','MAX','AVG','STD'].map((h,i)=>(
            <div key={i} style={{fontFamily:'poppins',fontSize:7,color:'var(--t3)',textAlign:i>0?'center':'left',paddingBottom:5,borderBottom:'1px solid var(--b1)'}}>{h}</div>
          ))}
          {[['Roll',COLORS.roll,rs],['Pitch',COLORS.pitch,ps],['Yaw',COLORS.yaw,ys]].map(([l,c,s])=>(
            <>{[
              <div key={l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:5,height:5,borderRadius:'50%',background:c}}/><span style={{fontFamily:'poppins',fontSize:8,color:'var(--t2)'}}>{l}</span></div>,
              ...([s.min,s.max,s.avg,s.std].map((v,i)=>(
                <div key={i} style={{fontFamily:'poppins',fontSize:9,color:c,textAlign:'center',fontWeight:500}}>{v}</div>
              )))
            ]}</>
          ))}
        </div>
      </div>

      {/* PID hint */}
      <div style={{marginTop:7,padding:'7px 9px',background:'rgba(37,99,235,.04)',border:'1px solid rgba(37,99,235,.1)'}}>
        <div style={{fontFamily:'poppins',fontSize:8,color:'var(--t3)',lineHeight:1.7}}>
          <span style={{color:'var(--a2)'}}>STD</span> tinggi = osilasi PID &nbsp;·&nbsp;
          <span style={{color:'var(--y)'}}>Roll STD {'>'}2°</span> = P terlalu tinggi &nbsp;·&nbsp;
          <span style={{color:'var(--g)'}}>Nominal: STD &lt;1.5°</span>
        </div>
      </div>
    </div>
  )
}
