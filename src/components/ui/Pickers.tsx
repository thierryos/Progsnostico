import { Minus, Plus } from 'lucide-react';
import type { GameMode } from '../../game/types';
import { useI18n } from '../../i18n';

interface NumberPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** Valores abaixo disso ficam desabilitados (ex.: jogadores já na sala). */
  disabledBelow?: number;
}

/** Botões segmentados: mais fácil de acertar no celular do que um slider. */
export const NumberPicker = ({
  min,
  max,
  value,
  onChange,
  disabledBelow = min,
}: NumberPickerProps) => (
  <div className="flex gap-1.5" role="radiogroup">
    {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        disabled={n < disabledBelow}
        onClick={() => onChange(n)}
        className={`h-12 min-w-0 flex-1 rounded-lg border-2 text-2xl transition-colors disabled:opacity-30 ${value === n ? 'border-white bg-balatro-blue text-white' : 'border-slate-600 bg-slate-900 text-slate-300 enabled:hover:border-slate-400'}`}
      >
        {n}
      </button>
    ))}
  </div>
);

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export const Stepper = ({ value, min, max, onChange, format = String }: StepperProps) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      aria-label="-"
      disabled={value <= min}
      onClick={() => onChange(value - 1)}
      className="grid size-12 place-items-center rounded-lg border-2 border-slate-600 bg-slate-900 text-white disabled:opacity-30"
    >
      <Minus size={20} />
    </button>
    <div className="flex h-12 flex-1 items-center justify-center rounded-lg border-2 border-slate-700 bg-black text-2xl text-balatro-gold">
      {format(value)}
    </div>
    <button
      type="button"
      aria-label="+"
      disabled={value >= max}
      onClick={() => onChange(value + 1)}
      className="grid size-12 place-items-center rounded-lg border-2 border-slate-600 bg-slate-900 text-white disabled:opacity-30"
    >
      <Plus size={20} />
    </button>
  </div>
);

/** Modos com a descrição sempre visível (o tooltip de hover não existe no toque). */
export const ModePicker = ({
  value,
  onChange,
}: {
  value: GameMode;
  onChange: (m: GameMode) => void;
}) => {
  const { t } = useI18n();
  const modes = [
    { id: 'up' as const, title: t('modeClassic'), desc: t('modeClassicDesc'), path: '1 → …' },
    {
      id: 'up_down' as const,
      title: t('modePyramid'),
      desc: t('modePyramidDesc'),
      path: '1 → … → 1',
    },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          onClick={() => onChange(m.id)}
          className={`rounded-xl border-2 p-3 text-left transition-colors ${value === m.id ? 'border-white bg-balatro-blue text-white' : 'border-slate-600 bg-slate-900 text-slate-300'}`}
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xl">{m.title}</span>
            <span className="text-sm opacity-70">{m.path}</span>
          </span>
          <span className="block text-base leading-snug opacity-80">{m.desc}</span>
        </button>
      ))}
    </div>
  );
};
