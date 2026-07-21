import { useState, useEffect, useRef } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint.jsx'

/* ═══════════════════════════════════
   GLOBAL CSS — injected once
═══════════════════════════════════ */
const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  /* ── keyframes ── */
  @keyframes lp-fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lp-fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes lp-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes lp-ping    { 0%{box-shadow:0 0 0 0 rgba(5,150,105,.55)} 70%{box-shadow:0 0 0 9px rgba(5,150,105,0)} 100%{box-shadow:0 0 0 0 rgba(5,150,105,0)} }
  @keyframes lp-blink   { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes lp-slide   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }

  /* ── hero layout ── */
  .lp-hero {
    min-height: 100vh;
    padding: 100px 64px 80px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 64px;
    background-image:
    linear-gradient(rgba(0, 21, 180, 0.03) 1px, transparent 3px),
    linear-gradient(90deg, rgba(0, 21, 180, 0.03) 1px, transparent 3px);
    background-size: 60px 60px;
    pointer-events: auto;
  }
  .lp-hero-l {
    flex: 1 1 0;
    min-width: 0;
    animation: lp-fadeUp .7s ease both;
  }
  .lp-hero-r {
    flex-shrink: 0;
    width: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    animation: lp-fadeUp .8s .2s ease both;
  }
  .lp-float-cards { display: block; }

  /* ── grids ── */
  .lp-feat-grid  { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .lp-steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; position:relative; z-index:1; }
  .lp-src-grid   { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }

  /* ── tablet 768–1023 ── */
  @media (max-width: 1023px) {
    .lp-hero { flex-direction:column; padding:88px 36px 64px; gap:28px; align-items:flex-start; }
    .lp-hero-r { width:300px; align-self:center; }
    .lp-float-cards { display:none !important; }
    .lp-feat-grid  { grid-template-columns:repeat(2,1fr); }
    .lp-steps-grid { grid-template-columns:repeat(2,1fr); gap:14px; }
    .lp-src-grid   { grid-template-columns:repeat(2,1fr); }
  }

  /* ── mobile < 768 ── */
  @media (max-width: 767px) {
    .lp-hero { padding:82px 20px 56px; gap:40px; }
    .lp-hero-r { width:100%; max-width:300px; }
    .lp-feat-grid  { grid-template-columns:1fr; }
    .lp-steps-grid { grid-template-columns:repeat(2,1fr); gap:12px; }
    .lp-src-grid   { grid-template-columns:1fr; }
  }

  /* ── interactive ── */
  .lp-card { transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease; }
  .lp-card:hover { transform: translateY(-6px) !important; box-shadow: 0 16px 40px rgba(29,78,216,.15) !important; }
  .lp-btn-p {
    display:inline-flex; align-items:center; gap:9px;
    background: linear-gradient(5deg, #5ab8fc, #0396FF);
    color:white; border:none; border-radius:12px;
    font-family:'Syne',sans-serif; font-weight:700; cursor:pointer; letter-spacing:-.1px;
    box-shadow:0 4px 18px rgba(37,99,235,.28);
    transition: opacity .18s, transform .18s;
  }
  .lp-btn-p:hover  { opacity:.88; transform:translateY(-1px); }
  .lp-btn-o {
    display:inline-flex; align-items:center; gap:7px;
    background:white; border:1.5px solid rgba(0,0,0,.12); border-radius:12px;
    font-family:'Syne',sans-serif; font-weight:600; color: #0f172a; cursor:pointer;
    box-shadow:0 1px 4px rgba(0,0,0,.06);
    transition: border-color .15s, color .15s, transform .18s;
  }
  .lp-btn-o:hover { border-color:#2563eb; color:#2563eb; transform:translateY(-1px); }
  .lp-nav-a { color:#475569; font-size:14px; font-weight:500; text-decoration:none; transition:color .15s; }
  .lp-nav-a:hover { color:#0f172a; }
  .lp-chip {
    font-family:'poppins',monospace; font-size:10px; padding:3px 9px;
    border-radius:5px; background:white; border:1px solid rgba(0,0,0,.09);
    color:#475569; letter-spacing:.3px; box-shadow:0 1px 3px rgba(0,0,0,.05);
  }
  .lp-tag {
    font-family:'DM Mono',monospace; font-size:8px; padding:2px 7px;
    border-radius:4px; background:rgba(29,78,216,.06);
    border:1px solid rgba(29,78,216,.15); color:#2563eb; letter-spacing:.3px;
  }
`

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

let CSS_DONE = false
function injectCSS() {
  if (CSS_DONE) return; CSS_DONE = true
  const s = document.createElement('style')
  s.textContent = PAGE_CSS
  document.head.appendChild(s)
}

/* ═══════════════════════════════════
   TEXTURE BG
═══════════════════════════════════ */
function Bg({ children, c = '#f7f8fa', extra = {} }) {
  return (
    <div style={{ position:'relative', background:c, ...extra }}>
      {/* dot grid */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:'radial-gradient(rgba(29,78,216,.11) 1px, transparent 1px)',
        backgroundSize:'28px 28px',
        maskImage:'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%)',
        WebkitMaskImage:'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%)',
      }}/>
      {/* noise */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:NOISE, backgroundRepeat:'repeat', opacity:1,
      }}/>
      {/* blobs */}
      <div style={{
        position:'absolute', pointerEvents:'none',
        top:'-15%', right:'0%', width:'50%', height:'80%', borderRadius:'50%',
        background:'radial-gradient(ellipse,rgba(37,99,235,.07) 0%,transparent 65%)',
      }}/>
      <div style={{
        position:'absolute', pointerEvents:'none',
        bottom:'-5%', left:'-5%', width:'38%', height:'55%', borderRadius:'50%',
        background:'radial-gradient(ellipse,rgba(13,148,136,.06) 0%,transparent 65%)',
      }}/>
      <div style={{ position:'relative', zIndex:1 }}>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════
   RADAR CANVAS
═══════════════════════════════════ */
function Radar({ size = 400 }) {
  const cvRef = useRef(null)
  const st    = useRef({
    angle: 0,
    blips: [
      { ax:.58, ay:.30, a:0, label:'DRONE-01' },
      { ax:.78, ay:.53, a:0, label:'KM TANTO' },
      { ax:.36, ay:.70, a:0, label:'SAR HELI' },
      { ax:.66, ay:.80, a:0, label:'KMN BERKAH' },
      { ax:.83, ay:.40, a:0, label:'KM PELNI' },
    ]
  })

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')
    const S = size, R = S / 2 - 4, CX = S / 2, CY = S / 2
    const SPAN = Math.PI * .44
    let raf

    function draw() {
      st.current.angle += 0.013
      const { angle, blips } = st.current
      ctx.clearRect(0, 0, S, S)

      // clip
      ctx.save()
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.clip()

      // bg
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, R)
      bg.addColorStop(0,   'rgba(238,242,255,1)')
      bg.addColorStop(.9,  'rgba(220,228,255,1)')
      bg.addColorStop(1,   'rgba(205,215,255,1)')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

      // rings
      ;[.25,.5,.75,1].forEach((r, i) => {
        ctx.beginPath(); ctx.arc(CX, CY, R*r, 0, Math.PI*2)
        ctx.strokeStyle = `rgba(29,78,216,${.04+i*.02})`
        ctx.lineWidth = i===3 ? 2 : .7; ctx.stroke()
      })

      // cross
      ctx.strokeStyle = 'rgba(29,78,216,.07)'; ctx.lineWidth = .8
      ;[0, Math.PI*.5, Math.PI*.25, Math.PI*.75].forEach((a, i) => {
        if (i > 1) { ctx.setLineDash([2,5]) } else { ctx.setLineDash([]) }
        ctx.beginPath()
        ctx.moveTo(CX+Math.cos(a)*R, CY+Math.sin(a)*R)
        ctx.lineTo(CX+Math.cos(a+Math.PI)*R, CY+Math.sin(a+Math.PI)*R)
        ctx.stroke()
      })
      ctx.setLineDash([])

      // sweep fan — 16 segments for smooth gradient
      ctx.save()
      ctx.translate(CX, CY); ctx.rotate(angle)
      for (let i = 0; i < 16; i++) {
        const t = i / 16
        const a1 = -SPAN + t * SPAN
        const a2 = -SPAN + (t+1) * SPAN
        ctx.beginPath(); ctx.moveTo(0,0)
        ctx.arc(0, 0, R, a1, a2); ctx.closePath()
        ctx.fillStyle = `rgba(29,78,216,${t*t*.2})`; ctx.fill()
      }
      // leading line glow
      ctx.shadowColor = 'rgba(37,99,235,.5)'; ctx.shadowBlur = 5
      ctx.strokeStyle = 'rgba(37,99,235,.8)'; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(R,0); ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()

      // blips
      blips.forEach(b => {
        const bx = CX + (b.ax-.5)*2*R
        const by = CY + (b.ay-.5)*2*R
        const ba = Math.atan2(by-CY, bx-CX)
        const diff = ((angle-ba)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)
        b.a = diff < SPAN ? Math.min(1, b.a+.14) : Math.max(0, b.a-.02)

        if (b.a > .02) {
          ctx.beginPath(); ctx.arc(bx, by, 4+9*(1-b.a), 0, Math.PI*2)
          ctx.strokeStyle = `rgba(37,99,235,${b.a*.25})`; ctx.lineWidth=1; ctx.stroke()

          ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI*2)
          ctx.fillStyle = `rgba(37,99,235,${b.a})`
          ctx.shadowColor = 'rgba(37,99,235,.6)'; ctx.shadowBlur = b.a>.5 ? 6 : 0
          ctx.fill(); ctx.shadowBlur = 0

          if (b.a > .4) {
            ctx.fillStyle = `rgba(15,23,42,${b.a*.65})`
            ctx.font = '500 7px DM Mono,monospace'
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
            ctx.fillText(b.label, bx+7, by-1)
          }
        }
      })

      ctx.restore() // end clip

      // center dot
      ctx.beginPath(); ctx.arc(CX, CY, 4.5, 0, Math.PI*2)
      ctx.fillStyle = '#1d4ed8'
      ctx.shadowColor = 'rgba(29,78,216,.6)'; ctx.shadowBlur = 8
      ctx.fill(); ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(CX, CY, 8, 0, Math.PI*2)
      ctx.strokeStyle = 'rgba(29,78,216,.2)'; ctx.lineWidth=1.5; ctx.stroke()

      // compass labels
      ctx.font = '600 9px DM Mono,monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ;[['N',CX,CY-R+13,true],['S',CX,CY+R-13,false],
        ['E',CX+R-13,CY,false],['W',CX-R+13,CY,false]].forEach(([l,x,y,red]) => {
        ctx.fillStyle = red ? 'rgba(220,38,38,.72)' : 'rgba(29,78,216,.48)'
        ctx.fillText(l,x,y)
      })

      // outer border
      ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2)
      ctx.strokeStyle='rgba(29,78,216,.2)'; ctx.lineWidth=2; ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <canvas ref={cvRef} width={size} height={size} style={{
      display:'block', borderRadius:'50%', maxWidth:'100%', flexShrink:0,
      boxShadow:'0 8px 40px rgba(29,78,216,.18), 0 2px 8px rgba(0,0,0,.08)',
    }}/>
  )
}

/* ═══════════════════════════════════
   TERMINAL
═══════════════════════════════════ */
const NMEA = [
  { c:'#64748b', t:'# AIS Monitor — connected' },
  { c:'#2563eb', t:'[MSG 8] DRONE-01  alt:92m  bat:82%' },
  { c:'#0d9488', t:'[MSG 1] KM TANTO HARI  sog:7.8kn  092°' },
  { c:'#d97706', t:'[MSG18] KMN BERKAH  sog:3.1kn  Class B' },
  { c:'#ea580c', t:'[MSG 9] HELI BASARNAS  alt:320m  SAR' },
  { c:'#2563eb', t:'[MSG 8] DRONE-01  roll:1.5°  LOITER' },
  { c:'#059669', t:'[INFO]  29 vessels · 5 SAR · 168bit' },
]

function Terminal() {
  const [lines, setLines] = useState([0])
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const b = setInterval(() => setBlink(v => !v), 520)
    const l = setInterval(() => {
      setLines(p => p.length >= NMEA.length ? [0] : [...p, p.length])
    }, 1150)
    return () => { clearInterval(b); clearInterval(l) }
  }, [])

  return (
    <div style={{
      background:'white', borderRadius:12, width:'70%',
      border:'1px solid rgba(0,0,0,.08)',
      boxShadow:'0 4px 20px rgba(0,0,0,.08)', overflow:'hidden',
      fontFamily:"'DM Mono',monospace",
    }}>
      {/* titlebar */}
      <div style={{
        padding:'9px 14px', background:'#f8faff',
        borderBottom:'1px solid rgba(0,0,0,.06)',
        display:'flex', alignItems:'center', gap:6,
      }}>
        {['#f87171','#fbbf24','#34d399'].map((c,i) => (
          <div key={i} style={{width:10,height:10,borderRadius:'50%',background:c}}/>
        ))}
        <span style={{marginLeft:8,fontSize:10,color:'#94a3b8',letterSpacing:'.5px'}}>
          dAISy — NMEA Stream
        </span>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',
            animation:'lp-ping 2s ease-in-out infinite'}}/>
          <span style={{fontSize:9,color:'#059669'}}>LIVE</span>
        </div>
      </div>
      {/* lines */}
      <div style={{
        padding:'12px 14px', background:'rgba(248,250,255,.96)',
        minHeight:144, overflow:'hidden',
      }}>
        {lines.map((idx, pos) => {
          const l    = NMEA[idx]
          const last = pos === lines.length - 1
          return (
            <div key={pos} style={{
              fontSize:10.5, lineHeight:1.85, color:l.c,
              display:'flex', alignItems:'center', gap:6,
              opacity: last ? 1 : .6,
              animation: last ? 'lp-slide .2s ease' : 'none',
            }}>
              <span style={{color:'#94a3b8',flexShrink:0,fontSize:9}}>›</span>
              <span>{l.t}</span>
              {last && (
                <span style={{
                  display:'inline-block', width:6, height:12,
                  background:'#2563eb',
                  opacity: blink ? 1 : 0,
                  transition:'opacity .08s', flexShrink:0,
                }}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════ */
function Reveal({ children, delay = 0, style: s = {} }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current; if (!el) return
    const fb = setTimeout(() => setVis(true), 800 + delay * 800)
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold:.07 }
    )
    obs.observe(el)
    return () => { obs.disconnect(); clearTimeout(fb) }
  }, [delay])

  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(18px)',
      transition: `opacity .55s ${delay}s ease, transform .55s ${delay}s ease`,
      ...s,
    }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════
   FEATURE CARD
═══════════════════════════════════ */
function FeatCard({ iconPaths, accent, title, desc, tags, delay, shown }) {
  return (
    <div className="lp-card" style={{
      background:'white', borderRadius:16, padding:'24px 20px',
      border:'1px solid rgba(0,0,0,.07)',
      boxShadow:'0 2px 8px rgba(0,0,0,.05)',
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(30px) scale(0.9)',
      transition:`opacity .55s ${delay}s cubic-bezier(.34,1.56,.64,1), transform .55s ${delay}s cubic-bezier(.34,1.56,.64,1)`,
    }}>
      <div style={{
        width:44, height:44, borderRadius:12, marginBottom:16,
        background:`${accent}12`, border:`1px solid ${accent}28`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {iconPaths.map((d,i) => <path key={i} d={d}/>)}
        </svg>
      </div>
      <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,letterSpacing:'-.3px',color:'#0f172a'}}>{title}</h3>
      <p style={{fontSize:13,color:'#475569',lineHeight:1.72,marginBottom:14}}>{desc}</p>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        {tags.map(t => <span key={t} className="lp-tag">{t}</span>)}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════
   DATA
═══════════════════════════════════ */
const FEATS = [
  { iconPaths:['M2 20h.01','M7 20v-4','M12 20v-8','M17 20V8','M22 4v16'], accent:'#2563eb',
    title:'AIS MSG Type 8', desc:'Encode telemetri drone ke payload biner 168-bit ITU-R M.1371-5. GPS, altitude, IMU, battery, flight mode via VHF 162 MHz setiap 500ms.',
    tags:['DAC:366 FI:56','168 bit','500ms TX'] },
  { iconPaths:['M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z','M9 4v13','M15 7v13'], accent:'#0d9488',
    title:'Live Animated Map', desc:'Peta Leaflet interaktif. Ikon kapal & drone bergerak sesuai COG+SOG real-time. Mode Light/Satellite, compass rose, layer toggle.',
    tags:['Vessel animation','Light/Satellite','Layer control'] },
  { iconPaths:['M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'], accent:'#ea580c',
    title:'SAR MSG Type 9', desc:'Monitor helikopter & fixed-wing SAR via MSG Type 9. Auto-detect jenis pesawat dari callsign. Ikon rotor animatif real-time.',
    tags:['SAR Aircraft','Heli/Fixed-wing','MSG Type 9'] },
  { iconPaths:['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z'], accent:'#7c3aed',
    title:'Gyro Instruments', desc:'ADI, HSI, Turn Coordinator, Direction Badge 16-arah. Data realtime langsung dari payload MSG 8 drone.',
    tags:['ADI','HSI','Turn Coord'] },
  { iconPaths:['M3 3v18h18','M18 9l-5 5-4-4-4 4'], accent:'#059669',
    title:'PID Analysis Chart', desc:'Time-series roll/pitch/yaw canvas chart 120 sampel. Statistik STD untuk deteksi osilasi PID. Pause/resume, clear.',
    tags:['STD detection','120 samples','Pause/Resume'] },
  { iconPaths:['M4.9 19.1C1 15.2 1 8.8 4.9 4.9','M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5','M10.7 13.3a2 2 0 1 0 2.6 2.6L21 6l-10.3 7.3z'], accent:'#d97706',
    title:'Multi-source AIS', desc:'Serial USB dAISy, TCP remote, UDP broadcast sekaligus. Auto-reconnect, test koneksi, live NMEA log, layer visibility.',
    tags:['dAISy USB','TCP/UDP','Auto-reconnect'] },
]

const STEPS = [
  { n:'01', t:'FC → AIT33',      d:'INAV encode sensor ke MSP. AIT33 encode ke AIS payload 168-bit, transmit VHF 162 MHz.' },
  { n:'02', t:'VHF → dAISy',    d:'dAISy receiver menangkap semua target AIS termasuk drone. NMEA output via USB.' },
  { n:'03', t:'Node.js WS',     d:'Server parse NMEA, decode MSG 8/9, auto-reconnect, broadcast ke frontend via WebSocket.' },
  { n:'04', t:'React Dashboard', d:'Peta animatif, gyro ADI, PID chart, telemetri, AIS targets dengan layer control.' },
]

const SRCS = [
  { badge:'USB Serial', c:'#2563eb', title:'dAISy Receiver',
    desc:'Plug & play via USB. Auto-scan port, baud 38400.',
    lines:['PORT  : COM3 / ttyUSB0','BAUD  : 38400','PROTO : NMEA-0183'] },
  { badge:'TCP', c:'#0d9488', title:'Remote AIS Stream',
    desc:'Konek ke VPS/server AIS remote. Auto-reconnect.',
    lines:['HOST  : vps2.osi.my.id','PORT  : 6000','ENV   : TCP_ENABLED=1'] },
  { badge:'UDP', c:'#ea580c', title:'Local UDP Listen',
    desc:'Terima broadcast NMEA di jaringan lokal.',
    lines:['BIND  : 0.0.0.0:10110','TYPE  : UDP broadcast','CMD   : nc -u host 10110'] },
]

/* ═══════════════════════════════════
   SVG ICONS
═══════════════════════════════════ */
const ArrowR = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)
const ChevD = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
)

/* ═══════════════════════════════════
   MAIN
═══════════════════════════════════ */
export default function LandingPage({ onLogin }) {
  useEffect(() => { injectCSS() }, [])

  const { isMobile } = useBreakpoint()

  const [scrolled,   setScrolled]   = useState(false)
  const [featShown,  setFeatShown]  = useState(false)
  const [stepsShown, setStepsShown] = useState(false)
  const [srcShown,   setSrcShown]   = useState(false)

  const featRef  = useRef(null)
  const stepsRef = useRef(null)
  const srcRef   = useRef(null)

  /* scroll → navbar */
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 160)
    window.addEventListener('scroll', h, { passive:true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  /* intersection reveal */
  useEffect(() => {
    const pairs = [[featRef,setFeatShown],[stepsRef,setStepsShown],[srcRef,setSrcShown]]
    const obs = pairs.map(([r, fn]) => {
      const o = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { fn(true); o.disconnect() } },
        { threshold:.06 }
      )
      if (r.current) o.observe(r.current)
      return o
    })
    const fb = setTimeout(() => { setFeatShown(true); setStepsShown(true); setSrcShown(true) }, 2200)
    return () => { obs.forEach(o => o.disconnect()); clearTimeout(fb) }
  }, [])

  const px  = isMobile ? 20 : 64
  const spy = isMobile ? 56 : 88

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{ minHeight:'100vh', color:'#0f172a', overflowX:'hidden', fontFamily:"'Syne',sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200, height:58,
        padding:`0 ${px}px`,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background: scrolled ? 'rgba(255,255,255,.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,.07)' : 'none',
        boxShadow: scrolled ? '0 2px 12px rgba(0,0,0,.06)' : 'none',
        transition:'all .3s',
      }}>
        {/* logo */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{
            width:35, height:35, borderRadius:9, flexShrink:0,
            background:'linear-gradient(135deg, #87ccfe, #0082de)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 3px 10px rgba(84, 138, 255, 0.28)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
            </svg>
          </div>
          <span>
           <span style={{fontWeight:800,fontSize:18, color:'#1b1303'}}>
            AIS<span style={{color:'#0082de'}}> AIRCRAFT</span>
          </span>
          <div style={{fontSize:9, color:'var(--t3)',letterSpacing:'1px',textTransform:'uppercase'}}>
              Monitoring
            </div>   
          </span>
        </div>

        {/* nav links */}
        <div style={{display:'flex',alignItems:'center',gap:30}}>
          {!isMobile && ['Fitur','Cara Kerja','Koneksi'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ','-')}`} className="lp-nav-a">{l}</a>
          ))}
          <button className="lp-btn-p" onClick={onLogin}
            style={{padding: isMobile ? '8px 16px' : '9px 22px', fontSize: isMobile ? 13 : 14}}>
            Login <ArrowR/>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <Bg c="linear-gradient(150deg, #f0f7ff 0%, #f5fdff 45%, #9de9fe 100%) " >
        <div className="lp-hero" >
          

          {/* LEFT */}
          <div className="lp-hero-l">
            {/* live pill */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8, marginBottom:26,
              background:'white', border:'1px solid rgba(37,99,235,.18)',
              borderRadius:999, padding:'5px 14px',
              boxShadow:'0 2px 8px rgba(0,0,0,.07)',
            }}>
              <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',
                animation:'lp-ping 2s ease-in-out infinite'}}/>
              <span style={{fontFamily:"poppins",fontSize:11,color:'#5084f6',letterSpacing:'.5px'}}>
                AIS Monitoring · Realtime
              </span>
            </div>

            {/* headline */}
            <h1 style={{
              fontSize:'clamp(40px, 5vw, 65px)',
              fontWeight:800, lineHeight:1.06, letterSpacing:'-2px', marginBottom:18,
            }}>
              AIS Aircraft <br/>
              <span style={{
                background:'linear-gradient(135deg, #6d99f8 0%, #406beb 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              }}>
              Surveillance System
              </span>
            </h1>

            {/* chips */}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
              {['161.975 MHz','162.025 MHz','Message 9','Message 8','ESP32','MATEKS F722SE','INAV'].map(c => (
                <span key={c} className="lp-chip">{c}</span>
              ))}
            </div>

            {/* body text */}
            <p style={{fontSize:'clamp(14px,1.2vw,16.5px)',lineHeight:1.78,color:'#475569',maxWidth:520,marginBottom:36}}>
              Platform Monitoring Pesawat SAR berbasis{' '}
              <strong style={{color:'#0f172a',fontWeight:600}}>Automatic Identification System</strong>{' '}
              menggunakan <strong style={{color:'#0f172a',fontWeight:600}}>AIS Message 9</strong>{' '} untuk menampilkan posisi, kecepatan, dan status penerbangan secara realtime menggunakan transmisi VHF (Very High Frequency).
            </p>

            {/* CTA buttons */}
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <button className="lp-btn-p" onClick={onLogin} style={{padding:'13px 28px',fontSize:15}}>
                Buka Dashboard <ArrowR/>
              </button>
              <button
                 className="lp-btn-o"
                 onClick={() =>
                   window.open(
                     "https://drive.google.com/drive/folders/1ajke-CxK_rJjA8h4c6nfsm4qPnIk0eZv?usp=drive_link",
                     "_blank"
                   )
                 }
                 style={{ padding: "12px 22px", fontSize: 14 }}
               >
                 Buka Dokumentasi Pengujian <ChevD />
               </button>
            </div>
          </div>{/* end lp-hero-l */}

          {/* RIGHT */}
          <div className="lp-hero-r">
            {/* radar with floating cards */}
            <div style={{position:'relative',animation:'lp-float 5.5s ease-in-out infinite'}}>
              <Radar size={280}/>
              {/* floating info cards — hidden on mobile/tablet via CSS */}
              <div className="lp-float-cards">
                <div style={{
                  position:'absolute', right:-122, top:52, width:116,
                  background:'white', borderRadius:12, padding:'10px 12px',
                  boxShadow:'0 6px 24px rgba(0,0,0,.1)', border:'1px solid rgba(0,0,0,.07)',
                  animation:'lp-fadeIn .6s .9s ease both', opacity:0, animationFillMode:'forwards',
                }}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:'#94a3b8',marginBottom:4,letterSpacing:'.5px',textTransform:'uppercase'}}>Drone</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:'#2563eb',lineHeight:1.5}}>
                    -7.1870°<br/>112.7450°
                  </div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:'#059669',marginTop:4}}>ONLINE · LOITER</div>
                </div>
                <div style={{
                  position:'absolute', left:-122, bottom:64, width:116,
                  background:'white', borderRadius:12, padding:'10px 12px',
                  boxShadow:'0 6px 24px rgba(0,0,0,.1)', border:'1px solid rgba(0,0,0,.07)',
                  animation:'lp-fadeIn .6s 1.2s ease both', opacity:0, animationFillMode:'forwards',
                }}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:7,color:'#94a3b8',marginBottom:4,letterSpacing:'.5px',textTransform:'uppercase'}}>SAR Heli</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,color:'#ea580c',lineHeight:1.4}}>320m ALT<br/>82 kn</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:'#ea580c',marginTop:4}}>MSG TYPE 9</div>
                </div>
              </div>{/* end lp-float-cards */}
            </div>{/* end radar wrapper */}

            {/* terminal */}
            <Terminal/>
          </div>{/* end lp-hero-r */}

        </div>{/* end lp-hero */}
      </Bg>

      {/* ── FEATURES ── */}
      <Bg c="linear-gradient(400deg, #70b5ff 0%, #f5fdff 45%, #9de9fe 100%)" extra={{padding:`${spy}px ${px}px`}}>
        <div style={{maxWidth:1100,margin:'0 auto', scrollMarginTop: '70px'}} ref={featRef} id="fitur">
          <Reveal style={{textAlign:'center',marginBottom:isMobile?60:52}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#2563eb',letterSpacing:'2px',textTransform:'uppercase',marginBottom:12}}>
              Dashboard Features
            </div>
            <h2 style={{fontSize:'clamp(26px,3.5vw,42px)',fontWeight:800,letterSpacing:'-1.5px',marginBottom:14}}>
              Semua yang ada di dalam
            </h2>
            <p style={{fontSize:15,color:'#475569',maxWidth:460,margin:'0 auto',lineHeight:1.72}}>
              Setiap fitur dirancang untuk monitoring drone dan kapal berbasis AIS secara realtime.
            </p>
          </Reveal>
          <div className="lp-feat-grid">
            {FEATS.map((f,i) => (
              <FeatCard key={i} {...f} delay={i*.1} shown={featShown}/>
            ))}
          </div>
        </div>
      </Bg>

      {/* ── HOW IT WORKS ── */}
      <Bg c="linear-gradient(150deg, #70b5ff 0%, #f5fdff 45%, #a3ebff 100%)"extra={{padding:`${spy}px ${px}px`}}>
        <div style={{maxWidth:1000,margin:'0 auto', scrollMarginTop: '200px'}} ref={stepsRef} id="cara-kerja">
          <Reveal style={{textAlign:'center',marginBottom:isMobile?36:52}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#2563eb',letterSpacing:'2px',textTransform:'uppercase',marginBottom:12}}>
              Cara Kerja
            </div>
            <h2 style={{fontSize:'clamp(24px,3vw,38px)',fontWeight:800,letterSpacing:'-1px'}}>
              Alur Data: Drone → Dashboard
            </h2>
          </Reveal>
          <div style={{position:'relative'}}>
            {!isMobile && (
              <div style={{
                position:'absolute', top:33, left:'12%', right:'12%', height:1,
                background:'linear-gradient(90deg,transparent,rgba(37,99,235,.2) 15%,rgba(37,99,235,.2) 85%,transparent)',
                zIndex:0,
              }}/>
            )}
            <div className="lp-steps-grid">
              {STEPS.map((s,i) => (
                <div key={i} className="lp-card" style={{
                  textAlign:'center', background:'white', borderRadius:16,
                  padding: isMobile ? '18px 14px' : '22px 18px',
                  border:'1px solid rgba(0,0,0,.07)',
                  boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                  opacity: stepsShown ? 1 : 0,
                  transform: stepsShown ? 'none' : 'translateY(14px)',
                  transition:`opacity .5s ${i*.1}s ease, transform .5s ${i*.1}s ease`,
                }}>
                  <div style={{
                    width:42, height:42, borderRadius:12, margin:'0 auto 14px',
                    background:'rgba(37,99,235,.06)', border:'1px solid rgba(37,99,235,.15)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:'#2563eb',
                  }}>
                    {s.n}
                  </div>
                  <h4 style={{fontSize:isMobile?13:14,fontWeight:700,marginBottom:8,letterSpacing:'-.2px'}}>{s.t}</h4>
                  <p style={{fontSize:isMobile?11.5:12,color:'#475569',lineHeight:1.7}}>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Bg>

      {/* ── DATA SOURCES ── */}
      <Bg c="linear-gradient(400deg, #a3ebff 0%, #f5fdff 45%, #9de9fe 100%)" extra={{padding:`${spy}px ${px}px`}}>
        <div style={{maxWidth:960,margin:'0 auto', scrollMarginTop: '180px'}} ref={srcRef} id="koneksi">
          <Reveal style={{textAlign:'center',marginBottom:isMobile?36:52}}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#2563eb',letterSpacing:'2px',textTransform:'uppercase',marginBottom:12}}>
              Data Sources
            </div>
            <h2 style={{fontSize:'clamp(24px,3vw,38px)',fontWeight:800,letterSpacing:'-1px'}}>
              Tiga sumber data AIS
            </h2>
          </Reveal>
          <div className="lp-src-grid">
            {SRCS.map((s,i) => (
              <div key={i} className="lp-card" style={{
                background:'white', borderRadius:16, padding:'22px 20px',
                border:'1px solid rgba(0,0,0,.07)',
                boxShadow:'0 2px 8px rgba(0,0,0,.05)',
                opacity: srcShown ? 1 : 0,
                transform: srcShown ? 'none' : 'translateY(16px)',
                transition:`opacity .5s ${i*.1}s ease, transform .5s ${i*.1}s ease`,
              }}>
                <span style={{
                  display:'inline-block', fontFamily:"'DM Mono',monospace", fontSize:8,
                  color:s.c, letterSpacing:'1px', textTransform:'uppercase', marginBottom:12,
                  background:`${s.c}12`, padding:'3px 9px', borderRadius:4,
                  border:`1px solid ${s.c}28`,
                }}>{s.badge}</span>
                <h3 style={{fontSize:16,fontWeight:700,marginBottom:8,letterSpacing:'-.3px'}}>{s.title}</h3>
                <p style={{fontSize:13,color:'#475569',lineHeight:1.72,marginBottom:14}}>{s.desc}</p>
                <div style={{
                  background:'#f8faff', borderRadius:8, padding:'10px 12px',
                  border:'1px solid rgba(0,0,0,.07)', fontFamily:"'DM Mono',monospace",
                }}>
                  {s.lines.map((l,j) => (
                    <div key={j} style={{fontSize:10,color:'#475569',lineHeight:2}}>
                      <span style={{color:'#94a3b8',marginRight:4}}>›</span>{l}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Bg>

      {/* ── CTA ── */}
      <Bg c="linear-gradient(150deg, #a3ebff 0%, #f5fdff 45%, #9de9fe 100%"
        extra={{padding:`${spy}px ${px}px`,textAlign:'center'}}>
        <Reveal>
          <div style={{maxWidth:520,margin:'0 auto'}}>
            <h2 style={{fontSize:'clamp(28px,4vw,46px)',fontWeight:800,letterSpacing:'-1.5px',marginBottom:14}}>
              Siap mulai monitoring?
            </h2>
            <p style={{fontSize:15,color:'#475569',lineHeight:1.75,marginBottom:34,maxWidth:400,margin:'0 auto 34px'}}>
              Login dan mulai monitor drone & kapal via AIS sekarang.
            </p>
            <button className="lp-btn-p" onClick={onLogin} style={{padding:'14px 36px',fontSize:16}}>
              Buka Dashboard <ArrowR/>
            </button>
          </div>
        </Reveal>
      </Bg>

      {/* ── FOOTER ── */}
      <footer style={{
        padding:`18px ${px}px`,
        borderTop:'1px solid rgba(0,0,0,.07)', background:'white',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8,
      }}>
        <span style={{fontWeight:800,fontSize:14,letterSpacing:'-.3px'}}>
          AIS<span style={{color:'#2563eb'}}> AIRCRAFT</span>
        </span>
        <span style={{fontFamily:"poppins",fontSize:12,color:'#94a3b8'}}>
          © 2026 — RIZKY FITRA (0922040022)
        </span>
      </footer>

    </div>
  )
}
