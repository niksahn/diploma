import { request } from './client'

export type Complaint = {
  id: string
  text: string
  date: string
  deviceDescription?: string
  status?: string
}

export const complaintApi = {
  create: (payload: { text: string; deviceDescription: string }) =>
    request<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify({
        text: payload.text,
        device_description: payload.deviceDescription
      })
    }),
  mine: () => request<Complaint[]>('/complaints'),
}

