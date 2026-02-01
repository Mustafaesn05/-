const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const goldEl = document.getElementById("gold");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const buildTowerBtn = document.getElementById("buildTower");
const startWaveBtn = document.getElementById("startWave");

const GRID_SIZE = 40;
const GRID_COLS = Math.floor(canvas.width / GRID_SIZE);
const GRID_ROWS = Math.floor(canvas.height / GRID_SIZE);

const pathCells = [
  [0, 7],
  [1, 7],
  [2, 7],
  [3, 7],
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 7],
  [8, 7],
  [9, 7],
  [10, 7],
  [11, 7],
  [12, 7],
  [13, 7],
  [14, 7],
  [15, 7],
  [16, 7],
  [17, 7],
  [18, 7],
  [19, 7],
  [20, 7],
  [20, 8],
  [20, 9],
  [19, 9],
  [18, 9],
  [17, 9],
  [16, 9],
  [15, 9],
  [14, 9],
  [13, 9],
  [12, 9],
  [11, 9],
  [10, 9],
  [9, 9],
  [8, 9],
  [7, 9],
  [6, 9],
  [5, 9],
  [4, 9],
  [3, 9],
  [2, 9],
  [2, 8],
  [2, 7],
  [2, 6],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [6, 5],
  [7, 5],
  [8, 5],
  [9, 5],
  [10, 5],
  [11, 5],
  [12, 5],
  [13, 5],
  [14, 5],
  [15, 5],
  [16, 5],
  [17, 5],
  [18, 5],
  [19, 5],
  [20, 5],
  [20, 4],
  [20, 3],
  [19, 3],
  [18, 3],
  [17, 3],
  [16, 3],
  [15, 3],
  [14, 3],
  [13, 3],
  [12, 3],
  [11, 3],
  [10, 3],
  [9, 3],
  [8, 3],
  [7, 3],
  [6, 3],
  [5, 3],
  [4, 3],
  [3, 3],
  [2, 3],
  [1, 3],
  [0, 3],
];

const pathPoints = pathCells.map(([col, row]) => ({
  x: col * GRID_SIZE + GRID_SIZE / 2,
  y: row * GRID_SIZE + GRID_SIZE / 2,
}));

const pathSet = new Set(pathCells.map(([col, row]) => `${col},${row}`));

const state = {
  gold: 150,
  lives: 20,
  wave: 1,
  buildingMode: false,
  towers: [],
  enemies: [],
  projectiles: [],
  waveReady: true,
  hoverCell: null,
  lastTime: 0,
};

const towerConfig = {
  cost: 50,
  range: 120,
  fireRate: 0.8,
  damage: 16,
  projectileSpeed: 220,
};

const waveConfig = {
  baseCount: 7,
  baseHealth: 60,
  baseSpeed: 50,
};

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const updateUI = () => {
  goldEl.textContent = Math.floor(state.gold);
  livesEl.textContent = state.lives;
  waveEl.textContent = state.wave;
  buildTowerBtn.disabled = state.gold < towerConfig.cost || state.buildingMode;
  startWaveBtn.disabled = !state.waveReady || state.enemies.length > 0;
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const createEnemy = (offset) => {
  return {
    x: pathPoints[0].x - offset,
    y: pathPoints[0].y,
    pathIndex: 0,
    speed: waveConfig.baseSpeed + state.wave * 8,
    maxHealth: waveConfig.baseHealth + state.wave * 12,
    health: waveConfig.baseHealth + state.wave * 12,
    reward: 12 + state.wave * 2,
  };
};

const startWave = () => {
  const count = waveConfig.baseCount + state.wave * 2;
  state.waveReady = false;
  for (let i = 0; i < count; i += 1) {
    const enemy = createEnemy(i * 50);
    state.enemies.push(enemy);
  }
  setStatus("Dalga ilerliyor. Kulelerini güçlendir!");
};

const addTower = (col, row) => {
  state.towers.push({
    col,
    row,
    x: col * GRID_SIZE + GRID_SIZE / 2,
    y: row * GRID_SIZE + GRID_SIZE / 2,
    cooldown: 0,
    range: towerConfig.range,
    fireRate: towerConfig.fireRate,
    damage: towerConfig.damage,
  });
  state.gold -= towerConfig.cost;
};

const launchProjectile = (tower, target) => {
  state.projectiles.push({
    x: tower.x,
    y: tower.y,
    target,
    speed: towerConfig.projectileSpeed,
    damage: tower.damage,
  });
};

const updateProjectiles = (delta) => {
  state.projectiles = state.projectiles.filter((projectile) => {
    if (!state.enemies.includes(projectile.target)) {
      return false;
    }
    const dx = projectile.target.x - projectile.x;
    const dy = projectile.target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) {
      projectile.target.health -= projectile.damage;
      return false;
    }
    const step = (projectile.speed * delta) / distance;
    projectile.x += dx * step;
    projectile.y += dy * step;
    return true;
  });
};

const updateEnemies = (delta) => {
  const survivors = [];
  state.enemies.forEach((enemy) => {
    if (enemy.health <= 0) {
      state.gold += enemy.reward;
      return;
    }
    const nextPoint = pathPoints[enemy.pathIndex + 1];
    if (!nextPoint) {
      state.lives -= 1;
      return;
    }
    const dx = nextPoint.x - enemy.x;
    const dy = nextPoint.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
      enemy.pathIndex += 1;
    } else {
      const step = (enemy.speed * delta) / distance;
      enemy.x += dx * step;
      enemy.y += dy * step;
    }
    survivors.push(enemy);
  });
  state.enemies = survivors;
};

const updateTowers = (delta) => {
  state.towers.forEach((tower) => {
    tower.cooldown = Math.max(0, tower.cooldown - delta);
    if (tower.cooldown > 0) {
      return;
    }
    let target = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    state.enemies.forEach((enemy) => {
      const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
      if (distance <= tower.range && distance < closestDistance) {
        closestDistance = distance;
        target = enemy;
      }
    });
    if (target) {
      tower.cooldown = tower.fireRate;
      launchProjectile(tower, target);
    }
  });
};

const drawGrid = () => {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  for (let col = 0; col <= GRID_COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * GRID_SIZE, 0);
    ctx.lineTo(col * GRID_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * GRID_SIZE);
    ctx.lineTo(canvas.width, row * GRID_SIZE);
    ctx.stroke();
  }
};

const drawPath = () => {
  ctx.fillStyle = "rgba(255, 203, 120, 0.18)";
  pathCells.forEach(([col, row]) => {
    ctx.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
  });
  ctx.strokeStyle = "rgba(255, 193, 113, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  pathPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
  ctx.lineWidth = 1;
};

const drawTowers = () => {
  state.towers.forEach((tower) => {
    ctx.fillStyle = "#4dd0ff";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1c2a3f";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawEnemies = () => {
  state.enemies.forEach((enemy) => {
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
    ctx.fill();

    const healthRatio = clamp(enemy.health / enemy.maxHealth, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(enemy.x - 16, enemy.y - 20, 32, 5);
    ctx.fillStyle = "#6bf178";
    ctx.fillRect(enemy.x - 16, enemy.y - 20, 32 * healthRatio, 5);
  });
};

const drawProjectiles = () => {
  state.projectiles.forEach((projectile) => {
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawHover = () => {
  if (!state.hoverCell || !state.buildingMode) {
    return;
  }
  const { col, row } = state.hoverCell;
  ctx.strokeStyle = "rgba(77, 208, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    col * GRID_SIZE + 2,
    row * GRID_SIZE + 2,
    GRID_SIZE - 4,
    GRID_SIZE - 4
  );
  ctx.lineWidth = 1;
};

const drawTowerRange = () => {
  if (!state.hoverCell || !state.buildingMode) {
    return;
  }
  const { col, row } = state.hoverCell;
  const centerX = col * GRID_SIZE + GRID_SIZE / 2;
  const centerY = row * GRID_SIZE + GRID_SIZE / 2;
  ctx.strokeStyle = "rgba(77, 208, 255, 0.2)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, towerConfig.range, 0, Math.PI * 2);
  ctx.stroke();
};

const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPath();
  drawGrid();
  drawTowerRange();
  drawHover();
  drawTowers();
  drawEnemies();
  drawProjectiles();
};

const gameLoop = (timestamp) => {
  const delta = Math.min((timestamp - state.lastTime) / 1000, 0.05);
  state.lastTime = timestamp;

  updateTowers(delta);
  updateProjectiles(delta);
  updateEnemies(delta);

  if (state.lives <= 0) {
    setStatus("Üs düştü! Sayfayı yenileyip tekrar dene.");
  }

  if (state.enemies.length === 0 && !state.waveReady) {
    state.wave += 1;
    state.waveReady = true;
    setStatus("Hazır olduğunda yeni dalgayı başlat.");
  }

  updateUI();
  draw();
  requestAnimationFrame(gameLoop);
};

const getCellFromEvent = (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const col = Math.floor(x / GRID_SIZE);
  const row = Math.floor(y / GRID_SIZE);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
    return null;
  }
  return { col, row };
};

const isCellOccupied = (col, row) => {
  return state.towers.some((tower) => tower.col === col && tower.row === row);
};

canvas.addEventListener("mousemove", (event) => {
  state.hoverCell = getCellFromEvent(event);
});

canvas.addEventListener("mouseleave", () => {
  state.hoverCell = null;
});

canvas.addEventListener("click", (event) => {
  if (!state.buildingMode) {
    return;
  }
  const cell = getCellFromEvent(event);
  if (!cell) {
    return;
  }
  if (pathSet.has(`${cell.col},${cell.row}`) || isCellOccupied(cell.col, cell.row)) {
    setStatus("Bu kareye kule yerleştirilemez.");
    return;
  }
  if (state.gold < towerConfig.cost) {
    setStatus("Altın yetersiz. Düşmanları durdur ve altın kazan.");
    return;
  }
  addTower(cell.col, cell.row);
  state.buildingMode = false;
  setStatus("Kule hazır! Yeni strateji için başka bir kule yerleştir.");
});

buildTowerBtn.addEventListener("click", () => {
  state.buildingMode = true;
  setStatus("Boş bir kareye tıklayarak kule yerleştir.");
  updateUI();
});

startWaveBtn.addEventListener("click", () => {
  if (!state.waveReady || state.enemies.length > 0) {
    return;
  }
  startWave();
  updateUI();
});

const init = () => {
  state.waveReady = true;
  setStatus("Hazır olduğunda dalga başlat.");
  updateUI();
  requestAnimationFrame(gameLoop);
};

init();
