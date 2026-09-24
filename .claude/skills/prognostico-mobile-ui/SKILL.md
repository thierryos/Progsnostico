---
name: prognostico-mobile-ui
description: Convenções mobile-first e verificação visual por screenshots do Prognóstico. Use ao criar ou alterar qualquer tela ou componente (src/components, src/screens, src/tutorial, src/index.css), ao mexer em layout, espaçamento, tamanho de cartas, breakpoints ou modais, ou quando alguém relatar problema visual ("cortado", "sobreposto", "não cabe no celular", "feio no desktop").
---

# UI mobile first — Prognóstico

O jogo é usado principalmente no **celular em pé**. Desenhe para 360×640 primeiro e só depois
adapte para `short:` (celular deitado), `sm:`, `lg:` (desktop com placar lateral).

## Regras de layout

- **Altura**: a raiz usa `h-dvh` + utilitário `safe-area` (notch/barra de gestos). Nunca use
  `h-screen`/`100vh`. Rodapés fixos somam `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
- **Tela de jogo** (`src/screens/GameScreen.tsx`) é uma coluna: `TopBar` → `OpponentStrip` →
  `Table` (flex-1) → painel inferior (`BidPanel` | `TrickSummaryPanel` | `PlayerBar`) → `Hand`.
  O palpite **nunca cobre a mão**: o jogador decide olhando as cartas.
- **Telas baixas**: variante `short:` (definida em `src/index.css`, `max-height: 520px`). Nelas os
  oponentes sobem para a `TopBar` e os painéis ficam compactos.
- **Cartas**: `PlayingCard` recebe `width` em px e escala tudo via container queries (`cqw`).
  Tamanhos vêm de cálculo, nunca de classes fixas:
  - mão: `Hand.tsx` (cabe na largura, sobreposição automática);
  - mesa: `layoutTable()` em `components/game/tableLayout.ts` — **toda mudança ali precisa
    manter `tableLayout.test.ts` verde** (garante que as cartas não se cobrem em 5 tamanhos × 2–7
    jogadores).
- **Toque**: alvos de no mínimo 40px (`IconButton` = `size-10`, botões `min-h-10`+). Nada pode
  depender de hover (tooltips): a informação fica visível ou aparece no toque. Carta: 1º toque
  seleciona, 2º joga; mouse joga com 1 clique.
- **Modais**: sempre `<Sheet>` (bottom sheet no celular, diálogo centralizado a partir de `sm`).
  Nada de `alert()`/`prompt()`/`confirm()` — use `useNotice()` e `PasswordDialog`.
- **Camadas (z-index)**: conteúdo 0–30 · popovers 40 · sheets 50 · confete 55 · holofote do
  tutorial 60–65 · avisos 70 · pós-processamento CRT 80 (sempre `pointer-events-none`).
  O tutorial destaca elementos pelo **id** — não renomeie: `local-hand`, `trump-card`,
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

## Pós-processamento (identidade "tela de fliperama")

- `components/fx/SwirlBackground.tsx`: shader WebGL em baixa resolução (1 px de shader = 5 px de
  CSS, `image-rendering: pixelated`, 24 fps). Só anima no menu/lista de salas; na mesa congela.
  Fora do menu principal o `App` põe um véu escuro por cima — **conteúdo nunca direto sobre o
  redemoinho**; use painéis/fundos com opacidade ≥ 85%.
- `components/fx/CrtOverlay.tsx`: scanlines + granulado + vinheta + reflexo, só CSS, z-80.
  Animações dele só com `transform` (compositor), nunca `background-position` em tela cheia.
- `.crt-text` aplica aberração cromática em títulos quando o CRT está ligado
  (`[data-crt='on']`, definido por `lib/settings.tsx`). Use só em títulos.
- `font-display` (Jersey 10) é **restrita**: título do menu, manchete de fim de jogo e marca
  d'água da mesa. O resto é `font-pixel` (VT323).
- Tudo pode ser desligado em Configurações (`useSettings()`: `crt`, `motion`); respeite essas
  flags em qualquer efeito novo e não crie efeito que atrapalhe a leitura de cartas/pontos.
- Brilho (`shine`) e `animate-pop` são para momentos de resultado (vaza vencida, pontos), não
  para decoração constante.

## Verificação visual (obrigatória para mudanças de UI)

1. Suba o servidor com o **banco falso** (não toca o Firebase real):
   `npm run dev:fake -- --port 5173 --strictPort` (em segundo plano).
2. Rode as capturas:
   `python .claude/skills/prognostico-mobile-ui/scripts/screenshots.py --out screenshots --sizes small,phone,landscape,desktop`
   (fluxos: `game`, `sheets`, `tutorial`, `online`; filtre com `--flows`).
3. **Abra as imagens** (ferramenta Read) e confira a lista abaixo em cada tamanho.
4. Corrija, repita, e termine com `npm run check`.

### Checklist

- [ ] Nada cortado nas bordas; mão com margem inferior; sem rolagem horizontal.
- [ ] Mesa: cartas e nomes sem se cobrir; selo "naipe puxado" visível.
- [ ] Painel de palpite e resumo não escondem a mão.
- [ ] Botões ≥ 40px e com texto legível; nada depende de hover.
- [ ] Modais roláveis quando o conteúdo é maior que a tela.
- [ ] Desktop: placar lateral visível, mesa sem esticar demais.
- [ ] Textos legíveis com o CRT ligado (scanlines não podem apagar números pequenos).
- [ ] O script terminou com `0 erro(s)` (erros de console contam).
