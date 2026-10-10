import type { BusinessData, Employee, TaskPriority } from '../types';
import { todayKey, toDateKey } from '../lib/utils';

// ---------------- レベル ----------------

/** レベル n → n+1 に必要な経験値 */
export const xpToNext = (level: number) => Math.round(80 + level * 40 + level * level * 6);

/** 累計XPからレベルと進捗を算出 */
export const levelInfo = (totalXp: number) => {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level) && level < 99) {
    remaining -= xpToNext(level);
    level++;
  }
  const need = xpToNext(level);
  return { level, current: remaining, need, ratio: need ? remaining / need : 0 };
};

/** 指定レベルに到達するための累計XP */
export const totalXpForLevel = (level: number) => {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
};

export const TASK_XP: Record<TaskPriority, number> = {
  low: 10,
  medium: 20,
  high: 35,
  urgent: 50,
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '緊急',
};

// ---------------- 会社の成長 ----------------

export interface OfficeUpgrade {
  level: number;
  name: string;
  description: string;
  requiredXp: number;
}

export const OFFICE_UPGRADES: OfficeUpgrade[] = [
  { level: 1, name: 'スタンダードオフィス', description: '基本設備のオフィス', requiredXp: 0 },
  { level: 2, name: 'グリーンオフィス', description: '観葉植物とプランターが増設されます', requiredXp: 6000 },
  { level: 3, name: 'カフェラウンジ', description: '休憩スペースにカフェカウンターとペンダント照明', requiredXp: 13800 },
  { level: 4, name: 'メディアウォール', description: 'エントランスに大型LEDウォールを設置', requiredXp: 20000 },
  { level: 5, name: 'アトリウムツリー', description: '中央ラウンジにシンボルツリーとアートを設置', requiredXp: 30000 },
];

export const companyXp = (b: Pick<BusinessData, 'xpLedger'>) => b.xpLedger.reduce((s, e) => s + e.amount, 0);

export const companyLevelInfo = (xp: number) => {
  let current = OFFICE_UPGRADES[0];
  for (const u of OFFICE_UPGRADES) if (xp >= u.requiredXp) current = u;
  const next = OFFICE_UPGRADES.find((u) => u.level === current.level + 1);
  const ratio = next ? (xp - current.requiredXp) / (next.requiredXp - current.requiredXp) : 1;
  return { level: current.level, current, next, ratio };
};

// ---------------- 実績バッジ ----------------

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon key（UI側でマッピング）
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  employee: Employee;
  completedCount: number;
  highPriorityCompleted: number;
  clockInHour: number | null;
  createdCount: number;
  missionClaimCount: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-quest', name: 'ファーストクエスト', description: '初めてタスクを完了する', icon: 'flag', check: (c) => c.completedCount >= 1 },
  { id: 'five-quests', name: 'リズムに乗る', description: 'タスクを5件完了する', icon: 'zap', check: (c) => c.completedCount >= 5 },
  { id: 'twenty-quests', name: 'プロフェッショナル', description: 'タスクを20件完了する', icon: 'briefcase', check: (c) => c.completedCount >= 20 },
  { id: 'high-impact', name: 'ハイインパクト', description: '高優先度以上のタスクを3件完了する', icon: 'target', check: (c) => c.highPriorityCompleted >= 3 },
  { id: 'early-bird', name: 'アーリーバード', description: '9時前に出勤する', icon: 'sunrise', check: (c) => c.clockInHour !== null && c.clockInHour < 9 },
  { id: 'planner', name: 'プランナー', description: 'タスクを5件作成する', icon: 'clipboard', check: (c) => c.createdCount >= 5 },
  { id: 'mission-runner', name: 'デイリーランナー', description: 'デイリーミッションを3回達成する', icon: 'calendar', check: (c) => c.missionClaimCount >= 3 },
  { id: 'level-5', name: 'ライジングスター', description: 'レベル5に到達する', icon: 'star', check: (c) => c.employee.level >= 5 },
  { id: 'level-10', name: 'エース', description: 'レベル10に到達する', icon: 'crown', check: (c) => c.employee.level >= 10 },
];

export const buildAchievementContext = (b: BusinessData, employee: Employee): AchievementContext => {
  const mine = b.tasks.filter((t) => t.assigneeId === employee.id && t.status === 'done' && t.xpAwarded);
  // 削除済みタスクも含めて台帳から数える
  const taskEntries = b.xpLedger.filter((e) => e.employeeId === employee.id && e.refId.startsWith('task:'));
  const att = b.attendance[employee.id];
  const clockInHour =
    att?.clockInAt && toDateKey(new Date(att.clockInAt)) === todayKey() ? new Date(att.clockInAt).getHours() : null;
  return {
    employee,
    completedCount: Math.max(mine.length, taskEntries.length),
    highPriorityCompleted: taskEntries.filter((e) => e.reason.includes('[高]') || e.reason.includes('[緊急]')).length,
    clockInHour,
    createdCount: b.tasks.filter((t) => t.createdBy === employee.id).length,
    missionClaimCount: b.missionClaims.filter((m) => m.employeeId === employee.id).length,
  };
};

// ---------------- デイリーミッション ----------------

export interface MissionDef {
  id: string;
  name: string;
  description: string;
  reward: number;
  target: number;
  progress: (b: BusinessData, employeeId: string, date: string) => number;
}

const completedToday = (b: BusinessData, employeeId: string, date: string) =>
  b.xpLedger.filter(
    (e) => e.employeeId === employeeId && e.refId.startsWith('task:') && toDateKey(new Date(e.at)) === date,
  );

export const MISSIONS: MissionDef[] = [
  {
    id: 'clock-in',
    name: '出勤する',
    description: '仮想オフィスに出勤する',
    reward: 10,
    target: 1,
    progress: (b, id, date) => {
      const a = b.attendance[id];
      return a?.clockInAt && toDateKey(new Date(a.clockInAt)) === date ? 1 : 0;
    },
  },
  {
    id: 'complete-3',
    name: 'タスクを3件完了',
    description: '本日中にタスクを3件完了する',
    reward: 30,
    target: 3,
    progress: (b, id, date) => completedToday(b, id, date).length,
  },
  {
    id: 'high-1',
    name: '重要タスクに挑む',
    description: '高優先度以上のタスクを1件完了する',
    reward: 25,
    target: 1,
    progress: (b, id, date) =>
      completedToday(b, id, date).filter((e) => e.reason.includes('[高]') || e.reason.includes('[緊急]')).length,
  },
  {
    id: 'plan-1',
    name: '計画を立てる',
    description: '新しいタスクを1件作成する',
    reward: 10,
    target: 1,
    progress: (b, id, date) =>
      b.tasks.filter((t) => t.createdBy === id && toDateKey(new Date(t.createdAt)) === date).length,
  },
];
