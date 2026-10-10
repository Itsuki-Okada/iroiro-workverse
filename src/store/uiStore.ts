// ============================================================
// UIストア（永続化しない一時的な表示状態）
// ============================================================
import { create } from 'zustand';
import { uid } from '../lib/utils';

type DOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ViewKey =
  | 'office'
  | 'quests'
  | 'attendance'
  | 'projects'
  | 'files'
  | 'employees'
  | 'departments'
  | 'dashboard'
  | 'achievements'
  | 'settings';

export type CameraCommand =
  | { kind: 'overview'; nonce: number }
  | { kind: 'department'; departmentId: string; nonce: number }
  | { kind: 'employee'; employeeId: string; nonce: number }
  | { kind: 'zoom'; delta: number; nonce: number }
  | { kind: 'rotate'; delta: number; nonce: number }
  /** 指定地点へ移動してズーム（ダブルタップ） */
  | { kind: 'point'; x: number; z: number; nonce: number }
  /** 共用エリア（休憩スペース・会議室など）へズーム */
  | { kind: 'area'; area: string; nonce: number };

export type FxEvent =
  | { id: string; kind: 'taskComplete'; employeeId: string; xp: number }
  | { id: string; kind: 'levelUp'; employeeId: string; level: number }
  | { id: string; kind: 'arrive'; employeeId: string }
  | { id: string; kind: 'leave'; employeeId: string }
  | { id: string; kind: 'confetti'; x: number; z: number };

export interface Toast {
  id: string;
  tone: 'info' | 'success' | 'xp' | 'warn' | 'badge';
  title: string;
  body?: string;
}

export interface LevelUpOverlay {
  id: string;
  from: number;
  to: number;
  name: string;
}

export interface Gathering {
  id: string;
  projectId: string;
  projectName: string;
  memberIds: string[];
}

/** ハイタッチの集合場所（受付と共有スペースの間） */
export const GATHER_POINT: [number, number] = [0, 6.4];

interface UiState {
  gathering: Gathering | null;
  startGathering: (g: Omit<Gathering, 'id'>) => void;
  view: ViewKey;
  selectedEmployeeId: string | null;
  selectedDepartmentId: string | null;
  hoveredEmployeeId: string | null;
  camera: CameraCommand | null;
  fx: FxEvent[];
  toasts: Toast[];
  levelUp: LevelUpOverlay | null;
  taskEditor: { open: boolean; taskId: string | null; defaults?: Record<string, unknown> };
  avatarEditorFor: string | null;
  /** ログイン直後の「出勤演出」中 */
  arriving: boolean;
  /** 退勤演出中 */
  leaving: boolean;
  sidebarCollapsed: boolean;
  /** 3Dシーンの初回描画が完了したか */
  sceneReady: boolean;
  setSceneReady: () => void;
  deptListOpen: boolean;

  setView: (v: ViewKey) => void;
  selectEmployee: (id: string | null, opts?: { fly?: boolean }) => void;
  selectDepartment: (id: string | null, opts?: { fly?: boolean }) => void;
  setHovered: (id: string | null) => void;
  cameraTo: (cmd: DOmit<CameraCommand, 'nonce'>) => void;
  pushFx: (e: DOmit<FxEvent, 'id'>) => void;
  consumeFx: (id: string) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  showLevelUp: (o: Omit<LevelUpOverlay, 'id'>) => void;
  closeLevelUp: () => void;
  openTaskEditor: (taskId?: string | null, defaults?: Record<string, unknown>) => void;
  closeTaskEditor: () => void;
  openAvatarEditor: (employeeId: string | null) => void;
  setArriving: (v: boolean) => void;
  setLeaving: (v: boolean) => void;
  toggleSidebar: () => void;
  setDeptListOpen: (v: boolean) => void;
  resetSelection: () => void;
}

let nonce = 0;

export const useUi = create<UiState>((set, get) => ({
  view: 'office',
  gathering: null,
  startGathering: (g) => {
    const id = uid('gather');
    set({ gathering: { ...g, id } });
    // 集合したら紙吹雪、しばらくしたら解散
    setTimeout(() => get().gathering?.id === id && get().pushFx({ kind: 'confetti', x: GATHER_POINT[0], z: GATHER_POINT[1] }), 9000);
    setTimeout(() => get().gathering?.id === id && set({ gathering: null }), 19000);
    setTimeout(() => get().view === 'office' && get().cameraTo({ kind: 'point', x: GATHER_POINT[0], z: GATHER_POINT[1] }), 800);
  },
  selectedEmployeeId: null,
  selectedDepartmentId: null,
  hoveredEmployeeId: null,
  camera: null,
  fx: [],
  toasts: [],
  levelUp: null,
  taskEditor: { open: false, taskId: null },
  avatarEditorFor: null,
  arriving: false,
  leaving: false,
  sidebarCollapsed: false,
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),
  deptListOpen: true,

  setView: (view) => set({ view }),
  selectEmployee: (id, opts) => {
    set({ selectedEmployeeId: id, selectedDepartmentId: id ? null : get().selectedDepartmentId });
    if (id && opts?.fly !== false) get().cameraTo({ kind: 'employee', employeeId: id });
  },
  selectDepartment: (id, opts) => {
    set({ selectedDepartmentId: id, selectedEmployeeId: null });
    if (id && opts?.fly !== false) get().cameraTo({ kind: 'department', departmentId: id });
  },
  setHovered: (id) => {
    if (get().hoveredEmployeeId !== id) set({ hoveredEmployeeId: id });
  },
  cameraTo: (cmd) => set({ camera: { ...cmd, nonce: ++nonce } as CameraCommand }),
  pushFx: (e) => set((s) => ({ fx: [...s.fx, { ...e, id: uid('fx') } as FxEvent] })),
  consumeFx: (id) => set((s) => ({ fx: s.fx.filter((f) => f.id !== id) })),
  toast: (t) => {
    const id = uid('toast');
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), t.tone === 'badge' ? 5200 : 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  showLevelUp: (o) => set({ levelUp: { ...o, id: uid('lv') } }),
  closeLevelUp: () => set({ levelUp: null }),
  openTaskEditor: (taskId = null, defaults) => set({ taskEditor: { open: true, taskId, defaults } }),
  closeTaskEditor: () => set({ taskEditor: { open: false, taskId: null } }),
  openAvatarEditor: (employeeId) => set({ avatarEditorFor: employeeId }),
  setArriving: (arriving) => set({ arriving }),
  setLeaving: (leaving) => set({ leaving }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setDeptListOpen: (deptListOpen) => set({ deptListOpen }),
  resetSelection: () => set({ selectedEmployeeId: null, selectedDepartmentId: null }),
}));
