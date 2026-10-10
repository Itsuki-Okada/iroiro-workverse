// ============================================================
// オフィスの空間レイアウト定義（3D表示専用データ）
// 座標系: X = 左右, Z = 手前(+)/奥(-), 単位 = メートル相当
// ============================================================

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const rectCenter = (r: Rect): [number, number] => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
export const rectSize = (r: Rect): [number, number] => [r.x1 - r.x0, r.z1 - r.z0];

export const BUILDING: Rect = { x0: -31, x1: 31, z0: -21, z1: 21 };
export const WALL_HEIGHT = 3.6;

export interface DeptZone {
  id: string;
  rect: Rect;
  deskArea: Rect;
  /** 部署サインの位置と向き */
  sign: { x: number; z: number; rotY: number };
  floorTone: string;
}

export const DEPT_ZONES: DeptZone[] = [
  {
    id: 'zone-web',
    rect: { x0: -29.5, x1: -11, z0: -19.5, z1: -5 },
    deskArea: { x0: -28, x1: -12.5, z0: -17.5, z1: -6.5 },
    sign: { x: -20.25, z: -19.3, rotY: 0 },
    floorTone: '#56616d',
  },
  {
    id: 'zone-creative',
    rect: { x0: -9, x1: 9, z0: -19.5, z1: -5 },
    deskArea: { x0: -7.8, x1: 7.8, z0: -17.5, z1: -6.5 },
    sign: { x: 0, z: -19.3, rotY: 0 },
    floorTone: '#5e5c66',
  },
  {
    id: 'zone-admin',
    rect: { x0: 11, x1: 29.5, z0: -19.5, z1: -5 },
    deskArea: { x0: 12.2, x1: 20.2, z0: -17.5, z1: -6.5 },
    sign: { x: 16, z: -19.3, rotY: 0 },
    floorTone: '#56605e',
  },
  {
    id: 'zone-sales',
    rect: { x0: -29.5, x1: -11, z0: -2.5, z1: 10.5 },
    deskArea: { x0: -28, x1: -12.5, z0: -1, z1: 9 },
    sign: { x: -29.3, z: 4, rotY: Math.PI / 2 },
    floorTone: '#525e6a',
  },
  {
    id: 'zone-marketing',
    rect: { x0: 11, x1: 29.5, z0: -2.5, z1: 10.5 },
    deskArea: { x0: 12.5, x1: 28, z0: -1, z1: 9 },
    sign: { x: 29.3, z: 4, rotY: -Math.PI / 2 },
    floorTone: '#605d6c',
  },
];

export const ZONE_BY_ID = Object.fromEntries(DEPT_ZONES.map((z) => [z.id, z]));

// 共用エリア
export const AREAS = {
  lounge: { x0: -8, x1: 8, z0: -2.5, z1: 5 } as Rect, // 共有スペース
  reception: { x0: -8, x1: 8, z0: 8, z1: 19.5 } as Rect, // 受付・エントランス
  meeting: { x0: -29.5, x1: -14, z0: 13, z1: 19.5 } as Rect, // 会議室
  cafe: { x0: 14, x1: 29.5, z0: 13, z1: 19.5 } as Rect, // 休憩スペース
  ceo: { x0: 22, x1: 29.5, z0: -19.5, z1: -11 } as Rect, // オーナー室
};

export const AREA_LABELS: { key: string; name: string; nameEn: string; rect: Rect }[] = [
  { key: 'reception', name: '受付・エントランス', nameEn: 'RECEPTION', rect: AREAS.reception },
  { key: 'lounge', name: '共有スペース', nameEn: 'COMMONS', rect: AREAS.lounge },
  { key: 'meeting', name: '会議室', nameEn: 'MEETING ROOM', rect: AREAS.meeting },
  { key: 'cafe', name: '休憩スペース', nameEn: 'CAFE LOUNGE', rect: AREAS.cafe },
  { key: 'ceo', name: 'オーナー室', nameEn: "OWNER'S OFFICE", rect: AREAS.ceo },
];

// ---------------- デスク配置の動的生成 ----------------

export interface Seat {
  /** デスク中心 */
  x: number;
  z: number;
  /** デスクの向き（作業者は local +Z 側に座る） */
  rotY: number;
  index: number;
}

const DESK_W = 1.6;
const CLUSTER_GAP = 1.3;
const POD_DEPTH = 1.6; // 向かい合わせの2台分
const ROW_PITCH = 4.6;

/**
 * 部署のデスクエリアに、指定人数分の座席を生成する。
 * 2台×2列の島（ポッド）を単位として配置し、人数に応じて増やす。
 */
export const generateSeats = (area: Rect, count: number): Seat[] => {
  const [w, d] = rectSize(area);
  const clusterW = DESK_W * 2;
  const clusters = Math.max(1, Math.floor((w + CLUSTER_GAP) / (clusterW + CLUSTER_GAP)));
  const rows = Math.max(1, Math.floor((d - POD_DEPTH) / ROW_PITCH) + 1);
  const totalW = clusters * clusterW + (clusters - 1) * CLUSTER_GAP;
  const totalD = (rows - 1) * ROW_PITCH;
  const startX = (area.x0 + area.x1) / 2 - totalW / 2;
  const startZ = (area.z0 + area.z1) / 2 - totalD / 2;

  const all: Seat[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < clusters; c++) {
      const cx = startX + c * (clusterW + CLUSTER_GAP);
      const cz = startZ + r * ROW_PITCH;
      for (let i = 0; i < 2; i++) {
        const x = cx + DESK_W / 2 + i * DESK_W;
        // 手前側（+Z向きに座る）
        all.push({ x, z: cz + 0.4, rotY: 0, index: 0 });
        // 奥側（-Z向きに座る）
        all.push({ x, z: cz - 0.4, rotY: Math.PI, index: 0 });
      }
    }
  }
  // 人数分を確保。ポッド（4席）単位で切り上げ、最低12席
  const needed = Math.min(all.length, Math.max(12, Math.ceil(count / 4) * 4));
  return all.slice(0, needed).map((s, i) => ({ ...s, index: i }));
};

export const seatCapacity = (area: Rect) => generateSeats(area, 9999).length;

/** 席の椅子位置（アバターが座る位置） */
export const seatChairPosition = (s: Seat, off = 0.78): [number, number, number] => {
  return [s.x + Math.sin(s.rotY) * off, 0, s.z + Math.cos(s.rotY) * off];
};

// ---------------- 会議室・休憩スペースの位置 ----------------

/** アバターの正面は local -Z。ある点を向くための rotY を返す */
export const faceTowards = (x: number, z: number, tx: number, tz: number) => Math.atan2(-(tx - x), -(tz - z));

/** 会議テーブルの席（会議中の社員） */
export const MEETING_SEATS: { x: number; z: number; rotY: number }[] = (() => {
  const [cx, cz] = rectCenter(AREAS.meeting);
  const seats: { x: number; z: number; rotY: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const x = cx - 3 + i * 2;
    seats.push({ x, z: cz - 1.45, rotY: faceTowards(x, cz - 1.45, x, cz) });
    seats.push({ x, z: cz + 1.45, rotY: faceTowards(x, cz + 1.45, x, cz) });
  }
  seats.push({ x: cx - 5.2, z: cz, rotY: faceTowards(cx - 5.2, cz, cx, cz) });
  seats.push({ x: cx + 5.2, z: cz, rotY: faceTowards(cx + 5.2, cz, cx, cz) });
  return seats;
})();

/** 休憩スペースのハイテーブル位置 */
export const CAFE_TABLES: [number, number][] = (() => {
  const [cx, cz] = rectCenter(AREAS.cafe);
  return [
    [cx - 4, cz - 0.4],
    [cx + 0.5, cz - 0.4],
    [cx + 4.8, cz - 0.4],
  ];
})();

/** 休憩スペースで立っている位置（離席中の社員） */
export const LOUNGE_SPOTS: { x: number; z: number; rotY: number }[] = (() => {
  const spots: { x: number; z: number; rotY: number }[] = [];
  for (const [tx, tz] of CAFE_TABLES) {
    const around: [number, number][] = [
      [tx - 0.8, tz + 0.1],
      [tx + 0.8, tz + 0.1],
      [tx, tz + 0.85],
    ];
    for (const [x, z] of around) spots.push({ x, z, rotY: faceTowards(x, z, tx, tz) });
  }
  // 共有スペースで立ち話
  const [lx, lz] = rectCenter(AREAS.lounge);
  const pairs: [number, number, number, number][] = [
    [lx - 5.5, lz + 2.4, lx - 4.6, lz + 2.9],
    [lx + 4.6, lz + 2.6, lx + 5.5, lz + 2.1],
  ];
  for (const [ax, az, bx, bz] of pairs) {
    spots.push({ x: ax, z: az, rotY: faceTowards(ax, az, bx, bz) });
    spots.push({ x: bx, z: bz, rotY: faceTowards(bx, bz, ax, az) });
  }
  return spots;
})();

export const DEFAULT_CAMERA = {
  position: [34, 40, 44] as [number, number, number],
  target: [0, 0, 1] as [number, number, number],
};
