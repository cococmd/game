const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const gameWrap = document.getElementById("gameWrap");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMsg = document.getElementById("overlayMsg");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const mobileControls = document.getElementById("mobileControls");

const CELLS = 16;
const TICK_MS = 115;
const SWIPE_MIN = 28;
const SWALLOW_MS = 620;
const SEGMENT_FILL = 0.92;
const HEAD_SCALE = 1.18;

let GRID, COLS, ROWS;
let snake, direction, nextDirection, food, score, best, loopId, paused, gameOver, time = 0;
let swallowAnim = null;

const FRUITS = [
  { type: "apple", emoji: "🍎", glow: "rgba(255, 80, 80, 0.6)" },
  { type: "banana", emoji: "🍌", glow: "rgba(255, 220, 80, 0.6)" },
  { type: "pear", emoji: "🍐", glow: "rgba(160, 255, 120, 0.6)" },
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
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function isTouchDevice() {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function fitCanvas() {
  const controlsH = isTouchDevice() ? 120 : 0;
  const uiH = 100;
  const legendH = 48;
  const padding = 32;
  const maxSide = Math.min(
    window.innerWidth - padding,
    window.innerHeight - uiH - controlsH - legendH - padding,
    600
  );
  const side = Math.max(CELLS * 14, Math.floor(maxSide / CELLS) * CELLS);

  canvas.width = side;
  canvas.height = side;
  GRID = side / CELLS;
  COLS = CELLS;
  ROWS = CELLS;
}

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
  swallowAnim = null;
  pauseBtn.classList.remove("paused");
  pauseBtn.textContent = "⏸";
  spawnFood();
}

function startSwallow(fruit) {
  swallowAnim = {
    start: performance.now(),
    emoji: fruit.emoji,
    fromX: fruit.x,
    fromY: fruit.y,
  };
  food = null;
}

function swallowProgress() {
  if (!swallowAnim) return 0;
  return Math.min(1, (time - swallowAnim.start) / SWALLOW_MS);
}

function showOverlay(title, msg, btnText, isStart = false) {
  const nameEl = document.querySelector(".overlay-name");
  const taglineEl = document.querySelector(".overlay-tagline");
  if (nameEl) nameEl.style.display = isStart ? "block" : "none";
  if (taglineEl) taglineEl.style.display = isStart ? "block" : "none";
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  startBtn.textContent = btnText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function startGame() {
  fitCanvas();
  resetGame();
  hideOverlay();
  if (loopId) clearInterval(loopId);
  loopId = setInterval(tick, TICK_MS);
}

function endGame() {
  gameOver = true;
  clearInterval(loopId);
  loopId = null;
  swallowAnim = null;
  saveBest();
  showOverlay("Game Over", `Score ${score} — hungry again, Coco?`, "Play Again");
}

function tick() {
  if (paused || gameOver || swallowAnim) return;

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
    startSwallow(food);
  } else {
    snake.pop();
  }
}

function applyDirection(d) {
  if (!d) return;
  if (d.x === -direction.x && d.y === -direction.y) return;
  nextDirection = d;
}

function togglePause() {
  if (!loopId || gameOver) return;
  paused = !paused;
  pauseBtn.classList.toggle("paused", paused);
  pauseBtn.textContent = paused ? "▶" : "⏸";
}

function segmentCenter(x, y) {
  return { cx: x * GRID + GRID / 2, cy: y * GRID + GRID / 2 };
}

function bodyBulge(index, t) {
  if (t < 0.35) return 1;
  const wave = (t - 0.35 - index * 0.09) / 0.45;
  if (wave < 0 || wave > 1) return 1;
  return 1 + 0.22 * Math.sin(wave * Math.PI);
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

function roundRect(c, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
}

function drawCrystalBody(x, y, index, isHead, swallowT) {
  const { cx, cy } = segmentCenter(x, y);
  const bulge = isHead ? 1 : bodyBulge(index, swallowT);
  const base = GRID * SEGMENT_FILL * bulge;
  const size = isHead ? base * HEAD_SCALE : base;
  const px = cx - size / 2;
  const py = cy - size / 2;
  const hue = 190 + index * 3;
  const radius = size * 0.38;

  ctx.save();
  ctx.shadowColor = `hsla(${hue}, 80%, 70%, 0.5)`;
  ctx.shadowBlur = isHead ? GRID * 0.7 : GRID * 0.4;

  const bodyGrad = ctx.createLinearGradient(px, py, px + size, py + size);
  bodyGrad.addColorStop(0, `hsla(${hue}, 70%, 78%, 0.6)`);
  bodyGrad.addColorStop(0.5, `hsla(${hue}, 85%, 88%, 0.4)`);
  bodyGrad.addColorStop(1, `hsla(${hue + 30}, 60%, 65%, 0.55)`);

  roundRect(ctx, px, py, size, size, radius);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = Math.max(1, GRID * 0.05);
  ctx.stroke();

  const highlight = ctx.createLinearGradient(px, py, px + size * 0.5, py + size * 0.35);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.5)");
  highlight.addColorStop(1, "transparent");
  roundRect(ctx, px + size * 0.08, py + size * 0.08, size * 0.42, size * 0.32, radius * 0.5);
  ctx.fillStyle = highlight;
  ctx.fill();

  if (isHead) {
    drawCuteHead(cx, cy, size, swallowT);
  }

  ctx.restore();
}

function mouthVector(size) {
  const m = size * 0.35;
  if (direction.x === 1) return { mx: m, my: 0, perpX: 0, perpY: 1 };
  if (direction.x === -1) return { mx: -m, my: 0, perpX: 0, perpY: 1 };
  if (direction.y === -1) return { mx: 0, my: -m, perpX: 1, perpY: 0 };
  return { mx: 0, my: m, perpX: 1, perpY: 0 };
}

function drawCuteHead(cx, cy, size, swallowT) {
  ctx.shadowBlur = 0;
  const eyeR = size * 0.11;
  const eyeOff = size * 0.22;
  const { mx, my, perpX, perpY } = mouthVector(size);

  let ex1 = cx + perpX * eyeOff - mx * 0.15;
  let ey1 = cy + perpY * eyeOff - my * 0.15;
  let ex2 = cx - perpX * eyeOff - mx * 0.15;
  let ey2 = cy - perpY * eyeOff - my * 0.15;

  const cheekR = size * 0.12;
  const c1x = cx + perpX * (eyeOff + size * 0.08);
  const c1y = cy + perpY * (eyeOff + size * 0.08);
  const c2x = cx - perpX * (eyeOff + size * 0.08);
  const c2y = cy - perpY * (eyeOff + size * 0.08);

  ctx.fillStyle = "rgba(255, 140, 160, 0.45)";
  ctx.beginPath();
  ctx.arc(c1x, c1y, cheekR, 0, Math.PI * 2);
  ctx.arc(c2x, c2y, cheekR, 0, Math.PI * 2);
  ctx.fill();

  const headScale = swallowT < 0.2 ? 1 + swallowT * 0.25 : swallowT < 0.45 ? 1.05 + (swallowT - 0.2) * 0.4 : 1 + Math.max(0, (0.7 - swallowT) * 0.2);
  const cheekPuff = swallowT > 0.2 && swallowT < 0.55 ? 1 + 0.35 * Math.sin((swallowT - 0.2) * Math.PI / 0.35) : 1;

  if (cheekPuff > 1) {
    ctx.fillStyle = "rgba(255, 120, 150, 0.35)";
    ctx.beginPath();
    ctx.arc(c1x, c1y, cheekR * cheekPuff, 0, Math.PI * 2);
    ctx.arc(c2x, c2y, cheekR * cheekPuff, 0, Math.PI * 2);
    ctx.fill();
  }

  const happy = swallowT >= 0.5;
  const munching = swallowT > 0 && swallowT < 0.5;

  if (happy) {
    ctx.strokeStyle = "#1a2840";
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.lineCap = "round";
    const arcR = eyeR * 0.9;
    [[ex1, ey1, -1], [ex2, ey2, 1]].forEach(([ex, ey, flip]) => {
      ctx.beginPath();
      ctx.arc(ex - perpX * arcR * 0.3 * flip, ey - perpY * arcR * 0.3 * flip, arcR, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    });
  } else if (munching) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.ellipse(ex1, ey1, eyeR * 1.1, eyeR * 0.35, 0, 0, Math.PI * 2);
    ctx.ellipse(ex2, ey2, eyeR * 1.1, eyeR * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a2840";
    ctx.beginPath();
    ctx.arc(ex1, ey1 + eyeR * 0.15, eyeR * 0.35, 0, Math.PI * 2);
    ctx.arc(ex2, ey2 + eyeR * 0.15, eyeR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2);
    ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a2840";
    ctx.beginPath();
    ctx.arc(ex1 + perpX * eyeR * 0.2, ey1 + perpY * eyeR * 0.2, eyeR * 0.45, 0, Math.PI * 2);
    ctx.arc(ex2 + perpX * eyeR * 0.2, ey2 + perpY * eyeR * 0.2, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(ex1 - perpX * eyeR * 0.25, ey1 - perpY * eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.arc(ex2 - perpX * eyeR * 0.25, ey2 - perpY * eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const mouthX = cx + mx;
  const mouthY = cy + my;
  const openAmount = swallowT < 0.15 ? swallowT / 0.15 : swallowT < 0.4 ? 1 : swallowT < 0.55 ? 1 - (swallowT - 0.4) / 0.15 : 0;
  const mouthW = size * 0.22 * (0.3 + openAmount * 0.9);
  const mouthH = size * 0.14 * (0.4 + openAmount * 1.1);

  ctx.fillStyle = "#2a1838";
  ctx.beginPath();
  ctx.ellipse(mouthX, mouthY, mouthW, mouthH, Math.atan2(my, mx || 0.001), 0, Math.PI * 2);
  ctx.fill();

  if (openAmount > 0.3) {
    ctx.fillStyle = "#ff8aa0";
    ctx.beginPath();
    ctx.ellipse(mouthX, mouthY, mouthW * 0.75, mouthH * 0.55, Math.atan2(my, mx || 0.001), 0, Math.PI * 2);
    ctx.fill();
  }

  if (swallowT >= 0.4 && swallowT < 0.75) {
    const lump = (swallowT - 0.4) / 0.35;
    const lumpX = cx - mx * 0.35 * (1 - lump);
    const lumpY = cy - my * 0.35 * (1 - lump);
    ctx.fillStyle = "rgba(255, 200, 180, 0.5)";
    ctx.beginPath();
    ctx.arc(lumpX, lumpY, size * 0.12 * Math.sin(lump * Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }

  if (swallowT >= 0.55 && swallowT < 0.85) {
    ctx.font = `${size * 0.35}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨", cx - perpX * size * 0.55, cy - perpY * size * 0.55 - size * 0.2);
    ctx.fillText("💕", cx + perpX * size * 0.5, cy + perpY * size * 0.5 - size * 0.25);
  }
}

function drawSwallowFruit(swallowT) {
  if (!swallowAnim || swallowT <= 0 || swallowT >= 0.55) return;

  const head = snake[0];
  const { cx, cy } = segmentCenter(head.x, head.y);
  const size = GRID * SEGMENT_FILL * HEAD_SCALE;
  const { mx, my } = mouthVector(size);
  const mouthX = cx + mx;
  const mouthY = cy + my;

  let fx, fy, fScale, fAlpha;
  if (swallowT < 0.2) {
    const p = swallowT / 0.2;
    const start = segmentCenter(swallowAnim.fromX, swallowAnim.fromY);
    fx = start.cx + (mouthX - start.cx) * p;
    fy = start.cy + (mouthY - start.cy) * p;
    fScale = GRID * 0.75 * (1 - p * 0.15);
    fAlpha = 1;
  } else {
    const p = (swallowT - 0.2) / 0.35;
    fx = mouthX;
    fy = mouthY;
    fScale = GRID * 0.65 * (1 - p * 0.85);
    fAlpha = 1 - p * 0.9;
  }

  ctx.save();
  ctx.globalAlpha = fAlpha;
  ctx.font = `${fScale}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(swallowAnim.emoji, fx, fy);
  ctx.restore();
}

function drawGulpHearts(swallowT) {
  if (!swallowAnim || swallowT < 0.45 || swallowT > 0.9) return;

  const head = snake[0];
  const { cx, cy } = segmentCenter(head.x, head.y);
  const p = (swallowT - 0.45) / 0.45;
  const float = p * GRID * 1.2;

  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.font = `${GRID * 0.45}px serif`;
  ctx.textAlign = "center";
  ["♥", "★", "♥"].forEach((ch, i) => {
    const angle = (i - 1) * 0.8 + time * 0.005;
    ctx.fillText(ch, cx + Math.sin(angle) * GRID * 0.5, cy - float - i * 8);
  });
  ctx.restore();
}

function drawFood() {
  if (!food || swallowAnim) return;
  const cx = food.x * GRID + GRID / 2;
  const cy = food.y * GRID + GRID / 2;
  const pulse = 1 + 0.08 * Math.sin(time * 0.008);

  ctx.save();
  ctx.shadowColor = food.glow;
  ctx.shadowBlur = GRID * (0.8 + 0.3 * Math.sin(time * 0.01));

  const ring = ctx.createRadialGradient(cx, cy, 0, cx, cy, GRID * 0.7 * pulse);
  ring.addColorStop(0, food.glow);
  ring.addColorStop(0.6, "rgba(255,255,255,0.15)");
  ring.addColorStop(1, "transparent");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, GRID * 0.75 * pulse, 0, Math.PI * 2);
  ctx.fill();

  roundRect(ctx, cx - GRID * 0.38, cy - GRID * 0.38, GRID * 0.76, GRID * 0.76, GRID * 0.35);
  const gem = ctx.createLinearGradient(cx - 10, cy - 10, cx + 10, cy + 10);
  gem.addColorStop(0, "rgba(255,255,255,0.35)");
  gem.addColorStop(0.5, "rgba(255,255,255,0.12)");
  gem.addColorStop(1, "rgba(255,255,255,0.25)");
  ctx.fillStyle = gem;
  ctx.fill();

  ctx.font = `${GRID * 0.88}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(food.emoji, cx, cy + 1);
  ctx.restore();
}

function drawSnake(swallowT) {
  snake.forEach((seg, i) => {
    drawCrystalBody(seg.x, seg.y, i, i === 0, swallowT);
  });
}

function draw() {
  time = performance.now();

  if (swallowAnim && swallowProgress() >= 1) {
    swallowAnim = null;
    spawnFood();
  }

  const st = swallowProgress();

  if (!snake) {
    drawBoardBg();
    requestAnimationFrame(draw);
    return;
  }

  drawBoardBg();
  drawSnake(st);
  drawFood();
  drawSwallowFruit(st);
  drawGulpHearts(st);

  if (paused && !gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `500 ${Math.max(20, GRID * 1.2)}px Noto Sans SC, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.fillText("暂停", canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(draw);
}

let touchStartX = 0;
let touchStartY = 0;

function onTouchStart(e) {
  if (!loopId || gameOver) return;
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}

function onTouchEnd(e) {
  if (!loopId || gameOver) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  if (Math.max(ax, ay) < SWIPE_MIN) return;

  if (ax > ay) {
    applyDirection(dx > 0 ? DIR.right : DIR.left);
  } else {
    applyDirection(dy > 0 ? DIR.down : DIR.up);
  }
}

gameWrap.addEventListener("touchstart", onTouchStart, { passive: true });
gameWrap.addEventListener("touchend", onTouchEnd, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (loopId && !gameOver) e.preventDefault();
}, { passive: false });

mobileControls.querySelectorAll("[data-dir]").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!loopId || gameOver) return;
    applyDirection(DIR[btn.dataset.dir]);
  });
});

pauseBtn.addEventListener("click", togglePause);

document.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === " " && loopId && !gameOver) {
    togglePause();
    return;
  }
  if (gameOver || !loopId) return;
  applyDirection(DIR[e.key]);
});

window.addEventListener("resize", () => {
  if (!loopId) fitCanvas();
});

startBtn.addEventListener("click", startGame);
loadBest();
fitCanvas();
showOverlay(
  "Coco's Hungry Snake",
  isTouchDevice()
    ? "Swipe or use the pad below · fruits change every bite 🍎🍌🍐"
    : "Feed me 🍎 🍌 🍐 — the fruits change every bite!",
  "Let's Eat",
  true
);
requestAnimationFrame(draw);
