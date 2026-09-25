---
name: prognostico-mobile-ui
description: Convenções mobile-first e verificação visual por screenshots do Prognóstico. Use ao criar ou alterar qualquer tela ou componente (src/components, src/screens, src/tutorial, src/index.css), ao mexer em layout, espaçamento, tamanho de cartas, breakpoints ou modais, ou quando alguém relatar problema visual ("cortado", "sobreposto", "não cabe no celular", "feio no desktop").
---

# UI mobile first — Prognóstico

O jogo é usado principalmente no **celular em pé**. Desenhe para 360×640 primeiro e só depois
adapte para `short:` (celular deitado), `sm:`, `lg:` (desktop com placar lateral).

**PC também importa**: em monitores grandes a interface cresce junto (`html { font-size }` sobe
para 17/20/24px em `src/index.css`), então **meça tudo em rem** (classes do Tailwind). Valores em
px só quando vierem de cálculo (cartas, mesa); ícones dentro de `IconButton` já escalam sozinhos.

## Regras de layout

- **Altura**: a raiz usa `h-dvh` + utilitário `safe-area` (notch/barra de gestos). Nunca use
  `h-screen`/`100vh`. Rodapés fixos somam `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
- **Tela de jogo** (`src/screens/GameScreen.tsx`) é uma coluna: `TopBar` → `OpponentStrip` →
  `Table` (flex-1) → painel inferior (`BidPanel` | `TrickSummaryPanel` | `PlayerBar`) → `Hand`.
  O palpite **nunca cobre a mão**: o jogador decide olhando as cartas. No `lg` a `OpponentStrip`
  some (placar lateral + assentos da mesa já mostram os oponentes).
- **Telas baixas**: variante `short:` (definida em `src/index.css`, `max-height: 520px`). Nelas os
  oponentes sobem para a `TopBar` e os painéis ficam compactos.
- **Cartas**: `PlayingCard` recebe `width` em px e escala tudo via container queries (`cqw`).
  É "3D estilo Balatro" em camadas: raiz (tamanho/perspectiva/animações de quem usa), corpo
  (`idle` = balanço com a propriedade `rotate`; `tilt` = inclinação do mouse via `transform`) e
  face. `trump` aplica película holográfica + coroa — **toda carta de trunfo exibida deve
  receber `trump`** (mão, mesa, histórico), é o que ensina o iniciante a reconhecê-lo.
  Tamanhos vêm de cálculo, nunca de classes fixas:
  - mão: `Hand.tsx` (cabe na largura, sobreposição automática);
  - mesa: `planTable()` em `components/game/tableLayout.ts` decide tudo junto — anel (cartas
    no assento de cada um, com assentos vazios marcando a vez) ou fileira, selo do naipe puxado e
    painel do trunfo (canto no anel; lateral na mesa baixa; na barra do topo só se não couber).
    O painel e o selo escalam com a mesa (`tableScale`): no PC o trunfo fica grande. **Toda
    mudança ali precisa manter `tableLayout.test.ts` verde** (8 tamanhos, de 360×640 a
    1920×960, × 2–7 jogadores: nada se cobre e o trunfo aparece grande em tablet/notebook/PC).
- **Toque**: alvos de no mínimo 40px (`IconButton` = `size-10`, botões `min-h-10`+). Nada pode
  depender de hover (tooltips): a informação fica visível ou aparece no toque. Carta: 1º toque
  seleciona, 2º joga; mouse joga com 1 clique.
- **Modais**: sempre `<Sheet>` (bottom sheet no celular, diálogo centralizado a partir de `sm`).
  Nada de `alert()`/`prompt()`/`confirm()` — use `useNotice()` e `PasswordDialog`.
- **Botão voltar** (Android/navegador): `useBackHandler()` (`lib/back.ts`). O `Sheet` já fecha
  com voltar; a partida pede confirmação; a sala de espera sai da sala. Tela nova com estado
  interno (ex.: formulário) deve registrar o seu.
- **Para leigos**: a barra do jogador explica o que pode ser jogado ("Você precisa jogar Copas",
  "Sem Copas: jogue qualquer carta — trunfo vence!"), o selo embaixo de PALPITE/FEITAS diz a meta
  ("FALTA 1", "NA MOSCA", "EVITE VENCER", "ESTOUROU") e o resumo da vaza diz por que alguém venceu.
  Oponentes mostram o palpite como bolinhas (`BidPips`). Mudou regra de jogada? Atualize as dicas.
- **PC**: atalhos em `GameScreen` via `useKeyboard` (número = palpite; Enter/Espaço = próximo
  duelo/rodada), com a tecla indicada por `<Kbd>` (só aparece com mouse: `pointer-fine:`). A aba do
  navegador mostra "▶ SUA VEZ" quando é a sua vez.
- **Camadas (z-index)**: conteúdo 0–30 · popovers 40 · sheets 50 · confete 55 · holofote do
  tutorial 60–65 · avisos 70 · pós-processamento CRT 80 (sempre `pointer-events-none`).
  O tutorial destaca elementos pelo **id** — não renomeie: `local-hand`, `trump-card` (painel da
  mesa; se estiver escondido usa `trump-card-fallback`, o chip do topo),
  `table-area`, `trick-summary`, `round-summary`, `history-btn`, `help-btn`, `bid-btn-N`,
  `card-<rank>-<naipe>`.

## Estilo visual

- Tokens em `@theme` (`src/index.css`): `balatro-*`, `felt`, `wood`, cores de naipe
  (`SUIT_TEXT`/`SUIT_TEXT_ON_DARK` em `components/SuitIcon.tsx`, baralho de 4 cores).
- Fonte `font-pixel` (VT323) tem letras pequenas: texto corrido ≥ `text-base`, rótulos ≥ `text-sm`.
- Botões de ação usam `<Button variant=…>` (borda inferior que "afunda"); não recrie estilos.
- Todo texto visível passa por `t('chave')` (`src/i18n/pt.ts` é a fonte; `en.ts`/`es.ts` são
  tipados e o TypeScript acusa chave faltando).
- Respeite `prefers-reduced-motion` (já global) — animações só com classes `animate-*`.

## Pós-processamento (efeitos de tela)

- Níveis em Configurações (`useSettings().screenFx`): `off`, `soft` (padrão) e `retro`.
  O atributo `data-fx` no `<html>` controla os títulos `.crt-text` (brilho no Suave,
  aberração cromática no Retrô).
- `components/fx/ScreenFx.tsx` (z-80, sem toques): Suave = vinheta + granulado fino + luz quente;
  Retrô = Suave + linhas de TV com **perfil suave** (`crt-scanlines`). **Nunca** use linhas com
  borda dura de 1px: em telas 2,6x/2,75x (Android) elas viram listras irregulares sobre as cartas.
- `components/fx/SwirlBackground.tsx`: shader liso em 1/3 da resolução com dithering (sem faixas).
  Anima só nos menus; na mesa congela. Fora do menu principal há um véu escuro por cima —
  conteúdo nunca direto sobre o redemoinho.
- Mesa: madeira com relevo, feltro com `felt-fibers` e foco de luz central.
- `components/fx/WinBurst.tsx` (faíscas + "+1") e `shine` na carta vencedora; `animate-glow-pulse`
  para chamar atenção (sua vez). Efeitos só em momentos de resultado, não como decoração constante.
- `font-display` (Jersey 10) é restrita: título, manchete de fim de jogo, marca d'água, "+1".
- Animações só com `transform`/`opacity`/`box-shadow` locais; nada de filtro em tela cheia.

## Verificação visual (obrigatória para mudanças de UI)

1. Suba o servidor com o **banco falso** (não toca o Firebase real):
   `npm run dev:fake -- --port 5173 --strictPort` (em segundo plano).
2. Rode as capturas:
   `python .claude/skills/prognostico-mobile-ui/scripts/screenshots.py --out screenshots --sizes small,phone,landscape,laptop,wide`
   (fluxos: `game`, `sheets`, `tutorial`, `online`, `routes`; filtre com `--flows`. Tamanhos:
   `small` 360×640, `phone` 390×844, `landscape` 844×390, `tablet` 768×1024, `laptop` 1366×768,
   `desktop` 1280×800, `wide` 1920×950 = monitor Full HD com a barra do navegador).
3. **Abra as imagens** (ferramenta Read) e confira a lista abaixo em cada tamanho.
4. Corrija, repita, e termine com `npm run check`.

### Checklist

- [ ] Nada cortado nas bordas; mão com margem inferior; sem rolagem horizontal.
- [ ] Mesa: cartas e nomes sem se cobrir; selo "naipe puxado" visível.
- [ ] Painel de palpite e resumo não escondem a mão.
- [ ] Botões ≥ 40px e com texto legível; nada depende de hover.
- [ ] Modais roláveis quando o conteúdo é maior que a tela.
- [ ] Desktop: placar lateral visível, mesa sem esticar demais, trunfo grande na mesa.
- [ ] Sem listras sobre as cartas no modo Suave; no Retrô, textos pequenos continuam legíveis.
- [ ] O script terminou com `0 erro(s)` (erros de console contam).
