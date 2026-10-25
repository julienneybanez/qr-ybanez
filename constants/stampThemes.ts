import type Ionicons from '@expo/vector-icons/Ionicons';

export type StampTheme = 'holiday' | 'digital' | 'heritage' | 'victory' | 'classic' | 'academic' | 'creative';

export type StampPalette = {
  background: string;
  ink: string;
  dark: string;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  caption: string;
};

export const STAMP_THEMES: Record<StampTheme, StampPalette> = {
  holiday: { background: '#F9E8E9', ink: '#A33C52', dark: '#6F203C', accent: '#D9B16E', icon: 'gift-outline', caption: 'HOLIDAY EDITION' },
  digital: { background: '#E9EAFD', ink: '#5149AF', dark: '#30287A', accent: '#30BAD2', icon: 'hardware-chip-outline', caption: 'DIGITAL EDITION' },
  heritage: { background: '#F8EEDB', ink: '#97702C', dark: '#624819', accent: '#D9BC72', icon: 'school-outline', caption: 'HERITAGE EDITION' },
  victory: { background: '#FCE9DF', ink: '#B35436', dark: '#80311F', accent: '#DEA557', icon: 'trophy-outline', caption: 'VICTORY EDITION' },
  classic: { background: '#E6F2F5', ink: '#2F7590', dark: '#1A4D60', accent: '#72B6CB', icon: 'calendar-outline', caption: 'CAMPUS EDITION' },
  academic: { background: '#EAF0FC', ink: '#455CA0', dark: '#293C73', accent: '#8FA8DC', icon: 'school-outline', caption: 'LEARNING EDITION' },
  creative: { background: '#F5EAF3', ink: '#9E5687', dark: '#743760', accent: '#D7A9C8', icon: 'color-palette-outline', caption: 'CAMPUS EDITION' },
};

export function regularStampTheme(eventId: string): StampTheme {
  const choices: StampTheme[] = ['classic', 'academic', 'creative'];
  const checksum = Array.from(eventId).reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return choices[checksum % choices.length];
}

export function stampYear(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '' : String(parsed.getFullYear());
}
