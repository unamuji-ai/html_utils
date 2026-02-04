// --- 型の定義 ---
interface GameObject {
    x: number; 
    y: number; 
    vx: number; 
    vy: number; 
    radius: number;
    touchId: number | null;
}

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// --- ゲーム設定と状態 ---
const WINNING_SCORE = 5;
const GOAL_WIDTH = 150;
const FRICTION = 0.985;
const BOUNCE_STILL = 0.8; 
const HIT_POWER = 0.6;
const MAX_SPEED = 25;

let score1 = 0; // 下（青）
let score2 = 0; // 上（緑）
let isGameOver = false;
let winner = "";
let gameOverTime = 0;

// オブジェクト初期化
let puck: GameObject = { x: 200, y: 300, vx: 0, vy: 0, radius: 15, touchId: null };
let p1: GameObject = { x: 200, y: 500, vx: 0, vy: 0, radius: 25, touchId: null };
let p2: GameObject = { x: 200, y: 100, vx: 0, vy: 0, radius: 25, touchId: null };

// --- 物理計算ユーティリティ ---

function getClosestPointOnSegment(A: {x:number, y:number}, B: {x:number, y:number}, C: {x:number, y:number}) {
    const abX = B.x - A.x;
    const abY = B.y - A.y;
    const magSq = abX * abX + abY * abY;
    let t = magSq === 0 ? 0 : ((C.x - A.x) * abX + (C.y - A.y) * abY) / magSq;
    t = Math.max(0, Math.min(1, t));
    return { x: A.x + t * abX, y: A.y + t * abY };
}

// すべてのオブジェクトを初期位置に戻す
function resetPositions() {
    // パックのリセット
    puck.x = canvas.width / 2;
    puck.y = canvas.height / 2;
    puck.vx = 0;
    puck.vy = 0;

    // プレイヤー1（下・青）のリセット
    p1.x = canvas.width / 2;
    p1.y = canvas.height - 100;
    p1.vx = 0;
    p1.vy = 0;
    p1.touchId = null;

    // プレイヤー2（上・緑）のリセット
    p2.x = canvas.width / 2;
    p2.y = 100;
    p2.vx = 0;
    p2.vy = 0;
    p2.touchId = null;
}

// 得点時の処理
function handleGoal() {
    resetPositions();

    if (score1 >= WINNING_SCORE) {
        isGameOver = true;
        winner = "BLUE WINS!";
        gameOverTime = Date.now();
    } else if (score2 >= WINNING_SCORE) {
        isGameOver = true;
        winner = "GREEN WINS!";
        gameOverTime = Date.now();
    }
}

function restartGame() {
    if (Date.now() - gameOverTime < 3000) return;
    score1 = 0;
    score2 = 0;
    isGameOver = false;
    winner = "";
    resetPositions();
}

// --- メインロジック ---

function updatePhysics() {
    if (isGameOver) return;

    const prevPuck = { x: puck.x, y: puck.y };

    puck.vx *= FRICTION;
    puck.vy *= FRICTION;
    puck.x += puck.vx;
    puck.y += puck.vy;

    [p1, p2].forEach(p => {
        const closestP = getClosestPointOnSegment(prevPuck, {x: puck.x, y: puck.y}, p);
        const dx = puck.x - p.x;
        const dy = puck.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = puck.radius + p.radius;

        if (distance < minDist) {
            const angle = Math.atan2(dy, dx);
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);

            puck.x = p.x + normalX * (minDist + 1);
            puck.y = p.y + normalY * (minDist + 1);

            const relVx = puck.vx - p.vx;
            const relVy = puck.vy - p.vy;
            const velocityInNormal = relVx * normalX + relVy * normalY;

            if (velocityInNormal < 0) {
                puck.vx -= (1 + BOUNCE_STILL) * velocityInNormal * normalX;
                puck.vy -= (1 + BOUNCE_STILL) * velocityInNormal * normalY;
                puck.vx += p.vx * HIT_POWER;
                puck.vy += p.vy * HIT_POWER;
            }
        }
    });

    const isInsideGoalWidth = (puck.x > (canvas.width - GOAL_WIDTH) / 2 && puck.x < (canvas.width + GOAL_WIDTH) / 2);

    if (puck.x < puck.radius) { puck.x = puck.radius; puck.vx *= -0.8; }
    else if (puck.x > canvas.width - puck.radius) { puck.x = canvas.width - puck.radius; puck.vx *= -0.8; }

    if (puck.y < puck.radius) {
        if (isInsideGoalWidth) {
            score1++;
            handleGoal();
        } else {
            puck.y = puck.radius; puck.vy *= -0.8;
        }
    } else if (puck.y > canvas.height - puck.radius) {
        if (isInsideGoalWidth) {
            score2++;
            handleGoal();
        } else {
            puck.y = canvas.height - puck.radius; puck.vy *= -0.8;
        }
    }

    const speed = Math.sqrt(puck.vx**2 + puck.vy**2);
    if (speed > MAX_SPEED) {
        puck.vx = (puck.vx / speed) * MAX_SPEED;
        puck.vy = (puck.vy / speed) * MAX_SPEED;
    }
}

// --- 入力制御 ---

function handleTouch(e: TouchEvent) {
    e.preventDefault();
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    Array.from(e.touches).forEach(t => {
        const tx = t.clientX - rect.left;
        const ty = t.clientY - rect.top;
        const mid = canvas.height / 2;

        if (p1.touchId === null && ty > mid) p1.touchId = t.identifier;
        if (p2.touchId === null && ty < mid) p2.touchId = t.identifier;

        const target = (p1.touchId === t.identifier) ? p1 : (p2.touchId === t.identifier) ? p2 : null;
        if (target) {
            const lastX = target.x;
            const lastY = target.y;

            target.x = Math.max(target.radius, Math.min(canvas.width - target.radius, tx));
            if (target === p1) {
                target.y = Math.max(mid + target.radius, Math.min(canvas.height - target.radius, ty));
            } else {
                target.y = Math.max(target.radius, Math.min(mid - target.radius, ty));
            }

            target.vx = target.x - lastX;
            target.vy = target.y - lastY;
        }
    });
}

canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });
canvas.addEventListener("touchend", (e) => {
    if (isGameOver) {
        restartGame();
        return;
    }
    Array.from(e.changedTouches).forEach(t => {
        if (p1.touchId === t.identifier) { p1.touchId = null; p1.vx = 0; p1.vy = 0; }
        if (p2.touchId === t.identifier) { p2.touchId = null; p2.vx = 0; p2.vy = 0; }
    });
}, { passive: false });

canvas.addEventListener("mousedown", () => { if (isGameOver) restartGame(); });

// --- 描画 ---

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePhysics();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height/2, 50, 0, Math.PI*2); ctx.stroke();

    ctx.strokeStyle = "#333";
    ctx.strokeRect((canvas.width - GOAL_WIDTH)/2, -5, GOAL_WIDTH, 10);
    ctx.strokeRect((canvas.width - GOAL_WIDTH)/2, canvas.height - 5, GOAL_WIDTH, 10);

    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 230, 118, 0.2)";
    ctx.fillText(score2.toString(), canvas.width / 2, canvas.height / 2 - 80);
    ctx.fillStyle = "rgba(41, 121, 255, 0.2)";
    ctx.fillText(score1.toString(), canvas.width / 2, canvas.height / 2 + 120);

    const drawObj = (o: GameObject, color: string) => {
        ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill(); ctx.closePath();
    };
    drawObj(puck, "#FF1744");
    drawObj(p1, "#2979FF");
    drawObj(p2, "#00E676");

    if (isGameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 50px sans-serif";
        ctx.fillStyle = winner.includes("BLUE") ? "#2979FF" : "#00E676";
        ctx.fillText(winner, canvas.width / 2, canvas.height / 2);
        
        const timeLeft = Math.max(0, Math.ceil((3000 - (Date.now() - gameOverTime)) / 1000));
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "white";
        if (timeLeft > 0) {
            ctx.fillText(`Wait ${timeLeft}s...`, canvas.width / 2, canvas.height / 2 + 60);
        } else {
            ctx.fillText("TAP TO RESTART", canvas.width / 2, canvas.height / 2 + 60);
        }
    }
    requestAnimationFrame(draw);
}

// --- キャンバスのサイズ設定 ---
function resizeCanvas() {
    // 画面の幅の95%くらいに設定
    const padding = 20;
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - padding;

    // 比率（2:3）を維持しつつ、画面に収まる最大サイズを計算
    if (availableWidth * 1.5 < availableHeight) {
        canvas.width = availableWidth;
        canvas.height = availableWidth * 1.5;
    } else {
        canvas.height = availableHeight;
        canvas.width = availableHeight / 1.5;
    }
}

resizeCanvas();
// 初期の配置（resizeCanvasの後に実行）
resetPositions();

draw();
