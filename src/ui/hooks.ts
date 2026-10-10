// UI向けの派生データ
import { useMemo, useSyncExternalStore } from 'react';
import type { BusinessData, Task } from '../types';
import { useApp } from '../store/appStore';
import { todayKey, toDateKey } from '../lib/utils';

// ---------- 画面幅（スマホ判定） ----------
const MOBILE_QUERY = '(max-width: 767px)';
const subscribeMq = (cb: () => void) => {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
export const isMobileNow = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
export const useIsMobile = () => useSyncExternalStore(subscribeMq, isMobileNow, () => false);

export const isTodayTask = (t: Task, today = todayKey()) =>
  t.dueDate === today || (!!t.completedAt && toDateKey(new Date(t.completedAt)) === today) ||
  (t.status !== 'done' && !!t.dueDate && t.dueDate < today);

export const useMe = () => {
  const id = useApp((s) => s.currentUserId);
  const employees = useApp((s) => s.business.employees);
  return useMemo(() => employees.find((e) => e.id === id), [employees, id]);
};

export const useLookups = () => {
  const departments = useApp((s) => s.business.departments);
  const employees = useApp((s) => s.business.employees);
  const categories = useApp((s) => s.business.categories);
  const projects = useApp((s) => s.business.projects);
  return useMemo(
    () => ({
      dept: Object.fromEntries(departments.map((d) => [d.id, d])),
      emp: Object.fromEntries(employees.map((e) => [e.id, e])),
      cat: Object.fromEntries(categories.map((c) => [c.id, c])),
      prj: Object.fromEntries(projects.map((p) => [p.id, p])),
    }),
    [departments, employees, categories, projects],
  );
};

export const taskStats = (tasks: Task[]) => {
  const done = tasks.filter((t) => t.status === 'done').length;
  return { total: tasks.length, done, ratio: tasks.length ? done / tasks.length : 0 };
};

export const computeDashboard = (b: BusinessData) => {
  const today = todayKey();
  const todays = b.tasks.filter((t) => isTodayTask(t, today));
  const present = b.employees.filter((e) => (b.attendance[e.id]?.status ?? 'off') !== 'off').length;
  const s = taskStats(todays);
  const doneToday = (t: Task) => !!t.completedAt && toDateKey(new Date(t.completedAt)) === today;
  // 「本日のタスク」の内訳（重複なし）
  const breakdown = {
    /** 期限が今日 */
    dueToday: todays.filter((t) => t.dueDate === today).length,
    /** 期限を過ぎたもの（未完了、または今日ようやく完了） */
    overdue: todays.filter((t) => !!t.dueDate && t.dueDate < today).length,
    /** 期限は先だが今日完了した（前倒し） */
    early: todays.filter((t) => (!t.dueDate || t.dueDate > today) && doneToday(t)).length,
  };
  return {
    breakdown,
    present,
    total: b.employees.length,
    todayTasks: s.total,
    doneTasks: s.done,
    ratio: s.ratio,
    activeProjects: b.projects.filter((p) => p.status === 'active').length,
  };
};

export const projectProgress = (tasks: Task[], projectId: string) => taskStats(tasks.filter((t) => t.projectId === projectId));
