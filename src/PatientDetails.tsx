import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, type Appointment, type Patient, type Session } from "./api";
import "./PatientDetails.css";

const labels = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELED: "Cancelada",
  NO_SHOW: "Não compareceu",
};
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
export function PatientDetails({
  session,
  patient,
  back,
  newSession,
  edit,
  toggleActive,
}: {
  session: Session;
  patient: Patient;
  back: () => void;
  newSession: () => void;
  edit: () => void;
  toggleActive: () => Promise<void>;
}) {
  const [items, setItems] = useState<Appointment[]>([]),
    [error, setError] = useState(""),
    [editingSession, setEditingSession] = useState<Appointment | null>(null),
    [viewingSession, setViewingSession] = useState<Appointment | null>(null);
  const loadSessions = useCallback(async () => {
    const now = new Date(),
      start = new Date(now),
      end = new Date(now);
    start.setMonth(start.getMonth() - 6);
    end.setMonth(end.getMonth() + 6);
    try {
      const all = await api.sessions(session, start.toISOString(), end.toISOString());
      setItems(all.filter((item) => item.patientId === patient.id));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar as sessões");
    }
  }, [session, patient.id]);
  useEffect(() => { void loadSessions(); }, [loadSessions]);
  const { history, next, completed } = useMemo(() => {
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
        );
    return { history, next, completed: history.filter((item) => item.status === "COMPLETED") };
  }, [items]);
  return (
    <section className="patient-detail">
      <button className="back-link" onClick={back}>
        ‹ Voltar para pacientes
      </button>
      <div className="patient-detail-head">
        <div>
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
                onClick={() => {
                  if (window.confirm(`Desativar ${patient.fullName}?`))
                    void toggleActive();
                }}
              >
                Desativar
              </button>
            </>
          ) : (
            <button className="primary" onClick={() => void toggleActive()}>
              Ativar paciente
            </button>
          )}
        </div>
      </div>
      {error && <div className="error banner">{error}</div>}
      <div className="patient-summary">
        <Stat
          label="Sessões realizadas"
          value={String(completed.length)}
          detail="atendimentos concluídos"
        />
        <Stat
          label="Próxima sessão"
          value={next[0] ? date(next[0].startsAt) : "—"}
          detail={next[0] ? labels[next[0].status] : "Nenhuma agendada"}
        />
        <Stat
          label="Última sessão realizada"
          value={completed[0] ? date(completed[0].startsAt) : "—"}
          detail={completed[0] ? "Realizada" : "Nenhuma realizada"}
        />
      </div>
      <div className="patient-session-grid">
        <SessionList
          title="Próximas sessões"
          empty="Nenhuma sessão agendada."
          items={next}
          onSelect={setViewingSession}
        />
        <SessionList
          title="Histórico de sessões"
          empty="Nenhuma sessão registrada."
          items={history}
          onSelect={patient.active ? setEditingSession : undefined}
        />
      </div>
      {editingSession && (
        <SessionStatusModal
          item={editingSession}
          close={() => setEditingSession(null)}
          save={async (status) => {
            await api.updateSession(session, editingSession.id, {
              patientId: editingSession.patientId,
              startsAt: editingSession.startsAt,
              endsAt: editingSession.endsAt,
              modality: editingSession.modality,
              meetingLink: editingSession.meetingLink,
              notes: editingSession.notes,
              status,
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
  save: (status: Appointment["status"]) => Promise<void>;
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
    try { await save(status); }
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
          <option value="CANCELED">Cancelada</option>
        </select>
      </label>
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
function SessionList({
  title,
  items,
  empty,
  onSelect,
}: {
  title: string;
  items: Appointment[];
  empty: string;
  onSelect?: (item: Appointment) => void;
}) {
  return (
    <article className="patient-session-list">
      <header>
        <span className="eyebrow">{title}</span>
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
        <p>{empty}</p>
      )}
    </article>
  );
}
