
import React from 'react';
import { TutorialStep, Language } from '../types';
import { t } from '../services/i18n';
import { ArrowRight, X, LogOut, Play, Check } from 'lucide-react';
import { playSound } from '../services/soundService';

interface TutorialOverlayProps {
  step: number;
  lang: Language;
  onNext: () => void;
  onClose: () => void;
  onContinuePlaying?: () => void;
}

const STEPS: TutorialStep[] = [
  { id: 0, textKey: 'tut_welcome', position: 'center' },
  { id: 1, textKey: 'tut_cards', highlightId: 'local-hand', position: 'center' }, 
  { id: 2, textKey: 'tut_trump', highlightId: 'trump-area', position: 'bottom' },
  { id: 3, textKey: 'tut_bid_intro', position: 'center' },
  { id: 4, textKey: 'tut_bid_action', highlightId: 'bid-btn-2', position: 'top', actionRequired: 'bid' },
  { id: 5, textKey: 'tut_lead_suit', highlightId: 'table-area', position: 'bottom' },
  { id: 6, textKey: 'tut_play_action', highlightId: 'card-AD', position: 'top', actionRequired: 'play_card' },
  
  // Explanation on table for Trick 1
  { id: 7, textKey: 'tut_explain_1', position: 'bottom' }, 
  // Winner Screen 1
  { id: 8, textKey: 'tut_result_1', position: 'bottom' },
  
  // New Step: History Check
  { id: 9, textKey: 'tut_check_history', highlightId: 'history-btn', position: 'top', actionRequired: 'click_history' },

  { id: 10, textKey: 'tut_trick_2', highlightId: 'card-c2', position: 'top', actionRequired: 'play_card' },
  
  // Explanation on table for Trick 2
  { id: 11, textKey: 'tut_explain_2', position: 'bottom' }, 
  // Winner Screen 2
  { id: 12, textKey: 'tut_result_2', position: 'top' }, 
  
  { id: 13, textKey: 'tut_trick_3', highlightId: 'card-c1', position: 'top', actionRequired: 'play_card' },
  
  // Explanation on table for Trick 3
  { id: 14, textKey: 'tut_explain_3', position: 'bottom' },
  // Winner Screen 3
  { id: 15, textKey: 'tut_result_3', position: 'top' },

  { id: 16, textKey: 'tut_score_math', highlightId: 'scoreboard', position: 'center' },
  
  // New Step: Help/Hierarchy
  { id: 17, textKey: 'tut_help_hierarchy', highlightId: 'help-btn', position: 'top' },

  { id: 18, textKey: 'tut_end_choice', position: 'center', actionRequired: 'next' },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, lang, onNext, onClose, onContinuePlaying }) => {
  const currentStep = STEPS[step];
  if (!currentStep) return null;

  const handleNext = () => {
    playSound('flip');
    onNext();
  };

  const isActionStep = currentStep.actionRequired === 'bid' || currentStep.actionRequired === 'play_card';
  // Allow "Next" button on click_history steps just in case the mask blocks interactions
  const showNextButton = !isActionStep && step !== 18; 

  const isChoiceStep = step === 18; 

  let posClasses = "";
  if (currentStep.position === 'center') posClasses = "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
  if (currentStep.position === 'top') posClasses = "top-24 lg:top-16 left-1/2 -translate-x-1/2"; 
  if (currentStep.position === 'bottom') posClasses = "bottom-32 lg:bottom-40 left-1/2 -translate-x-1/2";

  return (
    <>
      <div className="absolute inset-0 z-[990] bg-black/50 cursor-not-allowed"></div>

      <button 
          onClick={onClose}
          className="absolute top-4 left-4 z-[1000] bg-red-900 text-white px-4 py-2 rounded border border-red-500 hover:bg-red-800 flex items-center gap-2 font-pixel"
      >
          <LogOut size={16} /> {t(lang, 'exitTutorial')}
      </button>

      <div className={`absolute z-[999] flex flex-col items-center w-full max-w-xl px-4 ${posClasses} transition-all duration-500 pointer-events-auto`}>
         <div className="bg-[#1a1c23] border-4 border-balatro-gold p-6 rounded-2xl w-full shadow-[0_0_50px_rgba(234,179,8,0.3)] animate-in zoom-in-95 duration-300 relative">
            
            {currentStep.position === 'top' && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-balatro-gold rotate-45 border-r-4 border-b-4 border-balatro-gold"></div>
            )}
            
            <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2">
               <div className="text-balatro-gold font-bold uppercase tracking-widest text-xs">
                  Tutorial {step + 1}/{STEPS.length}
               </div>
            </div>
            
            <p className="text-white text-xl font-pixel mb-6 leading-relaxed">
               {t(lang, currentStep.textKey)}
            </p>

            {showNextButton && (
                <div className="flex justify-end">
                    <button 
                      onClick={handleNext}
                      className="bg-balatro-blue text-white px-6 py-2 rounded-lg font-bold uppercase hover:brightness-110 flex items-center gap-2 border-b-4 border-blue-900 active:translate-y-1 active:border-b-0 shadow-lg"
                    >
                       {t(lang, 'next')} <ArrowRight size={20} />
                    </button>
                </div>
            )}
            
            {isChoiceStep && (
                <div className="flex flex-col gap-3">
                    <button 
                      onClick={onClose}
                      className="w-full bg-slate-700 text-white px-6 py-3 rounded-lg font-bold uppercase hover:brightness-110 flex items-center justify-center gap-2 border-b-4 border-slate-900 active:translate-y-1 active:border-b-0 shadow-lg"
                    >
                       <Check size={20} /> {t(lang, 'endTutorial')}
                    </button>
                </div>
            )}

            {isActionStep && (
                <div className="text-right text-yellow-400 text-sm animate-pulse uppercase font-bold">
                   {t(lang, 'yourTurn')}...
                </div>
            )}
         </div>
      </div>
    </>
  );
};

export const getHighlightId = (step: number) => {
    return STEPS[step]?.highlightId;
}
