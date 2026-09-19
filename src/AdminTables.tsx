import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api, type Patient, type Professional, type Session } from './api'

type CommonProps = { session: Session; reload: () => Promise<void> }

export function AdminProfessionals({ data, session, reload }: CommonProps & { data: Professional[] }) {
  const [editing, setEditing] = useState<Professional | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [sort, setSort] = useState('name'), [page, setPage] = useState(0)
  const pageSize = 10
  const filtered = useMemo(() => data.filter(item => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (!term || [item.fullName, item.email, item.phone, item.registrationNumber].some(value => value?.toLocaleLowerCase('pt-BR').includes(term)))
      && (!status || String(item.active) === status)
  }).sort((a, b) => sort === 'status' ? Number(b.active) - Number(a.active) : a.fullName.localeCompare(b.fullName, 'pt-BR')), [data, search, status, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), safePage = Math.min(page, pages - 1)
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const hasFilters = Boolean(search || status || sort !== 'name')
  function clearFilters() { setSearch(''); setStatus(''); setSort('name'); setPage(0) }
  return <section className="panel"><div className="panel-title"><div><h2>{filtered.length} {filtered.length === 1 ? 'profissional encontrado' : 'profissionais encontrados'}</h2><p>Consulte e gerencie os profissionais da plataforma.</p></div></div>
    <div className="list-tools professional-list-tools"><div className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar profissionais" placeholder="Buscar por nome, e-mail, telefone ou registro" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} /></div><select aria-label="Filtrar profissionais por status" value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}><option value="">Todos os status</option><option value="true">Ativos</option><option value="false">Inativos</option></select><select aria-label="Ordenar profissionais" value={sort} onChange={event => { setSort(event.target.value); setPage(0) }}><option value="name">Ordenar por nome</option><option value="status">Ordenar por status</option></select>{hasFilters && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}</div>
    <table><thead><tr><th>Nome</th><th>Telefone</th><th>Registro</th><th>Status</th><th /></tr></thead>
      <tbody>{visible.map(item => <tr key={item.id} className={item.active ? '' : 'inactive-row'}><td><strong>{item.fullName}</strong><small>{item.email}</small></td>
        <td>{item.phone ? formatPhone(item.phone) : '—'}</td><td>{item.registrationNumber || '—'}</td>
        <td><span className={"badge " + (item.active ? 'ativo' : 'inativo')}>{item.active ? 'Ativo' : 'Inativo'}</span></td>
        <td className="row-actions"><button className="link" onClick={() => setEditing(item)}>Editar</button>
          <button className="link" onClick={async () => { if (item.active && !window.confirm(`Deseja desativar ${item.fullName}? O acesso ao sistema será bloqueado.`)) return; try { await api.adminToggleProfessional(session, item); await reload() } catch (e) { setError(message(e)) } }}>{item.active ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody>
    </table>{!visible.length && <div className="empty">Nenhum profissional encontrado.</div>}{pages > 1 && <div className="pagination"><span>Exibindo {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} de {filtered.length}</span><div><button className="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button><span>Página {safePage + 1} de {pages}</span><button className="ghost" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Próxima</button></div></div>}{error && <div className="error banner">{error}</div>}
    {editing && <ProfessionalEditor item={editing} close={() => setEditing(null)} save={async data => { await api.adminUpdateProfessional(session, editing, data); setEditing(null); await reload() }} />}
  </section>
}

export function AdminPatients({ data, session, reload, initialConsent = '' }: CommonProps & { data: Patient[]; initialConsent?: string }) {
  const [editing, setEditing] = useState<Patient | null>(null)
  const [error, setError] = useState('')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [search, setSearch] = useState(''), [professional, setProfessional] = useState('')
  const [status, setStatus] = useState(''), [consent, setConsent] = useState(initialConsent)
  const [sort, setSort] = useState('patient'), [page, setPage] = useState(0)
  const pageSize = 10
  useEffect(() => {
    api.adminProfessionals(session)
      .then(response => setProfessionals(response.content))
      .catch(error => setError(message(error)))
  }, [session])
  useEffect(() => {
    setConsent(initialConsent)
    setPage(0)
  }, [initialConsent])
  const filtered = useMemo(() => data.filter(item => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    const matchesSearch = !term || [item.fullName, item.email, item.phone, item.professionalName, item.professionalEmail]
      .some(value => value?.toLocaleLowerCase('pt-BR').includes(term))
    return matchesSearch && (!professional || item.professionalId === professional)
      && (!status || String(item.active) === status) && (!consent || item.consentStatus === consent)
  }).sort((a, b) => sort === 'professional'
    ? a.professionalName.localeCompare(b.professionalName, 'pt-BR')
    : sort === 'status' ? Number(b.active) - Number(a.active)
      : a.fullName.localeCompare(b.fullName, 'pt-BR')), [data, search, professional, status, consent, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), safePage = Math.min(page, pages - 1)
  const visible = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const hasFilters = Boolean(search || professional || status || consent || sort !== 'patient')
  function change(setter: (value: string) => void, value: string) { setter(value); setPage(0) }
  function clearFilters() { setSearch(''); setProfessional(''); setStatus(''); setConsent(''); setSort('patient'); setPage(0) }
  return <section className="panel"><div className="panel-title"><div><h2>{filtered.length} {filtered.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</h2><p>Consulte e gerencie os pacientes da plataforma.</p></div></div>
    <div className="list-tools">
      <div className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar pacientes" placeholder="Buscar por nome, e-mail, telefone ou profissional" value={search} onChange={event => change(setSearch, event.target.value)} /></div>
      <select aria-label="Filtrar por profissional" value={professional} onChange={event => change(setProfessional, event.target.value)}><option value="">Todos os profissionais</option>{professionals.map(item => <option key={item.id} value={item.id}>{item.fullName}{item.active ? '' : ' — Inativo'}</option>)}</select>
      <select aria-label="Filtrar por status" value={status} onChange={event => change(setStatus, event.target.value)}><option value="">Todos os status</option><option value="true">Ativos</option><option value="false">Inativos</option></select>
      <select aria-label="Filtrar por consentimento" value={consent} onChange={event => change(setConsent, event.target.value)}><option value="">Todos os consentimentos</option><option value="PENDING">Pendente</option><option value="GRANTED">Concedido</option><option value="REVOKED">Revogado</option></select>
      <select aria-label="Ordenar pacientes" value={sort} onChange={event => { setSort(event.target.value); setPage(0) }}><option value="patient">Ordenar por paciente</option><option value="professional">Ordenar por profissional</option><option value="status">Ordenar por status</option></select>
      {hasFilters && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}
    </div>
    <table><thead><tr><th>Paciente</th><th>Profissional responsável</th><th>Telefone</th><th>Consentimento</th><th>Status</th><th /></tr></thead>
      <tbody>{visible.map(item => <tr key={item.id} className={item.active ? '' : 'inactive-row'}><td><button className="entity-link" onClick={() => setEditing(item)}>{item.fullName}</button><small>{item.email}</small></td>
        <td><strong>{item.professionalName}</strong><small>{item.professionalEmail}</small>{item.professionalRegistrationNumber && <small>Registro: {item.professionalRegistrationNumber}</small>}</td><td>{formatPhone(item.phone)}{!validPhone(item.phone) && <small className="data-warning">⚠ Telefone inválido</small>}</td><td><span className={'badge ' + item.consentStatus.toLowerCase()}>{consentLabel(item.consentStatus)}</span></td>
        <td><span className={"badge " + (item.active ? 'ativo' : 'inativo')}>{item.active ? 'Ativo' : 'Inativo'}</span></td>
        <td className="row-actions">{item.active && <button className="link" onClick={() => setEditing(item)}>Editar</button>}<button className="link" onClick={async () => { if (item.active && !window.confirm(`Deseja desativar ${item.fullName}? O cadastro e o histórico serão preservados.`)) return; try { await api.adminTogglePatient(session, item); await reload() } catch (e) { setError(message(e)) } }}>{item.active ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody>
    </table>{!visible.length && <div className="empty">{professional && !data.some(item => item.professionalId === professional) ? 'Este profissional ainda não possui pacientes.' : 'Nenhum paciente encontrado.'}</div>}
    {pages > 1 && <div className="pagination"><span>Exibindo {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} de {filtered.length}</span><div><button className="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Anterior</button><span>Página {safePage + 1} de {pages}</span><button className="ghost" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Próxima</button></div></div>}
    {error && <div className="error banner">{error}</div>}
    {editing && <PatientEditor item={editing} close={() => setEditing(null)} save={async data => { await api.adminUpdatePatient(session, editing, data); setEditing(null); await reload() }} />}
  </section>
}

function ProfessionalEditor({ item, close, save }: { item: Professional; close: () => void; save: (data: object) => Promise<void> }) {
  return <Editor title="Editar profissional" close={close} submit={async form => save({ fullName: form.get('fullName'), email: form.get('email'), phone: form.get('phone') || null, registrationNumber: form.get('registrationNumber') || null })}>
    <label className="span">Nome completo<input name="fullName" defaultValue={item.fullName} required maxLength={150} /></label>
    <label>E-mail<input name="email" type="email" defaultValue={item.email} required maxLength={254} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" /></label>
    <label>Telefone<input name="phone" defaultValue={item.phone ?? ''} required maxLength={20} inputMode="tel" /></label>
    <label className="span">Registro profissional<input name="registrationNumber" defaultValue={item.registrationNumber ?? ''} maxLength={50} /></label>
  </Editor>
}

export function PatientEditor({ item, close, save, changeConsent, toggleActive }: { item: Patient; close: () => void; save: (data: object) => Promise<void>; changeConsent?: () => Promise<void>; toggleActive?: () => Promise<void> }) {
  const [consentBusy, setConsentBusy] = useState(false)
  if (!item.active) return <div className="modal-backdrop"><section className="modal"><div className="modal-head"><h2>Paciente inativo</h2><button onClick={close}>×</button></div><div className="inactive-editor"><p>Dados disponíveis somente para consulta. Ative o paciente para editar informações ou alterar o consentimento.</p><div className="patient-readonly"><div><small>Nome completo</small><strong>{item.fullName}</strong></div><div><small>E-mail</small><strong>{item.email || '—'}</strong></div><div><small>Telefone</small><strong>{formatPhone(item.phone)}</strong></div><div><small>Data de nascimento</small><strong>{item.birthDate ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${item.birthDate}T00:00:00Z`)) : '—'}</strong></div><div><small>Canal preferencial</small><strong>{item.preferredChannel === 'WHATSAPP' ? 'WhatsApp' : 'E-mail'}</strong></div><div><small>Consentimento</small><strong>{consentLabel(item.consentStatus)}</strong></div></div><div className="form-actions"><button type="button" className="ghost" onClick={close}>Fechar</button>{toggleActive && <button className="primary" onClick={async () => { await toggleActive() }}>Ativar paciente</button>}</div></div></section></div>
  return <Editor title="Editar paciente" close={close} submit={async form => save({ fullName: form.get('fullName'), birthDate: form.get('birthDate') || null, phone: form.get('phone'), email: form.get('email') || null, preferredChannel: form.get('preferredChannel') })}>
    <label className="span">Nome completo<input name="fullName" defaultValue={item.fullName} required maxLength={150} /></label>
    <label>Data de nascimento<input name="birthDate" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} defaultValue={item.birthDate ?? ''} /></label>
    <label>Telefone<input name="phone" defaultValue={formatPhone(item.phone)} required minLength={13} maxLength={14} inputMode="numeric" pattern="\(\d{2}\)\d{4,5}-\d{4}" title="Informe um telefone com DDD" placeholder="(11)12345-6789" onInput={event => { event.currentTarget.value = formatPhoneInput(event.currentTarget.value) }} /></label>
    <label>E-mail<input name="email" type="email" defaultValue={item.email ?? ''} maxLength={254} pattern="[^\s@]+@[^\s@]+\.[^\s@]+" /></label>
    <label>Canal preferencial<select name="preferredChannel" defaultValue={item.preferredChannel}><option>WHATSAPP</option><option>EMAIL</option></select></label>
    {changeConsent && item.active && <div className="consent-edit span"><div><strong>Consentimento</strong><small>Status atual: {consentLabel(item.consentStatus)}</small></div><button type="button" className="link" disabled={consentBusy} onClick={async () => { setConsentBusy(true); try { await changeConsent() } finally { setConsentBusy(false) } }}>{consentBusy ? 'Salvando…' : item.consentStatus === 'GRANTED' ? 'Revogar consentimento' : 'Conceder consentimento'}</button></div>}
    {toggleActive && <div className="form-actions span"><button type="button" className="link danger-link" onClick={async () => { if (window.confirm(`Deseja desativar ${item.fullName}? O cadastro e o histórico serão preservados.`)) await toggleActive() }}>Desativar paciente</button></div>}
  </Editor>
}

function Editor({ title, close, submit, children }: { title: string; close: () => void; submit: (form: FormData) => Promise<void>; children: ReactNode }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); try { await submit(new FormData(event.currentTarget)) } catch (e) { setError(message(e)) } finally { setBusy(false) } }
  return <div className="modal-backdrop"><section className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}>×</button></div>
    <form className="form-grid" onSubmit={onSubmit}>{children}{error && <div className="error span">{error}</div>}<div className="form-actions span"><button type="button" className="ghost" onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div></form>
  </section></div>
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir a operação' }
function consentLabel(value: Patient['consentStatus']) { return value === 'GRANTED' ? 'Concedido' : value === 'REVOKED' ? 'Revogado' : 'Pendente' }
function formatPhone(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 11 ? `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}` : digits.length === 10 ? `(${digits.slice(0, 2)})${digits.slice(2, 6)}-${digits.slice(6)}` : value }
function formatPhoneInput(value: string) { const digits = value.replace(/\D/g, '').slice(0, 11); if (!digits) return ''; if (digits.length < 3) return `(${digits}`; if (digits.length <= 6) return `(${digits.slice(0, 2)})${digits.slice(2)}`; const split = digits.length === 11 ? 7 : 6; return `(${digits.slice(0, 2)})${digits.slice(2, split)}-${digits.slice(split)}` }
function validPhone(value: string) { const length = value.replace(/\D/g, '').length; return length === 10 || length === 11 }
