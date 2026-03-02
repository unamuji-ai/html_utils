const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gridSize = 10;
let cellSize;

// --- 変数宣言（一箇所に集約） ---
let walls = [];
let nextWalls = []; 
let fadeAlpha = 0;
let isFading = false;
let players = [];
let registeredPlayers = []; 
let placingPlayerIndex = -1;
let oni = { x: -1, y: -1 };
let isRunning = false;
let isPlacing = false;
let gameInterval = null;
let turnCounter = 0;
let deathCount = 0; // 順位判定用

const emojiList = ["🐤", "🐈", "🐈‍⬛", "🐕", "🦖", "🦊", "🐘", "🐸", "🐰", "🐼", "🍖", "🍙", "🦁", "🐵"];

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
    walls = generatePotentialWalls([]);
    resize();
});

// --- 2. 壁生成ロジック ---
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
        const originalWalls = walls;
        walls = tempWalls;
        const connected = isAllConnected();
        walls = originalWalls;
        if (connected) return tempWalls;
        attempts++;
    }
    return walls;
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

    const availableEmojis = emojiList.filter(e => !registeredPlayers.some(p => p.emoji === e));
    const selectedEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)] || "👤";

    registeredPlayers.push({ name: name, emoji: selectedEmoji });
    
    input.value = "";
    input.focus();

    const displayList = registeredPlayers.map(p => `${p.emoji}${p.name}`);
    document.getElementById("status").textContent = `登録済み: ${displayList.join(", ")}`;
    document.getElementById("finish-reg-btn").classList.remove("hidden");
}

function startPlacingMode() {
    if (registeredPlayers.length === 0) return;
    
    document.getElementById("registration-group").classList.add("hidden");
    document.getElementById("action-group").classList.remove("hidden");
    document.getElementById("start-game-btn").classList.add("hidden");
    
    players = []; 
    placingPlayerIndex = 0;
    isPlacing = true;
    isRunning = false;
    isFading = false;
    oni = { x: -1, y: -1 }; 
    
    updateStatus();
    draw();
}

function updateStatus() {
    const rp = registeredPlayers[placingPlayerIndex];
    document.getElementById("status").textContent = `${rp.emoji}【${rp.name}】さんの初期位置をタップ！`;
}

function handleInput(e) {
    if (!isPlacing || isRunning) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = Math.floor(((clientX - rect.left) * (canvas.width / rect.width)) / cellSize);
    const y = Math.floor(((clientY - rect.top) * (canvas.height / rect.height)) / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        if (isWall(x, y) || players.some(p => p.x === x && p.y === y)) return;

        const rp = registeredPlayers[placingPlayerIndex];
        players.push({
            name: rp.name,
            emoji: rp.emoji,
            x, y,
            alive: true,
            rank: 0,
            deathOrder: 0
        });

        placingPlayerIndex++;
        if (placingPlayerIndex < registeredPlayers.length) {
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

    deathCount = 0;
    players.forEach(p => { p.rank = 0; p.deathOrder = 0; p.alive = true; });

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
            if (alivePlayers.length === 1) alivePlayers[0].rank = 1;
            finishGame();
            return;
        }

        turnCounter++;
        const cycle = 30;
        const fadeDuration = 5; 
        const currentCyclePos = turnCounter % cycle;

        if (currentCyclePos === cycle - fadeDuration) {
            const exclude = alivePlayers.map(p => ({ x: p.x, y: p.y }));
            exclude.push({ x: oni.x, y: oni.y });
            nextWalls = generatePotentialWalls(exclude); 
            isFading = true;
            fadeAlpha = 0;
            document.getElementById("status").textContent = "⚠️ 地殻変動の予兆...";
        }

        if (isFading) {
            fadeAlpha += 1 / fadeDuration;
            if (fadeAlpha > 1) fadeAlpha = 1;
        }

        if (currentCyclePos === 0 && isFading) {
            walls = [...nextWalls];
            isFading = false;
            fadeAlpha = 0;
            document.getElementById("status").textContent = "💥 地殻変動完了！";
        }

        let target = alivePlayers[0];
        let minDist = 1000;
        alivePlayers.forEach(p => {
            const d = Math.abs(p.x - oni.x) + Math.abs(p.y - oni.y);
            if (d < minDist) { minDist = d; target = p; }
        });

        alivePlayers.forEach(p => {
            const dir = Math.floor(Math.random() * 5);
            let nx = p.x, ny = p.y;
            if (dir === 1 && p.y > 0) ny--;
            if (dir === 2 && p.y < gridSize - 1) ny++;
            if (dir === 3 && p.x > 0) nx--;
            if (dir === 4 && p.x < gridSize - 1) nx++;
            if (!isWall(nx, ny)) { p.x = nx; p.y = ny; }
        });

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

        players.forEach(p => { 
            if (p.alive && p.x === oni.x && p.y === oni.y) {
                p.alive = false;
                deathCount++;
                p.deathOrder = deathCount; 
            }
        });

        draw();
    }, 400);
}

// --- 5. 描画（透明度対策版） ---
function draw() {
    ctx.globalAlpha = 1.0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = "#ddd";
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
    }
    ctx.restore();

    const drawWall = (w, alpha, color) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(w.x * cellSize + 2, w.y * cellSize + 2, cellSize - 4, cellSize - 4);
        ctx.restore();
    };

    if (isFading) {
        walls.forEach(w => drawWall(w, 1 - fadeAlpha, "#555"));
        nextWalls.forEach(w => drawWall(w, fadeAlpha, "#f44336")); 
    } else {
        walls.forEach(w => drawWall(w, 1.0, "#555"));
    }

    ctx.globalAlpha = 1.0; 

    players.forEach(p => {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (p.alive) {
            ctx.font = `${cellSize * 0.7}px serif`;
            ctx.fillText(p.emoji, p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2);
            ctx.fillStyle = "black";
            ctx.font = `bold ${cellSize / 4}px sans-serif`;
            ctx.fillText(p.name, p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 1.1);
        } else {
            ctx.font = `${cellSize * 0.7}px serif`;
            ctx.fillText("🪦", p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "black";
            ctx.font = `${cellSize / 5}px sans-serif`;
            ctx.fillText(p.name, p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 1.1);
        }
        ctx.restore();
    });

    if (isRunning || (isPlacing === false && oni.x !== -1)) {
        ctx.save();
        ctx.font = `${cellSize * 0.8}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👹", oni.x * cellSize + cellSize / 2, oni.y * cellSize + cellSize / 2);
        ctx.restore();
    }
}

// --- 6. リザルト ---
function finishGame() {
    isRunning = false;
    const status = document.getElementById("status");
    
    const ranking = [...players].sort((a, b) => {
        if (a.rank === 1) return -1;
        if (b.rank === 1) return 1;
        return b.deathOrder - a.deathOrder;
    });

    let rankingHTML = "<h3>🏆 最終ランキング 🏆</h3><ul style='list-style:none; padding:0;'>";
    ranking.forEach((p, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "　";
        const color = p.alive ? "#d4af37" : "#555";
        rankingHTML += `<li style='color:${color}; margin-bottom:5px;'>
            ${medal}${index + 1}位: ${p.emoji} ${p.name} ${p.alive ? "(生存!)" : ""}
        </li>`;
    });
    rankingHTML += "</ul>";

    status.innerHTML = `
        ${rankingHTML}
        <button onclick="startPlacingMode()" style="background:#2196f3; color:white; padding:10px; margin:5px; border:none; border-radius:8px; cursor:pointer;">同じメンバーで再戦</button>
        <button onclick="location.reload()" style="background:#777; color:white; padding:10px; margin:5px; border:none; border-radius:8px; cursor:pointer;">最初からやり直す</button>
    `;
}