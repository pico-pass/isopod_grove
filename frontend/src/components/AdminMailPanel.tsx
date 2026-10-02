import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AdminMailHistoryItem, AdminUserSearchResult } from '../api/types';
import { formatNumber } from '../utils/gameCalc';
import { MailRewardChips } from './MailView';

// 백엔드(admin-send-mail.dto.ts)와 같은 한도. 서버에서도 검사하지만 먼저 알려주려고 화면에서도 막는다.
const MAX_COINS = 1_000_000_000;
const MAX_DIAMONDS = 100_000;
const MAX_TICKETS = 1_000;
const MAX_USERS = 200;
const TITLE_MAX = 40;
const BODY_MAX = 500;
const DEFAULT_EXPIRE_DAYS = 30;

// 자주 보내는 우편의 초안. 누르면 입력칸만 채워지고 발송은 따로 눌러야 한다(수량은 보내기 전에 마음대로 고칠 수 있다).
const PRESETS = [
  {
    label: '🌙 불금 저녁 보상',
    title: '불금 저녁 보상',
    body: '한 주 고생 많으셨어요! 불금 저녁 보상을 보내드려요. 주말도 즐거운 숲 생활 되세요 🌿',
    coins: 20000,
    diamonds: 50,
    tickets: 2,
  },
  {
    label: '🔥 주말 핫타임 보상',
    title: '주말 핫타임 보상',
    body: '주말 핫타임 이벤트 보상이에요! 함께해 주셔서 고마워요 🍃',
    coins: 10000,
    diamonds: 50,
    tickets: 1,
  },
  {
    label: '🛠️ 점검 보상',
    title: '서버 점검 보상',
    body: '점검 동안 기다려 주셔서 감사해요. 작은 선물을 보내드려요.',
    coins: 10000,
    diamonds: 50,
    tickets: 1,
  },
] as const;

type Status = { kind: 'ok' | 'error'; text: string } | null;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// 빈 칸은 0, 그 밖에는 0 이상의 정수만 받는다. 아니면 null.
function parseAmount(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return 0;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

export function AdminMailPanel() {
  const [target, setTarget] = useState<'all' | 'users'>('all');
  const [selected, setSelected] = useState<AdminUserSearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coins, setCoins] = useState('');
  const [diamonds, setDiamonds] = useState('');
  const [tickets, setTickets] = useState('');
  const [expireDays, setExpireDays] = useState(String(DEFAULT_EXPIRE_DAYS));
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [history, setHistory] = useState<AdminMailHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await api.getAdminMailHistory());
    } catch {
      // 내역을 못 불러와도 발송에는 영향이 없다.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadHistory());
  }, [loadHistory]);

  const search = async () => {
    setSearching(true);
    try {
      setResults(await api.searchAdminUsers(query));
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : '유저를 찾지 못했어요.' });
    } finally {
      setSearching(false);
    }
  };

  const addUser = (u: AdminUserSearchResult) => {
    if (selected.some((s) => s.userId === u.userId)) return;
    if (selected.length >= MAX_USERS) {
      setStatus({ kind: 'error', text: `한 번에 최대 ${MAX_USERS}명까지 고를 수 있어요. 더 많으면 "전체 유저"로 보내 주세요.` });
      return;
    }
    setSelected((list) => [...list, u]);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setTitle(p.title);
    setBody(p.body);
    setCoins(String(p.coins));
    setDiamonds(String(p.diamonds));
    setTickets(String(p.tickets));
    setStatus(null);
  };

  const send = async () => {
    if (sending) return;
    const c = parseAmount(coins);
    const d = parseAmount(diamonds);
    const t = parseAmount(tickets);
    const days = parseAmount(expireDays);
    const fail = (text: string) => setStatus({ kind: 'error', text });
    if (!title.trim()) return fail('제목을 입력해 주세요.');
    if (c === null || d === null || t === null) return fail('자원 수량은 0 이상의 정수로 입력해 주세요.');
    if (c > MAX_COINS || d > MAX_DIAMONDS || t > MAX_TICKETS) {
      return fail(
        `한 번에 보낼 수 있는 최대치는 골드 ${formatNumber(MAX_COINS)}, 다이아 ${formatNumber(MAX_DIAMONDS)}, 탐색권 ${formatNumber(MAX_TICKETS)}장이에요.`,
      );
    }
    if (days === null || days < 1 || days > 90) return fail('보관 기간은 1~90일로 입력해 주세요.');
    if (!body.trim() && c + d + t === 0) return fail('내용이나 보낼 자원 중 하나는 있어야 해요.');
    if (target === 'users' && selected.length === 0) return fail('받을 유저를 한 명 이상 골라 주세요.');

    const who = target === 'all' ? '가입한 모든 유저' : `선택한 ${selected.length}명`;
    const what =
      [c ? `골드 ${formatNumber(c)}` : '', d ? `다이아 ${formatNumber(d)}` : '', t ? `탐색권 ${formatNumber(t)}장` : '']
        .filter(Boolean)
        .join(' · ') || '자원 없음(메시지만)';
    if (!window.confirm(`${who}에게 우편을 보낼까요?\n\n제목: ${title.trim()}\n자원: ${what}\n보관: ${days}일\n\n보낸 우편은 되돌릴 수 없어요.`)) {
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      const r = await api.sendAdminMail({
        target,
        userIds: target === 'users' ? selected.map((s) => s.userId) : undefined,
        title: title.trim(),
        body: body.trim() || undefined,
        coins: c,
        diamonds: d,
        explorationTickets: t,
        expireDays: days,
      });
      setStatus({ kind: 'ok', text: `✅ ${r.message}` });
      setTitle('');
      setBody('');
      setCoins('');
      setDiamonds('');
      setTickets('');
      await loadHistory();
    } catch (e) {
      fail(e instanceof Error ? e.message : '우편을 보내지 못했어요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="panel admin-mail">
        <div className="panel-heading">
          <h2>📮 우편 발송</h2>
          <span>유저의 우편함으로 메시지와 자원을 보내요</span>
        </div>

        <div className="admin-mail-presets">
          {PRESETS.map((p) => (
            <button key={p.label} className="filter" onClick={() => applyPreset(p)} disabled={sending}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="admin-field">
          <span className="admin-label">받는 사람</span>
          <div className="filter-row">
            <button className={`filter${target === 'all' ? ' active' : ''}`} onClick={() => setTarget('all')}>
              전체 유저
            </button>
            <button className={`filter${target === 'users' ? ' active' : ''}`} onClick={() => setTarget('users')}>
              선택한 유저
            </button>
          </div>
        </div>

        {target === 'users' && (
          <div className="admin-field">
            <div className="admin-search-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void search()}
                placeholder="닉네임·이름·이메일로 검색 (비우면 최근 가입자)"
              />
              <button className="button secondary" onClick={() => void search()} disabled={searching}>
                {searching ? '찾는 중...' : '🔍 검색'}
              </button>
            </div>
            {results.length > 0 && (
              <div className="admin-user-results">
                {results.map((u) => (
                  <button
                    key={u.userId}
                    className="admin-user-result"
                    onClick={() => addUser(u)}
                    disabled={selected.some((s) => s.userId === u.userId)}
                  >
                    <strong>{u.displayName}</strong>
                    <small>{u.email}</small>
                    <span>{selected.some((s) => s.userId === u.userId) ? '추가됨' : '＋ 추가'}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="admin-chips">
              {selected.length === 0 ? (
                <small className="admin-hint">아직 고른 유저가 없어요.</small>
              ) : (
                selected.map((u) => (
                  <span key={u.userId} className="admin-chip">
                    {u.displayName}
                    <button aria-label={`${u.displayName} 빼기`} onClick={() => setSelected((l) => l.filter((x) => x.userId !== u.userId))}>
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        <div className="admin-field">
          <label className="admin-label" htmlFor="mail-title">
            제목 <small>({title.length}/{TITLE_MAX})</small>
          </label>
          <input id="mail-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="예: 불금 저녁 보상" />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="mail-body">
            내용 <small>({body.length}/{BODY_MAX})</small>
          </label>
          <textarea id="mail-body" value={body} maxLength={BODY_MAX} rows={4} onChange={(e) => setBody(e.target.value)} placeholder="유저에게 보여줄 메시지" />
        </div>

        <div className="admin-amounts">
          <label className="admin-field">
            <span className="admin-label">🪙 골드 <small>(최대 {formatNumber(MAX_COINS)})</small></span>
            <input inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)} placeholder="0" />
          </label>
          <label className="admin-field">
            <span className="admin-label">💎 다이아 <small>(최대 {formatNumber(MAX_DIAMONDS)})</small></span>
            <input inputMode="numeric" value={diamonds} onChange={(e) => setDiamonds(e.target.value)} placeholder="0" />
          </label>
          <label className="admin-field">
            <span className="admin-label">🎟️ 탐색권 <small>(최대 {formatNumber(MAX_TICKETS)})</small></span>
            <input inputMode="numeric" value={tickets} onChange={(e) => setTickets(e.target.value)} placeholder="0" />
          </label>
          <label className="admin-field">
            <span className="admin-label">⏳ 보관 기간(일) <small>(1~90)</small></span>
            <input inputMode="numeric" value={expireDays} onChange={(e) => setExpireDays(e.target.value)} />
          </label>
        </div>
        <p className="admin-hint">보관 기간이 지나면 받지 않은 자원도 함께 사라져요. 발송 전에 한 번 더 확인 창이 떠요.</p>

        {status && <p className={`admin-status ${status.kind}`}>{status.text}</p>}
        <button className="button primary full" onClick={() => void send()} disabled={sending}>
          {sending ? '보내는 중...' : target === 'all' ? '📮 전체 유저에게 보내기' : `📮 선택한 ${selected.length}명에게 보내기`}
        </button>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>🗂️ 최근 발송 내역</h2>
          <button className="button secondary" onClick={() => void loadHistory()} disabled={historyLoading}>
            🔄
          </button>
        </div>
        {history.length === 0 ? (
          <p className="empty">{historyLoading ? '불러오는 중이에요...' : '아직 보낸 우편이 없어요.'}</p>
        ) : (
          <div className="admin-history">
            {history.map((h) => (
              <div key={h.batchId} className="admin-history-row">
                <div>
                  <strong>{h.title}</strong>
                  <small>{formatDate(h.createdAt)} 발송 · {formatDate(h.expiresAt)}까지</small>
                </div>
                <MailRewardChips rewards={h.rewards} />
                <small>
                  받는 사람 {formatNumber(h.recipients)}명 · 읽음 {formatNumber(h.read)}
                  {h.rewards.coins + h.rewards.diamonds + h.rewards.explorationTickets > 0 &&
                    ` · 수령 ${formatNumber(h.claimed)}`}
                </small>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
