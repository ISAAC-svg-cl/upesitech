import type { AdminStats, AppStatus, Application, Job, Note, Quote, QuoteInput, Status } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '';
export const TOKEN_KEY = 'ut_token';

export type LoginCredentials = {
  email: string;
  password: string;
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (res.status === 401 && token) {
    sessionStorage.removeItem(TOKEN_KEY);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Une erreur est survenue.'), { status: res.status });
  return data as T;
}
const body = (b: unknown) => JSON.stringify(b);

export const api = {
  jobs: () => req<Job[]>('/api/jobs'),
  sendQuote: (b: QuoteInput) => req<{ ref: string }>('/api/quotes', { method: 'POST', body: body(b) }),
  apply: (b: { job: string; name: string; contact: string }) => req<{ ok: true }>('/api/applications', { method: 'POST', body: body(b) }),
  login: (creds: LoginCredentials) => req<{ token: string }>('/api/admin/login', { method: 'POST', body: body(creds) }),
  me: () => req<{ ok: true; email?: string }>('/api/admin/me'),
  stats: () => req<AdminStats>('/api/admin/stats'),
  quotes: () => req<Quote[]>('/api/admin/quotes'),
  setStatus: (id: string, status: Status) => req<Quote>(`/api/admin/quotes/${id}`, { method: 'PATCH', body: body({ status }) }),
  archiveQuote: (id: string, archived: boolean) => req<Quote>(`/api/admin/quotes/${id}/archive`, { method: 'PATCH', body: body({ archived }) }),
  addQuoteNote: (id: string, text: string) => req<Note>(`/api/admin/quotes/${id}/notes`, { method: 'POST', body: body({ text }) }),
  deleteQuote: (id: string) => req<{ ok: true }>(`/api/admin/quotes/${id}`, { method: 'DELETE' }),
  applications: () => req<Application[]>('/api/admin/applications'),
  setAppStatus: (id: string, status: AppStatus) => req<Application>(`/api/admin/applications/${id}`, { method: 'PATCH', body: body({ status }) }),
  addAppNote: (id: string, text: string) => req<Note>(`/api/admin/applications/${id}/notes`, { method: 'POST', body: body({ text }) }),
  deleteApp: (id: string) => req<{ ok: true }>(`/api/admin/applications/${id}`, { method: 'DELETE' }),
  adminJobs: () => req<Job[]>('/api/admin/jobs'),
  addJob: (j: { title: string; category: string; mode: string; deadline?: string }) => req<Job>('/api/admin/jobs', { method: 'POST', body: body(j) }),
  updateJob: (id: string, j: { title?: string; category?: string; mode?: string; active?: boolean; deadline?: string }) => req<Job>(`/api/admin/jobs/${id}`, { method: 'PATCH', body: body(j) }),
  delJob: (id: string) => req<{ ok: true }>(`/api/admin/jobs/${id}`, { method: 'DELETE' }),
  changePassword: (p: { currentPassword: string; newPassword: string }) => req<{ ok: true }>('/api/admin/change-password', { method: 'POST', body: body(p) }),
};

