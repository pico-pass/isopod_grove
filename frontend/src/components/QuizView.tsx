import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { LeaderboardResult, QuizAnswerResponse, QuizInfo, QuizQuestionView, QuizStartResponse } from '../api/types';
import { formatDuration } from '../utils/gameCalc';
import { loadRankingLimit, saveRankingLimit, type RankingLimit } from '../utils/rankingLimit';
import { RankingLimitPicker } from './RankingLimitPicker';
import { RankingList } from './RankingView';

const TICK_MS = 50;
const FALLBACK_IMAGE = '/assets/isopod.png';

const rewardText = (r: { explorationTickets: number; diamonds: number }) =>
  [r.explorationTickets ? `🎟️ 탐색권 ${r.explorationTickets}장` : '', r.diamonds ? `💎 ${r.diamonds}개` : ''].filter(Boolean).join(' · ');

// 문제 그림에 거는 CSS: 실루엣은 검게, 확대는 한 부분을 크게 보여 준다
function imageStyle(q: QuizQuestionView): React.CSSProperties {
  const zoomed = q.mode !== 'silhouette';
  const shadow = q.mode !== 'zoom';
  return {
    filter: shadow ? 'brightness(0)' : undefined,
    transform: zoomed ? `scale(${q.zoom.scale})` : undefined,
    transformOrigin: zoomed ? `${q.zoom.x}% ${q.zoom.y}%` : undefined,
  };
}

// 이 콩 누구?: 실루엣이나 확대한 그림만 보고 어느 콩벌레인지 맞혀요. 제한 시간은 처음 8초이고 맞힐 때마다 0.1초씩 줄어요.
// 정답은 서버만 알고, 서버가 채점해요.
export function QuizView({
  onStart,
  onAnswer,
  showToast,
  onOpenProfile,
}: {
  onStart: () => Promise<QuizStartResponse | null>;
  onAnswer: (speciesId: string) => Promise<QuizAnswerResponse | null>;
  showToast: (message: string, isError?: boolean) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const [info, setInfo] = useState<QuizInfo | null>(null);
  const [ranking, setRanking] = useState<LeaderboardResult | null>(null);
  const [rankingLimit, setRankingLimit] = useState<RankingLimit>(loadRankingLimit);
  const rankingLimitRef = useRef(rankingLimit);
  const [question, setQuestion] = useState<QuizQuestionView | null>(null);
  const [streak, setStreak] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; name: string; image?: string; filter: string; timedOut?: boolean } | null>(null);
  const [ended, setEnded] = useState<NonNullable<QuizAnswerResponse['ended']> | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const deadline = useRef(0);
  const answering = useRef(false);

  const loadInfo = useCallback(async (): Promise<QuizInfo | null> => {
    try {
      const data = await api.getQuiz();
      setInfo(data);
      return data;
    } catch (e) {
      showToast(e instanceof Error ? e.message : '퀴즈 정보를 불러오지 못했어요.', true);
      return null;
    }
  }, [showToast]);
  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api.getQuizLeaderboard(rankingLimitRef.current));
    } catch {
      // 순위를 못 불러와도 풀 수 있다.
    }
  }, []);

  const show = useCallback((q: QuizQuestionView | null, startedStreak: number, remainingMs?: number) => {
    setQuestion(q);
    setStreak(startedStreak);
    if (q) {
      const ms = remainingMs ?? q.limitMs;
      deadline.current = performance.now() + ms;
      setRemaining(ms);
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다. 이어서 하던 판이 있으면 그대로 이어 간다.
  useEffect(() => {
    Promise.resolve().then(async () => {
      const data = await loadInfo();
      if (data?.run?.question) show(data.run.question, data.run.streak, data.run.remainingMs);
      void loadRanking();
    });
  }, [loadInfo, loadRanking, show]);

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

  const submit = useCallback(
    async (speciesId: string) => {
      if (answering.current) return;
      answering.current = true;
      setBusy(true);
      const res = await onAnswer(speciesId);
      answering.current = false;
      setBusy(false);
      if (!res) {
        // 너무 빨리 눌렀다는 등의 이유로 거절되면 같은 문제로 계속한다(시간이 다 됐으면 서버가 끝낸 것이라 새로 시작하게 한다)
        if (speciesId === '') {
          setQuestion(null);
          void loadInfo();
        }
        return;
      }
      setFeedback({ correct: res.correct, name: res.answer.name, image: res.answer.image, filter: res.answer.filter, timedOut: res.timedOut });
      if (res.correct && res.next) {
        show(res.next, res.streak);
      } else {
        setQuestion(null);
        setStreak(res.streak);
        if (res.ended) setEnded(res.ended);
        void loadInfo();
        void loadRanking();
      }
    },
    [loadInfo, loadRanking, onAnswer, show],
  );

  // 맞혔다는 표시는 잠깐만 보여 준다
  useEffect(() => {
    if (!feedback?.correct) return;
    const t = setTimeout(() => setFeedback(null), 900);
    return () => clearTimeout(t);
  }, [feedback]);

  // 남은 시간을 줄이고, 0이 되면 시간 초과로 알린다
  useEffect(() => {
    if (!question) return;
    const id = setInterval(() => {
      const left = Math.max(0, deadline.current - performance.now());
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        void submit('');
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [question, submit]);

  // 키보드 1~6으로 보기를 고른다
  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= question.choices.length) {
        e.preventDefault();
        void submit(question.choices[n - 1].speciesId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, submit]);

  const start = async () => {
    if (busy || question) return;
    setBusy(true);
    const res = await onStart();
    setBusy(false);
    if (!res) return;
    setEnded(null);
    setFeedback(null);
    show(res.question, 0);
  };

  const resetsIn = info ? Math.max(0, info.resetsAt - now) : 0;
  const reached = info?.milestoneReached ?? 0;
  const ratio = question ? Math.max(0, Math.min(1, remaining / question.limitMs)) : 0;
  const urgent = !!question && remaining < 2000;

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WHO IS THIS?</p>
          <h1>
            이 콩 누구? <span>{info ? `오늘 순위 초기화까지 ${formatDuration(resetsIn)}` : ''}</span>
          </h1>
          <p className="subheading">실루엣이나 확대한 그림만 보고 어느 콩벌레인지 맞혀요! 맞힐 때마다 제한 시간이 0.1초씩 줄어요.</p>
        </div>
      </div>

      <div className="info-banner">
        처음 제한 시간은 <b>8초</b>예요. 맞힐 때마다 <b>0.1초씩</b> 줄어 최소 2초까지 빨라져요. 10개부터는 그림이 확대되고, 15개부터 보기가 늘고, 25개부터는 확대한 실루엣이 나와요.
        틀리거나 시간이 지나면 끝나요. 키보드 <b>1~6</b>으로도 고를 수 있어요. 정답과 채점은 서버가 해요.
      </div>

      <section className="panel quiz-panel">
        <div className="runner-hud">
          <span className="pill">🔥 {streak}연속</span>
          <span className="pill">오늘 최고 {info?.today ? `${info.today.bestStreak}연속` : '-'}</span>
          <span className="pill">내 최고 {info ? `${info.bestStreak}연속` : '-'}</span>
        </div>

        {question ? (
          <>
            <div className={`quiz-timer${urgent ? ' urgent' : ''}`} role="timer" aria-label="남은 시간">
              <i style={{ width: `${ratio * 100}%` }} />
              <span>{(remaining / 1000).toFixed(1)}초</span>
            </div>
            <div className="quiz-frame">
              <img
                key={question.imageUrl}
                src={question.imageUrl}
                alt="이 콩벌레는 누구일까요?"
                draggable={false}
                style={imageStyle(question)}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                }}
              />
              {feedback && (
                <div className={`quiz-feedback ${feedback.correct ? 'ok' : 'bad'}`} aria-live="polite">
                  {feedback.correct ? '⭕ 정답!' : '❌'} {feedback.name}
                </div>
              )}
            </div>
            <div className="quiz-choices">
              {question.choices.map((c, i) => (
                <button key={c.speciesId} className="quiz-choice" disabled={busy} onClick={() => void submit(c.speciesId)}>
                  <kbd>{i + 1}</kbd> {c.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="quiz-idle">
            {feedback && !feedback.correct && (
              <div className="quiz-reveal">
                <img src={feedback.image ?? FALLBACK_IMAGE} alt={feedback.name} style={{ filter: feedback.filter === 'none' ? undefined : feedback.filter }} />
                <p>
                  {feedback.timedOut ? '⏰ 시간 초과!' : '❌ 틀렸어요!'} 정답은 <b>{feedback.name}</b>
                </p>
              </div>
            )}
            {ended && (
              <div className="puzzle-result" role="status">
                <h3>🔥 {ended.streak}연속 정답</h3>
                <p>
                  {ended.rank ? (
                    <>
                      오늘 <b>{ended.rank}위</b> / {ended.participants}명{ended.improved ? ' · 🆕 오늘 기록 갱신!' : ''}
                    </>
                  ) : (
                    '기록이 남지 않았어요(한 문제도 못 맞혔어요).'
                  )}
                  {ended.newAllTimeBest && ended.streak > 0 ? ' · 🎉 내 최고 기록!' : ''}
                </p>
                {rewardText(ended.reward) ? <p>🎁 {rewardText(ended.reward)}</p> : <p className="footnote">이번에는 새로 받은 보너스가 없어요.</p>}
                {ended.milestones.map((m) => (
                  <p key={m.streak}>
                    🎉 {m.streak}연속 달성 보너스: {rewardText(m.reward)}
                  </p>
                ))}
              </div>
            )}
            <button className="button primary full" disabled={busy} onClick={() => void start()}>
              {busy ? '준비 중...' : ended ? '🔁 다시 도전' : '▶ 퀴즈 시작'}
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>오늘의 순위</h3>
        <p className="footnote">오늘 가장 길게 이어서 맞힌 순이에요. 같은 개수는 같은 순위이고 먼저 달성한 사람이 위에 보여요. 한국 시간 자정에 새로 시작해요.</p>
        <RankingLimitPicker value={rankingLimit} onChange={changeRankingLimit} />
        <RankingList result={ranking} loading={false} valueOf={(v) => `${v.toLocaleString('ko-KR')}연속`} onOpenProfile={onOpenProfile} />
      </section>

      <section className="panel">
        <h3>연속 정답 보너스 (평생 한 번씩)</h3>
        <ul className="puzzle-rewards">
          {(info?.rules.milestones ?? []).map((m, i) => (
            <li key={m.streak}>
              <b>{m.streak}연속</b> — {rewardText(m.reward)}
              {reached > i ? ' ✅' : ''}
            </li>
          ))}
        </ul>
        <p className="footnote">내 최고 기록이 해당 개수에 처음 닿을 때 받아요.</p>
      </section>
    </section>
  );
}
