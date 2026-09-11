export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export type Session = {
  accessToken: string
  tenantId: string
  name: string
  role: 'ADMIN' | 'OWNER' | 'PROFESSIONAL'
}

export type Patient = {
  id: string
  fullName: string
  birthDate: string | null
  phone: string
  email: string | null
  preferredChannel: 'WHATSAPP' | 'EMAIL'
  consentStatus: 'PENDING' | 'GRANTED' | 'REVOKED'
  active: boolean
}

export type TenantUser = {
  id: string
  professionalId: string | null
  name: string
  email: string
  role: 'OWNER' | 'PROFESSIONAL'
  active: boolean
}

type Page<T> = { content: T[]; totalElements: number }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message ?? `Erro ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

export const api = {
  login: (tenantId: string, email: string, password: string) =>
    request<Session>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ tenantId, email, password }) }),
  patients: (session: Session) =>
    request<Page<Patient>>(`/api/v1/tenants/${session.tenantId}/patients?size=100&sort=fullName,asc`, {}, session.accessToken),
  createPatient: (session: Session, data: object) =>
    request<Patient>(`/api/v1/tenants/${session.tenantId}/patients`, { method: 'POST', body: JSON.stringify(data) }, session.accessToken),
  togglePatient: (session: Session, patient: Patient) =>
    request<void>(`/api/v1/tenants/${session.tenantId}/patients/${patient.id}${patient.active ? '' : '/activate'}`,
      { method: patient.active ? 'DELETE' : 'PATCH' }, session.accessToken),
  users: (session: Session) =>
    request<Page<TenantUser>>(`/api/v1/tenants/${session.tenantId}/users?size=100&sort=name,asc`, {}, session.accessToken),
  createUser: (session: Session, data: object) =>
    request<TenantUser>(`/api/v1/tenants/${session.tenantId}/users`, { method: 'POST', body: JSON.stringify(data) }, session.accessToken),
  toggleUser: (session: Session, user: TenantUser) =>
    request<void>(`/api/v1/tenants/${session.tenantId}/users/${user.id}${user.active ? '' : '/activate'}`,
      { method: user.active ? 'DELETE' : 'PATCH' }, session.accessToken),
}
