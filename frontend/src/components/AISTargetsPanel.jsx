import { useState, useRef, useEffect } from 'react'
const Poppins = "'Poppins', sans-serif"

const nf=(v,d=1,u='')=>v!=null&&isFinite(v)?`${Number(v).toFixed(d)}${u}`:'—'
const fmtTs=ts=>{if(!ts&&ts!==0)return '—';if(typeof ts==='number')return new Date(ts).toLocaleTimeString('id-ID');const n=Number(ts);if(!isNaN(n)&&n>1e12)return new Date(n).toLocaleTimeString('id-ID');return String(ts)}
const fmtRel=ts=>{if(!ts&&ts!==0)return'—';let e;if(typeof ts==='number')e=ts;else if(typeof ts==='string'){const n=Number(ts);if(!isNaN(n)&&n>1e12)e=n;else return ts}else return'—';const d=Date.now()-e;if(d<5e3)return'kini';const s=Math.floor(d/1e3);if(s<60)return s+'s';const m=Math.floor(s/60);if(m<60)return m+'m';const h=Math.floor(m/60);if(h<24)return h+'j';return Math.floor(h/24)+'h'}
const badge=v=>{if(v.type==='Class A')return'A';if(v.type==='Class B')return'B';if(v.type==='SAR Aircraft')return'SAR';if(v.type==='Long Range')return'L';if(v.type==='AtoN')return'\u2021';if(v.type==='Base Station')return'\u2363';return'?'}

const LAYER_CFG=[
  { id:'sar',         label:'SAR Aircraft',  color:'#ea580c', is:v=>v.type==='SAR Aircraft',
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>' },
  { id:'classA',      label:'Class A Running', color:'#f43f5e', is:v=>v.type==='Class A'&&Number(v.sog)>.5,
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1M4 18l-1-5h14l-1 5M11 13V6H8l4-4 4 4h-3v7"/></svg>' },
  { id:'classB',      label:'Class B Running', color:'#d97706', is:v=>v.type==='Class B'&&Number(v.sog)>.5,
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1M4 18l-1-5h14l-1 5M11 13V6H8l4-4 4 4h-3v7"/></svg>' },
  { id:'longRange',   label:'Long Range',    color:'#0d9488', is:v=>v.type==='Long Range',
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  { id:'aton',        label:'AtoN',          color:'#dc2626', is:v=>v.type==='AtoN',
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2v4M8 6a4 4 0 0 0 8 0M9 16l-1 4h8l-1-4M8 10a4 4 0 0 0 8 0"/></svg>' },
  { id:'baseStation', label:'Base Station',  color:'#7c3aed', is:v=>v.type==='Base Station',
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 20V10M9 20h6M7 13l5-4 5 4M4.93 7a10 10 0 0 1 14.14 0M7.76 9.76a6 6 0 0 1 8.49 0"/></svg>' },
  { id:'anchored',    label:'Berlabuh',      color:'#94a3b8', is:v=>v.type!=='SAR Aircraft'&&v.type!=='Long Range'&&Number(v.sog)<=.5,
    icon:p=>'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 4v16M4.93 10h14.14M4 18.5A8 8 0 0 0 12 22a8 8 0 0 0 8-3.5"/></svg>' },
]

const IcChev=({o})=><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{transform:o?'rotate(90deg)':'none',transition:'transform .18s'}}><path d="M9 18l6-6-6-6"/></svg>

function SvgIcon({html,color}){
  return <span style={{flexShrink:0,lineHeight:0,color}} dangerouslySetInnerHTML={{__html:html}}/>
}

export default function AISTargetsPanel({targets=[],onFocusVessel,visibility,onToggleLayer,tcpConns=[]}){
  const [search,setSearch]=useState('')
  const [openSet,setOpenSet]=useState(new Set())
  const [collapsed,setCollapsed]=useState(new Set())
  const [debouncedSearch,setDebouncedSearch]=useState('')
  const debounceRef=useRef(null)

  useEffect(()=>{
    if(debounceRef.current)clearTimeout(debounceRef.current)
    debounceRef.current=setTimeout(()=>setDebouncedSearch(search),200)
    return ()=>clearTimeout(debounceRef.current)
  },[search])

  function toggleOpen(mmsi){
    setOpenSet(p=>{
      const n=new Set(p)
      if(n.has(mmsi))n.delete(mmsi);else n.add(mmsi)
      return n
    })
  }

  function toggleLayer(id){
    onToggleLayer&&onToggleLayer(id)
  }

  function focusVessel(v){
    onFocusVessel&&onFocusVessel({lat:v.lat,lon:v.lon,mmsi:v.mmsi,name:v.name})
  }

  function toggleCollapse(id){
    setCollapsed(p=>{
      const n=new Set(p)
      if(n.has(id))n.delete(id);else n.add(id)
      return n
    })
  }

  const filter=(items,query)=>{
    if(!query)return items
    const q=query.toLowerCase()
    return items.filter(v=>(v.name||'').toLowerCase().includes(q)||String(v.mmsi).includes(q))
  }

  const groups=LAYER_CFG.map(cfg=>{
    let items=targets.filter(v=>cfg.is(v)&&visibility[cfg.id]!==false)
    if(debouncedSearch)items=filter(items,debouncedSearch)
    return {...cfg,items}
  }).filter(g=>g.items.length>0)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'8px 12px',borderBottom:'1px solid var(--br)',position:'relative'}}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2"
          strokeLinecap="round" style={{position:'absolute',left:20,top:'50%',transform:'translateY(-50%)'}}>
          <circle cx="10.5" cy="10.5" r="7.5"/><path d="M16.5 16.5L21 21"/></svg>
        <input placeholder="Cari nama atau MMSI\u2026" value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{width:'100%',padding:'6px 10px 6px 24px',fontSize:11,background:'var(--bg3)',
            border:'1px solid var(--br)',borderRadius:8,color:'var(--t1)',
            outline:'none',boxSizing:'border-box',fontFamily:'var(--fm)'}}/>
      </div>
      <div style={{padding:'4px 12px 6px',borderBottom:'1px solid var(--br)',display:'flex',flexWrap:'wrap',gap:4}}>
        {LAYER_CFG.map(cfg=>{
          const on=visibility[cfg.id]!==false
          const label={sar:'SAR',classA:'A',classB:'B',longRange:'LR',aton:'ATON',baseStation:'BS',anchored:'ANCH'}[cfg.id]
          return <div key={cfg.id} onClick={e=>{e.stopPropagation();toggleLayer(cfg.id)}}
            style={{display:'flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:10,
              cursor:'pointer',fontSize:8,fontWeight:600,fontFamily:'var(--fm)',
              textTransform:'uppercase',letterSpacing:'.3px',
              background:on?cfg.color+'15':'transparent',
              border:'1px solid '+(on?cfg.color+'40':'var(--br)'),
              color:on?cfg.color:'var(--t4)',transition:'all .12s'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:on?cfg.color:'var(--t4)',flexShrink:0}}/>
            {label}
          </div>
        })}
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {groups.map(g=>{
          const grpOn=visibility[g.id]!==false
          const isCollapsed=collapsed.has(g.id)
          return <div key={g.id}>
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px 6px 10px',
              background:'var(--bg2)',borderBottom:'1px solid var(--br)',
              borderLeft:'4px solid '+(grpOn?g.color:'transparent'),
              cursor:'pointer',userSelect:'none',transition:'background .12s'}}
              onClick={()=>toggleLayer(g.id)}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--bg2)'}>
              <SvgIcon html={g.icon()} color={grpOn?g.color:'var(--t3)'}/>
              <span style={{flex:1,fontWeight:600,fontSize:10,color:grpOn?'var(--t1)':'var(--t3)',
                letterSpacing:'.5px',textTransform:'uppercase',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{g.label}</span>
              <span style={{fontFamily:'var(--fm)',fontSize:8,color:grpOn?g.color:'var(--t4)',minWidth:16,textAlign:'center',
                background:grpOn?g.color+'18':'transparent',borderRadius:10,padding:'1px 7px',fontWeight:600}}>
                {g.items.length}</span>
              <div onClick={e=>{e.stopPropagation();toggleCollapse(g.id)}} style={{
                display:'flex',alignItems:'center',justifyContent:'center',
                width:16,height:16,borderRadius:4,cursor:'pointer',
                color:isCollapsed?'var(--t4)':'var(--t2)',
                transition:'transform .15s',transform:isCollapsed?'rotate(-90deg)':'none',
              }}><IcChev o={false}/></div>
              <SvgIcon html={grpOn
                ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>'
                : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>'
              } color={grpOn?'var(--t3)':'var(--amber)'}/>
            </div>
            {!isCollapsed && g.items.map(v=>{
              const c=g.color,live=v.type==='SAR Aircraft'||Number(v.sog)>.5
              const open=openSet.has(v.mmsi)
              return <div key={v.mmsi} style={{borderBottom:'1px solid var(--br)',borderLeft:'3px solid '+c,paddingLeft:9}}>
                <div onClick={()=>toggleOpen(v.mmsi)} style={{display:'flex',alignItems:'center',
                  gap:10,padding:'6px 12px 6px 7px',cursor:'pointer',transition:'background .12s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
                    background:live?'var(--green)':'var(--t4)',
                    animation:live?'livePing 2s ease-in-out infinite':'none'}}/>
                  <span style={{fontFamily:'var(--fm)',fontSize:6.5,fontWeight:600,padding:'1px 4px',borderRadius:3,
                    color:c,border:`1px solid ${c}40`,background:`${c}15`,flexShrink:0}}>{badge(v)}</span>
                  <div style={{flex:'1 1 30%',minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--t1)',
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.name}</div>
                    <div style={{fontSize:9,fontFamily:'var(--fm)',color:'var(--t4)',
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.mmsi}</div>
                  </div>
                  <span style={{flex:'0 0 45px',fontFamily:'var(--fm)',fontSize:9,fontWeight:500,color:live?'var(--green)':'var(--t4)',
                    whiteSpace:'nowrap',textAlign:'right',transition:'color .3s'}}>{fmtRel(v.ts)}</span>
                  <div onClick={e=>{e.stopPropagation();focusVessel(v)}} style={{display:'flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:4,cursor:'pointer',opacity:.55,transition:'all .12s',border:'1px solid transparent'}}
                    onMouseEnter={e=>{e.currentTarget.style.opacity=1;e.currentTarget.style.borderColor='var(--blue2)40';e.currentTarget.style.background='var(--blue2)10'}}
                    onMouseLeave={e=>{e.currentTarget.style.opacity=.55;e.currentTarget.style.borderColor='transparent';e.currentTarget.style.background='transparent'}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--blue2)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <IcChev o={open}/>
                </div>
                {open && (()=>{
                  const dst=v.destination&&v.destination!=='—'?v.destination:null
                  const eta=v.etaMonth!=null&&v.etaDay!=null&&v.etaHour!=null&&v.etaMinute!=null?`${String(v.etaDay).padStart(2,'0')}/${String(v.etaMonth).padStart(2,'0')} ${String(v.etaHour).padStart(2,'0')}:${String(v.etaMinute).padStart(2,'0')} UTC`:v.eta||null
                  const dim=v.dimBow!=null||v.dimStern!=null||v.dimPort!=null||v.dimStbd!=null
                  const len=dim&&v.dimBow!=null&&v.dimStern!=null?v.dimBow+v.dimStern:null
                  const beam=dim&&v.dimPort!=null&&v.dimStbd!=null?v.dimPort+v.dimStbd:null
                  const items=[
                    ['Name',v.name&&v.name!=='—'?v.name:null],
                    ['MMSI',v.mmsi],
                    ['Type',v.type],
                    ['Call',v.callsign&&v.callsign!=='—'?v.callsign:null],
                    ['IMO',v.imo&&v.imo!=='—'?v.imo:null],
                    ['Ship',v.shipType&&v.shipType!=='—'?v.shipType:null],
                    ['Lat',isFinite(v.lat)?nf(v.lat,4)+'\u00b0':null],
                    ['Lon',isFinite(v.lon)?nf(v.lon,4)+'\u00b0':null],
                    ['Acc',v.posAccuracy!=null?v.posAccuracy?'<10m':'>10m':null],
                    ['Alt',isFinite(v.alt)?nf(v.alt,1,'m'):null],
                    ['GNSS',v.gnssPos!=null?v.gnssPos?'Yes':'No':null],
                    ['SOG',isFinite(v.sog)?nf(v.sog,2,'kn'):null],
                    ['COG',isFinite(v.cog)?nf(v.cog,1)+'\u00b0':null],
                    ['Head',isFinite(v.heading)?nf(v.heading,0)+'\u00b0':null],
                    ['ROT',isFinite(v.rot)?nf(v.rot,1,'\u00b0/m'):null],
                    ['Stat',v.status&&v.status!=='—'?v.status:null],
                    ['Dest',dst],
                    ['ETA',eta],
                    ['Draft',isFinite(v.draught)?nf(v.draught,1,'m'):null],
                    ['EPFD',v.epfd&&v.epfd!=='—'?v.epfd:null],
                    ['Bow',v.dimBow!=null?nf(v.dimBow,1,'m'):null],
                    ['Stern',v.dimStern!=null?nf(v.dimStern,1,'m'):null],
                    ['Port',v.dimPort!=null?nf(v.dimPort,1,'m'):null],
                    ['Stbd',v.dimStbd!=null?nf(v.dimStbd,1,'m'):null],
                    ['L',len!=null?nf(len,1,'m'):null],
                    ['B',beam!=null?nf(beam,1,'m'):null],
                    ['AIS',v.aisVersion!=null?String(v.aisVersion):null],
                    ['DTE',v.dte!=null?v.dte===0?'Yes':'No':null],
                    ['Vend',v.vendorId||null],
                    ['Model',v.model!=null?String(v.model):null],
                    ['Serial',v.serial!=null?String(v.serial):null],
                    ['Moth',v.motherMmsi||null],
                    ['AtoN',v.atonType!=null?String(v.atonType):null],
                    ['Ext',v.nameExt||null],
                    ['Off',v.offPos!=null?v.offPos?'Yes':'No':null],
                    ['Virt',v.virtual!=null?v.virtual?'Yes':'No':null],
                    ['Time',fmtTs(v.ts)],
                    ['Src',v.source?v.source.startsWith('tcp-')?tcpConns.find(c=>c.id===v.source.slice(4))?.label||v.source.slice(4):v.source:null],
                  ]
                  if(v.type==='Base Station'&&v.year!=null)
                    items.push(['UTC',`${v.year}-${String(v.month).padStart(2,'0')}-${String(v.day).padStart(2,'0')} ${String(v.hour).padStart(2,'0')}:${String(v.minute).padStart(2,'0')}${v.second!=null?':'+String(v.second).padStart(2,'0'):''}`])
                  return <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px',padding:'2px 12px 8px',fontSize:10,color:'var(--t2)'}}>
                    {items.filter(([,x])=>x!=null&&x!=='—').map(([l,x],i)=><div key={i} style={{background:'var(--bg3)',border:'1px solid var(--br)',borderTop:'2px solid '+c,borderRadius:4,padding:'3px 6px',overflow:'hidden'}}>
                      <div style={{fontSize:7,color:'var(--t4)',fontFamily:'var(--fm)',textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{l}</div>
                      <div style={{fontSize:10,color:'var(--t1)',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{x}</div>
                    </div>)}
                    {v.type!=='Base Station'&&<div style={{gridColumn:'1/-1',marginTop:8,display:'flex',gap:8}}>
                      <button onClick={e=>{e.stopPropagation();focusVessel(v)}} style={{flex:1,padding:'5px 0',fontFamily:'var(--fm)',fontSize:8,fontWeight:600,borderRadius:6,border:'1px solid var(--blue2)',background:'var(--blue2)08',color:'var(--blue2)',cursor:'pointer',transition:'all .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background='var(--blue2)';e.currentTarget.style.color='#fff'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='var(--blue2)08';e.currentTarget.style.color='var(--blue2)'}}>Focus on map</button>
                      <button onClick={e=>{e.stopPropagation();toggleLayer(g.id)}} style={{flex:1,padding:'5px 0',fontFamily:'var(--fm)',fontSize:8,fontWeight:600,borderRadius:6,border:'1px solid '+(grpOn?'var(--amber)':'var(--t4)'),background:'transparent',color:grpOn?'var(--amber)':'var(--t4)',cursor:'pointer',transition:'all .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.background=grpOn?'var(--amber)18':'var(--bg3)';e.currentTarget.style.color=grpOn?'var(--amber)':'var(--t3)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=grpOn?'var(--amber)':'var(--t4)'}}>{grpOn?'Sembunyikan':'Tampilkan'}</button>
                    </div>}
                  </div>
                })()}
              </div>
            })}
          </div>
        })}
        {groups.length===0&&<div style={{padding:20,textAlign:'center',fontFamily:'var(--fm)',fontSize:10,color:'var(--t3)'}}>
          Tidak ada kapal{debouncedSearch?' — cari ulang':''}
        </div>}
      </div>
    </div>
  )
}
