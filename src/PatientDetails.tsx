import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type Appointment, type Patient, type Professional, type Session } from "./api";
import "./PatientDetails.css";

const labels = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELED: "Cancelada",
  NO_SHOW: "Não compareceu",
};
const SESSION_VALUE = 100;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
function date(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function sessionStatus(item: Appointment) {
  return new Date(item.endsAt).getTime() < Date.now() &&
    (item.status === "SCHEDULED" || item.status === "CONFIRMED")
    ? `${labels[item.status]} · pendente de atualização`
    : labels[item.status];
}
function sameMonth(value: string, timezone: string) {
  const parts = (dateValue: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit" }).formatToParts(dateValue).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  const current = parts(new Date()), target = parts(new Date(value));
  return current.year === target.year && current.month === target.month;
}
export function PatientDetails({
  session,
  patient,
  professional,
  back,
  newSession,
  edit,
  toggleActive,
}: {
  session: Session;
  patient: Patient;
  professional: Professional;
  back: () => void;
  newSession: () => void;
  edit: () => void;
  toggleActive: () => Promise<void>;
}) {
  const [items, setItems] = useState<Appointment[]>([]),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"overview" | "sessions" | "finance" | "patient">("overview"),
    [editingSession, setEditingSession] = useState<Appointment | null>(null),
    [viewingSession, setViewingSession] = useState<Appointment | null>(null),
    [historyStatus, setHistoryStatus] = useState(""),
    [historyPeriod, setHistoryPeriod] = useState("ALL");
  const loadSessions = useCallback(async () => {
    try {
      setItems(await api.patientSessions(session, patient.id));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as sessões");
    }
  }, [session, patient.id]);
  useEffect(() => { void loadSessions(); }, [loadSessions]);
  async function changeActive() {
    if (patient.active && !window.confirm(`Desativar ${patient.fullName}?`)) return;
    setError("");
    try {
      await toggleActive();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar o status do paciente");
    }
  }
  const { next, completed, history, filteredHistory, historyTotals } = useMemo(() => {
    const now = Date.now(),
      history = items
        .filter((item) => item.status === "CANCELED" || new Date(item.endsAt).getTime() < now)
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        ),
      next = items
        .filter((item) => item.status !== "CANCELED")
        .filter((item) => new Date(item.startsAt).getTime() >= now)
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      completed = history.filter((item) => item.status === "COMPLETED"),
      since = historyPeriod === "ALL" ? 0 : now - Number(historyPeriod) * 24 * 60 * 60 * 1000,
      matchesStatus = (item: Appointment) => historyStatus === "PENDING" ? item.status === "SCHEDULED" || item.status === "CONFIRMED" : !historyStatus || item.status === historyStatus,
      filteredHistory = history.filter((item) => new Date(item.startsAt).getTime() >= since && matchesStatus(item));
    return { next, completed, history, filteredHistory, historyTotals: { total: history.length, completed: completed.length, canceled: history.filter((item) => item.status === "CANCELED").length, noShow: history.filter((item) => item.status === "NO_SHOW").length, pending: history.filter((item) => item.status === "SCHEDULED" || item.status === "CONFIRMED").length } };
  }, [items, historyPeriod, historyStatus]);
  const weekDayCounts = items.filter(item => item.status !== "CANCELED").reduce((counts, item) => { const day = new Date(item.startsAt).getDay(); counts[day] = (counts[day] ?? 0) + 1; return counts; }, [] as number[]);
  const standardWeekday = weekDayCounts.findIndex(count => count >= 2);
  const standardSession = items.filter(item => item.status !== "CANCELED" && new Date(item.startsAt).getDay() === standardWeekday).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  return (
    <section className="patient-detail">
      <button className="back-link" onClick={back}>
        ‹ Voltar para pacientes
      </button>
      <div className="patient-detail-head">
        <div className="patient-identity">
          <span className="eyebrow">PACIENTE</span>
          <h2>
            {patient.fullName}{" "}
            <span className={`badge ${patient.active ? "ativo" : "inativo"}`}>
              {patient.active ? "Ativo" : "Inativo"}
            </span>
          </h2>
          <p>
            {patient.email || "E-mail não informado"} ·{" "}
            {patient.phone || "Telefone não informado"}
          </p>
        </div>
        <div className="patient-head-side">
        <div className="patient-detail-actions">
          {patient.active ? (
            <>
              <button className="ghost" onClick={edit}>
                Editar dados
              </button>
              <button className="primary" onClick={newSession}>
                + Nova sessão
              </button>
              <button
                className="ghost patient-deactivate"
                onClick={() => void changeActive()}
              >
                Desativar
              </button>
            </>
          ) : (
            <button className="primary" onClick={() => void changeActive()}>
              Ativar paciente
            </button>
          )}
        </div>
        <div className="patient-session-defaults" aria-label="Preferências de sessão do paciente">
          <div>
            <span>Sessão padrão</span>
            <strong>{standardSession ? `Toda ${weekdays[standardWeekday]} às ${new Date(standardSession.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Não definida"}</strong>
          </div>
          <div>
            <span>Duração da sessão</span>
            <strong>{professional.defaultSessionMinutes} minutos</strong>
          </div>
        </div>
        </div>
      </div>
      {error && <div className="error banner"><span>{error}</span><button type="button" className="banner-close" onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
      <div className="patient-tabs" role="tablist" aria-label="Informações do paciente">
        <button role="tab" aria-selected={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Visão geral</button>
        <button role="tab" aria-selected={tab === "sessions"} className={tab === "sessions" ? "active" : ""} onClick={() => setTab("sessions")}>Sessões</button>
        <button role="tab" aria-selected={tab === "finance"} className={tab === "finance" ? "active" : ""} onClick={() => setTab("finance")}>Financeiro</button>
        <button role="tab" aria-selected={tab === "patient"} className={tab === "patient" ? "active" : ""} onClick={() => setTab("patient")}>Dados do paciente</button>
      </div>
      {tab === "overview" && <>
        <div className="patient-summary patient-summary-actions">
          <SummaryCard tone="completed" icon="✓" value={completed.length} label="Sessões realizadas" detail="Total de consultas concluídas" />
          <SummaryCard tone="upcoming" icon="◷" value={next.length} label="Próximas sessões" detail={next.length === 1 ? "Agendada" : "Agendadas"} />
          <SummaryCard tone="no-show" icon="×" value={historyTotals.noShow} label="Faltas" detail="Não compareceu" />
          <SummaryCard tone="canceled" icon="⊘" value={historyTotals.canceled} label="Cancelamentos" detail="Pelo paciente ou profissional" />
        </div>
        <div className="patient-session-grid">
          <SessionList title="Próximas sessões" empty="Nenhuma sessão agendada." emptyDetail="Este paciente não possui sessões futuras agendadas." emptyAction="Agendar sessão" onEmptyAction={newSession} items={next} onSelect={setViewingSession} />
          <SessionList title="Últimas sessões" empty="Nenhuma sessão no histórico." items={history} action="Ver todas →" onAction={() => setTab("sessions")} onSelect={item => patient.active && (item.status === "SCHEDULED" || item.status === "CONFIRMED") ? setEditingSession(item) : setViewingSession(item)} />
        </div>
      </>}
      {tab === "sessions" && <HistoryList items={filteredHistory} totals={historyTotals} status={historyStatus} period={historyPeriod} setStatus={setHistoryStatus} setPeriod={setHistoryPeriod} onSelect={item => patient.active && (item.status === "SCHEDULED" || item.status === "CONFIRMED") ? setEditingSession(item) : setViewingSession(item)} />}
      {tab === "finance" && <Finance items={items} timezone={professional.timezone} />}
      {tab === "patient" && <section className="patient-tab-placeholder" role="tabpanel">
        <h3>Dados do paciente</h3>
        <p>Esta área será disponibilizada em uma próxima etapa.</p>
      </section>}
      {editingSession && (
        <SessionStatusModal
          item={editingSession}
          close={() => setEditingSession(null)}
          save={async (status, notes) => {
            await api.updateSessionResult(session, editingSession.id, {
              status,
              notes,
            });
            setEditingSession(null);
            await loadSessions();
          }}
        />
      )}
      {viewingSession && <SessionDetailsModal item={viewingSession} close={() => setViewingSession(null)} />}
    </section>
  );
}
function SessionDetailsModal({ item, close }: { item: Appointment; close: () => void }) {
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="session-details-title">
    <div className="modal-head"><h2 id="session-details-title">Detalhes da sessão</h2><button type="button" onClick={close} aria-label="Fechar">×</button></div>
    <div className="patient-session-details"><dl>
      <div><dt>Início</dt><dd>{date(item.startsAt)}</dd></div>
      <div><dt>Término</dt><dd>{date(item.endsAt)}</dd></div>
      <div><dt>Modalidade</dt><dd>{item.modality === "ONLINE" ? "Online" : "Presencial"}</dd></div>
      <div><dt>Status</dt><dd>{sessionStatus(item)}</dd></div>
      {item.meetingLink && <div><dt>Link da sessão</dt><dd><a href={item.meetingLink} target="_blank" rel="noreferrer">Abrir link</a></dd></div>}
      {item.notes && <div><dt>Observação</dt><dd>{item.notes}</dd></div>}
    </dl><div className="form-actions"><button type="button" className="primary" onClick={close}>Fechar</button></div></div>
  </section></div>;
}
function SessionStatusModal({ item, close, save }: {
  item: Appointment;
  close: () => void;
  save: (status: Appointment["status"], notes: string | null) => Promise<void>;
}) {
  const [status, setStatus] = useState<Appointment["status"] | "">(
    item.status === "SCHEDULED" || item.status === "CONFIRMED" ? "" : item.status,
  );
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return;
    setBusy(true);
    setError("");
    try { await save(status, String(new FormData(event.currentTarget).get("notes") || "") || null); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar a sessão"); setBusy(false); }
  }
  return <div className="modal-backdrop"><section className="modal">
    <div className="modal-head"><h2>Atualizar sessão</h2><button type="button" onClick={close} aria-label="Fechar">×</button></div>
    <form className="form-grid" onSubmit={submit}>
      <p className="session-status-context span">{date(item.startsAt)} · {item.patientName}</p>
      <label className="span">Resultado da sessão
        <select value={status} onChange={event => setStatus(event.target.value as Appointment["status"])}>
          <option value="">Selecione o resultado</option>
          <option value="COMPLETED">Realizada</option>
          <option value="NO_SHOW">Não compareceu</option>
        </select>
      </label>
      <label className="span">Observação <small>(opcional)</small><input name="notes" defaultValue={item.notes ?? ""} maxLength={500} /></label>
      {error && <div className="error span">{error}</div>}
      <div className="form-actions span"><button type="button" className="ghost" onClick={close}>Cancelar</button><button className="primary" disabled={busy || !status}>{busy ? "Salvando…" : "Salvar status"}</button></div>
    </form>
  </section></div>;
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}
function SummaryCard({ tone, icon, value, label, detail }: { tone: "completed" | "upcoming" | "no-show" | "canceled"; icon: string; value: number; label: string; detail: string }) {
  return <article className={`summary-card ${tone}`}>
    <span className="summary-icon" aria-hidden="true">{icon}</span>
    <span className="summary-copy"><strong>{value}</strong><b>{label}</b><small>{detail}</small></span>
  </article>;
}
function SessionList({
  title,
  items,
  empty,
  emptyDetail,
  emptyAction,
  onEmptyAction,
  action,
  onAction,
  onSelect,
}: {
  title: string;
  items: Appointment[];
  empty: string;
  emptyDetail?: string;
  emptyAction?: string;
  onEmptyAction?: () => void;
  action?: string;
  onAction?: () => void;
  onSelect?: (item: Appointment) => void;
}) {
  return (
    <article className="patient-session-list">
      <header>
        <span className="eyebrow">{title}</span>{action && onAction && <button type="button" className="session-list-action" onClick={onAction}>{action}</button>}
      </header>
      {items.length ? (
        <div>
          {items.slice(0, 5).map((item) => (
            <div className="patient-session" key={item.id}>
              {onSelect ? <button className="patient-session-open" onClick={() => onSelect(item)} aria-label={`Editar sessão de ${date(item.startsAt)}`}><strong>{date(item.startsAt)}</strong><span>{sessionStatus(item)} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</span></button> : <><strong>{date(item.startsAt)}</strong><span>{sessionStatus(item)} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</span></>}
            </div>
          ))}
        </div>
      ) : (
        <div className="patient-session-empty"><span aria-hidden="true">▣</span><strong>{empty}</strong>{emptyDetail && <p>{emptyDetail}</p>}{emptyAction && onEmptyAction && <button type="button" className="primary" onClick={onEmptyAction}>＋ {emptyAction}</button>}</div>
      )}
    </article>
  );
}
function HistoryList({ items, totals, status, period, setStatus, setPeriod, onSelect }: { items: Appointment[]; totals: { total: number; completed: number; canceled: number; noShow: number; pending: number }; status: string; period: string; setStatus: (value: string) => void; setPeriod: (value: string) => void; onSelect: (item: Appointment) => void }) {
  const totalsButtons: [string, string, number][] = [["", "Todas", totals.total], ["COMPLETED", "Realizadas", totals.completed], ["CANCELED", "Canceladas", totals.canceled], ["NO_SHOW", "Não compareceu", totals.noShow], ["PENDING", "Pendentes", totals.pending]];
  return <article className="patient-session-list patient-history-list" role="tabpanel">
    <header><span className="eyebrow">Histórico de sessões</span><small>{totals.total} registro{totals.total === 1 ? "" : "s"}</small></header>
    <div className="history-tools">
      <label>Período<select aria-label="Filtrar período do histórico" value={period} onChange={event => setPeriod(event.target.value)}><option value="ALL">Todo o período</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
      <label>Status<select aria-label="Filtrar status do histórico" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option><option value="COMPLETED">Realizadas</option><option value="CANCELED">Canceladas</option><option value="NO_SHOW">Não compareceu</option><option value="PENDING">Pendentes de resultado</option></select></label>
    </div>
    <div className="history-totals">{totalsButtons.map(([value, label, count]) => <button key={value || "ALL"} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}><strong>{count}</strong><span>{label}</span></button>)}</div>
    {items.length ? <div className="history-results">{items.map(item => <div className="patient-session" key={item.id}><button className="patient-session-open" onClick={() => onSelect(item)}><strong>{date(item.startsAt)}</strong><span>{sessionStatus(item)} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</span></button></div>)}</div> : <p>Nenhuma sessão encontrada com estes filtros.</p>}
  </article>;
}
function Finance({ items, timezone }: { items: Appointment[]; timezone: string }) {
  const sessions = [...items].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const received = sessions.filter(item => item.status === "COMPLETED" && sameMonth(item.startsAt, timezone)).length * SESSION_VALUE;
  const pending = sessions.filter(item => item.status === "SCHEDULED" || item.status === "CONFIRMED" || item.status === "NO_SHOW").length * SESSION_VALUE;
  const situation = (item: Appointment) => item.status === "COMPLETED" ? "Pago" : item.status === "CANCELED" ? "Cancelada" : "Pendente";
  return <section className="patient-finance" role="tabpanel">
    <header><div><span className="eyebrow">FINANCEIRO</span><h3>Resumo financeiro</h3><p>Valores estimados a partir das sessões deste paciente.</p></div></header>
    <div className="finance-summary">
      <Stat label="Valor padrão da sessão" value={money.format(SESSION_VALUE)} detail="por sessão" />
      <Stat label="Recebido no mês" value={money.format(received)} detail="sessões realizadas" />
      <Stat label="Pendente" value={money.format(pending)} detail="agendadas ou não compareceu" />
    </div>
    <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Sessão</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{sessions.length ? sessions.map(item => <tr key={item.id}><td><strong>{new Date(item.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: timezone })}</strong><small>{item.modality === "ONLINE" ? "Online" : "Presencial"}</small></td><td>{money.format(SESSION_VALUE)}</td><td><span className={`finance-status ${item.status.toLowerCase()}`}>{situation(item)}</span></td></tr>) : <tr><td colSpan={3} className="finance-empty">Nenhuma sessão registrada.</td></tr>}</tbody></table></div>
    <p className="finance-note">Sessões canceladas não entram nos valores recebidos ou pendentes.</p>
  </section>;
}
