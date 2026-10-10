export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** ローカルタイムでの YYYY-MM-DD */
export const toDateKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayKey = () => toDateKey(new Date());

export const addDays = (days: number, from: Date = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

export const formatTime = (iso?: string) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateJa = (d: Date = new Date()) => {
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${w}）`;
};

export const formatShortDate = (key: string | null) => {
  if (!key) return '期限なし';
  const [, m, d] = key.split('-');
  return `${Number(m)}/${Number(d)}`;
};

export const relativeTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'たった今';
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** 文字列から安定したハッシュ値（アバター自動生成などに使用） */
export const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
