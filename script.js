const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

const world = {
  width: canvas.width,
  height: canvas.height,
  groundY: canvas.height - 90,
  gravity: 0.18,
};

const player = {
  x: world.width / 2,
  y: world.groundY,
  width: 18,
  lane: 1,
  mood: "happy",
};

const lanes = [
  world.width * 0.2,
  world.width * 0.5,
  world.width * 0.8,
];

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
const faceImage = new Image();
faceImage.src = "kati-face.png";
let clapFrame = 0;

const throwInterval = 5000;
const flightDuration = 2300;

lastThrow = throwInterval;

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
  lastThrow = throwInterval;
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

function update(deltaMs) {
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

  lastThrow += deltaMs;
  if (balls.length < targetBalls && lastThrow > throwInterval) {
    spawnBall();
    lastThrow = 0;
  }

  for (const ball of balls) {
    ball.t += deltaMs / ball.duration;
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

  if (faceImage.complete && faceImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(world.width - 44, 48, 22, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(faceImage, world.width - 78, 22, 68, 52);
    ctx.restore();
  }

  ctx.fillStyle = palette.spotlight;
  ctx.beginPath();
  ctx.ellipse(80, 40, 50, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(240, 36, 55, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  const stripeWidth = 24;
  for (let i = 0; i < world.width; i += stripeWidth) {
    ctx.fillStyle = i / stripeWidth % 2 === 0 ? palette.tentRed : palette.tentPink;
    ctx.fillRect(i, 0, stripeWidth, 80);
  }

  ctx.fillStyle = "#fff6d8";
  ctx.fillRect(0, 80, world.width, 20);

  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(world.width / 3, 84);
  ctx.lineTo(world.width / 3, world.groundY);
  ctx.moveTo((world.width / 3) * 2, 84);
  ctx.lineTo((world.width / 3) * 2, world.groundY);
  ctx.stroke();

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

  drawFriend();
}

function drawBall(ball) {
  const startX = lanes[ball.fromLane];
  const endX = lanes[ball.toLane];
  const t = ball.t;
  const x = startX + (endX - startX) * t;
  const peak = 140;
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

  ctx.fillStyle = "#6b4b39";
  ctx.beginPath();
  ctx.ellipse(x, y - 32, 18, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a2f23";
  ctx.beginPath();
  ctx.ellipse(x, y - 38, 20, 8, 0, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = "#f6d7c3";
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(x - 8, y - 26, 16, 4);
  ctx.strokeStyle = "#d7d7d7";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x - 11, y - 20, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 11, y - 20, 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#b35252";
  if (player.mood === "sad") {
    ctx.fillRect(x - 4, y - 10, 8, 2);
  } else {
    ctx.fillRect(x - 5, y - 9, 10, 3);
  }

  ctx.fillStyle = "#d7d3f7";
  ctx.beginPath();
  ctx.roundRect(x - 14, y - 6, 28, 18, 6);
  ctx.fill();
  ctx.fillStyle = "#b6b0ee";
  ctx.fillRect(x - 14, y + 6, 28, 5);
  ctx.fillStyle = "#f1efff";
  ctx.fillRect(x - 8, y - 1, 16, 7);

  ctx.fillStyle = "#b5b5c8";
  ctx.beginPath();
  ctx.roundRect(x - 22, y - 4, 8, 14, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + 14, y - 4, 8, 14, 3);
  ctx.fill();

  ctx.fillStyle = "#b6b0ee";
  ctx.beginPath();
  ctx.roundRect(x - 10, y + 12, 8, 12, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 12, 8, 12, 3);
  ctx.fill();
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
  gain.gain.linearRampToValueAtTime(0.85, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioContext.currentTime + 0.2);
}

function drawFriend() {
  clapFrame = (clapFrame + 1) % 40;
  const clapOpen = clapFrame < 20;
  const x = world.width * 0.18;
  const y = world.groundY - 8;

  ctx.fillStyle = "#6b4b39";
  ctx.beginPath();
  ctx.ellipse(x, y - 30, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c9b2";
  ctx.beginPath();
  ctx.ellipse(x, y - 22, 8, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2b2b2b";
  ctx.fillRect(x - 6, y - 24, 12, 3);
  ctx.fillStyle = "#b35252";
  ctx.fillRect(x - 3, y - 18, 6, 2);

  ctx.fillStyle = "#bfe0ff";
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 10, 20, 14, 5);
  ctx.fill();
  ctx.fillStyle = "#a9c7f2";
  ctx.fillRect(x - 10, y + 2, 20, 4);

  ctx.fillStyle = "#a9c7f2";
  if (clapOpen) {
    ctx.beginPath();
    ctx.roundRect(x - 18, y - 8, 8, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 10, y - 8, 8, 4, 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 8, 8, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x + 2, y - 8, 8, 4, 2);
    ctx.fill();
  }
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
  const deltaMs = Math.min(48, timestamp - lastTime) || 16;
  lastTime = timestamp;
  update(deltaMs);
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

function setLaneFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const laneWidth = rect.width / 3;
  const laneIndex = Math.min(2, Math.max(0, Math.floor(x / laneWidth)));
  player.lane = laneIndex;
  player.x = lanes[player.lane];
}

canvas.addEventListener("pointerdown", (event) => {
  startMusic();
  setLaneFromPointer(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.pressure > 0 || event.buttons > 0) {
    setLaneFromPointer(event);
  }
});

window.addEventListener("load", () => {
  startMusic();
});

requestAnimationFrame(loop);
