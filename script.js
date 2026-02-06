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
  speed: 1.6,
  facing: 1,
  mood: "happy",
};

let keys = {};
let balls = [];
let lastTime = 0;
let lastThrow = 0;
let targetBalls = 1;
let successfulCatches = 0;
let gameState = "start"; // start, playing, gameover
let highestBalls = 0;

const throwInterval = 480;

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
  player.x = world.width / 2;
  player.mood = "happy";
  gameState = "playing";
}

function spawnBall() {
  const color = palette.ball[balls.length % palette.ball.length];
  balls.push({
    x: player.x,
    y: player.y - 18,
    vx: (Math.random() * 0.6 - 0.3),
    vy: -2.9 - Math.random() * 0.3,
    color,
  });
}

function update(delta) {
  if (gameState !== "playing") {
    return;
  }

  const direction = (keys.ArrowRight || keys.KeyD ? 1 : 0) -
    (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  if (direction !== 0) {
    player.facing = direction;
  }
  player.x += direction * player.speed * delta;
  player.x = Math.max(18, Math.min(world.width - 18, player.x));

  lastThrow += delta;
  if (balls.length < targetBalls && lastThrow > throwInterval) {
    spawnBall();
    lastThrow = 0;
  }

  balls.forEach((ball) => {
    ball.vy += world.gravity * delta;
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
  });

  const remaining = [];
  for (const ball of balls) {
    if (ball.y >= world.groundY - 4) {
      const caught = Math.abs(ball.x - player.x) < player.width;
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
  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.outline;
  ctx.stroke();
}

function drawKati() {
  const x = player.x;
  const y = player.y;

  ctx.fillStyle = "#5b3a23";
  ctx.fillRect(x - 10, y - 26, 20, 20);
  ctx.fillStyle = "#f4e4d0";
  ctx.fillRect(x - 6, y - 20, 12, 14);

  ctx.fillStyle = "#6b4a2d";
  ctx.fillRect(x - 14, y - 30, 28, 10);
  ctx.fillStyle = "#8b5e3b";
  ctx.fillRect(x - 8, y - 34, 16, 8);

  ctx.fillStyle = "#432515";
  ctx.fillRect(x - 16, y - 32, 6, 6);
  ctx.fillRect(x + 10, y - 32, 6, 6);

  ctx.fillStyle = "#ffe1c2";
  ctx.fillRect(x - 7, y - 32, 14, 8);

  ctx.fillStyle = "#3a2b4c";
  ctx.fillRect(x - 4, y - 18, 3, 3);
  ctx.fillRect(x + 1, y - 18, 3, 3);
  ctx.fillRect(x - 2, y - 14, 4, 1);

  if (player.mood === "sad") {
    ctx.clearRect(x - 2, y - 14, 4, 1);
    ctx.fillRect(x - 2, y - 12, 4, 1);
  }

  ctx.fillStyle = "#c98252";
  ctx.fillRect(x - 8, y - 6, 16, 10);
  ctx.fillStyle = "#e7c4a0";
  ctx.fillRect(x - 6, y - 2, 12, 6);

  ctx.fillStyle = "#b86d3e";
  ctx.fillRect(x - 14, y - 6, 6, 10);
  ctx.fillRect(x + 8, y - 6, 6, 10);

  ctx.fillStyle = "#b86d3e";
  ctx.fillRect(x - 10, y + 4, 6, 8);
  ctx.fillRect(x + 4, y + 4, 6, 8);

  ctx.fillStyle = "#7b4a2a";
  ctx.fillRect(x + 10, y - 2, 10, 12);
  ctx.fillStyle = "#c9956a";
  ctx.fillRect(x + 12, y + 2, 6, 6);
  ctx.fillStyle = "#3a2b4c";
  ctx.fillRect(x + 13, y + 4, 2, 2);

  ctx.fillStyle = "#9c6b4b";
  ctx.fillRect(x - 6 + player.facing * 3, y - 8, 8, 3);
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

function draw() {
  drawBackground();
  balls.forEach(drawBall);
  drawKati();
  drawHUD();

  if (gameState === "start") {
    drawMessage("Press SPACE to start!", "Keep Kati under each falling ball.");
  }
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
  if (event.code === "Space") {
    if (gameState === "start" || gameState === "gameover") {
      resetGame();
    }
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

requestAnimationFrame(loop);
