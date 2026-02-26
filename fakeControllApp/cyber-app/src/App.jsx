import { useState, useEffect } from 'react'

function App() {
  const [sync, setSync] = useState(50)
  const [logs, setLogs] = useState(['> SYSTEM READY', '> LINKING NEURAL...'])
  const [isAlert, setIsAlert] = useState(false)

  // ログを自動で増やす演出
  useEffect(() => {
    const messages = [
      '> ACCESSING LIMBIC SYSTEM...',
      '> PULSE ADAPTATION: OK',
      '> INJECTING N-PULSE...',
      '> SIGNAL STABILIZED',
      '> TARGET IDENTIFIED'
    ]
    const timer = setInterval(() => {
      setLogs(prev => [...prev.slice(-5), messages[Math.floor(Math.random() * messages.length)]])
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const handleControl = (e) => {
    const val = e.target.value
    setSync(val)
    
    // 90%を超えたらアラート演出
    if (val > 90) {
      setIsAlert(true)
      if (window.navigator.vibrate) window.navigator.vibrate([50, 50, 50])
    } else {
      setIsAlert(false)
    }
  }

  return (
    <div style={{ 
      backgroundColor: '#000', 
      color: isAlert ? '#ff0000' : '#00ff41', 
      height: '100vh', 
      width: '100vw',
      padding: '20px', 
      fontFamily: '"Courier New", Courier, monospace',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'color 0.2s'
    }}>
      {/* ヘッダー */}
      <div style={{ borderBottom: `2px solid ${isAlert ? '#f00' : '#0f0'}`, marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: '0' }}>BRAIN-LINK CONTROLLER</h1>
        <p style={{ fontSize: '0.7rem' }}>ENCRYPTED MODE // USER: ADMIN</p>
      </div>

      {/* メイン：画像エリア（仮） */}
      <div style={{ 
        flex: 1, 
        border: `1px solid ${isAlert ? '#f00' : '#050'}`, 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(rgba(0,255,0,0.05) 50%, rgba(0,0,0,0) 50%)',
        backgroundSize: '100% 4px'
      }}>
        <p style={{ opacity: 0.5 }}>[ TARGET VISUAL UNAVAILABLE ]</p>
        <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '0.8rem' }}>
          SYNC: {sync}%<br />
          PULSE: {70 + Math.floor(sync/2)}bpm
        </div>
      </div>

      {/* 操作エリア */}
      <div style={{ padding: '20px 0' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem' }}>
          {isAlert ? '!! CAUTION: OVERLOAD !!' : 'ADJUST STIMULATION LEVEL'}
        </label>
        <input 
          type="range" 
          min="0" max="100" 
          value={sync} 
          onChange={handleControl}
          style={{ width: '100%', cursor: 'pointer', accentColor: isAlert ? '#f00' : '#0f0' }}
        />
      </div>

      {/* ログエリア */}
      <div style={{ height: '100px', fontSize: '0.7rem', backgroundColor: '#050505', padding: '10px', borderRadius: '5px' }}>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  )
}

export default App