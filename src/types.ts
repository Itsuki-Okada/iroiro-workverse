// ============================================================
// WORKVERSE — ドメイン型定義
// 業務データ（Business）と 3D表示データ（Presentation）を分離している。
// ============================================================

export type ID = string;

// ---------- 業務データ ----------

export type AttendanceStatus = 'working' | 'away' | 'meeting' | 'off';

export type UserRole = 'admin' | 'manager' | 'member';

export interface Company {
  id: ID;
  name: string;
  createdAt: string;
}

export interface Department {
  id: ID;
  name: string;
  nameEn: string;
  color: string; // アクセントカラー（UI / 3D共通）
  description: string;
  /** 3Dレイアウト上のゾーンID（layout.ts で定義） */
  zoneId: string;
}

export interface Employee {
  id: ID;
  name: string;
  departmentId: ID;
  title: string; // 役職
  role: UserRole; // 権限ロール
  projectIds: ID[];
  totalXp: number;
  level: number;
  joinedAt: string;
  email: string;
  /** 本名（表示名はイニシャル+苗字のローマ字） */
  fullName?: string;
  isDemoUser?: boolean;
}

export interface AttendanceRecord {
  employeeId: ID;
  status: AttendanceStatus;
  /** 当日出勤時刻（ISO） */
  clockInAt?: string;
  clockOutAt?: string;
  /** 最後にアプリを操作していた時刻（ブラウザを閉じた場合の判定に使用） */
  lastSeenAt?: string;
  /** 日付が変わって自動で退勤扱いになった場合 */
  autoClosed?: boolean;
  /** 頭上に表示するひとこと（吹き出し） */
  message?: string;
}

/** 勤怠の打刻イベント（出勤・休憩・会議・退勤） */
export type AttendanceEventType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'meeting_start' | 'meeting_end';

export interface AttendanceEvent {
  id: ID;
  employeeId: ID;
  type: AttendanceEventType;
  at: string; // ISO
  /** 退勤し忘れなどによる自動打刻 */
  auto?: boolean;
}

/** 勤怠の手動修正（日単位）。key = `${employeeId}:${YYYY-MM-DD}` */
export interface AttendanceCorrection {
  employeeId: ID;
  date: string;
  clockIn?: string; // HH:MM
  clockOut?: string; // HH:MM
  breakMinutes?: number;
  note: string;
  by: ID;
  at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: ID;
  title: string;
  description: string;
  assigneeId: ID | null;
  departmentId: ID | null;
  projectId: ID | null;
  categoryId: ID | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** 経験値を一度付与したら true。完了⇄未完了の切替で再付与されない */
  xpAwarded: boolean;
  createdBy: ID | null;
}

export interface Category {
  id: ID;
  name: string;
  color: string;
}

export type ProjectStatus = 'active' | 'paused' | 'done';

export interface Project {
  id: ID;
  name: string;
  description: string;
  departmentId: ID | null;
  status: ProjectStatus;
  dueDate: string | null;
  createdAt: string;
}

/** 経験値の台帳。refId（例: task:xxx）で重複付与を防止する */
export interface XpLedgerEntry {
  id: ID;
  employeeId: ID;
  amount: number;
  reason: string;
  refId: string;
  at: string;
}

/** 制作データ（ファイル本体は IndexedDB、メタ情報のみ業務データとして保存） */
export interface AssetMeta {
  id: ID;
  name: string;
  size: number;
  mimeType: string;
  departmentId: ID;
  projectId: ID | null;
  uploaderId: ID;
  note: string;
  uploadedAt: string;
}

export interface UnlockedAchievement {
  achievementId: string;
  employeeId: ID;
  at: string;
}

export interface MissionClaim {
  date: string; // YYYY-MM-DD
  employeeId: ID;
  missionId: string;
  at: string;
}

export interface AppNotification {
  id: ID;
  employeeId: ID | null; // null = 全体
  kind: 'level' | 'badge' | 'task' | 'attendance' | 'company' | 'info' | 'file' | 'unlock';
  title: string;
  body?: string;
  at: string;
  read: boolean;
}

export type ViewScope = 'all' | 'department' | 'admin';

export interface CompanySettings {
  /** 社員詳細の閲覧範囲（権限設計） */
  employeeViewScope: ViewScope;
  graphicsQuality: 'high' | 'low';
  showNameTags: boolean;
  /** 会社成長によるオフィス設備の自動反映 */
  autoOfficeUpgrades: boolean;
  /** 手動選択時のオフィスレベル */
  manualOfficeLevel: number;
  /** 時間帯の雰囲気（auto = 現在時刻に連動） */
  timeOfDay?: 'auto' | 'morning' | 'day' | 'evening' | 'night';
  /** 季節イベントの飾り付け（auto = 日付に連動） */
  season?: 'auto' | 'none' | 'halloween' | 'christmas' | 'newyear';
}

/** アバターへのリアクション（👍👏🔥 など） */
export interface Reaction {
  id: ID;
  fromId: ID;
  toId: ID;
  emoji: string;
  at: string;
}

// ---------- 3D表示データ ----------

export type HairStyle = 'short' | 'bob' | 'bun' | 'long' | 'buzz' | 'curly' | 'sidepart';
export type TopStyle = 'shirt' | 'jacket' | 'hoodie' | 'knit' | 'turtleneck';
export type Accessory = 'none' | 'glasses' | 'headphones' | 'earrings' | 'beanie';
/** 着ぐるみ（レベルで解放） */
export type Costume = 'none' | 'bear' | 'cat' | 'rabbit' | 'panda' | 'dino' | 'penguin';

export interface AvatarConfig {
  employeeId: ID;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  topStyle: TopStyle;
  topColor: string;
  innerColor: string;
  bottomColor: string;
  shoeColor: string;
  accessory: Accessory;
  accessoryColor: string;
  costume?: Costume;
  heightScale: number; // 0.94 - 1.06
}

// ---------- 永続化ルート ----------

export interface BusinessData {
  company: Company;
  departments: Department[];
  employees: Employee[];
  tasks: Task[];
  categories: Category[];
  projects: Project[];
  attendance: Record<ID, AttendanceRecord>;
  /** 打刻履歴（勤怠管理） */
  attendanceLog: AttendanceEvent[];
  attendanceCorrections: Record<string, AttendanceCorrection>;
  xpLedger: XpLedgerEntry[];
  achievements: UnlockedAchievement[];
  missionClaims: MissionClaim[];
  notifications: AppNotification[];
  assets: AssetMeta[];
  reactions?: Reaction[];
  settings: CompanySettings;
  /** 最後にアプリが開かれた日付（日付変更時の勤怠ロールオーバー判定） */
  lastActiveDate: string;
}

export interface PresentationData {
  avatars: Record<ID, AvatarConfig>;
}

export interface PersistedState {
  schemaVersion: number;
  savedAt: string;
  business: BusinessData;
  presentation: PresentationData;
}
