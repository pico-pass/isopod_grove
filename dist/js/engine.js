import { SPECIES, UPGRADES, QUESTS, byId } from "./data.js";
export const SAVE_KEY = "isopod-grove-v1";
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const dayKey = (now = Date.now()) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
export function initialState(now = Date.now()) {
  return {
    version: 1,
    coins: 400,
    pending: 0,
    xp: 0,
    food: 85,
    humidity: 78,
    temperature: 24,
    population: { vulgare: 6 },
    discovered: ["vulgare"],
    breeding: {},
    upgrades: { space: 0, soil: 0, nursery: 0, feeder: 0, mister: 0 },
    daily: { day: dayKey(now), feed: 0, observe: 0, births: 0, claimed: [] },
    stats: { births: 0, sold: 0, earned: 0, explored: 0, played: 0 },
    cooldowns: {},
    logs: [{ at: now, type: "leaf", text: "공벌레 6마리와 함께 작은 숲을 시작했어요." }],
    savedAt: now,
    paused: false,
    sound: false,
  };
}
export function validateSave(raw, now = Date.now()) {
  if (
    !raw ||
    raw.version !== 1 ||
    !raw.population ||
    !raw.upgrades ||
    !Array.isArray(raw.discovered)
  )
    throw new Error("올바른 저장 파일이 아닙니다.");
  const s = initialState(now);
  const num = (v, min, max, fallback) => (Number.isFinite(v) ? clamp(v, min, max) : fallback);
  for (const k of ["coins", "pending", "xp"]) s[k] = num(raw[k], 0, 1e12, s[k]);
  for (const k of ["food", "humidity"]) s[k] = num(raw[k], 0, 100, s[k]);
  s.temperature = num(raw.temperature, 10, 40, 24);
  for (const u of UPGRADES) s.upgrades[u.id] = Math.floor(num(raw.upgrades[u.id], 0, u.max, 0));
  s.population = {};
  let room = 20 + s.upgrades.space * 20;
  for (const sp of SPECIES) {
    const n = Math.floor(num(raw.population[sp.id], 0, room, 0));
    if (n) {
      s.population[sp.id] = n;
      room -= n;
    }
    s.breeding[sp.id] = num(raw.breeding?.[sp.id], 0, sp.breed, 0);
  }
  if (!Object.values(s.population).some((n) => n >= 2)) {
    s.population = { vulgare: 6 };
    s.breeding = {};
  }
  s.discovered = [
    ...new Set([...raw.discovered.filter((id) => byId(id)), ...Object.keys(s.population)]),
  ];
  for (const k of Object.keys(s.stats)) s.stats[k] = num(raw.stats?.[k], 0, 1e12, 0);
  if (raw.daily?.day === dayKey(now)) {
    for (const q of QUESTS) s.daily[q.id] = Math.floor(num(raw.daily[q.id], 0, 1e6, 0));
    s.daily.claimed = Array.isArray(raw.daily.claimed)
      ? raw.daily.claimed.filter((id) => QUESTS.some((q) => q.id === id))
      : [];
  }
  if (Array.isArray(raw.logs))
    s.logs = raw.logs
      .filter((l) => typeof l.text === "string" && Number.isFinite(l.at))
      .slice(0, 60)
      .map((l) => ({
        text: l.text.slice(0, 200),
        at: num(l.at, 0, now, now),
        type: ["leaf", "heart", "search", "coins", "sprout", "flag", "clock"].includes(l.type)
          ? l.type
          : "leaf",
      }));
  s.savedAt = num(raw.savedAt, 0, now, now);
  s.paused = raw.paused === true;
  s.sound = raw.sound === true;
  for (const k of ["feed", "mist", "climate", "observe"])
    s.cooldowns[k] = num(raw.cooldowns?.[k], 0, now + 10000, 0);
  return s;
}
export class Game {
  constructor(state = initialState(), random = Math.random) {
    this.s = state;
    this.random = random;
  }
  get count() {
    return Object.values(this.s.population).reduce((a, b) => a + b, 0);
  }
  get capacity() {
    return 20 + this.s.upgrades.space * 20;
  }
  get comfortable() {
    return (
      this.s.food >= 25 &&
      this.s.humidity >= 65 &&
      this.s.humidity <= 85 &&
      this.s.temperature >= 20 &&
      this.s.temperature <= 26
    );
  }
  get canBreed() {
    return (
      this.s.food >= 15 &&
      this.s.humidity >= 50 &&
      this.s.humidity <= 92 &&
      this.s.temperature >= 18 &&
      this.s.temperature <= 28
    );
  }
  get rate() {
    return (
      SPECIES.reduce((n, s) => n + (this.s.population[s.id] || 0) * s.rate, 0) *
      (1 + this.s.upgrades.soil * 0.25) *
      (this.comfortable ? 1 : 0.4)
    );
  }
  interval(id) {
    return byId(id).breed * (1 - this.s.upgrades.nursery * 0.12);
  }
  log(text, type = "leaf", at = Date.now()) {
    this.s.logs.unshift({ at, type, text });
    this.s.logs = this.s.logs.slice(0, 60);
  }
  resetDaily(now = Date.now()) {
    if (this.s.daily.day !== dayKey(now))
      this.s.daily = { day: dayKey(now), feed: 0, observe: 0, births: 0, claimed: [] };
  }
  advance(seconds, now = Date.now()) {
    this.resetDaily(now);
    if (this.s.paused) return { births: 0, earned: 0 };
    let remain = clamp(seconds, 0, 28800),
      earned = 0;
    const babies = {};
    while (remain > 0) {
      const step = Math.min(remain, 5);
      remain -= step;
      this.s.stats.played += step;
      this.s.food = clamp(this.s.food - (0.015 + this.count * 0.0015) * step, 0, 100);
      this.s.humidity = clamp(this.s.humidity - 0.023 * step, 0, 100);
      const ambient = 24 + Math.sin(this.s.stats.played / 700) * 2.7;
      this.s.temperature += (ambient - this.s.temperature) * Math.min(1, step * 0.002);
      if (this.s.upgrades.feeder && this.s.food < 40) this.s.food = 85;
      if (this.s.upgrades.mister && this.s.humidity < 65) this.s.humidity = 78;
      const income = this.rate * step;
      this.s.pending += income;
      earned += income;
      if (this.canBreed) {
        for (const sp of SPECIES) {
          if ((this.s.population[sp.id] || 0) < 2) continue;
          const limit = this.interval(sp.id);
          this.s.breeding[sp.id] = Math.min(limit, (this.s.breeding[sp.id] || 0) + step);
          if (this.s.breeding[sp.id] >= limit && this.count < this.capacity) {
            this.s.breeding[sp.id] = 0;
            this.s.population[sp.id]++;
            babies[sp.id] = (babies[sp.id] || 0) + 1;
            this.s.xp += 8;
            this.s.stats.births++;
            this.s.daily.births++;
          }
        }
      }
    }
    const births = Object.values(babies).reduce((a, b) => a + b, 0);
    if (births)
      this.log(
        Object.entries(babies)
          .map(([id, n]) => `${byId(id).name} ${n}마리`)
          .join(", ") + "가 태어났어요.",
        "heart",
        now,
      );
    return { births, earned };
  }
  guard() {
    return this.s.paused
      ? { ok: false, message: "일시정지를 해제하면 숲을 돌볼 수 있어요." }
      : null;
  }
  care(action, now = Date.now()) {
    const blocked = this.guard();
    if (blocked) return blocked;
    this.resetDaily(now);
    if ((this.s.cooldowns[action] || 0) > now)
      return { ok: false, message: "조금만 기다려 주세요." };
    if (action === "feed") {
      this.s.food = clamp(this.s.food + 30, 0, 100);
      this.s.daily.feed++;
      this.s.xp += 4;
    } else if (action === "mist") this.s.humidity = 78;
    else if (action === "climate") this.s.temperature = 24;
    else return { ok: false, message: "알 수 없는 행동이에요." };
    this.s.cooldowns[action] = now + 10000;
    return {
      ok: true,
      message: {
        feed: "신선한 낙엽을 채웠어요. 맛있게 먹어!",
        mist: "숲이 촉촉해졌어요. 습도 78%",
        climate: "포근한 24°C로 맞췄어요.",
      }[action],
    };
  }
  observe(id, now = Date.now()) {
    const blocked = this.guard();
    if (blocked) return blocked;
    if (!this.s.population[id]) return { ok: false, message: "아직 만나지 못한 식구예요." };
    this.resetDaily(now);
    if ((this.s.cooldowns.observe || 0) > now) return { ok: false, quiet: true };
    this.s.cooldowns.observe = now + 3000;
    this.s.coins += 2;
    this.s.stats.earned += 2;
    this.s.xp++;
    this.s.daily.observe++;
    return { ok: true, message: `${byId(id).name} 관찰 완료! +2 G`, coins: 2 };
  }
  collect() {
    const blocked = this.guard();
    if (blocked) return blocked;
    const amount = Math.floor(this.s.pending);
    if (amount < 1)
      return { ok: false, message: "식구들이 수익을 모으고 있어요. 잠시만 기다려 주세요." };
    this.s.pending -= amount;
    this.s.coins += amount;
    this.s.stats.earned += amount;
    this.log(`${amount.toLocaleString("ko-KR")} G 수익을 받았어요.`, "coins");
    return {
      ok: true,
      message: `숲이 모아준 수익 +${amount.toLocaleString("ko-KR")} G`,
      coins: amount,
    };
  }
  explore() {
    const blocked = this.guard();
    if (blocked) return blocked;
    if (this.count + 2 > this.capacity)
      return {
        ok: false,
        message: "새 식구 2마리를 위한 자리가 부족해요. 사육장을 확장하거나 분양해 주세요.",
      };
    if (this.s.coins < 180)
      return {
        ok: false,
        message: "탐색에는 180 G가 필요해요. 수익을 받거나 식구를 분양해 보세요.",
      };
    this.s.coins -= 180;
    const r = this.random() * 100;
    const rarity = r < 65 ? 0 : r < 85 ? 1 : r < 95 ? 2 : r < 98.5 ? 3 : 4;
    const pool = SPECIES.filter((sp) => sp.rarity === rarity);
    const sp = pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))];
    const isNew = !this.s.discovered.includes(sp.id);
    this.s.population[sp.id] = (this.s.population[sp.id] || 0) + 2;
    if (isNew) this.s.discovered.push(sp.id);
    this.s.xp += isNew ? 25 : 10;
    this.s.stats.explored++;
    this.log(`${sp.name} 2마리를 만났어요.${isNew ? " 도감에 새롭게 기록했어요!" : ""}`, "search");
    return { ok: true, species: sp, isNew, message: `${sp.name} 2마리가 숲에 왔어요!` };
  }
  sell(id, quantity) {
    const blocked = this.guard();
    if (blocked) return blocked;
    const sp = byId(id);
    if (!sp || !Number.isInteger(quantity) || quantity < 1)
      return { ok: false, message: "분양 수량을 확인해 주세요." };
    const n = this.s.population[id] || 0;
    if (n - quantity < 2) return { ok: false, message: "번식을 위해 2마리는 남겨둬야 해요." };
    const amount = sp.price * quantity;
    this.s.population[id] -= quantity;
    this.s.coins += amount;
    this.s.stats.sold += quantity;
    this.s.stats.earned += amount;
    this.s.xp += quantity * 3;
    this.log(`${sp.name} ${quantity}마리가 새집으로 갔어요. +${amount} G`, "coins");
    return { ok: true, message: `${sp.name} ${quantity}마리 분양 완료! +${amount} G` };
  }
  upgradeCost(id) {
    const u = UPGRADES.find((x) => x.id === id);
    return u ? Math.round(u.cost * Math.pow(u.factor, this.s.upgrades[id])) : Infinity;
  }
  upgrade(id) {
    const blocked = this.guard();
    if (blocked) return blocked;
    const u = UPGRADES.find((x) => x.id === id);
    if (!u || this.s.upgrades[id] >= u.max) return { ok: false, message: "이미 최고 단계예요." };
    const cost = this.upgradeCost(id);
    if (this.s.coins < cost)
      return { ok: false, message: `업그레이드에 ${cost.toLocaleString("ko-KR")} G가 필요해요.` };
    this.s.coins -= cost;
    this.s.upgrades[id]++;
    this.s.xp += 20;
    this.log(`${u.name} Lv. ${this.s.upgrades[id]} 업그레이드!`, "sprout");
    return { ok: true, message: `${u.name} 업그레이드 완료!` };
  }
  claim(id, now = Date.now()) {
    this.resetDaily(now);
    const q = QUESTS.find((x) => x.id === id);
    if (!q || this.s.daily.claimed.includes(id) || this.s.daily[id] < q.target)
      return { ok: false, message: "목표를 먼저 완료해 주세요." };
    this.s.daily.claimed.push(id);
    this.s.coins += q.reward;
    this.s.stats.earned += q.reward;
    this.s.xp += 15;
    this.log(`오늘의 목표 달성: ${q.label}. +${q.reward} G`, "flag");
    return { ok: true, message: `목표 보상 +${q.reward} G를 받았어요!` };
  }
}
