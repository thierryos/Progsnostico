import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'danger' | 'success' | 'gold' | 'neutral' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const LIGHT_TEXT = 'text-white [text-shadow:0_2px_0_rgb(0_0_0/0.35)] pixel-bevel';

const VARIANTS: Record<Variant, string> = {
  primary: `bg-balatro-blue border-blue-900 ${LIGHT_TEXT}`,
  danger: `bg-balatro-red border-red-900 ${LIGHT_TEXT}`,
  success: `bg-green-600 border-green-900 ${LIGHT_TEXT}`,
  gold: 'bg-balatro-gold text-black border-yellow-800 pixel-bevel',
  neutral: `bg-slate-700 border-slate-900 ${LIGHT_TEXT}`,
  ghost: 'bg-slate-800/80 text-slate-200 border-slate-950 ring-1 ring-slate-600',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-10 px-3 text-lg',
  md: 'min-h-12 px-4 text-xl',
  lg: 'min-h-14 px-6 text-2xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

/** Botão "de fliperama": borda inferior grossa que afunda ao pressionar. */
export const Button = ({
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={[
      'inline-flex items-center justify-center gap-2 rounded-xl border-b-4 font-bold uppercase',
      'tracking-wide transition-[filter,transform,border-width] duration-100 select-none',
      'enabled:hover:brightness-110 enabled:active:translate-y-1 enabled:active:border-b-0',
      'disabled:opacity-50',
      VARIANTS[variant],
      SIZES[size],
      block ? 'w-full' : '',
      className,
    ].join(' ')}
    {...props}
  >
    {icon}
    {children}
  </button>
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: 'default' | 'gold' | 'danger';
}

const TONES = {
  default: 'bg-slate-800 text-slate-200 border-slate-600 enabled:hover:border-white',
  gold: 'bg-slate-800 text-balatro-gold border-balatro-gold/70 enabled:hover:border-balatro-gold',
  danger: 'bg-red-900/80 text-white border-red-700 enabled:hover:bg-red-700',
};

/** Botão só com ícone: área de toque de 40px e rótulo acessível obrigatório. */
export const IconButton = ({
  label,
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={`grid size-10 shrink-0 place-items-center rounded-full border-2 shadow-lg transition-colors ${TONES[tone]} ${className}`}
    {...props}
  />
);
