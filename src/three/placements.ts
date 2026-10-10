// ============================================================
// 業務データ → 3D配置データ への変換
// 社員数・部署・出勤状態から、デスクとアバターの位置を動的に算出する。
// ============================================================
import { useMemo } from 'react';
import type { AttendanceRecord, Department, Employee } from '../types';
import { useApp } from '../store/appStore';
import {
  AREAS,
  generateSeats,
  LOUNGE_SPOTS,
  MEETING_SEATS,
  rectCenter,
  seatChairPosition,
  ZONE_BY_ID,
} from './layout';

export type ScreenKind = 'code' | 'design' | 'chart' | 'video';

export interface DeskInfo {
  key: string;
  departmentId: string;
  x: number;
  z: number;
  rotY: number;
  occupantId: string | null;
  screenOn: boolean;
  screenKind: ScreenKind;
  variant: number;
}

export type Pose = 'sit' | 'stand';

export interface AvatarPlacement {
  employeeId: string;
  x: number;
  z: number;
  rotY: number;
  pose: Pose;
  location: 'desk' | 'meeting' | 'lounge' | 'ceo';
  /** デスク作業中（タイピングアニメーション） */
  working: boolean;
}

export interface OfficeLayoutData {
  desks: DeskInfo[];
  placements: Record<string, AvatarPlacement>;
  /** 出勤していない社員も含む「本来の席」 */
  homeSeats: Record<string, { x: number; z: number; rotY: number }>;
}

export const CEO_CHAIR = { x: 25.8, z: -17.2, rotY: Math.PI };

/** オーナー・代表はオーナー室の専用デスクに着席 */
const isCeo = (e: Employee) => /オーナー|代表|CEO|社長/.test(e.title);

const SCREEN_BY_ZONE: Record<string, ScreenKind> = {
  'zone-web': 'code',
  'zone-creative': 'design',
  'zone-admin': 'video',
};
const screenKindFor = (zoneId: string): ScreenKind => SCREEN_BY_ZONE[zoneId] ?? 'chart';

export const computeOfficeLayout = (
  employees: Employee[],
  departments: Department[],
  attendance: Record<string, AttendanceRecord>,
): OfficeLayoutData => {
  const desks: DeskInfo[] = [];
  const placements: Record<string, AvatarPlacement> = {};
  const homeSeats: OfficeLayoutData['homeSeats'] = {};
  const status = (id: string) => attendance[id]?.status ?? 'off';

  const sorted = [...employees].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id));
  const ceo = sorted.find(isCeo);

  for (const dept of departments) {
    const zone = ZONE_BY_ID[dept.zoneId];
    if (!zone) continue;
    const members = sorted.filter((e) => e.departmentId === dept.id && e !== ceo);
    const seats = generateSeats(zone.deskArea, members.length);
    seats.forEach((seat, i) => {
      const occupant = members[i];
      const st = occupant ? status(occupant.id) : 'off';
      desks.push({
        key: `${dept.id}-${i}`,
        departmentId: dept.id,
        x: seat.x,
        z: seat.z,
        rotY: seat.rotY,
        occupantId: occupant?.id ?? null,
        // 会議・離席中でも画面はロック画面相当で点灯させず、作業中のみ点灯
        screenOn: st === 'working',
        screenKind: screenKindFor(dept.zoneId),
        variant: (i * 7 + dept.id.length) % 6,
      });
      if (occupant) {
        // アバターは椅子より少しデスク寄りに座る
        const [cx, , cz] = seatChairPosition(seat, 0.7);
        homeSeats[occupant.id] = { x: cx, z: cz, rotY: seat.rotY };
      }
    });
    // 定員超過の社員は部署の入口付近に立たせる
    members.slice(seats.length).forEach((e, k) => {
      const [zx] = rectCenter(zone.rect);
      homeSeats[e.id] = { x: zx - 2 + k * 0.8, z: zone.rect.z1 - 0.8, rotY: 0 };
    });
  }
  if (ceo) homeSeats[ceo.id] = CEO_CHAIR;

  let meetingIdx = 0;
  let loungeIdx = 0;
  for (const e of sorted) {
    const st = status(e.id);
    const home = homeSeats[e.id];
    if (st === 'off' || !home) continue;
    if (st === 'meeting' && meetingIdx < MEETING_SEATS.length) {
      const s = MEETING_SEATS[meetingIdx++];
      placements[e.id] = { employeeId: e.id, x: s.x, z: s.z, rotY: s.rotY, pose: 'sit', location: 'meeting', working: false };
      continue;
    }
    if (st === 'away' && loungeIdx < LOUNGE_SPOTS.length) {
      const s = LOUNGE_SPOTS[loungeIdx++];
      placements[e.id] = { employeeId: e.id, x: s.x, z: s.z, rotY: s.rotY, pose: 'stand', location: 'lounge', working: false };
      continue;
    }
    placements[e.id] = {
      employeeId: e.id,
      x: home.x,
      z: home.z,
      rotY: home.rotY,
      pose: 'sit',
      location: e === ceo ? 'ceo' : 'desk',
      working: st === 'working',
    };
  }
  return { desks, placements, homeSeats };
};

export const useOfficeLayout = () => {
  const employees = useApp((s) => s.business.employees);
  const departments = useApp((s) => s.business.departments);
  const attendance = useApp((s) => s.business.attendance);
  return useMemo(() => computeOfficeLayout(employees, departments, attendance), [employees, departments, attendance]);
};

/** 部署のカメラフォーカス用矩形 */
export const departmentRect = (dept: Department) => ZONE_BY_ID[dept.zoneId]?.rect ?? AREAS.lounge;
