const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: 142,
  gravity: 0.18,
};

const player = {
  x: world.width / 2,
  y: world.groundY,
  width: 18,
  lane: 1,
  mood: "happy",
};

const lanes = [86, 160, 234];

let keys = {};
let balls = [];
let lastTime = 0;
let lastThrow = 0;
let targetBalls = 1;
let successfulCatches = 0;
let gameState = "playing"; // playing, gameover
let highestBalls = 0;
let musicStarted = false;
let musicTimer = null;
let audioContext = null;
let masterGain = null;

const throwInterval = 5000;
const flightDuration = 2100;

const palette = {
  tentRed: "#ff7cab",
  tentPink: "#ffd1e8",
  floor: "#ffecae",
  spotlight: "#fff4c8",
  ball: ["#ffed66", "#79d6ff", "#ff9f6e", "#b3ff7a"],
  outline: "#3a2b4c",
};

function resetGame() {
  balls = [];
  lastThrow = 0;
  targetBalls = 1;
  successfulCatches = 0;
  highestBalls = 0;
  player.lane = 1;
  player.x = lanes[player.lane];
  player.mood = "happy";
  gameState = "playing";
}

function spawnBall() {
  const color = palette.ball[balls.length % palette.ball.length];
  const fromLane = balls.length % 2 === 0 ? 0 : 2;
  const toLane = 1;
  playChirp();
  balls.push({
    fromLane,
    toLane,
    t: 0,
    duration: flightDuration + Math.random() * 220,
    color,
  });
}

function nextLane(fromLane) {
  if (fromLane === 0) {
    return 1;
  }
  if (fromLane === 2) {
    return 1;
  }
  return Math.random() < 0.5 ? 0 : 2;
}

function update(delta) {
  if (gameState !== "playing") {
    return;
  }

  if (keys.ArrowLeft || keys.KeyA) {
    player.lane = Math.max(0, player.lane - 1);
    keys.ArrowLeft = false;
    keys.KeyA = false;
  }
  if (keys.ArrowRight || keys.KeyD) {
    player.lane = Math.min(lanes.length - 1, player.lane + 1);
    keys.ArrowRight = false;
    keys.KeyD = false;
  }
  player.x = lanes[player.lane];

  lastThrow += delta;
  if (balls.length < targetBalls && lastThrow > throwInterval) {
    spawnBall();
    lastThrow = 0;
  }

  for (const ball of balls) {
    ball.t += (delta * 16) / ball.duration;
  }

  const remaining = [];
  for (const ball of balls) {
    if (ball.t >= 1) {
      const caught = player.lane === ball.toLane;
      if (!caught) {
        gameOver();
        return;
      }
      successfulCatches += 1;
      highestBalls = Math.max(highestBalls, targetBalls);
      if (successfulCatches >= 2 * targetBalls) {
        successfulCatches = 0;
        targetBalls += 1;
      }
      const newFrom = ball.toLane;
      ball.fromLane = newFrom;
      ball.toLane = nextLane(newFrom);
      ball.t = 0;
      ball.duration = flightDuration + Math.random() * 220;
      remaining.push(ball);
    } else {
      remaining.push(ball);
    }
  }
  balls = remaining;
}

function gameOver() {
  gameState = "gameover";
  player.mood = "sad";
}

function drawBackground() {
  ctx.fillStyle = "#6cc0ff";
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = palette.spotlight;
  ctx.beginPath();
  ctx.ellipse(80, 40, 50, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(240, 36, 55, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  const stripeWidth = 20;
  for (let i = 0; i < world.width; i += stripeWidth) {
    ctx.fillStyle = i / stripeWidth % 2 === 0 ? palette.tentRed : palette.tentPink;
    ctx.fillRect(i, 0, stripeWidth, 80);
  }

  ctx.fillStyle = "#fff6d8";
  ctx.fillRect(0, 80, world.width, 20);

  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  for (let i = 12; i < world.width; i += 28) {
    ctx.fillStyle = "#ffd17b";
    ctx.fillRect(i, world.groundY + 8, 12, 6);
  }

  ctx.fillStyle = "#fff";
  for (let i = 0; i < world.width; i += 24) {
    ctx.beginPath();
    ctx.arc(i + 10, 70, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBall(ball) {
  const startX = lanes[ball.fromLane];
  const endX = lanes[ball.toLane];
  const t = ball.t;
  const x = startX + (endX - startX) * t;
  const peak = 56;
  const y = world.groundY - 6 - peak * (1 - (2 * t - 1) ** 2);

  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.outline;
  ctx.stroke();
}

function drawKati() {
  const x = player.x;
  const y = player.y;

  ctx.fillStyle = "#5a3a2c";
  ctx.fillRect(x - 12, y - 32, 24, 14);
  ctx.fillStyle = "#6c4735";
  ctx.fillRect(x - 14, y - 28, 28, 12);
  ctx.fillStyle = "#4a2f23";
  ctx.fillRect(x - 10, y - 38, 20, 6);
  ctx.fillRect(x - 12, y - 36, 4, 6);
  ctx.fillRect(x + 8, y - 36, 4, 6);

  ctx.fillStyle = "#f6d7c3";
  ctx.fillRect(x - 6, y - 24, 12, 10);
  ctx.fillStyle = "#f6d7c3";
  ctx.fillRect(x - 7, y - 16, 14, 8);

  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(x - 7, y - 22, 6, 4);
  ctx.fillRect(x + 1, y - 22, 6, 4);
  ctx.fillRect(x - 1, y - 20, 2, 2);

  ctx.strokeStyle = "#d7d7d7";
  ctx.beginPath();
  ctx.arc(x - 9, y - 16, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 9, y - 16, 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#b35252";
  if (player.mood === "sad") {
    ctx.fillRect(x - 3, y - 10, 6, 1);
  } else {
    ctx.fillRect(x - 3, y - 9, 6, 1);
  }

  ctx.fillStyle = "#c9c5f3";
  ctx.fillRect(x - 10, y - 6, 20, 14);
  ctx.fillStyle = "#b6b0ee";
  ctx.fillRect(x - 10, y + 4, 20, 4);
  ctx.fillStyle = "#d7d3f7";
  ctx.fillRect(x - 6, y, 12, 6);

  ctx.fillStyle = "#b5b5c8";
  ctx.fillRect(x - 14, y - 4, 4, 10);
  ctx.fillRect(x + 10, y - 4, 4, 10);

  ctx.fillStyle = "#b6b0ee";
  ctx.fillRect(x - 8, y + 8, 6, 8);
  ctx.fillRect(x + 2, y + 8, 6, 8);
}

function drawHUD() {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(6, 6, 110, 28);
  ctx.strokeStyle = palette.outline;
  ctx.strokeRect(6, 6, 110, 28);

  ctx.fillStyle = palette.outline;
  ctx.font = "8px Trebuchet MS";
  ctx.fillText(`Balls: ${targetBalls}`, 12, 18);
  ctx.fillText(`Caught: ${successfulCatches}`, 12, 28);
}

function drawMessage(text, subtext) {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(50, 54, 220, 72);
  ctx.strokeStyle = palette.outline;
  ctx.strokeRect(50, 54, 220, 72);
  ctx.fillStyle = palette.outline;
  ctx.font = "10px Trebuchet MS";
  ctx.fillText(text, 64, 82);
  ctx.font = "8px Trebuchet MS";
  ctx.fillText(subtext, 64, 100);
}

function startMusic() {
  if (musicStarted) {
    return;
  }
  musicStarted = true;

  initAudio();

  const melody = [
    523.25, 659.25, 587.33, 783.99,
    698.46, 659.25, 523.25, 392.0,
    440.0, 523.25, 587.33, 659.25,
    587.33, 523.25, 440.0, 392.0,
  ];

  const beatMs = 260;
  let index = 0;

  const playNote = (frequency, durationMs) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioContext.currentTime + durationMs / 1000 + 0.02);
  };

  musicTimer = window.setInterval(() => {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    const note = melody[index % melody.length];
    playNote(note, beatMs * 0.85);
    index += 1;
  }, beatMs);
}

function initAudio() {
  if (audioContext) {
    return;
  }
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(audioContext.destination);
}

function playChirp() {
  if (!audioContext || !masterGain || audioContext.state === "suspended") {
    return;
  }
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(740, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.12);
  gain.gain.setValueAtTime(0, audioContext.currentTime);
  gain.gain.linearRampToValueAtTime(0.35, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioContext.currentTime + 0.2);
}

function draw() {
  drawBackground();
  balls.forEach(drawBall);
  drawKati();
  drawHUD();

  if (gameState === "gameover") {
    drawMessage(
      "Game Over!",
      `You juggled ${highestBalls} balls. Press SPACE to try again.`
    );
  }
}

function loop(timestamp) {
  const delta = Math.min(32, timestamp - lastTime) || 16;
  lastTime = timestamp;
  update(delta / 16);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
  startMusic();
  if (event.code === "Space") {
    if (gameState === "gameover") {
      resetGame();
    }
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

window.addEventListener("load", () => {
  startMusic();
});

requestAnimationFrame(loop);
