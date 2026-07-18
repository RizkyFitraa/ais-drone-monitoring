import { Component } from 'react'
export default class ErrorBoundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(e) { return { err: e } }
  componentDidCatch(e,i) { console.error('[ErrorBoundary]',e,i) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div style={{padding:20,textAlign:'center'}}>
        <div style={{color:'var(--red)',fontFamily:'JetBrains Mono',fontSize:12,background:'var(--red-bg)',padding:'12px 16px',borderRadius:10,border:'1px solid var(--red)',display:'inline-block',maxWidth:360}}>
          ⚠ Render error: {this.state.err?.message}
          <br/>
          <button onClick={()=>this.setState({err:null})}
            style={{marginTop:10,padding:'6px 16px',borderRadius:6,border:'1px solid var(--red)',background:'transparent',color:'var(--red)',cursor:'pointer',fontFamily:'JetBrains Mono',fontSize:11}}>
            ↺ Retry
          </button>
        </div>
      </div>
    )
  }
}
