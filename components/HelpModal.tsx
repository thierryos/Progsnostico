
import React, { useState } from 'react';
import { X, BookOpen, Trophy, Shield, Info } from 'lucide-react';
import { t } from '../services/i18n';
import { Language } from '../types';
import { CardHierarchy } from './CardHierarchy';

interface HelpModalProps {
  lang: Language;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ lang, onClose }) => {
  const [tab, setTab] = useState<'basics' | 'cards' | 'scoring'>('basics');

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm font-pixel p-4">
      <div className="bg-slate-900 border-4 border-balatro-gold rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative animate-in zoom-in-95">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white hover:rotate-90 transition-all">
          <X size={32} />
        </button>

        <div className="p-6 border-b-4 border-slate-800 bg-slate-950 rounded-t-xl flex justify-between items-center">
           <h2 className="text-3xl text-balatro-gold uppercase font-bold flex items-center gap-3">
             <BookOpen /> Manual de Jogo
           </h2>
        </div>

        <div className="flex border-b-2 border-slate-700 bg-slate-800">
           <button 
             onClick={() => setTab('basics')}
             className={`flex-1 py-4 text-xl uppercase font-bold transition-colors ${tab === 'basics' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
           >
             Regras Básicas
           </button>
           <button 
             onClick={() => setTab('cards')}
             className={`flex-1 py-4 text-xl uppercase font-bold transition-colors ${tab === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
           >
             Cartas e Força
           </button>
           <button 
             onClick={() => setTab('scoring')}
             className={`flex-1 py-4 text-xl uppercase font-bold transition-colors ${tab === 'scoring' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}
           >
             Pontuação
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 text-slate-200 text-lg leading-relaxed custom-scrollbar bg-[#1a1a1a]">
            {tab === 'basics' && (
                <div className="space-y-6">
                    <section>
                        <h3 className="text-balatro-blue text-2xl mb-2 font-bold uppercase">Objetivo</h3>
                        <p>Prever exatamente quantos "duelos" (tricks) você vai vencer em cada rodada. Acertar o palpite é crucial para pontuar.</p>
                    </section>
                    <section>
                        <h3 className="text-balatro-blue text-2xl mb-2 font-bold uppercase">Fluxo da Rodada</h3>
                        <ol className="list-decimal pl-6 space-y-2 marker:text-balatro-gold">
                            <li><strong>Distribuição:</strong> Todos recebem um número de cartas igual ao número da rodada.</li>
                            <li><strong>Trunfo:</strong> Uma carta é virada para definir o naipe Trunfo (que vence os outros).</li>
                            <li><strong>Apostas:</strong> Cada jogador olha suas cartas e diz quantos duelos acha que vai vencer.</li>
                            <li><strong>Jogo:</strong> Ocorre a disputa das cartas.</li>
                        </ol>
                    </section>
                    <section className="bg-slate-800 p-4 rounded-lg border border-slate-700 mt-4">
                        <h4 className="text-white text-xl mb-2 font-bold flex items-center gap-2"><Info size={20} /> Modos de Jogo</h4>
                        <ul className="space-y-3">
                            <li>
                                <span className="text-balatro-gold font-bold">CLÁSSICO (SOBE):</span> As rodadas começam com 1 carta e aumentam até o máximo do baralho. Quem tiver mais pontos no final vence.
                            </li>
                            <li>
                                <span className="text-balatro-gold font-bold">PIRÂMIDE:</span> As rodadas sobem até o máximo e depois descem de volta para 1 carta. Um jogo mais longo.
                            </li>
                        </ul>
                    </section>
                </div>
            )}

            {tab === 'cards' && (
                <div className="space-y-8">
                    <section className="bg-black/30 p-4 rounded-xl border border-slate-700">
                        <h3 className="text-balatro-gold text-xl mb-4 font-bold uppercase text-center">Hierarquia de Força</h3>
                        <div className="flex justify-center scale-125 my-4">
                            <CardHierarchy />
                        </div>
                        <p className="text-center text-sm text-slate-400 mt-4">O Ás (A) é a carta mais forte. O 2 é a mais fraca.</p>
                    </section>
                    
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Shield size={18} /> Naipe Mandante (Lead)</h4>
                            <p className="text-sm text-slate-300">
                                O naipe da primeira carta jogada no duelo define o "Naipe Mandante". 
                                <br/><br/>
                                <span className="text-red-400 font-bold">REGRA DE OURO:</span> Se você tiver uma carta desse naipe, você é <strong>OBRIGADO</strong> a jogá-la.
                            </p>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                            <h4 className="text-balatro-gold font-bold mb-2 flex items-center gap-2"><Trophy size={18} /> Trunfo (Trump)</h4>
                            <p className="text-sm text-slate-300">
                                O naipe do Trunfo vence qualquer outro naipe. Se você não tiver o naipe mandante, pode jogar um Trunfo para tentar vencer.
                            </p>
                        </div>
                    </section>
                </div>
            )}

            {tab === 'scoring' && (
                <div className="space-y-6">
                    <section>
                        <h3 className="text-green-400 text-2xl mb-2 font-bold uppercase">Ganhando Pontos</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Cada duelo vencido vale <strong>1 ponto</strong>.</li>
                            <li>Se você acertar exatamente seu palpite (ex: apostou 2, venceu 2), ganha um bônus de <strong>+5 pontos</strong>.</li>
                        </ul>
                    </section>
                    <section className="bg-red-900/20 p-4 rounded border border-red-900/50">
                        <h3 className="text-red-400 text-xl mb-2 font-bold uppercase">Exemplo</h3>
                        <p className="mb-2">Você apostou <strong>2</strong> vitórias.</p>
                        <ul className="text-sm space-y-1">
                            <li>Se vencer 2: Ganha 2 (pelos duelos) + 5 (bônus) = <strong>7 Pontos</strong>.</li>
                            <li>Se vencer 3: Ganha 3 pontos (perde o bônus).</li>
                            <li>Se vencer 1: Ganha 1 ponto (perde o bônus).</li>
                        </ul>
                    </section>
                </div>
            )}
        </div>
        
        <div className="p-4 bg-slate-950 rounded-b-xl border-t-2 border-slate-800 text-center text-slate-500 text-sm">
             Consulte este manual a qualquer momento clicando no ícone de Ajuda (?) no topo.
        </div>
      </div>
    </div>
  );
};
