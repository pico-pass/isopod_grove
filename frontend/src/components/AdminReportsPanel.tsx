import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AdminChatBan, AdminChatReport } from '../api/types';

type Filter = 'open' | 'handled' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: '처리 대기' },
  { key: 'handled', label: '처리됨' },
  { key: 'all', label: '전체' },
];

const STATUS_LABEL = { open: '처리 대기', resolved: '처리 완료', dismissed: '반려' } as const;

// 처리 완료와 함께 걸 수 있는 채팅 정지 기간(일). 0은 정지 없음.
const BAN_OPTIONS = [0, 1, 3, 7, 30, 90] as const;

const formatDateTime = (at: number) =>
  new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function ReportCard({
  report,
  busy,
  onResolve,
}: {
  report: AdminChatReport;
  busy: boolean;
  onResolve: (report: AdminChatReport, status: 'resolved' | 'dismissed', note: string, banDays: number, notify: boolean) => void;
}) {
  const [note, setNote] = useState('');
  const [banDays, setBanDays] = useState<number>(0);
  const [notify, setNotify] = useState(true);
  const isOpen = report.status === 'open';
  return (
    <article className={`report-card${isOpen ? ' open' : ''}`}>
      <header>
        <strong>🚩 {report.reasonLabel}</strong>
        <span className={`pill report-status ${report.status}`}>{STATUS_LABEL[report.status]}</span>
        {report.reportedBanUntil && (
          <span className="pill report-ban">🔇 정지 중 · {formatDateTime(report.reportedBanUntil)}까지</span>
        )}
        <small>{formatDateTime(report.createdAt)}</small>
      </header>
      <p className="report-who">
        <b>{report.reporter.displayName}</b> 님이 <b>{report.reported.displayName}</b> 님을 신고
        {report.reportedReporterCount > 1 && (
          <span className="report-repeat"> · 이 유저는 {report.reportedReporterCount}명에게 신고됨</span>
        )}
      </p>
      {report.detail && <p className="report-detail">“{report.detail}”</p>}
      <div className="report-context">
        {report.context.map((m) => (
          <div
            key={m.messageId}
            className={`report-line ${m.sender}${m.messageId === report.messageId ? ' target' : ''}`}
          >
            <small>{m.sender === 'reported' ? report.reported.displayName : report.reporter.displayName}</small>
            <span>{m.text || '(삭제됨)'}</span>
          </div>
        ))}
      </div>
      {isOpen ? (
        <div className="report-resolve">
          <input
            value={note}
            maxLength={200}
            placeholder="처리 메모(선택)"
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="report-ban-select">
            <span>처리 완료 시 채팅 정지</span>
            <select value={banDays} onChange={(e) => setBanDays(Number(e.target.value))}>
              {BAN_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? '정지 안 함' : `${d}일 정지`}
                </option>
              ))}
            </select>
          </label>
          {banDays > 0 && (
            <label className="admin-check">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              정지 안내 우편 보내기
            </label>
          )}
          <button
            className="button primary"
            disabled={busy}
            onClick={() => onResolve(report, 'resolved', note, banDays, notify)}
          >
            {banDays > 0 ? `처리 완료 + ${banDays}일 정지` : '처리 완료'}
          </button>
          <button className="button secondary" disabled={busy} onClick={() => onResolve(report, 'dismissed', note, 0, false)}>
            반려
          </button>
        </div>
      ) : (
        <small className="report-handled">
          {report.handledAt ? `${formatDateTime(report.handledAt)} 처리` : ''}
          {report.sanction ? ` · 🔇 ${report.sanction.days}일 채팅 정지 적용` : ''}
          {report.adminNote ? ` · 메모: ${report.adminNote}` : ''}
        </small>
      )}
    </article>
  );
}

export function AdminReportsPanel() {
  const [filter, setFilter] = useState<Filter>('open');
  const [reports, setReports] = useState<AdminChatReport[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bans, setBans] = useState<AdminChatBan[]>([]);

  const loadBans = useCallback(async () => {
    try {
      setBans(await api.getAdminChatBans());
    } catch {
      // 정지 목록을 못 불러와도 신고 처리에는 영향이 없다.
    }
  }, []);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      const r = await api.getAdminChatReports(f);
      setReports(r.reports);
      setOpenCount(r.openCount);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '신고 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(filter));
  }, [load, filter]);

  useEffect(() => {
    Promise.resolve().then(() => loadBans());
  }, [loadBans]);

  const resolve = async (
    report: AdminChatReport,
    status: 'resolved' | 'dismissed',
    note: string,
    banDays: number,
    notify: boolean,
  ) => {
    if (busy) return;
    const label = status === 'resolved' ? '처리 완료' : '반려';
    const who = report.reported.displayName;
    const banLine =
      banDays > 0
        ? `\n\n🔇 ${who} 님의 친구 채팅·공동 채팅방을 ${banDays}일 동안 정지해요.${
            report.reportedBanUntil
              ? `\n(이미 ${formatDateTime(report.reportedBanUntil)}까지 정지 중이에요. 더 긴 쪽이 적용돼요.)`
              : ''
          }\n정지 안내 우편: ${notify ? '보냄' : '보내지 않음'}`
        : '';
    if (!window.confirm(`이 신고를 "${label}"로 처리할까요?${banLine}`)) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const r = await api.resolveAdminChatReport(report.id, status, note.trim() || undefined, banDays, notify);
      if (r.ban) {
        setNotice(
          `✅ 처리했어요. ${who} 님의 채팅을 ${formatDateTime(r.ban.until)}까지 정지했어요.${
            notify ? (r.notified ? ' (안내 우편 발송)' : ' (안내 우편은 보내지 못했어요)') : ''
          }`,
        );
      } else {
        setNotice('✅ 처리했어요.');
      }
      await Promise.all([load(filter), loadBans()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '처리하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const liftBan = async (ban: AdminChatBan) => {
    if (busy || !window.confirm(`${ban.displayName} 님의 채팅 정지를 지금 해제할까요?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.liftAdminChatBan(ban.userId);
      setNotice(`✅ ${ban.displayName} 님의 채팅 정지를 해제했어요.`);
      await Promise.all([load(filter), loadBans()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '해제하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel admin-reports">
      <div className="panel-heading">
        <h2>
          🚩 채팅 신고 {openCount > 0 && <span className="pill report-status open">대기 {openCount}</span>}
        </h2>
        <button className="button secondary" onClick={() => void load(filter)} disabled={loading}>
          🔄
        </button>
      </div>
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button key={f.key} className={`filter${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {notice && <p className="admin-status ok">{notice}</p>}
      {error && <p className="admin-status error">{error}</p>}
      {bans.length > 0 && (
        <div className="ban-list">
          <strong>🔇 채팅 정지 중인 유저 {bans.length}명</strong>
          {bans.map((b) => (
            <div key={b.userId} className="ban-row">
              <span>
                <b>{b.displayName}</b>
                <small>
                  {formatDateTime(b.until)}까지{b.reason ? ` · ${b.reason}` : ''}
                </small>
              </span>
              <button className="button secondary" disabled={busy} onClick={() => void liftBan(b)}>
                해제
              </button>
            </div>
          ))}
        </div>
      )}
      {reports.length === 0 ? (
        <p className="empty">{loading ? '불러오는 중이에요...' : '신고가 없어요.'}</p>
      ) : (
        <div className="report-list">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              busy={busy}
              onResolve={(rep, st, n, d, nt) => void resolve(rep, st, n, d, nt)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
