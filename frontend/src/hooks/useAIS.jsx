  import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
  import { INITIAL_DRONE, INITIAL_AIS_TARGETS } from '../data/mockData.jsx'
  import { sanitizeDrone, sanitizeVessel, sanitizeSAR, sanitizeGPS } from '../utils/helpers.jsx'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const DRONE_TIMEOUT = 30000

const INITIAL_STATION = {
  mmsi: '005250052',
  name: 'PPNS AIS STATION',
  lat: -7.27895,
  lon: 112.79506,
  year: 2025, month: 1, day: 1,
  hour: 0, minute: 0, second: 0,
  epfd: 'GPS',
  posAccuracy: true,
  raim: false,
  ts: Date.now(),
}

function makeInitialVessels() {
  const m = {}
  INITIAL_AIS_TARGETS.forEach(v => {
    m[v.mmsi] = v.type === 'SAR Aircraft' ? sanitizeSAR(v) : sanitizeVessel(v)
  })
  return m
}

function makeInitialStations() {
  return { '005250052': { ...INITIAL_STATION, type: 'Base Station' } }
}

  function loadSavedStatus() {
    try {
      const s = localStorage.getItem('ais-status')
      return s ? JSON.parse(s) : null
    } catch { return null }
  }
  const DEF_STATUS = { serial:{connected:false,rx:0}, tcp:{connected:false,rx:0}, udp:{listening:false,rx:0} }

  export function useAIS() {
    const wsRef         = useRef(null)
    const retryRef      = useRef(null)
    const droneTimerRef = useRef(null)
    const manualClose   = useRef(false)

    const [wsState,    setWsState]    = useState('closed')
    const [useMock,    setUseMock]    = useState(true)
    const [drone,      setDrone]      = useState(null)
    const [vessels,    setVessels]    = useState(() => makeInitialVessels())
    const [atons,      setAtons]      = useState({})
    const [stations,   setStations]   = useState(() => makeInitialStations())
    const [gps,        setGps]        = useState(null)
    const [rawLines,   setRawLines]   = useState([])
    const [status,     setStatus]     = useState(() => loadSavedStatus() || DEF_STATUS)
    const [connConfig, setConnConfig] = useState(null)

    // ── Independent clock — always ticks every second ─────────────────────────
    const clockRef = useRef(new Date().toLocaleTimeString('id-ID'))
    useEffect(() => {
      const id = setInterval(() => { clockRef.current = new Date().toLocaleTimeString('id-ID') }, 1000)
      return () => clearInterval(id)
    }, [])

    // ── Persist connection status to localStorage ──────────────────────────────
    useEffect(() => { localStorage.setItem('ais-status', JSON.stringify(status)) }, [status])

    // ── Mock live update ───────────────────────────────────────────────────────
    useEffect(() => {
      if (!useMock) return
      const id = setInterval(() => {
        setDrone(p => {
          const base = p && p.lat != null ? p : INITIAL_DRONE
          return sanitizeDrone({
            ...base,
            lat:     base.lat + (Math.random() - .5) * .0003,
            lon:     base.lon + (Math.random() - .5) * .0003,
            alt:     Math.max(0, base.alt + (Math.random() - .5) * .8),
            battery: Math.max(0, base.battery - .015),
            rssi:    Math.min(-40, Math.max(-90, base.rssi + Math.floor(Math.random() * 5 - 2))),
            roll:    base.roll  + (Math.random() - .5) * 2,
            pitch:   base.pitch + (Math.random() - .5) * 1.5,
            yaw:     ((base.yaw + (Math.random() - .5) * 3) + 360) % 360,
          })
        })
      }, 1000)
      return () => clearInterval(id)
    }, [useMock])

    // ── Mock vessel movement ───────────────────────────────────────────────────
    useEffect(() => {
      if (!useMock) return
      const id = setInterval(() => {
        setVessels(prev => {
          const next = { ...prev }
          Object.values(next).forEach(v => {
            if (!v || v.type === 'SAR Aircraft' || Number(v.sog) < 0.3) return
            const cogRad = (Number(v.cog) * Math.PI) / 180
            const speed  = Number(v.sog) * 0.00000015  // ~1 pixel at zoom 13
            next[v.mmsi] = {
              ...v,
              lat: v.lat + Math.cos(cogRad) * speed,
              lon: v.lon + Math.sin(cogRad) * speed,
              ts: Date.now(),
            }
          })
          return next
        })
      }, 2000)
      return () => clearInterval(id)
    }, [useMock])

    const connect = useCallback(() => {
      // Don't reconnect if manually closed
      if (manualClose.current) return
      if (wsRef.current && wsRef.current.readyState < 2) return

      setWsState('connecting')
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setWsState('open')
        setUseMock(false)
        ws.send(JSON.stringify({ cmd:'getConfig' }))
        ws.send(JSON.stringify({ cmd:'getStatus' }))
      }
      const h = (ev, data) => {
        if (ev==='drone') {
          setDrone(() => data ? sanitizeDrone(data) : null)
          clearTimeout(droneTimerRef.current)
          if (data) droneTimerRef.current = setTimeout(() => setDrone(null), DRONE_TIMEOUT)
          return
        }
        if (ev==='vessel') {
          setVessels(p => {
            const n={...p}, v=data
            if (!v?.mmsi) return p
            n[v.mmsi] = sanitizeVessel({ ...p[v.mmsi], ...v })
            return n
          }); return
        }
        if (ev==='sar') {
          setVessels(p => {
            const n={...p}, v=data
            if (!v?.mmsi) return p
            n[v.mmsi] = sanitizeSAR({ ...p[v.mmsi], ...v })
            return n
          }); return
        }
        if (ev==='aton') {
          setAtons(p => { const n={...p}, v=data; if(!v?.mmsi) return p; n[v.mmsi]={...(p[v.mmsi]||{}),...v,type:'AtoN'}; return n }); return
        }
        if (ev==='station') {
          setStations(p => { const n={...p}, v=data; if(!v?.mmsi) return p; n[v.mmsi]={...(p[v.mmsi]||{}),...v,type:'Base Station'}; return n }); return
        }
        if (ev==='vesselRemoved') {
          setVessels(p => { if (!data?.mmsi) return p; const n={...p}; delete n[data.mmsi]; return n }); return
        }
        if (ev==='atonRemoved') {
          setAtons(p => { if (!data?.mmsi) return p; const n={...p}; delete n[data.mmsi]; return n }); return
        }
        if (ev==='stationRemoved') {
          setStations(p => { if (!data?.mmsi) return p; const n={...p}; delete n[data.mmsi]; return n }); return
        }
        if (ev==='error') { console.warn('[AIS]', data?.source, data?.message || data); return }
        if (ev==='raw' && data?.sentence) {
          setRawLines(p => [`[${data.source||'?'}] ${new Date().toLocaleTimeString('id-ID')} ${data.sentence}`, ...p].slice(0, 100)); return
        }
        if (ev==='status') { setStatus(data||{}); return }
        if (ev==='config') { setConnConfig(data); return }
        if (ev==='gps') { setGps(data ? sanitizeGPS(data) : null); return }
      }
      ws.onmessage = (e) => {
        let msg; try { msg = JSON.parse(e.data) } catch { return }
        try {
          if (msg.event === 'batch') {
            if (!Array.isArray(msg.data)) return
            for (const sub of msg.data) h(sub.event, sub.data)
          } else {
            h(msg.event, msg.data)
          }
        } catch (err) { console.error('[WS]', err) }
      }
      ws.onerror = () => setWsState('error')
      ws.onclose = () => {
        setWsState('closed')
        clearTimeout(droneTimerRef.current)
        if (!manualClose.current) {
          setVessels(makeInitialVessels())
          setAtons({})
          setStations(makeInitialStations())
          setGps(null)
          setRawLines([])
          setUseMock(true)
          retryRef.current = setTimeout(connect, 5000)
        }
      }
    }, [])

    useEffect(() => {
      manualClose.current = false
      connect()
      return () => {
        manualClose.current = true
        clearTimeout(retryRef.current)
        clearTimeout(droneTimerRef.current)
        wsRef.current?.close()
      }
    }, [connect])

    const sendCmd = useCallback((cmd) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(cmd))
    }, [])

    const applyConfig = useCallback(cfg => sendCmd({ cmd:'setConfig', config:cfg }), [sendCmd])

    const vesselList = useMemo(() => Object.values(vessels), [vessels])
    const atonList   = useMemo(() => Object.values(atons), [atons])
    const stationList= useMemo(() => Object.values(stations), [stations])
    const now = clockRef.current

    return { drone, now, gps,
      vessels: vesselList,
      atons: atonList, stations: stationList,
      rawLines, status, connConfig, wsState, useMock,
      sendCmd, applyConfig, wsRef }
  }

  
