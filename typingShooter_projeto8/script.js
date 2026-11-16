(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const ui = {
    overlay: document.querySelector("#overlay"), title: document.querySelector("#overlay-title"),
    copy: document.querySelector("#overlay-copy"), action: document.querySelector("#primary-action"),
    score: document.querySelector("#score"), wave: document.querySelector("#wave"),
    streak: document.querySelector("#streak"), accuracy: document.querySelector("#accuracy"),
    notice: document.querySelector("#notice")
  };

  const WORDS = ["pulso", "nexo", "trama", "eco", "vetor", "prisma", "orbita", "campo", "radar", "sintese", "lumen", "codigo", "vibra", "fenda", "matriz", "canal"];
  const state = { phase: "title", enemies: [], particles: [], lockedId: null, score: 0, wave: 1, streak: 0, hits: 0, attempts: 0, emp: 3, spawned: 0, quota: 5, nextSpawn: 0, lastFrame: 0, elapsed: 0, id: 0, flash: 0, metrics: { frames: [], lastReport: 0 } };

  const random = (min, max) => Math.random() * (max - min) + min;
  const choice = (list) => list[Math.floor(Math.random() * list.length)];
  const setNotice = (text) => { ui.notice.textContent = text; };
  const formatScore = () => String(state.score).padStart(6, "0");

  function reset() {
    Object.assign(state, { phase: "playing", enemies: [], particles: [], lockedId: null, score: 0, wave: 1, streak: 0, hits: 0, attempts: 0, emp: 3, spawned: 0, quota: 5, nextSpawn: .65, elapsed: 0, id: 0, flash: 0 });
    ui.overlay.classList.add("hidden"); updateHud(); setNotice("Canal aberto. Digite a primeira letra de um Ruído.");
  }

  function updateHud() {
    ui.score.textContent = formatScore();
    ui.wave.textContent = String(state.wave).padStart(2, "0");
    ui.streak.textContent = `×${Math.min(5, 1 + Math.floor(state.streak / 3))}`;
    ui.accuracy.textContent = `${state.attempts ? Math.round((state.hits / state.attempts) * 100) : 100}%`;
  }

  function spawn() {
    const word = choice(WORDS.filter((item) => !state.enemies.some((enemy) => enemy.word === item)));
    if (!word) return;
    state.enemies.push({ id: ++state.id, word, typed: 0, x: random(80, canvas.width - 80), y: -25, speed: 16 + state.wave * 5 + random(0, 9), radius: 24 + word.length * 2, phase: random(0, Math.PI * 2) });
    state.spawned += 1;
  }

  function beginNextWave() {
    state.wave += 1; state.spawned = 0; state.quota = 4 + state.wave * 2; state.nextSpawn = 1.2;
    state.emp = Math.min(3, state.emp + 1); setNotice(`Onda ${state.wave}: padrão de Ruídos mais denso.`); updateHud();
  }

  function emit(x, y, color, count = 14) {
    for (let i = 0; i < count; i += 1) state.particles.push({ x, y, vx: random(-70, 70), vy: random(-70, 70), life: random(.25, .7), color });
  }

  function destroy(enemy) {
    const multiplier = Math.min(5, 1 + Math.floor(state.streak / 3));
    state.score += (10 + enemy.word.length * 2) * multiplier; state.streak += 1;
    emit(enemy.x, enemy.y, "#6df1d2", 22); state.enemies = state.enemies.filter((item) => item.id !== enemy.id); state.lockedId = null;
    setNotice(`Sinal decodificado. Carga EMP: ${state.emp}.`); updateHud();
  }

  function breach(enemy) {
    emit(enemy.x, enemy.y, "#ff9c6c", 28); state.phase = "gameOver"; state.lockedId = null;
    ui.title.textContent = "Transmissão perdida";
    ui.copy.textContent = `Pontuação ${formatScore()} · Onda ${String(state.wave).padStart(2, "0")} · Precisão ${ui.accuracy.textContent}.`;
    ui.action.textContent = "Transmitir novamente"; ui.overlay.classList.remove("hidden"); setNotice("Um Ruído alcançou a antena.");
  }

  function typeCharacter(key) {
    if (state.phase !== "playing" || !/^[a-zç]$/i.test(key)) return;
    const letter = key.toLowerCase(); state.attempts += 1;
    let target = state.enemies.find((enemy) => enemy.id === state.lockedId);
    if (!target) {
      target = state.enemies.filter((enemy) => enemy.word[0] === letter).sort((a, b) => b.y - a.y || a.id - b.id)[0];
      if (target) state.lockedId = target.id;
    }
    if (target && target.word[target.typed] === letter) {
      target.typed += 1; state.hits += 1; emit(canvas.width / 2, canvas.height - 80, "#6df1d2", 5);
      if (target.typed === target.word.length) destroy(target); else setNotice(`Alvo travado: ${target.word.slice(target.typed)}.`);
    } else {
      state.streak = 0; state.flash = .18; setNotice(target ? "Caractere não pertence ao alvo travado." : "Nenhum Ruído responde a essa frequência.");
    }
    updateHud();
  }

  function emp() {
    if (state.phase !== "playing") return;
    if (!state.emp) { setNotice("EMP recarregando. Decodifique Ruídos para recuperar carga."); return; }
    state.emp -= 1; state.score += state.enemies.length * 8; state.enemies.forEach((enemy) => emit(enemy.x, enemy.y, "#b6b2ff", 20)); state.enemies = []; state.lockedId = null; state.flash = .5;
    setNotice("Pulso de área disparado."); updateHud();
  }

  function togglePause() {
    if (state.phase === "playing") { state.phase = "paused"; ui.title.textContent = "Canal em espera"; ui.copy.textContent = "A simulação está congelada. Retome quando estiver pronto."; ui.action.textContent = "Retomar"; ui.overlay.classList.remove("hidden"); }
    else if (state.phase === "paused") { state.phase = "playing"; ui.overlay.classList.add("hidden"); setNotice("Canal retomado."); }
  }

  function drawBackground(time) {
    ctx.fillStyle = state.flash > 0 ? "#263342" : "#07151d"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(109, 241, 210, .09)"; ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y + Math.sin(time + y) * 8); ctx.stroke(); }
    for (let x = 0; x < canvas.width; x += 38) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.sin(time + x) * 8, canvas.height); ctx.stroke(); }
    ctx.fillStyle = "#6df1d2"; ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height - 70, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(109,241,210,.2)"; ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height - 70, 34 + Math.sin(time * 4) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8ba7ad"; ctx.font = "14px Trebuchet MS"; ctx.fillText(`EMP ${"◆".repeat(state.emp)}${"◇".repeat(3 - state.emp)}`, 22, canvas.height - 24);
  }

  function drawEnemy(enemy) {
    const locked = enemy.id === state.lockedId; const glow = locked ? "#ff9c6c" : "#6df1d2";
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.phase + state.elapsed * .25); ctx.strokeStyle = glow; ctx.lineWidth = locked ? 3 : 1.5; ctx.beginPath(); ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const prefix = enemy.word.slice(0, enemy.typed); const rest = enemy.word.slice(enemy.typed); ctx.font = "600 21px Trebuchet MS"; const width = ctx.measureText(enemy.word).width + 24;
    ctx.fillStyle = "rgba(5, 16, 24, .88)"; ctx.fillRect(enemy.x - width / 2, enemy.y - 11, width, 31);
    ctx.fillStyle = glow; ctx.fillText(prefix, enemy.x - width / 2 + 12, enemy.y + 11); ctx.fillStyle = "#dce9e9"; ctx.fillText(rest, enemy.x - width / 2 + 12 + ctx.measureText(prefix).width, enemy.y + 11);
  }

  function update(dt) {
    state.elapsed += dt; state.flash = Math.max(0, state.flash - dt);
    if (state.spawned < state.quota) { state.nextSpawn -= dt; if (state.nextSpawn <= 0) { spawn(); state.nextSpawn = Math.max(.55, 1.55 - state.wave * .07); } }
    state.enemies.forEach((enemy) => { enemy.y += enemy.speed * dt; enemy.x += Math.sin(state.elapsed * 1.3 + enemy.phase) * 15 * dt; if (enemy.y + enemy.radius >= canvas.height - 88) breach(enemy); });
    state.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }); state.particles = state.particles.filter((p) => p.life > 0);
    if (state.spawned >= state.quota && !state.enemies.length) beginNextWave();
  }

  function render() {
    drawBackground(state.elapsed); state.enemies.forEach(drawEnemy);
    state.particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 1.8); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }); ctx.globalAlpha = 1;
  }

  function loop(timestamp) {
    const dt = Math.min(.05, (timestamp - state.lastFrame) / 1000 || 0); state.lastFrame = timestamp;
    if (state.phase === "playing") update(dt); render();
    state.metrics.frames.push(dt); if (state.metrics.frames.length > 120) state.metrics.frames.shift();
    requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key === "Enter") { event.preventDefault(); emp(); return; }
    if (event.key.toLowerCase() === "p") { event.preventDefault(); togglePause(); return; }
    if (event.key === "Escape" && state.phase === "playing") togglePause();
    typeCharacter(event.key);
  });
  ui.action.addEventListener("click", () => { if (state.phase === "paused") togglePause(); else reset(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.phase === "playing") togglePause(); });
  requestAnimationFrame(loop);
})();
