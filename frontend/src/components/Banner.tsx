import type { ReactNode } from 'react';

export default function Banner({ variant, title, children, extra = '' }: { variant: string; title: string; children: ReactNode; extra?: string }) {
  return (
    <div className={`banner ${variant} ${extra}`.trim()}>
      <h2>{title}</h2>
      <p className="lead">{children}</p>
    </div>
  );
}
