import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import type {
  GameState,
  LeaderboardResult,
  RunnerAbilityInfo,
  RunnerFinishResponse,
  RunnerInfo,
  RunnerRewardInfo,
  RunnerStartResponse,
  Species,
} from '../api/types';
import { RARITIES, formatDuration, getTotalPopulationBySpecies } from '../utils/gameCalc';
import {
  RUNNER_AIR_TICKS,
  RUNNER_BEAN_W,
  RUNNER_BEAN_X,
  RUNNER_MAX_TICKS,
  RUNNER_TICK_MS,
  RUNNER_VIEW_W,
  createRunner,
  runnerLevelAt,
  runnerMeters,
  stepRunner,
  type RunnerState,
} from '../utils/runner';
import { RankingList } from './RankingView';
import { FALLBACK_IMAGE, SpeciesImage } from './SpeciesImage';

const VIEW_H = 300;
const GROUND_Y = 250; // 땅의 높이(위에서부터)
const BEAN_SIZE = 54; // 콩벌레 그림 높이
const JUMP_BUFFER_TICKS = 6; // 착지 직전에 누른 점프를 이만큼은 기억해 뒀다가 착지하면 바로 뛴다
const HUD_INTERVAL_MS = 100;
const PICK_STORAGE_KEY = 'isopod-runner-species';

type Phase = 'idle' | 'starting' | 'running' | 'over';

const rewardText = (r: RunnerRewardInfo) =>
  [
    r.explorationTickets ? `🎟️ 탐색권 ${r.explorationTickets}장` : '',
    r.equipmentShards ? `🔩 장비 조각 ${r.equipmentShards}개` : '',
    r.diamonds ? `💎 ${r.diamonds}개` : '',
  ]
    .filter(Boolean)
    .join(' · ');

// 희귀도 능력을 짧게 요약한다(없으면 "능력 없음").
const abilityText = (a: RunnerAbilityInfo | undefined) => {
  if (!a) return '능력 없음';
  const parts = [
    a.shields ? `🛡️ 껍질 ${a.shields}겹` : '',
    a.jumpBoostPercent ? `🦘 점프력 +${a.jumpBoostPercent}%` : '',
    a.airJumps ? `🌀 더블 점프` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '능력 없음';
};

interface GameRuntime {
  state: RunnerState | null;
  jumps: number[]; // 실제로 쓰인 점프의 틱 목록(서버로 보낸다)
  queuedAt: number; // 점프 입력이 들어온 틱(-1이면 없음)
  acc: number; // 아직 진행하지 못한 시간(ms)
  last: number; // 지난 프레임 시각
  airTicks: number; // 공중에 뜬 틱 수(굴러가는 모습용)
  running: boolean;
  paused: boolean;
  hudAt: number;
}

// 화면에 그릴 콩벌레 그림(선택한 종의 이미지). 불러오지 못하면 이모지로 대신한다.
interface BeanSprite {
  img: HTMLImageElement | null;
  ready: boolean;
  filter: string;
}

// 콩 달리기 "달려라 콩벌레". 가지고 있는 콩벌레 중 한 마리를 골라 달리고, 곰팡이🦠를 점프로 피한다. 희귀도마다 능력이 다르다.
// 화면은 여기서 그리지만 점수는 서버가 정한다: 시작할 때 서버가 시드와 희귀도를 정하고, 끝나면 점프한 틱 목록만 보내서 서버가
// 같은 시뮬레이션을 다시 돌려 거리를 계산한다.
export function RunnerView({
  gameState,
  species,
  onStart,
  onFinish,
  showToast,
  onOpenProfile,
}: {
  gameState: GameState;
  species: Species[];
  onStart: (speciesId: string) => Promise<RunnerStartResponse | null>;
  onFinish: (jumps: number[]) => Promise<RunnerFinishResponse | null>;
  showToast: (message: string, isError?: boolean) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [info, setInfo] = useState<RunnerInfo | null>(null);
  const [ranking, setRanking] = useState<LeaderboardResult | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ meters: 0, level: 0, shields: 0, airJumps: 0 });
  const [result, setResult] = useState<RunnerFinishResponse | null>(null);
  const [pending, setPending] = useState<number[] | null>(null); // 저장에 실패한 점프 기록(다시 보낼 수 있다)
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pickedId, setPickedId] = useState<string>(() => {
    try {
      return localStorage.getItem(PICK_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [runSpeciesId, setRunSpeciesId] = useState(''); // 이번 판에 내보낸 종
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<GameRuntime>({ state: null, jumps: [], queuedAt: -1, acc: 0, last: 0, airTicks: 0, running: false, paused: false, hudAt: 0 });
  const sprite = useRef<BeanSprite>({ img: null, ready: false, filter: 'none' });
  const phaseRef = useRef<Phase>('idle');
  const submittingRef = useRef(false);
  const callbacks = useRef({ onStart, onFinish, showToast });

  useEffect(() => {
    callbacks.current = { onStart, onFinish, showToast };
  });

  // 가지고 있는 종(희귀한 순). 달리는 데 내보낼 수 있는 콩벌레다.
  const owned = useMemo(() => {
    const totals = getTotalPopulationBySpecies(gameState);
    return species
      .filter((sp) => (totals[sp.speciesId] || 0) > 0)
      .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, 'ko'));
  }, [gameState, species]);
  const selected = owned.find((sp) => sp.speciesId === pickedId) ?? owned[0] ?? null;
  const shownSpecies = species.find((sp) => sp.speciesId === (runSpeciesId || selected?.speciesId)) ?? selected;
  const abilities = info?.rules.abilities;

  // 화면에 그릴 콩벌레 그림을 불러온다(고른 종이 바뀔 때마다).
  const shownId = shownSpecies?.speciesId;
  const shownImage = shownSpecies?.image;
  const shownFilter = shownSpecies?.filter;
  useEffect(() => {
    const entry: BeanSprite = { img: null, ready: false, filter: shownFilter && shownFilter !== 'none' ? shownFilter : 'none' };
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
      setInfo(await api.getRunner());
    } catch (e) {
      callbacks.current.showToast(e instanceof Error ? e.message : '달리기 정보를 불러오지 못했어요.', true);
    }
  }, []);
  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api.getRunnerLeaderboard());
    } catch {
      // 순위를 못 불러와도 달릴 수 있다.
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

  const pick = (speciesId: string) => {
    setPickedId(speciesId);
    try {
      localStorage.setItem(PICK_STORAGE_KEY, speciesId);
    } catch {
      // 저장하지 못해도 이번 접속에서는 고른 대로 달릴 수 있다.
    }
  };

  const submit = useCallback(
    async (jumps: number[]) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      const res = await callbacks.current.onFinish(jumps);
      submittingRef.current = false;
      setSubmitting(false);
      if (res) {
        setResult(res);
        setPending(null);
        void loadInfo();
        void loadRanking();
      } else {
        setPending(jumps);
      }
    },
    [loadInfo, loadRanking],
  );

  const startRun = useCallback(async () => {
    if (phaseRef.current === 'starting' || phaseRef.current === 'running' || submittingRef.current) return;
    if (!selected) {
      callbacks.current.showToast('달리려면 콩벌레가 한 마리는 있어야 해요. 먼저 숲을 탐색해 보세요.', true);
      return;
    }
    changePhase('starting');
    const res = await callbacks.current.onStart(selected.speciesId);
    if (!res) {
      changePhase('idle');
      return;
    }
    const g = game.current;
    const state = createRunner(res.seed, res.rarity);
    g.state = state;
    g.jumps = [];
    g.queuedAt = -1;
    g.acc = 0;
    g.last = 0;
    g.airTicks = 0;
    g.running = true;
    g.paused = false;
    g.hudAt = 0;
    setRunSpeciesId(res.speciesId);
    setPaused(false);
    setResult(null);
    setPending(null);
    setHud({ meters: 0, level: 0, shields: state.shields, airJumps: state.airJumpsLeft });
    changePhase('running');
  }, [changePhase, selected]);

  const pressJump = useCallback(() => {
    // 휴대폰에서는 살짝 진동으로 눌렸다는 걸 알려 준다(지원하지 않는 기기에서는 무시).
    try {
      navigator.vibrate?.(8);
    } catch {
      // 진동을 쓸 수 없어도 게임에는 영향이 없다.
    }
    const g = game.current;
    if (phaseRef.current === 'running') {
      if (g.paused) {
        g.paused = false;
        g.last = 0;
        setPaused(false);
      } else if (g.state) {
        g.queuedAt = g.state.tick;
      }
      return;
    }
    void startRun();
  }, [startRun]);

  // 키보드(스페이스·↑·W). 채팅창 같은 입력칸에 글을 쓰는 중에는 반응하지 않는다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        pressJump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pressJump]);

  // 다른 탭으로 가거나 창을 벗어나면 자동으로 일시정지한다(돌아왔을 때 갑자기 쓰러지지 않게).
  useEffect(() => {
    const pause = () => {
      const g = game.current;
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

  // 게임 루프: 고정 간격(60틱/초)으로 시뮬레이션을 진행하고, 매 프레임 그린다.
  useEffect(() => {
    let raf = 0;
    let colors = { line: '#888', cloud: '#999' };
    let colorsAt = 0;

    const hudOf = (s: RunnerState) => ({ meters: runnerMeters(s.dist), level: runnerLevelAt(s.tick), shields: s.shields, airJumps: s.airJumpsLeft });

    const endRun = () => {
      const g = game.current;
      g.running = false;
      changePhase('over');
      void submit(g.jumps.slice());
    };

    const advance = (ts: number) => {
      const g = game.current;
      const s = g.state;
      if (!s) return;
      if (!g.last) g.last = ts;
      const dt = Math.min(100, ts - g.last); // 오래 멈췄다 돌아와도 한꺼번에 몰아서 진행하지 않는다
      g.last = ts;
      g.acc += dt;
      while (g.acc >= RUNNER_TICK_MS && !s.dead && s.tick < RUNNER_MAX_TICKS) {
        const tick = s.tick;
        // 입력이 있으면 이번 틱에 시도하고, 점프가 실제로 쓰였을 때만(땅이거나 남은 공중 점프가 있을 때) 그 틱을 기록한다.
        const wantsJump = g.queuedAt >= 0;
        const jumped = stepRunner(s, wantsJump);
        if (jumped) {
          g.jumps.push(tick);
          g.queuedAt = -1;
        } else if (wantsJump && tick - g.queuedAt > JUMP_BUFFER_TICKS) {
          g.queuedAt = -1; // 착지를 기다리다 너무 오래돼서 버린다
        }
        g.airTicks = s.y > 0 ? g.airTicks + 1 : 0;
        g.acc -= RUNNER_TICK_MS;
      }
      if (ts - g.hudAt > HUD_INTERVAL_MS) {
        g.hudAt = ts;
        setHud(hudOf(s));
      }
      if (s.dead || s.tick >= RUNNER_MAX_TICKS) {
        setHud(hudOf(s));
        endRun();
      }
    };

    const emoji = (ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, angle = 0) => {
      ctx.save();
      ctx.translate(cx, cy);
      if (angle) ctx.rotate(angle);
      ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    // 콩벌레 그리기: 종의 이미지(없으면 이모지). 공중에서는 몸을 말고 굴러간다.
    const drawBean = (ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, dead: boolean) => {
      const sp = sprite.current;
      if (dead) {
        emoji(ctx, '💥', cx, cy, 50);
        return;
      }
      if (sp.ready && sp.img) {
        const w = (BEAN_SIZE * sp.img.naturalWidth) / sp.img.naturalHeight;
        ctx.save();
        ctx.translate(cx, cy);
        if (angle) ctx.rotate(angle);
        try {
          if (sp.filter !== 'none' && 'filter' in ctx) ctx.filter = sp.filter;
        } catch {
          // 이 브라우저가 필터를 지원하지 않으면 원래 색으로 그린다.
        }
        ctx.drawImage(sp.img, -w / 2, -BEAN_SIZE / 2, w, BEAN_SIZE);
        ctx.restore();
      } else {
        emoji(ctx, '🪲', cx, cy, 46, angle);
      }
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
        canvas.height = Math.round((wantW * VIEW_H) / RUNNER_VIEW_W);
      }
      if (ts - colorsAt > 1000) {
        colorsAt = ts;
        const css = getComputedStyle(canvas);
        colors = { line: css.getPropertyValue('--muted').trim() || '#888', cloud: css.color || '#999' };
      }
      const k = canvas.width / RUNNER_VIEW_W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, RUNNER_VIEW_W, VIEW_H);

      const g = game.current;
      const s = g.state;
      const dist = s ? s.dist : 0;

      // 멀리 떠 있는 구름(느리게 지나간다)
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = colors.cloud;
      for (let i = 0; i < 5; i++) {
        const span = RUNNER_VIEW_W + 240;
        const x = ((((i * 270 - dist * 0.2) % span) + span) % span) - 120;
        emoji(ctx, '☁️', x, 40 + ((i * 37) % 70), 34);
      }
      ctx.globalAlpha = 1;

      // 땅과 달리는 느낌을 주는 땅 무늬
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 1);
      ctx.lineTo(RUNNER_VIEW_W, GROUND_Y + 1);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 24; i++) {
        const x = ((((i * 47 - dist) % (RUNNER_VIEW_W + 60)) + RUNNER_VIEW_W + 60) % (RUNNER_VIEW_W + 60)) - 30;
        ctx.fillRect(x, GROUND_Y + 10 + ((i * 13) % 28), 8 + ((i * 7) % 12), 2);
      }
      ctx.globalAlpha = 1;

      // 곰팡이
      if (s) {
        const list = s.track.list;
        for (let i = s.first; i < list.length; i++) {
          const o = list[i];
          const sx = o.x - s.dist;
          if (sx > RUNNER_VIEW_W + 40) break;
          if (sx + o.w < -40) continue;
          const size = o.h + 8;
          const count = Math.max(1, Math.round(o.w / (size * 0.75)));
          const step = o.w / count;
          for (let n = 0; n < count; n++) emoji(ctx, '🦠', sx + step * (n + 0.5), GROUND_Y - size / 2 + 2, size);
        }
      }

      // 콩벌레: 땅에서는 통통 뛰고, 껍질이 깨진 직후에는 깜빡인다
      const height = s ? s.y / 1000 : 0;
      const cx = RUNNER_BEAN_X + RUNNER_BEAN_W / 2;
      const bob = s && s.y === 0 && g.running && !g.paused ? (Math.floor(s.tick / 5) % 2) * 2 : 0;
      const angle = s && s.y > 0 ? (g.airTicks / RUNNER_AIR_TICKS) * Math.PI * 2 : 0;
      const cy = GROUND_Y - height - BEAN_SIZE / 2 + 2 - bob;
      const blink = s && s.invuln > 0 && Math.floor(s.tick / 4) % 2 === 0;
      if (blink) ctx.globalAlpha = 0.35;
      drawBean(ctx, cx, cy, angle, !!s && s.dead);
      ctx.globalAlpha = 1;

      // 남은 껍질: 몸을 감싼 고리(겹마다 하나씩)
      if (s && !s.dead && s.shields > 0) {
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.85)';
        ctx.lineWidth = 3;
        for (let n = 0; n < s.shields; n++) {
          ctx.beginPath();
          ctx.arc(cx, cy, BEAN_SIZE / 2 + 6 + n * 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    const frame = (ts: number) => {
      const g = game.current;
      if (g.state && g.running && !g.paused) advance(ts);
      else g.last = 0;
      draw(ts);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [changePhase, submit]);

  const resetsIn = info ? Math.max(0, Math.floor((info.resetsAt - now) / 1000)) : 0;
  const reachedMilestones = info?.milestoneReached ?? 0;
  const running = phase === 'running';
  const locked = running || phase === 'starting' || submitting;
  const selectedAbility = selected && abilities ? abilities[selected.rarity] : undefined;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BEAN RUN</p>
          <h1>
            콩 달리기 <span>{info ? `오늘 순위 초기화까지 ${formatDuration(resetsIn)}` : ''}</span>
          </h1>
          <p className="subheading">가지고 있는 콩벌레를 골라 달려요! 곰팡이🦠를 점프로 피하세요. 희귀할수록 능력이 많아요.</p>
        </div>
      </div>

      <div className="info-banner">
        ⌨️ <b>스페이스 · ↑ · W</b>, <b>화면 탭</b>, 또는 아래의 <b>🦘 점프 버튼</b>을 누르면 점프해요. 곰팡이에 닿으면 끝이에요. 곰팡이 배치는 달릴 때마다 달라지고, 멀리
        달릴수록 곰팡이가 넓고 촘촘해져요. 점수는 서버가 점프 기록을 다시 돌려서 정해요.
      </div>

      <p className="nav-caption">달릴 콩벌레 선택</p>
      {owned.length === 0 ? (
        <p className="empty">아직 가지고 있는 콩벌레가 없어요. 숲을 탐색해서 먼저 만나 보세요.</p>
      ) : (
        <div className="runner-picker">
          {owned.map((sp) => (
            <button
              key={sp.speciesId}
              className={`runner-pick${selected?.speciesId === sp.speciesId ? ' active' : ''}`}
              disabled={locked}
              onClick={() => pick(sp.speciesId)}
            >
              <SpeciesImage species={sp} style={{ filter: sp.filter }} />
              <strong>{sp.name}</strong>
              <span className="pill" style={{ color: RARITIES[sp.rarity].color }}>
                {RARITIES[sp.rarity].name}
              </span>
              <small>{abilityText(abilities?.[sp.rarity])}</small>
            </button>
          ))}
        </div>
      )}

      <section className="panel runner-panel">
        <div className="runner-hud">
          <span className="pill">🏃 {hud.meters.toLocaleString('ko-KR')} m</span>
          <span className="pill">속도 Lv.{hud.level + 1}</span>
          {running || phase === 'over' ? (
            <>
              {(abilities?.[shownSpecies?.rarity ?? 0]?.shields ?? 0) > 0 && <span className="pill">🛡️ 껍질 {hud.shields}</span>}
              {(abilities?.[shownSpecies?.rarity ?? 0]?.airJumps ?? 0) > 0 && <span className="pill">🌀 더블 점프 {hud.airJumps ? '준비됨' : '사용함'}</span>}
            </>
          ) : (
            selected && <span className="pill">{selected.name} · {abilityText(selectedAbility)}</span>
          )}
          <span className="pill">오늘 최고 {info?.today ? `${info.today.bestMeters.toLocaleString('ko-KR')} m` : '-'}</span>
          <span className="pill">내 최고 {info ? `${info.bestMeters.toLocaleString('ko-KR')} m` : '-'}</span>
        </div>

        <div className="runner-stage">
          <canvas
            ref={canvasRef}
            className="runner-canvas"
            onPointerDown={(e) => {
              e.preventDefault();
              pressJump();
            }}
            aria-label="콩 달리기 화면. 스페이스나 화면 탭으로 점프"
          />
          <div className="runner-overlay">
            {(phase === 'idle' || phase === 'starting') && (
              <button className="button primary runner-start" disabled={phase === 'starting' || !selected} onClick={() => void startRun()}>
                {phase === 'starting' ? '준비 중...' : result ? '🔁 다시 달리기' : '▶ 달리기 시작'}
              </button>
            )}
            {running && paused && <div className="runner-banner">⏸ 일시정지 — 탭하거나 스페이스를 눌러 계속해요</div>}
            {phase === 'over' && (
              <div className="runner-banner">
                {submitting ? '💥 쓰러졌어요! 기록을 확인하는 중...' : `💥 ${hud.meters.toLocaleString('ko-KR')} m에서 쓰러졌어요`}
              </div>
            )}
          </div>
        </div>

        {/* 점프 버튼: 휴대폰에서 엄지로 누르기 쉽게 크게 만들고, 손가락이 닿는 순간(pointerdown) 바로 반응한다. 멈춰 있을 때는 시작/다시 달리기 버튼이 된다. */}
        <button
          className={`runner-jump${running && !paused ? ' live' : ''}`}
          disabled={phase === 'starting' || submitting || (!running && !selected)}
          onPointerDown={(e) => {
            e.preventDefault();
            pressJump();
          }}
          onKeyDown={(e) => {
            // 키보드로 이 버튼을 눌러도 위의 전역 단축키(스페이스)와 겹쳐 두 번 처리되지 않게 한다.
            if (e.code === 'Space' || e.code === 'Enter') e.preventDefault();
          }}
          aria-label="점프"
        >
          {phase === 'starting'
            ? '준비 중...'
            : submitting
              ? '기록 확인 중...'
              : running
                ? paused
                  ? '▶ 계속하기'
                  : '🦘 점프!'
                : phase === 'over'
                  ? '🔁 다시 달리기'
                  : '▶ 달리기 시작'}
        </button>

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
              🏃 {result.meters.toLocaleString('ko-KR')} m {result.completed ? '· 🏆 끝까지 완주!' : ''}
            </h3>
            <p>
              오늘 최고 <b>{result.bestToday.toLocaleString('ko-KR')} m</b>
              {result.improved ? ' · 🆕 오늘 기록 갱신!' : ''} · <b>{result.rank}위</b> / {result.participants}명
              {result.newAllTimeBest ? ' · 🎉 내 최고 기록!' : ''}
            </p>
            {result.shieldsUsed > 0 && <p>🛡️ 껍질이 곰팡이를 {result.shieldsUsed}번 막아 줬어요.</p>}
            {rewardText(result.reward) ? (
              <p>🎁 {rewardText(result.reward)}</p>
            ) : (
              <p className="footnote">이번에는 새로 받은 보너스가 없어요.</p>
            )}
            {result.milestones.map((m) => (
              <p key={m.meters}>
                🎉 {m.meters.toLocaleString('ko-KR')} m 달성 보너스: {rewardText(m.reward)}
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
              <b style={{ color: r.color }}>{r.name}</b> — {abilityText(abilities?.[i])}
            </li>
          ))}
        </ul>
        <p className="footnote">
          🛡️ 껍질: 곰팡이에 부딪혀도 한 겹이 깨지고 버텨요(깨진 뒤 {info ? (info.rules.invulnTicks / 60).toFixed(1) : '1.5'}초는 무적). 🦘 점프력: 더 높이·오래 떠요.
          🌀 더블 점프: 공중에서 한 번 더 뛸 수 있고 착지하면 다시 쓸 수 있어요. 곰팡이 배치는 어떤 콩벌레든 똑같아요.
        </p>
      </section>

      <section className="panel">
        <h3>오늘의 순위</h3>
        <p className="footnote">오늘 가장 멀리 달린 순이에요. 기록을 세운 콩벌레도 함께 보여요. 같은 거리는 같은 순위이고 먼저 달성한 사람이 위에 보여요. 한국 시간 자정에 새로 시작해요.</p>
        <RankingList result={ranking} loading={false} valueOf={(v) => `${v.toLocaleString('ko-KR')}m`} onOpenProfile={onOpenProfile} />
      </section>

      <section className="panel">
        <h3>거리 보너스 (하루 한 번씩)</h3>
        <ul className="puzzle-rewards">
          {(info?.rules.milestones ?? []).map((m, i) => (
            <li key={m.meters}>
              <b>{m.meters.toLocaleString('ko-KR')} m</b> — {rewardText(m.reward)}
              {reachedMilestones > i ? ' ✅' : ''}
            </li>
          ))}
        </ul>
        <p className="footnote">오늘 최고 기록이 해당 거리에 닿으면 받아요. 쓰러지지 않고 {RUNNER_MAX_TICKS / 3600}분을 버티면 완주로 끝나요.</p>
      </section>
    </section>
  );
}
