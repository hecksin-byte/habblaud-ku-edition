// Temas de sala (puros). Edição KU: laboratório de pós-graduação — vinil cinza, paredes claras (verde-acinzentado e creme, às
// vezes com lâminas de madeira clara como a frente de uma sala de aula), mesas de madeira clara com armário alto e cadeira
// de tela. As salas se distinguem pelo tom do piso, da parede e pelo acento (sementes vizinhas sempre diferem).
import type { RoomTheme } from './api';

const THEMES: readonly RoomTheme[] = [
  { carpet: '#cfd2d4', carpet2: '#c3c7ca', wall: { base: '#e5e9df', trim: '#8f9a94', pattern: 'plain' }, accent: '#3f7fd8', deskVariant: 'beech', chairVariant: 'mesh' },
  { carpet: '#d4d1c9', carpet2: '#c9c5bc', wall: { base: '#eceae0', trim: '#9b968a', pattern: 'veneer' }, accent: '#ec8a3c', deskVariant: 'beech', chairVariant: 'white' },
  { carpet: '#c9d1c9', carpet2: '#bdc7bd', wall: { base: '#dfe6dc', trim: '#8ea08f', pattern: 'plain' }, accent: '#4cae6a', deskVariant: 'beech', chairVariant: 'mesh' },
  { carpet: '#cfd0d8', carpet2: '#c3c4cd', wall: { base: '#e8ebee', trim: '#9aa4b0', pattern: 'plain' }, accent: '#8d66cf', deskVariant: 'beech', chairVariant: 'mesh' },
  { carpet: '#d6cfc8', carpet2: '#cbc3bb', wall: { base: '#efe9df', trim: '#a39a8a', pattern: 'veneer' }, accent: '#e2604f', deskVariant: 'beech', chairVariant: 'white' },
  { carpet: '#c8d3d0', carpet2: '#bcc8c4', wall: { base: '#e2ece7', trim: '#86a79b', pattern: 'plain' }, accent: '#36b0b0', deskVariant: 'beech', chairVariant: 'mesh' },
  { carpet: '#c4c6c8', carpet2: '#b9bbbe', wall: { base: '#e7e8e6', trim: '#7f858b', pattern: 'plain' }, accent: '#f2c14e', deskVariant: 'beech', chairVariant: 'mesh' },
  { carpet: '#d3cccb', carpet2: '#c8c0bf', wall: { base: '#eee7e6', trim: '#a79594', pattern: 'plain' }, accent: '#e47aa8', deskVariant: 'beech', chairVariant: 'white' },
  { carpet: '#c9d0d6', carpet2: '#bdc5cc', wall: { base: '#e4e9ee', trim: '#8aa0b6', pattern: 'veneer' }, accent: '#5b8fe0', deskVariant: 'beech', chairVariant: 'mesh' },
  { carpet: '#d0cbc2', carpet2: '#c5bfb5', wall: { base: '#ebe5da', trim: '#8f8573', pattern: 'plain' }, accent: '#c9713f', deskVariant: 'beech', chairVariant: 'mesh' },
];

export const THEME_COUNT = THEMES.length;

export function roomTheme(seed: number): RoomTheme {
  const n = THEMES.length;
  const t = THEMES[((Math.floor(seed) % n) + n) % n];
  return { ...t, wall: { ...t.wall } };
}
