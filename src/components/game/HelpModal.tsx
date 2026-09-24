import { BookOpen, Info, Shield, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useI18n, type TranslationKey } from '../../i18n';
import { CardHierarchy } from '../CardHierarchy';
import { Sheet } from '../ui/Sheet';

type Tab = 'basics' | 'cards' | 'scoring';

const TABS: { id: Tab; label: TranslationKey }[] = [
  { id: 'basics', label: 'tabBasics' },
  { id: 'cards', label: 'tabCards' },
  { id: 'scoring', label: 'tabScoring' },
];

export const HelpModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('basics');

  return (
    <Sheet
      open
      onClose={onClose}
      size="tall"
      closeLabel={t('close')}
      title={
        <span className="flex items-center gap-2">
          <BookOpen size={22} /> {t('helpTitle')}
        </span>
      }
      footer={<p className="text-center text-base text-slate-500">{t('helpFooter')}</p>}
    >
      <div
        role="tablist"
        className="sticky top-0 z-10 flex border-b-2 border-slate-700 bg-slate-800"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-12 flex-1 text-xl uppercase transition-colors ${tab === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div className="space-y-5 p-4 text-lg leading-snug text-slate-200">
        {tab === 'basics' && (
          <>
            <section>
              <h3 className="mb-1 text-2xl text-balatro-blue uppercase">
                {t('helpObjectiveTitle')}
              </h3>
              <p>{t('helpObjective')}</p>
            </section>
            <section>
              <h3 className="mb-1 text-2xl text-balatro-blue uppercase">{t('helpFlowTitle')}</h3>
              <ol className="list-decimal space-y-1 pl-6 marker:text-balatro-gold">
                <li>{t('helpFlow1')}</li>
                <li>{t('helpFlow2')}</li>
                <li>{t('helpFlow3')}</li>
                <li>{t('helpFlow4')}</li>
              </ol>
            </section>
            <section className="rounded-lg border border-slate-700 bg-slate-800 p-3">
              <h4 className="mb-2 flex items-center gap-2 text-xl text-white">
                <Info size={18} /> {t('helpModesTitle')}
              </h4>
              <p>
                <span className="text-balatro-gold">{t('modeClassic')}:</span>{' '}
                {t('modeClassicDesc')}
              </p>
              <p className="mt-2">
                <span className="text-balatro-gold">{t('modePyramid')}:</span>{' '}
                {t('modePyramidDesc')}
              </p>
            </section>
          </>
        )}

        {tab === 'cards' && (
          <>
            <section className="rounded-xl border border-slate-700 bg-black/30 p-3">
              <h3 className="mb-3 text-center text-xl text-balatro-gold uppercase">
                {t('helpHierarchyTitle')}
              </h3>
              <CardHierarchy />
              <p className="mt-3 text-center text-base text-slate-400">{t('helpHierarchyNote')}</p>
            </section>
            <section className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-slate-800 p-3">
                <h4 className="mb-1 flex items-center gap-2 text-xl text-white">
                  <Shield size={18} /> {t('helpLeadTitle')}
                </h4>
                <p className="text-base text-slate-300">{t('helpLead')}</p>
                <p className="mt-2 text-base text-red-300">{t('helpGoldenRule')}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <h4 className="mb-1 flex items-center gap-2 text-xl text-balatro-gold">
                  <Trophy size={18} /> {t('helpTrumpTitle')}
                </h4>
                <p className="text-base text-slate-300">{t('helpTrump')}</p>
              </div>
            </section>
          </>
        )}

        {tab === 'scoring' && (
          <>
            <section>
              <h3 className="mb-1 text-2xl text-green-400 uppercase">{t('helpScoringTitle')}</h3>
              <ul className="list-disc space-y-1 pl-6">
                <li>{t('helpScoring1')}</li>
                <li>{t('helpScoring2')}</li>
              </ul>
            </section>
            <section className="rounded border border-red-900/50 bg-red-900/20 p-3">
              <h3 className="mb-1 text-xl text-red-300 uppercase">{t('helpExampleTitle')}</h3>
              <p className="mb-1">{t('helpExample')}</p>
              <ul className="space-y-0.5 text-base">
                <li>{t('helpExample1')}</li>
                <li>{t('helpExample2')}</li>
                <li>{t('helpExample3')}</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </Sheet>
  );
};
