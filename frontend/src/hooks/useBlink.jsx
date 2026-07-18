import { useState, useEffect } from 'react'
export function useBlink(ms=800) {
  const [on, setOn] = useState(true)
  useEffect(() => { const id=setInterval(()=>setOn(v=>!v),ms); return()=>clearInterval(id) },[ms])
  return on
}
