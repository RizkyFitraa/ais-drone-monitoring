import { useState, useEffect, useRef } from 'react'

function Toggle({ on, onChange }) {
  return (
    <div onClick={()=>onChange(!on)} style={{width:36,height:18,background:on?'var(--blue)':'var(--bg4)',border:`1px solid ${on?'rgba(37,99,235,.6)':'var(--br2)'}`,position:'relative',cursor:'pointer',transition:'all .2s',flexShrink:0}}>
      <div style={{position:'absolute',top:1,left:on?16:1,width:14,height:14,background:on?'#fff':'var(--t3)',transition:'left .2s'}}/>
    </div>
  )
}

function Field({ label, value, onChange, type='text', placeholder }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      <label style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>{label}</label>
      <input type={type} value={value}
        onChange={e=>onChange(type==='number'?Number(e.target.value):e.target.value)}
        placeholder={placeholder}
        style={{padding:'7px 10px',background:'var(--bg3)',border:'1px solid var(--b1)',color:'var(--t1)',fontFamily:'DM Mono,monospace',fontSize:12,transition:'border-color .15s'}}
        onFocus={e=>e.target.style.borderColor='rgba(37,99,235,.5)'}
        onBlur={e=>e.target.style.borderColor='var(--br)'}/>
    </div>
  )
}

function SourceCard({ icon, title, badge, connected, enabled, onToggle, children }) {
  return (
    <div style={{background:'var(--bg2)',border:`1px solid ${enabled?'rgba(37,99,235,.25)':'var(--br)'}`,transition:'border-color .2s'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:'var(--bg3)',border:'1px solid var(--b1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:11,fontWeight:600,color:enabled?'var(--blue2)':'var(--t3)'}}>{icon}</span>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--t1)'}}>{title}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',marginTop:2,letterSpacing:'.5px',textTransform:'uppercase'}}>{badge}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:connected?'var(--green)':'var(--t3)'}}/>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:8,color:connected?'var(--green)':'var(--t3)',letterSpacing:'.5px'}}>{connected?'CONNECTED':'OFFLINE'}</span>
          </div>
          <Toggle on={enabled} onChange={onToggle}/>
        </div>
      </div>
      {enabled&&<div style={{padding:'0 14px 14px',borderTop:'1px solid var(--b1)',paddingTop:12}}>{children}</div>}
    </div>
  )
}

export default function SettingsPage({ onBack, connConfig, status, wsState, applyConfig, rawLines, wsRef }) {
  const [cfg,setCfg]=useState(null),[saved,setSaved]=useState(false),[ports,setPorts]=useState([]),[testing,setTesting]=useState(false),[testR,setTestR]=useState(null)
  const [paused,setPaused]=useState(false)
  const [frozenLines,setFrozenLines]=useState(null)
  const [searchTerm,setSearchTerm]=useState('')
  const [recording,setRecording]=useState(false)
  const recordedLines=useRef([])
  const prevFirstLine=useRef('')
  const [fbStatus,setFbStatus]=useState(null)
  useEffect(()=>{try{const s=localStorage.getItem('ais-status');if(s)setFbStatus(JSON.parse(s))}catch{}},[])
  const st=status?.serial?status:fbStatus||{serial:{},tcp:{},udp:{},db:{}}
  useEffect(() => {
    if (cfg) return
    try {
      const s = localStorage.getItem('ais-settings')
      if (s) {
        const p = JSON.parse(s)
        if (!Array.isArray(p.tcp)) p.tcp = [{ id:'tcp0', label:'Connection 1', ...p.tcp }]
        setCfg(p)
        return
      }
    } catch {}
    if (connConfig) {
      const p = JSON.parse(JSON.stringify(connConfig))
      if (!Array.isArray(p.tcp)) p.tcp = [{ id:'tcp0', label:'Connection 1', ...p.tcp }]
      setCfg(p)
      return
    }
    setCfg({serial:{enabled:false,port:'COM3',baudRate:38400},tcp:[{id:'tcp0',enabled:false,label:'Connection 1',host:'vps2.osi.my.id',port:6000,reconnectMs:5000,timeoutMs:15000}],udp:{enabled:false,listenPort:10110},db:{enabled:false,host:'localhost',port:5432,database:'ais_drone_monitor',user:'postgres',password:'postgres',retentionDays:30}})
  }, [cfg, connConfig])
  useEffect(()=>{
    if(!wsRef?.current)return
    const h=e=>{try{const m=JSON.parse(e.data);if(m.event==='tcpTest'){setTestR({ok:m.ok,msg:m.msg,tcpId:m.tcpId});setTesting(false)}if(m.event==='ports')setPorts(m.data)}catch{}}
    wsRef.current.addEventListener('message',h)
    return()=>wsRef.current?.removeEventListener('message',h)
  },[wsRef])
  useEffect(()=>{
    if(!recording||rawLines.length===0)return
    if(rawLines[0]!==prevFirstLine.current){
      recordedLines.current.push(rawLines[0])
      prevFirstLine.current=rawLines[0]
    }
  },[recording,rawLines])
  const patch=(s,k,v)=>{setCfg(p=>({...p,[s]:{...p[s],[k]:v}}));setSaved(false);setTestR(null)}
  const patchDb=(k,v)=>{setCfg(p=>({...p,db:{...p.db,[k]:v}}));setSaved(false);setTestR(null)}
  const patchTCP=(id,k,v)=>{setCfg(p=>({...p,tcp:p.tcp.map(t=>t.id===id?{...t,[k]:v}:t)}));setSaved(false);setTestR(null)}
  const removeTCP=id=>{setCfg(p=>({...p,tcp:p.tcp.filter(t=>t.id!==id)}));setSaved(false)}
  const addTCP=()=>{setCfg(p=>({...p,tcp:[...p.tcp,{id:'tcp'+Date.now(),enabled:false,label:'Connection '+(p.tcp.length+1),host:'',port:6000,reconnectMs:5000,timeoutMs:15000}]}));setSaved(false)}
  const save=()=>{applyConfig(cfg);localStorage.setItem('ais-settings',JSON.stringify(cfg));setSaved(true);setTimeout(()=>setSaved(false),2500)}
  const testTCP=id=>{if(wsRef?.current?.readyState===WebSocket.OPEN){applyConfig(cfg);setTesting(true);setTestR({tcpId:id});setTimeout(()=>wsRef.current?.send(JSON.stringify({cmd:'testTCP',tcpId:id})),400);setTimeout(()=>setTesting(false),13000)}else setTestR({ok:false,msg:'WebSocket not connected',tcpId:id})}
  const wsc={open:'var(--green)',connecting:'var(--amber)',closed:'var(--t3)',error:'var(--red)'}[wsState]||'var(--t3)'
  if(!cfg) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',fontFamily:'DM Mono,monospace',color:'var(--t3)'}}>Loading...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>
      {/* Header */}
      <header style={{height:44,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 14px',background:'var(--bg2)',borderBottom:'1px solid var(--b1)',gap:12}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',border:'1px solid var(--b1)',background:'transparent',color:'var(--t2)',fontFamily:'DM Mono,monospace',fontSize:10,cursor:'pointer',transition:'all .15s',borderRadius:0}}
          onMouseEnter={e=>{e.currentTarget.style.color='var(--t1)';e.currentTarget.style.borderColor='var(--br2)'}}
          onMouseLeave={e=>{e.currentTarget.style.color='var(--t2)';e.currentTarget.style.borderColor='var(--br)'}}>
          ← Dashboard
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--t1)'}}>AIS Connection Settings</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',marginTop:1,letterSpacing:'1px'}}>SERIAL · TCP · UDP · DB</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',border:'1px solid var(--b1)',fontFamily:'DM Mono,monospace',fontSize:9}}>
            <div style={{width:4,height:4,borderRadius:'50%',background:wsc}}/><span style={{color:wsc,letterSpacing:'.5px'}}>WS {wsState.toUpperCase()}</span>
          </div>
          <button onClick={save} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 14px',border:'none',background:saved?'rgba(16,185,129,.15)':'var(--blue)',color:saved?'var(--green)':'#fff',fontFamily:'var(--ff)',fontWeight:600,fontSize:12,cursor:'pointer',transition:'all .2s',borderRadius:0}}>
            {saved?'Saved':'Save & Apply'}
          </button>
        </div>
      </header>

      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 440px',overflow:'hidden'}}>
        {/* Sources */}
        <div style={{overflowY:'auto',padding:'14px 14px 14px 16px',display:'flex',flexDirection:'column',gap:8}}>
          <SourceCard icon="SER" title="dAISy AIS Receiver" badge="USB Serial" connected={st.serial?.connected} enabled={cfg.serial.enabled} onToggle={v=>patch('serial','enabled',v)}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div style={{display:'flex',flexDirection:'column',gap:5,gridColumn:'1/-1'}}>
                <label style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>Port Serial</label>
                <div style={{display:'flex',gap:6}}>
                  <input value={cfg.serial.port} onChange={e=>patch('serial','port',e.target.value)} placeholder="COM3 / /dev/ttyUSB0"
                    style={{flex:1,padding:'7px 10px',background:'var(--bg3)',border:'1px solid var(--b1)',color:'var(--t1)',fontFamily:'DM Mono,monospace',fontSize:12}}
                    onFocus={e=>e.target.style.borderColor='rgba(37,99,235,.5)'}
                    onBlur={e=>e.target.style.borderColor='var(--br)'}/>
                  <button onClick={()=>wsRef?.current?.send(JSON.stringify({cmd:'listPorts'}))}
                    style={{padding:'7px 12px',border:'1px solid var(--b2)',background:'transparent',color:'var(--blue2)',fontFamily:'DM Mono,monospace',fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}>
                    Scan
                  </button>
                </div>
                {ports.length>0&&<div style={{background:'var(--bg3)',border:'1px solid var(--b1)',overflow:'hidden'}}>
                  {ports.map(p=><div key={p.path} onClick={()=>patch('serial','port',p.path)} style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',cursor:'pointer',borderBottom:'1px solid var(--b1)',fontFamily:'DM Mono,monospace',fontSize:10,transition:'background .15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg4)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{color:'var(--blue2)'}}>{p.path}</span><span style={{color:'var(--t3)',fontSize:9}}>{p.manufacturer||'—'}</span>
                  </div>)}
                </div>}
              </div>
              <Field label="Baud Rate" type="number" value={cfg.serial.baudRate} onChange={v=>patch('serial','baudRate',v)} placeholder="38400"/>
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--t3)',padding:'6px 8px',background:'var(--bg3)',border:'1px solid var(--b1)'}}>
              Default: <span style={{color:'var(--blue2)'}}>38400</span> baud · Linux: <span style={{color:'var(--blue2)'}}>/dev/ttyUSB0</span>
            </div>
          </SourceCard>

          {cfg.tcp.map((t,i)=>(
            <SourceCard key={t.id} icon="TCP" title={t.label||`TCP ${i+1}`} badge={t.host?`${t.host}:${t.port}`:'Not configured'} connected={st.tcp?.[t.id]?.connected} enabled={t.enabled} onToggle={v=>patchTCP(t.id,'enabled',v)}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                <Field label="Label"    value={t.label}        onChange={v=>patchTCP(t.id,'label',v)}        placeholder="Connection 1"/>
                <Field label="Host / IP" value={t.host}        onChange={v=>patchTCP(t.id,'host',v)}        placeholder="vps2.osi.my.id"/>
                <Field label="Port"           type="number" value={t.port}        onChange={v=>patchTCP(t.id,'port',v)}        placeholder="6000"/>
                <Field label="Reconnect (ms)" type="number" value={t.reconnectMs} onChange={v=>patchTCP(t.id,'reconnectMs',v)} placeholder="5000"/>
                <Field label="Timeout (ms)"   type="number" value={t.timeoutMs}   onChange={v=>patchTCP(t.id,'timeoutMs',v)}   placeholder="15000"/>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                <button onClick={()=>testTCP(t.id)} disabled={testing||wsState!=='open'} style={{padding:'6px 12px',border:'1px solid',borderColor:wsState!=='open'?'var(--br)':'rgba(37,99,235,.4)',background:'transparent',color:wsState!=='open'?'var(--t3)':'var(--blue2)',fontFamily:'DM Mono,monospace',fontSize:10,cursor:wsState!=='open'?'default':'pointer',transition:'all .15s'}}>
                  {testing?'Testing...':'Test Connection'}
                </button>
                {testR&&testR.tcpId===t.id&&<div style={{flex:1,padding:'5px 8px',border:`1px solid ${testR.ok?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`,background:testR.ok?'var(--g-bg)':'var(--r-bg)',fontFamily:'DM Mono,monospace',fontSize:9,color:testR.ok?'var(--green)':'var(--red)'}}>
                  {testR.ok?'✓':'✗'} {testR.msg}
                </div>}
              </div>
              {cfg.tcp.length>1&&<button onClick={()=>removeTCP(t.id)} style={{padding:'4px 8px',border:'1px solid rgba(239,68,68,.3)',background:'transparent',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:9,cursor:'pointer',marginBottom:6}}>
                Remove
              </button>}
            </SourceCard>
          ))}
          <button onClick={addTCP} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',border:'1px dashed var(--b2)',background:'transparent',color:'var(--blue2)',fontFamily:'DM Mono,monospace',fontSize:10,cursor:'pointer',transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--bg3)';e.currentTarget.style.borderColor='rgba(37,99,235,.4)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='var(--b2)'}}>
            ＋ Add TCP Connection
          </button>

          <SourceCard icon="UDP" title="UDP AIS Listener" badge="Broadcast" connected={st.udp?.listening} enabled={cfg.udp.enabled} onToggle={v=>patch('udp','enabled',v)}>
            <div style={{marginBottom:8}}>
              <Field label="Listen Port" type="number" value={cfg.udp.listenPort} onChange={v=>patch('udp','listenPort',v)} placeholder="10110"/>
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--t3)',padding:'6px 8px',background:'var(--bg3)',border:'1px solid var(--b1)'}}>
              Listening on <span style={{color:'var(--blue2)'}}>0.0.0.0:{cfg.udp.listenPort}</span>
            </div>
          </SourceCard>

          {/* Database */}
          <SourceCard icon="DB" title="PostgreSQL Recorder" badge="Historical Data" connected={st.db?.connected} enabled={cfg.db?.enabled} onToggle={v=>patchDb('enabled',v)}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <Field label="Host"     value={cfg.db?.host||'localhost'} onChange={v=>patchDb('host',v)} placeholder="localhost"/>
              <Field label="Port"     type="number" value={cfg.db?.port||5432} onChange={v=>patchDb('port',v)} placeholder="5432"/>
              <Field label="Database" value={cfg.db?.database||'ais_drone_monitor'} onChange={v=>patchDb('database',v)} placeholder="ais_drone_monitor"/>
              <Field label="User"     value={cfg.db?.user||'postgres'} onChange={v=>patchDb('user',v)} placeholder="postgres"/>
              <Field label="Password" type="password" value={cfg.db?.password||''} onChange={v=>patchDb('password',v)} placeholder="password"/>
              <Field label="Retention (days)" type="number" value={cfg.db?.retentionDays||30} onChange={v=>patchDb('retentionDays',v)} placeholder="30"/>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderTop:'1px solid var(--b1)',marginTop:8,paddingTop:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:'var(--t1)'}}>Auto Record</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',marginTop:2,letterSpacing:'.5px'}}>
                  {st.db?.recording ? 'RECORDING' : 'PAUSED'}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:st.db?.recording?'var(--green)':'var(--t3)'}}/>
                <Toggle on={cfg.db?.recording!==false} onChange={v=>{setCfg(p=>({...p,db:{...p.db,recording:v}}));setSaved(false);setTimeout(save,50)}}/>
              </div>
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:9,color:'var(--t3)',padding:'6px 8px',background:'var(--bg3)',border:'1px solid var(--b1)'}}>
              REST API: <span style={{color:'var(--blue2)'}}>{import.meta.env.VITE_API_URL||'http://localhost:3001'}/api/stats</span>
            </div>
          </SourceCard>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {(()=>{
              const tcpRx=Object.values(st.tcp||{}).reduce((a,s)=>a+(s.rx||0),0)
              const tcpVs=Object.values(st.tcp||{}).reduce((a,s)=>a+(s.rxVessels||0),0)
              return [
                {l:'SER', rx:st.serial?.rx??0, vsl:st.serial?.rxVessels??0, c:'var(--blue2)'},
                {l:'TCP', rx:tcpRx,    vsl:tcpVs,    c:'var(--amber)'},
                {l:'UDP', rx:st.udp?.rx??0,    vsl:st.udp?.rxVessels??0,    c:'var(--green)'},
              ]
            })().map(s=>(
              <div key={s.l} style={{background:'var(--bg2)',border:'1px solid var(--b1)',padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:18,fontWeight:700,color:s.c}}>{s.rx}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',letterSpacing:'.5px',textTransform:'uppercase'}}>NMEA</div>
                <div style={{marginTop:3,fontFamily:'DM Mono,monospace',fontSize:13,fontWeight:500,color:'var(--t2)'}}>{s.vsl}</div>
                <div style={{fontFamily:'DM Mono,monospace',fontSize:7,color:'var(--t3)',letterSpacing:'.5px',textTransform:'uppercase'}}>VESSELS</div>
              </div>
            ))}
          </div>
        </div>

        {/* Raw log */}
        <div style={{background:'var(--bg)',borderLeft:'1px solid var(--b1)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',borderBottom:'1px solid var(--b1)',flexShrink:0,flexWrap:'wrap'}}>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--blue2)',letterSpacing:'1px',textTransform:'uppercase',flexShrink:0}}>Raw NMEA</span>
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Filter..."
              style={{flex:'1 1 100px',minWidth:60,padding:'3px 6px',background:'var(--bg3)',border:'1px solid var(--b1)',color:'var(--t1)',fontFamily:'DM Mono,monospace',fontSize:9,outline:'none'}}
              onFocus={e=>e.target.style.borderColor='rgba(37,99,235,.5)'}
              onBlur={e=>e.target.style.borderColor='var(--b1)'}/>
            <button onClick={()=>{if(paused){setFrozenLines(null)}else{setFrozenLines([...rawLines])};setPaused(!paused)}}
              style={{padding:'3px 7px',border:'1px solid var(--b1)',background:paused?'rgba(239,68,68,.15)':'transparent',color:paused?'var(--red)':'var(--t2)',fontFamily:'DM Mono,monospace',fontSize:10,cursor:'pointer',whiteSpace:'nowrap',lineHeight:1.3}}>
              {paused?'▶ Resume':'⏸ Pause'}
            </button>
            <button onClick={()=>{
              if(recording){
                const blob=new Blob([recordedLines.current.join('\n')],{type:'text/plain'})
                const a=document.createElement('a')
                a.href=URL.createObjectURL(blob)
                a.download=`nmea-log-${Date.now()}.nmea`
                a.click()
                recordedLines.current=[]
              }else{
                recordedLines.current=[]
                prevFirstLine.current=rawLines[0]||''
              }
              setRecording(!recording)
            }} style={{padding:'3px 7px',border:'1px solid var(--b1)',background:recording?'rgba(239,68,68,.15)':'transparent',color:recording?'var(--red)':'var(--t2)',fontFamily:'DM Mono,monospace',fontSize:10,cursor:'pointer',whiteSpace:'nowrap',lineHeight:1.3}}>
              {recording?'⏹ Stop':'⏺ Record'}
            </button>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:8,color:'var(--t3)',flexShrink:0}}>{paused?frozenLines?.length:rawLines.length}</span>
          </div>
          <div ref={el=>{if(el&&!paused)el.scrollTop=0}} style={{flex:1,overflowY:'auto',padding:'8px 12px',fontFamily:'DM Mono,monospace',fontSize:9,lineHeight:1.9}}>
            {(()=>{
              const lines=paused?(frozenLines||[]):rawLines
              const filtered=searchTerm?lines.filter(l=>l.toLowerCase().includes(searchTerm.toLowerCase())):lines
              return filtered.length===0
                ?<div style={{color:'var(--t3)',marginTop:8}}>{searchTerm?'No match...':'Waiting for data...'}</div>
                :filtered.map((l,i)=>{
                  const src=l.match(/^\[(\w+)\]/)?.[1]||'?'
                  const c={serial:'var(--blue2)',tcp:'var(--amber)',udp:'var(--green)'}[src]||'var(--t3)'
                  const rest=l.replace(/^\[\w+\]\s*/,'')
                  const ts=rest.slice(0,8)
                  const sentence=rest.slice(9)
                  return <div key={i} style={{whiteSpace:'pre-wrap',wordBreak:'break-all',marginBottom:2}}>
                    <span style={{color:c,marginRight:3}}>[{src}]</span>
                    <span style={{color:'#000',marginRight:5}}>{ts}</span>
                    <span style={{color:'var(--t3)'}}>{sentence}</span>
                  </div>
                })
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
