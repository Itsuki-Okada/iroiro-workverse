// ============================================================
// 勤怠（タイムシート）の計算
// 打刻イベントから日ごとの出勤・退勤・休憩・会議・実働時間を集計する。
// ============================================================
import type { AttendanceCorrection, AttendanceEvent, AttendanceEventType, AttendanceStatus } from '../types';
import { toDateKey } from '../lib/utils';

/** 所定労働時間（これを超えた分を残業として表示） */
export const STANDARD_WORK_MIN = 8 * 60;
/** 打刻履歴の保持期間 */
export const LOG_RETENTION_DAYS = 180;

export const EVENT_LABEL: Record<AttendanceEventType, string> = {
  clock_in: '出勤',
  clock_out: '退勤',
  break_start: '休憩開始',
  break_end: '休憩終了',
  meeting_start: '会議開始',
  meeting_end: '会議終了',
};

/** ステータスの変化 → 記録すべき打刻（順番どおり） */
export const transitionEvents = (from: AttendanceStatus, to: AttendanceStatus): AttendanceEventType[] => {
  if (from === to) return [];
  const out: AttendanceEventType[] = [];
  // 終了側
  if (from === 'away') out.push('break_end');
  if (from === 'meeting') out.push('meeting_end');
  if (from === 'off') out.push('clock_in');
  // 開始側
  if (to === 'away') out.push('break_start');
  if (to === 'meeting') out.push('meeting_start');
  if (to === 'off') out.push('clock_out');
  return out;
};

export interface DaySummary {
  date: string;
  clockIn: string | null; // ISO
  clockOut: string | null; // ISO（勤務中なら null）
  breakMin: number;
  meetingMin: number;
  workMin: number;
  overtimeMin: number;
  /** 現在も勤務中 */
  inProgress: boolean;
  autoClosed: boolean;
  corrected: boolean;
  note?: string;
  events: AttendanceEvent[];
}

const minutes = (a: number, b: number) => Math.max(0, Math.round((b - a) / 60000));

const atTime = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0).toISOString();
};

/** 1日分の集計。events はその社員の全打刻（日付で絞り込む） */
export const summarizeDay = (
  allEvents: AttendanceEvent[],
  date: string,
  correction?: AttendanceCorrection,
  now: Date = new Date(),
): DaySummary => {
  const events = allEvents.filter((e) => toDateKey(new Date(e.at)) === date).sort((a, b) => a.at.localeCompare(b.at));
  let clockIn: string | null = null;
  let clockOut: string | null = null;
  let breakMin = 0;
  let meetingMin = 0;
  let sessionStart: number | null = null;
  let breakStart: number | null = null;
  let meetingStart: number | null = null;
  let workMs = 0;
  let autoClosed = false;

  for (const e of events) {
    const t = new Date(e.at).getTime();
    switch (e.type) {
      case 'clock_in':
        if (sessionStart === null) sessionStart = t;
        clockIn ??= e.at;
        clockOut = null;
        break;
      case 'break_start':
        breakStart ??= t;
        break;
      case 'break_end':
        if (breakStart !== null) breakMin += minutes(breakStart, t);
        breakStart = null;
        break;
      case 'meeting_start':
        meetingStart ??= t;
        break;
      case 'meeting_end':
        if (meetingStart !== null) meetingMin += minutes(meetingStart, t);
        meetingStart = null;
        break;
      case 'clock_out':
        if (breakStart !== null) breakMin += minutes(breakStart, t);
        if (meetingStart !== null) meetingMin += minutes(meetingStart, t);
        breakStart = meetingStart = null;
        if (sessionStart !== null) workMs += t - sessionStart;
        sessionStart = null;
        clockOut = e.at;
        if (e.auto) autoClosed = true;
        break;
    }
  }

  // 勤務中（今日・退勤前）は現在時刻までで計算
  const isToday = date === toDateKey(now);
  const inProgress = sessionStart !== null && isToday;
  if (sessionStart !== null) {
    const end = isToday ? now.getTime() : sessionStart;
    workMs += end - sessionStart;
    if (breakStart !== null && isToday) breakMin += minutes(breakStart, end);
    if (meetingStart !== null && isToday) meetingMin += minutes(meetingStart, end);
  }

  let workMin = Math.max(0, Math.round(workMs / 60000) - breakMin);

  // 手動修正を反映
  let corrected = false;
  if (correction) {
    corrected = true;
    if (correction.clockIn) clockIn = atTime(date, correction.clockIn);
    if (correction.clockOut) clockOut = atTime(date, correction.clockOut);
    if (correction.breakMinutes !== undefined) breakMin = correction.breakMinutes;
    if (clockIn && clockOut) workMin = Math.max(0, minutes(new Date(clockIn).getTime(), new Date(clockOut).getTime()) - breakMin);
  }

  return {
    date,
    clockIn,
    clockOut: inProgress && !correction?.clockOut ? null : clockOut,
    breakMin,
    meetingMin,
    workMin,
    overtimeMin: Math.max(0, workMin - STANDARD_WORK_MIN),
    inProgress: inProgress && !correction?.clockOut,
    autoClosed,
    corrected,
    note: correction?.note,
    events,
  };
};

export const correctionKey = (employeeId: string, date: string) => `${employeeId}:${date}`;

/** 指定月の日付一覧（今日まで） */
export const daysOfMonth = (year: number, month: number, now: Date = new Date()) => {
  const days: string[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month, d);
    if (date > now) break;
    days.push(toDateKey(date));
  }
  return days;
};

export const summarizeMonth = (days: DaySummary[]) => {
  const worked = days.filter((d) => d.clockIn);
  const workMin = worked.reduce((s, d) => s + d.workMin, 0);
  return {
    workDays: worked.length,
    workMin,
    breakMin: worked.reduce((s, d) => s + d.breakMin, 0),
    overtimeMin: worked.reduce((s, d) => s + d.overtimeMin, 0),
    avgWorkMin: worked.length ? Math.round(workMin / worked.length) : 0,
    autoClosedDays: worked.filter((d) => d.autoClosed && !d.corrected).length,
  };
};

export const fmtDuration = (min: number) => {
  if (!min) return '0:00';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
};
