import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_URL, api, type Professional, type Session } from './api'

const session: Session = {
  accessToken: 'admin-token',
  userId: 'admin-id',
  professionalId: null,
  name: 'Administrador',
  role: 'ADMIN',
}

const professional: Professional = {
  id: 'professional-id',
  fullName: 'Profissional',
  email: 'profissional@email.com',
  phone: null,
  registrationNumber: null,
  specialty: null,
  displayName: null,
  timezone: 'America/Sao_Paulo',
  defaultSessionMinutes: 60,
  defaultModality: 'PRESENTIAL',
  remindersEnabled: true,
  active: true,
}

afterEach(() => vi.restoreAllMocks())

describe('contrato administrativo de profissionais', () => {
  it('lista profissionais usando o token do administrador', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ content: [professional], totalElements: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await api.adminProfessionals(session)

    expect(result.content).toEqual([professional])
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/v1/admin/professionals?size=100&sort=fullName,asc`,
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
    )
  })

  it('envia a edição ao endpoint administrativo correto', async () => {
    const updated = { ...professional, fullName: 'Nome atualizado' }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await api.adminUpdateProfessional(session, professional, {
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      registrationNumber: updated.registrationNumber,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/v1/admin/professionals/professional-id`,
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer admin-token' },
      }),
    )
  })

  it('desativa e reativa pelo status atual do profissional', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await api.adminToggleProfessional(session, professional)
    await api.adminToggleProfessional(session, { ...professional, active: false })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_URL}/api/v1/admin/professionals/professional-id`,
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_URL}/api/v1/admin/professionals/professional-id/activate`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
