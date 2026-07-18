import { useBlink } from '../hooks/useBlink'
import styles from './DroneCard.module.css'

const COMPASS_SIZE = 90

function CompassRose({ heading }) {
  const rad = (heading - 90) * (Math.PI / 180)
  const cx = COMPASS_SIZE / 2
  const cy = COMPASS_SIZE / 2
  const r  = COMPASS_SIZE * 0.44
  const nx = cx + r * Math.cos(rad)
  const ny = cy + r * Math.sin(rad)

  return (
    <svg width={COMPASS_SIZE} height={COMPASS_SIZE} viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}>
      <circle cx={cx} cy={cy} r={cx - 2} fill="none" stroke="rgba(0,229,255,0.18)" strokeWidth="1"/>
      <circle cx={cx} cy={cy} r={cx * 0.6} fill="none" stroke="rgba(0,229,255,0.10)" strokeWidth="1"/>
      {[['N',cx,8],['E',COMPASS_SIZE-5,cy+4],['S',cx,COMPASS_SIZE-2],['W',5,cy+4]].map(([l,x,y]) => (
        <text key={l} x={x} y={y} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="Space Mono">{l}</text>
      ))}
      <line
        x1={cx} y1={cy}
        x2={nx} y2={ny}
        stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round"
      />
      {/* Mini drone icon at center */}
      <g transform={`translate(${cx - 10}, ${cy - 10})`}>
        {/* Arms */}
        <line x1="10" y1="10" x2="3"  y2="3"  stroke="#00b8d4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="10" y1="10" x2="17" y2="3"  stroke="#00b8d4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="10" y1="10" x2="3"  y2="17" stroke="#00b8d4" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="10" y1="10" x2="17" y2="17" stroke="#00b8d4" strokeWidth="1.6" strokeLinecap="round"/>
        {/* Rotors */}
        <circle cx="3"  cy="3"  r="3"   fill="none" stroke="#00e5ff" strokeWidth="1"/>
        <circle cx="17" cy="3"  r="3"   fill="none" stroke="#00e5ff" strokeWidth="1"/>
        <circle cx="3"  cy="17" r="3"   fill="none" stroke="#00e5ff" strokeWidth="1"/>
        <circle cx="17" cy="17" r="3"   fill="none" stroke="#00e5ff" strokeWidth="1"/>
        {/* Body */}
        <rect x="7" y="7" width="6" height="6" rx="1.5" fill="#050d1a" stroke="#00e5ff" strokeWidth="1.2"/>
        <circle cx="10" cy="10" r="1.5" fill="#00e5ff"/>
      </g>
    </svg>
  )
}

export default function DroneCard({ drone }) {
  const blink = useBlink(900)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>DRONE-01 LIVE</span>
        <div className={`${styles.dot} ${blink ? styles.dotOn : styles.dotOff}`} />
      </div>

      <div className={styles.compass}>
        <CompassRose heading={drone.heading} />
      </div>

      <div className={styles.rows}>
        {[
          ['LAT',  `${drone.lat.toFixed(5)}°`],
          ['LON',  `${drone.lon.toFixed(5)}°`],
          ['ALT',  `${drone.alt.toFixed(1)} m`],
          ['BAT',  `${Math.round(drone.battery)}%`],
          ['RSSI', `${drone.rssi} dBm`],
        ].map(([k, v]) => (
          <div key={k} className={styles.row}>
            <span className={styles.rowKey}>{k}</span>
            <span className={styles.rowVal}>{v}</span>
          </div>
        ))}
      </div>

      <div className={styles.modeBadge}>{drone.mode}</div>
    </div>
  )
}
