interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/** Interruptor pixelado com rótulo e descrição (a linha inteira é clicável). */
export const Switch = ({ checked, onChange, label, description }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-slate-700 bg-slate-900/70 px-3 py-2 text-left transition-colors hover:border-slate-500"
  >
    <span className="min-w-0 flex-1 leading-tight">
      <span className="block text-xl text-white">{label}</span>
      {description && <span className="block text-base text-slate-400">{description}</span>}
    </span>
    <span
      className={`relative h-7 w-12 shrink-0 rounded-[4px] border-2 transition-colors ${checked ? 'border-green-300 bg-green-600' : 'border-slate-500 bg-slate-800'}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-[2px] bg-white shadow-[0_2px_0_rgb(0_0_0/0.35)] transition-[left] duration-150 ${checked ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`}
      />
    </span>
  </button>
);
