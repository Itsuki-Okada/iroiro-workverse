// ============================================================
// オフィス内の通路網と経路探索
// アバターや猫が壁・デスクをすり抜けずに歩けるよう、
// 廊下のノードと各エリアの出入り口までの経路を定義する。
// ============================================================
import { AREAS, DEPT_ZONES, rectCenter, zoneGrid } from './layout';

export type P2 = [number, number];

/** 廊下・共用部のノード */
const NODES: Record<string, P2> = {
  A: [-20.25, -3.3],
  B: [0, -3.3],
  C: [20.25, -3.3],
  D: [-9.4, -3.2],
  E: [9.4, -3.2],
  F: [-9.5, 4],
  G: [9.5, 4],
  H: [-9.4, 12.5],
  I: [9.4, 12.5],
  J: [-20.25, 12.3],
  K: [-13.2, 12.5],
  MR: [-13.0, 14.0],
  L: [20.25, 12.3],
  M: [13.0, 12.5],
  P: [20.0, 14.7],
  R: [0, 6.6],
  U: [-7.2, 12.5],
  U2: [7.2, 12.5],
  V: [-7.2, 17.8],
  V2: [7.2, 17.8],
  DOOR: [0, 19.8],
  OUT: [0, 23.5],
  LF: [0, 4.6],
  LW: [-4.2, 4.1],
  LWb: [-4.2, -2.3],
  LE: [4.2, 4.1],
  LEb: [4.2, -2.3],
};

const EDGES: [string, string][] = [
  ['A', 'D'], ['D', 'B'], ['B', 'E'], ['E', 'C'],
  ['D', 'F'], ['F', 'H'], ['E', 'G'], ['G', 'I'],
  ['H', 'K'], ['K', 'J'], ['K', 'MR'], ['H', 'U'], ['I', 'U2'], ['I', 'M'], ['M', 'L'], ['L', 'P'], ['M', 'P'],
  ['U', 'V'], ['U2', 'V2'], ['V', 'DOOR'], ['V2', 'DOOR'], ['DOOR', 'OUT'],
  ['R', 'LF'], ['R', 'U'], ['R', 'U2'],
  ['LF', 'LW'], ['LF', 'LE'], ['LW', 'LWb'], ['LE', 'LEb'], ['LWb', 'B'], ['LEb', 'B'],
  ['LW', 'F'], ['LE', 'G'], ['LWb', 'D'], ['LEb', 'E'],
];

const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

const ADJ: Record<string, string[]> = {};
for (const [a, b] of EDGES) {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}

/** ノード間の最短経路（ダイクストラ法） */
const shortest = (from: string, to: string): string[] => {
  if (from === to) return [from];
  const d: Record<string, number> = { [from]: 0 };
  const prev: Record<string, string> = {};
  const open = new Set(Object.keys(NODES));
  while (open.size) {
    let u: string | null = null;
    for (const n of open) if (d[n] !== undefined && (u === null || d[n] < d[u])) u = n;
    if (u === null) break;
    open.delete(u);
    if (u === to) break;
    for (const v of ADJ[u] ?? []) {
      const nd = d[u] + dist(NODES[u], NODES[v]);
      if (d[v] === undefined || nd < d[v]) {
        d[v] = nd;
        prev[v] = u;
      }
    }
  }
  const path = [to];
  while (path[0] !== from && prev[path[0]]) path.unshift(prev[path[0]]);
  return path[0] === from ? path : [from, to];
};

export const nearestNode = (p: P2, candidates = Object.keys(NODES)) =>
  candidates.reduce((best, n) => (dist(NODES[n], p) < dist(NODES[best], p) ? n : best), candidates[0]);

/** 経路計算に使う「居場所」 */
export interface NavSpot {
  x: number;
  z: number;
  rotY: number;
  location: 'desk' | 'meeting' | 'lounge' | 'ceo' | 'gather' | 'entrance';
  pose?: 'sit' | 'stand';
}

export const ENTRANCE: NavSpot = { x: 0, z: 23.5, rotY: Math.PI, location: 'entrance', pose: 'stand' };

/** 正面方向（local -Z）のベクトル */
const forward = (rotY: number): P2 => [-Math.sin(rotY), -Math.cos(rotY)];

const inRect = (p: P2, r: { x0: number; x1: number; z0: number; z1: number }) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.z0 && p[1] <= r.z1;

/** 居場所から最寄りの廊下ノードまでの経路 */
export const exitPath = (s: NavSpot): { pts: P2[]; node: string } => {
  const p: P2 = [s.x, s.z];
  switch (s.location) {
    case 'entrance':
      return { pts: [p], node: 'OUT' };
    case 'gather':
      return { pts: [p], node: 'R' };
    case 'ceo':
      return { pts: [p, [23.6, -17.2], [23.2, -12.2], [23.2, -10.3], [23.2, -5.8], [20.25, -5.8], [20.25, -4.1]], node: 'C' };
    case 'meeting': {
      const [, cz] = rectCenter(AREAS.meeting);
      const f = forward(s.rotY);
      const back: P2 = [s.x - f[0] * 0.55, s.z - f[1] * 0.55];
      const wz = s.z > cz + 0.5 ? 18.8 : 13.75;
      return { pts: [p, back, [back[0], wz], [-15.0, wz], [-15.0, 14.0]], node: 'MR' };
    }
    case 'lounge': {
      const f = forward(s.rotY);
      const approach: P2 = s.pose === 'sit' ? [s.x + f[0] * 0.55, s.z + f[1] * 0.55] : p;
      if (inRect(p, AREAS.cafe)) return { pts: [p, approach], node: 'P' };
      return { pts: [p, approach], node: nearestNode(approach, ['LF', 'LW', 'LE', 'LWb', 'LEb']) };
    }
    case 'desk': {
      const zone = DEPT_ZONES.find((z) => inRect(p, z.rect));
      if (!zone) return { pts: [p], node: nearestNode(p) };
      const { aisleX, aisleZ } = zoneGrid(zone.deskArea);
      const gx = (zone.rect.x0 + zone.rect.x1) / 2;
      // 作業者は local +Z 側に座る → 後ろの通路へ
      const behind = Math.abs(s.rotY) < 0.1;
      const az = behind ? aisleZ.find((z) => z > s.z) ?? aisleZ[aisleZ.length - 1] : [...aisleZ].reverse().find((z) => z < s.z) ?? aisleZ[0];
      const vx = aisleX.reduce((b, x) => (Math.abs(x - gx) < Math.abs(b - gx) ? x : b), aisleX[0]);
      const edgeZ = zone.rect.z1 - 0.5;
      const outZ = zone.rect.z1 + 0.9;
      const node = zone.rect.z0 < -15 ? nearestNode([gx, outZ], ['A', 'B', 'C']) : nearestNode([gx, outZ], ['J', 'L']);
      return { pts: [p, [s.x, az], [vx, az], [vx, edgeZ], [gx, edgeZ], [gx, outZ]], node };
    }
  }
};

/** 2地点間の歩行ルート。from が null の場合は現在位置から最寄りノードへ */
export const planRoute = (from: NavSpot | P2, to: NavSpot): P2[] => {
  const a = Array.isArray(from) ? { pts: [from as P2], node: nearestNode(from as P2) } : exitPath(from);
  const b = exitPath(to);
  const mid = shortest(a.node, b.node).map((n) => NODES[n]);
  const raw = [...a.pts, ...mid, ...[...b.pts].reverse()];
  // 近すぎる点を間引く
  const out: P2[] = [];
  for (const q of raw) if (!out.length || dist(out[out.length - 1], q) > 0.05) out.push(q);
  return out;
};

export const routeLength = (pts: P2[]) => pts.slice(1).reduce((s, q, i) => s + dist(pts[i], q), 0);

/** 猫の散歩先候補（廊下・共用部のノード） */
export const WANDER_NODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'P', 'R', 'U', 'U2', 'LF', 'LW', 'LE', 'LWb', 'LEb'];
export const nodePos = (n: string) => NODES[n];

/** 現在地から指定ノードまでのルート（猫の散歩用） */
export const routeToNode = (from: P2, node: string): P2[] => [from, ...shortest(nearestNode(from), node).map((n) => NODES[n])];
