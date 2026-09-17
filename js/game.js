(function() {
  const canvas = document.getElementById('game');
  if (!canvas) return; // dit script draait alleen als er een canvas is (spel.html)
  const ctx = canvas.getContext('2d');
  const scoreVal = document.getElementById('scoreVal');
  const livesVal = document.getElementById('livesVal');
  const levelVal = document.getElementById('levelVal');
  const highVal = document.getElementById('highVal');
  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const finalScoreText = document.getElementById('finalScoreText');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const resumeBtn = document.getElementById('resumeBtn');

  let W, H, DPR;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  let HIGH_SCORE = 0;
  try {
    const stored = localStorage.getItem('ruimtespel_highscore');
    if (stored) HIGH_SCORE = parseInt(stored, 10) || 0;
  } catch (e) { /* localStorage niet beschikbaar */ }
  highVal.textContent = HIGH_SCORE;

  let state = 'start'; // start, playing, paused, over
  let score = 0, lives = 3, level = 1;
  let ship, bullets, asteroids, particles, stars, keys;
  let spawnTimer = 0, frame = 0;

  function initGame() {
    ship = { x: W / 2, y: H - 60, w: 30, h: 30, speed: 4.5, cooldown: 0 };
    bullets = [];
    asteroids = [];
    particles = [];
    keys = {};
    score = 0; lives = 3; level = 1;
    spawnTimer = 0; frame = 0;
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3,
        speed: Math.random() * 0.6 + 0.2
      });
    }
    updateHUD();
  }

  function updateHUD() {
    scoreVal.textContent = score;
    livesVal.textContent = lives;
    levelVal.textContent = level;
  }

  function spawnAsteroid() {
    const size = Math.random() * 22 + 16;
    asteroids.push({
      x: Math.random() * (W - size) + size / 2,
      y: -size,
      w: size,
      vy: (Math.random() * 0.8 + 0.7) * (1 + level * 0.12),
      vx: (Math.random() - 0.5) * 1.2,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.05,
      hp: size > 30 ? 2 : 1
    });
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color
      });
    }
  }

  function update() {
    frame++;

    stars.forEach(s => {
      s.y += s.speed;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    });

    const left = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const right = keys['ArrowRight'] || keys['d'] || keys['D'];
    const up = keys['ArrowUp'] || keys['w'] || keys['W'];
    const down = keys['ArrowDown'] || keys['s'] || keys['S'];

    if (left) ship.x -= ship.speed;
    if (right) ship.x += ship.speed;
    if (up) ship.y -= ship.speed;
    if (down) ship.y += ship.speed;

    ship.x = Math.max(ship.w / 2, Math.min(W - ship.w / 2, ship.x));
    ship.y = Math.max(ship.h / 2, Math.min(H - ship.h / 2, ship.y));

    if (ship.cooldown > 0) ship.cooldown--;
    if ((keys[' '] || keys['Spacebar']) && ship.cooldown === 0) {
      bullets.push({ x: ship.x, y: ship.y - ship.h / 2, w: 4, h: 12, vy: -8 });
      ship.cooldown = 10;
    }

    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y > -20);

    spawnTimer++;
    const spawnRate = Math.max(22, 55 - level * 4);
    if (spawnTimer > spawnRate) {
      spawnTimer = 0;
      spawnAsteroid();
    }

    asteroids.forEach(a => {
      a.y += a.vy;
      a.x += a.vx;
      a.rot += a.vrot;
    });

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < a.w / 2 + 6) {
          bullets.splice(j, 1);
          a.hp--;
          spawnParticles(b.x, b.y, '#6ee7ff', 4);
          if (a.hp <= 0) {
            score += Math.round(a.w);
            spawnParticles(a.x, a.y, '#ff6ee0', 10);
            asteroids.splice(i, 1);
          }
          break;
        }
      }
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      const dx = a.x - ship.x, dy = a.y - ship.y;
      if (Math.sqrt(dx * dx + dy * dy) < a.w / 2 + ship.w / 2 - 4) {
        asteroids.splice(i, 1);
        spawnParticles(ship.x, ship.y, '#ff5a5a', 16);
        lives--;
        updateHUD();
        if (lives <= 0) {
          endGame();
          return;
        }
      }
    }

    asteroids = asteroids.filter(a => a.y < H + 50);

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    const newLevel = Math.floor(score / 400) + 1;
    if (newLevel !== level) { level = newLevel; }

    updateHUD();
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.beginPath();
    ctx.moveTo(0, -ship.h / 2);
    ctx.lineTo(ship.w / 2, ship.h / 2);
    ctx.lineTo(0, ship.h / 3);
    ctx.lineTo(-ship.w / 2, ship.h / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -ship.h / 2, 0, ship.h / 2);
    grad.addColorStop(0, '#6ee7ff');
    grad.addColorStop(1, '#3450c9');
    ctx.fillStyle = grad;
    ctx.fill();
    if (frame % 6 < 3) {
      ctx.beginPath();
      ctx.moveTo(-6, ship.h / 2);
      ctx.lineTo(0, ship.h / 2 + 10 + Math.random() * 6);
      ctx.lineTo(6, ship.h / 2);
      ctx.closePath();
      ctx.fillStyle = '#ffb84d';
      ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#ffffff';
    stars.forEach(s => {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes; i++) {
        const ang = (i / spikes) * Math.PI * 2;
        const r = a.w / 2 * (0.8 + (i % 2 === 0 ? 0.2 : 0));
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fillStyle = a.hp > 1 ? '#a97c50' : '#8a6a4a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
      ctx.restore();
    });

    ctx.fillStyle = '#6ee7ff';
    bullets.forEach(b => {
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    });

    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    drawShip();
  }

  function loop() {
    if (state === 'playing') {
      update();
      draw();
    }
    requestAnimationFrame(loop);
  }

  function endGame() {
    state = 'over';
    if (score > HIGH_SCORE) {
      HIGH_SCORE = score;
      try { localStorage.setItem('ruimtespel_highscore', String(HIGH_SCORE)); } catch (e) {}
      highVal.textContent = HIGH_SCORE;
    }
    // Sla score ook op in een lijstje voor de scores-pagina
    try {
      const list = JSON.parse(localStorage.getItem('ruimtespel_scores') || '[]');
      list.push({ score, level, date: new Date().toISOString() });
      list.sort((a, b) => b.score - a.score);
      localStorage.setItem('ruimtespel_scores', JSON.stringify(list.slice(0, 10)));
    } catch (e) {}

    finalScoreText.textContent = `Je score: ${score} — Level ${level}`;
    gameOverOverlay.classList.remove('hidden');
  }

  function startGame() {
    resize();
    initGame();
    state = 'playing';
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
  }

  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
    if ((e.key === 'p' || e.key === 'P') && state !== 'start' && state !== 'over') {
      togglePause();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      pauseOverlay.classList.remove('hidden');
    } else if (state === 'paused') {
      state = 'playing';
      pauseOverlay.classList.add('hidden');
    }
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);
  resumeBtn.addEventListener('click', togglePause);

  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnFire = document.getElementById('btnFire');

  function bindTouch(el, key) {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, {passive: false});
    el.addEventListener('mousedown', () => { keys[key] = true; });
    el.addEventListener('mouseup', () => { keys[key] = false; });
    el.addEventListener('mouseleave', () => { keys[key] = false; });
  }
  bindTouch(btnLeft, 'ArrowLeft');
  bindTouch(btnRight, 'ArrowRight');
  bindTouch(btnFire, ' ');

  let touchActive = false;
  canvas.addEventListener('touchmove', (e) => {
    if (state !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    ship.x = t.clientX - rect.left;
    ship.y = t.clientY - rect.top;
  }, {passive: false});

  resize();
  initGame();
  draw();
  requestAnimationFrame(loop);
})();
