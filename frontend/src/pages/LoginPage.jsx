import { useState } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage({onSuccess,onBack}){
  const { login } = useAuth()
  const [user,setUser]=useState('')
  const [pass,setPass]=useState('')
  const [err, setErr] =useState('')
  const [loading,setLoading]=useState(false)
  const { isMobile } = useBreakpoint()

  const submit=async()=>{
    if(!user||!pass){setErr('Username dan password diperlukan.');return}
    setLoading(true);setErr('')
    try {
      await login(user, pass)
      onSuccess()
    } catch(e) {
      setErr(e.message || 'Login gagal')
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:"linear-gradient(400deg, #3f9afc 0%, #f5fdff 45%, #66dbfc 100%)",
      padding: isMobile ? '16px' : '40px',
      position:'relative',overflow:'hidden'}}>
      {/* bg grid */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(29,78,216,.04) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(29,78,216,.04) 40px)'}}/>
      {/* blobs — hide on mobile for perf */}
      {!isMobile&&<>
        <div style={{position:'absolute',top:'20%',right:'15%',width:300,height:300,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(29,78,216,.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'15%',left:'10%',width:200,height:200,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(13,148,136,.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
      </>}

      <div style={{position:'relative',width:'100%',maxWidth:400,background:'white',
        borderRadius: isMobile ? 16 : 20,
        padding: isMobile ? '24px 20px' : '36px 32px',
        boxShadow:'0 16px 64px rgba(0,0,0,.1)',
        border:'1px solid rgba(0,0,0,.07)',animation:'fadeUp .5s ease both'}}>

        <button onClick={onBack} style={{background:'none',border:'none',color:'var(--t3)',
          fontFamily:'poppins',fontSize:10,cursor:'pointer',marginBottom:20,
          display:'flex',alignItems:'center',gap:5,padding:0,transition:'color .15s'}}
          onMouseEnter={e=>e.currentTarget.style.color='var(--t2)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}>
          ← Kembali
        </button>

        <div style={{display:'flex',alignItems:'center',gap:10, marginBottom:20}}>
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

        <h1 style={{fontFamily:"poppins", fontSize: isMobile?20:24,fontWeight:800,marginBottom:4,letterSpacing:'-.5px',lineHeight:1.2}}>
          Welcome Back
        </h1>
        <p style={{color:'var(--t2)',fontSize:13,marginBottom:24,lineHeight:1.6}}>
          Platform AIS Aircraft Surveillance System
        </p>

        <div style={{fontFamily:"poppins", display:'flex',flexDirection:'column',gap:14}}>
          {[{l:'Username',t:'text',v:user,s:setUser,p:'Username'},
            {l:'Password',t:'password',v:pass,s:setPass,p:'••••••••'}].map(f=>(
            <div key={f.l}>
              <label style={{fontFamily:'var(--fm)',fontSize:9,color:'var(--t2)',
                letterSpacing:'.8px',display:'block',marginBottom:5,textTransform:'uppercase'}}>{f.l}</label>
              <input type={f.t} value={f.v}
                onChange={e=>{f.s(e.target.value);setErr('')}}
                onKeyDown={e=>e.key==='Enter'&&submit()}
                placeholder={f.p}
                style={{width:'100%',padding:'10px 14px',background:'var(--bg)',
                  border:'1.5px solid var(--br2)',borderRadius:10,color:'var(--t1)',
                  fontSize:14,transition:'border-color .15s', fontFamily:"poppins"}}
                onFocus={e=>e.target.style.borderColor='var(--blue2)'}
                onBlur={e=>e.target.style.borderColor='var(--br2)'}/>
            </div>
          ))}

          {err&&<div style={{background:'var(--red-bg)',border:'1px solid rgba(220,38,38,.2)',
            borderRadius:8,padding:'8px 12px',color:'var(--red)',fontFamily:'poppins',fontSize:10}}>{err}</div>}

          <button onClick={submit} disabled={loading} style={{
            background:loading?'var(--bg4)':'linear-gradient(400deg, #1c86f8 0%, #5edcff 100%)',
            color:loading?'var(--t3)':'white',border:'none',padding:'12px',
            borderRadius:10,fontFamily:'var(--ff)',fontWeight:700,fontSize:15,
            cursor:loading?'default':'pointer',transition:'all .2s',
            boxShadow:loading?'none':'0 4px 16px rgba(29,78,216,.3)',marginTop:4}}>
            {loading?'Memverifikasi...':'Masuk ke Dashboard'}
          </button>
        </div>
      </div>
    </div>
  )
}
