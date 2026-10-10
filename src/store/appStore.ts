// ============================================================
// アプリケーションストア（業務データ + 3D表示データ）
// 永続化は services/storage の StorageAdapter に委譲する。
// ============================================================
import { create } from 'zustand';
import type {
  AppNotification,
  AssetMeta,
  AttendanceRecord,
  AttendanceStatus,
  AvatarConfig,
  BusinessData,
  Category,
  CompanySettings,
  Department,
  Employee,
  PersistedState,
  PresentationData,
  Project,
  Task,
  TaskStatus,
} from '../types';
import { createEmptyState, createSeedState, SCHEMA_VERSION } from '../data/seed';
import { generateAvatar, unlockedBetween } from '../data/avatarFactory';
import { sessionStore, storage } from '../services/storage';
import { fileStore, MAX_FILE_SIZE } from '../services/fileStore';
import { hashString, todayKey, toDateKey, uid } from '../lib/utils';
import {
  ACHIEVEMENTS,
  buildAchievementContext,
  companyLevelInfo,
  companyXp,
  levelInfo,
  MISSIONS,
  OFFICE_UPGRADES,
  PRIORITY_LABEL,
  TASK_XP,
} from '../game/rules';
import { useUi } from './uiStore';

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'xpAwarded' | 'completedAt' | 'createdBy'>;

interface AppState {
  business: BusinessData;
  presentation: PresentationData;
  currentUserId: string | null;
  /** 前回ブラウザを閉じたまま出勤が継続しているユーザー */
  resumableUserId: string | null;

  // 勤怠・セッション
  login: (employeeId: string) => void;
  clockIn: () => void;
  clockOut: () => void;
  logout: (opts: { clockOut: boolean }) => void;
  setMyStatus: (status: Exclude<AttendanceStatus, 'off'>) => void;
  setEmployeeStatus: (employeeId: string, status: AttendanceStatus) => void;
  touch: () => void;

  // タスク
  createTask: (input: TaskInput) => string;
  updateTask: (id: string, patch: Partial<TaskInput>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;

  // ゲーム
  claimMission: (missionId: string) => void;

  // マスタ管理
  upsertCategory: (c: Partial<Category> & { name: string }) => void;
  deleteCategory: (id: string) => void;
  upsertProject: (p: Partial<Project> & { name: string }) => void;
  deleteProject: (id: string) => void;
  addEmployee: (e: { name: string; departmentId: string; title: string; role: Employee['role']; status: AttendanceStatus }) => string;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  updateDepartment: (id: string, patch: Partial<Department>) => void;
  updateSettings: (patch: Partial<CompanySettings>) => void;
  setCompanyName: (name: string) => void;
  updateAvatar: (employeeId: string, patch: Partial<AvatarConfig>) => void;
  markNotificationsRead: () => void;

  // 制作データ
  uploadAssets: (files: File[], opts: { departmentId: string; projectId: string | null; note: string }) => Promise<number>;
  deleteAsset: (id: string) => Promise<void>;

  // データ管理
  resetToDemo: () => void;
  wipeAll: () => void;
  exportJson: () => string;
}

const nowIso = () => new Date().toISOString();

// ---------- 日付変更時のロールオーバー ----------
// サーバーがない初期版のため、他の社員（デモNPC）の勤怠は日ごとに疑似生成する。
// 最後にログインしていたユーザーは「退勤し忘れ」として自動クローズする。
const rollover = (state: PersistedState): PersistedState => {
  const today = todayKey();
  const b = state.business;
  if (b.lastActiveDate === today) return state;
  const lastUser = sessionStore.get();
  const attendance: Record<string, AttendanceRecord> = {};
  const notifications: AppNotification[] = [...b.notifications];
  for (const e of b.employees) {
    const prev = b.attendance[e.id] ?? { employeeId: e.id, status: 'off' };
    if (e.id === lastUser || e.isDemoUser) {
      const wasOn = prev.status !== 'off';
      attendance[e.id] = wasOn
        ? { ...prev, status: 'off', clockOutAt: prev.lastSeenAt ?? prev.clockInAt, autoClosed: true }
        : { ...prev };
      if (wasOn)
        notifications.unshift({
          id: uid('ntf'),
          employeeId: e.id,
          kind: 'attendance',
          title: '前日の退勤が記録されていません',
          body: '最終操作時刻で自動的に退勤処理しました。',
          at: nowIso(),
          read: false,
        });
      continue;
    }
    const r = hashString(`${today}:${e.id}`);
    const roll = r % 100;
    const status: AttendanceStatus = roll < 62 ? 'working' : roll < 74 ? 'meeting' : roll < 84 ? 'away' : 'off';
    const d = new Date();
    d.setHours(8 + ((r >>> 8) % 2), 15 + ((r >>> 12) % 45), 0, 0);
    attendance[e.id] = {
      employeeId: e.id,
      status,
      clockInAt: status === 'off' ? undefined : d.toISOString(),
      lastSeenAt: nowIso(),
    };
  }
  return {
    ...state,
    business: { ...b, attendance, notifications: notifications.slice(0, 50), lastActiveDate: today },
  };
};

const loadInitial = (): PersistedState => {
  const loaded = storage.load();
  const base = loaded ?? createSeedState();
  return rollover(base);
};

const initial = loadInitial();

/** 再読み込み（同一タブ）ならセッションを復元。タブを閉じていた場合はログイン画面で再開を提案 */
const initialSession = (() => {
  const id = sessionStore.get();
  const exists = id && initial.business.employees.some((e) => e.id === id);
  if (!exists) return { currentUserId: null, resumableUserId: null };
  if (sessionStore.hasActiveTab()) return { currentUserId: id, resumableUserId: null };
  const att = initial.business.attendance[id!];
  return { currentUserId: null, resumableUserId: att && att.status !== 'off' ? id : null };
})();

export const useApp = create<AppState>((set, get) => {
  /** business の部分更新ヘルパー */
  const patchBusiness = (fn: (b: BusinessData) => Partial<BusinessData>) =>
    set((s) => ({ business: { ...s.business, ...fn(s.business) } }));

  const notify = (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => notifyMany([n]);

  /** 複数の宛先へ通知（チーム宛など）。古い通知は上限で切り捨て */
  const notifyMany = (list: Omit<AppNotification, 'id' | 'at' | 'read'>[]) =>
    patchBusiness((b) => ({
      notifications: [...list.map((n) => ({ ...n, id: uid('ntf'), at: nowIso(), read: false })), ...b.notifications].slice(0, 300),
    }));

  const ui = () => useUi.getState();

  /** 実績の判定と付与 */
  const checkAchievements = (employeeId: string) => {
    const b = get().business;
    const employee = b.employees.find((e) => e.id === employeeId);
    if (!employee) return;
    const ctx = buildAchievementContext(b, employee);
    const owned = new Set(b.achievements.filter((a) => a.employeeId === employeeId).map((a) => a.achievementId));
    const fresh = ACHIEVEMENTS.filter((a) => !owned.has(a.id) && a.check(ctx));
    if (!fresh.length) return;
    patchBusiness((bb) => ({
      achievements: [...bb.achievements, ...fresh.map((a) => ({ achievementId: a.id, employeeId, at: nowIso() }))],
    }));
    for (const a of fresh) {
      notify({ employeeId, kind: 'badge', title: `実績「${a.name}」を獲得`, body: a.description });
      if (employeeId === get().currentUserId) ui().toast({ tone: 'badge', title: `実績解除：${a.name}`, body: a.description });
    }
  };

  /**
   * 経験値付与。refId が台帳に存在する場合は付与しない（重複・不正取得の防止）。
   */
  const awardXp = (employeeId: string, amount: number, reason: string, refId: string) => {
    const b = get().business;
    if (b.xpLedger.some((e) => e.employeeId === employeeId && e.refId === refId)) return false;
    const employee = b.employees.find((e) => e.id === employeeId);
    if (!employee || amount <= 0) return false;

    const prevCompany = companyLevelInfo(companyXp(b)).level;
    const totalXp = employee.totalXp + amount;
    const level = levelInfo(totalXp).level;
    const leveledUp = level > employee.level;

    patchBusiness((bb) => ({
      xpLedger: [...bb.xpLedger, { id: uid('xp'), employeeId, amount, reason, refId, at: nowIso() }],
      employees: bb.employees.map((e) => (e.id === employeeId ? { ...e, totalXp, level } : e)),
    }));

    const isMe = employeeId === get().currentUserId;
    ui().pushFx({ kind: 'taskComplete', employeeId, xp: amount });
    if (isMe) ui().toast({ tone: 'xp', title: `+${amount} XP`, body: reason });

    if (leveledUp) {
      notify({ employeeId, kind: 'level', title: `${employee.name} がレベル${level}に到達`, body: 'おめでとうございます！' });
      const unlocked = unlockedBetween(employee.level, level);
      if (unlocked.length) {
        notify({ employeeId, kind: 'unlock', title: '新しいアバターが解放されました', body: unlocked.join('、') });
        if (isMe) setTimeout(() => ui().toast({ tone: 'badge', title: 'アバター解放', body: unlocked.join('、') }), 1200);
      }
      ui().pushFx({ kind: 'levelUp', employeeId, level });
      if (isMe) ui().showLevelUp({ from: employee.level, to: level, name: employee.name });
      else ui().toast({ tone: 'info', title: `${employee.name} がレベル${level}に到達` });
    }

    const nextCompany = companyLevelInfo(companyXp(get().business)).level;
    if (nextCompany > prevCompany) {
      const up = OFFICE_UPGRADES.find((u) => u.level === nextCompany)!;
      notify({ employeeId: null, kind: 'company', title: `オフィスがアップグレード：${up.name}`, body: up.description });
      ui().toast({ tone: 'badge', title: `オフィス Lv.${nextCompany}「${up.name}」解放`, body: up.description });
    }
    checkAchievements(employeeId);
    return true;
  };

  const setAttendance = (employeeId: string, patch: Partial<AttendanceRecord>) =>
    patchBusiness((b) => ({
      attendance: {
        ...b.attendance,
        [employeeId]: { ...(b.attendance[employeeId] ?? { employeeId, status: 'off' }), ...patch },
      },
    }));

  return {
    business: initial.business,
    presentation: initial.presentation,
    currentUserId: initialSession.currentUserId,
    resumableUserId: initialSession.resumableUserId,

    // ---------------- 勤怠・セッション ----------------
    login: (employeeId) => {
      sessionStore.set(employeeId);
      set({ currentUserId: employeeId, resumableUserId: null });
      const att = get().business.attendance[employeeId];
      const clockedInToday =
        att && att.status !== 'off' && att.clockInAt && toDateKey(new Date(att.clockInAt)) === todayKey();
      if (clockedInToday) {
        // ブラウザを閉じていただけ → 勤怠は継続
        setAttendance(employeeId, { lastSeenAt: nowIso() });
        ui().toast({ tone: 'info', title: 'おかえりなさい', body: '出勤状態を継続しています' });
        ui().cameraTo({ kind: 'employee', employeeId });
      } else {
        get().clockIn();
      }
    },

    clockIn: () => {
      const id = get().currentUserId;
      if (!id) return;
      const now = nowIso();
      setAttendance(id, { status: 'working', clockInAt: now, clockOutAt: undefined, lastSeenAt: now, autoClosed: false });
      ui().setArriving(true);
      ui().pushFx({ kind: 'arrive', employeeId: id });
      ui().cameraTo({ kind: 'employee', employeeId: id });
      setTimeout(() => ui().setArriving(false), 2600);
      const name = get().business.employees.find((e) => e.id === id)?.name ?? '';
      notify({ employeeId: id, kind: 'attendance', title: '出勤しました', body: `${name}さん、今日もよろしくお願いします。` });
      ui().toast({ tone: 'success', title: '出勤しました', body: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
      checkAchievements(id);
    },

    clockOut: () => {
      const id = get().currentUserId;
      if (!id) return;
      ui().pushFx({ kind: 'leave', employeeId: id });
      setAttendance(id, { status: 'off', clockOutAt: nowIso(), lastSeenAt: nowIso() });
      notify({ employeeId: id, kind: 'attendance', title: '退勤しました', body: 'お疲れさまでした。' });
      ui().toast({ tone: 'info', title: '退勤しました', body: 'お疲れさまでした' });
    },

    logout: ({ clockOut }) => {
      if (clockOut) get().clockOut();
      else get().touch();
      ui().resetSelection();
      ui().setView('office');
      const finish = () => {
        sessionStore.clear();
        set({ currentUserId: null });
        ui().cameraTo({ kind: 'overview' });
      };
      if (clockOut) {
        ui().setLeaving(true);
        setTimeout(() => {
          ui().setLeaving(false);
          finish();
        }, 1700);
      } else finish();
    },

    setMyStatus: (status) => {
      const id = get().currentUserId;
      if (!id) return;
      const att = get().business.attendance[id];
      if (!att || att.status === 'off') {
        get().clockIn();
      }
      setAttendance(id, { status, lastSeenAt: nowIso() });
      const label = { working: '出勤中', away: '離席中', meeting: '会議中' }[status];
      ui().toast({ tone: 'info', title: `ステータス：${label}` });
    },

    setEmployeeStatus: (employeeId, status) => {
      const att = get().business.attendance[employeeId];
      const patch: Partial<AttendanceRecord> = { status };
      if (status !== 'off' && (!att?.clockInAt || att.status === 'off')) patch.clockInAt = nowIso();
      if (status === 'off') patch.clockOutAt = nowIso();
      if (status === 'off' && att?.status !== 'off') ui().pushFx({ kind: 'leave', employeeId });
      if (status !== 'off' && att?.status === 'off') ui().pushFx({ kind: 'arrive', employeeId });
      setAttendance(employeeId, patch);
    },

    touch: () => {
      const id = get().currentUserId;
      if (!id) return;
      const att = get().business.attendance[id];
      if (att && att.status !== 'off') setAttendance(id, { lastSeenAt: nowIso() });
    },

    // ---------------- タスク ----------------
    createTask: (input) => {
      const id = uid('task');
      const now = nowIso();
      const task: Task = {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
        xpAwarded: false,
        createdBy: get().currentUserId,
        completedAt: input.status === 'done' ? now : undefined,
      };
      patchBusiness((b) => ({ tasks: [task, ...b.tasks] }));
      if (input.status === 'done') {
        // 作成と同時に完了扱い → 通常の完了処理を通す
        patchBusiness((b) => ({ tasks: b.tasks.map((t) => (t.id === id ? { ...t, status: 'todo' } : t)) }));
        get().setTaskStatus(id, 'done');
      }
      const me = get().currentUserId;
      if (me) checkAchievements(me);
      return id;
    },

    updateTask: (id, patch) => {
      const { status, ...rest } = patch;
      patchBusiness((b) => ({
        tasks: b.tasks.map((t) => (t.id === id ? { ...t, ...rest, updatedAt: nowIso() } : t)),
      }));
      if (status) get().setTaskStatus(id, status);
    },

    deleteTask: (id) => {
      // 付与済みXPは台帳に残る（削除→再作成での重複取得はrefIdが新しくなるが、削除自体ではXPは増えない）
      patchBusiness((b) => ({ tasks: b.tasks.filter((t) => t.id !== id) }));
    },

    setTaskStatus: (id, status) => {
      const task = get().business.tasks.find((t) => t.id === id);
      if (!task || task.status === status) return;
      const now = nowIso();
      const completing = status === 'done';
      patchBusiness((b) => ({
        tasks: b.tasks.map((t) =>
          t.id === id
            ? { ...t, status, updatedAt: now, completedAt: completing ? now : undefined, xpAwarded: t.xpAwarded || (completing && !!t.assigneeId) }
            : t,
        ),
      }));
      if (completing && !task.xpAwarded && task.assigneeId) {
        awardXp(task.assigneeId, TASK_XP[task.priority], `タスク完了 [${PRIORITY_LABEL[task.priority]}] ${task.title}`, `task:${task.id}`);
      } else if (completing && task.xpAwarded) {
        ui().toast({ tone: 'info', title: 'タスクを完了しました', body: 'このタスクの経験値は付与済みです' });
      }
    },

    // ---------------- ゲーム ----------------
    claimMission: (missionId) => {
      const me = get().currentUserId;
      const m = MISSIONS.find((x) => x.id === missionId);
      if (!me || !m) return;
      const date = todayKey();
      const b = get().business;
      if (b.missionClaims.some((c) => c.date === date && c.employeeId === me && c.missionId === missionId)) return;
      if (m.progress(b, me, date) < m.target) return;
      patchBusiness((bb) => ({ missionClaims: [...bb.missionClaims, { date, employeeId: me, missionId, at: nowIso() }] }));
      awardXp(me, m.reward, `デイリーミッション「${m.name}」`, `mission:${date}:${missionId}`);
    },

    // ---------------- マスタ管理 ----------------
    upsertCategory: (c) =>
      patchBusiness((b) =>
        c.id && b.categories.some((x) => x.id === c.id)
          ? { categories: b.categories.map((x) => (x.id === c.id ? { ...x, ...c } as Category : x)) }
          : { categories: [...b.categories, { id: uid('cat'), color: '#9aa7b4', ...c } as Category] },
      ),

    deleteCategory: (id) =>
      patchBusiness((b) => ({
        categories: b.categories.filter((c) => c.id !== id),
        tasks: b.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
      })),

    upsertProject: (p) =>
      patchBusiness((b) =>
        p.id && b.projects.some((x) => x.id === p.id)
          ? { projects: b.projects.map((x) => (x.id === p.id ? ({ ...x, ...p } as Project) : x)) }
          : {
              projects: [
                ...b.projects,
                { id: uid('prj'), description: '', departmentId: null, status: 'active', dueDate: null, createdAt: nowIso(), ...p } as Project,
              ],
            },
      ),

    deleteProject: (id) =>
      patchBusiness((b) => ({
        projects: b.projects.filter((p) => p.id !== id),
        tasks: b.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
        employees: b.employees.map((e) => ({ ...e, projectIds: e.projectIds.filter((x) => x !== id) })),
      })),

    addEmployee: ({ name, departmentId, title, role, status }) => {
      const id = uid('emp');
      const now = nowIso();
      const employee: Employee = {
        id,
        name,
        departmentId,
        title,
        role,
        projectIds: [],
        totalXp: 0,
        level: 1,
        joinedAt: now,
        email: `${id}@workverse.demo`,
      };
      patchBusiness((b) => ({
        employees: [...b.employees, employee],
        attendance: {
          ...b.attendance,
          [id]: { employeeId: id, status, clockInAt: status === 'off' ? undefined : now, lastSeenAt: now },
        },
      }));
      set((s) => ({ presentation: { ...s.presentation, avatars: { ...s.presentation.avatars, [id]: generateAvatar(id) } } }));
      if (status !== 'off') ui().pushFx({ kind: 'arrive', employeeId: id });
      return id;
    },

    updateEmployee: (id, patch) =>
      patchBusiness((b) => ({ employees: b.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

    deleteEmployee: (id) => {
      if (id === get().currentUserId) return;
      patchBusiness((b) => {
        const attendance = { ...b.attendance };
        delete attendance[id];
        return {
          employees: b.employees.filter((e) => e.id !== id),
          attendance,
          tasks: b.tasks.map((t) => (t.assigneeId === id ? { ...t, assigneeId: null } : t)),
        };
      });
      set((s) => {
        const avatars = { ...s.presentation.avatars };
        delete avatars[id];
        return { presentation: { ...s.presentation, avatars } };
      });
      if (useUi.getState().selectedEmployeeId === id) ui().selectEmployee(null);
    },

    updateDepartment: (id, patch) =>
      patchBusiness((b) => ({ departments: b.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

    updateSettings: (patch) => patchBusiness((b) => ({ settings: { ...b.settings, ...patch } })),

    setCompanyName: (name) => patchBusiness((b) => ({ company: { ...b.company, name } })),

    updateAvatar: (employeeId, patch) =>
      set((s) => ({
        presentation: {
          ...s.presentation,
          avatars: {
            ...s.presentation.avatars,
            [employeeId]: { ...(s.presentation.avatars[employeeId] ?? generateAvatar(employeeId)), ...patch },
          },
        },
      })),

    markNotificationsRead: () =>
      patchBusiness((b) => ({ notifications: b.notifications.map((n) => (n.read ? n : { ...n, read: true })) })),

    // ---------------- 制作データ ----------------
    uploadAssets: async (files, { departmentId, projectId, note }) => {
      const me = get().currentUserId;
      if (!me) return 0;
      const metas: AssetMeta[] = [];
      for (const f of files) {
        if (f.size > MAX_FILE_SIZE) {
          ui().toast({ tone: 'warn', title: `${f.name} はサイズ上限（500MB）を超えています` });
          continue;
        }
        const id = uid('asset');
        try {
          await fileStore.put(id, f);
        } catch {
          ui().toast({ tone: 'warn', title: `${f.name} を保存できませんでした`, body: 'ブラウザの保存容量が不足している可能性があります' });
          continue;
        }
        metas.push({ id, name: f.name, size: f.size, mimeType: f.type || 'application/octet-stream', departmentId, projectId, uploaderId: me, note, uploadedAt: nowIso() });
      }
      if (!metas.length) return 0;
      patchBusiness((b) => ({ assets: [...metas, ...(b.assets ?? [])] }));
      const meName = get().business.employees.find((e) => e.id === me)?.name ?? '';
      const dept = get().business.departments.find((d) => d.id === departmentId)?.name ?? '';
      // チーム宛の通知：該当チームのメンバー全員に届く（アップロードした本人を除く）
      const members = get().business.employees.filter((e) => e.departmentId === departmentId && e.id !== me);
      notifyMany(
        members.map((e) => ({
          employeeId: e.id,
          kind: 'file' as const,
          title: `${meName} が ${dept} 宛に制作データを${metas.length}件アップロード`,
          body: metas.map((m) => m.name).join('、') + (note ? ` — ${note}` : ''),
        })),
      );
      ui().toast({ tone: 'success', title: `${metas.length}件のファイルをアップロードしました`, body: `${dept}のメンバー${members.length}名に通知しました` });
      return metas.length;
    },

    deleteAsset: async (id) => {
      await fileStore.remove(id).catch(() => undefined);
      patchBusiness((b) => ({ assets: (b.assets ?? []).filter((a) => a.id !== id) }));
    },

    // ---------------- データ管理 ----------------
    resetToDemo: () => {
      const s = createSeedState();
      fileStore.clear().catch(() => undefined);
      const me = get().currentUserId;
      set({ business: s.business, presentation: s.presentation });
      if (me && !s.business.employees.some((e) => e.id === me)) {
        sessionStore.clear();
        set({ currentUserId: null });
      } else if (me) {
        // 初期化後も現在のユーザーは出勤中を維持
        setAttendance(me, { status: 'working', clockInAt: nowIso(), lastSeenAt: nowIso() });
      }
      ui().resetSelection();
      ui().toast({ tone: 'info', title: 'デモデータに初期化しました' });
    },

    wipeAll: () => {
      const s = createEmptyState();
      storage.clear();
      fileStore.clear().catch(() => undefined);
      sessionStore.clear();
      set({ business: s.business, presentation: s.presentation, currentUserId: null, resumableUserId: null });
      ui().resetSelection();
      ui().setView('office');
      ui().toast({ tone: 'warn', title: 'すべてのデータを削除しました', body: '最小構成で再作成しました' });
    },

    exportJson: () => {
      const s = get();
      const data: PersistedState = {
        schemaVersion: SCHEMA_VERSION,
        savedAt: nowIso(),
        business: s.business,
        presentation: s.presentation,
      };
      return JSON.stringify(data, null, 2);
    },
  };
});

// ---------- 自動保存 ----------
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const persistNow = () => {
  const s = useApp.getState();
  storage.save({ schemaVersion: SCHEMA_VERSION, savedAt: nowIso(), business: s.business, presentation: s.presentation });
};

useApp.subscribe((s, prev) => {
  if (s.business === prev.business && s.presentation === prev.presentation) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 250);
});

// 起動直後（ロールオーバー結果など）も保存
persistNow();

if (typeof window !== 'undefined') {
  // ブラウザを閉じる・タブを離れる：勤怠は変更せず最終操作時刻のみ記録
  window.addEventListener('pagehide', () => {
    useApp.getState().touch();
    persistNow();
  });
  setInterval(() => useApp.getState().touch(), 60_000);
}

// ---------- セレクタ ----------
export const selectMe = (s: AppState) => s.business.employees.find((e) => e.id === s.currentUserId);
