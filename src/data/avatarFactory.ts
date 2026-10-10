import type { Accessory, AvatarConfig, Costume, HairStyle, TopStyle } from '../types';
import { hashString } from '../lib/utils';

export const SKIN_TONES = ['#f3d2b8', '#e8bc98', '#d9a47c', '#c08a62', '#9c6a48', '#74492f'];
export const HAIR_COLORS = ['#1b1a1a', '#2e2420', '#4a3426', '#6b4a2f', '#a07a52', '#c9c3bb', '#3b3f46', '#5a2e2a'];
export const TOP_COLORS = ['#2b3038', '#3a4250', '#e7e6e2', '#5b6b7a', '#1f2a36', '#6e5b4a', '#8a9aa6', '#2f4a4f', '#4b3f58', '#a7a39b'];
export const INNER_COLORS = ['#f2f1ee', '#d9dde2', '#1d2228', '#b8c4cc', '#e9e1d4'];
export const BOTTOM_COLORS = ['#1e2227', '#2d333b', '#3d4651', '#4f4a43', '#26303a', '#8b8478'];
export const SHOE_COLORS = ['#141618', '#e8e8e6', '#3a2a20', '#2b2f35'];
export const ACCESSORY_COLORS = ['#1a1d21', '#c8ccd2', '#38d6e8', '#b88a4a'];

/** unlock = そのパーツが選べるようになる個人レベル */
export interface AvatarOption<T> {
  value: T;
  label: string;
  unlock: number;
}

export const HAIR_STYLES: AvatarOption<HairStyle>[] = [
  { value: 'short', label: 'ショート', unlock: 1 },
  { value: 'sidepart', label: 'サイドパート', unlock: 1 },
  { value: 'buzz', label: 'ベリーショート', unlock: 1 },
  { value: 'bob', label: 'ボブ', unlock: 1 },
  { value: 'long', label: 'ロング', unlock: 2 },
  { value: 'bun', label: 'まとめ髪', unlock: 3 },
  { value: 'curly', label: 'カーリー', unlock: 4 },
];

export const TOP_STYLES: AvatarOption<TopStyle>[] = [
  { value: 'shirt', label: 'シャツ', unlock: 1 },
  { value: 'jacket', label: 'ジャケット', unlock: 1 },
  { value: 'knit', label: 'ニット', unlock: 2 },
  { value: 'hoodie', label: 'パーカー', unlock: 3 },
  { value: 'turtleneck', label: 'タートルネック', unlock: 5 },
];

export const ACCESSORIES: AvatarOption<Accessory>[] = [
  { value: 'none', label: 'なし', unlock: 1 },
  { value: 'glasses', label: 'メガネ', unlock: 1 },
  { value: 'headphones', label: 'ヘッドホン', unlock: 3 },
  { value: 'earrings', label: 'イヤリング', unlock: 4 },
  { value: 'beanie', label: 'ニット帽', unlock: 6 },
];

export const COSTUMES: AvatarOption<Costume>[] = [
  { value: 'none', label: 'なし', unlock: 1 },
  { value: 'bear', label: 'くま', unlock: 3 },
  { value: 'cat', label: 'ねこ', unlock: 5 },
  { value: 'rabbit', label: 'うさぎ', unlock: 7 },
  { value: 'panda', label: 'パンダ', unlock: 9 },
  { value: 'dino', label: 'きょうりゅう', unlock: 12 },
  { value: 'penguin', label: 'ペンギン', unlock: 15 },
];

/** 着ぐるみの配色・パーツ定義 */
export const COSTUME_STYLE: Record<Exclude<Costume, 'none'>, { main: string; belly: string; limb?: string; ears: 'round' | 'cone' | 'long' | 'none'; tail: 'ball' | 'long' | 'dino' | 'small'; spikes?: boolean; beak?: boolean }> = {
  bear: { main: '#8a5a3c', belly: '#d9b48f', ears: 'round', tail: 'ball' },
  cat: { main: '#f0a356', belly: '#fbe6cc', ears: 'cone', tail: 'long' },
  rabbit: { main: '#f1eee9', belly: '#f6c8d0', ears: 'long', tail: 'ball' },
  panda: { main: '#f4f4f2', belly: '#f4f4f2', limb: '#1d1e21', ears: 'round', tail: 'ball' },
  dino: { main: '#5fae6e', belly: '#dbe9a6', ears: 'none', tail: 'dino', spikes: true },
  penguin: { main: '#24272e', belly: '#f4f4f2', ears: 'none', tail: 'small', beak: true },
};

const ALL_OPTIONS = { hairStyle: HAIR_STYLES, topStyle: TOP_STYLES, accessory: ACCESSORIES, costume: COSTUMES } as const;

/** レベル from → to の間に新しく解放されたパーツ名 */
export const unlockedBetween = (from: number, to: number) =>
  Object.values(ALL_OPTIONS)
    .flat()
    .filter((o) => o.unlock > from && o.unlock <= to)
    .map((o) => (COSTUMES.some((c) => c.value === o.value) ? `${o.label}の着ぐるみ` : o.label));

export const nextUnlocks = (level: number) =>
  Object.values(ALL_OPTIONS)
    .flat()
    .filter((o) => o.unlock > level)
    .sort((a, b) => a.unlock - b.unlock);

const pick = <T,>(arr: readonly T[], n: number) => arr[n % arr.length];

/** 社員IDから決定的にアバターを生成する（新規社員追加時にも使用） */
export const generateAvatar = (employeeId: string, overrides: Partial<AvatarConfig> = {}): AvatarConfig => {
  const h = hashString(employeeId);
  const r = (shift: number) => (h >>> shift) & 0xff;
  return {
    employeeId,
    skinTone: pick(SKIN_TONES, r(0)),
    hairStyle: pick(HAIR_STYLES.filter((o) => o.unlock <= 2), r(3)).value,
    hairColor: pick(HAIR_COLORS, r(6)),
    topStyle: pick(TOP_STYLES.filter((o) => o.unlock <= 2), r(9)).value,
    topColor: pick(TOP_COLORS, r(12)),
    innerColor: pick(INNER_COLORS, r(15)),
    bottomColor: pick(BOTTOM_COLORS, r(18)),
    shoeColor: pick(SHOE_COLORS, r(21)),
    accessory: r(24) % 3 === 0 ? pick(ACCESSORIES.filter((o) => o.unlock <= 1), r(2)).value : 'none',
    costume: 'none',
    accessoryColor: pick(ACCESSORY_COLORS, r(5)),
    heightScale: 0.95 + (r(10) % 11) / 100,
    ...overrides,
  };
};
