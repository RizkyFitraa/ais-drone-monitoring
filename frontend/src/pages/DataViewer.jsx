import { useState, useEffect, useCallback } from 'react'

const Poppins = "'Poppins', sans-serif"
const Mono = "'DM Mono', monospace"

const BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`

function Svg({ d, size = 14, c = 'currentColor', sw = 1.6 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
}

const Icons = {
  ship:  p => <Svg {...p} d={['M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1', 'M4 18l-1-5h14l-1 5', 'M11 13V6H8l4-4 4 4h-3v7']} />,
  drone: p => <Svg {...p} d={['M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0', 'M4.5 4.5l3 3', 'M16.5 4.5l-3 3', 'M4.5 19.5l3-3', 'M16.5 19.5l-3-3', 'M3 3h3v3H3z', 'M18 3h3v3h-3z', 'M3 18h3v3H3z', 'M18 18h3v3h-3z']} />,
  radio: p => <Svg {...p} d={['M4.9 19.1C1 15.2 1 8.8 4.9 4.9', 'M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5', 'M10.7 13.3a2 2 0 1 0 2.6 2.6L21 6l-10.3 7.3z']} />,
  globe: p => <Svg {...p} d={['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']} />,
  tower: p => <Svg {...p} d={['M12 20V10', 'M9 20h6', 'M7 13l5-4 5 4', 'M4.93 7a10 10 0 0 1 14.14 0', 'M7.76 9.76a6 6 0 0 1 8.49 0']} />,
  buoy:  p => <Svg {...p} d={['M12 2v4', 'M8 6a4 4 0 0 0 8 0', 'M9 16l-1 4h8l-1-4', 'M8 10a4 4 0 0 0 8 0']} />,
  alert: p => <Svg {...p} d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M12 8v4', 'M12 16h.01']} />,
}

const TABS = [
  { id: 'vessels',       label: 'Vessels',        Icon: Icons.ship,  endpoint: '/api/vessels' },
  { id: 'drone',         label: 'Drone',          Icon: Icons.drone, endpoint: '/api/drone?limit=200' },
  { id: 'raw',           label: 'Raw NMEA',       Icon: Icons.radio, endpoint: '/api/raw?limit=200' },
  { id: 'gps',           label: 'GPS Fix',        Icon: Icons.globe, endpoint: '/api/gps?limit=200' },
  { id: 'base-stations', label: 'Base Stations',  Icon: Icons.tower, endpoint: '/api/base-stations?limit=200' },
  { id: 'atons',         label: 'AtoN',           Icon: Icons.buoy,  endpoint: '/api/atons?limit=200' },
  { id: 'safety',        label: 'Safety',         Icon: Icons.alert, endpoint: '/api/safety?limit=200' },
]

const COLUMNS = {
  vessels: [
    { key: 'name', label: 'Name', width: 160 },
    { key: 'mmsi', label: 'MMSI', width: 120 },
    { key: 'ais_type', label: 'Type', width: 100 },
    { key: 'lat', label: 'Lat', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'lon', label: 'Lon', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'sog', label: 'SOG', width: 70, fmt: v => v != null ? v.toFixed(1) : '-' },
    { key: 'heading', label: 'Heading', width: 80, fmt: v => v != null ? `${v}°` : '-' },
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
  ],
  drone: [
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
    { key: 'lat', label: 'Lat', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'lon', label: 'Lon', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'altitude', label: 'Alt (m)', width: 80, fmt: v => v != null ? v.toFixed(0) : '-' },
    { key: 'sog', label: 'SOG', width: 70, fmt: v => v != null ? v.toFixed(1) : '-' },
    { key: 'heading', label: 'Heading', width: 80, fmt: v => v != null ? `${v}°` : '-' },
    { key: 'battery', label: 'Battery', width: 80, fmt: v => v != null ? `${v}%` : '-' },
    { key: 'mode', label: 'Mode', width: 110 },
    { key: 'satellites', label: 'Sats', width: 60 },
    { key: 'roll', label: 'Roll', width: 80, fmt: v => v != null ? `${v.toFixed(1)}°` : '-' },
    { key: 'pitch', label: 'Pitch', width: 80, fmt: v => v != null ? `${v.toFixed(1)}°` : '-' },
    { key: 'mmsi', label: 'MMSI', width: 120 },
  ],
  raw: [
    { key: 'id', label: 'ID', width: 60 },
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
    { key: 'source', label: 'Source', width: 80 },
    { key: 'raw_sentence', label: 'NMEA Sentence', width: 500 },
  ],
  gps: [
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
    { key: 'lat', label: 'Lat', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'lon', label: 'Lon', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'altitude', label: 'Alt (m)', width: 80, fmt: v => v != null ? v.toFixed(0) : '-' },
    { key: 'sat_count', label: 'Sats', width: 60 },
    { key: 'hdop', label: 'HDOP', width: 60, fmt: v => v != null ? v.toFixed(1) : '-' },
  ],
  'base-stations': [
    { key: 'mmsi', label: 'MMSI', width: 120 },
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
    { key: 'lat', label: 'Lat', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'lon', label: 'Lon', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'epfd', label: 'EPFD', width: 100 },
  ],
  atons: [
    { key: 'mmsi', label: 'MMSI', width: 120 },
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
    { key: 'name', label: 'Name', width: 200 },
    { key: 'lat', label: 'Lat', width: 100, fmt: v => v?.toFixed(4) },
    { key: 'lon', label: 'Lon', width: 100, fmt: v => v?.toFixed(4) },
  ],
  safety: [
    { key: 'recorded_at', label: 'Time', width: 170, fmt: v => v ? new Date(v).toLocaleString('id-ID') : '-' },
    { key: 'mmsi', label: 'MMSI', width: 120 },
    { key: 'msg_type', label: 'Type', width: 100 },
    { key: 'text', label: 'Message', width: 400 },
  ],
}

function formatVal(v, fmt) {
  if (v == null) return '-'
  return fmt ? fmt(v) : String(v)
}

function Table({ columns, data, onRowClick, sortKey, sortDir, onSort }) {
  return (
    <div style={{ overflowX: 'auto', flex: 1 }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontFamily: Mono, fontSize: 11,
      }}>
        <thead>
          <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
            {columns.map(col => (
              <th key={col.key} onClick={() => onSort?.(col.key)}
                style={{
                  textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 9,
                  borderBottom: '1px solid #e2e8f0', cursor: 'pointer',
                  whiteSpace: 'nowrap', minWidth: col.width || 100,
                  userSelect: 'none',
                }}>
                {col.label}
                {sortKey === col.key && (
                  <span style={{ marginLeft: 4, color: '#2563eb' }}>
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                background: i % 2 === 0 ? 'white' : '#f8fafc',
                transition: 'background 0.1s',
                borderBottom: '1px solid #f1f5f9',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#f8fafc'}>
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '6px 10px', color: '#334155', whiteSpace: 'nowrap',
                  maxWidth: col.width || 200, overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {formatVal(row[col.key], col.fmt)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{
                textAlign: 'center', padding: '40px 20px', color: '#94a3b8',
                fontFamily: Poppins, fontSize: 13,
              }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function DetailModal({ row, columns, onClose }) {
  if (!row) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 500, fontFamily: Poppins,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 16, width: 520, maxWidth: '90vw',
        maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        padding: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
            {row.mmsi ? `MMSI ${row.mmsi}` : `Record #${row.id || '?'}`}
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: '#f1f5f9', color: '#64748b', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {columns.map(col => (
            <div key={col.key} style={{
              display: 'flex', padding: '6px 0', borderBottom: '1px solid #f1f5f9',
              fontFamily: Mono, fontSize: 11,
            }}>
              <span style={{ width: 140, flexShrink: 0, color: '#94a3b8', fontWeight: 500 }}>
                {col.label}
              </span>
              <span style={{ color: '#0f172a', wordBreak: 'break-all' }}>
                {formatVal(row[col.key], col.fmt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DataViewer({ onBack }) {
  const [tab, setTab] = useState('vessels')
  const [data, setData] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [detail, setDetail] = useState(null)
  const [visible, setVisible] = useState(!document.hidden)
  const PAGE_SIZE = 50

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const abort = new AbortController()
    try {
      const t = TABS.find(t => t.id === tab)
      const r = await fetch(`${BASE}${t.endpoint}`, { signal: abort.signal })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || r.statusText) }
      const j = await r.json()
      if (!abort.signal.aborted) setData(Array.isArray(j) ? j : [])
    } catch (e) {
      if (e.name !== 'AbortError') { setError(e.message); setData([]) }
    }
    if (!abort.signal.aborted) setLoading(false)
    return () => abort.abort()
  }, [tab])

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/stats`)
      if (r.ok) setStats(await r.json())
    } catch {}
  }, [])

  // Auto-refresh: polling 5s, pause saat tab hidden, resume saat visible
  useEffect(() => {
    fetchData()
    const id = setInterval(() => { if (visible) fetchData() }, 5000)
    return () => clearInterval(id)
  }, [fetchData, visible])

  // Stats refresh setiap 30s
  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 30000)
    return () => clearInterval(id)
  }, [fetchStats])

  // Visibility tracking — pause polling ketika tab tidak aktif
  useEffect(() => {
    const h = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])

  useEffect(() => { setPage(0); setSearch(''); setSortKey(null) }, [tab])

  const filtered = data.filter(row => {
    if (!search) return true
    const q = search.toLowerCase()
    return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
  })

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0
    const va = a[sortKey], vb = b[sortKey]
    if (va == null) return 1; if (vb == null) return -1
    if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va
    return sortDir === 'asc'
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va))
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const columns = COLUMNS[tab] || []

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#f8fafc', fontFamily: Poppins, overflow: 'hidden',
    }}>
      {/* Topbar */}
      <header style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        background: 'white', borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', border: '1px solid #e2e8f0', background: 'transparent',
            color: '#475569', fontSize: 12, cursor: 'pointer', borderRadius: 8,
            fontFamily: Poppins,
          }}>
            ← Back
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
            Database Explorer
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: visible ? 'rgba(5,150,105,.1)' : '#f1f5f9',
            border: `1px solid ${visible ? 'rgba(5,150,105,.25)' : '#e2e8f0'}`,
            fontFamily: Poppins, fontSize: 10, fontWeight: 600,
            color: visible ? '#059669' : '#94a3b8',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: visible ? '#059669' : '#cbd5e1',
              boxShadow: visible ? '0 0 0 3px rgba(5,150,105,.2)' : 'none',
              animation: visible ? 'dv-pulse 2s ease-in-out infinite' : 'none',
            }}/>
            {visible ? 'LIVE' : 'PAUSED'}
          </div>
          <span style={{ fontFamily: Mono, fontSize: 9, color: '#94a3b8' }}>
            {loading ? 'updating...' : '5s'}
          </span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <aside style={{
          width: 180, flexShrink: 0, background: 'white',
          borderRight: '1px solid #e2e8f0', overflowY: 'auto',
          padding: '8px 0',
        }}>
          <div style={{
            padding: '8px 14px 4px', fontSize: 9, fontWeight: 600,
            color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            Data Tables
          </div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 14px', border: 'none', background: tab === t.id ? '#eef2ff' : 'transparent',
              borderLeft: `3px solid ${tab === t.id ? '#2563eb' : 'transparent'}`,
              color: tab === t.id ? '#2563eb' : '#475569',
              fontSize: 12, cursor: 'pointer', textAlign: 'left',
              fontFamily: Poppins, fontWeight: tab === t.id ? 600 : 400,
            }}>
              <t.Icon size={14} c={tab === t.id ? '#2563eb' : '#64748b'} sw={1.6}/>
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Stats bar */}
          {stats && (
            <div style={{
              display: 'flex', gap: 8, padding: '10px 14px',
              borderBottom: '1px solid #e2e8f0', overflowX: 'auto',
              flexShrink: 0, background: 'white',
            }}>
              {Object.entries(stats).map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', background: '#f8fafc', borderRadius: 8,
                  border: '1px solid #e2e8f0', whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', fontFamily: Mono }}>
                    {v >= 0 ? v : '?'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Search + Controls */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderBottom: '1px solid #e2e8f0',
            background: 'white', flexShrink: 0,
          }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder={`Filter ${TABS.find(t => t.id === tab)?.label || 'data'}...`}
              style={{
                flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 12, fontFamily: Poppins, color: '#0f172a',
                outline: 'none', background: '#f8fafc',
              }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: Mono, whiteSpace: 'nowrap' }}>
              {sorted.length} records
            </span>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {loading && <div style={{
              position: 'sticky', top: 0, zIndex: 5, height: 2,
              background: 'linear-gradient(90deg,#2563eb,#60a5fa,#2563eb)',
              backgroundSize: '200% 100%',
              animation: 'dv-shimmer 1s linear infinite',
            }}/>}
            {error && (
              <div style={{
                padding: '20px', textAlign: 'center', color: '#dc2626', fontSize: 13,
              }}>
                {error}
              </div>
            )}
            <Table columns={columns} data={paged}
              onRowClick={setDetail}
              sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', borderTop: '1px solid #e2e8f0',
            background: 'white', flexShrink: 0, gap: 8,
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: Mono }}>
              Page {page + 1} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(0)} disabled={page === 0} style={{
                padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: page === 0 ? '#f1f5f9' : 'white', color: page === 0 ? '#cbd5e1' : '#475569',
                cursor: page === 0 ? 'default' : 'pointer', fontSize: 10, fontFamily: Poppins,
              }}>First</button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{
                padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: page === 0 ? '#f1f5f9' : 'white', color: page === 0 ? '#cbd5e1' : '#475569',
                cursor: page === 0 ? 'default' : 'pointer', fontSize: 10,
              }}>Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{
                padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: page >= totalPages - 1 ? '#f1f5f9' : 'white',
                color: page >= totalPages - 1 ? '#cbd5e1' : '#475569',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 10,
              }}>Next</button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} style={{
                padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
                background: page >= totalPages - 1 ? '#f1f5f9' : 'white',
                color: page >= totalPages - 1 ? '#cbd5e1' : '#475569',
                cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 10,
              }}>Last</button>
            </div>
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      {detail && <DetailModal row={detail} columns={columns} onClose={() => setDetail(null)} />}
    </div>
  )
}
