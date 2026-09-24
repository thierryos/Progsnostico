import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { LANGUAGES, useI18n } from '../i18n';
import { useSettings } from '../lib/settings';
import { getVolume, setVolume } from '../lib/sound';
import { Sheet } from './ui/Sheet';
import { Switch } from './ui/Switch';

export const SettingsSheet = ({ onClose }: { onClose: () => void }) => {
  const { t, lang, setLang } = useI18n();
  const { crt, motion, update } = useSettings();
  const [volume, setVolumeState] = useState(getVolume);

  const changeVolume = (value: number) => {
    setVolume(value);
    setVolumeState(value);
  };

  return (
    <Sheet open onClose={onClose} title={t('settings')} closeLabel={t('close')}>
      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <h3 className="text-lg tracking-widest text-slate-400 uppercase">{t('fxTitle')}</h3>
          <Switch
            checked={crt}
            onChange={(value) => update({ crt: value })}
            label={t('fxCrt')}
            description={t('fxCrtDesc')}
          />
          <Switch
            checked={motion}
            onChange={(value) => update({ motion: value })}
            label={t('fxMotion')}
            description={t('fxMotionDesc')}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-lg tracking-widest text-slate-400 uppercase">{t('sound')}</h3>
          <div className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-slate-700 bg-slate-900/70 px-3">
            <button
              type="button"
              aria-label={t('sound')}
              className="grid size-10 place-items-center text-balatro-gold"
              onClick={() => changeVolume(volume === 0 ? 0.5 : 0)}
            >
              {volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label={t('volume')}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-balatro-gold"
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-lg tracking-widest text-slate-400 uppercase">{t('language')}</h3>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => setLang(l)}
                className={`h-12 rounded-lg border-2 text-xl uppercase ${lang === l ? 'border-white bg-balatro-gold text-black' : 'border-slate-600 bg-slate-900 text-slate-300'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
};
