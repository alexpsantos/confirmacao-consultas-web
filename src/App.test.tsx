import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Users } from './App'
import { AdminPatients } from './AdminTables'
import type { Patient, Session, User } from './api'

describe('consulta administrativa de usuários', () => {
  it('exibe o status sincronizado sem oferecer uma segunda ação de desativação', () => {
    const users: User[] = [{
      id: 'user-id',
      professionalId: 'professional-id',
      name: 'Profissional',
      email: 'profissional@email.com',
      role: 'PROFESSIONAL',
      active: false,
    }]

    const html = renderToStaticMarkup(
      <Users data={users} current="admin-id" toggle={vi.fn()} />,
    )

    expect(html).toContain('Profissional')
    expect(html).toContain('Inativo')
    expect(html).not.toContain('Desativar')
    expect(html).not.toContain('Ativar</button>')
  })
})

describe('lista administrativa de pacientes', () => {
  it('mostra todos os pacientes sem destacar consentimentos', () => {
    const session: Session = { accessToken: 'token', userId: 'admin', professionalId: null, name: 'Admin', role: 'ADMIN' }
    const base = { professionalId: 'professional', professionalName: 'Profissional', professionalEmail: 'pro@email.com', professionalRegistrationNumber: null, birthDate: null, phone: '11999999999', email: null, preferredChannel: 'WHATSAPP' as const, consentedAt: null, active: true, createdAt: '', updatedAt: '' }
    const patients: Patient[] = [
      { ...base, id: 'pending', fullName: 'Paciente pendente', consentStatus: 'PENDING' },
      { ...base, id: 'granted', fullName: 'Paciente concedido', consentStatus: 'GRANTED' },
    ]
    const html = renderToStaticMarkup(<AdminPatients data={patients} session={session} reload={vi.fn()} />)
    expect(html).toContain('Paciente pendente')
    expect(html).toContain('Paciente concedido')
    expect(html).not.toContain('Filtrar por consentimento')
  })
})
