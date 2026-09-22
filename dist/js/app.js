import { SPECIES, RARITIES, UPGRADES, QUESTS, byId } from "./data.js";
import { Game, initialState, validateSave, SAVE_KEY } from "./engine.js";
const paths = {
  bug: "M8 8c0-5 8-5 8 0M7 8h10v9a5 5 0 0 1-10 0V8ZM9 3 7 1m8 2 2-2M3 10h4m10 0h4M3 15h4m10 0h4M4 21l4-3m8 0 4 3M8 12h8M8 16h8",
  leaf: "M20 3C8 2 2 8 5 15c3 7 14 6 15-12ZM4 21 15 10",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8",
  book: "M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2v16",
  bag: "M5 7h14l2 14H3L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
  sprout: "M12 22V12M12 16C3 16 3 8 3 8s9-1 9 8Zm0-5c0-8 9-9 9-9s1 10-9 9Z",
  journal: "M5 3h15v18H5V3ZM2 7h5m-5 5h5m-5 5h5m3-10h7m-7 5h7m-7 5h5",
  drop: "M12 2C9 7 4 10 4 15a8 8 0 0 0 16 0c0-5-5-8-8-13Z",
  thermometer: "M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-6v10m5-10h3m-3 4h3",
  coins:
    "M20 7c0 2-4 4-8 4S4 9 4 7s4-4 8-4 8 2 8 4ZM4 7v10c0 2 4 4 8 4s8-2 8-4V7M4 12c0 2 4 4 8 4s8-2 8-4",
  heart: "M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 3 10 8 15 5-5 12-10 8-15Z",
  flag: "M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  pause: "M8 5v14M16 5v14",
  play: "m7 3 14 9-14 9V3Z",
  volume: "M11 4 6 8H2v8h4l5 4V4Zm5 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14",
  volumeOff: "M11 4 6 8H2v8h4l5 4V4Zm5 5 6 6m0-6-6 6",
  cloud: "M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10h-2m-7-2 3 3 5-6",
  sparkles: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  arrowRight: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L20 5",
  x: "m6 6 12 12M18 6 6 18",
  download: "M12 2v13m-5-5 5 5 5-5M4 15v6h16v-6",
  lock: "M7 10V6a5 5 0 0 1 10 0v4M5 10h14v12H5V10Z",
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.leaf}"/></svg>`;
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const number = (n) => Math.floor(n).toLocaleString("ko-KR");
const set = (id, text) => {
  const el = $(id);
  if (el && el.textContent !== String(text)) el.textContent = text;
};
const fill = (id, n) => {
  const el = $(id);
  if (el) el.style.width = Math.min(100, Math.max(0, n)) + "%";
};
const image = (sp, cls = "") =>
  `<img class="${cls}" src="./assets/isopod.png" alt="${esc(sp.name)} 게임 캐릭터" style="filter:${sp.filter}" draggable="false">`;
const rarity = (sp) =>
  `<span class="pill" style="color:${RARITIES[sp.rarity].color}">${RARITIES[sp.rarity].name}</span>`;
let storageOK = true,
  state = initialState(),
  loadWarning = "";
try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) state = validateSave(JSON.parse(saved));
} catch (e) {
  storageOK = false;
  loadWarning =
    "저장 데이터를 읽지 못했어요. 새 숲으로 시작합니다. 저장 파일이 있다면 사육 일지에서 불러와 주세요.";
}
let game = new Game(state),
  selected = Object.keys(state.population)[0],
  view = "habitat",
  filter = "all",
  lastTick = Date.now(),
  lastSave = 0,
  creatureSignature = "",
  dailySignature = "",
  audioCtx;
const away = Math.max(0, Math.min(28800, (Date.now() - state.savedAt) / 1000));
const awayResult = game.advance(away);
state.savedAt = Date.now();
function installIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
    el.removeAttribute("data-icon");
  });
}
function toast(message, error = false) {
  if (!message) return;
  const el = document.createElement("div");
  el.className = "toast" + (error ? " error" : "");
  el.textContent = message;
  $("toast-region").append(el);
  while ($("toast-region").children.length > 3) $("toast-region").firstChild.remove();
  setTimeout(() => el.remove(), 4000);
}
function sound() {
  if (!state.sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(660, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    g.gain.setValueAtTime(0.045, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.2);
  } catch {}
}
function save() {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    storageOK = true;
    $("save-state").classList.remove("save-warning");
    $("save-state").innerHTML = icon("cloud") + "기기에 저장됨";
  } catch {
    storageOK = false;
    $("save-state").classList.add("save-warning");
    $("save-state").innerHTML = icon("cloud") + "저장 불가 · 일지에서 내보내기";
  }
  lastSave = Date.now();
}
function handle(result, quiet = false) {
  if (!quiet && !result.quiet) toast(result.message, !result.ok);
  if (result.ok) sound();
  render();
  save();
  return result.ok;
}
function burst(text) {
  const el = document.createElement("span");
  el.className = "float-text";
  el.textContent = text;
  el.style.left = 30 + Math.random() * 35 + "%";
  el.style.top = "48%";
  $("scene-effects").append(el);
  setTimeout(() => el.remove(), 1800);
}
function modal(html) {
  $("dialog-content").innerHTML = html;
  if (!$("game-dialog").open) $("game-dialog").showModal();
}
function closeModal() {
  $("game-dialog").close();
}
function go(next) {
  if (!["habitat", "collection", "market", "upgrades", "journal"].includes(next)) next = "habitat";
  view = next;
  document
    .querySelectorAll(".view")
    .forEach((el) => el.classList.toggle("active", el.id === "view-" + next));
  document.querySelectorAll(".nav-item").forEach((el) => {
    const active = el.dataset.view === next;
    el.classList.toggle("active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  if (location.hash !== "#" + next) history.replaceState(null, "", "#" + next);
  renderPage();
  $("main-content").focus({ preventScroll: true });
}
function renderStats() {
  set("coins", number(state.coins));
  set("population", game.count);
  set("capacity", game.capacity);
  set("nav-count", game.count);
  set("income-rate", Math.round(game.rate * 60));
  set("collection-count", state.discovered.length);
  set("nav-collection", `${state.discovered.length}/8`);
  set("scene-count", `${game.count}마리 거주 중`);
  set("habitat-level", `Lv. ${state.upgrades.space + 1}`);
  set("pending-income", number(state.pending));
  set("humidity-value", `${Math.round(state.humidity)}%`);
  set("temperature-value", `${state.temperature.toFixed(1)}°C`);
  set("food-value", `${Math.round(state.food)}%`);
  fill("humidity-fill", state.humidity);
  fill("temperature-fill", (state.temperature / 35) * 100);
  fill("food-fill", state.food);
  set(
    "food-note",
    state.upgrades.feeder
      ? "자동으로 채워져요"
      : state.food < 25
        ? "먹이를 채워 주세요"
        : "넉넉해요",
  );
  set(
    "habitat-mood",
    state.paused
      ? "숲이 잠시 쉬고 있어요"
      : game.count === game.capacity
        ? "새 식구를 위해 공간을 넓혀 주세요"
        : game.comfortable
          ? "모두 편안하게 지내고 있어요"
          : "먹이와 환경을 확인해 주세요",
  );
  const level = Math.floor(state.xp / 100) + 1;
  set(
    "keeper-level",
    `Lv. ${level} · ${level < 4 ? "초보 사육사" : level < 10 ? "숲의 친구" : "베테랑 숲지기"}`,
  );
  fill("xp-fill", state.xp % 100);
  set("xp-label", `${Math.floor(state.xp % 100)} / 100`);
  for (const [action, id] of [
    ["feed", "feed-button"],
    ["mist", "mist-button"],
    ["climate", "climate-button"],
  ]) {
    const remaining = Math.ceil(((state.cooldowns[action] || 0) - Date.now()) / 1000);
    const el = $(id);
    el.disabled = state.paused || remaining > 0;
    el.querySelector("small").textContent =
      remaining > 0
        ? `${remaining}초 후 다시`
        : {
            feed: state.upgrades.feeder ? "자동 공급 중 · 무료" : "낙엽 뷔페 · 무료",
            mist: state.upgrades.mister ? "자동 분무 중 · 무료" : "촉촉한 숲 · 무료",
            climate: "적정 온도 · 무료",
          }[action];
  }
  $("collect-button").disabled = state.paused || state.pending < 1;
  $("pause-button").innerHTML = icon(state.paused ? "play" : "pause");
  $("pause-button").setAttribute("aria-label", state.paused ? "게임 계속하기" : "게임 일시정지");
  $("pause-button").setAttribute("aria-pressed", String(state.paused));
  $("terrarium").classList.toggle("is-paused", state.paused);
  const paused = $("paused-label");
  if (state.paused && !paused) {
    const el = document.createElement("div");
    el.id = "paused-label";
    el.className = "paused-label";
    el.textContent = "잠깐 쉬어가는 중";
    $("terrarium").append(el);
  } else if (!state.paused && paused) paused.remove();
}
function renderSelected() {
  const sp = byId(selected) || SPECIES[0];
  $("selected-image").style.filter = sp.filter;
  $("selected-image").alt = sp.name + " 게임 캐릭터";
  set("selected-name", sp.name);
  set("selected-latin", sp.latin);
  set("selected-number", "NO. " + String(SPECIES.indexOf(sp) + 1).padStart(3, "0"));
  set("selected-count", `${state.population[sp.id] || 0}마리`);
  set("selected-price", `${sp.price} G`);
  set("selected-rarity", RARITIES[sp.rarity].name);
  $("selected-rarity").style.color = RARITIES[sp.rarity].color;
  const progress = state.breeding[sp.id] || 0,
    seconds = Math.ceil(game.interval(sp.id) - progress);
  set(
    "breeding-time",
    state.paused
      ? "일시정지"
      : game.count >= game.capacity
        ? "공간 부족"
        : !game.canBreed
          ? "환경 회복 대기"
          : `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, "0")}초`,
  );
  fill("breeding-fill", (progress / game.interval(sp.id)) * 100);
  set(
    "breeding-note",
    game.count >= game.capacity
      ? "분양하거나 사육장을 확장해 주세요."
      : !game.canBreed
        ? "먹이·습도·온도를 회복하면 번식이 재개돼요."
        : "두 마리 이상이면 새 식구가 태어나요.",
  );
}
function renderDaily() {
  const sig = JSON.stringify(state.daily);
  if (sig === dailySignature) return;
  dailySignature = sig;
  set("daily-count", `${state.daily.claimed.length}/3`);
  $("daily-quests").innerHTML = QUESTS.map((q) => {
    const complete = state.daily[q.id] >= q.target,
      claimed = state.daily.claimed.includes(q.id);
    return `<div class="quest"><span class="quest-check ${complete ? "complete" : ""}">${complete ? icon("check") : ""}</span><div class="quest-info"><div class="quest-title">${q.label}<span>${Math.min(q.target, state.daily[q.id])}/${q.target}</span></div><div class="quest-progress"><i style="width:${Math.min(100, (state.daily[q.id] / q.target) * 100)}%"></i></div><div class="quest-reward"><span>${claimed ? "보상 받음" : `보상 ${q.reward} G`}</span>${complete && !claimed ? `<button class="claim-button" data-claim="${q.id}">받기</button>` : ""}</div></div></div>`;
  }).join("");
}
function renderCreatures() {
  const sig = JSON.stringify(state.population);
  if (sig === creatureSignature) return;
  creatureSignature = sig;
  const all = [];
  SPECIES.forEach((sp) => {
    for (let i = 0; i < (state.population[sp.id] || 0); i++) all.push(sp);
  });
  const shown =
    all.length <= 16
      ? all
      : [...SPECIES.filter((sp) => state.population[sp.id]), ...all].slice(0, 16);
  $("creatures").innerHTML = shown
    .map(
      (sp, i) =>
        `<button class="creature ${sp.id === selected ? "selected" : ""}" data-species="${sp.id}" aria-label="${sp.name} 관찰하기" style="left:${8 + ((i * 31.7) % 74)}%;top:${12 + ((i * 23.4) % 67)}%;--angle:${((i * 37) % 90) - 45}deg">${image(sp)}</button>`,
    )
    .join("");
  set("residents-total", `${Object.keys(state.population).length}종`);
  $("residents-list").innerHTML = SPECIES.filter((sp) => state.population[sp.id])
    .map(
      (sp) =>
        `<button class="resident" data-select="${sp.id}">${image(sp)}<span><span class="resident-name">${sp.name}</span><small>${RARITIES[sp.rarity].name} · 분당 ${(sp.rate * 60 * (1 + state.upgrades.soil * 0.25)).toFixed(1)} G / 마리</small></span><b>${state.population[sp.id]}마리</b></button>`,
    )
    .join("");
}
function wander() {
  if (state.paused || view !== "habitat" || document.hidden) return;
  document.querySelectorAll(".creature").forEach((el) => {
    const x = 5 + Math.random() * 72,
      y = 9 + Math.random() * 62;
    el.style.setProperty("--angle", Math.random() * 160 - 80 + "deg");
    el.style.left = x + "%";
    el.style.top = y + "%";
  });
}
function renderBook() {
  const count = state.discovered.length;
  set("book-progress", `${count} / 8`);
  set("book-percent", Math.round((count / 8) * 100) + "%");
  fill("book-fill", (count / 8) * 100);
  const list = SPECIES.filter(
    (sp) => filter === "all" || (filter === "found") === state.discovered.includes(sp.id),
  );
  $("species-grid").innerHTML =
    list
      .map((sp) => {
        const found = state.discovered.includes(sp.id);
        return `<button class="species-card ${found ? "" : "undiscovered"}" data-detail="${sp.id}">${found ? rarity(sp) : `<span class="pill">${icon("lock")} 미발견</span>`}${image(sp)}<h3>${found ? sp.name : "아직 만나지 못한 친구"}</h3><p>${found ? sp.latin : "숲을 탐색하며 발견해 보세요"}</p><div class="card-bottom"><span>${found ? `${state.population[sp.id] || 0}마리 보유` : "???"}</span><span>${found ? sp.price + " G" : "미발견"}</span></div></button>`;
      })
      .join("") || '<p class="empty">모든 친구를 만났어요. 도감 완성!</p>';
}
function renderMarket() {
  $("market-grid").innerHTML = SPECIES.filter((sp) => state.population[sp.id])
    .map((sp) => {
      const n = state.population[sp.id],
        available = Math.max(0, n - 2);
      return `<article class="market-card">${rarity(sp)}${image(sp)}<h3>${sp.name}</h3><p>보유 ${n}마리 · 분양 가능 ${available}마리<br>한 마리당 <strong>${sp.price} G</strong></p><div class="sell-options"><button class="button secondary" data-sell="${sp.id}" data-quantity="1" ${available < 1 || state.paused ? "disabled" : ""}>1마리 분양</button><button class="button primary" data-sell="${sp.id}" data-quantity="${Math.min(5, available)}" ${available < 1 || state.paused ? "disabled" : ""}>${Math.min(5, available) || 0}마리 · ${number(Math.min(5, available) * sp.price)} G</button></div></article>`;
    })
    .join("");
}
function effect(u, level) {
  switch (u.id) {
    case "space":
      return `${20 + level * 20}마리`;
    case "soil":
      return `수익 +${level * 25}%`;
    case "nursery":
      return `번식 시간 −${level * 12}%`;
    default:
      return level ? "자동 관리" : "직접 관리";
  }
}
function renderUpgrades() {
  $("upgrade-grid").innerHTML = UPGRADES.map((u) => {
    const level = state.upgrades[u.id],
      max = level >= u.max,
      cost = game.upgradeCost(u.id);
    return `<article class="upgrade-card">${icon(u.icon)}<span class="upgrade-level">Lv. ${level} / ${u.max}</span><h2>${u.name}</h2><p>${u.description}</p><div class="upgrade-effect">${effect(u, level)} ${max ? "" : icon("arrowRight") + effect(u, level + 1)}</div><button class="button ${max ? "secondary" : "primary"} full" data-upgrade="${u.id}" ${max || state.paused ? "disabled" : ""}><span>${max ? "최고 단계 달성" : "업그레이드"}</span><span>${max ? icon("check") : number(cost) + " G"}</span></button></article>`;
  }).join("");
}
function renderJournal() {
  $("journal-overview").innerHTML = [
    ["새로 태어난 식구", state.stats.births, "마리"],
    ["새집을 찾은 식구", state.stats.sold, "마리"],
    ["지금까지 받은 골드", state.stats.earned, "G"],
  ]
    .map(
      ([label, n, unit]) =>
        `<div class="journal-stat">${label}<strong>${number(n)} <small>${unit}</small></strong></div>`,
    )
    .join("");
  $("journal-list").innerHTML =
    state.logs
      .map(
        (l) =>
          `<div class="journal-entry">${icon(l.type)}<div><p>${esc(l.text)}</p><time datetime="${new Date(l.at).toISOString()}">${new Date(l.at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div></div>`,
      )
      .join("") || '<div class="empty">이곳에 작은 숲의 이야기가 쌓일 거예요.</div>';
}
function renderPage() {
  if (view === "collection") renderBook();
  else if (view === "market") renderMarket();
  else if (view === "upgrades") renderUpgrades();
  else if (view === "journal") renderJournal();
}
function render() {
  renderStats();
  renderSelected();
  renderDaily();
  renderCreatures();
  renderPage();
}
function showSpecies(id) {
  const sp = byId(id);
  if (!sp) return;
  const found = state.discovered.includes(id);
  if (!found) {
    modal(
      `<p class="eyebrow">AN UNDISCOVERED FRIEND</p><h2>아직 낙엽 아래 숨어 있어요</h2><p>숲 탐색으로 새로운 친구를 만나보세요. 일반 65%, 희귀 20%, 에픽 10%, 전설 3.5%, 신화 1.5% 확률로 등장해요.</p><button class="button primary full" data-action="explore">숲 탐색 · 180 G</button>`,
    );
    return;
  }
  modal(
    `<p class="eyebrow">FIELD NOTE · ${String(SPECIES.indexOf(sp) + 1).padStart(3, "0")}</p>${image(sp)}<div class="dialog-rarity">${rarity(sp)}</div><h2>${sp.name}</h2><p class="scientific">${sp.latin}</p><p>${sp.description}</p><div class="dialog-stats"><div>기본 자동 수익<strong>${(sp.rate * 60).toFixed(1)} G / 분</strong></div><div>한 마리 분양 가격<strong>${sp.price} G</strong></div><div>현재 번식 주기<strong>${Math.round(game.interval(sp.id))}초</strong></div><div>보유 개체<strong>${state.population[sp.id] || 0}마리</strong></div></div><p class="footnote">캐릭터는 게임용 공통 모델을 사용합니다. 외형·수치는 실제 종의 특징 및 사육 지침과 다를 수 있어요.</p><button class="button primary full" data-close>관찰 마치기</button>`,
  );
}
function explore() {
  const result = game.explore();
  if (!result.ok) {
    handle(result);
    return;
  }
  selected = result.species.id;
  creatureSignature = "";
  handle(result, true);
  const sp = result.species;
  modal(
    `<p class="eyebrow">${result.isNew ? "A NEW DISCOVERY" : "WELCOME TO THE GROVE"}</p>${image(sp)}<div class="dialog-rarity">${rarity(sp)}</div><h2>${result.isNew ? "처음 만난 작은 친구!" : "반가운 얼굴을 만났어요!"}</h2><p><strong>${sp.name} 2마리</strong>가 숲에 왔어요.<br>${result.isNew ? "도감에 새로운 기록이 추가됐어요." : "함께 지낼 식구가 더 늘어났어요."}</p><button class="button primary full" data-close>우리 숲에 온 걸 환영해!</button>`,
  );
}
function confirmSell(id, quantity) {
  const sp = byId(id);
  if (!sp || quantity < 1) return;
  modal(
    `<p class="eyebrow">A NEW HOME</p><h2>${sp.name} 분양하기</h2><p>${quantity}마리를 분양하고 <strong>${number(quantity * sp.price)} G</strong>를 받아요.<br>분양 후 ${Math.max(0, (state.population[id] || 0) - quantity)}마리가 숲에 남습니다.</p><button class="button primary full" data-confirm-sell="${id}" data-quantity="${quantity}">분양 확정 · ${number(quantity * sp.price)} G</button><button class="button secondary full" data-close>조금 더 함께 지낼래요</button>`,
  );
}
function exportSave() {
  save();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "isopod-grove-save.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("저장 파일을 내보냈어요. 안전하게 보관해 주세요.");
}
function tick() {
  const now = Date.now(),
    dt = (now - lastTick) / 1000;
  lastTick = now;
  const r = game.advance(dt, now);
  if (r.births) {
    toast(`작은 발소리! 새 식구 ${r.births}마리가 태어났어요.`);
    burst(`+${r.births}마리`);
    render();
  } else {
    renderStats();
    renderSelected();
    renderDaily();
  }
  if (now - lastSave > 5000) save();
}
installIcons();
render();
go(location.hash.slice(1) || "habitat");
save();
$("sound-button").innerHTML = icon(state.sound ? "volume" : "volumeOff");
$("sound-button").setAttribute("aria-pressed", String(state.sound));
$("sound-button").setAttribute("aria-label", state.sound ? "소리 끄기" : "소리 켜기");
document.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button || button.disabled) return;
  const d = button.dataset;
  if (d.view || d.go) {
    go(d.view || d.go);
    return;
  }
  if (d.filter) {
    filter = d.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((el) => el.classList.toggle("active", el === button));
    renderBook();
    return;
  }
  if (d.species) {
    selected = d.species;
    document
      .querySelectorAll(".creature")
      .forEach((el) => el.classList.toggle("selected", el.dataset.species === selected));
    const r = game.observe(selected);
    if (r.ok) {
      burst("+2 G");
      set("scene-notice", `${byId(selected).name} · 천천히 숲을 탐색하는 중`);
    }
    handle(r, r.quiet);
    return;
  }
  if (d.select) {
    selected = d.select;
    renderSelected();
    document
      .querySelectorAll(".creature")
      .forEach((el) => el.classList.toggle("selected", el.dataset.species === selected));
    toast(`${byId(selected).name} 식구들을 관찰하고 있어요.`);
    return;
  }
  if (d.detail) {
    showSpecies(d.detail);
    return;
  }
  if (d.claim) {
    handle(game.claim(d.claim));
    return;
  }
  if (d.action === "explore") {
    explore();
    return;
  }
  if (d.sell) {
    confirmSell(d.sell, Number(d.quantity));
    return;
  }
  if (d.confirmSell) {
    closeModal();
    handle(game.sell(d.confirmSell, Number(d.quantity)));
    return;
  }
  if (d.upgrade) {
    handle(game.upgrade(d.upgrade));
    creatureSignature = "";
    renderCreatures();
    return;
  }
  if ("close" in d) {
    closeModal();
    return;
  }
  switch (button.id) {
    case "feed-button":
      if (handle(game.care("feed"))) burst("냠냠! +먹이");
      break;
    case "mist-button":
      if (handle(game.care("mist"))) {
        const el = document.createElement("div");
        el.className = "mist-effect";
        $("scene-effects").append(el);
        setTimeout(() => el.remove(), 2100);
      }
      break;
    case "climate-button":
      if (handle(game.care("climate"))) burst("24°C");
      break;
    case "collect-button": {
      const r = game.collect();
      if (handle(r)) burst("+" + number(r.coins) + " G");
      break;
    }
    case "explore-button":
      explore();
      break;
    case "species-detail":
      showSpecies(selected);
      break;
    case "pause-button":
      tick();
      state.paused = !state.paused;
      lastTick = Date.now();
      render();
      save();
      toast(
        state.paused
          ? "숲이 잠시 쉬어갑니다. 오프라인 성장도 멈춰요."
          : "작은 숲의 시간이 다시 흐릅니다.",
      );
      break;
    case "sound-button":
      state.sound = !state.sound;
      button.innerHTML = icon(state.sound ? "volume" : "volumeOff");
      button.setAttribute("aria-pressed", String(state.sound));
      button.setAttribute("aria-label", state.sound ? "소리 끄기" : "소리 켜기");
      sound();
      save();
      break;
    case "help-button":
      modal(
        `<p class="eyebrow">WELCOME, LITTLE KEEPER</p><h2>작은 숲을 돌보는 방법</h2><ol><li><strong>돌보기</strong> — 먹이·습도·온도를 편안하게 유지해요. 무료로 10초마다 관리할 수 있어요.</li><li><strong>기다리기</strong> — 식구들이 골드를 모으고, 같은 종이 2마리 이상이면 자동 번식해요.</li><li><strong>수익 받기</strong> — 모인 골드를 받아 탐색하거나 업그레이드해요.</li><li><strong>분양하기</strong> — 번식용 2마리를 남기고 새집을 찾아주세요.</li><li><strong>탐색하기</strong> — 180 G로 무작위 종 2마리를 만나요.</li></ol><p>자동 저장은 이 브라우저에서만 유지돼요. 자리를 비워도 최대 8시간 성장하며, 환경이 나빠지면 번식이 멈추고 수익이 줄어듭니다. 일시정지 상태에서는 오프라인 성장도 멈춰요.</p><button class="button primary full" data-close>숲으로 돌아가기</button>`,
      );
      break;
    case "dialog-close":
      closeModal();
      break;
    case "export-button":
      exportSave();
      break;
    case "import-button":
      $("import-file").click();
      break;
  }
});
$("game-dialog").addEventListener("click", (e) => {
  if (e.target === $("game-dialog")) {
    const r = $("game-dialog").getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      closeModal();
  }
});
$("import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (file.size > 1024 * 1024) {
    toast("1 MB 이하의 게임 저장 파일을 골라 주세요.", true);
    return;
  }
  try {
    const imported = validateSave(JSON.parse(await file.text()));
    modal(
      `<p class="eyebrow">CONTINUE YOUR STORY</p><h2>저장한 숲을 불러올까요?</h2><p>골드 ${number(imported.coins)} G · ${Object.values(imported.population).reduce((a, b) => a + b, 0)}마리의 식구가 있는 숲이에요.<br>현재 진행 상황이 이 기록으로 바뀝니다.</p><button class="button primary full" id="confirm-import">이 숲으로 이어하기</button><button class="button secondary full" data-close>취소</button>`,
    );
    $("confirm-import").addEventListener("click", () => {
      state = imported;
      game = new Game(state);
      game.advance(Math.min(28800, (Date.now() - state.savedAt) / 1000));
      selected = Object.keys(state.population)[0];
      creatureSignature = "";
      dailySignature = "";
      lastTick = Date.now();
      $("sound-button").innerHTML = icon(state.sound ? "volume" : "volumeOff");
      $("sound-button").setAttribute("aria-pressed", String(state.sound));
      $("sound-button").setAttribute("aria-label", state.sound ? "소리 끄기" : "소리 켜기");
      closeModal();
      render();
      save();
      toast("저장한 숲을 불러왔어요.");
    });
  } catch {
    toast("저장 파일을 읽지 못했어요. 이 게임에서 내보낸 JSON 파일인지 확인해 주세요.", true);
  }
});
window.addEventListener("pagehide", () => {
  tick();
  save();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
  else save();
});
window.addEventListener("hashchange", () => go(location.hash.slice(1)));
setInterval(tick, 1000);
setInterval(wander, 12500);
setTimeout(wander, 1200);
if (loadWarning) toast(loadWarning, true);
else if (!storageOK)
  toast("자동 저장이 제한된 브라우저예요. 사육 일지에서 저장 파일을 내보내 주세요.", true);
else if (away > 60 && !state.paused) {
  modal(
    `<p class="eyebrow">WELCOME BACK</p><h2>다시 만나 반가워요, 숲지기!</h2><p>자리를 비운 ${Math.floor(away / 3600)}시간 ${Math.floor((away % 3600) / 60)}분 동안 작은 숲도 자랐어요.</p><div class="dialog-stats"><div>모인 자동 수익<strong>+${number(awayResult.earned)} G</strong></div><div>태어난 새 식구<strong>+${awayResult.births}마리</strong></div></div><p>모인 골드는 ‘수익 받기’에서 받을 수 있어요. 먹이와 습도도 한 번 살펴주세요.</p><button class="button primary full" data-close>우리 숲 둘러보기</button>`,
  );
}
