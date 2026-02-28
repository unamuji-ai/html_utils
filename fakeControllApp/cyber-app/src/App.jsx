import { useState, useEffect, useRef } from 'react'

function App() {
  const [sync, setSync] = useState(0) // 0からスタート
  const [logs, setLogs] = useState(['> INITIALIZING...', '> WAITING FOR NEURAL INPUT...'])
  const [isAlert, setIsAlert] = useState(false)
  const [isMax, setIsMax] = useState(false)
  const [image, setImage] = useState("https://via.placeholder.com/500x700?text=NO+TARGET+DATA")
  
  // 自動減少用のタイマー管理
  const lastTouchTime = useRef(Date.now());

  // --- ロジック1: 自動減少 & ログ更新 ---
  useEffect(() => {
    if (isMax) return; // 100%到達時は減少をストップ

    const timer = setInterval(() => {
      setSync(prev => {
        // 放置されている場合、1秒間に約2%ずつ減少させる
        const timeSinceLastTouch = Date.now() - lastTouchTime.current;
        if (timeSinceLastTouch > 500 && prev > 0) {
          const nextVal = Math.max(0, prev - 0.5);
          // 状態（isAlert）の更新
          setIsAlert(nextVal >= 85);
          return nextVal;
        }
        return prev;
      });
    }, 50);

    const logMessages = ['> SIGNAL WEAKENING...', '> ATTEMPTING RE-LINK...', '> NEURAL SYNC DRIFTING...'];
    const logTimer = setInterval(() => {
      if (!isMax) {
        setLogs(prev => [...prev.slice(-5), logMessages[Math.floor(Math.random() * logMessages.length)]]);
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(logTimer);
    };
  }, [isMax]);

  // --- ロジック2: スワイプ（タッチ）操作 ---
  const handleTouchMove = (e) => {
    if (isMax) return; // 固定後は操作不能

    lastTouchTime.current = Date.now();
    
    setSync(prev => {
      // スワイプするごとに少しずつ加算（感度は0.8程度に調整）
      const nextVal = Math.min(100, prev + 0.05);
      
      if (nextVal >= 100) {
        setIsMax(true);
        setIsAlert(true);
        setLogs(prevLogs => [...prevLogs.slice(-5), '> !!! CONNECTION ESTABLISHED !!!', '> TARGET FULLY CONTROLLED']);
        if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
        return 100;
      }

      setIsAlert(nextVal >= 85);
      return nextVal;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => setImage(f.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      // 画面全体でスワイプを検知
      onTouchMove={handleTouchMove}
      style={{ 
        backgroundColor: '#000', 
        color: isAlert ? '#ff0000' : '#00ff41', 
        height: '100vh', width: '100vw', 
        padding: '20px', boxSizing: 'border-box', 
        fontFamily: '"Courier New", Courier, monospace',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        animation: isMax ? 'max-shake 0.2s linear infinite' : 'none',
        touchAction: 'none' // ブラウザのデフォルトスクロールを防止
      }}
    >
      {/* --- 以下、演出パーツ（前回と同じ） --- */}
      {isAlert && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'radial-gradient(circle, transparent 30%, rgba(255, 0, 0, 1) 100%)',
          zIndex: 20, pointerEvents: 'none',
          '--max-opacity': Math.min((sync - 85) * 0.06 + 0.1, 1.0),
          animation: `vignette-pulse ${isMax ? 0.2 : 3 - (sync / 50)}s ease-in-out infinite`
        }} />
      )}
      
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 3px 100%',
        pointerEvents: 'none', zIndex: 10, opacity: isMax ? 0.8 : 0.25
      }} />

      {/* 心電図レイヤー（isMaxで非表示） */}
      <div style={{
        position: 'absolute', top: '25%', left: 0, width: '100%', height: '200px',
        zIndex: 8, pointerEvents: 'none', display: isMax ? 'none' : 'block'
      }}>
        {/* SVG内容は以前と同じ */}
        <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={isAlert ? "#300" : "#030"} strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="30%" stopColor="white" stopOpacity="0.5" /> 
              <stop offset="100%" stopColor="white" stopOpacity="1" />
            </linearGradient>
            <mask id="ecgMask" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="300" height="100" fill="url(#ecgGradient)">
                <animate attributeName="x" from="-150" to="500" dur={`${3 - (sync / 50)}s`} repeatCount="indefinite" />
              </rect>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path 
            d={`M0,50 L100,50 L110,${50-10*(sync/100)} L120,${50+10*(sync/100)} L130,50 L180,50 L190,${50-40*(sync/100)} L200,${50+40*(sync/100)} L210,50 L500,50`} 
            stroke={isAlert ? '#f00' : '#0f0'} strokeWidth="3" fill="none" mask="url(#ecgMask)"
            style={{ filter: `drop-shadow(0 0 8px ${isAlert ? '#f00' : '#0f0'})` }}
          />
        </svg>
      </div>

      <div style={{ borderBottom: `2px solid ${isAlert ? '#f00' : '#0f0'}`, marginBottom: '10px', zIndex: 5 }}>
        <h1 style={{ fontSize: '1.2rem', margin: '0' }}>NEURAL LINK V3.1</h1>
      </div>

      <div style={{ 
        flex: 1, border: `1px solid ${isAlert ? '#f00' : '#050'}`, 
        position: 'relative', display: 'flex', flexDirection: 'column', 
        zIndex: 5, backgroundColor: 'rgba(0, 20, 0, 0.2)', overflow: 'hidden',
        boxShadow: isMax ? '0 0 30px #f00' : 'none'
      }}>
        <div style={{ width: '100%', height: '60%', borderBottom: `1px solid ${isAlert ? '#f00' : '#050'}`, position: 'relative', overflow: 'hidden' }}>
          <img src={image} alt="TARGET" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: isMax ? `sepia(1) hue-rotate(-50deg) saturate(5) brightness(0.8) contrast(2)` :
                    sync >= 85 ? `sepia(1) hue-rotate(${-50 * ((sync-85)/15)}deg) saturate(${1+(sync-85)*0.2}) brightness(${1+(sync-85)*0.02})` :
                    `hue-rotate(0deg) saturate(1) brightness(1) contrast(1.1) grayscale(0.2)`,
            opacity: isMax ? 0.7 : 0.9, transition: 'filter 0.5s ease-in-out' 
          }} />
          {isMax && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, backdropFilter: 'blur(2px) contrast(3)' }}>
              <p style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '3px', textAlign: 'center', textShadow: '0 0 10px #f00', animation: 'text-blink 0.3s steps(2) infinite' }}>
                Under your<br/>command
              </p>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '0 20px' }}>
          <p style={{ fontSize: '0.7rem', marginBottom: '3px', letterSpacing: '4px', opacity: 0.7 }}>NEURAL SYNC RATE</p>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '5px' }}>
            <span style={{ fontSize: '3.5rem', fontWeight: 'bold', fontStyle: 'italic', lineHeight: 1 }}>{Math.floor(sync)}</span>
            <span style={{ fontSize: '1.2rem', marginLeft: '5px' }}>%</span>
          </div>
          {/* 同期率ゲージ */}
          <div style={{ width: '100%', height: '8px', border: `1px solid ${isAlert ? '#f00' : '#050'}`, backgroundColor: 'rgba(0,0,0,0.8)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${sync}%`, backgroundColor: isAlert ? '#f00' : '#0f0', boxShadow: isAlert ? '0 0 10px #f00' : '0 0 10px #0f0', transition: 'width 0.1s linear', animation: isMax ? 'vignette-pulse 0.2s infinite' : 'none' }} />
          </div>
        </div>
      </div>

      {/* 操作エリア（画像選択のみ） */}
      <div style={{ padding: '20px 0', zIndex: 15 }}> 
        <label style={{ display: 'block', textAlign: 'center', padding: '10px', border: `1px dashed ${isAlert ? '#f00' : '#0f0'}`, backgroundColor: 'rgba(0, 40, 0, 0.3)', color: isAlert ? '#f00' : '#0f0', fontSize: '0.7rem', letterSpacing: '2px', cursor: 'pointer' }}>
          [ SELECT TARGET DATA ]
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
        </label>
        {!isMax && <p style={{ textAlign: 'center', fontSize: '0.6rem', marginTop: '10px', opacity: 0.5 }}>SWIPE SCREEN TO SYNC</p>}
      </div>
      
      <div style={{ height: '70px', fontSize: '0.6rem', backgroundColor: '#050505', padding: '10px', overflow: 'hidden', zIndex: 5 }}>
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  )
}

export default App