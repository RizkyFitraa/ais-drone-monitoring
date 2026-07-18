// SVG architecture diagram: Drone → AIS TX → dAISy → Backend → Dashboard

const NODES = [
  { x: 50,  y: 40,  w: 130, h: 52, label: 'Drone + GPS',    sub: 'Sensor & FC',       color: 'var(--amber)' },
  { x: 330, y: 40,  w: 140, h: 52, label: 'AIS Transmitter',sub: 'VHF 162 MHz',        color: 'var(--cyan)'  },
  { x: 610, y: 40,  w: 130, h: 52, label: 'dAISy Receiver', sub: 'NMEA AIVDM',         color: 'var(--green)' },
  { x: 330, y: 188, w: 140, h: 52, label: 'Backend Parser',  sub: 'MSG Type 8 Decode',  color: 'var(--cyan)'  },
  { x: 330, y: 330, w: 140, h: 52, label: 'Dashboard',       sub: 'React Frontend',     color: 'var(--amber)' },
  // extra: vessel node (dashed)
  { x: 50,  y: 200, w: 130, h: 52, label: 'Kapal AIS',       sub: 'Class A / B',        color: 'var(--muted)', dashed: true },
]

const EDGES = [
  // Drone → AIS TX
  { x1:180, y1:66,  x2:326, y2:66,  label:'MSG Type 8', pos:[253,56] },
  // AIS TX → dAISy
  { x1:470, y1:66,  x2:606, y2:66,  label:'RF VHF',     pos:[538,56] },
  // dAISy → Backend (L-shape via path)
  { type:'path', d:'M675,92 L675,164 L470,164 L470,188', label:'NMEA AIVDM', pos:[572,158] },
  // Backend → Dashboard
  { x1:400, y1:240, x2:400, y2:326, label:'JSON',        pos:[415,288] },
  // Vessel → dAISy (dashed)
  { type:'path', d:'M180,226 Q340,160 400,188', label:'AIS Std', pos:[280,180], dashed:true },
]

export default function ArchDiagram() {
  return (
    <svg
      width="100%"
      viewBox="0 0 820 420"
      style={{ maxWidth: 820, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <marker id="arrowCyan" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--cyan2)" />
        </marker>
        <marker id="arrowMuted" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="var(--muted)" />
        </marker>
      </defs>

      {/* Nodes */}
      {NODES.map((n) => (
        <g key={n.label}>
          <rect
            x={n.x} y={n.y} width={n.w} height={n.h} rx={8}
            fill="var(--navy3)"
            stroke={n.color}
            strokeWidth="1.5"
            strokeDasharray={n.dashed ? '6,4' : 'none'}
          />
          <text x={n.x + n.w / 2} y={n.y + 22} textAnchor="middle"
            fill={n.color} fontSize="13" fontFamily="poppins" fontWeight="700">{n.label}</text>
          <text x={n.x + n.w / 2} y={n.y + 38} textAnchor="middle"
            fill="var(--muted)" fontSize="10" fontFamily="poppins">{n.sub}</text>
        </g>
      ))}

      {/* Edges */}
      {EDGES.map((e, i) => {
        const isD = e.dashed
        const marker = isD ? 'url(#arrowMuted)' : 'url(#arrowCyan)'
        const stroke = isD ? 'var(--muted)' : 'var(--cyan2)'
        const dashArr = isD ? '5,4' : '6,3'
        return (
          <g key={i}>
            {e.type === 'path'
              ? <path d={e.d} fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray={dashArr} markerEnd={marker}/>
              : <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={stroke} strokeWidth="1.5" strokeDasharray={dashArr} markerEnd={marker}/>
            }
            {e.label && (
              <text x={e.pos[0]} y={e.pos[1]} textAnchor="middle"
                fill="var(--muted)" fontSize="10" fontFamily="poppins">{e.label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
