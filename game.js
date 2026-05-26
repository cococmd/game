const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMsg = document.getElementById("overlayMsg");
const startBtn = document.getElementById("startBtn");

const GRID = 20;
const COLS = canvas.width / GRID;
const ROWS = canvas.height / GRID;
const TICK_MS = 110;

const FRUITS = [
  { type: "apple", emoji: "🍎", glow: "rgba(255, 80, 80, 0.6)", core: "#ff6b6b" },
  { type: "banana", emoji: "🍌", glow: "rgba(255, 220, 80, 0.6)", core: "#ffd93d" },
  { type: "pear", emoji: "🍐", glow: "rgba(160, 255, 120, 0.6)", core: "#a8e063" },
];

const DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

let snake, direction, nextDirection, food, score, best, loopId, paused, gameOver, time = 0;

function loadBest() {
  best = parseInt(localStorage.getItem("crystalSnakeBest") || "0", 10);
  bestEl.textContent = best;
}

function saveBest() {
  if (score > best) {
    best = score;
    localStorage.setItem("crystalSnakeBest", String(best));
    bestEl.textContent = best;
  }
}

function randomFruit() {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  food = { ...pos, ...randomFruit() };
}

function resetGame() {
  const mid = Math.floor(COLS / 2);
  snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  score = 0;
  scoreEl.textContent = "0";
  paused = false;
  gameOver = false;
  spawnFood();
}

function showOverlay(title, msg, btnText) {
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  startBtn.textContent = btnText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function startGame() {
  resetGame();
  hideOverlay();
  if (loopId) clearInterval(loopId);
  loopId = setInterval(tick, TICK_MS);
  requestAnimationFrame(draw);
}

function endGame() {
  gameOver = true;
  clearInterval(loopId);
  loopId = null;
  saveBest();
  showOverlay("游戏结束", `得分 ${score} · 再试一次？`, "重新开始");
}

function tick() {
  if (paused || gameOver) return;

  direction = nextDirection;
  const head = snake[0];
  const newHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  if (
    newHead.x < 0 ||
    newHead.x >= COLS ||
    newHead.y < 0 ||
    newHead.y >= ROWS ||
    snake.some((s) => s.x === newHead.x && s.y === newHead.y)
  ) {
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    spawnFood();
  } else {
    snake.pop();
  }
}

function drawCrystalGrid() {
  ctx.save();
  for (let x = 0; x <= COLS; x++) {
    for (let y = 0; y <= ROWS; y++) {
      const px = x * GRID;
      const py = y * GRID;
      const alpha = 0.04 + 0.03 * Math.sin(time * 0.002 + x * 0.3 + y * 0.3);
      ctx.strokeStyle = `rgba(180, 220, 255, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBoardBg() {
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "rgba(12, 24, 48, 0.92)");
  g.addColorStop(0.5, "rgba(18, 32, 58, 0.88)");
  g.addColorStop(1, "rgba(24, 18, 48, 0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const shine = ctx.createRadialGradient(
    canvas.width * 0.3,
    canvas.height * 0.2,
    0,
    canvas.width * 0.5,
    canvas.height * 0.5,
    canvas.width * 0.8
  );
  shine.addColorStop(0, "rgba(255, 255, 255, 0.06)");
  shine.addColorStop(1, "transparent");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCrystalGrid();
}

function drawCrystalSegment(x, y, isHead, index) {
  const px = x * GRID;
  const py = y * GRID;
  const pad = 2;
  const size = GRID - pad * 2;
  const cx = px + GRID / 2;
  const cy = py + GRID / 2;
  const hue = 190 + index * 3;

  ctx.save();

  ctx.shadowColor = `hsla(${hue}, 80%, 70%, 0.5)`;
  ctx.shadowBlur = isHead ? 14 : 8;

  const bodyGrad = ctx.createLinearGradient(px, py, px + GRID, py + GRID);
  bodyGrad.addColorStop(0, `hsla(${hue}, 70%, 75%, 0.55)`);
  bodyGrad.addColorStop(0.5, `hsla(${hue}, 85%, 85%, 0.35)`);
  bodyGrad.addColorStop(1, `hsla(${hue + 30}, 60%, 60%, 0.5)`);

  roundRect(ctx, px + pad, py + pad, size, size, 6);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const highlight = ctx.createLinearGradient(px, py, px + size * 0.5, py + size * 0.4);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.45)");
  highlight.addColorStop(1, "transparent");
  roundRect(ctx, px + pad + 2, py + pad + 2, size * 0.45, size * 0.35, 4);
  ctx.fillStyle = highlight;
  ctx.fill();

  if (isHead) {
    ctx.shadowBlur = 0;
    const eyeOff = 4;
    let ex1, ey1, ex2, ey2;
    if (direction.x === 1) {
      ex1 = cx + eyeOff; ey1 = cy - 3;
      ex2 = cx + eyeOff; ey2 = cy + 3;
    } else if (direction.x === -1) {
      ex1 = cx - eyeOff; ey1 = cy - 3;
      ex2 = cx - eyeOff; ey2 = cy + 3;
    } else if (direction.y === -1) {
      ex1 = cx - 3; ey1 = cy - eyeOff;
      ex2 = cx + 3; ey2 = cy - eyeOff;
    } else {
      ex1 = cx - 3; ey1 = cy + eyeOff;
      ex2 = cx + 3; ey2 = cy + eyeOff;
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(ex1, ey1, 2, 0, Math.PI * 2);
    ctx.arc(ex2, ey2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a2840";
    ctx.beginPath();
    ctx.arc(ex1, ey1, 1, 0, Math.PI * 2);
    ctx.arc(ex2, ey2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawFood() {
  const cx = food.x * GRID + GRID / 2;
  const cy = food.y * GRID + GRID / 2;
  const pulse = 1 + 0.08 * Math.sin(time * 0.008);

  ctx.save();

  ctx.shadowColor = food.glow;
  ctx.shadowBlur = 20 + 6 * Math.sin(time * 0.01);

  const ring = ctx.createRadialGradient(cx, cy, 0, cx, cy, GRID * 0.7 * pulse);
  ring.addColorStop(0, food.glow);
  ring.addColorStop(0.6, "rgba(255,255,255,0.15)");
  ring.addColorStop(1, "transparent");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, GRID * 0.75 * pulse, 0, Math.PI * 2);
  ctx.fill();

  roundRect(ctx, cx - GRID * 0.38, cy - GRID * 0.38, GRID * 0.76, GRID * 0.76, 8);
  const gem = ctx.createLinearGradient(cx - 10, cy - 10, cx + 10, cy + 10);
  gem.addColorStop(0, "rgba(255,255,255,0.35)");
  gem.addColorStop(0.5, "rgba(255,255,255,0.12)");
  gem.addColorStop(1, "rgba(255,255,255,0.25)");
  ctx.fillStyle = gem;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `${GRID * 0.85}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(food.emoji, cx, cy + 1);

  ctx.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function draw() {
  time = performance.now();
  drawBoardBg();
  snake.forEach((seg, i) => drawCrystalSegment(seg.x, seg.y, i === 0, i));
  drawFood();

  if (paused && !gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "500 28px Noto Sans SC, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.fillText("暂停", canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(draw);
}

function setDirection(key) {
  const d = DIR[key];
  if (!d) return;
  if (d.x === -direction.x && d.y === -direction.y) return;
  nextDirection = d;
}

document.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === " " && loopId && !gameOver) {
    paused = !paused;
    return;
  }
  if (gameOver || !loopId) return;
  setDirection(e.key);
});

startBtn.addEventListener("click", startGame);
loadBest();
showOverlay("准备开始", "吃掉随机出现的 🍎 🍌 🍐，让水晶蛇不断生长", "开始游戏");
requestAnimationFrame(draw);
