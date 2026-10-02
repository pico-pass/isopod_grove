import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { MailClaimResult, MailItem, MailRewards } from '../api/types';
import { formatNumber } from '../utils/gameCalc';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export function MailRewardChips({ rewards }: { rewards: MailRewards }) {
  return (
    <span className="mail-rewards">
      {rewards.coins > 0 && <span className="mail-chip">🪙 {formatNumber(rewards.coins)} G</span>}
      {rewards.diamonds > 0 && <span className="mail-chip">💎 {formatNumber(rewards.diamonds)}</span>}
      {rewards.explorationTickets > 0 && (
        <span className="mail-chip">🎟️ 탐색권 {formatNumber(rewards.explorationTickets)}장</span>
      )}
    </span>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function expiryLabel(expiresAt: string, now: number): { text: string; urgent: boolean } {
  const left = Date.parse(expiresAt) - now;
  if (left <= 0) return { text: '곧 사라져요', urgent: true };
  if (left < DAY_MS) return { text: `${Math.ceil(left / HOUR_MS)}시간 뒤 사라져요`, urgent: true };
  const days = Math.ceil(left / DAY_MS);
  return { text: `${days}일 뒤 사라져요`, urgent: days <= 3 };
}

export function MailView({
  onClaim,
  onClaimAll,
  onChanged,
  showToast,
}: {
  onClaim: (mailId: string) => Promise<MailClaimResult | null>;
  onClaimAll: () => Promise<MailClaimResult | null>;
  onChanged: () => void;
  showToast: (message: string, isError?: boolean) => void;
}) {
  const [mails, setMails] = useState<MailItem[]>([]);
  const [loadedAt, setLoadedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.getMails();
      setMails(r.mails);
      setLoadedAt(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '우편을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Promise.resolve().then(...)으로 감싸서 setState 호출이 이펙트 본문에서 동기로 일어나지 않게 한다.
  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const claimableCount = mails.filter((m) => m.hasRewards && !m.claimed).length;
  const unreadCount = mails.filter((m) => !m.read).length;

  const toggle = (mail: MailItem) => {
    setOpenId((cur) => (cur === mail.id ? null : mail.id));
    if (!mail.read) {
      // 펼치는 순간 읽음 처리한다(실패해도 화면에는 영향이 없다).
      api
        .readMail(mail.id)
        .then(() => {
          setMails((list) => list.map((m) => (m.id === mail.id ? { ...m, read: true } : m)));
          onChanged();
        })
        .catch(() => {});
    }
  };

  const claim = async (mail: MailItem) => {
    if (busy) return;
    setBusy(true);
    await onClaim(mail.id);
    await load(); // 성공하든 실패하든(이미 받았거나 기간이 지난 경우) 서버 상태로 맞춘다
    onChanged();
    setBusy(false);
  };

  const claimAll = async () => {
    if (busy || claimableCount === 0) return;
    setBusy(true);
    await onClaimAll();
    await load();
    onChanged();
    setBusy(false);
  };

  const remove = async (mail: MailItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.deleteMail(mail.id);
      setMails((list) => list.filter((m) => m.id !== mail.id));
      setOpenId((cur) => (cur === mail.id ? null : cur));
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제하지 못했어요.', true);
    }
    setBusy(false);
  };

  return (
    <section className="view active">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAILBOX</p>
          <h1>
            우편함{' '}
            <span>
              받을 수 있는 우편 {claimableCount} · 안 읽음 {unreadCount}
            </span>
          </h1>
          <p className="subheading">운영자가 보낸 보상과 소식이 도착하는 곳이에요. 받지 않은 자원은 기간이 지나면 사라져요.</p>
        </div>
        <div className="mail-actions">
          <button className="button primary" onClick={claimAll} disabled={busy || claimableCount === 0}>
            🎁 모두 받기{claimableCount > 0 ? ` (${claimableCount})` : ''}
          </button>
          <button className="button secondary" onClick={() => void load()} disabled={busy}>
            🔄 새로고침
          </button>
        </div>
      </div>

      {error && <p className="empty">문제가 발생했어요: {error}</p>}
      {!error && loading && <p className="empty">우편을 불러오는 중이에요...</p>}
      {!error && !loading && mails.length === 0 && <p className="empty">받은 우편이 없어요.</p>}

      <div className="mail-list">
        {mails.map((m) => {
          const open = openId === m.id;
          const expiry = expiryLabel(m.expiresAt, loadedAt);
          return (
            <article
              key={m.id}
              className={`mail-card${m.read ? '' : ' unread'}${m.claimed ? ' claimed' : ''}${open ? ' open' : ''}`}
            >
              <button className="mail-head" onClick={() => toggle(m)} aria-expanded={open}>
                <span className="mail-dot" aria-hidden="true" />
                <span className="mail-title">{m.title}</span>
                {m.hasRewards && !m.claimed && <span className="mail-gift">🎁</span>}
                {m.claimed && <span className="mail-received">받음 ✓</span>}
                <small className="mail-date">{formatDate(m.createdAt)}</small>
              </button>
              {open && (
                <div className="mail-body">
                  <p className="mail-text">{m.body || '(내용 없음)'}</p>
                  {m.hasRewards && <MailRewardChips rewards={m.rewards} />}
                  <div className="mail-footer">
                    <small className={m.hasRewards && !m.claimed && expiry.urgent ? 'mail-expiry urgent' : 'mail-expiry'}>
                      ⏳ {expiry.text}
                    </small>
                    {m.hasRewards && !m.claimed ? (
                      <button className="button primary" onClick={() => void claim(m)} disabled={busy}>
                        받기
                      </button>
                    ) : (
                      <button className="button secondary" onClick={() => void remove(m)} disabled={busy}>
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
