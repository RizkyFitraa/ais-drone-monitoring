import { useState, useEffect, useRef, useCallback } from 'react'
import { INITIAL_DRONE, INITIAL_AIS_TARGETS } from '../data/mockData'
import { sanitizeDrone, sanitizeVessel, sanitizeSAR } from '../utils/sanitize'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
const MAX_RAW_LINES = 80

export function useAISConnection() {
  const wsRef    = useRef(null)
  const retryRef = useRef(null)

  const [wsState,    setWsState]    = useState('closed')
  const [drone,      setDrone]      = useState(() => sanitizeDrone(INITIAL_DRONE))
  const [vessels,    setVessels]    = useState(() => {
    const m = {}
    INITIAL_AIS_TARGETS.forEach(v => { m[v.mmsi] = sanitizeVessel(v) })
    return m
  })
  const [rawLines,   setRawLines]   = useState([])
  const [status,     setStatus]     = useState({
    serial: { connected: false, rx: 0 },
    tcp:    { connected: false, rx: 0 },
    udp:    { listening: false, rx: 0 },
  })
  const [connConfig, setConnConfig] = useState(null)
  const [useMock,    setUseMock]    = useState(true)

  // Mock live update — aktif saat WS tidak terhubung
  useEffect(() => {
    if (!useMock) return
    const id = setInterval(() => {
      setDrone(prev => sanitizeDrone({
        ...prev,
        lat:     prev.lat + (Math.random() - 0.5) * 0.0003,
        lon:     prev.lon + (Math.random() - 0.5) * 0.0003,
        alt:     Math.max(0, prev.alt + (Math.random() - 0.5) * 0.8),
        battery: Math.max(0, prev.battery - 0.015),
        rssi:    Math.min(-40, Math.max(-90, prev.rssi + Math.floor(Math.random() * 5 - 2))),
        ts:      Date.now(),
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [useMock])

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return

    setWsState('connecting')
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setWsState('open')
      setUseMock(false)
      ws.send(JSON.stringify({ cmd: 'getConfig' }))
      ws.send(JSON.stringify({ cmd: 'getStatus' }))
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      try {
        switch (msg.event) {

          case 'drone':
            setDrone(prev => sanitizeDrone({ ...prev, ...msg.data }))
            break

          case 'sar':
            setVessels(prev => {
              const next = { ...prev }
              const safe = sanitizeSAR({ ...prev[msg.data?.mmsi], ...msg.data })
              next[safe.mmsi] = safe
              return next
            })
            break

          case 'vessel':
            setVessels(prev => {
              const next = { ...prev }
              const mmsi = msg.data?.mmsi
              if (!mmsi) return prev
              const safe = sanitizeVessel({ ...prev[mmsi], ...msg.data })
              next[safe.mmsi] = safe
              return next
            })
            break

          case 'raw':
            if (msg.data?.sentence) {
              setRawLines(prev =>
                [`[${msg.data.source || '?'}] ${msg.data.sentence}`, ...prev].slice(0, MAX_RAW_LINES)
              )
            }
            break

          case 'status':
            setStatus(msg.data || {})
            break

          case 'config':
            setConnConfig(msg.data)
            break

          case 'error':
            console.warn('[AIS]', msg.data?.source, msg.data?.message)
            break

          default:
            break
        }
      } catch (err) {
        console.error('[WS] Handler error:', err, 'msg:', msg)
      }
    }

    ws.onerror = () => setWsState('error')

    ws.onclose = () => {
      setWsState('closed')
      setUseMock(true)
      retryRef.current = setTimeout(connect, 5000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendCmd = useCallback((cmd) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd))
    }
  }, [])

  const applyConfig = useCallback((cfg) => {
    sendCmd({ cmd: 'setConfig', config: cfg })
  }, [sendCmd])

  return {
    drone,
    vessels: Object.values(vessels),
    rawLines,
    status,
    connConfig,
    wsState,
    useMock,
    sendCmd,
    applyConfig,
    wsRef,
  }
}
