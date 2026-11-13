export type Service = { id: string; name: string; desc: string; items: string[]; tagline: string; icon: string };
export type Job = { id: string; title: string; category: string; mode: string; active?: boolean };
export type Status = 'nouveau' | 'en cours' | 'traité';
export type QuoteInput = { name: string; org?: string; contact: string; deadline: string; message: string; services: string[] };
export type Quote = QuoteInput & { id: string; ref: string; status: Status; createdAt: string };
export type Application = { id: string; job: string; name: string; contact: string; createdAt: string };
