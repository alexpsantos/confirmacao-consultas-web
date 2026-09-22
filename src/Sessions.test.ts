import { describe, expect, it } from 'vitest'
import { layoutAppointments } from './Sessions'
import type { Appointment } from './api'

function session(id: string, startsAt: string, endsAt: string): Appointment {
  return { id, patientId: id, patientName: id, startsAt, endsAt, modality: 'ONLINE', status: 'SCHEDULED', meetingLink: null, notes: null }
}

describe('layout da agenda', () => {
  it('mantém sessões sobrepostas visíveis lado a lado', () => {
    const result = layoutAppointments([
      session('cancelada', '2026-09-22T13:00:00.000Z', '2026-09-22T14:00:00.000Z'),
      session('nova', '2026-09-22T13:00:00.000Z', '2026-09-22T14:00:00.000Z'),
    ])

    expect(result.map(({ item, column, columns }) => [item.id, column, columns])).toEqual([
      ['cancelada', 0, 2],
      ['nova', 1, 2],
    ])
  })

  it('usa a largura completa para sessões que não se cruzam', () => {
    const result = layoutAppointments([
      session('primeira', '2026-09-22T13:00:00.000Z', '2026-09-22T14:00:00.000Z'),
      session('segunda', '2026-09-22T14:00:00.000Z', '2026-09-22T15:00:00.000Z'),
    ])

    expect(result.every(({ column, columns }) => column === 0 && columns === 1)).toBe(true)
  })
})
