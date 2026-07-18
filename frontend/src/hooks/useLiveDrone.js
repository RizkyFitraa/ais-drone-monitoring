import { useState, useEffect, useRef } from 'react'
import { INITIAL_DRONE } from '../data/mockData'

// Clamp helper
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

// Format elapsed time HH:MM:SS
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

/**
 * useLiveDrone
 * Simulates telemetry arriving from AIS MSG Type 8 payload decoded in real time.
 * In a real deployment, replace the interval with a WebSocket or serial port
 * listener that feeds parsed dAISy sentences into setDrone().
 */
export function useLiveDrone(intervalMs = 2000) {
  const [drone, setDrone] = useState(INITIAL_DRONE)
  const elapsedRef = useRef(14 * 60 + 32) // start at 14:32

  useEffect(() => {
    const id = setInterval(() => {
      elapsedRef.current += intervalMs / 1000

      setDrone(prev => ({
        ...prev,
        lat:        prev.lat + (Math.random() - 0.5) * 0.0003,
        lon:        prev.lon + (Math.random() - 0.5) * 0.0003,
        alt:        clamp(prev.alt + (Math.random() - 0.5) * 0.8, 0, 400),
        sog:        clamp(prev.sog + (Math.random() - 0.5) * 0.3, 0, 20),
        battery:    clamp(prev.battery - 0.015, 0, 100),
        rssi:       clamp(prev.rssi + Math.floor(Math.random() * 5 - 2), -90, -40),
        roll:       prev.roll  + (Math.random() - 0.5) * 0.4,
        pitch:      prev.pitch + (Math.random() - 0.5) * 0.3,
        vertspeed:  (Math.random() - 0.5) * 0.4,
        flighttime: formatTime(elapsedRef.current),
        distance:   Math.round(prev.distance + prev.sog * (intervalMs / 1000)),
        ts:         Date.now(),
      }))
    }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMs])

  return drone
}
