import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type { GameState, LeaderboardResult, Species, StackFinishResponse, StackInfo, StackRewardInfo, StackStartResponse } from '../api/types';
import { RARITIES, formatDuration, getTotalPopulationBySpecies } from '../utils/gameCalc';
import {
  STACK_MAX_DELAY,
  STACK_MIN_DELAY,
  STACK_RANGE,
  STACK_START_W,
  STACK_TICK_MS,
  dropStackBlock,
  newStackGame,
  stackBlockSpec,
  stackBlockX,
  type StackBlockSpec,
  type StackGame,
} from '../utils/stack';
import { RankingList } from './RankingView';
import { RankingLimitPicker } from './RankingLimitPicker';
import { loadRankingLimit, saveRankingLimit, type RankingLimit } from '../utils/rankingLimit';
import { FALLBACK_IMAGE, SpeciesImage } from './SpeciesImage';

const VIEW_W = 600;
const VIEW_H = 380;
const SCALE = VIEW_W / STACK_RANGE; // 월드 좌표 → 화면
const BLOCK_H = 22;
const GROUND_Y = VIEW_H - 24;
const SETTLE_TICKS = 12; // 떨어뜨린 뒤 다음 통나무가 나오기까지의 연출 시간(게임 시간에는 안 들어간다)
const HUD_INTERVAL_MS = 100;
const PICK_STORAGE_KEY = 'isopod-stack-species';

type Phase = 'idle' | 'starting' | 'running' | 'over';

const rewardText = (r: StackRewardInfo) =>
  [
    r.explorationTickets ? `🎟️ 탐색권 ${r.explorationTickets}장` : '',
    r.equipmentShards ? `🔩 장비 조각 ${r.equipmentShards}개` : '',
    r.diamonds ? `💎 ${r.diamonds}개` : '',
  ]
    .filter(Boolean)
    .join(' · ');

// 쌓인 칸(그림용): 왼쪽 끝 x와 너비 w, 퍼펙트였는지
interface PlacedBlock {
  x: number;
  w: number;
  perfect: boolean;
}

interface Runtime {
  game: StackGame | null;
  spec: StackBlockSpec | null;
  placed: PlacedBlock[];
  delays: number[];
  tick: number; // 현재 통나무가 나온 뒤 흐른 틱
  settle: number; // 다음 통나무가 나올 때까지 남은 연출 틱
  acc: number;
  last: number;
  running: boolean;
  paused: boolean;
  hudAt: number;
  flash: { text: string; until: number } | null;
}

// 콩 쌓기 "흔들흔들 통나무 탑". 좌우로 움직이는 통나무를 알맞은 때에 떨어뜨려 탑을 쌓아요. 아래 칸과 겹친 만큼만 남고, 딱 맞추면(퍼펙트) 너비가 유지돼요.
// 화면은 여기서 그리지만 점수는 서버가 정한다: 시작할 때 서버가 시드와 희귀도를 정하고, 끝나면 "통나무마다 떨어뜨린 틱 수"만 보내서 서버가 같은 시뮬레이션을 다시 돌려 높이를 계산한다.
export function StackView({
  gameState,
  species,
  onStart,
  onFinish,
  showToast,
  onOpenProfile,
}: {
  gameState: GameState;
  species: Species[];
  onStart: (speciesId: string) => Promise<StackStartResponse | null>;
  onFinish: (delays: number[]) => Promise<StackFinishResponse | null>;
  showToast: (message: string, isError?: boolean) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [info, setInfo] = useState<StackInfo | null>(null);
  const [ranking, setRanking] = useState<LeaderboardResult | null>(null);
  const [rankingLimit, setRankingLimit] = useState<RankingLimit>(loadRankingLimit);
  const rankingLimitRef = useRef(rankingLimit);
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ height: 0, streak: 0, speed: 0 });
  const [result, setResult] = useState<StackFinishResponse | null>(null);
  const [pending, setPending] = useState<number[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pickedId, setPickedId] = useState<string>(() => {
    try {
      return localStorage.getItem(PICK_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [runSpeciesId, setRunSpeciesId] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rt = useRef<Runtime>({ game: null, spec: null, placed: [], delays: [], tick: 0, settle: 0, acc: 0, last: 0, running: false, paused: false, hudAt: 0, flash: null });
  const sprite = useRef<{ img: HTMLImageElement | null; ready: boolean; filter: string }>({ img: null, ready: false, filter: 'none' });
  const phaseRef = useRef<Phase>('idle');
  const submittingRef = useRef(false);
  const callbacks = useRef({ onStart, onFinish, showToast });

  useEffect(() => {
    callbacks.current = { onStart, onFinish, showToast };
  });

  const owned = useMemo(() => {
    const totals = getTotalPopulationBySpecies(gameState);
    return species
      .filter((sp) => (totals[sp.speciesId] || 0) > 0)
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, 'ko'));
  }, [gameState, species]);
  const selected = owned.find((sp) => sp.speciesId === pickedId) ?? owned[0] ?? null;
  const shownSpecies = species.find((sp) => sp.speciesId === (runSpeciesId || selected?.speciesId)) ?? selected;
  const tolerance = info?.rules.toleranceByRarity;

  const shownId = shownSpecies?.speciesId;
  const shownImage = shownSpecies?.image;
  const shownFilter = shownSpecies?.filter;
  useEffect(() => {
    const entry = { img: null as HTMLImageElement | null, ready: false, filter: shownFilter && shownFilter !== 'none' ? shownFilter : 'none' };
    const img = new Image();
    img.onload = () => {
      entry.ready = img.naturalWidth > 0;
    };
    img.onerror = () => {
      if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
    };
    img.src = shownImage ?? FALLBACK_IMAGE;
    entry.img = img;
    sprite.current = entry;
  }, [shownId, shownImage, shownFilter]);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const loadInfo = useCallback(async () => {
    try {
      setInfo(await api.getStack());
    } catch (e) {
      callbacks.current.showToast(e instanceof Error ? e.message : '쌓기 정보를 불러오지 못했어요.', true);
    }
  }, []);
  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api.getStackLeaderboard(rankingLimitRef.current));
    } catch {
      // 순위를 못 불러와도 쌓을 수 있다.
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(() => {
      void loadInfo();
      void loadRanking();
    });
  }, [loadInfo, loadRanking]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const changeRankingLimit = (limit: RankingLimit) => {
    rankingLimitRef.current = limit;
    setRankingLimit(limit);
    saveRankingLimit(limit);
    void loadRanking();
  };

  const pick = (speciesId: string) => {
    setPickedId(speciesId);
    try {
      localStorage.setItem(PICK_STORAGE_KEY, speciesId);
    } catch {
      // 저장하지 못해도 이번 접속에서는 고른 대로 쌓을 수 있다.
    }
  };

  const submit = useCallback(
    async (delays: number[]) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      const res = await callbacks.current.onFinish(delays);
      submittingRef.current = false;
      setSubmitting(false);
      if (res) {
        setResult(res);
        setPending(null);
        void loadInfo();
        void loadRanking();
      } else {
        setPending(delays);
      }
    },
    [loadInfo, loadRanking],
  );

  const spawn = useCallback(() => {
    const g = rt.current;
    if (!g.game) return;
    g.spec = stackBlockSpec(g.game);
    g.tick = 0;
    g.settle = 0;
  }, []);

  const endRun = useCallback(() => {
    const g = rt.current;
    g.running = false;
    changePhase('over');
    if (g.delays.length > 0) void submit(g.delays.slice());
    else changePhase('idle');
  }, [changePhase, submit]);

  const startRun = useCallback(async () => {
    if (phaseRef.current === 'starting' || phaseRef.current === 'running' || submittingRef.current) return;
    if (!selected) {
      callbacks.current.showToast('쌓으려면 콩벌레가 한 마리는 있어야 해요. 먼저 숲을 탐색해 보세요.', true);
      return;
    }
    changePhase('starting');
    const res = await callbacks.current.onStart(selected.speciesId);
    if (!res) {
      changePhase('idle');
      return;
    }
    const g = rt.current;
    g.game = newStackGame(res.seed, res.rarity);
    g.placed = [];
    g.delays = [];
    g.acc = 0;
    g.last = 0;
    g.running = true;
    g.paused = false;
    g.hudAt = 0;
    g.flash = null;
    spawn();
    setRunSpeciesId(res.speciesId);
    setPaused(false);
    setResult(null);
    setPending(null);
    setHud({ height: 0, streak: 0, speed: g.spec?.speed ?? 0 });
    changePhase('running');
  }, [changePhase, selected, spawn]);

  // 통나무를 떨어뜨린다(너무 일찍 누른 입력은 무시한다). 쌓이면 다음 통나무를 준비하고, 하나도 안 겹치면 끝낸다.
  const drop = useCallback(
    (forcedTick?: number) => {
      const g = rt.current;
      if (!g.running || g.paused || !g.game || !g.spec || g.settle > 0) return;
      const delay = forcedTick ?? g.tick;
      if (delay < STACK_MIN_DELAY) return;
      const r = dropStackBlock(g.game, delay);
      g.delays.push(delay);
      if (!r.placed) {
        g.placed.push({ x: r.x, w: g.spec.w, perfect: false });
        g.flash = { text: '💥 빗나갔어요!', until: performance.now() + 1500 };
        setHud({ height: g.game.height, streak: 0, speed: g.spec.speed });
        endRun();
        return;
      }
      g.placed.push({ x: g.game.prevX, w: g.game.prevW, perfect: r.perfect });
      g.flash = r.perfect ? { text: g.game.streak >= 3 ? `✨ 퍼펙트 x${g.game.streak}!` : '✨ 퍼펙트!', until: performance.now() + 900 } : null;
      setHud({ height: g.game.height, streak: g.game.streak, speed: stackBlockSpec(g.game).speed });
      if (g.game.over) {
        g.flash = { text: '🏆 끝까지 쌓았어요!', until: performance.now() + 2000 };
        endRun();
        return;
      }
      g.spec = null;
      g.settle = SETTLE_TICKS;
    },
    [endRun],
  );

  const press = useCallback(() => {
    const g = rt.current;
    if (phaseRef.current === 'running') {
      if (g.paused) {
        g.paused = false;
        g.last = 0;
        setPaused(false);
      } else {
        drop();
      }
      return;
    }
    void startRun();
  }, [drop, startRun]);

  const quit = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    endRun();
  }, [endRun]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  // 다른 탭으로 가거나 창을 벗어나면 자동으로 일시정지한다.
  useEffect(() => {
    const pause = () => {
      const g = rt.current;
      if (g.running && !g.paused) {
        g.paused = true;
        setPaused(true);
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', pause);
    };
  }, []);

  // 게임 루프: 고정 간격(60틱/초)으로 진행하고 매 프레임 그린다.
  useEffect(() => {
    let raf = 0;

    const advance = (ts: number) => {
      const g = rt.current;
      if (!g.running || g.paused || !g.game) {
        g.last = 0;
        return;
      }
      if (!g.last) g.last = ts;
      const dt = Math.min(100, ts - g.last);
      g.last = ts;
      g.acc += dt;
      while (g.acc >= STACK_TICK_MS && g.running) {
        g.acc -= STACK_TICK_MS;
        if (g.settle > 0) {
          g.settle -= 1;
          if (g.settle === 0 && g.game && !g.game.over) spawn();
          continue;
        }
        if (g.spec) {
          g.tick += 1;
          // 오래 안 누르면 그 자리에서 떨어진다
          if (g.tick >= STACK_MAX_DELAY) drop(STACK_MAX_DELAY);
        }
      }
      if (ts - g.hudAt > HUD_INTERVAL_MS) g.hudAt = ts;
    };

    const draw = (ts: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const cssW = canvas.clientWidth;
      if (!cssW) return;
      const dpr = window.devicePixelRatio || 1;
      const wantW = Math.round(cssW * dpr);
      if (canvas.width !== wantW) {
        canvas.width = wantW;
        canvas.height = Math.round((wantW * VIEW_H) / VIEW_W);
      }
      const k = canvas.width / VIEW_W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      const css = getComputedStyle(canvas);
      const line = css.getPropertyValue('--muted').trim() || '#888';
      const gold = css.getPropertyValue('--gold').trim() || '#e6b800';

      const g = rt.current;
      const count = g.placed.length;
      // 탑이 높아지면 화면을 위로 올려서 맨 위가 항상 보이게 한다
      const topY = GROUND_Y - (count + 1) * BLOCK_H;
      const scroll = Math.max(0, 90 - topY);
      ctx.save();
      ctx.translate(0, scroll);

      // 땅
      ctx.fillStyle = line;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
      // 바닥 통나무
      const baseX = Math.floor((STACK_RANGE - STACK_START_W) / 2);
      const drawLog = (x: number, w: number, level: number, tone: string, edge?: string) => {
        const px = x * SCALE;
        const pw = Math.max(2, w * SCALE);
        const py = GROUND_Y - (level + 1) * BLOCK_H;
        ctx.fillStyle = tone;
        ctx.fillRect(px, py, pw, BLOCK_H - 2);
        if (edge) {
          ctx.strokeStyle = edge;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, pw - 2, BLOCK_H - 4);
        }
      };
      drawLog(baseX, STACK_START_W, 0, '#8a5a2b');
      g.placed.forEach((b, i) => drawLog(b.x, b.w, i + 1, i % 2 ? '#a06a35' : '#94612f', b.perfect ? gold : undefined));

      // 움직이는 통나무(콩벌레가 위에 앉아 있다)
      if (g.running && g.spec) {
        const x = stackBlockX(g.spec, g.tick);
        const level = count + 1;
        drawLog(x, g.spec.w, level, '#b87a3d', '#ffffff');
        const sp = sprite.current;
        const bx = x * SCALE + (g.spec.w * SCALE) / 2;
        const by = GROUND_Y - (level + 1) * BLOCK_H;
        if (sp.ready && sp.img) {
          const h = 34;
          const w = (h * sp.img.naturalWidth) / sp.img.naturalHeight;
          try {
            if (sp.filter !== 'none' && 'filter' in ctx) ctx.filter = sp.filter;
          } catch {
            // 필터를 지원하지 않으면 원래 색으로 그린다.
          }
          ctx.drawImage(sp.img, bx - w / 2, by - h + 2, w, h);
          try {
            if ('filter' in ctx) ctx.filter = 'none';
          } catch {
            // 무시
          }
        } else {
          ctx.font = '26px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🪲', bx, by);
        }
        // 맞춰야 할 자리(맨 위 칸의 가장자리)를 점선으로 보여 준다
        if (g.game) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = gold;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(g.game.prevX * SCALE, GROUND_Y - (level + 1) * BLOCK_H - 40);
          ctx.lineTo(g.game.prevX * SCALE, GROUND_Y - level * BLOCK_H);
          ctx.moveTo((g.game.prevX + g.game.prevW) * SCALE, GROUND_Y - (level + 1) * BLOCK_H - 40);
          ctx.lineTo((g.game.prevX + g.game.prevW) * SCALE, GROUND_Y - level * BLOCK_H);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.restore();

      if (g.flash && ts < g.flash.until) {
        ctx.fillStyle = gold;
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(g.flash.text, VIEW_W / 2, 52);
      }
    };

    const frame = (ts: number) => {
      advance(ts);
      draw(ts);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [drop, spawn]);

  const running = phase === 'running';
  const resetsIn = info ? Math.max(0, info.resetsAt - now) : 0;
  const reachedMilestones = info?.milestoneReached ?? 0;
  const locked = running || phase === 'starting' || submitting;
  const selectedTolerance = tolerance?.[selected?.rarity ?? 0];

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BEAN STACK</p>
          <h1>
            콩 쌓기 <span>{info ? `오늘 순위 초기화까지 ${formatDuration(resetsIn)}` : ''}</span>
          </h1>
          <p className="subheading">좌우로 흔들리는 통나무를 알맞은 때에 떨어뜨려 탑을 쌓아요! 딱 맞추면 통나무가 넓게 유지돼요.</p>
        </div>
      </div>

      <div className="info-banner">
        ⌨️ <b>스페이스 · ↓ · S</b>, <b>화면 탭</b>, 또는 아래의 <b>⬇️ 내리기 버튼</b>을 누르면 통나무가 떨어져요. 아래 칸과 겹친 만큼만 남고 삐져나온 부분은 잘려요. 위치 차이가 허용치 이내면 <b>✨ 퍼펙트</b>(너비 유지, {info?.rules.growStreak ?? 3}번 연속이면 너비가 늘어나요). 하나도 안 겹치면 끝이에요. 점수는 서버가 떨어뜨린 타이밍 기록을 다시 돌려서 정해요.
      </div>

      <p className="nav-caption">쌓을 콩벌레 선택</p>
      {owned.length === 0 ? (
        <p className="empty">아직 가지고 있는 콩벌레가 없어요. 숲을 탐색해서 먼저 만나 보세요.</p>
      ) : (
        <div className="runner-picker">
          {owned.map((sp) => (
            <button key={sp.speciesId} className={`runner-pick${selected?.speciesId === sp.speciesId ? ' active' : ''}`} disabled={locked} onClick={() => pick(sp.speciesId)}>
              <SpeciesImage species={sp} style={{ filter: sp.filter }} />
              <strong>{sp.name}</strong>
              <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
                {RARITIES[sp.rarity].name}
              </span>
              <small>퍼펙트 허용 ±{tolerance?.[sp.rarity] ?? '-'}</small>
            </button>
          ))}
        </div>
      )}

      <section className="panel runner-panel">
        <div className="runner-hud">
          <span className="pill">🪵 {hud.height}칸</span>
          <span className="pill">✨ 연속 퍼펙트 {hud.streak}</span>
          {running && <span className="pill">속도 {hud.speed}</span>}
          {!running && selected && (
            <span className="pill">
              {selected.name} · 퍼펙트 허용 ±{selectedTolerance ?? '-'}
            </span>
          )}
          <span className="pill">오늘 최고 {info?.today ? `${info.today.bestHeight}칸` : '-'}</span>
          <span className="pill">내 최고 {info ? `${info.bestHeight}칸` : '-'}</span>
        </div>

        <div className="runner-stage">
          <canvas
            ref={canvasRef}
            className="runner-canvas stack-canvas"
            onPointerDown={(e) => {
              e.preventDefault();
              press();
            }}
            aria-label="콩 쌓기 화면. 스페이스나 화면 탭으로 통나무를 떨어뜨려요"
          />
          <div className="runner-overlay">
            {(phase === 'idle' || phase === 'starting') && (
              <button className="button primary runner-start" disabled={phase === 'starting' || !selected} onClick={() => void startRun()}>
                {phase === 'starting' ? '준비 중...' : result ? '🔁 다시 쌓기' : '▶ 쌓기 시작'}
              </button>
            )}
            {running && paused && <div className="runner-banner">⏸ 일시정지 — 탭하거나 스페이스를 눌러 계속해요</div>}
            {phase === 'over' && (
              <div className="runner-banner">{submitting ? `🪵 ${hud.height}칸! 기록을 확인하는 중...` : `🪵 ${hud.height}칸에서 끝났어요`}</div>
            )}
          </div>
        </div>

        <button
          className={`runner-jump${running && !paused ? ' live' : ''}`}
          disabled={phase === 'starting' || submitting || (!running && !selected)}
          onPointerDown={(e) => {
            e.preventDefault();
            press();
          }}
          onKeyDown={(e) => {
            if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
          }}
          aria-label="통나무 내리기"
        >
          {phase === 'starting' ? '준비 중...' : submitting ? '기록 확인 중...' : running ? (paused ? '▶ 계속하기' : '⬇️ 내리기!') : phase === 'over' ? '🔁 다시 쌓기' : '▶ 쌓기 시작'}
        </button>

        {running && (
          <div className="runner-actions">
            <button className="button secondary" onClick={quit} disabled={hud.height === 0}>
              🏁 여기서 그만하기 (지금까지 쌓은 기록으로 끝내요)
            </button>
          </div>
        )}

        {phase === 'over' && !submitting && pending && (
          <div className="runner-actions">
            <button className="button primary" onClick={() => void submit(pending)}>
              기록 다시 보내기
            </button>
          </div>
        )}

        {result && phase === 'over' && (
          <div className="puzzle-result" role="status">
            <h3>
              🪵 {result.height}칸 {result.completed ? '· 🏆 끝까지 완주!' : ''}
            </h3>
            <p>
              오늘 최고 <b>{result.bestToday}칸</b>
              {result.improved ? ' · 🆕 오늘 기록 갱신!' : ''} · <b>{result.rank}위</b> / {result.participants}명
              {result.newAllTimeBest ? ' · 🎉 내 최고 기록!' : ''}
            </p>
            <p>✨ 퍼펙트 {result.perfects}번</p>
            {rewardText(result.reward) ? <p>🎁 {rewardText(result.reward)}</p> : <p className="footnote">이번에는 새로 받은 보너스가 없어요.</p>}
            {result.milestones.map((m) => (
              <p key={m.height}>
                🎉 {m.height}칸 달성 보너스: {rewardText(m.reward)}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>콩벌레 능력</h3>
        <ul className="puzzle-rewards">
          {RARITIES.map((r, i) => (
            <li key={r.name}>
              <b style={{ color: r.color }}>{r.name}</b> — 퍼펙트 허용 ±{tolerance?.[i] ?? '-'} (위치 차이가 이 안이면 퍼펙트)
            </li>
          ))}
        </ul>
        <p className="footnote">통나무가 나오는 위치·속도(3칸마다 조금씩 빨라져요)는 어떤 콩벌레든 똑같아요. 희귀할수록 퍼펙트로 쳐 주는 범위만 넉넉해요.</p>
      </section>

      <section className="panel">
        <h3>오늘의 순위</h3>
        <p className="footnote">오늘 가장 높이 쌓은 순이에요. 기록을 세운 콩벌레도 함께 보여요. 같은 높이는 같은 순위이고 먼저 달성한 사람이 위에 보여요. 한국 시간 자정에 새로 시작해요.</p>
        <RankingLimitPicker value={rankingLimit} onChange={changeRankingLimit} />
        <RankingList result={ranking} loading={false} valueOf={(v) => `${v.toLocaleString('ko-KR')}칸`} onOpenProfile={onOpenProfile} />
      </section>

      <section className="panel">
        <h3>높이 보너스 (하루 한 번씩)</h3>
        <ul className="puzzle-rewards">
          {(info?.rules.milestones ?? []).map((m, i) => (
            <li key={m.height}>
              <b>{m.height}칸</b> — {rewardText(m.reward)}
              {reachedMilestones > i ? ' ✅' : ''}
            </li>
          ))}
        </ul>
        <p className="footnote">오늘 최고 기록이 해당 높이에 닿으면 받아요. {info?.rules.maxHeight ?? 150}칸까지 쌓으면 완주로 끝나요.</p>
      </section>
    </section>
  );
}
