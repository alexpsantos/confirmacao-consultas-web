import {RescheduleHistory} from "./RescheduleHistory";
import {weekday, DEFAULT_TIMEZONE} from "./timezone";
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type Appointment, type Patient, type Professional, type Session, type SessionFinance, type PaymentStatus, type PaymentMethod, type FinanceHistory } from "./api";
import "./PatientDetails.css";
import { localDate, filterFinance, financeTotals, financeStatus } from "./finance";
const methodLabels = {PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", BANK_TRANSFER: "Transferência", OTHER: "Outro"};

const labels = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELED: "Cancelada",
  NO_SHOW: "Não compareceu",
};
const paymentLabels = { PENDING: "Pendente", PAID: "Pago", EXEMPT: "Isento", CANCELED: "Cancelado" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PatientTimezone = createContext(DEFAULT_TIMEZONE);
const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
function date(value: string, timezone: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: timezone,
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
  const timezone = professional.timezone;
  const [items, setItems] = useState<Appointment[]>([]),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
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
  const weekDayCounts = items.filter(item => item.status !== "CANCELED").reduce((counts, item) => { const day = weekday(item.startsAt,timezone); counts[day] = (counts[day] ?? 0) + 1; return counts; }, [] as number[]);
  const standardWeekday = weekDayCounts.findIndex(count => count >= 2);
  const standardSession = items.filter(item => item.status !== "CANCELED" && weekday(item.startsAt,timezone) === standardWeekday).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  return (
    <PatientTimezone.Provider value={timezone}><section className="patient-detail">
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
            <strong>{standardSession ? `Toda ${weekdays[standardWeekday]} às ${new Date(standardSession.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone })}` : "Não definida"}</strong>
          </div>
          <div>
            <span>Duração da sessão</span>
            <strong>{professional.defaultSessionMinutes} minutos</strong>
          </div>
        </div>
        </div>
      </div>
      {error && <div className="error banner"><span>{error}</span><button type="button" className="banner-close" onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
      {success && <div className="success banner" role="status"><span>{success}</span><button type="button" className="banner-close" onClick={() => setSuccess("")} aria-label="Fechar aviso">×</button></div>}
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
          <SummaryCard tone="pending" icon="!" value={historyTotals.pending} label="Sessões pendentes" detail="Aguardam atualização" />
        </div>
        <div className="patient-session-grid">
          <SessionList title="Próximas sessões" empty="Nenhuma sessão agendada." emptyDetail="Este paciente não possui sessões futuras agendadas." emptyAction="Agendar sessão" onEmptyAction={newSession} items={next} onSelect={setViewingSession} />
          <SessionList title="Últimas sessões" recent empty="Nenhuma sessão no histórico." items={history} action="Ver todas →" onAction={() => setTab("sessions")} onSelect={item => patient.active && (item.status === "SCHEDULED" || item.status === "CONFIRMED") ? setEditingSession(item) : setViewingSession(item)} />
        </div>
      </>}
      {tab === "sessions" && <HistoryList items={filteredHistory} totals={historyTotals} status={historyStatus} period={historyPeriod} setStatus={setHistoryStatus} setPeriod={setHistoryPeriod} onSelect={item => patient.active && (item.status === "SCHEDULED" || item.status === "CONFIRMED") ? setEditingSession(item) : setViewingSession(item)} />}
      {tab === "finance" && <Finance items={items} timezone={professional.timezone} session={session} saved={updated => setItems(current => current.map(item => item.id === updated.id ? updated : item))} />}
      {tab === "patient" && <PatientData patient={patient} timezone={professional.timezone} />}
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
            setSuccess("Resultado da sessão atualizado com sucesso.");
          }}
        />
      )}
      {viewingSession && <SessionDetailsModal session={session} item={viewingSession} close={() => setViewingSession(null)} />}
    </section></PatientTimezone.Provider>
  );
}
function PatientData({patient, timezone}: {patient: Patient; timezone: string}) {
  const today = localDate(new Date(), timezone);
  const birth = patient.birthDate;
  const age = birth && birth <= today ? Number(today.slice(0,4)) - Number(birth.slice(0,4)) - (today.slice(5) < birth.slice(5) ? 1 : 0) : null;
  const digits = patient.phone.replace(/\D/g, "");
  const phone = digits.length === 11 ? `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}` : digits.length === 10 ? `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}` : patient.phone;
  const consent = {PENDING: "Pendente", GRANTED: "Autorizado", REVOKED: "Revogado"};
  return <section className="patient-data" role="tabpanel" aria-label="Dados do paciente">
    <header className="patient-data-heading"><div><span className="eyebrow">CADASTRO</span><h3>Dados do paciente</h3><p>Informações pessoais, contatos e preferências de comunicação.</p></div><span className={`patient-data-status ${patient.active ? "active" : "inactive"}`}>{patient.active ? "Cadastro ativo" : "Cadastro inativo"}</span></header>
    <div className="patient-data-grid">
      <article className="patient-data-card"><header><span className="patient-data-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg></span><div><h4>Dados pessoais</h4><p>Identificação do paciente</p></div></header><dl>
        <div className="patient-data-wide"><dt>Nome completo</dt><dd>{patient.fullName}</dd></div>
        <div><dt>Data de nascimento</dt><dd>{birth ? birth.split("-").reverse().join("/") : "Não informada"}</dd></div>
        <div><dt>Idade</dt><dd>{age === null ? "Não informada" : `${age} anos`}</dd></div>
      </dl></article>
      <article className="patient-data-card"><header><span className="patient-data-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg></span><div><h4>Contato</h4><p>Canais para falar com o paciente</p></div></header><dl>
        <div className="patient-data-wide"><dt>Telefone / WhatsApp</dt><dd>{phone || "Não informado"}</dd></div>
        <div className="patient-data-wide"><dt>E-mail</dt><dd>{patient.email || "Não informado"}</dd></div>
        <div className="patient-data-wide"><dt>Canal preferencial</dt><dd>{patient.preferredChannel === "WHATSAPP" ? "WhatsApp" : "E-mail"}</dd></div>
      </dl></article>
      <article className="patient-data-card patient-data-communication"><header><span className="patient-data-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><div><h4>Lembretes e consentimento</h4><p>Preferências registradas no cadastro</p></div></header><dl>
        <div><dt>Lembretes via WhatsApp</dt><dd>{patient.whatsappRemindersEnabled === undefined ? "Não informado" : patient.whatsappRemindersEnabled ? "Ativados" : "Desativados"}</dd></div>
        <div><dt>Consentimento para contato</dt><dd>{consent[patient.consentStatus]}</dd></div>
      </dl></article>
    </div>
    <p className="patient-data-hint">Para atualizar o cadastro, use <strong>Editar dados</strong> no topo da página.</p>
  </section>;
}
function SessionDetailsModal({ session, item, close }: { session: Session; item: Appointment; close: () => void }) {
  const timezone = useContext(PatientTimezone);
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="session-details-title">
    <div className="modal-head"><h2 id="session-details-title">Detalhes da sessão</h2><button type="button" onClick={close} aria-label="Fechar">×</button></div>
    <div className="patient-session-details"><dl>
      <div><dt>Início</dt><dd>{date(item.startsAt, timezone)}</dd></div>
      <div><dt>Término</dt><dd>{date(item.endsAt, timezone)}</dd></div>
      <div><dt>Modalidade</dt><dd>{item.modality === "ONLINE" ? "Online" : "Presencial"}</dd></div>
      <div><dt>Status</dt><dd>{sessionStatus(item)}</dd></div>
      {item.meetingLink && <div><dt>Link da sessão</dt><dd><a href={item.meetingLink} target="_blank" rel="noreferrer">Abrir link</a></dd></div>}
      {item.notes && <div><dt>Observação</dt><dd>{item.notes}</dd></div>}
    </dl><div className="form-actions"><button type="button" className="primary" onClick={close}>Fechar</button></div></div>
    <RescheduleHistory session={session} id={item.id} timezone={timezone}/>
  </section></div>;
}
function SessionStatusModal({ item, close, save }: {
  item: Appointment;
  close: () => void;
  save: (status: Appointment["status"], notes: string | null) => Promise<void>;
}) {
  const timezone = useContext(PatientTimezone);
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
      <p className="session-status-context span">{date(item.startsAt, timezone)} · {item.patientName}</p>
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
function SummaryCard({ tone, icon, value, label, detail }: { tone: "completed" | "upcoming" | "no-show" | "canceled" | "pending"; icon: string; value: number; label: string; detail: string }) {
  return <article className={`summary-card ${tone}`}>
    <span className="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icon === "✓" ? <path d="m5 12 4.5 4.5L19 7.5" /> : icon === "◷" ? <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></> : icon === "×" ? <path d="m7 7 10 10M17 7 7 17" /> : icon === "⊘" ? <><circle cx="12" cy="12" r="8" /><path d="m8 19 8-14" /></> : <><path d="M12 5v10" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></>}
    </svg></span>
    <span className="summary-copy"><strong>{value}</strong><b>{label}</b><small>{detail}</small></span>
  </article>;
}
function recentStatus(item: Appointment) {
  if (new Date(item.endsAt).getTime() < Date.now() && (item.status === "SCHEDULED" || item.status === "CONFIRMED")) return ["Aguardando resultado", "pending"] as const;
  if (item.status === "COMPLETED") return ["Realizada", "completed"] as const;
  if (item.status === "NO_SHOW") return ["Não compareceu", "no-show"] as const;
  if (item.status === "CANCELED") return ["Cancelada", "canceled"] as const;
  return [labels[item.status], "scheduled"] as const;
}
function recentMeta(item: Appointment, timezone: string) {
  const start = new Date(item.startsAt), end = new Date(item.endsAt), minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const clock = (value: Date) => value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone });
  return `${clock(start)} – ${clock(end)} (${minutes} min)`;
}
function patientSessionDay(value: string, timezone: string) { return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", timeZone: timezone }); }
function patientSessionMonth(value: string, timezone: string) { return new Date(value).toLocaleDateString("pt-BR", { month: "short", timeZone: timezone }).replace(".", ""); }
function patientSessionDate(value: string, timezone: string) { return new Date(value).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short", timeZone: timezone }); }
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
  recent = false,
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
  recent?: boolean;
}) {
  const timezone = useContext(PatientTimezone);
  return (
    <article className={`patient-session-list patient-session-overview${recent ? " patient-session-recent" : ""}`}>
      <header>
        <span className="eyebrow"><span className="recent-title-icon" aria-hidden="true">{recent ? <PatientClockIcon /> : <PatientCalendarIcon />}</span>{title}</span>{action && onAction && <button type="button" className="session-list-action" onClick={onAction}>{action}</button>}
      </header>
      {items.length ? (
        <div>
          {items.slice(0, 5).map((item) => (
            <div className="patient-session" key={item.id}>
              {onSelect ? <PatientOverviewSession item={item} select={onSelect} recent={recent} /> : <><strong>{date(item.startsAt, timezone)}</strong><span>{sessionStatus(item)} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</span></>}
            </div>
          ))}
        </div>
      ) : (
        <div className="patient-session-empty"><span aria-hidden="true">▣</span><strong>{empty}</strong>{emptyDetail && <p>{emptyDetail}</p>}{emptyAction && onEmptyAction && <button type="button" className="primary" onClick={onEmptyAction}>＋ {emptyAction}</button>}</div>
      )}
    </article>
  );
}
function PatientOverviewSession({ item, select, recent }: { item: Appointment; select: (item: Appointment) => void; recent: boolean }) {
  const timezone = useContext(PatientTimezone);
  const [label, tone] = recentStatus(item);
  return <button className="patient-session-open patient-session-rich" onClick={() => select(item)} aria-label={`Ver sessão de ${date(item.startsAt, timezone)}`}><span className="patient-date-tile"><strong>{patientSessionDay(item.startsAt, timezone)}</strong><small>{patientSessionMonth(item.startsAt, timezone)}</small></span><span className="recent-copy"><strong>{item.patientName}</strong><span>{patientSessionDate(item.startsAt, timezone)}</span></span><span className="patient-session-meta"><i aria-hidden="true"><PatientClockIcon /></i>{recentMeta(item, timezone)} <i aria-hidden="true"><PatientVideoIcon /></i> {item.modality === "ONLINE" ? "Online" : "Presencial"}</span><b className={`recent-status ${recent ? tone : "scheduled"}`}>{recent ? label : item.status === "CONFIRMED" ? "Confirmada" : "Agendada"}</b><i className="patient-session-menu" aria-hidden="true">⋮</i></button>;
}
function PatientCalendarIcon() { return <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h5"/></svg>; }
function PatientClockIcon() { return <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.8"/><path d="M8 4.5V8l2.4 1.6"/></svg>; }
function PatientVideoIcon() { return <svg viewBox="0 0 16 16"><rect x="1.5" y="4" width="9" height="8" rx="1.5"/><path d="m10.5 6.5 4-2v7l-4-2"/></svg>; }
function HistoryList({ items, totals, status, period, setStatus, setPeriod, onSelect }: { items: Appointment[]; totals: { total: number; completed: number; canceled: number; noShow: number; pending: number }; status: string; period: string; setStatus: (value: string) => void; setPeriod: (value: string) => void; onSelect: (item: Appointment) => void }) {
  const timezone = useContext(PatientTimezone);
  const totalsButtons: [string, string, number][] = [["", "Todas", totals.total], ["COMPLETED", "Realizadas", totals.completed], ["CANCELED", "Canceladas", totals.canceled], ["NO_SHOW", "Não compareceu", totals.noShow], ["PENDING", "Pendentes", totals.pending]];
  return <article className="patient-session-list patient-history-list" role="tabpanel">
    <header><span className="eyebrow">Histórico de sessões</span><small>{totals.total} registro{totals.total === 1 ? "" : "s"}</small></header>
    <div className="history-tools">
      <label>Período<select aria-label="Filtrar período do histórico" value={period} onChange={event => setPeriod(event.target.value)}><option value="ALL">Todo o período</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
      <label>Status<select aria-label="Filtrar status do histórico" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option><option value="COMPLETED">Realizadas</option><option value="CANCELED">Canceladas</option><option value="NO_SHOW">Não compareceu</option><option value="PENDING">Pendentes de resultado</option></select></label>
    </div>
    <div className="history-totals">{totalsButtons.map(([value, label, count]) => <button key={value || "ALL"} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}><strong>{count}</strong><span>{label}</span></button>)}</div>
    {items.length ? <div className="history-results">{items.map(item => <div className="patient-session" key={item.id}><button className="patient-session-open" onClick={() => onSelect(item)}><strong>{date(item.startsAt, timezone)}</strong><span>{sessionStatus(item)} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</span></button></div>)}</div> : <p>Nenhuma sessão encontrada com estes filtros.</p>}
  </article>;
}
function Finance({ items, timezone, session, saved }: { items: Appointment[]; timezone: string; session: Session; saved: (item: Appointment) => void }) {
  const [editing, setEditing] = useState<Appointment | null>(null), [price, setPrice] = useState<number | null>(null), [error, setError] = useState("");
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [status, setStatus] = useState(""), [basis, setBasis] = useState("SESSION"), [history, setHistory] = useState<Appointment | null>(null);
  useEffect(() => { let active = true; api.sessionPrice(session).then(result => { if (active) setPrice(result.value); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [session]);
  const invalidPeriod = !!from && !!to && from > to;
  const sessions = invalidPeriod ? [] : filterFinance(items, timezone, from, to, status, basis).sort((a,b) => b.startsAt.localeCompare(a.startsAt));
  const totals = financeTotals(sessions), missing = sessions.some(item => item.financialAmount == null);
  const amount = (value: number) => missing ? "—" : money.format(value);
  return <section className="patient-finance" role="tabpanel">
    <header><div><span className="eyebrow">FINANCEIRO</span><h3>Resumo financeiro</h3><p>Lançamentos individuais das sessões deste paciente.</p></div></header>
    {error && <p className="error" role="alert">{error}</p>}
    {missing && <p className="error" role="alert">Não foi possível consultar os valores salvos. Atualize o backend para carregar o financeiro.</p>}
    <div className="finance-filters">
      <label>De<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>Até<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <label>Data de referência<select value={basis} onChange={e => setBasis(e.target.value)}><option value="SESSION">Data da sessão</option><option value="PAYMENT">Data de pagamento</option></select></label>
      <label>Situação<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{(Object.keys(paymentLabels) as PaymentStatus[]).map(value => <option key={value} value={value}>{paymentLabels[value]}</option>)}</select></label>
      <button type="button" onClick={() => {const month=localDate(new Date(),timezone).slice(0,7);setFrom(month+"-01");const [y,m]=month.split("-").map(Number);setTo(month+"-"+new Date(y,m,0).getDate());}}>Este mês</button>
      <button type="button" onClick={() => {setFrom("");setTo("");setStatus("");setBasis("SESSION");}}>Limpar filtros</button>
    </div>
    {invalidPeriod && <p className="error" role="alert">A data final deve ser igual ou posterior à inicial.</p>}
    <p className="finance-note">Tabela e totais seguem os mesmos filtros. Com período por pagamento, lançamentos sem data de pagamento ficam fora da consulta.</p>
    <div className="finance-summary">
      <Stat label="Recebido" value={amount(totals.received)} detail="nos filtros selecionados" />
      <Stat label="Pendente" value={amount(totals.pending)} detail="nos filtros selecionados" />
      <Stat label="Isento" value={amount(totals.exempt)} detail="fora do total financeiro" />
      <Stat label="Total do período" value={amount(totals.total)} detail="recebido + pendente" />
    </div>
    <p className="finance-note">Valor padrão do perfil: <strong>{price === null ? "—" : money.format(price)}</strong>. Alterações nas preferências atualizam apenas sessões futuras pendentes sem valor personalizado.</p>
    <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Sessão</th><th>Valor</th><th>Situação</th><th>Pagamento</th><th>Forma</th><th>Observação</th><th>Ações</th></tr></thead><tbody>{sessions.length ? sessions.map(item => <tr key={item.id}>
      <td><strong>{new Date(item.startsAt).toLocaleDateString("pt-BR", {day:"2-digit",month:"2-digit",year:"numeric",timeZone:timezone})}</strong><small>{item.modality === "ONLINE" ? "Online" : "Presencial"}</small></td>
      <td>{item.financialAmount == null ? "—" : money.format(Number(item.financialAmount))}</td><td>{paymentLabels[financeStatus(item)]}</td><td>{item.paymentDate ? item.paymentDate.split("-").reverse().join("/") : "—"}</td><td>{item.paymentMethod ? methodLabels[item.paymentMethod] : "—"}</td>
      <td><FinanceNote value={item.financialNotes} /></td><td><div className="finance-actions"><button type="button" disabled={item.financialAmount == null} onClick={() => setEditing(item)} aria-label={`Editar lançamento de ${date(item.startsAt, timezone)}`}>Editar</button></div></td>
    </tr>) : <tr><td colSpan={7} className="finance-empty">Nenhum lançamento encontrado com estes filtros.</td></tr>}</tbody></table></div>
    <p className="finance-note">Sessões canceladas e lançamentos cancelados ou isentos não entram no total financeiro.</p>
    {editing && <FinanceModal item={editing} timezone={timezone} close={() => setEditing(null)} save={async data => {const updated=await api.updateSessionFinance(session,editing.id,data);if(data.paymentMethod && updated.paymentMethod !== data.paymentMethod) throw new Error("A API não confirmou a forma de pagamento escolhida. Reinicie o backend atualizado e confira a migração V24 antes de tentar novamente.");saved(updated);setEditing(null);}} />}
    {history && <FinanceHistoryModal item={history} session={session} timezone={timezone} close={() => setHistory(null)} />}
  </section>;
}
export function FinanceNote({value}: {value?: string | null}) {
  const [expanded, setExpanded] = useState(false);
  if (!value) return <>—</>;
  if(value.length <= 80) return <span className="finance-note-text">{value}</span>;
  return <div className="finance-note-text"><span>{expanded ? value : `${value.slice(0,80)}…`}</span><button type="button" className="finance-note-toggle" aria-expanded={expanded} onClick={() => setExpanded(current => !current)}>{expanded ? "Recolher" : "Ver completa"}</button></div>;
}
function FinanceHistoryModal({item,session,timezone,close}: {item:Appointment;session:Session;timezone:string;close:()=>void}) {
  const [entries,setEntries]=useState<FinanceHistory[] | null>(null),[error,setError]=useState("");
  useEffect(() => {let active=true;api.financeHistory(session,item.id).then(result=>{if(active)setEntries(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[session,item.id]);
  function snapshot(value:string) {const state=JSON.parse(value) as SessionFinance;return <dl className="finance-snapshot"><dt>Valor</dt><dd>{money.format(Number(state.financialAmount))}</dd><dt>Situação</dt><dd>{paymentLabels[state.paymentStatus]}</dd><dt>Pagamento</dt><dd>{state.paymentDate?.split("-").reverse().join("/") || "—"}</dd><dt>Forma</dt><dd>{state.paymentMethod ? methodLabels[state.paymentMethod] : "—"}</dd><dt>Observação</dt><dd>{state.financialNotes || "—"}</dd></dl>;}
  return <div className="modal-backdrop"><section className="modal finance-history-modal" role="dialog" aria-modal="true" aria-labelledby="finance-history-title"><div className="modal-head"><h2 id="finance-history-title">Histórico financeiro</h2><button type="button" onClick={close} aria-label="Fechar">×</button></div><p>{date(item.startsAt, timezone)} · {item.patientName}</p>
    {error ? <p className="error" role="alert">{error}</p> : entries === null ? <p>Carregando histórico…</p> : !entries.length ? <p>Nenhuma alteração registrada. O histórico começa após a ativação desta funcionalidade.</p> : <div className="finance-history-list">{entries.map(entry=><article key={entry.id}><header><strong>{entry.actorName}</strong><small>{new Date(entry.changedAt).toLocaleString("pt-BR",{timeZone:timezone})}</small></header><div className="finance-history-states"><section><h3>Antes</h3>{snapshot(entry.beforeState)}</section><section><h3>Depois</h3>{snapshot(entry.afterState)}</section></div></article>)}</div>}
    <div className="form-actions"><button type="button" className="primary" onClick={close}>Fechar</button></div>
  </section></div>;
}
export function FinanceModal({item, timezone, close, save}: {item: Appointment; timezone: string; close: () => void; save: (data: SessionFinance) => Promise<void>}) {
  const [status, setStatus] = useState<PaymentStatus>(item.paymentStatus ?? "PENDING"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [notes,setNotes] = useState(item.financialNotes ?? "");
  const [method,setMethod] = useState<PaymentMethod | "">(item.paymentMethod ?? "");
  const [paymentDate, setPaymentDate] = useState(() => {
    if (item.paymentDate) return item.paymentDate;
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(new Date()).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await save({financialAmount: Number(form.get("amount")), paymentStatus: status, paymentDate: status === "PAID" ? String(form.get("paymentDate")) : null, financialNotes: notes || null, paymentMethod: status === "PAID" ? method || null : null}); }
    catch(e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o lançamento"); setBusy(false); }
  }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="finance-title"><div className="modal-head"><h2 id="finance-title">Editar lançamento financeiro</h2><button type="button" disabled={busy} onClick={close} aria-label="Fechar">×</button></div><form className="form-grid" onSubmit={submit}>
    <p className="span">{date(item.startsAt, timezone)} · {item.patientName}</p>
    <label>Valor (R$)<input name="amount" type="number" min="0" max="99999999.99" step="0.01" required defaultValue={item.financialAmount} /></label>
    <label>Situação<select value={status} onChange={e => setStatus(e.target.value as PaymentStatus)}>{(Object.keys(paymentLabels) as PaymentStatus[]).filter(value => item.status !== "CANCELED" || value === "CANCELED" || value === "EXEMPT").map(value => <option key={value} value={value}>{paymentLabels[value]}</option>)}</select></label>
    {status === "PAID" && <label className="span">Data de pagamento<input name="paymentDate" type="date" required value={paymentDate} onChange={event => setPaymentDate(event.target.value)} /></label>}
    {status === "PAID" && <label className="span">Forma de pagamento<select name="paymentMethod" value={method} onChange={e => setMethod(e.target.value as PaymentMethod | "")}><option value="">Não informada</option>{(Object.keys(methodLabels) as PaymentMethod[]).map(value=><option key={value} value={value}>{methodLabels[value]}</option>)}</select></label>}
    <label className="span">Observação<textarea name="financialNotes" maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} aria-describedby="finance-notes-count" /><small id="finance-notes-count">{notes.length}/500 caracteres</small></label>
    {error && <p className="error span" role="alert">{error}</p>}
    <div className="form-actions span"><button type="button" disabled={busy} onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy ? "Salvando…" : "Salvar lançamento"}</button></div>
  </form></section></div>;
}
