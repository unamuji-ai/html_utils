const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gridSize = 10;
let cellSize;
let walls = [];
let nextWalls = []; // 次に現れる壁
let fadeAlpha = 0;   // フェード用の透明度 (0～1)
let isFading = false; // フェード中かどうかのフラグ
let players = [];
let registeredNames = []; // 名前だけを保持
let placingPlayerIndex = -1;
let oni = { x: 0, y: 0 };
let isRunning = false;
let isPlacing = false;
let gameInterval = null;
let turnCounter = 0;

// --- 1. 初期化とサイズ調整 ---
function resize() {
    const container = document.getElementById("game-container");
    if (!container) return;
    const size = Math.min(container.clientWidth, container.clientHeight) - 10;
    canvas.width = size;
    canvas.height = size;
    cellSize = size / gridSize;
    draw();
}

window.addEventListener('resize', resize);
document.addEventListener('DOMContentLoaded', () => {
    // 初回は空リストを渡して壁を生成
    walls = generatePotentialWalls([]);
    resize();
});

// --- 2. 壁生成（戻り値を返す汎用型） ---
function generatePotentialWalls(excludeList = []) {
    let tempWalls = [];
    let attempts = 0;
    while (attempts < 100) {
        tempWalls = [];
        const wallCount = Math.floor(gridSize * gridSize * 0.25);
        while (tempWalls.length < wallCount) {
            const x = Math.floor(Math.random() * gridSize);
            const y = Math.floor(Math.random() * gridSize);
            if (!tempWalls.some(w => w.x === x && w.y === y) && !excludeList.some(e => e.x === x && e.y === y)) {
                tempWalls.push({ x, y });
            }
        }
        // isAllConnectedが参照するwallsを一時的に差し替えてチェック
        const originalWalls = walls;
        walls = tempWalls;
        const connected = isAllConnected();
        walls = originalWalls;
        if (connected) return tempWalls;
        attempts++;
    }
    return walls; // 失敗時は現在の壁を維持
}

function isWall(x, y) {
    return walls.some(w => w.x === x && w.y === y);
}

function isAllConnected() {
    let startPos = null;
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            if (!isWall(x, y)) { startPos = { x, y }; break; }
        }
        if (startPos) break;
    }
    if (!startPos) return false;

    const visited = new Set();
    const queue = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);
    let emptyCount = 0;
    for (let i = 0; i < gridSize * gridSize; i++) {
        if (!isWall(i % gridSize, Math.floor(i / gridSize))) emptyCount++;
    }

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }].forEach(d => {
            const nx = x + d.dx, ny = y + d.dy;
            const key = `${nx},${ny}`;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !isWall(nx, ny) && !visited.has(key)) {
                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        });
    }
    return visited.size === emptyCount;
}

// --- 3. 登録・配置フロー ---
function registerName() {
    const input = document.getElementById("nameInput");
    const name = input.value.trim();
    if (!name) return;
    registeredNames.push(name);
    input.value = "";
    input.focus();
    document.getElementById("status").textContent = `登録済み: ${registeredNames.join(", ")}`;
    document.getElementById("finish-reg-btn").classList.remove("hidden");
}

function startPlacingMode() {
    if (registeredNames.length === 0) return;
    document.getElementById("registration-group").classList.add("hidden");
    document.getElementById("action-group").classList.remove("hidden");
    document.getElementById("start-game-btn").classList.add("hidden");
    players = [];
    placingPlayerIndex = 0;
    isPlacing = true;
    updateStatus();
}

function updateStatus() {
    document.getElementById("status").textContent = `【${registeredNames[placingPlayerIndex]}】さんの初期位置をタップ！`;
}

function handleInput(e) {
    if (!isPlacing || isRunning) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    const x = Math.floor(((clientX - rect.left) * (canvas.width / rect.width)) / cellSize);
    const y = Math.floor(((clientY - rect.top) * (canvas.height / rect.height)) / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        if (isWall(x, y) || players.some(p => p.x === x && p.y === y)) return;
        players.push({
            name: registeredNames[placingPlayerIndex],
            x, y,
            color: `hsl(${(360 / registeredNames.length) * placingPlayerIndex}, 70%, 50%)`,
            alive: true
        });
        placingPlayerIndex++;
        if (placingPlayerIndex < registeredNames.length) {
            updateStatus();
        } else {
            isPlacing = false;
            document.getElementById("status").textContent = "準備完了！";
            document.getElementById("start-game-btn").classList.remove("hidden");
        }
        draw();
    }
}

canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); handleInput(e.touches[0]); }, { passive: false });

// --- 4. ゲーム実行 ---
function startGame() {
    if (players.length < 1 || isRunning) return;
    if (gameInterval) clearInterval(gameInterval);
    document.getElementById("start-game-btn").classList.add("hidden");
    
    do {
        oni.x = Math.floor(Math.random() * gridSize);
        oni.y = Math.floor(Math.random() * gridSize);
    } while (isWall(oni.x, oni.y) || players.some(p => p.x === oni.x && p.y === oni.y));

    isRunning = true;
    turnCounter = 0;
    isFading = false;
    fadeAlpha = 0;
    
    gameInterval = setInterval(() => {
        const alivePlayers = players.filter(p => p.alive);
        if (alivePlayers.length <= 1) {
            clearInterval(gameInterval);
            finishGame(alivePlayers);
            return;
        }

        // --- 地殻変動ロジック ---
        turnCounter++;
        const cycle = 30;
        const fadeDuration = 5; 
        const currentCyclePos = turnCounter % cycle;

        // 予兆開始 (25, 55, 85... ターン目)
        if (currentCyclePos === cycle - fadeDuration) {
            const exclude = alivePlayers.map(p => ({ x: p.x, y: p.y }));
            exclude.push({ x: oni.x, y: oni.y });
            nextWalls = generatePotentialWalls(exclude); 
            isFading = true;
            fadeAlpha = 0;
            document.getElementById("status").textContent = "⚠️ 地殻変動の予兆...";
        }

        // フェード進行
        if (isFading) {
            fadeAlpha += 1 / fadeDuration;
            if (fadeAlpha > 1) fadeAlpha = 1;
        }

        // 切り替え確定 (30, 60, 90... ターン目)
        if (currentCyclePos === 0 && isFading) {
            walls = [...nextWalls];
            isFading = false;
            fadeAlpha = 0;
            document.getElementById("status").textContent = "💥 地殻変動完了！";
        }

        // 鬼のターゲット特定
        let target = alivePlayers[0];
        let minDist = 1000;
        alivePlayers.forEach(p => {
            const d = Math.abs(p.x - oni.x) + Math.abs(p.y - oni.y);
            if (d < minDist) { minDist = d; target = p; }
        });

        // プレイヤー移動
        alivePlayers.forEach(p => {
            const dir = Math.floor(Math.random() * 5);
            let nx = p.x, ny = p.y;
            if (dir === 1 && p.y > 0) ny--;
            if (dir === 2 && p.y < gridSize - 1) ny++;
            if (dir === 3 && p.x > 0) nx--;
            if (dir === 4 && p.x < gridSize - 1) nx++;
            if (!isWall(nx, ny)) { p.x = nx; p.y = ny; }
        });

        // 鬼の移動
        const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
        const possible = dirs.map(d => ({ x: oni.x + d.dx, y: oni.y + d.dy }))
            .filter(p => p.x >= 0 && p.x < gridSize && p.y >= 0 && p.y < gridSize && !isWall(p.x, p.y));

        const best = possible.filter(p => 
            (Math.abs(p.x - target.x) + Math.abs(p.y - target.y)) < (Math.abs(oni.x - target.x) + Math.abs(oni.y - target.y))
        );

        if (Math.random() < 0.15 || best.length === 0) {
            if (possible.length > 0) {
                const m = possible[Math.floor(Math.random() * possible.length)];
                oni.x = m.x; oni.y = m.y;
            }
        } else {
            const m = best[Math.floor(Math.random() * best.length)];
            oni.x = m.x; oni.y = m.y;
        }

        players.forEach(p => { if (p.alive && p.x === oni.x && p.y === oni.y) p.alive = false; });
        draw();
    }, 400);
}

// --- 5. 描画 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#ddd";
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
    }

    const drawWall = (w, alpha, color) => {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(w.x * cellSize + 2, w.y * cellSize + 2, cellSize - 4, cellSize - 4);
    };

    if (isFading) {
        walls.forEach(w => drawWall(w, 1 - fadeAlpha, "#555"));
        nextWalls.forEach(w => drawWall(w, fadeAlpha, "#f44336")); 
    } else {
        walls.forEach(w => drawWall(w, 1, "#555"));
    }
    
    ctx.globalAlpha = 1.0; 

    players.forEach(p => {
        if (!p.alive) return;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x * cellSize + cellSize/2, p.y * cellSize + cellSize/2, cellSize/2.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "white"; ctx.stroke();
        ctx.fillStyle = "black"; ctx.font = `bold ${cellSize/3}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText(p.name, p.x * cellSize + cellSize/2, p.y * cellSize + cellSize/1.5);
    });

    if (isRunning) {
        ctx.font = `${cellSize * 0.8}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("👹", oni.x * cellSize + cellSize/2, oni.y * cellSize + cellSize/2);
    }
}

function finishGame(winners) {
    isRunning = false;
    const name = winners.length === 1 ? winners[0].name : "全滅";
    const status = document.getElementById("status");
    status.innerHTML = `【🏆勝者：${name}】<br>
        <button onclick="startPlacingMode()" style="background:#2196f3; color:white; padding:10px; margin:5px; border:none; border-radius:8px;">同じメンバーで再戦</button>
        <button onclick="location.reload()" style="background:#777; color:white; padding:10px; margin:5px; border:none; border-radius:8px;">最初からやり直す</button>`;
}