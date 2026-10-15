import { useCallback, useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import { api } from '../api/client';
import type {
  LeaderboardResult,
  PuzzleCell,
  PuzzleClaimResponse,
  PuzzleInfo,
  PuzzleMove,
  PuzzleRewardInfo,
  PuzzleSubmitResponse,
} from '../api/types';
import { formatDuration } from '../utils/gameCalc';
import {
  PUZZLE_KEY_MOVES,
  PUZZLE_MOVE_ARROWS,
  formatPuzzleDay,
  sameCell,
  slidePuzzle,
} from '../utils/puzzle';
import { RankingList } from './RankingView';

const SWIPE_MIN_PX = 28;
const stars = (n: number) => '★'.repeat(n);

const rewardText = (r: PuzzleRewardInfo) =>
  [
    r.explorationTickets ? `🎟️ 탐색권 ${r.explorationTickets}장` : '',
    r.equipmentShards ? `🔩 장비 조각 ${r.equipmentShards}개` : '',
    r.diamonds ? `💎 ${r.diamonds}개` : '',
  ]
    .filter(Boolean)
    .join(' · ');

// 오늘의 퍼즐 "굴러라 콩벌레". 하루 10단계이고, 단계마다 새로운 판이 나오며 갈수록 어려워진다. 방향을 고르면 바위나 벽에 부딪힐
// 때까지 굴러가고, 🍃에 닿으면 도착이다. 판·검증·순위·보상은 모두 서버가 정한다. 여기서는 굴러가는 모습을 미리 보여 주다가,
// 도착하면 이동 기록을 서버에 보낸다.
export function PuzzleView({
  onSubmit,
  onClaimRank,
  showToast,
  onOpenProfile,
}: {
  onSubmit: (dayKey: string, stage: number, moves: string) => Promise<PuzzleSubmitResponse | null>;
  onClaimRank: () => Promise<PuzzleClaimResponse | null>;
  showToast: (message: string, isError?: boolean) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [info, setInfo] = useState<PuzzleInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moves, setMoves] = useState('');
  const [trail, setTrail] = useState<PuzzleCell[]>([]); // 매 이동 뒤 멈춘 칸(시작 칸은 뺀다)
  const [result, setResult] = useState<PuzzleSubmitResponse | null>(null);
  const [pending, setPending] = useState<string | null>(null); // 제출에 실패한 이동 기록(다시 보낼 수 있다)
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [ranking, setRanking] = useState<LeaderboardResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<string>(''); // 지금 화면에 올라온 판(날짜#단계). 바뀌면 이동 기록을 비운다.

  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api.getPuzzleLeaderboard());
    } catch {
      // 순위를 못 불러와도 퍼즐은 풀 수 있다.
    }
  }, []);

  // stage를 주면 그 단계의 판을, 안 주면 지금 도전할 단계의 판을 불러온다.
  const loadInfo = useCallback(
    async (stage?: number) => {
      try {
        const next = await api.getPuzzle(stage);
        setInfo(next);
        setLoadError(null);
        // 다른 판(새 날짜·다른 단계)이면 처음 상태로 돌린다. 같은 판의 새로고침은 풀던 걸 그대로 둔다.
        const key = `${next.puzzle.dayKey}#${next.puzzle.stage}`;
        if (boardRef.current !== key) {
          boardRef.current = key;
          setMoves('');
          setTrail([]);
          setResult(null);
          setPending(null);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : '퍼즐을 불러오지 못했어요.';
        setLoadError(message);
        showToast(message, true);
      }
    },
    [showToast],
  );

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

  // 자정이 지나 새 퍼즐이 나오면 알아서 새로 불러온다.
  const resetsAt = info?.resetsAt ?? 0;
  useEffect(() => {
    if (resetsAt && now >= resetsAt) {
      Promise.resolve().then(() => {
        void loadInfo();
        void loadRanking();
      });
    }
  }, [now, resetsAt, loadInfo, loadRanking]);

  const puzzle = info?.puzzle ?? null;
  const pos: PuzzleCell | null = puzzle ? (trail[trail.length - 1] ?? puzzle.start) : null;
  const locked = submitting || !!result || !!pending;

  const finish = useCallback(
    async (recorded: string) => {
      if (!puzzle) return;
      setSubmitting(true);
      const res = await onSubmit(puzzle.dayKey, puzzle.stage, recorded);
      setSubmitting(false);
      if (res) {
        setResult(res);
        setPending(null);
        void loadInfo(puzzle.stage); // 같은 단계를 유지한 채 기록·단계 목록만 새로 받는다
        void loadRanking();
      } else {
        setPending(recorded); // 날짜가 바뀌었거나 네트워크 오류. 토스트는 이미 떴다.
        void loadInfo(puzzle.stage);
      }
    },
    [puzzle, onSubmit, loadInfo, loadRanking],
  );

  const roll = useCallback(
    (dir: PuzzleMove) => {
      if (!info || !puzzle || !pos || locked) return;
      if (moves.length >= info.maxMoves) {
        showToast(`이동은 최대 ${info.maxMoves}번까지예요. 되돌리거나 처음부터 다시 해 보세요.`, true);
        return;
      }
      const to = slidePuzzle(puzzle, pos, dir);
      if (sameCell(to, pos)) return; // 제자리에서는 굴러가지 않는다(이동으로 세지 않는다)
      const nextMoves = moves + dir;
      setMoves(nextMoves);
      setTrail([...trail, to]);
      if (sameCell(to, puzzle.goal)) void finish(nextMoves);
    },
    [info, puzzle, pos, locked, moves, trail, showToast, finish],
  );

  // 키보드(화살표·WASD). 채팅창 같은 입력칸에 글을 쓰는 중에는 반응하지 않는다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const dir = PUZZLE_KEY_MOVES[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!dir) return;
      e.preventDefault();
      roll(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roll]);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    roll(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
  };

  const undo = () => {
    if (locked || moves.length === 0) return;
    setMoves(moves.slice(0, -1));
    setTrail(trail.slice(0, -1));
  };
  // 같은 판을 처음 위치부터 다시 푼다(새 판이 아니다. 다음 단계에서 새 판이 나온다).
  const restart = () => {
    if (submitting) return;
    setMoves('');
    setTrail([]);
    setResult(null);
    setPending(null);
  };
  const goStage = (stage: number) => {
    if (submitting) return;
    void loadInfo(stage);
  };

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);
    const res = await onClaimRank();
    setClaiming(false);
    if (res) void loadInfo(puzzle?.stage);
  };

  if (!info || !puzzle || !pos) {
    return (
      <section className="view active">
        <div className="page-heading">
          <div>
            <p className="eyebrow">DAILY PUZZLE</p>
            <h1>오늘의 퍼즐</h1>
          </div>
        </div>
        {loadError ? (
          <>
            <p className="empty">{loadError}</p>
            <button className="button secondary" onClick={() => void loadInfo()}>
              다시 불러오기
            </button>
          </>
        ) : (
          <p className="empty">오늘의 퍼즐을 불러오는 중이에요...</p>
        )}
      </section>
    );
  }

  const secondsLeft = Math.max(0, Math.floor((info.resetsAt - now) / 1000));
  const rocks = new Set(puzzle.rocks.map((r) => r.y * puzzle.width + r.x));
  const visited = new Set(trail.slice(0, -1).map((c) => c.y * puzzle.width + c.x));
  const cells: { key: number; className: string; mark: string }[] = [];
  for (let y = 0; y < puzzle.height; y++) {
    for (let x = 0; x < puzzle.width; x++) {
      const key = y * puzzle.width + x;
      const isRock = rocks.has(key);
      const isGoal = x === puzzle.goal.x && y === puzzle.goal.y;
      const isStart = x === puzzle.start.x && y === puzzle.start.y;
      cells.push({
        key,
        className: `puzzle-cell${isRock ? ' rock' : ''}${isGoal ? ' goal' : ''}${isStart ? ' start' : ''}${visited.has(key) ? ' visited' : ''}`,
        mark: isRock ? '🪨' : isGoal ? '🍃' : '',
      });
    }
  }
  const boardStyle = { '--puzzle-cols': puzzle.width } as CSSProperties;
  const bugStyle: CSSProperties = {
    left: `${(pos.x / puzzle.width) * 100}%`,
    top: `${(pos.y / puzzle.height) * 100}%`,
    width: `${100 / puzzle.width}%`,
    height: `${100 / puzzle.height}%`,
  };
  const margin = info.rules.star2Margin;
  const yesterday = info.yesterday;
  const current = info.stages[puzzle.stage - 1];
  const stageCount = info.rules.stageCount;
  const clearedCount = info.today?.cleared ?? 0;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY PUZZLE</p>
          <h1>
            오늘의 퍼즐 <span>{formatPuzzleDay(puzzle.dayKey)} · 다음 퍼즐까지 {formatDuration(secondsLeft)}</span>
          </h1>
          <p className="subheading">콩벌레를 굴려서 🍃에 도착해 보세요. 하루 {stageCount}단계, 단계마다 새로운 판이 나오고 갈수록 어려워져요.</p>
        </div>
      </div>

      <div className="info-banner">
        🪲 방향을 고르면 바위🪨나 벽에 부딪힐 때까지 쭉 굴러가요. 🍃에 닿으면 거기서 멈추고 도착이에요. 키보드 방향키·WASD, 화면 버튼,
        보드를 밀어서(스와이프) 조작할 수 있어요.
        <br />
        🎯 앞 단계를 깨야 다음 단계가 열려요. 순위는 <b>많이 깬 단계 순</b>, 같으면 깬 단계의 <b>최단 수 초과분이 적은 순</b>이에요.
        별은 ★★★ = 최단 · ★★ = 최단+1~{margin}수 · ★ = 그 밖에 클리어예요.
      </div>

      <div className="puzzle-stages" role="tablist" aria-label="단계 선택">
        {info.stages.map((s) => (
          <button
            key={s.stage}
            role="tab"
            aria-selected={s.stage === puzzle.stage}
            className={`puzzle-stage${s.stage === puzzle.stage ? ' active' : ''}${s.bestMoves ? ' cleared' : ''}`}
            disabled={!s.unlocked || submitting}
            onClick={() => goStage(s.stage)}
            title={s.unlocked ? `${s.stage}단계${s.bestMoves ? ` · 최고 ${s.bestMoves}수` : ''}` : '앞 단계를 먼저 깨야 열려요'}
          >
            <strong>{s.stage}</strong>
            <small>{s.bestMoves ? stars(s.stars) : s.unlocked ? '도전' : '🔒'}</small>
          </button>
        ))}
      </div>

      <section className="panel puzzle-panel">
        <div className="puzzle-status">
          <span className="pill">
            {puzzle.stage}단계 / {stageCount}
          </span>
          <span className="pill">이동 {moves.length}수</span>
          <span className="pill">최단 {puzzle.par}수</span>
          {current?.bestMoves ? (
            <span className="pill">
              이 단계 최고 {current.bestMoves}수 {stars(current.stars)}
            </span>
          ) : (
            <span className="pill">아직 이 단계를 못 깼어요</span>
          )}
        </div>

        <div
          className={`puzzle-board${locked ? ' locked' : ''}`}
          style={boardStyle}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="application"
          aria-label="콩벌레 퍼즐 판"
        >
          {cells.map((c) => (
            <div key={c.key} className={c.className}>
              {c.mark}
            </div>
          ))}
          <span className="puzzle-bug" style={bugStyle} aria-hidden="true">
            🪲
          </span>
        </div>

        <div className="puzzle-dpad" aria-label="방향 버튼">
          <button className="puzzle-key up" disabled={locked} onClick={() => roll('U')} aria-label="위로 굴리기">
            {PUZZLE_MOVE_ARROWS.U}
          </button>
          <button className="puzzle-key left" disabled={locked} onClick={() => roll('L')} aria-label="왼쪽으로 굴리기">
            {PUZZLE_MOVE_ARROWS.L}
          </button>
          <button className="puzzle-key down" disabled={locked} onClick={() => roll('D')} aria-label="아래로 굴리기">
            {PUZZLE_MOVE_ARROWS.D}
          </button>
          <button className="puzzle-key right" disabled={locked} onClick={() => roll('R')} aria-label="오른쪽으로 굴리기">
            {PUZZLE_MOVE_ARROWS.R}
          </button>
        </div>

        <div className="puzzle-actions">
          <button className="button secondary" disabled={locked || moves.length === 0} onClick={undo}>
            ↩️ 한 수 되돌리기
          </button>
          <button className="button secondary" disabled={submitting || (moves.length === 0 && !result)} onClick={restart}>
            🔄 이 판 처음부터
          </button>
        </div>
        {moves.length > 0 && <p className="footnote puzzle-moves">{moves.split('').map((m) => PUZZLE_MOVE_ARROWS[m as PuzzleMove]).join(' ')}</p>}

        {submitting && <p className="footnote">기록을 서버에서 확인하는 중이에요...</p>}
        {pending && !submitting && (
          <div className="puzzle-result">
            <p>도착했지만 기록을 저장하지 못했어요. 다시 시도해 볼까요?</p>
            <button className="button primary" onClick={() => void finish(pending)}>
              기록 다시 보내기
            </button>
          </div>
        )}
        {result && (
          <div className="puzzle-result" role="status">
            <h3>
              🎉 {result.stage}단계 {result.moves}수로 도착! {stars(result.stars)}
            </h3>
            <p>
              이 단계 최고 <b>{result.stageBest}수</b> {stars(result.bestStars)}
              {result.improved ? ' · 🆕 기록 갱신!' : ''} · 오늘 <b>{result.cleared}단계</b> 클리어 (초과 +{result.excess}수) ·{' '}
              <b>{result.rank}위</b> / {result.participants}명
            </p>
            <p>{rewardText(result.reward) ? `🎁 ${rewardText(result.reward)}` : '이번에는 새로 받은 보상이 없어요. (별을 올리면 차액을 받아요)'}</p>
            {result.milestones.map((m) => (
              <p key={m.stages}>
                🎉 {m.stages}단계 달성 보너스: {rewardText(m.reward)}
              </p>
            ))}
            <div className="puzzle-actions">
              {result.nextStage !== null && result.nextStage !== result.stage && (
                <button className="button primary" onClick={() => goStage(result.nextStage as number)}>
                  ▶ {result.nextStage}단계로 (새로운 판)
                </button>
              )}
              {result.allCleared && <p>🏆 오늘의 모든 단계를 깼어요! 최단 수에 도전해 순위를 올려 보세요.</p>}
              <button className="button secondary" onClick={restart}>
                {result.bestStars < 3 ? '🔁 더 적은 수로 다시 도전' : '🔁 다시 풀어 보기'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>오늘의 성적</h3>
        {info.today ? (
          <p>
            <b>{info.today.cleared}단계</b> 클리어 · 최단 수 초과 합계 +{info.today.excess}수 · <b>{info.today.rank}위</b> / {info.today.participants}명
          </p>
        ) : (
          <p className="footnote">아직 클리어한 단계가 없어요. 1단계부터 도전해 보세요!</p>
        )}
        {clearedCount >= stageCount && <p className="footnote">🏆 모든 단계를 깼어요. 초과 수를 줄일수록 순위가 올라가요.</p>}
      </section>

      {yesterday && (
        <section className="panel puzzle-yesterday">
          <h3>어제의 결과 ({formatPuzzleDay(yesterday.dayKey)})</h3>
          <p>
            {yesterday.cleared}단계 클리어 (초과 +{yesterday.excess}수) · <b>{yesterday.rank}위</b> / {yesterday.participants}명
          </p>
          {yesterday.diamonds > 0 ? (
            yesterday.claimed ? (
              <p className="footnote">✅ 순위 보상 💎 {yesterday.diamonds}개를 받았어요.</p>
            ) : (
              <button className="button primary" disabled={claiming} onClick={() => void claim()}>
                {claiming ? '받는 중...' : `🎁 순위 보상 받기 (💎 ${yesterday.diamonds}개)`}
              </button>
            )
          ) : (
            <p className="footnote">아쉽게도 순위 보상 대상(10위 이내)이 아니었어요.</p>
          )}
        </section>
      )}

      <section className="panel">
        <h3>오늘의 순위</h3>
        <p className="footnote">
          많이 깬 단계 순이고, 같으면 최단 수 초과분이 적은 순이에요. 성적이 같으면 같은 순위이고 먼저 달성한 사람이 위에 보여요.
        </p>
        <RankingList result={ranking} loading={false} valueOf={(v) => `${v}단계`} onOpenProfile={onOpenProfile} />
      </section>

      <section className="panel">
        <h3>보상</h3>
        <ul className="puzzle-rewards">
          <li>
            <b>단계 클리어</b> — 🔩 장비 조각 ★ {info.rules.stageShards[1]}개 · ★★ {info.rules.stageShards[2]}개 · ★★★ {info.rules.stageShards[3]}개 (단계마다, 별을 올리면 차액만)
          </li>
          {info.rules.milestones.map((m) => (
            <li key={m.stages}>
              <b>{m.stages}단계까지 클리어</b> — {rewardText(m.reward)}
              {info.milestoneReached >= m.stages ? ' ✅' : ''}
            </li>
          ))}
        </ul>
        <p className="footnote">
          순위 보상(다음 날 받기):{' '}
          {info.rules.rankRewards
            .map((r, i, all) => {
              const from = i === 0 ? 1 : all[i - 1].maxRank + 1;
              return `${from === r.maxRank ? `${r.maxRank}위` : `${from}~${r.maxRank}위`} 💎${r.diamonds}`;
            })
            .join(' · ')}
          . 퍼즐은 한국 시간 자정에 바뀌어요.
        </p>
      </section>
    </section>
  );
}
