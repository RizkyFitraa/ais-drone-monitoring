import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import './Dashboard.module.css'
import { useAIS }         from '../hooks/useAIS.jsx'
import { useAuth }        from '../context/AuthContext.jsx'
import { useBlink }       from '../hooks/useBlink.jsx'
import { useBreakpoint }  from '../hooks/useBreakpoint.jsx'
import MapView            from '../components/MapView.jsx'
import AISMsg8Panel       from '../components/AISMsg8Panel.jsx'
import AISMsg9Panel       from '../components/AISMsg9Panel.jsx'
import AISTargetsPanel    from '../components/AISTargetsPanel.jsx'
import GyroPanel          from '../components/GyroPanel.jsx'
import PIDChart           from '../components/PIDChart.jsx'
import SettingsPage       from './SettingsPage.jsx'
import DataViewer         from './DataViewer.jsx'
import ErrorBoundary      from '../components/ErrorBoundary.jsx'
import { nf, isBuoy }     from '../utils/helpers.jsx'

/* ── SVG helper ── */
function Ic({d,size=14,c='currentColor',sw=1.6,fill='none'}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={c}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{flexShrink:0,display:'block'}}>{[].concat(d).map((p,i)=><path key={i} d={p}/>)}</svg>
}
const Ico={
  signal:   p=><Ic {...p} d={['M2 20h.01','M7 20v-4','M12 20v-8','M17 20V8','M22 4v16']}/>,
  drone:    p=><Ic {...p} d={['M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0','M4.5 4.5l3 3','M16.5 4.5l-3 3','M4.5 19.5l3-3','M16.5 19.5l-3-3','M3 3h3v3H3z','M18 3h3v3h-3z','M3 18h3v3H3z','M18 18h3v3h-3z']}/>,
  activity: p=><Ic {...p} d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  compass:  p=><Ic {...p} d={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z']}/>,
  chart:    p=><Ic {...p} d={['M3 3v18h18','M18 9l-5 5-4-4-4 4']}/>,
  radio:    p=><Ic {...p} d={['M4.9 19.1C1 15.2 1 8.8 4.9 4.9','M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5','M10.7 13.3a2 2 0 1 0 2.6 2.6L21 6l-10.3 7.3z']}/>,
  map:      p=><Ic {...p} d={['M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z','M9 4v13','M15 7v13']}/>,
  layers:   p=><Ic {...p} d={['M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z','M12 22v-6.5','M22 8.5L12 15 2 8.5']}/>,
  eye:      p=><Ic {...p} d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']}/>,
  eyeOff:   p=><Ic {...p} d={['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94','M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19','M1 1l22 22']}/>,
  settings: p=><Ic {...p} d={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']}/>,
  logout:   p=><Ic {...p} d={['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9']}/>,
  clock:    p=><Ic {...p} d={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M12 6v6l4 2']}/>,
  anchor:   p=><Ic {...p} d={['M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z','M12 4v16','M4.93 10h14.14','M4 18.5A8 8 0 0 0 12 22a8 8 0 0 0 8-3.5']}/>,
  plane:    p=><Ic {...p} d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>,
  ship:     p=><Ic {...p} d={['M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1','M4 18l-1-5h14l-1 5','M11 13V6H8l4-4 4 4h-3v7']}/>,
  chevronL: p=><Ic {...p} d="M15 18l-6-6 6-6"/>,
  chevronR: p=><Ic {...p} d="M9 18l6-6-6-6"/>,
  menu:     p=><Ic {...p} d={['M3 12h18','M3 6h18','M3 18h18']}/>,
  x:        p=><Ic {...p} d={['M18 6L6 18','M6 6l12 12']}/>,
  // icon baru untuk tipe AIS tambahan
  globe:    p=><Ic {...p} d={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M2 12h20','M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']}/>,
  buoy:     p=><Ic {...p} d={['M12 2v4','M8 6a4 4 0 0 0 8 0','M9 16l-1 4h8l-1-4','M8 10a4 4 0 0 0 8 0']}/>,
  tower:    p=><Ic {...p} d={['M12 20V10','M9 20h6','M7 13l5-4 5 4','M4.93 7a10 10 0 0 1 14.14 0','M7.76 9.76a6 6 0 0 1 8.49 0']}/>,
  panelLeft:  p=><Ic {...p} d={['M9 3H3v18h6V3zM21 3h-6v18h6V3zM15 4h-6']}/>,
  panelRight: p=><Ic {...p} d={['M15 3H9v18h6V3zM3 3h6v18H3V3zM9 4h6']}/>,
  maximize: p=><Ic {...p} d={['M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3']}/>,
  users:    p=><Ic {...p} d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75']}/>,
}

/* ── Layer definitions — semua tipe AIS ── */
const LAYERS = [
  { id:'drone',       label:'Drone',        color:'#1d4ed8', Icon:Ico.drone  },
  { id:'classA',      label:'Class A Running',       color:'#f43f5e', Icon:Ico.ship   },
  { id:'classB',      label:'Class B Running',       color:'#d97706', Icon:Ico.ship   },
  { id:'anchored',    label:'Berlabuh',      color:'#94a3b8', Icon:Ico.anchor },
  { id:'sar',         label:'SAR Aircraft',  color:'#ea580c', Icon:Ico.plane  },
  { id:'longRange',   label:'Long Range',    color:'#0d9488', Icon:Ico.globe  },
  { id:'aton',        label:'AtoN',          color:'#dc2626', Icon:Ico.buoy   },
  { id:'baseStation', label:'Base Station',  color:'#7c3aed', Icon:Ico.tower  },
]

/* ── Default visibility — semua on ── */
const DEFAULT_VIS = Object.fromEntries(LAYERS.map(l => [l.id, true]))

const NAV = [
  { id:'map',       label:'Map',       Icon:Ico.map,      mobileOnly:true },
  { id:'targets',   label:'AIS',       Icon:Ico.signal   },
  { id:'gyro',      label:'Gyroscope', Icon:Ico.compass  },
  { id:'pid',       label:'PID Chart', Icon:Ico.chart    },
  { id:'msg8',      label:'MSG 8',     Icon:Ico.radio    },
  { id:'msg9',      label:'MSG 9',     Icon:Ico.plane    },
]

/* ── Reusable pieces ── */
function ConnChip({ label, ok }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',
      background:ok?'var(--green-bg)':'var(--bg3)',
      border:`1px solid ${ok?'rgba(5,150,105,.2)':'var(--br)'}`,
      borderRadius:20,fontFamily:'var(--fm)',fontSize:9,
      color:ok?'var(--green)':'var(--t3)',transition:'all .25s',flexShrink:0}}>
      <div style={{width:5,height:5,borderRadius:'50%',
        background:ok?'var(--green)':'var(--t4)',
        boxShadow:ok?'0 0 0 2px rgba(5,150,105,.25)':'none'}}/>
      {label}
    </div>
  )
}

function LayersPanel({ vis, onToggle, vessels, atons, stations }) {
  // Hitung per-layer
  const count = {
    drone:       1,
    classA:      vessels.filter(v => v.type === 'Class A' && Number(v.sog) > .5).length,
    classB:      vessels.filter(v => v.type === 'Class B' && Number(v.sog) > .5).length,
    anchored:    vessels.filter(v => v.type !== 'SAR Aircraft' && v.type !== 'Long Range' && Number(v.sog) <= .5).length,
    sar:         vessels.filter(v => v.type === 'SAR Aircraft').length,
    longRange:   vessels.filter(v => v.type === 'Long Range').length,
    aton:        (atons  || []).length,
    baseStation: (stations || []).length,
  }
  const allOn = LAYERS.every(l => vis[l.id] !== false)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'8px 14px 4px'}}>
        <span style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)',
          letterSpacing:'1px',textTransform:'uppercase'}}>Map Layers</span>
        <button onClick={() => onToggle('__all__', !allOn)}
          style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--blue2)',
            cursor:'pointer',fontWeight:500}}>
          {allOn ? 'Hide all' : 'Show all'}
        </button>
      </div>
      {LAYERS.map(l => {
        const on = vis[l.id] !== false
        const n  = count[l.id] || 0
        return (
          <div key={l.id} onClick={() => onToggle(l.id)} style={{
            display:'flex',alignItems:'center',gap:9,padding:'8px 14px',
            cursor:'pointer',transition:'background .12s'}}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{width:9,height:9,borderRadius:'50%',flexShrink:0,transition:'all .2s',
              background:on?l.color:'transparent',border:`1.5px solid ${on?l.color:'var(--br2)'}`,
              boxShadow:on?`0 0 0 2px ${l.color}20`:'none'}}/>
            <l.Icon size={12} c={on?l.color:'var(--t3)'} sw={1.5}/>
            <span style={{flex:1,fontSize:12,color:on?'var(--t1)':'var(--t3)',transition:'color .2s'}}>
              {l.label}
            </span>
            <span style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)',minWidth:14,textAlign:'right'}}>
              {n}
            </span>
            <div style={{color:on?'var(--t3)':'var(--amber)',flexShrink:0}}>
              {on
                ? <Ico.eye    size={11} c="currentColor" sw={1.5}/>
                : <Ico.eyeOff size={11} c="currentColor" sw={1.5}/>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Tab content renderer (internal) ── */
function TabContent({ tab, drone, vessels, atons, stations, mapRef, vis, toggleLayer, tcpConns }) {
  const aisTargets = [...(vessels||[]),
    ...(atons||[]).map(a=>({...a,type:'AtoN'})),
    ...(stations||[]).map(s=>({...s,type:'Base Station'}))]
  return (
    <ErrorBoundary>
      {tab === 'gyro'      && <GyroPanel        drone={drone}/>}
      {tab === 'pid'       && <PIDChart          drone={drone}/>}
      {tab === 'msg8'      && <AISMsg8Panel     drone={drone}/>}
      {tab === 'msg9'      && <AISMsg9Panel     vessels={vessels}/>}
      {tab === 'targets'   && <AISTargetsPanel  targets={aisTargets}
        onFocusVessel={v => mapRef.current?.focusVessel(v)}
        visibility={vis} onToggleLayer={toggleLayer}
        tcpConns={tcpConns}/>}
    </ErrorBoundary>
  )
}

/* ── Panel content with exit/enter animation ── */
function PanelContent({ tab, drone, vessels, atons, stations, mapRef, vis, toggleLayer, tcpConns }) {
  const [prevTab, setPrevTab] = useState(tab)
  const [phase, setPhase] = useState(null) // null | 'exit' | 'enter'

  useEffect(() => {
    if (prevTab !== tab) {
      setPhase('exit')
      const t1 = setTimeout(() => {
        setPrevTab(tab)
        setPhase('enter')
        setTimeout(() => setPhase(null), 300)
      }, 150)
      return () => clearTimeout(t1)
    }
  }, [tab])

  if (!phase) {
    return <div className="panel-fade-enter">
      <TabContent tab={tab} drone={drone} vessels={vessels}
        atons={atons} stations={stations}
        mapRef={mapRef} vis={vis} toggleLayer={toggleLayer} tcpConns={tcpConns}/>
    </div>
  }

  return (<>
    {phase === 'exit' && <div className="panel-fade-exit" key={prevTab}>
      <TabContent tab={prevTab} drone={drone} vessels={vessels}
        atons={atons} stations={stations}
        mapRef={mapRef} vis={vis} toggleLayer={toggleLayer} tcpConns={tcpConns}/>
    </div>}
    <div className={phase === 'enter' ? 'panel-fade-enter' : ''}>
      <TabContent tab={tab} drone={drone} vessels={vessels}
        atons={atons} stations={stations}
        mapRef={mapRef} vis={vis} toggleLayer={toggleLayer} tcpConns={tcpConns}/>
    </div>
  </>)
}

/* ── Mobile Drawer ── */
function Drawer({ title, Icon, onClose, children }) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-handle"/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'4px 16px 10px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {Icon && <Icon size={14} c="var(--blue2)" sw={1.7}/>}
            <span style={{fontWeight:700,fontSize:14,color:'var(--t1)'}}>{title}</span>
          </div>
          <button onClick={onClose} style={{padding:4,color:'var(--t3)',cursor:'pointer'}}>
            <Ico.x size={16} c="currentColor" sw={2}/>
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>{children}</div>
      </div>
    </>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════════ */
function ClockWidget() {
  const [t, setT] = useState(() => new Date().toLocaleTimeString('id-ID'))
  useEffect(() => { const id = setInterval(() => setT(new Date().toLocaleTimeString('id-ID')), 1000); return () => clearInterval(id) }, [])
  return <>{t}</>
}

export default function Dashboard({ onLogout, onUsers }) {
  const { drone, now, gps, vessels, atons, stations, rawLines, status, connConfig, wsState, applyConfig, wsRef, useMock } = useAIS()
  const { isAdmin } = useAuth()
  const blink = useBlink(900)
  const { isMobile, isTablet, isDesktop, bp } = useBreakpoint()
  const mapRef = useRef(null)

  const [mapMode,   setMapMode]   = useState('light')
  const [tab,       setTab]       = useState('targets')
  const [mobileTab, setMobileTab] = useState('map')
  const [showSet,   setShowSet]   = useState(false)
  const [showData,  setShowData]  = useState(false)
  const [sideTab,   setSideTab]   = useState('menu')
  const [drawer,    setDrawer]    = useState(null)
  const [vis,       setVis]       = useState(DEFAULT_VIS)
  const [leftOpen, setLeftOpen] = useState(() => {
    try { return localStorage.getItem('ais-panel-left') !== 'hidden' } catch { return true }
  })
  const [rightOpen, setRightOpen] = useState(() => {
    try { return localStorage.getItem('ais-panel-right') !== 'hidden' } catch { return true }
  })

  useEffect(() => {
    try { localStorage.setItem('ais-panel-left', leftOpen ? 'visible' : 'hidden') } catch {}
  }, [leftOpen])
  useEffect(() => {
    try { localStorage.setItem('ais-panel-right', rightOpen ? 'visible' : 'hidden') } catch {}
  }, [rightOpen])

  const toggleLayer = useCallback((id, force) => {
    if (id === '__all__') {
      const n = {}
      LAYERS.forEach(l => { n[l.id] = force })
      setVis(n)
    } else {
      setVis(p => ({ ...p, [id]: force !== undefined ? force : !p[id] }))
    }
  }, [])

  // Reklasifikasi vessel yang terdeteksi sebagai buoy → AtoN
  const { regularVessels, enrichedAtons } = useMemo(() => {
    const reg = []
    const buoy = []
    for (const v of vessels) {
      if (v.type === 'Class B' && isBuoy(v.name)) {
        buoy.push({ ...v, type: 'AtoN' })
      } else {
        reg.push(v)
      }
    }
    return { regularVessels: reg, enrichedAtons: [...(atons || []), ...buoy] }
  }, [vessels, atons])

  // Filter vessels untuk peta sesuai visibility — distabilkan dengan useMemo
  const mapVessels = useMemo(() => [
    ...regularVessels.filter(v => {
      const type    = v.type || ''
      const moving  = Number(v.sog) > 0.5
      if (type === 'SAR Aircraft') return vis.sar        !== false
      if (type === 'Long Range')   return vis.longRange  !== false
      if (!moving)                 return vis.anchored   !== false
      if (type === 'Class A')      return vis.classA     !== false
      return                              vis.classB     !== false
    }),
    // AtoN — diberi type agar MapView bisa resolve icon-nya
    ...(vis.aton !== false
      ? (enrichedAtons || []).map(a => ({ ...a, type: 'AtoN' }))
      : []),
    // Base Station
    ...(vis.baseStation !== false
      ? (stations || []).map(s => ({ ...s, type: 'Base Station' }))
      : []),
  ], [regularVessels, enrichedAtons, stations, vis])

  const hiddenN = LAYERS.filter(l => vis[l.id] === false).length

  if (showData) return <DataViewer onBack={() => setShowData(false)} />

  if (showSet) return (
    <SettingsPage onBack={() => setShowSet(false)}
      connConfig={connConfig} status={status} wsState={wsState}
      applyConfig={applyConfig} rawLines={rawLines} wsRef={wsRef}/>
  )

  const lc = { open:'var(--green)', connecting:'var(--amber)', closed:'var(--t4)', error:'var(--red)' }[wsState] || 'var(--t4)'
  const ll = useMock ? 'DEMO' : { open:'LIVE', connecting:'SYNC…', closed:'OFFLINE', error:'ERROR' }[wsState]

  // Aggregate TCP connection status — server sends { id:{connected,...},... }
  const tcpOk = status.tcp ? Object.values(status.tcp).some(s => s.connected) : false

  const curNav = NAV.find(n => n.id === tab)

  /* ── TOPBAR ── */
  const Topbar = (
    <header style={{
      height:'var(--topbar-h)',flexShrink:0,display:'flex',alignItems:'center',
      justifyContent:'space-between',
      padding: isMobile ? '0 10px' : '0 16px',
      gap: isMobile ? 6 : 10,
      background:'var(--bg2)',borderBottom:'1px solid var(--br)',
      boxShadow:'0 1px 3px rgba(0,0,0,.05)',zIndex:10,
    }}>
      {/* logo */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{
          width:35,height:35,borderRadius:9,flexShrink:0,
          background:'linear-gradient(135deg, #87ccfe, #0082de)',
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:'0 3px 10px rgba(84,138,255,.28)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
          </svg>
        </div>
        <span>
          <span style={{fontWeight:800,fontSize:14,color:'#1b1303'}}>
            AIS <span style={{color:'#0082de'}}>AIRCRAFT</span>
          </span>
          <div style={{fontSize:9,color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>
            Monitoring
          </div>
        </span>
      </div>

      {/* center chips */}
      {!isMobile && (
        <div style={{display:'flex',gap:6,alignItems:'center',flex:1,justifyContent:'center',flexWrap:'wrap'}}>
          {[
            { l:'Vessels',  v: regularVessels.length,                                      c:'var(--blue2)' },
            { l:'SAR',      v: regularVessels.filter(v => v.type === 'SAR Aircraft').length, c:'var(--coral)'  },
            { l:'AtoN',     v: (enrichedAtons || []).length,                              c:'var(--red)'    },
            { l:'Battery',  v: `${Math.round(drone?.battery || 0)}%`,
              c: drone?.battery > 30 ? 'var(--green)' : 'var(--red)' },
            ...(isDesktop ? [{ l:'Altitude', v:`${Number(drone?.alt||0).toFixed(0)}m`, c:'var(--teal)' }] : []),
          ].map(ch => (
            <div key={ch.l} style={{display:'flex',flexDirection:'column',alignItems:'center',
              padding:'3px 9px',background:'var(--bg3)',borderRadius:7,minWidth:48,
              border:'1px solid var(--br)'}}>
              <div style={{fontFamily:'var(--fm)',fontSize:12,fontWeight:500,color:ch.c,lineHeight:1.3}}>{ch.v}</div>
              <div style={{fontFamily:'var(--fm)',fontSize:7,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.5px'}}>{ch.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* right */}
      <div style={{display:'flex',alignItems:'center',gap: isMobile ? 5 : 8}}>
        {!isMobile && (
          <div style={{display:'flex',alignItems:'center',gap:4,fontFamily:'var(--fm)',fontSize:10,color:'var(--t2)',flexShrink:0}}>
            <Ico.clock size={10} c="var(--t3)" sw={1.5}/>
            <ClockWidget/>
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',
          background: wsState==='open'?'var(--green-bg)':wsState==='connecting'?'var(--amber-bg)':'var(--bg3)',
          border:`1px solid ${wsState==='open'?'rgba(5,150,105,.25)':wsState==='connecting'?'rgba(217,119,6,.25)':'var(--br)'}`,
          borderRadius:20,flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:lc,
            boxShadow:blink&&wsState==='open'?'0 0 0 3px rgba(5,150,105,.25)':'none',transition:'box-shadow .3s'}}/>
          <span style={{fontFamily:'var(--fm)',fontSize:isMobile?9:10,color:lc,fontWeight:500}}>{ll}</span>
        </div>
        {!isMobile && (
          <><ConnChip label="SER" ok={status.serial?.connected}/>
            <ConnChip label="TCP" ok={tcpOk}/>
            <ConnChip label="UDP" ok={status.udp?.listening}/></>
        )}
        {!isMobile && (<>
          <button onClick={() => { setLeftOpen(p=>!p); setRightOpen(p=>!p) }}
            title={leftOpen||rightOpen?'Hide All Panels':'Show All Panels'}
            style={{
              display:'flex',alignItems:'center',gap:4,
              padding:'6px 8px',border:'1px solid var(--br)',background:'var(--bg3)',
              borderRadius:8,color:'var(--t2)',fontFamily:'var(--ff)',fontWeight:500,fontSize:11,
              cursor:'pointer',transition:'all .15s',
            }}>
            <Ico.maximize size={12} c="var(--t2)" sw={1.6}/>
            {!(leftOpen||rightOpen) ? 'Panels' : 'Full Map'}
          </button>
        </>)}
        <button onClick={() => setShowData(true)} style={{
          display:'flex',alignItems:'center',gap: isMobile?0:4,
          padding: isMobile?'6px':'6px 12px',
          background:'var(--teal-bg)',border:'1px solid rgba(13,148,136,.25)',
          borderRadius:8,color:'var(--teal)',fontFamily:'var(--ff)',fontWeight:500,fontSize:12,
          cursor:'pointer',transition:'all .15s',
        }}>
          <Ico.globe size={12} c="var(--teal)" sw={1.6}/>
          {!isMobile && ' Data'}
        </button>
        <button onClick={() => setShowSet(true)} style={{
          display:'flex',alignItems:'center',gap: isMobile?0:4,
          padding: isMobile?'6px':'6px 12px',
          background:'var(--blue-bg)',border:'1px solid var(--blue-br)',
          borderRadius:8,color:'var(--blue2)',fontFamily:'var(--ff)',fontWeight:500,fontSize:12,
          cursor:'pointer',transition:'all .15s',
        }}>
          <Ico.settings size={12} c="var(--blue2)" sw={1.6}/>
          {!isMobile && ' Settings'}
        </button>
        {isAdmin && <button onClick={onUsers} style={{
          display:'flex',alignItems:'center',gap: isMobile?0:4,
          padding: isMobile?'6px':'6px 12px',
          background:'var(--bg3)',border:'1px solid var(--br)',
          borderRadius:8,color:'var(--t2)',fontFamily:'var(--ff)',fontWeight:500,fontSize:12,
          cursor:'pointer',transition:'all .15s',
        }}>
          <Ico.users size={12} c="var(--t2)" sw={1.6}/>
          {!isMobile && ' Users'}
        </button>}
        <button onClick={onLogout} style={{
          display:'flex',alignItems:'center',gap: isMobile?0:4,
          padding: isMobile?'6px':'6px 12px',
          background:'var(--bg3)',border:'1px solid var(--br)',
          borderRadius:8,color:'var(--t2)',fontFamily:'var(--ff)',fontWeight:500,fontSize:12,
          cursor:'pointer',transition:'all .15s',
        }}>
          <Ico.logout size={12} c="var(--t2)" sw={1.6}/>
          {!isMobile && ' Logout'}
        </button>
      </div>
    </header>
  )

  /* ══════════════════════════════════════════════════════════
     MOBILE LAYOUT
  ══════════════════════════════════════════════════════════ */
  if (isMobile) {
    const MOBILE_NAV = [
      { id:'map',       label:'Map',    Icon:Ico.map      },
      { id:'gyro',      label:'Gyro',   Icon:Ico.compass  },
      { id:'msg9',      label:'MSG 9',  Icon:Ico.plane    },
      { id:'targets',   label:'AIS',    Icon:Ico.signal   },
      { id:'layers',    label:'Layers', Icon:Ico.layers, badge: hiddenN || null },
    ]

    const dItems = drone ? [
      { l:'Mode', v: drone.mode || '—', c:'var(--green)' },
      { l:'Alt',  v:`${Number(drone.alt||0).toFixed(0)}m`, c:'var(--blue2)' },
      { l:'Spd',  v:`${Number(drone.sog||0).toFixed(1)}m/s`, c:'var(--t1)' },
      { l:'Head', v:`${Number(drone.heading||0).toFixed(0)}°`, c:'var(--t1)' },
      { l:'Bat',  v:`${Math.round(drone.battery||0)}%`,
        c: drone.battery>50?'var(--green)':drone.battery>25?'var(--amber)':'var(--red)' },
      { l:'RSSI', v:`${Math.round(drone.rssi||0)} dBm`, c:'var(--t1)' },
      { l:'SAT',  v:`${drone.satellites||0}`, c:'var(--teal)' },
    ] : []

    return (
      <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>
        {Topbar}

        {/* Persistent drone bar — always visible */}
        {drone && <div style={{flexShrink:0,display:'flex',alignItems:'center',gap:4,
          padding:'5px 8px',background:'var(--bg2)',borderBottom:'1px solid var(--br)',
          overflowX:'auto',fontFamily:'var(--fm)',cursor:'pointer'}}
          onClick={() => mapRef.current?.focusDrone()}>
          <div style={{width:24,height:24,background:'var(--blue-bg)',border:'1px solid var(--blue-br)',
            borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Ico.drone size={11} c="var(--blue2)" sw={1.5}/>
          </div>
          {dItems.map(s => (
            <div key={s.l} style={{display:'flex',alignItems:'center',gap:3,
              background:'var(--bg3)',border:'1px solid var(--br)',borderRadius:6,padding:'2px 6px',flexShrink:0}}>
              <span style={{fontSize:7,color:'var(--t3)',textTransform:'uppercase'}}>{s.l}</span>
              <span style={{fontSize:10,fontWeight:600,color:s.c,whiteSpace:'nowrap'}}>{s.v}</span>
            </div>
          ))}
        </div>}

        <div style={{flex:1,position:'relative',overflow:'hidden',paddingBottom:'var(--bottombar-h)'}}>

          {/* Map */}
          <div style={{position:'absolute',inset:0,display: mobileTab==='map'?'block':'none'}}>
            <div style={{position:'absolute',top:8,left:8,zIndex:400,display:'flex',gap:5}}>
              {[['light','Light'],['satellite','Sat']].map(([k,l]) => (
                <button key={k} onClick={() => setMapMode(k)} style={{
                  padding:'5px 10px',background:'white',backdropFilter:'blur(10px)',
                  border:`1px solid ${mapMode===k?'var(--blue-br)':'rgba(0,0,0,.1)'}`,
                  borderRadius:8,color:mapMode===k?'var(--blue2)':'var(--t2)',
                  fontFamily:'var(--fm)',fontSize:10,cursor:'pointer',
                  boxShadow:'0 2px 6px rgba(0,0,0,.08)',
                  display:'flex',alignItems:'center',gap:4,
                }}>
                  <Ico.map size={10} c="currentColor" sw={1.5}/>{l}
                </button>
              ))}
              {useMock && (
                <div style={{padding:'5px 9px',borderRadius:8,fontFamily:'var(--fm)',
                  fontSize:9,background:'white',border:'1px solid rgba(217,119,6,.3)',
                  color:'var(--amber)',boxShadow:'0 2px 6px rgba(0,0,0,.08)'}}>DEMO</div>
              )}
            </div>
            <ErrorBoundary>
              <MapView ref={mapRef} drone={vis.drone!==false?drone:null}
                gps={gps} tcpConns={connConfig?.tcp || []} aisTargets={mapVessels} mapMode={mapMode}/>
            </ErrorBoundary>
          </div>

          {/* Panel pages */}
          {mobileTab !== 'map' && mobileTab !== 'layers' && (
              <div style={{height:'100%',overflowY:'auto',background:'var(--bg)'}}>
              <div style={{padding:'10px 14px 6px',borderBottom:'1px solid var(--br)',
                background:'var(--bg2)',display:'flex',alignItems:'center',gap:8}}>
                {curNav && <curNav.Icon size={13} c="var(--blue2)" sw={1.7}/>}
                <span style={{fontWeight:700,fontSize:14,color:'var(--t1)'}}>{curNav?.label}</span>
              </div>
              <PanelContent tab={mobileTab} drone={drone} vessels={regularVessels}
                atons={enrichedAtons} stations={stations}
                mapRef={mapRef} vis={vis} toggleLayer={toggleLayer}
                tcpConns={connConfig?.tcp || []}/>
            </div>
          )}

          {/* Layers panel */}
          {mobileTab === 'layers' && (
            <div style={{height:'100%',overflowY:'auto',background:'var(--bg2)'}}>
              <div style={{padding:'10px 14px 6px',borderBottom:'1px solid var(--br)',
                display:'flex',alignItems:'center',gap:8}}>
                <Ico.layers size={13} c="var(--blue2)" sw={1.7}/>
                <span style={{fontWeight:700,fontSize:14,color:'var(--t1)'}}>Map Layers</span>
              </div>
              <LayersPanel vis={vis} onToggle={toggleLayer}
                vessels={regularVessels} atons={enrichedAtons} stations={stations}/>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <nav className="bottom-nav">
          {MOBILE_NAV.map(item => (
            <button key={item.id}
              className={mobileTab === item.id ? 'active' : ''}
              onClick={() => { setMobileTab(item.id); if (item.id !== 'map' && item.id !== 'layers') setTab(item.id) }}>
              <div style={{position:'relative'}}>
                <item.Icon size={18} c="currentColor" sw={mobileTab===item.id?2:1.5}/>
                {item.badge != null && (
                  <span style={{position:'absolute',top:-5,right:-8,background:'var(--amber)',
                    color:'white',fontSize:7,fontWeight:700,borderRadius:10,
                    padding:'0 3px',lineHeight:'12px',fontFamily:'var(--fm)'}}>{item.badge}</span>
                )}
              </div>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════
     TABLET LAYOUT
  ══════════════════════════════════════════════════════════ */
  if (isTablet) {
    const TABLET_NAV = [
      { id:'gyro',      label:'Gyro',  Icon:Ico.compass  },
      { id:'pid',       label:'PID',   Icon:Ico.chart    },
      { id:'msg8',      label:'MSG 8', Icon:Ico.radio    },
      { id:'msg9',      label:'MSG 9', Icon:Ico.plane    },
      { id:'targets',   label:'AIS',   Icon:Ico.signal   },
    ]

    return (
      <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>
        {Topbar}
        <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 300px',overflow:'hidden'}}>

          {/* Map */}
          <div style={{position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:8,left:8,zIndex:400,display:'flex',gap:5,alignItems:'center'}}>
              {[['light','Light'],['satellite','Sat']].map(([k,l]) => (
                <button key={k} onClick={() => setMapMode(k)} style={{
                  display:'flex',alignItems:'center',gap:4,padding:'5px 10px',
                  background:'white',backdropFilter:'blur(10px)',
                  border:`1px solid ${mapMode===k?'var(--blue-br)':'rgba(0,0,0,.1)'}`,
                  borderRadius:8,color:mapMode===k?'var(--blue2)':'var(--t2)',
                  fontFamily:'var(--fm)',fontSize:10,cursor:'pointer',
                  boxShadow:'0 2px 6px rgba(0,0,0,.08)',
                }}>
                  <Ico.map size={10} c="currentColor" sw={1.5}/>{l}
                </button>
              ))}
              {hiddenN > 0 && (
                <div style={{padding:'5px 9px',borderRadius:8,fontFamily:'var(--fm)',
                  fontSize:9,background:'white',border:'1px solid rgba(217,119,6,.3)',
                  color:'var(--amber)',boxShadow:'0 2px 6px rgba(0,0,0,.08)'}}>
                  <Ico.eyeOff size={10} c="var(--amber)" sw={1.5}/> {hiddenN} hidden
                </div>
              )}
              {useMock && (
                <div style={{padding:'5px 9px',borderRadius:8,fontFamily:'var(--fm)',
                  fontSize:9,background:'white',border:'1px solid rgba(217,119,6,.3)',
                  color:'var(--amber)',boxShadow:'0 2px 6px rgba(0,0,0,.08)'}}>DEMO</div>
              )}
            </div>
            <ErrorBoundary>
              <MapView ref={mapRef} drone={vis.drone!==false?drone:null}
                gps={gps} tcpConns={connConfig?.tcp || []} aisTargets={mapVessels} mapMode={mapMode}/>
            </ErrorBoundary>
          </div>

          {/* Right panel */}
          <aside style={{background:'var(--bg2)',borderLeft:'1px solid var(--br)',
            display:'flex',flexDirection:'column',overflow:'hidden'}}>

            {/* Persistent drone bar — always visible */}
            {drone && <div style={{padding:'6px 10px',borderBottom:'1px solid var(--br)',
              flexShrink:0,cursor:'pointer',display:'flex',flexWrap:'wrap',gap:3,
              fontFamily:'var(--fm)',alignItems:'center'}}
              onClick={() => mapRef.current?.focusDrone()}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{width:22,height:22,background:'var(--blue-bg)',border:'1px solid var(--blue-br)',
                borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Ico.drone size={10} c="var(--blue2)" sw={1.5}/>
              </div>
              <div style={{fontSize:10,fontWeight:600,color:'var(--t1)',marginRight:4}}>{drone.callsign}</div>
              {[
                { l:'Mode', v: drone.mode || '—', c:'var(--green)' },
                { l:'Alt',  v:`${Number(drone.alt||0).toFixed(0)}m`, c:'var(--blue2)' },
                { l:'Spd',  v:`${Number(drone.sog||0).toFixed(1)}m/s`, c:'var(--t1)' },
                { l:'Bat',  v:`${Math.round(drone.battery||0)}%`,
                  c: drone.battery>50?'var(--green)':drone.battery>25?'var(--amber)':'var(--red)' },
              ].map(s => (
                <span key={s.l} style={{fontSize:8,color:s.c,background:'var(--bg3)',
                  border:'1px solid var(--br)',borderRadius:4,padding:'1px 5px',whiteSpace:'nowrap'}}>
                  {s.l} <strong>{s.v}</strong>
                </span>
              ))}
            </div>}

            {/* Tab bar */}
            <div style={{display:'flex',borderBottom:'1px solid var(--br)',flexShrink:0,overflowX:'auto'}}>
              {TABLET_NAV.map(n => (
                <button key={n.id} onClick={() => setTab(n.id)} style={{
                  flex:1,minWidth:40,display:'flex',flexDirection:'column',alignItems:'center',
                  justifyContent:'center',gap:2,padding:'7px 4px',background:'none',border:'none',
                  borderBottom:`2px solid ${tab===n.id?'var(--blue2)':'transparent'}`,
                  color:tab===n.id?'var(--blue2)':'var(--t3)',cursor:'pointer',
                  transition:'all .15s',fontFamily:'var(--fm)',fontSize:8,
                }}>
                  <n.Icon size={13} c="currentColor" sw={tab===n.id?2:1.5}/>
                  {n.label}
                </button>
              ))}
              <button onClick={() => setDrawer(drawer === 'layers' ? null : 'layers')} style={{
                minWidth:40,display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:2,padding:'7px 4px',background:'none',border:'none',
                borderBottom:`2px solid ${drawer==='layers'?'var(--blue2)':'transparent'}`,
                color:drawer==='layers'?'var(--blue2)':hiddenN>0?'var(--amber)':'var(--t3)',
                cursor:'pointer',transition:'all .15s',fontFamily:'var(--fm)',fontSize:8,
                position:'relative'}}>
                <Ico.layers size={13} c="currentColor" sw={drawer==='layers'?2:1.5}/>
                Layers
                {hiddenN > 0 && <span style={{position:'absolute',top:4,right:4,width:6,height:6,
                  borderRadius:'50%',background:'var(--amber)'}}/>}
              </button>
            </div>

            <div style={{flex:1,overflowY:'auto'}}>
              {drawer === 'layers'
                ? <LayersPanel vis={vis} onToggle={toggleLayer}
                    vessels={regularVessels} atons={enrichedAtons} stations={stations}/>
                : <PanelContent tab={tab} drone={drone} vessels={regularVessels}
                    atons={enrichedAtons} stations={stations}
                    mapRef={mapRef} vis={vis} toggleLayer={toggleLayer}
                    tcpConns={connConfig?.tcp || []}/>
              }
            </div>
          </aside>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════════
     DESKTOP LAYOUT
  ══════════════════════════════════════════════════════════ */
  const sideW  = bp === 'lg' ? 180 : 200
  const panelW = bp === 'lg' ? 300 : 348

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--bg)',overflow:'hidden'}}>
      {Topbar}

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{width:leftOpen?sideW:0,overflow:'hidden',flexShrink:0,
          transition:'width .35s cubic-bezier(.4,0,.2,1)',background:'var(--bg2)',
          borderRight:'1px solid var(--br)',
          display:'flex',flexDirection:'column',position:'relative'}}>
          <div style={{opacity:leftOpen?1:0,transition:'opacity .2s ease .12s',minWidth:sideW,
            display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
          {/* Collapse button */}
          <button onClick={() => setLeftOpen(false)} title="Close sidebar"
            style={{
              position:'absolute',top:'50%',right:-12, zIndex:50, transform:'translateY(-50%)',
              width:24,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'var(--bg2)',border:'1px solid var(--br)',borderLeft:'none',
              borderRadius:'0 6px 6px 0',color:'var(--t3)',cursor:'pointer',padding:0,
              boxShadow:'2px 0 6px rgba(0,0,0,.06)',
            }}
            onMouseEnter={e => e.currentTarget.style.color='var(--blue2)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}>
            <Ico.chevronL size={12} c="currentColor" sw={2}/>
          </button>

          {drone && <div style={{padding:'12px 14px',borderBottom:'1px solid var(--br)',
              flexShrink:0,transition:'background .15s'}}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div onClick={() => mapRef.current?.focusDrone()}
              style={{display:'flex',alignItems:'center',gap:9,marginBottom:8,cursor:'pointer'}}>
              <div style={{width:30,height:30,background:'var(--blue-bg)',
                border:'1px solid var(--blue-br)',borderRadius:8,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Ico.drone size={14} c="var(--blue2)" sw={1.5}/>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--t1)',letterSpacing:'-.3px',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {drone.callsign}
                </div>
                <div style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)',marginTop:1}}>
                  MMSI {drone.mmsi}
                </div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {[
                    { l:'Mode', v: drone.mode || '—',                 c:'var(--green)' },
                    { l:'Alt',  v:`${Number(drone.alt||0).toFixed(0)}m`, c:'var(--blue2)' },
                    { l:'Spd',  v:`${Number(drone.sog||0).toFixed(1)}m/s`, c:'var(--t1)' },
                    { l:'Head', v:`${Number(drone.heading||0).toFixed(0)}°`, c:'var(--t1)' },
                  ].map(s => (
                    <div key={s.l} style={{background:'var(--bg3)',border:'1px solid var(--br)',
                      borderRadius:6,padding:'3px 6px'}}>
                      <div style={{fontFamily:'var(--fm)',fontSize:6.5,color:'var(--t3)',
                        textTransform:'uppercase',letterSpacing:'.3px'}}>{s.l}</div>
                      <div style={{fontFamily:'var(--fm)',fontSize:10,fontWeight:500,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {[
                    { l:'Bat',  v:`${Math.round(drone.battery||0)}%`,
                      c: drone.battery>50?'var(--green)':drone.battery>25?'var(--amber)':'var(--red)' },
                    { l:'Thr',  v:`${Math.round(drone.throttle||0)}%`, c:'var(--t2)' },
                    { l:'RSSI', v:`${Math.round(drone.rssi||0)} dBm`,  c:'var(--t1)' },
                    { l:'SAT',  v:`${drone.satellites||0}`,           c:'var(--teal)'  },
                  ].map(s => (
                    <div key={s.l} style={{background:'var(--bg3)',border:'1px solid var(--br)',
                      borderRadius:6,padding:'3px 6px'}}>
                      <div style={{fontFamily:'var(--fm)',fontSize:6.5,color:'var(--t3)',
                        textTransform:'uppercase',letterSpacing:'.3px'}}>{s.l}</div>
                      <div style={{fontFamily:'var(--fm)',fontSize:10,fontWeight:500,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  {[
                    { l:'Vert Spd', v:`${Number(drone.vertspeed||0).toFixed(1)} m/s`, c:'var(--teal)' },
                    { l:'Dist',     v:`${Number(drone.distance||0).toFixed(0)}m`,     c:'var(--t1)' },
                  ].map(s => (
                    <div key={s.l} style={{background:'var(--bg3)',border:'1px solid var(--br)',
                      borderRadius:6,padding:'3px 6px'}}>
                      <div style={{fontFamily:'var(--fm)',fontSize:6.5,color:'var(--t3)',
                        textTransform:'uppercase',letterSpacing:'.3px'}}>{s.l}</div>
                      <div style={{fontFamily:'var(--fm)',fontSize:10,fontWeight:500,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              <div style={{background:'var(--bg3)',border:'1px solid var(--br)',borderRadius:6,padding:'6px 8px'}}>
                <div style={{fontFamily:'var(--fm)',fontSize:6.5,color:'var(--t3)',
                  textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Attitude</div>
                {[
                  { l:'Roll',  v:drone.roll,  min:-45, max:45,  c:'var(--amber)' },
                  { l:'Pitch', v:drone.pitch, min:-45, max:45,  c:'var(--blue2)' },
                  { l:'Yaw',   v:drone.yaw,   min:0,   max:360, c:'var(--teal)'  },
                ].map(att => {
                  const v=isFinite(att.v)?Number(att.v):0
                  const pct=Math.min(100,Math.max(0,((v-att.min)/(att.max-att.min))*100))
                  return <div key={att.l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontFamily:'var(--fm)',fontSize:7,color:'var(--t3)',width:26,flexShrink:0,textTransform:'uppercase'}}>{att.l}</span>
                    <div style={{flex:1,height:3,background:'var(--bg4)',borderRadius:2,overflow:'hidden',position:'relative'}}>
                      <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'rgba(0,0,0,.12)'}}/>
                      <div style={{position:'absolute',left:`${Math.min(pct,50)}%`,width:`${Math.abs(pct-50)}%`,height:'100%',
                        background:att.c,borderRadius:2,transition:'all .4s ease'}}/>
                    </div>
                    <span style={{fontFamily:'var(--fm)',fontSize:8,color:att.c,minWidth:32,textAlign:'right',fontWeight:500}}>{nf(v,1)}°</span>
                  </div>
                })}
              </div>
            </div>
          </div>}

          {/* Menu / Layers tab */}
          <div style={{display:'flex',borderBottom:'1px solid var(--br)',flexShrink:0}}>
            {[
              { id:'menu',   label:'Panel',  Icon:Ico.activity },
              { id:'layers', label:'Layers', Icon:Ico.layers, badge: hiddenN || null },
            ].map(t => (
              <button key={t.id} onClick={() => setSideTab(t.id)} style={{
                flex:1,display:'flex',alignItems:'center',justifyContent:'center',
                gap:5,padding:'8px 4px',background:'none',border:'none',
                borderBottom:`2px solid ${sideTab===t.id?'var(--blue2)':'transparent'}`,
                color:sideTab===t.id?'var(--blue2)':'var(--t2)',
                fontFamily:'var(--ff)',fontWeight:600,fontSize:11,
                cursor:'pointer',transition:'all .15s',position:'relative',
              }}>
                <t.Icon size={12} c="currentColor" sw={1.6}/>
                {t.label}
                {t.badge && (
                  <span style={{position:'absolute',top:5,right:8,
                    background:'var(--amber)',color:'white',borderRadius:10,
                    fontFamily:'var(--fm)',fontSize:7,fontWeight:700,
                    padding:'0 4px',lineHeight:'14px'}}>{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflowY:'auto'}}>
            {sideTab === 'menu' && (
              <>
                <div style={{padding:'10px 14px 4px',fontFamily:'var(--fm)',fontSize:8,
                  color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>
                  Data Panels
                </div>
                <nav style={{padding:'2px 0 8px'}}>
                  {NAV.filter(n => !n.mobileOnly).map(item => (
                    <button key={item.id} onClick={() => setTab(item.id)} style={{
                      display:'flex',alignItems:'center',gap:9,width:'100%',
                      padding:'8px 14px',
                      background: tab===item.id?'rgba(29,78,216,.06)':'none',
                      border:'none',
                      borderLeft:`2px solid ${tab===item.id?'var(--blue2)':'transparent'}`,
                      color: tab===item.id?'var(--blue2)':'var(--t2)',
                      fontFamily:'var(--ff)',fontWeight:500,fontSize:12,
                      cursor:'pointer',transition:'all .15s',textAlign:'left',
                    }}
                      onMouseEnter={e => { if (tab !== item.id) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--t1)' } }}
                      onMouseLeave={e => { if (tab !== item.id) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--t2)' } }}>
                      <item.Icon size={13} c="currentColor" sw={tab===item.id?2:1.5}/>
                      <span style={{flex:1}}>{item.label}</span>
                      {item.id === 'targets' && (
                        <span style={{fontFamily:'var(--fm)',fontSize:9,
                          color:'var(--t3)',background:'var(--bg4)',padding:'0 6px',
                          borderRadius:10,lineHeight:'16px'}}>{regularVessels.length}</span>
                      )}
                    </button>
                  ))}
                </nav>
                <div style={{margin:'4px 14px',borderTop:'1px solid var(--br)'}}/>
                <div style={{padding:'10px 14px 4px',fontFamily:'var(--fm)',fontSize:8,
                  color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>
                  Map Style
                </div>
                <div style={{padding:'2px 8px 8px'}}>
                  {[['light','Light Map'],['satellite','Satellite']].map(([k, l]) => (
                    <button key={k} onClick={() => setMapMode(k)} style={{
                      display:'flex',alignItems:'center',gap:9,width:'100%',
                      padding:'7px 6px',background: mapMode===k?'var(--blue-bg)':'none',
                      border:'none',borderRadius:6,
                      borderLeft:`2px solid ${mapMode===k?'var(--blue2)':'transparent'}`,
                      color: mapMode===k?'var(--blue2)':'var(--t2)',
                      fontFamily:'var(--ff)',fontWeight:500,fontSize:12,
                      cursor:'pointer',transition:'all .15s',textAlign:'left',
                    }}
                      onMouseEnter={e => { if (mapMode !== k) e.currentTarget.style.background = 'var(--bg3)' }}
                      onMouseLeave={e => { if (mapMode !== k) e.currentTarget.style.background = 'none' }}>
                      <Ico.map size={12} c="currentColor" sw={1.5}/>{l}
                    </button>
                  ))}
                </div>
              </>
            )}
            {sideTab === 'layers' && (
              <LayersPanel vis={vis} onToggle={toggleLayer}
                vessels={regularVessels} atons={enrichedAtons} stations={stations}/>
            )}
          </div>

          <div style={{padding:'8px 14px',borderTop:'1px solid var(--br)',flexShrink:0,
            display:'flex',justifyContent:'space-between',
            fontFamily:'var(--fm)',fontSize:9,color:'var(--t3)'}}>
            <span>{regularVessels.length} vessels</span>
            <span style={{color: hiddenN>0?'var(--amber)':'var(--t3)'}}>
              {hiddenN > 0 ? `${hiddenN} hidden` : `${mapVessels.length} visible`}
            </span>
          </div>
          </div>
        </aside>

        {/* ── MAP ── */}
        <div style={{flex:1,minWidth:0,position:'relative',overflow:'hidden'}}>
          {!leftOpen && <button onClick={() => setLeftOpen(true)} title="Show sidebar"
            style={{
              position:'absolute',top:'50%',left:0,zIndex:50,transform:'translateY(-50%)',
              width:20,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'var(--bg2)',border:'1px solid var(--br)',borderLeft:'none',
              borderRadius:'0 6px 6px 0',color:'var(--t3)',cursor:'pointer',padding:0,
              boxShadow:'2px 0 6px rgba(0,0,0,.08)',
            }}
            onMouseEnter={e => e.currentTarget.style.color='var(--blue2)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}>
            <Ico.chevronR size={12} c="currentColor" sw={2}/>
          </button>}
          {!rightOpen && <button onClick={() => setRightOpen(true)} title="Show panel"
            style={{
              position:'absolute',top:'50%',right:0,zIndex:50,transform:'translateY(-50%)',
              width:20,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'var(--bg2)',border:'1px solid var(--br)',borderRight:'none',
              borderRadius:'6px 0 0 6px',color:'var(--t3)',cursor:'pointer',padding:0,
              boxShadow:'-2px 0 6px rgba(0,0,0,.08)',
            }}
            onMouseEnter={e => e.currentTarget.style.color='var(--blue2)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}>
            <Ico.chevronL size={12} c="currentColor" sw={2}/>
          </button>}
          <div style={{position:'absolute',top:10,left:10,zIndex:400,display:'flex',gap:6,alignItems:'center'}}>
            {hiddenN > 0 ? (
              <button onClick={() => setSideTab('layers')} style={{
                display:'flex',alignItems:'center',gap:5,padding:'6px 11px',
                background:'white',border:'1px solid var(--amber)',borderRadius:8,
                fontFamily:'var(--fm)',fontSize:10,color:'var(--amber)',
                cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,.1)',
              }}>
                <Ico.eyeOff size={11} c="var(--amber)" sw={1.5}/>{hiddenN} hidden
              </button>
            ) : (
              [['light','Light'],['satellite','Sat']].map(([k, l]) => (
                <button key={k} onClick={() => setMapMode(k)} style={{
                  display:'flex',alignItems:'center',gap:5,padding:'6px 11px',
                  background:'white',backdropFilter:'blur(10px)',
                  border:`1px solid ${mapMode===k?'var(--blue-br)':'rgba(0,0,0,.1)'}`,
                  borderRadius:8,color: mapMode===k?'var(--blue2)':'var(--t2)',
                  fontFamily:'var(--fm)',fontSize:10,cursor:'pointer',
                  boxShadow:'0 2px 6px rgba(0,0,0,.08)',
                }}>
                  <Ico.map size={10} c="currentColor" sw={1.5}/>{l}
                </button>
              ))
            )}
            {useMock && (
              <div style={{padding:'5px 10px',borderRadius:8,fontFamily:'var(--fm)',fontSize:9,
                background:'white',border:'1px solid rgba(217,119,6,.3)',
                color:'var(--amber)',boxShadow:'0 2px 6px rgba(0,0,0,.08)'}}>DEMO</div>
            )}
          </div>
          <ErrorBoundary>
            <MapView ref={mapRef} drone={vis.drone!==false?drone:null}
              gps={gps} tcpConns={connConfig?.tcp || []} aisTargets={mapVessels} mapMode={mapMode}/>
          </ErrorBoundary>
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside style={{width:rightOpen?panelW:0,overflow:'hidden',flexShrink:0,
          transition:'width .35s cubic-bezier(.4,0,.2,1)',background:'var(--bg2)',
          borderLeft:'1px solid var(--br)',
          display:'flex',flexDirection:'column',position:'relative'}}>
          <div style={{opacity:rightOpen?1:0,transition:'opacity .2s ease .12s',minWidth:panelW,
            display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
          {/* Collapse button */}
          <button onClick={() => setRightOpen(false)} title="Close panel"
            style={{
              position:'absolute',top:'50%',left:-12, zIndex:50, transform:'translateY(-50%)',
              width:24,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'var(--bg2)',border:'1px solid var(--br)',borderRight:'none',
              borderRadius:'6px 0 0 6px',color:'var(--t3)',cursor:'pointer',padding:0,
              boxShadow:'-2px 0 6px rgba(0,0,0,.06)',
            }}
            onMouseEnter={e => e.currentTarget.style.color='var(--blue2)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--t3)'}>
            <Ico.chevronR size={12} c="currentColor" sw={2}/>
          </button>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--br)',
            display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {curNav && <curNav.Icon size={13} c="var(--blue2)" sw={1.7}/>}
              <span style={{fontWeight:700,fontSize:13,color:'var(--t1)',letterSpacing:'-.3px'}}>
                {curNav?.label}
              </span>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center'}}>
              {NAV.filter(n => !n.mobileOnly).map(n => (
                <button key={n.id} onClick={() => setTab(n.id)} title={n.label} style={{
                  width: n.id===tab?18:6, height:6, padding:0, border:'none',
                  background: n.id===tab?'var(--blue2)':'var(--bg4)',
                  cursor:'pointer',transition:'all .2s',borderRadius:3,
                }}/>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            <PanelContent tab={tab} drone={drone} vessels={regularVessels}
              atons={enrichedAtons} stations={stations}
              mapRef={mapRef} vis={vis} toggleLayer={toggleLayer}
              tcpConns={connConfig?.tcp || []}/>
          </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
