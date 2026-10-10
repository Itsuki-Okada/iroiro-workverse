import type {
  AttendanceRecord,
  AttendanceStatus,
  BusinessData,
  Category,
  Department,
  Employee,
  PersistedState,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  XpLedgerEntry,
} from '../types';
import { addDays, hashString, todayKey, uid } from '../lib/utils';
import { levelInfo } from '../game/rules';
import type { AttendanceEvent } from '../types';
import { generateAvatar } from './avatarFactory';

export const SCHEMA_VERSION = 3;
export const DEMO_USER_ID = 'emp-demo';

const nowIso = () => new Date().toISOString();

const atToday = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-ec', name: 'EC運営チーム', nameEn: 'E-COMMERCE', color: '#4fa3ff', description: 'ECサイトの運営・受注・商品登録・CS', zoneId: 'zone-sales' },
  { id: 'dept-graphic', name: 'グラフィックチーム', nameEn: 'GRAPHIC DESIGN', color: '#b59cff', description: 'バナー・商品画像・印刷物などのデザイン', zoneId: 'zone-creative' },
  { id: 'dept-web', name: 'WEB制作チーム', nameEn: 'WEB DEVELOPMENT', color: '#38d6e8', description: 'Webサイト・LPの設計とコーディング', zoneId: 'zone-web' },
  { id: 'dept-video', name: '動画編集チーム', nameEn: 'VIDEO PRODUCTION', color: '#f27a7a', description: '撮影・動画編集・モーショングラフィックス', zoneId: 'zone-admin' },
  { id: 'dept-sns', name: 'SNS運用チーム', nameEn: 'SOCIAL MEDIA', color: '#f2b45a', description: 'SNSアカウント運用・投稿企画・広告・分析', zoneId: 'zone-marketing' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-ec', name: 'EC運営', color: '#4fa3ff' },
  { id: 'cat-design', name: 'デザイン', color: '#b59cff' },
  { id: 'cat-dev', name: '開発', color: '#38d6e8' },
  { id: 'cat-video', name: '動画編集', color: '#f27a7a' },
  { id: 'cat-sns', name: 'SNS', color: '#f2b45a' },
  { id: 'cat-plan', name: '企画', color: '#7fd1a8' },
  { id: 'cat-meeting', name: '会議', color: '#e58ab8' },
  { id: 'cat-ops', name: '事務・確認', color: '#9aa7b4' },
];

type EmpSeed = [id: string, name: string, dept: string, title: string, xp: number, status: AttendanceStatus, clockIn?: [number, number], fullName?: string];

/** 表示名は「名前の頭文字 + 苗字」のローマ字表記 */
const EMPLOYEE_SEEDS: EmpSeed[] = [
  // オーナー（オーナー室に着席）
  [DEMO_USER_ID, 'I.OKADA', 'dept-ec', 'オーナー', 2200, 'off', undefined, '岡田 斎稀'],
  // EC運営チーム
  ['emp-02', 'S.SATO', 'dept-ec', 'ECディレクター', 1180, 'working', [8, 42]],
  ['emp-03', 'A.SUZUKI', 'dept-ec', 'ECサイト運営', 580, 'working', [9, 0]],
  ['emp-04', 'K.ITO', 'dept-ec', '受注・カスタマーサポート', 270, 'away', [9, 12]],
  ['emp-05', 'T.YAMAMOTO', 'dept-ec', '商品登録・ささげ', 450, 'working', [9, 30]],
  // グラフィックチーム
  ['emp-06', 'M.YAMADA', 'dept-graphic', 'アートディレクター', 980, 'working', [9, 15]],
  ['emp-07', 'H.MATSUMOTO', 'dept-graphic', 'グラフィックデザイナー', 540, 'working', [9, 40]],
  ['emp-08', 'A.INOUE', 'dept-graphic', 'イラストレーター', 360, 'away', [9, 2]],
  ['emp-09', 'R.KIMURA', 'dept-graphic', 'デザイナー', 220, 'off'],
  // WEB制作チーム
  ['emp-10', 'S.TAKAHASHI', 'dept-web', 'テックリード', 1320, 'working', [8, 30]],
  ['emp-11', 'H.NAKAMURA', 'dept-web', 'フロントエンドエンジニア', 640, 'working', [9, 5]],
  ['emp-12', 'C.YOSHIDA', 'dept-web', 'Webディレクター', 760, 'meeting', [8, 55]],
  ['emp-13', 'N.KOBAYASHI', 'dept-web', 'Webデザイナー', 310, 'working', [9, 20]],
  // 動画編集チーム
  ['emp-14', 'M.KATO', 'dept-video', '映像ディレクター', 890, 'working', [8, 50]],
  ['emp-15', 'M.HAYASHI', 'dept-video', '動画編集', 600, 'working', [9, 25]],
  ['emp-16', 'K.SHIMIZU', 'dept-video', 'モーショングラフィックス', 410, 'meeting', [9, 10]],
  ['emp-17', 'Y.MORI', 'dept-video', '動画編集', 150, 'off'],
  // SNS運用チーム
  ['emp-18', 'T.HASHIMOTO', 'dept-sns', 'SNSマネージャー', 700, 'meeting', [8, 45]],
  ['emp-19', 'Y.YAMAGUCHI', 'dept-sns', 'コンテンツクリエイター', 600, 'working', [9, 0]],
  ['emp-20', 'M.ISHIKAWA', 'dept-sns', 'SNS運用・分析', 330, 'working', [9, 18]],
  ['emp-21', 'T.MAEDA', 'dept-sns', '広告運用', 260, 'away', [9, 30]],
];

const ROLE_BY_ID: Record<string, Employee['role']> = {
  [DEMO_USER_ID]: 'admin',
  'emp-02': 'manager',
  'emp-06': 'manager',
  'emp-10': 'manager',
  'emp-14': 'manager',
  'emp-18': 'manager',
};

const PROJECTS: Project[] = [
  { id: 'prj-ec-aw', name: 'ECサイト 秋冬リニューアル', description: '秋冬シーズンに向けたトップ・特集ページの刷新', departmentId: 'dept-ec', status: 'active', dueDate: addDays(30), createdAt: nowIso() },
  { id: 'prj-lookbook', name: 'AWルックブック制作', description: '新作アイテムのビジュアルブック', departmentId: 'dept-graphic', status: 'active', dueDate: addDays(20), createdAt: nowIso() },
  { id: 'prj-lp', name: 'キャンペーンLP制作', description: 'ブラックフライデー向けランディングページ', departmentId: 'dept-web', status: 'active', dueDate: addDays(25), createdAt: nowIso() },
  { id: 'prj-movie', name: 'ブランドムービー制作', description: 'iroiro Co. のブランドを伝える60秒ムービー', departmentId: 'dept-video', status: 'active', dueDate: addDays(40), createdAt: nowIso() },
  { id: 'prj-reels', name: 'Instagramリール強化', description: 'リール投稿の定期化とフォロワー拡大', departmentId: 'dept-sns', status: 'active', dueDate: addDays(60), createdAt: nowIso() },
];

const PROJECT_MEMBERS: Record<string, string[]> = {
  'prj-ec-aw': [DEMO_USER_ID, 'emp-02', 'emp-03', 'emp-05', 'emp-07', 'emp-11'],
  'prj-lookbook': ['emp-06', 'emp-07', 'emp-08', 'emp-09'],
  'prj-lp': ['emp-10', 'emp-11', 'emp-12', 'emp-13', 'emp-06'],
  'prj-movie': [DEMO_USER_ID, 'emp-14', 'emp-15', 'emp-16', 'emp-17'],
  'prj-reels': ['emp-18', 'emp-19', 'emp-20', 'emp-21', 'emp-15'],
};

type TaskSeed = [title: string, assignee: string, category: string, priority: TaskPriority, due: number, status: TaskStatus, project?: string, desc?: string];

const TASK_SEEDS: TaskSeed[] = [
  // オーナー（本日のタスク）
  ['月次売上レポートの確認', DEMO_USER_ID, 'cat-plan', 'high', 0, 'todo', undefined, 'EC・SNS経由の売上推移をチェック'],
  ['ブランドムービー初稿チェック', DEMO_USER_ID, 'cat-video', 'urgent', 0, 'in_progress', 'prj-movie', '動画編集チームの初稿にフィードバック'],
  ['秋冬特集ページの最終確認', DEMO_USER_ID, 'cat-ops', 'medium', 0, 'todo', 'prj-ec-aw'],
  ['全体定例ミーティング', DEMO_USER_ID, 'cat-meeting', 'low', 0, 'todo', undefined, '16:00〜 会議室'],
  ['来期の採用計画を整理', DEMO_USER_ID, 'cat-plan', 'medium', 3, 'todo'],
  // EC運営チーム
  ['新商品10点の商品登録', 'emp-05', 'cat-ec', 'high', 0, 'in_progress', 'prj-ec-aw'],
  ['秋冬特集ページの構成案', 'emp-02', 'cat-ec', 'high', 0, 'done', 'prj-ec-aw'],
  ['在庫数の棚卸しと反映', 'emp-03', 'cat-ec', 'medium', 0, 'todo'],
  ['問い合わせメール返信', 'emp-04', 'cat-ec', 'medium', 0, 'todo'],
  // グラフィックチーム
  ['ルックブック表紙デザイン', 'emp-06', 'cat-design', 'high', 0, 'in_progress', 'prj-lookbook'],
  ['商品バナー 5サイズ展開', 'emp-07', 'cat-design', 'medium', 0, 'done', 'prj-ec-aw'],
  ['イラスト素材の作成', 'emp-08', 'cat-design', 'medium', 1, 'todo', 'prj-lookbook'],
  ['ショップカードのデザイン', 'emp-09', 'cat-design', 'low', 3, 'todo'],
  // WEB制作チーム
  ['LPのワイヤーフレーム', 'emp-12', 'cat-dev', 'high', 0, 'done', 'prj-lp'],
  ['LPのコーディング', 'emp-11', 'cat-dev', 'high', 0, 'in_progress', 'prj-lp'],
  ['表示速度の改善', 'emp-10', 'cat-dev', 'medium', 2, 'todo', 'prj-ec-aw'],
  ['LPデザインカンプ', 'emp-13', 'cat-design', 'high', 0, 'todo', 'prj-lp'],
  // 動画編集チーム
  ['ブランドムービー カット編集', 'emp-15', 'cat-video', 'urgent', 0, 'in_progress', 'prj-movie'],
  ['ロゴアニメーション制作', 'emp-16', 'cat-video', 'medium', 1, 'todo', 'prj-movie'],
  ['撮影スケジュール調整', 'emp-14', 'cat-plan', 'medium', 0, 'done', 'prj-movie'],
  ['リール用ショート動画 3本', 'emp-17', 'cat-video', 'medium', 2, 'todo', 'prj-reels'],
  // SNS運用チーム
  ['今週の投稿カレンダー作成', 'emp-18', 'cat-sns', 'high', 0, 'done', 'prj-reels'],
  ['リール投稿の台本作成', 'emp-19', 'cat-sns', 'medium', 0, 'todo', 'prj-reels'],
  ['インサイト週次レポート', 'emp-20', 'cat-sns', 'medium', 0, 'todo', 'prj-reels'],
  ['広告クリエイティブ入稿', 'emp-21', 'cat-sns', 'high', 0, 'todo'],
];

const toDateKeyLocal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** デモ用の打刻履歴：過去 days 日分（平日のみ）＋今日の状態 */
export const generateAttendanceHistory = (
  employees: { id: string }[],
  attendance: Record<string, AttendanceRecord>,
  days = 14,
): AttendanceEvent[] => {
  const events: AttendanceEvent[] = [];
  const now = new Date();
  const at = (base: Date, h: number, m: number) => {
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const push = (employeeId: string, type: AttendanceEvent['type'], iso: string) => events.push({ id: uid('att'), employeeId, type, at: iso });
  for (const e of employees) {
    for (let back = days; back >= 1; back--) {
      const day = new Date(now);
      day.setDate(day.getDate() - back);
      const wd = day.getDay();
      if (wd === 0 || wd === 6) continue;
      const r = hashString(`${e.id}:${day.toDateString()}`);
      if (r % 17 === 0) continue; // ときどき休み
      const inMin = 8 * 60 + 25 + (r % 70); // 8:25〜9:35
      const brMin = 11 * 60 + 50 + ((r >>> 7) % 40); // 11:50〜12:30
      const brLen = 45 + ((r >>> 11) % 25);
      const outMin = 17 * 60 + 30 + ((r >>> 15) % 150); // 17:30〜20:00
      push(e.id, 'clock_in', at(day, Math.floor(inMin / 60), inMin % 60));
      push(e.id, 'break_start', at(day, Math.floor(brMin / 60), brMin % 60));
      push(e.id, 'break_end', at(day, Math.floor((brMin + brLen) / 60), (brMin + brLen) % 60));
      if ((r >>> 19) % 3 === 0) {
        const mt = 14 * 60 + ((r >>> 21) % 90);
        push(e.id, 'meeting_start', at(day, Math.floor(mt / 60), mt % 60));
        push(e.id, 'meeting_end', at(day, Math.floor((mt + 60) / 60), (mt + 60) % 60));
      }
      push(e.id, 'clock_out', at(day, Math.floor(outMin / 60), outMin % 60));
    }
    // 今日：現在のステータスに合わせる
    const a = attendance[e.id];
    // 出勤が今日の場合のみ（旧データからの移行時に前日の状態を今日へ持ち込まない）
    if (a?.clockInAt && a.status !== 'off' && toDateKeyLocal(a.clockInAt) === todayKey()) {
      push(e.id, 'clock_in', a.clockInAt);
      const since = new Date(Math.max(new Date(a.clockInAt).getTime() + 30 * 60000, now.getTime() - 20 * 60000)).toISOString();
      if (a.status === 'away') push(e.id, 'break_start', since);
      if (a.status === 'meeting') push(e.id, 'meeting_start', since);
    }
  }
  return events.sort((x, y) => x.at.localeCompare(y.at));
};

const EMP_DEPT = Object.fromEntries(EMPLOYEE_SEEDS.map((e) => [e[0], e[2]]));
const FULL_NAME = Object.fromEntries(EMPLOYEE_SEEDS.map((e) => [e[0], e[7]]));

export const createSeedState = (): PersistedState => {
  const createdAt = nowIso();
  const employees: Employee[] = EMPLOYEE_SEEDS.map(([id, name, dept, title, xp]) => ({
    id,
    name,
    departmentId: dept,
    title,
    role: ROLE_BY_ID[id] ?? 'member',
    projectIds: Object.entries(PROJECT_MEMBERS)
      .filter(([, m]) => m.includes(id))
      .map(([p]) => p),
    totalXp: xp,
    level: levelInfo(xp).level,
    joinedAt: createdAt,
    email: `${name.toLowerCase().replace('.', '')}@iroiro.co`,
    fullName: FULL_NAME[id],
    isDemoUser: id === DEMO_USER_ID,
  }));

  const attendance: Record<string, AttendanceRecord> = {};
  for (const [id, , , , , status, clockIn] of EMPLOYEE_SEEDS) {
    attendance[id] = {
      employeeId: id,
      status,
      clockInAt: clockIn ? atToday(clockIn[0], clockIn[1]) : undefined,
      lastSeenAt: clockIn ? createdAt : undefined,
    };
  }

  const tasks: Task[] = TASK_SEEDS.map(([title, assignee, cat, priority, due, status, project, desc], i) => ({
    id: `task-seed-${i + 1}`,
    title,
    description: desc ?? '',
    assigneeId: assignee,
    departmentId: EMP_DEPT[assignee] ?? null,
    projectId: project ?? null,
    categoryId: cat,
    priority,
    status,
    dueDate: addDays(due),
    createdAt,
    updatedAt: createdAt,
    completedAt: status === 'done' ? createdAt : undefined,
    // 初期データの完了タスクは付与済み扱い（初期XPに含まれる）
    xpAwarded: status === 'done',
    createdBy: null,
  }));

  // 初期XPを台帳に登録（会社の成長指標 = 台帳の合計）
  const xpLedger: XpLedgerEntry[] = employees.map((e) => ({
    id: `xp-seed-${e.id}`,
    employeeId: e.id,
    amount: e.totalXp,
    reason: 'これまでの実績（初期データ）',
    refId: `seed:${e.id}`,
    at: createdAt,
  }));

  const business: BusinessData = {
    company: { id: 'company-iroiro', name: 'iroiro Co.', createdAt },
    departments: DEFAULT_DEPARTMENTS.map((d) => ({ ...d })),
    employees,
    tasks,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    projects: PROJECTS.map((p) => ({ ...p })),
    attendance,
    attendanceLog: generateAttendanceHistory(employees, attendance),
    attendanceCorrections: {},
    xpLedger,
    achievements: [
      { achievementId: 'first-quest', employeeId: DEMO_USER_ID, at: createdAt },
    ],
    missionClaims: [],
    assets: [],
    notifications: [
      {
        id: 'ntf-welcome',
        employeeId: null,
        kind: 'info',
        title: 'WORKVERSEへようこそ',
        body: 'iroiro Co. の仮想オフィスへようこそ。タスクを完了して経験値を獲得し、オフィスを成長させましょう。',
        at: createdAt,
        read: false,
      },
    ],
    settings: {
      employeeViewScope: 'all',
      graphicsQuality: 'high',
      showNameTags: false,
      autoOfficeUpgrades: true,
      manualOfficeLevel: 1,
    },
    lastActiveDate: todayKey(),
  };

  const avatars = Object.fromEntries(employees.map((e) => [e.id, generateAvatar(e.id)]));
  // デモユーザーは見分けやすい配色に
  avatars[DEMO_USER_ID] = generateAvatar(DEMO_USER_ID, {
    hairStyle: 'sidepart',
    hairColor: '#2e2420',
    topStyle: 'jacket',
    topColor: '#1f2328',
    innerColor: '#f2f1ee',
    bottomColor: '#2d333b',
    accessory: 'glasses',
    accessoryColor: '#1a1d21',
    skinTone: '#e8bc98',
    heightScale: 1,
  });

  // レベルの高いメンバーは着ぐるみで出勤
  avatars['emp-06'] = { ...avatars['emp-06'], costume: 'cat' };
  avatars['emp-18'] = { ...avatars['emp-18'], costume: 'bear' };

  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: createdAt,
    business,
    presentation: { avatars },
  };
};

/** 「全データ削除」後の最小構成（会社・部署・デモユーザーのみ） */
export const createEmptyState = (): PersistedState => {
  const seed = createSeedState();
  const demo = seed.business.employees.find((e) => e.id === DEMO_USER_ID)!;
  const fresh: Employee = { ...demo, totalXp: 0, level: 1, projectIds: [] };
  return {
    ...seed,
    business: {
      ...seed.business,
      employees: [fresh],
      tasks: [],
      projects: [],
      attendance: { [DEMO_USER_ID]: { employeeId: DEMO_USER_ID, status: 'off' } },
      attendanceLog: [],
      attendanceCorrections: {},
      xpLedger: [],
      achievements: [],
      missionClaims: [],
      notifications: [],
    },
    presentation: { avatars: { [DEMO_USER_ID]: seed.presentation.avatars[DEMO_USER_ID] } },
  };
};

export const isToday = (key: string | null | undefined) => key === todayKey();
