const CONFIG = {
  prenom: "Wifly",
  age: 38,
};

const COLORS = ["#ff5d4a", "#ffc53d", "#2ec4b6", "#ff7aa2", "#c9a6ff", "#8be28b", "#fff4df"];

const TAGLINES = [
  "officiellement plus légendaire qu’hier",
];

const WISHES = [
  "Que toutes tes Phobes soient parfaites, parfaitement parquetisées et absolument intouchables !",
  "Que la météo du jeu soit toujours avec toi et que les missiles ennemis t'évitent gentiment par politesse",
  "Que Baïne ne pisse pas dans ton lit",
  "Que Baïne ne boive plus l'huile de friture",

];

const SONG = [
  [392, 0.75], [392, 0.25], [440, 1], [392, 1], [523.25, 1], [493.88, 2],
  [392, 0.75], [392, 0.25], [440, 1], [392, 1], [587.33, 1], [523.25, 2],
  [392, 0.75], [392, 0.25], [783.99, 1], [659.25, 1], [523.25, 1], [493.88, 1], [440, 2],
  [698.46, 0.75], [698.46, 0.25], [659.25, 1], [523.25, 1], [587.33, 1], [523.25, 2],
];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("confetti");
const ctx2d = canvas.getContext("2d");
const party = document.getElementById("party");
const hero = document.getElementById("hero-name");
const tagline = document.getElementById("tagline");
const cake = document.getElementById("cake");
const candlesEl = document.getElementById("candles");
const meterBar = document.getElementById("meter-bar");
const hint = document.getElementById("hint");
const wish = document.getElementById("wish");
const wishText = document.getElementById("wish-text");
const blowBtn = document.getElementById("blow");
const musicBtn = document.getElementById("music");
const fanfare = document.getElementById("fanfare");
const micBtn = document.getElementById("mic");
const afterRow = document.getElementById("after");
const againBtn = document.getElementById("again");
const copyBtn = document.getElementById("copy");
const statusEl = document.getElementById("status");

const particles = [];
let name = "";
let age = null;
let partyOn = false;
let blown = false;
let blowing = false;
let power = 0;
let micHot = false;
let micOn = false;
let micStream = null;
let micLoop = 0;
let wishIndex = -1;
let audioCtx = null;
let musicOn = false;
let fanfareToken = 0;
let musicToken = 0;
let musicTimer = 0;
let relightAt = 0;
let baseHint = "Maintiens le bouton, ou la barre espace.";
let lastFrame = performance.now();
let rainAcc = 0;

function parseAge(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 120) return null;
  return rounded;
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burst(x, y, count, force = 1, rain = false) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 5) * force;
    particles.push({
      x,
      y,
      vx: rain ? (Math.random() - 0.5) * 0.7 : Math.cos(angle) * speed,
      vy: rain ? 1.2 + Math.random() * 1.4 : Math.sin(angle) * speed - 2,
      g: rain ? 0.012 : 0.08 + Math.random() * 0.06,
      w: 6 + Math.random() * 7,
      h: 7 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.25,
      life: rain ? 260 + Math.random() * 80 : 70 + Math.random() * 50,
      shape: Math.random() > 0.65 ? "rect" : "circle",
    });
  }
  if (particles.length > 420) particles.splice(0, particles.length - 420);
}

function drawParticles() {
  ctx2d.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.992;
    p.rot += p.vr;
    p.life -= 1;
    if (p.life <= 0 || p.y > innerHeight + 30) {
      particles.splice(i, 1);
      continue;
    }
    ctx2d.save();
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.globalAlpha = Math.min(1, p.life / 24);
    ctx2d.fillStyle = p.color;
    if (p.shape === "rect") ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    else {
      ctx2d.beginPath();
      ctx2d.arc(0, 0, p.w / 2, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();
  }
}

function audio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playNote(freq, time, dur) {
  const ac = audio();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const end = time + Math.max(0.12, dur);
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.05, time + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, end - 0.02);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(time);
  osc.stop(end);
}

function startMusic() {
  const token = ++musicToken;
  let index = 0;
  const step = () => {
    if (token !== musicToken) return;
    const [freq, beats] = SONG[index];
    const dur = beats * 0.34;
    playNote(freq, audio().currentTime + 0.04, dur);
    index += 1;
    let wait = dur * 1000;
    if (index >= SONG.length) {
      index = 0;
      wait += 650;
    }
    musicTimer = window.setTimeout(step, wait);
  };
  step();
}

function stopMusic() {
  musicToken += 1;
  window.clearTimeout(musicTimer);
}

function primeFanfare() {
  if (!fanfare.paused) return;
  const token = ++fanfareToken;
  fanfare.volume = 0;
  fanfare.play().then(() => {
    if (token !== fanfareToken) return;
    fanfare.pause();
    fanfare.currentTime = 0;
    fanfare.volume = 1;
  }).catch(() => {
    fanfare.volume = 1;
  });
}

function playFanfare() {
  fanfareToken += 1;
  if (musicOn) {
    musicOn = false;
    stopMusic();
    musicBtn.setAttribute("aria-pressed", "false");
    musicBtn.textContent = "Musique";
  }
  fanfare.volume = 1;
  try { fanfare.currentTime = 0; } catch { /* le fichier n’est pas encore prêt */ }
  fanfare.play().catch(() => {
    const retry = () => {
      document.removeEventListener("pointerdown", retry);
      fanfare.play().catch(() => {});
    };
    document.addEventListener("pointerdown", retry);
  });
}

function setHint(text) {
  hint.textContent = text;
}

function renderName(value) {
  hero.replaceChildren();
  [...value].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "letter";
    span.textContent = ch === " " ? "\u00A0" : ch;
    span.style.animationDelay = `${i * 0.045}s`;
    hero.appendChild(span);
  });
  const size = Math.max(2, Math.min(4.4, 26 / Math.max([...value].length, 1)));
  hero.style.fontSize = `${size}rem`;
}

function buildCandles(count) {
  candlesEl.replaceChildren();
  for (let i = 0; i < count; i += 1) {
    const candle = document.createElement("div");
    candle.className = i % 2 ? "candle tall" : "candle";
    candle.dataset.die = (0.42 + Math.random() * 0.45).toFixed(3);
    candle.innerHTML = '<span class="flame" aria-hidden="true"><span class="flame-inner"></span></span><span class="smoke" aria-hidden="true"></span>';
    candlesEl.appendChild(candle);
  }
  const hardest = candlesEl.children[Math.floor(Math.random() * count)];
  hardest.dataset.die = "0.98";
}

function refreshPower() {
  meterBar.style.width = `${Math.round(power * 100)}%`;
  candlesEl.querySelectorAll(".candle").forEach((candle) => {
    const die = Number(candle.dataset.die);
    const flame = candle.querySelector(".flame");
    const t = Math.min(1, power / die);
    flame.style.transform = `scale(${Math.max(0, 1 - t)})`;
    candle.classList.toggle("out", power >= die);
  });
  if (power >= 1) extinguish();
}

function cakePoint() {
  const rect = cake.getBoundingClientRect();
  return [rect.left + rect.width / 2, rect.top + 24];
}

function extinguish() {
  if (blown) return;
  blown = true;
  relightAt = performance.now() + 450;
  blowing = false;
  micHot = false;
  cake.classList.add("is-done");
  cake.classList.remove("is-blowing");
  cake.setAttribute("aria-label", "Gâteau avec les bougies soufflées");
  blowBtn.textContent = "Rallumer les bougies";
  blowBtn.setAttribute("aria-pressed", "false");
  if (!wishText.textContent) nextWish();
  wish.hidden = false;
  afterRow.hidden = false;
  setHint("Les bougies ont rendu l’âme. Le vœu, lui, est bien parti.");
  statusEl.textContent = `Joyeux anniversaire ${name}. Les bougies sont éteintes.`;
  const [x, y] = cakePoint();
  burst(x, y, 90, 1.5);
  window.setTimeout(() => burst(innerWidth * 0.2, y, 40, 1.1), 180);
  window.setTimeout(() => burst(innerWidth * 0.8, y, 40, 1.1), 320);
  playFanfare();
}

function relight() {
  blown = false;
  power = 0;
  cake.classList.remove("is-done", "is-blowing");
  cake.setAttribute("aria-label", "Gâteau d’anniversaire, bougies allumées");
  blowBtn.textContent = "Maintiens pour souffler";
  refreshPower();
  baseHint = "Elles sont revenues. Elles avaient oublié un truc.";
  setHint(baseHint);
  statusEl.textContent = "Les bougies sont rallumées.";
}

function nextWish() {
  let index = Math.floor(Math.random() * WISHES.length);
  if (WISHES.length > 1 && index === wishIndex) index = (index + 1) % WISHES.length;
  wishIndex = index;
  wishText.textContent = WISHES[index];
  wish.classList.remove("pop");
  void wish.offsetWidth;
  wish.classList.add("pop");
}

function startParty(rawName, rawAge) {
  const clean = [...rawName.trim()].slice(0, 40).join("");
  if (!clean) return false;
  name = clean;
  age = parseAge(rawAge);
  renderName(name);
  const bits = [];
  if (/^g[aâ]teau$/i.test(name)) bits.push("choix très méta, le gâteau est flatté");
  if (age) bits.push(age === 1 ? "1 an aujourd’hui" : `${age} ans aujourd’hui`);
  bits.push(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  tagline.textContent = bits.join(" · ");
  document.title = `Joyeux anniversaire ${name} !`;
  const count = age ? Math.min(age, 8) : 5;
  buildCandles(count);
  power = 0;
  blown = false;
  const extra = age && age > 8 ? " On en a planté 8. Les autres finissent la chantilly." : "";
  baseHint = `Maintiens le bouton, ou la barre espace.${extra}`;
  setHint(baseHint);
  party.hidden = false;
  partyOn = true;
  statusEl.textContent = `C’est l’anniversaire de ${name}.`;
  burst(innerWidth / 2, 70, reduceMotion ? 20 : 70, 1.15);
  return true;
}

function setBlowing(on) {
  if (!partyOn || blown) on = false;
  blowing = on;
  cake.classList.toggle("is-blowing", on);
  if (on) blowBtn.setAttribute("aria-pressed", "true");
  else if (!blown) blowBtn.setAttribute("aria-pressed", "false");
}

function applyMic(rms, dt) {
  if (!micOn || blown) {
    micHot = false;
    return;
  }
  if (rms > 0.08) {
    micHot = true;
    power = Math.min(1, power + dt * (0.9 + rms * 2.2));
    cake.classList.add("is-blowing");
    refreshPower();
  } else if (micHot) {
    micHot = false;
    if (!blowing) cake.classList.remove("is-blowing");
  }
}

function stopMic() {
  micOn = false;
  micHot = false;
  cancelAnimationFrame(micLoop);
  if (micStream) micStream.getTracks().forEach((track) => track.stop());
  micStream = null;
  micBtn.setAttribute("aria-pressed", "false");
  micBtn.textContent = "Micro";
  if (!blowing) cake.classList.remove("is-blowing");
}

async function toggleMic() {
  if (micOn) {
    stopMic();
    setHint("Micro coupé. Le bouton reste chaud.");
    return;
  }
  if (!window.isSecureContext || !navigator.mediaDevices) {
    setHint("Le micro ne s’allume qu’en localhost ou en https. Le bouton, lui, est prêt.");
    return;
  }
  try {
    audio();
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const ac = audio();
    const source = ac.createMediaStreamSource(micStream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    micOn = true;
    micBtn.setAttribute("aria-pressed", "true");
    micBtn.textContent = "Couper le micro";
    setHint("Le micro écoute. Souffle un bon coup vers l’écran.");
    let previous = performance.now();
    const loop = (now) => {
      if (!micOn) return;
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      applyMic(Math.sqrt(sum / data.length), dt);
      micLoop = requestAnimationFrame(loop);
    };
    micLoop = requestAnimationFrame(loop);
  } catch {
    setHint("Pas d’accès au micro. Maintiens le bouton, le gâteau comprend quand même.");
  }
}

async function copyWish() {
  const text = `Joyeux anniversaire ${name} ! ${wishText.textContent}`;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    area.remove();
  }
  if (copied) {
    copyBtn.textContent = "Copié !";
    window.setTimeout(() => {
      copyBtn.textContent = "Copier le vœu";
    }, 1500);
  } else {
    setHint("Le vœu est affiché juste au-dessus, prêt à être recopié.");
  }
}

function spawnBalloons() {
  const wrap = document.getElementById("balloons");
  for (let i = 0; i < 9; i += 1) {
    const balloon = document.createElement("div");
    balloon.className = "balloon";
    balloon.style.left = `${4 + Math.random() * 90}%`;
    balloon.style.background = COLORS[i % COLORS.length];
    balloon.style.animationDuration = `${11 + Math.random() * 9}s`;
    balloon.style.animationDelay = `-${Math.random() * 16}s`;
    balloon.style.setProperty("--s", (0.75 + Math.random() * 0.55).toFixed(2));
    wrap.appendChild(balloon);
  }
}

function tick(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (partyOn && !blown) {
    if (blowing) power = Math.min(1, power + dt * 0.72);
    else if (!micHot) power = Math.max(0, power - dt * 0.45);
    refreshPower();
  }
  if (!reduceMotion) {
    rainAcc += dt;
    if (rainAcc > 0.28) {
      rainAcc = 0;
      burst(Math.random() * innerWidth, -12, 1, 0.4, true);
    }
  }
  drawParticles();
  requestAnimationFrame(tick);
}

blowBtn.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || blown) return;
  event.preventDefault();
  try { audio(); } catch { /* le son est un bonus */ }
  primeFanfare();
  try { blowBtn.setPointerCapture(event.pointerId); } catch { /* le souffle part quand même */ }
  setBlowing(true);
});

function releaseBlow() {
  setBlowing(false);
}

blowBtn.addEventListener("pointerup", releaseBlow);
blowBtn.addEventListener("pointercancel", releaseBlow);

blowBtn.addEventListener("click", () => {
  if (performance.now() < relightAt) return;
  if (blown) relight();
});

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || !partyOn) return;
  if (event.target.closest("input, textarea")) return;
  const button = event.target.closest("button");
  if (button && button.id !== "blow") return;
  event.preventDefault();
  if (!blown) {
    try { audio(); } catch { /* le son est un bonus */ }
    primeFanfare();
    setBlowing(true);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") setBlowing(false);
});

musicBtn.addEventListener("click", () => {
  musicOn = !musicOn;
  musicBtn.setAttribute("aria-pressed", String(musicOn));
  musicBtn.textContent = musicOn ? "Couper la musique" : "Musique";
  if (musicOn) startMusic();
  else stopMusic();
});

micBtn?.addEventListener("click", () => {
  toggleMic();
});

againBtn.addEventListener("click", nextWish);
copyBtn?.addEventListener("click", () => {
  copyWish();
});

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("input, textarea, button, a")) return;
  const onCake = event.target.closest("#cake");
  burst(event.clientX, event.clientY, onCake ? 34 : 16, onCake ? 1.25 : 0.75);
  if (onCake && partyOn) {
    cake.classList.remove("boop");
    void cake.offsetWidth;
    cake.classList.add("boop");
    if (!blown) {
      const joke = "Le gâteau a gloussé. Il est un peu sensible.";
      setHint(joke);
      window.setTimeout(() => {
        if (!blown && hint.textContent === joke) setHint(baseHint);
      }, 1700);
    }
  }
});

window.addEventListener("resize", resize);

const params = new URLSearchParams(location.search);
const presetName = params.get("nom") || CONFIG.prenom;
const presetAge = params.has("age") ? params.get("age") : CONFIG.age;

resize();
spawnBalloons();
requestAnimationFrame(tick);
startParty(presetName, presetAge);
