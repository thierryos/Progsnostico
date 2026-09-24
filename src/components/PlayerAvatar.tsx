import { Bot } from 'lucide-react';
import type { Player } from '../game/types';

/** Paleta dos avatares (cores da identidade, distintas entre si). */
const COLORS = ['#009dff', '#fe3e3e', '#eab308', '#22c55e', '#a855f7', '#ff9f00', '#14b8a6'];

const colorFor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
};

interface PlayerAvatarProps {
  player: Pick<Player, 'id' | 'name' | 'isBot'>;
  size?: number;
  className?: string;
}

/** Avatar quadrado "de pixel": inicial do nome na cor do jogador; bots em cinza. */
export const PlayerAvatar = ({ player, size = 40, className = '' }: PlayerAvatarProps) => (
  <span
    aria-hidden
    className={`pixel-bevel grid shrink-0 place-items-center rounded-[6px] border-2 border-black/40 text-white [text-shadow:0_2px_0_rgb(0_0_0/0.4)] ${className}`}
    style={{
      width: size,
      height: size,
      fontSize: size * 0.62,
      background: player.isBot ? '#475569' : colorFor(player.id),
    }}
  >
    {player.isBot ? <Bot size={size * 0.55} /> : player.name.charAt(0).toUpperCase()}
  </span>
);
