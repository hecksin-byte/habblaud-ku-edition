// Temas de sala (puros). Edição KU: mistura de laboratório de pós-graduação (vinil cinza, paredes verde-acinzentadas ou com
// lâminas de madeira clara, mesa de faia com armário alto, cadeira de tela) com o estilo antigo do Habblaud (porcelanato
// claro, tapete na cor do tema, mesas brancas/madeira/escuras). Sementes vizinhas sempre diferem no piso e no acento.
import type { RoomTheme } from './api';

const THEMES: readonly RoomTheme[] = [
  { carpet: '#cfd2d4', carpet2: '#c3c7ca', wall: { base: '#e5e9df', trim: '#8f9a94', pattern: 'plain' }, accent: '#3f7fd8', deskVariant: 'beech', chairVariant: 'mesh', floor: 'linoleum', rug: false },
  { carpet: '#dbcfba', carpet2: '#d0c2ab', wall: { base: '#f6f0e5', trim: '#b99f7a', pattern: 'stripes' }, accent: '#ec8a3c', deskVariant: 'wood', chairVariant: 'black', floor: 'marble', rug: true },
  { carpet: '#c9d1c9', carpet2: '#bdc7bd', wall: { base: '#dfe6dc', trim: '#8ea08f', pattern: 'plain' }, accent: '#4cae6a', deskVariant: 'beech', chairVariant: 'white', floor: 'linoleum', rug: false },
  { carpet: '#cdc8de', carpet2: '#c2bbd5', wall: { base: '#f3f1f8', trim: '#a59cc4', pattern: 'plain' }, accent: '#8d66cf', deskVariant: 'white', chairVariant: 'gray', floor: 'marble', rug: true },
  { carpet: '#d6cfc8', carpet2: '#cbc3bb', wall: { base: '#efe9df', trim: '#a39a8a', pattern: 'veneer' }, accent: '#e2604f', deskVariant: 'beech', chairVariant: 'mesh', floor: 'linoleum', rug: true },
  { carpet: '#bfd9d2', carpet2: '#b2cfc7', wall: { base: '#eef6f4', trim: '#7fb3a6', pattern: 'stripes' }, accent: '#36b0b0', deskVariant: 'white', chairVariant: 'green', floor: 'marble', rug: true },
  { carpet: '#c4c6c8', carpet2: '#b9bbbe', wall: { base: '#e7e8e6', trim: '#7f858b', pattern: 'plain' }, accent: '#f2c14e', deskVariant: 'beech', chairVariant: 'mesh', floor: 'linoleum', rug: false },
  { carpet: '#e0cad2', carpet2: '#d6bdc6', wall: { base: '#f9f2f4', trim: '#c08ea0', pattern: 'stripes' }, accent: '#e47aa8', deskVariant: 'wood', chairVariant: 'black', floor: 'marble', rug: true },
  { carpet: '#c9d0d6', carpet2: '#bdc5cc', wall: { base: '#e4e9ee', trim: '#8aa0b6', pattern: 'veneer' }, accent: '#5b8fe0', deskVariant: 'beech', chairVariant: 'white', floor: 'linoleum', rug: true },
  { carpet: '#d1c5b8', carpet2: '#c5b8aa', wall: { base: '#f4efe8', trim: '#8a6a52', pattern: 'wood_panel' }, accent: '#c9713f', deskVariant: 'dark', chairVariant: 'gray', floor: 'marble', rug: true },
];

export const THEME_COUNT = THEMES.length;

export function roomTheme(seed: number): RoomTheme {
  const n = THEMES.length;
  const t = THEMES[((Math.floor(seed) % n) + n) % n];
  return { ...t, wall: { ...t.wall } };
}
