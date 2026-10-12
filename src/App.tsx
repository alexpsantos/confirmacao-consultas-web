import {ProfessionalFinance} from "./ProfessionalFinance";
import {dateValue, DEFAULT_TIMEZONE} from "./timezone";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  api,
  API_URL,
  type AuditLog,
  type Appointment,
  type OperationalSummary,
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
import { ProfessionalLocation } from "./ProfessionalLocation";
import "./App.css";
import "./Profile.css";
import "./OverviewSessions.css";
const STORAGE = "confirma.session.v2";
type OperationalPeriod = "7d" | "month" | "30d";
function operationalRange(period: OperationalPeriod) {
  const now = new Date();
  if (period === "month") return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString() };
  const start = new Date(now);
  start.setDate(start.getDate() - (period === "7d" ? 7 : 30));
  return { start: start.toISOString(), end: now.toISOString() };
}
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
  | "finance"
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
    [success, setSuccess] = useState(""),
    [modal, setModal] = useState(false),
    [changePassword, setChangePassword] = useState(false),
    [loginFailuresLast7Days, setLoginFailuresLast7Days] = useState(0),
    [operational, setOperational] = useState<OperationalSummary | null>(null),
    [operationalPeriod, setOperationalPeriod] = useState<OperationalPeriod>("month"),
    [selectedPatient, setSelectedPatient] = useState<Patient | null>(null),
    [editingPatient, setEditingPatient] = useState<Patient | null>(null),
    [schedulePatientId, setSchedulePatientId] = useState<string | null>(null),
    [scheduleNewSession, setScheduleNewSession] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      if (admin) {
        const range = operationalRange(operationalPeriod);
        const [p, pa, u, l, s, operationalSummary] = await Promise.all([
          api.adminProfessionals(session),
          api.adminPatients(session),
          api.adminUsers(session),
          api.adminAudit(session),
          api.adminAuditSummary(session),
          api.adminOperationalSummary(session, range.start, range.end),
        ]);
        setProfessionals(p.content);
        setPatients(pa.content);
        setUsers(u.content);
        setLogs(l.content);
        setLoginFailuresLast7Days(s.loginFailuresLast7Days);
        setOperational(operationalSummary);
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
  }, [admin, session, operationalPeriod]);
  useEffect(() => {
    void load();
  }, [load]);
  const title: { [K in View]: string } = {
      overview: "Visão geral",
      profile: "Meu perfil",
      patients: "Pacientes",
      "patient-detail": "Paciente",
      sessions: "Sessões",
      finance: "Financeiro",
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
              <Nav text="Financeiro" active={view === "finance"} go={() => setView("finance")} />
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
        {error && <div className="error banner" role="alert"><span>{error}</span><button type="button" className="banner-close" onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}
        {success && <div className="success banner" role="status"><span>{success}</span><button type="button" className="banner-close" onClick={() => setSuccess("")} aria-label="Fechar aviso">×</button></div>}
        {view === "overview" && (
          <Overview
            session={session}
            admin={admin}
            professionals={professionals}
            patients={patients}
            logs={logs}
            loginFailuresLast7Days={loginFailuresLast7Days}
            operational={operational}
            operationalPeriod={operationalPeriod}
            setOperationalPeriod={setOperationalPeriod}
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
          <Profile item={professionals[0]} session={session} saved={async () => { await load(); setSuccess("Perfil atualizado com sucesso."); }} />
        )}{" "}
        {view === "finance" && !admin && professionals[0] && <ProfessionalFinance session={session} patients={patients} timezone={professionals[0].timezone} openPatient={patient => {setSelectedPatient(patient);setView("patient-detail");}} />}
        {view === "sessions" && !admin && (
          <SessionsView session={session} patients={patients} professional={professionals[0]} initialPatientId={schedulePatientId ?? undefined} openNewSession={scheduleNewSession} onInitialPatientHandled={() => { setSchedulePatientId(null); setScheduleNewSession(false); }} />
        )}{" "}
        {view === "patient-detail" && selectedPatient && !admin && <PatientDetails session={session} patient={selectedPatient} professional={professionals[0]} back={() => setView("patients")} edit={() => setEditingPatient(selectedPatient)} toggleActive={async () => { const active = !selectedPatient.active; await api.togglePatient(session, selectedPatient); setSelectedPatient({...selectedPatient, active}); await load(); setSuccess(active ? "Paciente ativado com sucesso." : "Paciente desativado com sucesso."); }} newSession={() => { setSchedulePatientId(selectedPatient.id); setView("sessions") }} />}{" "}
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
                setSuccess(p.active ? "Paciente desativado com sucesso." : "Paciente ativado com sucesso.");
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
            setSuccess("Dados do paciente atualizados com sucesso.");
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
            setSuccess("Paciente cadastrado com sucesso.");
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
  logs,
  loginFailuresLast7Days,
  operational,
  operationalPeriod,
  setOperationalPeriod,
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
  logs: AuditLog[];
  loginFailuresLast7Days: number;
  operational: OperationalSummary | null;
  operationalPeriod: OperationalPeriod;
  setOperationalPeriod: (period: OperationalPeriod) => void;
  go: (view: View) => void;
  openPatient: (patient: Patient) => void;
  openPatients: () => void;
  newPatient: () => void;
  newSession: () => void;
}) {
  const inactiveProfessionals = professionals.filter((p) => !p.active).length;
  return (
    <>
      {admin && <><section className="stats four">
        <Card
          label="Profissionais ativos"
          value={operational?.activeProfessionals ?? "—"}
          detail={`${professionals.length} cadastrados`}
          go={() => go(admin ? "professionals" : "profile")}
        />
        <Card
          label="Pacientes ativos"
          value={operational?.activePatients ?? "—"}
          detail={`${patients.length} cadastrados`}
          go={openPatients}
        />
        <Card
          label="Sessões no período"
          value={operational?.sessions ?? "—"}
          detail={operationalPeriod === "month" ? "este mês" : operationalPeriod === "7d" ? "últimos 7 dias" : "últimos 30 dias"}
        />
        <Card
          label="Cancelamentos"
          value={operational?.canceledSessions ?? "—"}
          detail="no período selecionado"
        />
      </section><div className="admin-operational-period"><label>Período dos indicadores<select value={operationalPeriod} onChange={event => setOperationalPeriod(event.target.value as OperationalPeriod)}><option value="month">Este mês</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select></label></div></>}
      {!admin && <ProfessionalOverview timezone={professionals[0]?.timezone ?? DEFAULT_TIMEZONE} session={session} patients={patients} openPatient={openPatient} go={() => go("sessions")} newPatient={newPatient} newSession={newSession} />}
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
function ProfessionalOverview({ timezone, session, patients, openPatient, go, newPatient, newSession }: {
  timezone: string;
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
  const [visibleUpcoming, setVisibleUpcoming] = useState(5);
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
  const today = dateValue(new Date(),timezone);
  const todaySessions = appointments.filter(item => dateValue(item.startsAt,timezone) === today).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const todayUpcoming = todaySessions.filter(item => (item.status === "SCHEDULED" || item.status === "CONFIRMED") && new Date(item.startsAt).getTime() > now).length;
  const todayCanceled = todaySessions.filter(item => item.status === "CANCELED").length;
  const awaitingConfirmation = upcoming.filter(item => item.status === "SCHEDULED").length;
  const confirmedUpcoming = upcoming.filter(item => item.status === "CONFIRMED").length;
  const activePatients = patients.filter(item => item.active).length;
  const firstName = session.name.trim().split(/\s+/)[0] || "";
  const todayLabel = new Date().toLocaleDateString("pt-BR", { timeZone: timezone, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" });
  const sessionDate = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: timezone, weekday: "long", day: "2-digit", month: "short" });
  const sessionDay = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: timezone, day: "2-digit" });
  const sessionMonth = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: timezone, month: "short" }).replace(".", "");
  const sessionTime = (item: Appointment) => `${new Date(item.startsAt).toLocaleTimeString("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })} – ${new Date(item.endsAt).toLocaleTimeString("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}`;
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
      <div><h2>Bom dia, {firstName}!</h2><p>Agenda organizada, atendimento tranquilo.</p></div>
      <time className="overview-current-date"><span>{todayLabel}</span><span aria-hidden="true">☼</span></time>
      <div className="overview-quick-actions">
        <button className="primary" onClick={newSession}>＋ Novo agendamento</button>
        <button className="ghost bordered" onClick={newPatient}>＋ Cadastrar paciente</button>
      </div>
    </div>
    {error && <div className="error banner">{error}</div>}
    <div className="overview-kpis" aria-label="Resumo da agenda">
      <article className="today"><span className="overview-kpi-icon"><OverviewIcon type="calendar" /></span><div><span>Consultas hoje</span><strong>{loading ? "—" : todaySessions.length}</strong><small>{todayUpcoming ? `${todayUpcoming} ainda por atender` : "Ainda por atender"}</small></div></article>
      <article className="patients"><span className="overview-kpi-icon"><OverviewIcon type="patients" /></span><div><span>Pacientes ativos</span><strong>{activePatients}</strong><small>Em acompanhamento</small></div></article>
      <article className="results"><span className="overview-kpi-icon"><OverviewIcon type="document" /></span><div><span>Resultados pendentes</span><strong>{loading ? "—" : pending.length}</strong><small>Aguardando sua revisão</small></div></article>
    </div>
    <div className="overview-main-grid">
      <article className="overview-day-card">
        <div className="overview-card-head overview-agenda-head"><h2><span className="overview-agenda-title-icon" aria-hidden="true"><OverviewIcon type="calendar" /></span>Sua agenda de hoje</h2><button className="link" onClick={go}>Ver agenda semanal ›</button></div>
        <div className="overview-day-list">
          {todaySessions.length ? todaySessions.map(item => <button key={item.id} onClick={() => new Date(item.endsAt).getTime() < now && (item.status === "SCHEDULED" || item.status === "CONFIRMED") ? setSelectedPending(item) : setSelectedUpcoming(item)}>
            <time>{new Date(item.startsAt).toLocaleTimeString("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}</time><span><strong>{item.patientName}</strong><small>{item.modality === "ONLINE" ? "Online" : "Presencial"}</small></span><i className={`overview-status ${item.status.toLowerCase()}`}>{item.status === "SCHEDULED" ? "Agendada" : item.status === "CONFIRMED" ? "Confirmada" : item.status === "COMPLETED" ? "Realizada" : item.status === "CANCELED" ? "Cancelada" : "Não compareceu"}</i>
          </button>) : <div className="overview-empty overview-empty-agenda">
            <span className="overview-empty-calendar" aria-hidden="true"><svg viewBox="0 0 64 64"><rect x="12" y="17" width="40" height="36" rx="5"/><path d="M20 10v13M44 10v13M12 28h40M25 39l6 6 11-12"/><path className="overview-empty-rays" d="M53 16l5-4M56 25h7M51 9l2-6"/></svg></span>
            <strong>Nenhum atendimento agendado para hoje</strong><span>Aproveite para adiantar pendências ou agendar novos pacientes.</span><button className="primary overview-empty-action" onClick={newSession}>＋ Novo agendamento</button>
            <svg className="overview-empty-landscape" viewBox="0 0 800 190" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="overview-wave-back" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fbf8f1"/><stop offset="1" stopColor="#f6eddd"/></linearGradient><linearGradient id="overview-wave-mid" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#f6ebd8"/><stop offset="1" stopColor="#fbf8f0"/></linearGradient></defs>
              <path className="wave-back" d="M0 151c101-25 178-3 259 19 118 32 220-2 327-12 93-9 151 20 214 4v28H0z"/>
              <path className="wave-mid" d="M0 166c98-22 186 2 273 16 111 18 211-8 320-24 85-12 146-10 207 7v25H0z"/>
              <path className="wave-front" d="M0 179c109-13 196 9 286 11 111 3 209-17 316-22 78-4 143 4 198 15v7H0z"/>
            </svg>
          </div>}
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
      <article className="overview-pending-list overview-session-card"><div className="overview-pending-head"><h2><span aria-hidden="true"><OverviewIcon type="calendar" /></span>Próximas sessões</h2><button className="link" onClick={go}>Ver agenda completa ›</button></div>
        {upcoming.length ? upcoming.slice(0, visibleUpcoming).map(item => <button className="overview-session-row" key={item.id} onClick={() => setSelectedUpcoming(item)}><span className="overview-date-tile"><strong>{sessionDay(item.startsAt)}</strong><small>{sessionMonth(item.startsAt)}</small></span><span className="overview-session-copy"><strong>{item.patientName}</strong><small>{sessionDate(item.startsAt)}</small></span><span className="overview-session-meta"><i><SessionClockIcon /></i> {sessionTime(item)} <i><SessionModalityIcon /></i> {item.modality === "ONLINE" ? "Online" : "Presencial"}</span><b className={`overview-status ${item.status.toLowerCase()}`}>{item.status === "CONFIRMED" ? "Confirmada" : "Agendada"}</b><i className="overview-row-menu" aria-hidden="true">⋮</i></button>) : <p>{loading ? "Carregando sessões…" : "Nenhuma sessão agendada."}</p>}
        {upcoming.length > 5 && <div className="overview-pending-footer"><span>Mostrando {Math.min(visibleUpcoming, upcoming.length)} de {upcoming.length}</span>{visibleUpcoming < upcoming.length ? <button type="button" className="link" onClick={() => setVisibleUpcoming(count => count + 5)}>Ver mais {Math.min(5, upcoming.length - visibleUpcoming)}</button> : <button type="button" className="link" onClick={() => setVisibleUpcoming(5)}>Mostrar menos</button>}</div>}
      </article>
      <article className="overview-pending-list overview-session-card"><div className="overview-pending-head"><h2><span aria-hidden="true"><SessionClockIcon /></span>Sessões a atualizar</h2><small>{pending.length} pendente(s)</small></div>
        {pending.length ? pending.slice(0, visiblePending).map(item => <button className="overview-session-row overview-result-row" key={item.id} onClick={() => { setPendingError(""); setSelectedPending(item); }}><span className="overview-date-tile"><strong>{sessionDay(item.startsAt)}</strong><small>{sessionMonth(item.startsAt)}</small></span><span className="overview-session-copy"><strong>{item.patientName}</strong><small>{sessionDate(item.startsAt)}</small></span><span className="overview-session-meta"><i><SessionClockIcon /></i> {sessionTime(item)} <i><SessionModalityIcon /></i> {item.modality === "ONLINE" ? "Online" : "Presencial"}</span><b className="overview-status pending">Aguardando resultado</b><i className="overview-row-menu" aria-hidden="true">⋮</i></button>) : <p>{loading ? "Carregando sessões…" : "Tudo atualizado por aqui."}</p>}
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
        <label>Status da sessão<select name="status" defaultValue="COMPLETED"><option value="COMPLETED">Realizada</option><option value="NO_SHOW">Não compareceu</option></select></label>
        <label>Observação <small>(opcional)</small><input name="notes" defaultValue={selectedPending.notes ?? ""} maxLength={500} /></label>
        {pendingError && <div className="error">{pendingError}</div>}
        <div className="form-actions"><button type="button" className="ghost" onClick={() => { const patient = patients.find(p => p.id === selectedPending.patientId); if (patient) { setSelectedPending(null); openPatient(patient); } }} disabled={!patients.some(p => p.id === selectedPending.patientId)}>Ver paciente</button><button className="primary" disabled={updatingPending}>{updatingPending ? "Salvando…" : "Salvar status"}</button></div>
      </form>
    </section></div>}
  </section>;
}
function OverviewIcon({ type }: { type: "calendar" | "patients" | "document" }) {
  if (type === "calendar") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h5"/></svg>;
  if (type === "patients") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><circle cx="6.5" cy="10.5" r="2.2"/><circle cx="17.5" cy="10.5" r="2.2"/><path d="M5 21v-1a7 7 0 0 1 14 0v1M2.5 20v-.6a4.8 4.8 0 0 1 3.7-4.6M21.5 20v-.6a4.8 4.8 0 0 0-3.7-4.6"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/></svg>;
}
function SessionModalityIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4" width="9" height="8" rx="1.5"/><path d="m10.5 6.5 4-2v7l-4-2"/></svg>;
}
function SessionClockIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.8"/><path d="M8 4.5V8l2.4 1.6"/></svg>;
}
function Card({
  label,
  value,
  detail,
  go,
}: {
  label: string;
  value: number | string;
  detail: string;
  go?: () => void;
}) {
  const content = <>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </>;
  return go ? (
    <button className="dashboard-card" onClick={go}>
      {content}
    </button>
  ) : (
    <article className="dashboard-card">{content}</article>
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
    [tab, setTab] = useState<"details" | "preferences" | "billing">("details"),
    [defaultSessionPrice, setDefaultSessionPrice] = useState("100.00");
  useEffect(() => {
    fetch(`${API_URL}/api/v1/professionals/me/session-price`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ value: number }>; })
      .then(data => setDefaultSessionPrice(String(data.value)))
      .catch(() => setError("Não foi possível carregar o valor padrão da sessão."));
  }, [session.accessToken]);
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
      const price = String(f.get("defaultSessionPrice") ?? defaultSessionPrice).replace(",", ".");
      const priceResponse = await fetch(`${API_URL}/api/v1/professionals/me/session-price`, { method: "PUT", headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ value: Number(price) }) });
      if (!priceResponse.ok) throw new Error("Não foi possível salvar o valor da sessão");
      setDefaultSessionPrice(price);
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
            Valor da sessão
            <input name="defaultSessionPrice" type="number" min="0" step="0.01" defaultValue={defaultSessionPrice} inputMode="decimal" placeholder="0,00" />
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
          <ProfessionalLocation session={session} saved={saved} />
          </> : <>
          <div><span>Fuso horário</span><strong>{item.timezone === "America/Sao_Paulo" ? "Brasília (GMT-3)" : item.timezone}</strong></div>
          <div><span>Duração padrão</span><strong>{item.defaultSessionMinutes ?? 60} minutos</strong></div>
          <div><span>Valor da sessão</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(defaultSessionPrice) || 0)}</strong></div>
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
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const filtered = data.filter(user =>
    (!search.trim() || [user.name, user.email].some(value => value.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))) &&
    (!role || user.role === role) && (!status || String(user.active) === status)
  ).sort((a, b) => sort === "role" ? a.role.localeCompare(b.role) : sort === "status" ? Number(b.active) - Number(a.active) : a.name.localeCompare(b.name, "pt-BR"));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const hasFilters = Boolean(search || role || status || sort !== "name");
  function clearFilters() { setSearch(""); setRole(""); setStatus(""); setSort("name"); setPage(0); }
  function change(setter: (value: string) => void, value: string) { setter(value); setPage(0); }
  return (
    <section className="panel">
      <Panel title={`${filtered.length} ${filtered.length === 1 ? "usuário encontrado" : "usuários encontrados"}`} />
      <div className="admin-filter-bar"><input aria-label="Buscar usuários" placeholder="Buscar por nome ou e-mail" value={search} onChange={event => change(setSearch, event.target.value)} /><select aria-label="Filtrar por perfil" value={role} onChange={event => change(setRole, event.target.value)}><option value="">Todos os perfis</option><option value="ADMIN">Administrador</option><option value="PROFESSIONAL">Profissional</option></select><select aria-label="Filtrar por status" value={status} onChange={event => change(setStatus, event.target.value)}><option value="">Todos os status</option><option value="true">Ativos</option><option value="false">Inativos</option></select><select aria-label="Ordenar usuários" value={sort} onChange={event => change(setSort, event.target.value)}><option value="name">Ordenar por nome</option><option value="role">Ordenar por perfil</option><option value="status">Ordenar por status</option></select>{hasFilters && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}</div>
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((u) => (
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
      {!visible.length && <div className="empty">Nenhum usuário encontrado.</div>}
      {pages > 1 && <div className="pagination"><span>Exibindo {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} de {filtered.length}</span><div><button className="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button><span>Página {safePage + 1} de {pages}</span><button className="ghost" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Próxima</button></div></div>}
    </section>
  );
}
function Audit({ data }: { data: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const pageSize = 10;
  const actions = [...new Set(data.map(log => log.action))].sort();
  const actors = [...new Map(data.map(log => [log.actorUserId ?? "anonymous", { id: log.actorUserId ?? "anonymous", name: log.actorName, email: log.actorEmail }])).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const filtered = data.filter(log => {
    const local = new Date(log.createdAt);
    const day = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
    return (!search.trim() || [log.actorName, log.actorEmail ?? ""].some(value => value.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))) &&
      (!action || log.action === action) && (!actor || (log.actorUserId ?? "anonymous") === actor) && (!from || day >= from) && (!to || day <= to);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const hasFilters = Boolean(search || action || actor || from || to);
  function change(setter: (value: string) => void, value: string) { setter(value); setPage(0); }
  function clearFilters() { setSearch(""); setAction(""); setActor(""); setFrom(""); setTo(""); setPage(0); }
  return (
    <section className="panel">
      <Panel title={`${filtered.length} ${filtered.length === 1 ? "evento encontrado" : "eventos encontrados"}`} />
      <div className="admin-filter-bar audit-filter-bar"><input aria-label="Buscar autor" placeholder="Buscar autor ou e-mail" value={search} onChange={event => change(setSearch, event.target.value)} /><select aria-label="Filtrar por ação" value={action} onChange={event => change(setAction, event.target.value)}><option value="">Todas as ações</option>{actions.map(value => <option key={value} value={value}>{auditActionLabel(value)}</option>)}</select><select aria-label="Filtrar por usuário" value={actor} onChange={event => change(setActor, event.target.value)}><option value="">Todos os usuários</option>{actors.map(value => <option key={value.id} value={value.id}>{value.name}{value.email ? ` · ${value.email}` : ""}</option>)}</select><label>De<input type="date" value={from} onChange={event => change(setFrom, event.target.value)} /></label><label>Até<input type="date" value={to} onChange={event => change(setTo, event.target.value)} /></label>{hasFilters && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}</div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Autor</th>
            <th>Ação</th>
            <th>Recurso</th>
            <th>IP</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visible.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
              <td>
                <strong>{l.actorName}</strong>
                <small>{l.actorEmail ?? l.actorRole ?? "—"}</small>
              </td>
              <td>{auditActionLabel(l.action)}</td>
              <td>
                {l.resourceType}
                {l.resourceId ? ` · ${l.resourceId}` : ""}
              </td>
              <td>{l.ipAddress || "—"}</td>
              <td className="row-actions"><button className="link" onClick={() => setSelected(l)}>Detalhes</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!visible.length && <div className="empty">Nenhum evento encontrado.</div>}
      {pages > 1 && <div className="pagination"><span>Exibindo {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} de {filtered.length}</span><div><button className="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button><span>Página {safePage + 1} de {pages}</span><button className="ghost" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Próxima</button></div></div>}
      {selected && <div className="modal-backdrop"><section className="modal"><div className="modal-head"><h2>Detalhes do evento</h2><button onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button></div><div className="audit-detail"><div><small>Data e horário</small><strong>{new Date(selected.createdAt).toLocaleString("pt-BR")}</strong></div><div><small>Ação</small><strong>{auditActionLabel(selected.action)}</strong></div><div><small>Usuário</small><strong>{selected.actorName}</strong><span>{selected.actorEmail ?? selected.actorRole ?? "Não autenticado"}</span></div><div><small>IP de origem</small><strong>{selected.ipAddress || "Não informado"}</strong></div><div><small>Tipo de recurso</small><strong>{selected.resourceType}</strong></div><div><small>Identificador do recurso</small><strong>{selected.resourceId || "Não informado"}</strong></div></div><div className="form-actions"><button className="ghost" onClick={() => setSelected(null)}>Fechar</button></div></section></div>}
    </section>
  );
}
function auditActionLabel(action: string) { return action.split("_").map(word => word.charAt(0) + word.slice(1).toLocaleLowerCase("pt-BR")).join(" "); }
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
