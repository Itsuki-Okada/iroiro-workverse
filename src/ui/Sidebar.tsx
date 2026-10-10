import { Award, Building2, CloudUpload, ChevronsLeft, ChevronsRight, FolderKanban, LayoutDashboard, Network, Settings, Swords, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import type { ViewKey } from '../store/uiStore';
import { cx, todayKey } from '../lib/utils';
import { MISSIONS } from '../game/rules';

const ITEMS: { key: ViewKey; label: string; icon: LucideIcon }[] = [
  { key: 'office', label: 'オフィス', icon: Building2 },
  { key: 'quests', label: 'クエスト', icon: Swords },
  { key: 'projects', label: 'プロジェクト', icon: FolderKanban },
  { key: 'files', label: '制作データ', icon: CloudUpload },
  { key: 'employees', label: 'メンバー一覧', icon: Users },
  { key: 'departments', label: 'チーム管理', icon: Network },
  { key: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { key: 'achievements', label: '実績', icon: Award },
  { key: 'settings', label: '設定', icon: Settings },
];

export const SIDEBAR_W = { open: 196, closed: 60 };
export const BOTTOM_NAV_H = 64;

/** スマホ用の下部タブバー（横スクロール） */
export const BottomNav = () => {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-ink-900/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex overflow-x-auto px-1" style={{ height: BOTTOM_NAV_H }}>
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cx('flex min-w-[64px] flex-1 flex-col items-center justify-center gap-1 text-[10px]', active ? 'text-accent' : 'text-zinc-500')}
            >
              <Icon size={20} />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const Sidebar = () => {
  const view = useUi((s) => s.view);
  const setView = useUi((s) => s.setView);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  const me = useApp((s) => s.currentUserId);
  const tasks = useApp((s) => s.business.tasks);
  const business = useApp((s) => s.business);

  const openQuests = tasks.filter((t) => t.assigneeId === me && t.status !== 'done').length;
  const today = todayKey();
  const claimable = me
    ? MISSIONS.filter(
        (m) =>
          m.progress(business, me, today) >= m.target &&
          !business.missionClaims.some((c) => c.date === today && c.employeeId === me && c.missionId === m.id),
      ).length
    : 0;
  const badge: Partial<Record<ViewKey, number>> = { quests: openQuests, achievements: claimable };

  return (
    <nav
      className="pointer-events-auto absolute top-14 bottom-0 left-0 z-20 flex flex-col border-r border-white/[0.06] bg-ink-900/80 py-3 backdrop-blur-xl transition-[width] duration-200"
      style={{ width: collapsed ? SIDEBAR_W.closed : SIDEBAR_W.open }}
    >
      <div className="flex flex-1 flex-col gap-0.5 px-2">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          const n = badge[key];
          return (
            <button
              key={key}
              title={label}
              onClick={() => setView(key)}
              className={cx(
                'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition',
                active ? 'bg-white/[0.07] text-zinc-50' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
              )}
            >
              {active && <span className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full bg-accent" />}
              <Icon size={18} className={cx('shrink-0', active && 'text-accent')} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!!n && (
                <span
                  className={cx(
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                    key === 'achievements' ? 'bg-amber-300 text-ink-950' : 'bg-white/10 text-zinc-300',
                    collapsed ? 'absolute top-1 right-1' : 'ml-auto',
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button className="mx-2 flex h-9 items-center gap-3 rounded-lg px-3 text-xs text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300" onClick={toggle}>
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed && '折りたたむ'}
      </button>
    </nav>
  );
};
