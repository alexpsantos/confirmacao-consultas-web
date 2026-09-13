import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api, type Patient, type Professional, type Session } from './api'

type CommonProps = { session: Session; reload: () => Promise<void> }

export function AdminProfessionals({ data, session, reload }: CommonProps & { data: Professional[] }) {
  const [editing, setEditing] = useState<Professional | null>(null)
  const [error, setError] = useState('')
  return <section className="panel"><div className="panel-title"><h2>Profissionais</h2></div>
    <table><thead><tr><th>Nome</th><th>Telefone</th><th>Registro</th><th>Status</th><th /></tr></thead>
      <tbody>{data.map(item => <tr key={item.id}><td><strong>{item.fullName}</strong><small>{item.email}</small></td>
        <td>{item.phone || '—'}</td><td>{item.registrationNumber || '—'}</td>
        <td><span className={"badge " + (item.active ? 'ativo' : 'inativo')}>{item.active ? 'Ativo' : 'Inativo'}</span></td>
        <td className="row-actions"><button className="link" onClick={() => setEditing(item)}>Editar</button>
          <button className="link" onClick={async () => { try { await api.adminToggleProfessional(session, item); await reload() } catch (e) { setError(message(e)) } }}>{item.active ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody>
    </table>{error && <div className="error banner">{error}</div>}
    {editing && <ProfessionalEditor item={editing} close={() => setEditing(null)} save={async data => { await api.adminUpdateProfessional(session, editing, data); setEditing(null); await reload() }} />}
  </section>
}

export function AdminPatients({ data, session, reload }: CommonProps & { data: Patient[] }) {
  const [editing, setEditing] = useState<Patient | null>(null)
  const [error, setError] = useState('')
  return <section className="panel"><div className="panel-title"><h2>Pacientes</h2></div>
    <table><thead><tr><th>Paciente</th><th>Telefone</th><th>Consentimento</th><th>Status</th><th /></tr></thead>
      <tbody>{data.map(item => <tr key={item.id}><td><strong>{item.fullName}</strong><small>{item.email}</small></td>
        <td>{item.phone}</td><td>{item.consentStatus}</td>
        <td><span className={"badge " + (item.active ? 'ativo' : 'inativo')}>{item.active ? 'Ativo' : 'Inativo'}</span></td>
        <td className="row-actions"><button className="link" onClick={() => setEditing(item)}>Editar</button>
          <button className="link" onClick={async () => { try { await api.adminTogglePatient(session, item); await reload() } catch (e) { setError(message(e)) } }}>{item.active ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody>
    </table>{error && <div className="error banner">{error}</div>}
    {editing && <PatientEditor item={editing} close={() => setEditing(null)} save={async data => { await api.adminUpdatePatient(session, editing, data); setEditing(null); await reload() }} />}
  </section>
}

function ProfessionalEditor({ item, close, save }: { item: Professional; close: () => void; save: (data: object) => Promise<void> }) {
  return <Editor title="Editar profissional" close={close} submit={async form => save({ fullName: form.get('fullName'), email: form.get('email'), phone: form.get('phone') || null, registrationNumber: form.get('registrationNumber') || null })}>
    <label className="span">Nome completo<input name="fullName" defaultValue={item.fullName} required /></label>
    <label>E-mail<input name="email" type="email" defaultValue={item.email} required /></label>
    <label>Telefone<input name="phone" defaultValue={item.phone ?? ''} /></label>
    <label className="span">Registro profissional<input name="registrationNumber" defaultValue={item.registrationNumber ?? ''} /></label>
  </Editor>
}

function PatientEditor({ item, close, save }: { item: Patient; close: () => void; save: (data: object) => Promise<void> }) {
  return <Editor title="Editar paciente" close={close} submit={async form => save({ fullName: form.get('fullName'), birthDate: form.get('birthDate') || null, phone: form.get('phone'), email: form.get('email') || null, preferredChannel: form.get('preferredChannel') })}>
    <label className="span">Nome completo<input name="fullName" defaultValue={item.fullName} required /></label>
    <label>Data de nascimento<input name="birthDate" type="date" defaultValue={item.birthDate ?? ''} /></label>
    <label>Telefone<input name="phone" defaultValue={item.phone} required /></label>
    <label>E-mail<input name="email" type="email" defaultValue={item.email ?? ''} /></label>
    <label>Canal preferencial<select name="preferredChannel" defaultValue={item.preferredChannel}><option>WHATSAPP</option><option>EMAIL</option></select></label>
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
