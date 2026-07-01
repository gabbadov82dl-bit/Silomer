let score = 0;
let level = 1;
let bestScore = Number(localStorage.getItem("punchBestScore") || 0);
let timeLeft = 30;
let combo = 0;
let lastHitTime = 0;
let gameActive = false;
let timerId = null;
let audioCtx = null;
let power = 0;

const machine = document.getElementById("machine");
const bag = document.getElementById("bag");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const bestScoreEl = document.getElementById("best-score");
const timerEl = document.getElementById("timer");
const comboEl = document.getElementById("combo");
const messageEl = document.getElementById("message");
const punchBtn = document.getElementById("punch-btn");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const playerNameInput = document.getElementById("player-name");
const powerFillEl = document.getElementById("power-fill");
const powerValueEl = document.getElementById("power-value");
const creditEl = document.getElementById("credit");
const flashEl = document.getElementById("impact-flash");
let leaderboard = loadLeaderboard();

function updateUI() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  bestScoreEl.textContent = bestScore;
  timerEl.textContent = timeLeft;
  comboEl.textContent = combo;
  creditEl.textContent = gameActive ? "ON" : "ОСТАНОВЛЕНО";
  powerFillEl.style.width = `${Math.min(power, 100)}%`;
  powerValueEl.textContent = `${power}%`;
  startBtn.textContent = gameActive ? "ПОВТОР" : "СТАРТ";
  stopBtn.disabled = !gameActive;
}

function playSound(freq, duration, type = "triangle") {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const gain = audioCtx.createGain();
  gain.gain.value = 0.03;
  gain.connect(audioCtx.destination);

  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.connect(gain);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);

  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
}

function showImpact() {
  flashEl.classList.add("active");
  machine.classList.add("hit");
  setTimeout(() => {
    flashEl.classList.remove("active");
    machine.classList.remove("hit");
  }, 180);
}

function loadLeaderboard() {
  const raw = localStorage.getItem("punchLeaderboard");
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(0, 5).map(item => ({
      name: String(item.name || "Игрок"),
      score: Number(item.score || 0)
    }));
  } catch {
    return [];
  }
}

function saveLeaderboard() {
  localStorage.setItem("punchLeaderboard", JSON.stringify(leaderboard));
}

function sortLeaderboard() {
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 5) {
    leaderboard.length = 5;
  }
}

function renderLeaderboard() {
  const list = document.getElementById("leader-list");
  list.innerHTML = "";

  if (leaderboard.length === 0) {
    const item = document.createElement("li");
    item.className = "leaderboard-item";
    item.textContent = "Пока нет рекордов";
    item.style.gridColumn = "1 / -1";
    item.style.opacity = "0.75";
    list.appendChild(item);
    return;
  }

  leaderboard.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-item";

    const rank = document.createElement("span");
    rank.className = "leader-rank";
    rank.textContent = `${index + 1}.`;

    const name = document.createElement("span");
    name.className = "leader-name";
    name.textContent = entry.name;

    const scoreValue = document.createElement("span");
    scoreValue.className = "leader-score";
    scoreValue.textContent = entry.score;

    item.append(rank, name, scoreValue);
    list.appendChild(item);
  });
}

function addToLeaderboard() {
  if (score <= 0) {
    return;
  }

  const nameValue = playerNameInput.value.trim() || "Игрок";
  leaderboard = leaderboard.filter(entry => entry.name !== nameValue);
  leaderboard.push({ name: nameValue, score });
  sortLeaderboard();
  saveLeaderboard();

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("punchBestScore", bestScore);
  }

  renderLeaderboard();
}

function startGame() {
  score = 0;
  level = 1;
  combo = 0;
  power = 0;
  lastHitTime = 0;
  timeLeft = 30;
  gameActive = true;
  messageEl.textContent = "Игра началась! Тапай по мешку или жми УДАР.";

  if (timerId) {
    clearInterval(timerId);
  }

  updateUI();

  timerId = setInterval(() => {
    timeLeft -= 1;
    updateUI();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function punch() {
  if (!gameActive) {
    startGame();
  }

  const now = Date.now();
  if (now - lastHitTime > 1400) {
    combo = 0;
  }
  lastHitTime = now;

  const punchPower = Math.floor(Math.random() * 55) + 45 + level * 3;
  score += punchPower;
  combo += 1;
  power = Math.min(100, Math.round(punchPower / 6));

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("punchBestScore", bestScore);
  }

  const nextLevel = Math.floor(score / 300) + 1;
  if (nextLevel !== level) {
    level = nextLevel;
    messageEl.textContent = `Уровень ${level}! Сила удара ${punchPower}`;
  } else if (combo > 1 && combo % 5 === 0) {
    messageEl.textContent = `КОМБО ${combo}! +${punchPower}`;
  } else {
    messageEl.textContent = `Сила ${punchPower}. Серия ${combo}`;
  }

  updateUI();
  showImpact();
  playSound(220 + punchPower, 0.12, "sawtooth");

  if (navigator.vibrate) {
    navigator.vibrate(18);
  }

  bag.classList.remove("hit");
  void bag.offsetWidth;
  bag.classList.add("hit");
}

function stopGame() {
  if (!gameActive) {
    return;
  }

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  gameActive = false;
  messageEl.textContent = `Игра остановлена. Ты набрал ${score} очков.`;
  addToLeaderboard();
  updateUI();
}

function endGame() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  gameActive = false;
  messageEl.textContent = `Игра окончена! Ты набрал ${score} очков.`;
  addToLeaderboard();
  updateUI();
}

function handlePrimaryAction() {
  if (!gameActive) {
    startGame();
    punch();
    return;
  }

  punch();
}

punchBtn.addEventListener("click", handlePrimaryAction);
startBtn.addEventListener("click", startGame);
stopBtn.addEventListener("click", stopGame);
bag.addEventListener("click", handlePrimaryAction);
bag.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handlePrimaryAction();
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
    event.preventDefault();
    handlePrimaryAction();
  }
});

window.addEventListener("load", () => {
  renderLeaderboard();
  updateUI();
});

function goFullScreen() {
  const docEl = document.documentElement;

  if (!document.fullscreenElement) {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}