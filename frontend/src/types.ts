export type Service = { id: string; name: string; desc: string; items: string[]; tagline: string; icon: string };

export type Job = {
  id: string;
  title: string;
  category: string;
  mode: string;
  active?: boolean;
  deadline?: string;
  createdAt?: string;
};

export type Status = 'nouveau' | 'en cours' | 'traité';
export type AppStatus = 'nouveau' | 'à rappeler' | 'entretien' | 'retenu' | 'refusé';

export type Note = {
  id: string;
  text: string;
  createdAt: string;
};

export type QuoteInput = {
  name: string;
  org?: string;
  contact: string;
  deadline: string;
  message: string;
  services: string[];
};

export type Quote = QuoteInput & {
  id: string;
  ref: string;
  status: Status;
  archived?: boolean;
  notes?: Note[];
  createdAt: string;
};

export type Application = {
  id: string;
  job: string;
  name: string;
  contact: string;
  status?: AppStatus;
  notes?: Note[];
  createdAt: string;
};

export type AdminStats = {
  quotesTotal: number;
  quotesNew: number;
  quotesInProgress: number;
  quotesDone: number;
  applicationsTotal: number;
  activeJobs: number;
};

