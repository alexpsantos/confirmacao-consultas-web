import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  api,
  type AuditLog,
  type Appointment,
  type Patient,
  type Professional,
  type Session,
  type User,
} from "./api";
import {
  AdminPatients,
  AdminProfessionals,
  PatientEditor,
} from "./AdminTables";
import { SessionsView } from "./Sessions";
import { PatientDetails } from "./PatientDetails";
import "./App.css";
import "./Profile.css";
import "./OverviewSessions.css";
const STORAGE = "confirma.session.v2";
const TIMEZONES = [
  ["America/Noronha", "Fernando de Noronha (UTC-2)"],
  ["America/Belem", "Belém (UTC-3)"],
  ["America/Fortaleza", "Fortaleza (UTC-3)"],
  ["America/Recife", "Recife (UTC-3)"],
  ["America/Bahia", "Salvador (UTC-3)"],
  ["America/Sao_Paulo", "Brasília (UTC-3)"],
  ["America/Campo_Grande", "Campo Grande (UTC-4)"],
  ["America/Cuiaba", "Cuiabá (UTC-4)"],
  ["America/Manaus", "Manaus (UTC-4)"],
  ["America/Porto_Velho", "Porto Velho (UTC-4)"],
  ["America/Boa_Vista", "Boa Vista (UTC-4)"],
  ["America/Rio_Branco", "Rio Branco (UTC-5)"],
] as const;
function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
}
type View =
  | "overview"
  | "profile"
  | "patients"
  | "patient-detail"
  | "sessions"
  | "professionals"
  | "users"
  | "audit";
function readSession(): Session | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
    return v && (v.role === "ADMIN" || v.role === "PROFESSIONAL") ? v : null;
  } catch {
    return null;
  }
}
export default function App() {
  const [session, setSession] = useState<Session | null>(readSession),
    resetToken = new URLSearchParams(window.location.search).get("reset-token");
  if (!session && resetToken)
    return (
      <ResetPassword
        token={resetToken}
        done={() => {
          window.history.replaceState({}, "", window.location.pathname);
          window.location.reload();
        }}
      />
    );
  if (!session)
    return (
      <Auth
        done={(s) => {
          localStorage.setItem(STORAGE, JSON.stringify(s));
          setSession(s);
        }}
      />
    );
  return (
    <Dashboard
      session={session}
      logout={() => {
        localStorage.removeItem(STORAGE);
        localStorage.removeItem("confirma.session");
        setSession(null);
      }}
    />
  );
}
function Auth({ done }: { done: (s: Session) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login"),
    [authOpen, setAuthOpen] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      if (mode === "forgot") {
        const result = await api.requestPasswordReset(String(f.get("email")));
        setMessage(result.message);
        return;
      }
      if (mode === "register") {
        const timezone = String(f.get("timezone") || browserTimezone()),
          registered = await api.register({
              fullName: f.get("name"),
              email: f.get("email"),
              password: f.get("password"),
              phone: f.get("phone"),
              registrationNumber: f.get("registration") || null,
              timezone,
            });
        done(registered);
      } else {
        done(await api.login(String(f.get("email")), String(f.get("password"))));
      }
    } catch (x) {
      setError(x instanceof Error ? x.message : "Falha na autenticação");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="public-page">
      <header className="public-header">
        <Logo />
        <nav aria-label="Navegação principal">
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#whatsapp">WhatsApp</a>
        </nav>
        <button className="public-login-link" type="button" onClick={() => { setMode("login"); setAuthOpen(true); }}>Entrar</button>
      </header>

      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="eyebrow">AGENDA PARA PROFISSIONAIS</span>
          <h1>Menos tempo organizando. Mais tempo atendendo.</h1>
          <p>Centralize pacientes, sessões e confirmações em uma rotina simples, feita para psicólogos, terapeutas e profissionais que trabalham com horário marcado.</p>
          <div className="public-hero-actions">
            <button className="primary" type="button" onClick={() => { setMode("register"); setAuthOpen(true); }}>Criar minha conta</button>
            <a href="#recursos">Conhecer a plataforma</a>
          </div>
          <ul className="public-benefits" aria-label="Benefícios">
            <li>Agenda clara</li><li>Rotina centralizada</li><li>Sem módulos desnecessários</li>
          </ul>
        </div>

        <div className="product-preview" aria-label="Prévia da plataforma">
          <div className="preview-top"><span /><span /><span /><b>Agenda de hoje</b></div>
          <div className="preview-body">
            <aside><i>C</i><span className="active" /><span /><span /><span /></aside>
            <div className="preview-content">
              <small>TERÇA-FEIRA, 22 DE SETEMBRO</small>
              <h2>Seus próximos atendimentos</h2>
              <div className="preview-stats"><span><b>6</b> consultas</span><span><b>2</b> realizadas</span><span><b>3</b> a confirmar</span></div>
              <div className="preview-appointment"><time>09:00</time><div><b>Marina Oliveira</b><small>Online · Confirmada</small></div><em>Confirmada</em></div>
              <div className="preview-appointment"><time>10:30</time><div><b>Rafael Santos</b><small>Presencial · Aguardando</small></div><em className="waiting">Aguardando</em></div>
              <div className="preview-appointment"><time>14:00</time><div><b>Carla Mendes</b><small>Online · Confirmada</small></div><em>Confirmada</em></div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section" id="recursos">
        <div className="section-heading"><span className="eyebrow">O ESSENCIAL, BEM FEITO</span><h2>Tudo o que você precisa para conduzir o dia</h2><p>Informação importante à vista e poucos cliques para agir.</p></div>
        <div className="feature-grid">
          <article><span>01</span><h3>Agenda organizada</h3><p>Visualize o dia e a semana, horários disponíveis e o status de cada sessão.</p></article>
          <article><span>02</span><h3>Pacientes centralizados</h3><p>Cadastre contatos, preferências de lembrete e consulte o histórico de sessões.</p></article>
          <article><span>03</span><h3>Pendências visíveis</h3><p>Saiba quais atendimentos ainda precisam ter o resultado atualizado.</p></article>
        </div>
      </section>

      <section className="workflow-section" id="como-funciona">
        <div><span className="eyebrow">ROTINA SIMPLES</span><h2>Da agenda ao acompanhamento, sem complicação.</h2></div>
        <ol><li><b>Cadastre o paciente</b><span>Guarde somente os dados necessários para o atendimento.</span></li><li><b>Agende a sessão</b><span>Escolha horário, duração e modalidade.</span></li><li><b>Acompanhe o resultado</b><span>Registre se a sessão foi realizada, cancelada ou não houve comparecimento.</span></li></ol>
      </section>

      <section className="whatsapp-section" id="whatsapp">
        <div className="whatsapp-mark">WA</div>
        <div><span className="eyebrow">PRÓXIMO PASSO</span><h2>Confirmações pelo WhatsApp</h2><p>A estrutura de acompanhamento já está preparada. O envio e as respostas automáticas serão disponibilizados com a integração oficial, sem simular mensagens enquanto ela não estiver ativa.</p></div>
        <span className="coming-soon">Em desenvolvimento</span>
      </section>

      <section className="public-cta">
        <div><span className="eyebrow">COMECE AGORA</span><h2>Sua agenda mais tranquila começa aqui.</h2></div>
        <button className="primary" type="button" onClick={() => { setMode("register"); setAuthOpen(true); }}>Criar minha conta profissional</button>
      </section>
      {authOpen && <div className="auth-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
        <section className="login-panel auth-modal" role="dialog" aria-modal="true" aria-label={mode === "register" ? "Criar conta" : "Entrar"}>
        <button className="auth-modal-close" type="button" aria-label="Fechar" onClick={() => setAuthOpen(false)}>×</button>
        <form className="login-card" onSubmit={submit}>
          <span className="mobile-brand">Confirma</span>
          <span className="eyebrow">
            {mode === "register"
              ? "NOVO PROFISSIONAL"
              : mode === "forgot"
                ? "RECUPERAÇÃO"
                : "ACESSO"}
          </span>
          <h2>
            {mode === "register"
              ? "Criar minha conta profissional"
              : mode === "forgot"
                ? "Recuperar senha"
                : "Bem-vindo de volta"}
          </h2>
          {mode === "register" && (
            <>
              <label>
                Nome completo
                <input name="name" required maxLength={150} />
              </label>
              <label>
                Telefone
                <input name="phone" maxLength={30} />
              </label>
              <label>
                Registro profissional (opcional)
                <input name="registration" maxLength={50} />
              </label>
              <label>
                Fuso horário
                <select name="timezone" defaultValue={browserTimezone()}>
                  {!TIMEZONES.some(([value]) => value === browserTimezone()) && <option value={browserTimezone()}>{browserTimezone()} (detectado)</option>}
                  {TIMEZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </>
          )}
          <label>
            E-mail
            <input name="email" type="email" required />
          </label>
          {mode !== "forgot" && (
            <label>
              Senha
              <input
                name="password"
                type="password"
                minLength={mode === "register" ? 8 : undefined}
                maxLength={72}
                pattern={mode === "register" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+" : undefined}
                title={mode === "register" ? "Use letra maiúscula, minúscula e número" : undefined}
                required
              />
            </label>
          )}
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}
          <button className="primary full" disabled={busy}>
            {busy
              ? "Aguarde…"
              : mode === "register"
                ? "Criar conta"
                : mode === "forgot"
                  ? "Enviar instruções"
                  : "Entrar"}
          </button>
          {mode === "login" && (
            <button
              type="button"
              className="ghost full"
              onClick={() => setMode("forgot")}
            >
              Esqueci minha senha
            </button>
          )}
          <button
            type="button"
            className="ghost full"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Criar minha conta profissional"
              : "Voltar ao login"}
          </button>
        </form>
        </section>
      </div>}
      <footer className="public-footer"><Logo /><span>Organização e simplicidade para sua rotina profissional.</span></footer>
    </main>
  );
}
function Dashboard({
  session,
  logout,
}: {
  session: Session;
  logout: () => void;
}) {
  const admin = session.role === "ADMIN";
  const [view, setView] = useState<View>("overview"),
    [professionals, setProfessionals] = useState<Professional[]>([]),
    [patients, setPatients] = useState<Patient[]>([]),
    [users, setUsers] = useState<User[]>([]),
    [logs, setLogs] = useState<AuditLog[]>([]),
    [error, setError] = useState(""),
    [modal, setModal] = useState(false),
    [changePassword, setChangePassword] = useState(false),
    [loginFailuresLast7Days, setLoginFailuresLast7Days] = useState(0),
    [selectedPatient, setSelectedPatient] = useState<Patient | null>(null),
    [editingPatient, setEditingPatient] = useState<Patient | null>(null),
    [schedulePatientId, setSchedulePatientId] = useState<string | null>(null),
    [scheduleNewSession, setScheduleNewSession] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      if (admin) {
        const [p, pa, u, l, s] = await Promise.all([
          api.adminProfessionals(session),
          api.adminPatients(session),
          api.adminUsers(session),
          api.adminAudit(session),
          api.adminAuditSummary(session),
        ]);
        setProfessionals(p.content);
        setPatients(pa.content);
        setUsers(u.content);
        setLogs(l.content);
        setLoginFailuresLast7Days(s.loginFailuresLast7Days);
      } else {
        const [p, pa] = await Promise.all([
          api.me(session),
          api.patients(session),
        ]);
        setProfessionals([p]);
        setPatients(pa.content);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar");
    }
  }, [admin, session]);
  useEffect(() => {
    void load();
  }, [load]);
  const title: { [K in View]: string } = {
      overview: "Visão geral",
      profile: "Meu perfil",
      patients: "Pacientes",
      "patient-detail": "Paciente",
      sessions: "Sessões",
      professionals: "Profissionais",
      users: "Usuários",
      audit: "Auditoria",
    },
    displayName = admin
      ? session.name
      : (professionals[0]?.fullName ?? session.name);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          <Nav
            text="Visão geral"
            active={view === "overview"}
            go={() => setView("overview")}
          />
          {admin ? (
            <>
              <Nav
                text="Profissionais"
                active={view === "professionals"}
                go={() => setView("professionals")}
              />
              <Nav
                text="Pacientes"
                active={view === "patients" || view === "patient-detail"}
                go={() => {
                  setView("patients");
                }}
              />
              <Nav
                text="Usuários"
                active={view === "users"}
                go={() => setView("users")}
              />
              <Nav
                text="Auditoria"
                active={view === "audit"}
                go={() => setView("audit")}
              />
            </>
          ) : (
            <>
              <Nav
                text="Meu perfil"
                active={view === "profile"}
                go={() => setView("profile")}
              />
              <Nav
                text="Sessões"
                active={view === "sessions"}
                go={() => setView("sessions")}
              />
              <Nav
                text="Pacientes"
                active={view === "patients" || view === "patient-detail"}
                go={() => {
                  setView("patients");
                }}
              />
            </>
          )}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{displayName[0]}</span>
          <div>
            <strong>{displayName}</strong>
            <small>{session.role}</small>
            <button
              className="sidebar-logout"
              onClick={() => setChangePassword(true)}
            >
              Alterar senha
            </button>
            <button className="sidebar-logout" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </aside>
      <main className="content">
        <header>
          <div>
            <span className="eyebrow">
              {admin ? "ADMINISTRAÇÃO" : "PROFISSIONAL"}
            </span>
            <h1>{title[view]}</h1>
          </div>
        </header>
        {error && <div className="error banner">{error}</div>}
        {view === "overview" && (
          <Overview
            session={session}
            admin={admin}
            professionals={professionals}
            patients={patients}
            users={users}
            logs={logs}
            loginFailuresLast7Days={loginFailuresLast7Days}
            go={setView}
            openPatient={(patient) => { setSelectedPatient(patient); setView("patient-detail") }}
            openPatients={() => {
              setView("patients");
            }}
            newPatient={() => setModal(true)}
            newSession={() => { setScheduleNewSession(true); setView("sessions"); }}
          />
        )}{" "}
        {view === "profile" && (
          <Profile item={professionals[0]} session={session} saved={load} />
        )}{" "}
        {view === "sessions" && !admin && (
          <SessionsView session={session} patients={patients} professional={professionals[0]} initialPatientId={schedulePatientId ?? undefined} openNewSession={scheduleNewSession} onInitialPatientHandled={() => { setSchedulePatientId(null); setScheduleNewSession(false); }} />
        )}{" "}
        {view === "patient-detail" && selectedPatient && !admin && <PatientDetails session={session} patient={selectedPatient} back={() => setView("patients")} edit={() => setEditingPatient(selectedPatient)} toggleActive={async () => { await api.togglePatient(session, selectedPatient); setSelectedPatient({...selectedPatient, active: !selectedPatient.active}); await load() }} newSession={() => { setSchedulePatientId(selectedPatient.id); setView("sessions") }} />}{" "}
        {view === "patients" &&
          (admin ? (
            <AdminPatients
              data={patients}
              session={session}
              reload={load}
            />
          ) : (
            <Patients
              data={patients}
              canEdit
              reload={load}
              add={() => setModal(true)}
              toggle={async (p) => {
                await api.togglePatient(session, p);
                await load();
              }}
              open={(p) => { setSelectedPatient(p); setView("patient-detail") }}
            />
          ))}
        {view === "professionals" && (
          <AdminProfessionals
            data={professionals}
            patients={patients}
            session={session}
            reload={load}
          />
        )}{" "}
        {view === "users" && (
          <Users
            data={users}
            current={session.userId}
            toggle={async (u) => {
              await api.toggleUser(session, u);
              await load();
            }}
          />
        )}
        {view === "audit" && <Audit data={logs} />}
      </main>
      {changePassword && (
        <ChangePasswordModal
          session={session}
          close={() => setChangePassword(false)}
          done={logout}
        />
      )}{" "}
      {editingPatient && (
        <PatientEditor
          item={editingPatient}
          close={() => setEditingPatient(null)}
          save={async (data) => {
            const updated = await api.updatePatient(session, editingPatient, data);
            setSelectedPatient(updated);
            setEditingPatient(null);
            await load();
          }}
          toggleActive={async () => {
            await api.togglePatient(session, editingPatient);
            setSelectedPatient({...editingPatient, active: !editingPatient.active});
            setEditingPatient(null);
            await load();
          }}
        />
      )}{" "}
      {modal && (
        <PatientModal
          close={() => setModal(false)}
          save={async (d) => {
            await api.createPatient(session, d);
            setModal(false);
            await load();
          }}
        />
      )}
    </div>
  );
}
function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">C</span>
      <b>Confirma</b>
    </div>
  );
}
function Nav({
  text,
  active,
  go,
}: {
  text: string;
  active: boolean;
  go: () => void;
}) {
  return (
    <button className={`nav ${active ? "active" : ""}`} onClick={go}>
      <span>◉</span>
      {text}
    </button>
  );
}
function Overview({
  session,
  admin,
  professionals,
  patients,
  users,
  logs,
  loginFailuresLast7Days,
  go,
  openPatient,
  openPatients,
  newPatient,
  newSession,
}: {
  session: Session;
  admin: boolean;
  professionals: Professional[];
  patients: Patient[];
  users: User[];
  logs: AuditLog[];
  loginFailuresLast7Days: number;
  go: (view: View) => void;
  openPatient: (patient: Patient) => void;
  openPatients: () => void;
  newPatient: () => void;
  newSession: () => void;
}) {
  const inactiveProfessionals = professionals.filter((p) => !p.active).length,
    inactivePatients = patients.filter((p) => !p.active).length;
  return (
    <>
      {admin && <section className="stats">
        <Card
          label="Profissionais"
          value={professionals.length}
          detail={`${professionals.filter((p) => p.active).length} ativos · ${inactiveProfessionals} inativos`}
          go={() => go(admin ? "professionals" : "profile")}
        />
        <Card
          label="Pacientes"
          value={patients.length}
          detail={`${patients.filter((p) => p.active).length} ativos · ${inactivePatients} inativos`}
          go={openPatients}
        />
        <Card
          label="Usuários"
          value={users.length}
          detail={`${users.filter((u) => u.active).length} acessos ativos`}
          go={() => go("users")}
        />
      </section>}
      {!admin && <ProfessionalOverview session={session} patients={patients} openPatient={openPatient} go={() => go("sessions")} newPatient={newPatient} newSession={newSession} />}
      {admin && <section className="overview-grid">
        <article className="welcome operational">
          <div>
            <span className="eyebrow">ATENÇÃO</span>
            <h2>Resumo operacional</h2>
            <ul>
              {admin && (
                <>
                  <li>
                    <button onClick={() => go("professionals")}>
                      {inactiveProfessionals} profissional(is) inativo(s)
                    </button>
                  </li>
                  <li>
                    <button onClick={() => go("audit")}>
                      {loginFailuresLast7Days} falha(s) de login nos últimos 7
                      dias
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </article>
        {admin && (
          <article className="recent-activity">
            <span className="eyebrow">ATIVIDADE RECENTE</span>
            <h2>Últimos eventos</h2>
            {logs.slice(0, 5).map((log) => (
              <button key={log.id} onClick={() => go("audit")}>
                <strong>{log.action}</strong>
                <small>
                  {log.actorName} ·{" "}
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </small>
              </button>
            ))}
            {!logs.length && <p>Nenhuma atividade registrada.</p>}
          </article>
        )}
      </section>}
    </>
  );
}
function ProfessionalOverview({ session, patients, openPatient, go, newPatient, newSession }: {
  session: Session;
  patients: Patient[];
  openPatient: (patient: Patient) => void;
  go: () => void;
  newPatient: () => void;
  newSession: () => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visiblePending, setVisiblePending] = useState(5);
  const [visibleUpcoming, setVisibleUpcoming] = useState(3);
  const [selectedUpcoming, setSelectedUpcoming] = useState<Appointment | null>(null);
  const [selectedPending, setSelectedPending] = useState<Appointment | null>(null);
  const [updatingPending, setUpdatingPending] = useState(false);
  const [pendingError, setPendingError] = useState("");
  useEffect(() => {
    let active = true;
    const start = new Date(0), end = new Date();
    end.setFullYear(end.getFullYear() + 100);
    api.sessions(session, start.toISOString(), end.toISOString())
      .then(items => { if (active) setAppointments(items); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Falha ao carregar as sessões"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);
  const now = Date.now();
  const upcoming = appointments
    .filter(item => (item.status === "SCHEDULED" || item.status === "CONFIRMED") && new Date(item.startsAt).getTime() > now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const pending = appointments
    .filter(item => (item.status === "SCHEDULED" || item.status === "CONFIRMED") && new Date(item.endsAt).getTime() < now)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const today = new Date().toDateString();
  const todaySessions = appointments.filter(item => new Date(item.startsAt).toDateString() === today).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const todayCompleted = todaySessions.filter(item => item.status === "COMPLETED").length;
  const todayCanceled = todaySessions.filter(item => item.status === "CANCELED").length;
  const todayUpcoming = todaySessions.filter(item => (item.status === "SCHEDULED" || item.status === "CONFIRMED") && new Date(item.startsAt).getTime() > now).length;
  const todayNoShow = todaySessions.filter(item => item.status === "NO_SHOW").length;
  const todayPending = todaySessions.filter(item => (item.status === "SCHEDULED" || item.status === "CONFIRMED") && new Date(item.endsAt).getTime() <= now).length;
  const todayInProgress = todaySessions.filter(item => (item.status === "SCHEDULED" || item.status === "CONFIRMED") && new Date(item.startsAt).getTime() <= now && new Date(item.endsAt).getTime() > now).length;
  const awaitingConfirmation = upcoming.filter(item => item.status === "SCHEDULED").length;
  const confirmedUpcoming = upcoming.filter(item => item.status === "CONFIRMED").length;
  const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
  async function updatePendingStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPending) return;
    setUpdatingPending(true); setPendingError("");
    const form = new FormData(event.currentTarget);
    try {
      const updated = await api.updateSessionResult(session, selectedPending.id, {
        status: form.get("status"),
        notes: form.get("notes") || null,
      });
      setAppointments(items => items.map(item => item.id === updated.id ? updated : item));
      setSelectedPending(null);
    } catch (e) { setPendingError(e instanceof Error ? e.message : "Não foi possível atualizar a sessão"); }
    finally { setUpdatingPending(false); }
  }
  return <section className="professional-overview">
    <div className="overview-welcome-row">
      <div><span className="eyebrow">SEU DIA</span><h2>Agenda organizada, atendimento tranquilo.</h2><p>Acompanhe as sessões e resolva o que precisa de atenção.</p></div>
      <div className="overview-quick-actions">
        <button className="primary" onClick={newSession}>＋ Novo agendamento</button>
        <button className="ghost bordered" onClick={newPatient}>＋ Cadastrar paciente</button>
      </div>
    </div>
    {error && <div className="error banner">{error}</div>}
    <div className="overview-kpis" aria-label="Resumo da agenda">
      <article><span>Consultas hoje</span><strong>{loading ? "—" : todaySessions.length}</strong><small>{todayUpcoming} ainda por atender</small></article>
      <article><span>Confirmadas</span><strong>{loading ? "—" : confirmedUpcoming}</strong><small>próximas consultas</small></article>
      <article><span>Aguardando confirmação</span><strong>{loading ? "—" : awaitingConfirmation}</strong><small>status agendado</small></article>
      <article className={pending.length ? "attention" : ""}><span>Resultados pendentes</span><strong>{loading ? "—" : pending.length}</strong><small>todo o período</small></article>
    </div>
    <div className="overview-main-grid">
      <article className="overview-day-card">
        <div className="overview-card-head"><div><span className="eyebrow">AGENDA DE HOJE</span><h2>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h2></div><button className="link" onClick={go}>Ver agenda semanal ›</button></div>
        <div className="overview-day-summary"><span>{todayCompleted} realizadas</span><span>{todayCanceled} canceladas</span>{todayNoShow > 0 && <span>{todayNoShow} não compareceram</span>}{todayPending > 0 && <span>{todayPending} aguardando resultado</span>}{todayInProgress > 0 && <span>{todayInProgress} em andamento</span>}</div>
        <div className="overview-day-list">
          {todaySessions.length ? todaySessions.map(item => <button key={item.id} onClick={() => new Date(item.endsAt).getTime() < now && (item.status === "SCHEDULED" || item.status === "CONFIRMED") ? setSelectedPending(item) : setSelectedUpcoming(item)}>
            <time>{new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><span><strong>{item.patientName}</strong><small>{item.modality === "ONLINE" ? "Online" : "Presencial"}</small></span><i className={`overview-status ${item.status.toLowerCase()}`}>{item.status === "SCHEDULED" ? "Agendada" : item.status === "CONFIRMED" ? "Confirmada" : item.status === "COMPLETED" ? "Realizada" : item.status === "CANCELED" ? "Cancelada" : "Não compareceu"}</i>
          </button>) : <div className="overview-empty"><strong>Agenda livre hoje</strong><span>Use a agenda semanal para escolher um horário disponível.</span><button className="link" onClick={newSession}>Criar agendamento</button></div>}
        </div>
      </article>
      <aside className="overview-confirmations">
        <div className="overview-card-head"><div><span className="eyebrow">CONFIRMAÇÕES</span><h2>WhatsApp</h2></div><span className="future-badge">Em preparação</span></div>
        <p>Os estados abaixo usam os dados reais da agenda. O envio e a resposta automática serão ativados na integração.</p>
        <dl><div><dt>Aguardando confirmação</dt><dd>{awaitingConfirmation}</dd></div><div><dt>Confirmadas</dt><dd>{confirmedUpcoming}</dd></div><div><dt>Canceladas hoje</dt><dd>{todayCanceled}</dd></div><div><dt>Reagendamento solicitado</dt><dd>—</dd></div></dl>
        <small>Reagendamento solicitado ainda não existe no contrato atual da API.</small>
      </aside>
    </div>
    <div className="overview-lower-grid">
      <article className="overview-pending-list"><div className="overview-pending-head"><div><span className="eyebrow">PRÓXIMAS CONSULTAS</span><h2>Próximos atendimentos</h2></div><button className="link" onClick={go}>Abrir agenda</button></div>
        {upcoming.length ? upcoming.slice(0, visibleUpcoming).map(item => <button key={item.id} onClick={() => setSelectedUpcoming(item)}><strong>{item.patientName}</strong><span>{dateTime(item.startsAt)} · {item.modality === "ONLINE" ? "Online" : "Presencial"}</span><b className={`overview-status ${item.status.toLowerCase()}`}>{item.status === "CONFIRMED" ? "Confirmada" : "Aguardando"}</b></button>) : <p>{loading ? "Carregando sessões…" : "Nenhuma sessão agendada."}</p>}
        {upcoming.length > 3 && <div className="overview-pending-footer"><span>Mostrando {Math.min(visibleUpcoming, upcoming.length)} de {upcoming.length}</span>{visibleUpcoming < upcoming.length ? <button type="button" className="link" onClick={() => setVisibleUpcoming(count => count + 3)}>Ver mais {Math.min(3, upcoming.length - visibleUpcoming)}</button> : <button type="button" className="link" onClick={() => setVisibleUpcoming(3)}>Mostrar menos</button>}</div>}
      </article>
      <article className="overview-pending-list"><div className="overview-pending-head"><div><span className="eyebrow">ATENÇÃO</span><h2>Atualizar resultados</h2></div><small>{pending.length} pendente(s)</small></div>
        {pending.length ? pending.slice(0, visiblePending).map(item => <button key={item.id} onClick={() => { setPendingError(""); setSelectedPending(item); }}><strong>{item.patientName}</strong><span>{dateTime(item.startsAt)}</span><b>Atualizar ›</b></button>) : <p>{loading ? "Carregando sessões…" : "Tudo atualizado por aqui."}</p>}
        {pending.length > 5 && <div className="overview-pending-footer"><span>Mostrando {Math.min(visiblePending, pending.length)} de {pending.length}</span>{visiblePending < pending.length ? <button type="button" className="link" onClick={() => setVisiblePending(count => count + 5)}>Ver mais {Math.min(5, pending.length - visiblePending)}</button> : <button type="button" className="link" onClick={() => setVisiblePending(5)}>Mostrar menos</button>}</div>}
      </article>
    </div>
    {selectedUpcoming && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="upcoming-session-title">
      <div className="modal-head"><h2 id="upcoming-session-title">Detalhes da sessão</h2><button type="button" onClick={() => setSelectedUpcoming(null)} aria-label="Fechar">×</button></div>
      <div className="overview-session-details">
        <dl>
          <div><dt>Paciente</dt><dd>{selectedUpcoming.patientName}</dd></div>
          <div><dt>Início</dt><dd>{dateTime(selectedUpcoming.startsAt)}</dd></div>
          <div><dt>Término</dt><dd>{dateTime(selectedUpcoming.endsAt)}</dd></div>
          <div><dt>Modalidade</dt><dd>{selectedUpcoming.modality === "ONLINE" ? "Online" : "Presencial"}</dd></div>
          <div><dt>Status</dt><dd>{selectedUpcoming.status === "CONFIRMED" ? "Confirmada" : "Agendada"}</dd></div>
          {selectedUpcoming.meetingLink && <div><dt>Link da sessão</dt><dd><a href={selectedUpcoming.meetingLink} target="_blank" rel="noreferrer">Abrir link</a></dd></div>}
          {selectedUpcoming.notes && <div><dt>Observação</dt><dd>{selectedUpcoming.notes}</dd></div>}
        </dl>
        <div className="form-actions"><button type="button" className="ghost" onClick={() => setSelectedUpcoming(null)}>Fechar</button><button type="button" className="primary" onClick={() => { const patient = patients.find(p => p.id === selectedUpcoming.patientId); if (patient) { setSelectedUpcoming(null); openPatient(patient); } }} disabled={!patients.some(p => p.id === selectedUpcoming.patientId)}>Ver paciente</button></div>
      </div>
    </section></div>}
    {selectedPending && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="pending-session-title">
      <div className="modal-head"><h2 id="pending-session-title">Atualizar resultado</h2><button type="button" onClick={() => setSelectedPending(null)} aria-label="Fechar">×</button></div>
      <form className="overview-status-form" onSubmit={updatePendingStatus}>
        <p><strong>{selectedPending.patientName}</strong><br /><span>{dateTime(selectedPending.startsAt)} · {selectedPending.modality === "ONLINE" ? "Online" : "Presencial"}</span></p>
        <label>Status da sessão<select name="status" defaultValue="COMPLETED"><option value="COMPLETED">Realizada</option><option value="NO_SHOW">Não compareceu</option><option value="CANCELED">Cancelada</option></select></label>
        <label>Observação <small>(opcional)</small><input name="notes" defaultValue={selectedPending.notes ?? ""} maxLength={500} /></label>
        {pendingError && <div className="error">{pendingError}</div>}
        <div className="form-actions"><button type="button" className="ghost" onClick={() => { const patient = patients.find(p => p.id === selectedPending.patientId); if (patient) { setSelectedPending(null); openPatient(patient); } }} disabled={!patients.some(p => p.id === selectedPending.patientId)}>Ver paciente</button><button className="primary" disabled={updatingPending}>{updatingPending ? "Salvando…" : "Salvar status"}</button></div>
      </form>
    </section></div>}
  </section>;
}
function Card({
  label,
  value,
  detail,
  go,
}: {
  label: string;
  value: number;
  detail: string;
  go: () => void;
}) {
  return (
    <button className="dashboard-card" onClick={go}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}
function Profile({
  item,
  session,
  saved,
}: {
  item?: Professional;
  session: Session;
  saved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"details" | "preferences" | "billing">("details");
  if (!item)
    return (
      <section className="panel">
        <div className="empty">Carregando perfil…</div>
      </section>
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api.updateMe(session, {
        fullName: f.get("fullName") ?? item.fullName,
        email: f.get("email") ?? item.email,
        phone: f.get("phone") ?? item.phone,
        registrationNumber: f.get("registrationNumber") ?? item.registrationNumber,
        specialty: f.get("specialty") ?? item.specialty ?? null,
        displayName: item.displayName ?? null,
        timezone: f.get("timezone") ?? item.timezone ?? "America/Sao_Paulo",
        defaultSessionMinutes: Number(f.get("defaultSessionMinutes") ?? item.defaultSessionMinutes ?? 60),
        defaultModality: f.get("defaultModality") ?? item.defaultModality ?? "PRESENTIAL",
        remindersEnabled: f.get("remindersEnabled") === "true" || (f.get("remindersEnabled") === null && item.remindersEnabled !== false),
      });
      await saved();
      setEditing(false);
    } catch (x) {
      setError(
        x instanceof Error ? x.message : "Não foi possível atualizar o perfil",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel profile-panel">
      <div className="profile-heading">
        <div>
          <span className="eyebrow">DADOS PROFISSIONAIS</span>
          <h2>{item.fullName}</h2>
          <p>Dados do seu trabalho, agenda e conta.</p>
        </div>
        {!editing && (
          <button className="primary" onClick={() => setEditing(true)}>
            Editar perfil
          </button>
        )}
      </div>
      <div className="profile-tabs" role="tablist"><button className={tab === "details" ? "active" : ""} onClick={() => { setTab("details"); setEditing(false); }}>Dados profissionais</button><button className={tab === "preferences" ? "active" : ""} onClick={() => { setTab("preferences"); setEditing(false); }}>Preferências</button><button className={tab === "billing" ? "active" : ""} onClick={() => { setTab("billing"); setEditing(false); }}>Assinatura e cobrança</button></div>
      {tab === "billing" ? <div className="billing-panel"><span className="eyebrow">ASSINATURA</span><h3>Plano e cobrança</h3><p>A cobrança ainda não está configurada. Quando o pagamento for integrado, esta área mostrará o plano, a próxima renovação e os recibos.</p><div className="billing-status"><strong>Sem assinatura vinculada</strong><small>Nenhuma cobrança será realizada enquanto não houver um plano contratado.</small></div></div> : editing ? (
        <form className="profile-form" onSubmit={submit}>
          {tab === "details" ? <>
          <label>
            Nome completo
            <input
              name="fullName"
              defaultValue={item.fullName}
              required
              maxLength={150}
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              defaultValue={item.email}
              required
              maxLength={254}
            />
          </label>
          <label>
            Telefone
            <input
              name="phone"
              defaultValue={
                item.phone ? formatPatientPhoneInput(item.phone) : ""
              }
              minLength={13}
              maxLength={14}
              inputMode="numeric"
              pattern="\(\d{2}\)\d{4,5}-\d{4}"
              title="Informe um telefone com DDD"
              placeholder="(11)12345-6789"
              onInput={(event) => {
                event.currentTarget.value = formatPatientPhoneInput(
                  event.currentTarget.value,
                );
              }}
            />
          </label>
          <label>
            Registro profissional
            <input
              name="registrationNumber"
              defaultValue={item.registrationNumber ?? ""}
              maxLength={50}
            />
          </label>
          <label>
            Profissão ou especialidade
            <input name="specialty" defaultValue={item.specialty ?? ""} maxLength={100} placeholder="Ex.: Psicóloga clínica" />
          </label>
          </> : <>
          <label>
            Fuso horário
            <select name="timezone" defaultValue={item.timezone ?? "America/Sao_Paulo"}>
              {!TIMEZONES.some(([value]) => value === item.timezone) && <option value={item.timezone}>{item.timezone}</option>}
              {TIMEZONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Duração padrão da sessão
            <select name="defaultSessionMinutes" defaultValue={String(item.defaultSessionMinutes ?? 60)}>{Array.from({ length: 46 }, (_, index) => 15 + index * 5).map(minutes => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select>
          </label>
          <label>
            Modalidade padrão
            <select name="defaultModality" defaultValue={item.defaultModality ?? "PRESENTIAL"}><option value="PRESENTIAL">Presencial</option><option value="ONLINE">Online</option></select>
          </label>
          <label className="profile-check"><input name="remindersEnabled" type="checkbox" value="true" defaultChecked={item.remindersEnabled !== false} /> Receber lembretes e avisos da agenda</label>
          </>}
          {error && <div className="error profile-span">{error}</div>}
          <div className="profile-actions profile-span">
            <button
              type="button"
              className="ghost"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-details">
          {tab === "details" ? <>
          <div>
            <span>Nome completo</span>
            <strong>{item.fullName}</strong>
          </div>
          <div>
            <span>E-mail</span>
            <strong>{item.email}</strong>
          </div>
          <div>
            <span>Telefone</span>
            <strong>
              {item.phone
                ? formatPatientPhoneInput(item.phone)
                : "Não informado"}
            </strong>
          </div>
          <div>
            <span>Registro profissional</span>
            <strong>{item.registrationNumber || "Não informado"}</strong>
          </div>
          <div>
            <span>Profissão ou especialidade</span>
            <strong>{item.specialty || "Não informado"}</strong>
          </div>
          <div>
            <span>Status</span>
            <Badge v={item.active ? "Ativo" : "Inativo"} />
          </div>
          </> : <>
          <div><span>Fuso horário</span><strong>{item.timezone === "America/Sao_Paulo" ? "Brasília (GMT-3)" : item.timezone}</strong></div>
          <div><span>Duração padrão</span><strong>{item.defaultSessionMinutes ?? 60} minutos</strong></div>
          <div><span>Modalidade padrão</span><strong>{item.defaultModality === "ONLINE" ? "Online" : "Presencial"}</strong></div>
          <div><span>Lembretes e avisos</span><strong>{item.remindersEnabled === false ? "Desativados" : "Ativados"}</strong></div>
          </>}
        </div>
      )}
    </section>
  );
}
function Patients({
  data,
  canEdit,
  add,
  toggle,
  reload,
  open,
}: {
  data: Patient[];
  canEdit: boolean;
  add: () => void;
  toggle: (p: Patient) => void | Promise<void>;
  reload: () => Promise<void>;
  open: (patient: Patient) => void;
}) {
  const [editing, setEditing] = useState<Patient | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("name"),
    [page, setPage] = useState(0),
    currentSession = readSession(),
    pageSize = 10;
  const filtered = data
      .filter((p) => {
        const term = search.trim().toLocaleLowerCase("pt-BR");
        return (
          (!term ||
            [p.fullName, p.email, p.phone].some((value) =>
              value?.toLocaleLowerCase("pt-BR").includes(term),
            )) &&
          (!status || String(p.active) === status)
        );
      })
      .sort((a, b) =>
        sort === "status"
          ? Number(b.active) - Number(a.active)
          : a.fullName.localeCompare(b.fullName, "pt-BR"),
      ),
    pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    safePage = Math.min(page, pages - 1),
    visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }
  async function refresh() {
    await reload();
  }
  return (
    <section className="panel">
      <Panel
        title="Pacientes"
        action={
          canEdit && (
            <button className="primary" onClick={add}>
              + Novo paciente
            </button>
          )
        }
      />
      <div className="list-tools professional-tools">
        <input
          aria-label="Buscar pacientes"
          placeholder="Buscar por nome, e-mail ou telefone"
          value={search}
          onChange={(event) => change(setSearch, event.target.value)}
        />
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) => change(setStatus, event.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select
          aria-label="Ordenar pacientes"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(0);
          }}
        >
          <option value="name">Ordenar por nome</option>
          <option value="status">Ordenar por status</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Telefone</th>
            <th>Status</th><th aria-label="Abrir paciente" />
          </tr>
        </thead>
        <tbody>
          {visible.map((p) => (
            <tr
              key={p.id}
              onClick={() => canEdit && open(p)}
              className={`${p.active ? "" : "inactive-row"} ${canEdit ? "patient-row-clickable" : ""}`}
            >
              <td>
                <strong>{p.fullName}</strong>
                <small>{p.email}</small>
              </td>
              <td>{formatPatientPhoneInput(p.phone)}</td>
              <td>
                <Badge v={p.active ? "Ativo" : "Inativo"} />
              </td>
              <td className="patient-chevron" aria-hidden="true">›</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!visible.length && <Empty text="Nenhum paciente encontrado." />}
      <div className="pagination">
        <span>
          Exibindo {filtered.length ? safePage * pageSize + 1 : 0}–
          {Math.min((safePage + 1) * pageSize, filtered.length)} de{" "}
          {filtered.length}
        </span>
        <div>
          <button
            className="ghost"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            Anterior
          </button>
          <span>
            Página {safePage + 1} de {pages}
          </span>
          <button
            className="ghost"
            disabled={safePage >= pages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
      {editing && currentSession && (
        <PatientEditor
          item={editing}
          close={() => setEditing(null)}
          save={async (d) => {
            await api.updatePatient(currentSession, editing, d);
            setEditing(null);
            await refresh();
          }}
          toggleActive={async () => {
            await toggle(editing);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
export function Users({
  data,
}: {
  data: User[];
  current: string;
  toggle: (u: User) => void;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const filtered = data.filter(user =>
    (!search.trim() || [user.name, user.email].some(value => value.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))) &&
    (!role || user.role === role) && (!status || String(user.active) === status));
  return (
    <section className="panel">
      <Panel title="Usuários da plataforma" />
      <div className="admin-filter-bar"><input aria-label="Buscar usuários" placeholder="Buscar por nome ou e-mail" value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Filtrar por perfil" value={role} onChange={event => setRole(event.target.value)}><option value="">Todos os perfis</option><option value="ADMIN">Administrador</option><option value="PROFESSIONAL">Profissional</option></select><select aria-label="Filtrar por status" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os status</option><option value="true">Ativos</option><option value="false">Inativos</option></select></div>
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                <small>{u.email}</small>
              </td>
              <td>{u.role}</td>
              <td>
                <Badge v={u.active ? "Ativo" : "Inativo"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && <div className="empty">Nenhum usuário encontrado.</div>}
    </section>
  );
}
function Audit({ data }: { data: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const actions = [...new Set(data.map(log => log.action))].sort();
  const filtered = data.filter(log => {
    const local = new Date(log.createdAt);
    const day = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
    return (!search.trim() || [log.actorName, log.actorEmail ?? ""].some(value => value.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))) &&
      (!action || log.action === action) && (!from || day >= from) && (!to || day <= to);
  });
  return (
    <section className="panel">
      <Panel title="Eventos de auditoria" />
      <div className="admin-filter-bar audit-filter-bar"><input aria-label="Buscar autor" placeholder="Buscar autor ou e-mail" value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Filtrar por ação" value={action} onChange={event => setAction(event.target.value)}><option value="">Todas as ações</option>{actions.map(value => <option key={value} value={value}>{value}</option>)}</select><label>De<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Até<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Autor</th>
            <th>Ação</th>
            <th>Recurso</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
              <td>
                <strong>{l.actorName}</strong>
                <small>{l.actorEmail ?? l.actorRole ?? "—"}</small>
              </td>
              <td>{l.action}</td>
              <td>
                {l.resourceType}
                {l.resourceId ? ` · ${l.resourceId}` : ""}
              </td>
              <td>{l.ipAddress || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && <div className="empty">Nenhum evento encontrado.</div>}
    </section>
  );
}
function Panel({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {action}
    </div>
  );
}
function Badge({ v }: { v: string }) {
  const labels: Record<string, string> = {
    GRANTED: "Concedido",
    PENDING: "Pendente",
    REVOKED: "Revogado",
    PROFESSIONAL: "Profissional",
    ADMIN: "Administrador",
  };
  return <span className={`badge ${v.toLowerCase()}`}>{labels[v] ?? v}</span>;
}
function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
function PatientModal({
  close,
  save,
}: {
  close: () => void;
  save: (d: object) => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <h2>Novo paciente</h2>
          <button onClick={close}>×</button>
        </div>
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await save({
                fullName: f.get("name"),
                birthDate: f.get("birth") || null,
                phone: f.get("phone"),
                email: f.get("email") || null,
                preferredChannel: f.get("channel"),
                whatsappRemindersEnabled: f.has("whatsappRemindersEnabled"),
              });
            } catch (x) {
              setError(x instanceof Error ? x.message : "Falha ao salvar");
            }
          }}
        >
          <label className="span">
            Nome
            <input name="name" required maxLength={150} />
          </label>
          <label>
            Data de nascimento
            <input
              name="birth"
              type="date"
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Telefone
            <input
              name="phone"
              required
              minLength={13}
              maxLength={14}
              inputMode="numeric"
              pattern="\(\d{2}\)\d{4,5}-\d{4}"
              title="Informe um telefone com DDD"
              placeholder="(11)12345-6789"
              onInput={(event) => {
                event.currentTarget.value = formatPatientPhoneInput(
                  event.currentTarget.value,
                );
              }}
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              type="email"
              maxLength={254}
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              title="Informe um e-mail completo, como nome@dominio.com"
            />
          </label>
          <label>
            Canal
            <select name="channel">
              <option>WHATSAPP</option>
              <option>EMAIL</option>
            </select>
          </label>
          <label className="span reminder-option"><input type="checkbox" name="whatsappRemindersEnabled" defaultChecked /> Lembretes via WhatsApp</label>
          {error && <div className="error span">{error}</div>}
          <div className="form-actions span">
            <button type="button" className="ghost" onClick={close}>
              Cancelar
            </button>
            <button className="primary">Salvar</button>
          </div>
        </form>
      </section>
    </div>
  );
}
function formatPatientPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length < 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)})${digits.slice(2, split)}-${digits.slice(split)}`;
}
function ResetPassword({ token, done }: { token: string; done: () => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <section className="login-brand">
        <Logo />
        <div className="brand-copy">
          <span className="eyebrow">CONFIRMA</span>
          <h1>Crie uma nova senha.</h1>
        </div>
      </section>
      <section className="login-panel">
        <form
          className="login-card"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget),
              password = String(form.get("password")),
              confirmation = String(form.get("confirmation"));
            if (password !== confirmation) {
              setError("As senhas não coincidem");
              return;
            }
            setBusy(true);
            setError("");
            try {
              await api.confirmPasswordReset(token, password);
              done();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Não foi possível redefinir a senha",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="eyebrow">RECUPERAÇÃO</span>
          <h2>Nova senha</h2>
          <label>
            Nova senha
            <input
              name="password"
              type="password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              name="confirmation"
              type="password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <small>
            A senha deve conter letra maiúscula, minúscula e número.
          </small>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={busy}>
            {busy ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
function ChangePasswordModal({
  session,
  close,
  done,
}: {
  session: Session;
  close: () => void;
  done: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <h2>Alterar senha</h2>
          <button onClick={close}>×</button>
        </div>
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget),
              current = String(form.get("current")),
              next = String(form.get("next")),
              confirmation = String(form.get("confirmation"));
            if (next !== confirmation) {
              setError("As senhas não coincidem");
              return;
            }
            setBusy(true);
            setError("");
            try {
              await api.changePassword(session, current, next);
              done();
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Não foi possível alterar a senha",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="span">
            Senha atual
            <input name="current" type="password" required />
          </label>
          <label>
            Nova senha
            <input
              name="next"
              type="password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              name="confirmation"
              type="password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <small className="span">
            Use letra maiúscula, minúscula e número.
          </small>
          {error && <div className="error span">{error}</div>}
          <div className="form-actions span">
            <button type="button" className="ghost" onClick={close}>
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Alterar senha"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
