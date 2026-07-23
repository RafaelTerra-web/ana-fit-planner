import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  className?: string;
  as?: 'article' | 'section' | 'div';
  dataTour?: string;
}>;

export function Card({ children, className = '', as: Component = 'section', dataTour }: CardProps) {
  return (
    <Component
      className={`premium-card rounded-[1.35rem] border border-white/10 bg-slate-900/85 p-4 shadow-soft ${className}`}
      data-tour={dataTour}
    >
      {children}
    </Component>
  );
}
