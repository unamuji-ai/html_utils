import { useState, useEffect } from 'react'

function App() {
  const [sync, setSync] = useState(50)
  const [logs, setLogs] = useState(['> SYSTEM READY', '> LINKING NEURAL...'])
  const [isAlert, setIsAlert] = useState(false)

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
    if (val >= 85) {
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
      boxSizing: 'border-box', 
      fontFamily: '"Courier New", Courier, monospace',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative', 
      overflow: 'hidden'
    }}>

      {/* --- アラート時の画面周辺の赤色明滅 --- */}
      {isAlert && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          background: 'radial-gradient(circle, transparent 30%, rgba(255, 0, 0, 1) 100%)',
          zIndex: 20,
          pointerEvents: 'none',
          
          // JSでは「最大の濃さ」だけを定義して、CSSに渡す
          '--max-opacity': Math.min((sync - 85) * 0.06 + 0.1, 1.0),
          
          // CSSアニメーションを適用（opacityの設定はCSS側に任せる）
          animation: `vignette-pulse ${3 - (sync / 50)}s ease-in-out infinite`
        }} />
      )}
      
      {/* 背景の静止シマシマ（走査線フィルター） */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 3px 100%',
        pointerEvents: 'none', 
        zIndex: 10
      }} />

      {/* 心電図（ECG）レイヤー */}
      <div style={{
        position: 'absolute',
        top: '25%', 
        left: 0,
        width: '100%',
        height: '200px',
        zIndex: 8,
        pointerEvents: 'none'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={isAlert ? "#300" : "#030"} strokeWidth="0.5"/>
            </pattern>

            {/* 心電図用のマスク：右端（先端）が白=不透明、左側（軌跡）が透明 */}
            <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {/* 0%付近から少しずつ見え始めるようにする（軌跡の消え際をマイルドに） */}
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              
              {/* 30%くらいから既に見え始めるようにして、全体的な明るさを確保 */}
              <stop offset="30%" stopColor="white" stopOpacity="0.5" /> 
              
              {/* 80%以降はパキッと明るく見せる */}
              <stop offset="100%" stopColor="white" stopOpacity="1" />
            </linearGradient>

            <mask id="ecgMask" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="300" height="100" fill="url(#ecgGradient)">
                <animate 
                  attributeName="x" 
                  from="-150" 
                  to="500" 
                  dur={`${3 - (sync / 50)}s`} 
                  repeatCount="indefinite" 
                />
              </rect>
            </mask>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {(() => {
            const amplitudeFactor = sync / 100;
            const baseY = 50; 
            const y = {
              p1: baseY - (10 * amplitudeFactor),
              p2: baseY + (10 * amplitudeFactor),
              qrs_u: baseY - (40 * amplitudeFactor),
              qrs_d: baseY + (40 * amplitudeFactor),
              t: baseY - (5 * amplitudeFactor)
            };

            const dynamicD = `M0,${baseY} L100,${baseY} L110,${y.p1} L120,${y.p2} L130,${baseY} L180,${baseY} L190,${y.qrs_u} L200,${y.qrs_d} L210,${baseY} L260,${baseY} L270,${y.t} L280,${baseY} L290,${baseY} L340,${baseY} L350,${y.p1} L360,${y.p2} L370,${baseY} L420,${baseY} L430,${y.t} L440,${baseY} L450,${baseY} L500,${baseY}`;

            return (
              <path 
                d={dynamicD} 
                stroke={isAlert ? '#f00' : '#0f0'} 
                strokeWidth="3" 
                fill="none"
                mask="url(#ecgMask)"
                style={{
                  filter: `drop-shadow(0 0 8px ${isAlert ? '#f00' : '#0f0'})`
                }}
              />
            );
          })()}
        </svg>
      </div>

      <div style={{ borderBottom: `2px solid ${isAlert ? '#f00' : '#0f0'}`, marginBottom: '10px', zIndex: 5 }}>
        <h1 style={{ fontSize: '1.2rem', margin: '0' }}>NEURAL LINK V3.1</h1>
      </div>

      <div style={{ 
        flex: 1, 
        border: `1px solid ${isAlert ? '#f00' : '#050'}`, 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 5
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>SYNC RATE</p>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0 }}>{sync}%</p>
        </div>
      </div>

      <div style={{ padding: '30px 0', zIndex: 15 }}> 
        <input 
          type="range" 
          min="0" max="100" 
          value={sync} 
          onChange={handleControl}
          style={{ width: '100%', height: '40px', cursor: 'pointer', accentColor: isAlert ? '#f00' : '#0f0' }}
        />
      </div>
      
      <div style={{ height: '80px', fontSize: '0.6rem', backgroundColor: '#050505', padding: '10px', overflow: 'hidden', zIndex: 5 }}>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  )
}

export default App