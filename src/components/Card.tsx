import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  className?: string;
  as?: 'article' | 'section' | 'div';
}>;

export function Card({ children, className = '', as: Component = 'section' }: CardProps) {
  return <Component className={`rounded-lg border border-white/10 bg-slate-900/85 p-4 shadow-soft ${className}`}>{children}</Component>;
}
