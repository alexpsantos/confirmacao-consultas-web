export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export type Session = {
  accessToken: string
  userId: string
  tenantId: string | null
  professionalId: string | null
  name: string
  role: 'ADMIN' | 'OWNER' | 'PROFESSIONAL'
  tenantName: string | null
}

export type TenantOption = { id: string; displayName: string; role: Session['role'] }
export type LoginResult = Session & { requiresTenantSelection: boolean; selectionToken: string | null; tenants: TenantOption[] }
export type OnboardingData = { clinicName: string; timezone: string; ownerName: string; ownerEmail: string; password: string }

export type Tenant = {
  id: string
  displayName: string
  timezone: string
  active: boolean
  createdAt: string
  updatedAt: string
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

export type Professional = {
  id: string
  fullName: string
  email: string
  phone: string | null
  registrationNumber: string | null
  active: boolean
}

type Page<T> = { content: T[]; totalElements: number }

function requireTenant(session: Session): string {
  if (!session.tenantId) throw new Error('Selecione uma clínica para continuar')
  return session.tenantId
}

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
  onboard: (data: OnboardingData) =>
    request<LoginResult>('/api/v1/onboarding', { method: 'POST', body: JSON.stringify(data) }),
  login: (email: string, password: string) =>
    request<LoginResult>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  selectTenant: (selectionToken: string, tenantId: string) =>
    request<LoginResult>('/api/v1/auth/select-tenant', { method: 'POST', body: JSON.stringify({ selectionToken, tenantId }) }),
  tenants: (session: Session) =>
    request<Page<Tenant>>('/api/v1/tenants?size=100&sort=displayName,asc', {}, session.accessToken),
  createTenant: (session: Session, data: { displayName: string; timezone: string }) =>
    request<Tenant>('/api/v1/tenants', { method: 'POST', body: JSON.stringify(data) }, session.accessToken),
  updateTenant: (session: Session, tenantId: string, data: { displayName: string; timezone: string }) =>
    request<Tenant>(`/api/v1/tenants/${tenantId}`, { method: 'PUT', body: JSON.stringify(data) }, session.accessToken),
  toggleTenant: (session: Session, tenant: Tenant) =>
    request<void>(`/api/v1/tenants/${tenant.id}${tenant.active ? '' : '/activate'}`,
      { method: tenant.active ? 'DELETE' : 'PATCH' }, session.accessToken),
  professionals: (session: Session) =>
    request<Page<Professional>>(`/api/v1/tenants/${requireTenant(session)}/professionals?size=100&sort=fullName,asc`, {}, session.accessToken),
  professional: (session: Session, professionalId: string) =>
    request<Professional>(`/api/v1/tenants/${requireTenant(session)}/professionals/${professionalId}`, {}, session.accessToken),
  createProfessional: (session: Session, data: object) =>
    request<Professional>(`/api/v1/tenants/${requireTenant(session)}/professionals/with-access`, { method: 'POST', body: JSON.stringify(data) }, session.accessToken),
  toggleProfessional: (session: Session, professional: Professional) =>
    request<void>(`/api/v1/tenants/${requireTenant(session)}/professionals/${professional.id}${professional.active ? '' : '/activate'}`,
      { method: professional.active ? 'DELETE' : 'PATCH' }, session.accessToken),
  linkMyProfessional: (session: Session, professionalId: string) =>
    request<TenantUser>(`/api/v1/tenants/${requireTenant(session)}/users/me/professional/${professionalId}`,
      { method: 'PATCH' }, session.accessToken),
  patients: (session: Session) =>
    request<Page<Patient>>(`/api/v1/tenants/${requireTenant(session)}/patients?size=100&sort=fullName,asc`, {}, session.accessToken),
  createPatient: (session: Session, data: object) =>
    request<Patient>(`/api/v1/tenants/${requireTenant(session)}/patients`, { method: 'POST', body: JSON.stringify(data) }, session.accessToken),
  togglePatient: (session: Session, patient: Patient) =>
    request<void>(`/api/v1/tenants/${requireTenant(session)}/patients/${patient.id}${patient.active ? '' : '/activate'}`,
      { method: patient.active ? 'DELETE' : 'PATCH' }, session.accessToken),
  users: (session: Session) =>
    request<Page<TenantUser>>(`/api/v1/tenants/${requireTenant(session)}/users?size=100&sort=name,asc`, {}, session.accessToken),
  createUser: (session: Session, data: object) =>
    request<TenantUser>(`/api/v1/tenants/${requireTenant(session)}/users`, { method: 'POST', body: JSON.stringify(data) }, session.accessToken),
  toggleUser: (session: Session, user: TenantUser) =>
    request<void>(`/api/v1/tenants/${requireTenant(session)}/users/${user.id}${user.active ? '' : '/activate'}`,
      { method: user.active ? 'DELETE' : 'PATCH' }, session.accessToken),
}
