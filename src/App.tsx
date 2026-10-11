import { lazy, Suspense, useEffect, useState } from 'react';
import { useApp } from './store/appStore';
import { useUi } from './store/uiStore';
import { OfficeScene } from './three/OfficeScene';
import { Header } from './ui/Header';
import { BottomNav, BOTTOM_NAV_H, Sidebar, SIDEBAR_W } from './ui/Sidebar';
import { useIsMobile } from './ui/hooks';
import { NotificationWatcher } from './ui/NotificationWatcher';
import { LogoDraw, LOGO_DRAW_SECONDS } from './ui/LogoDraw';
import { LoginScreen } from './ui/LoginScreen';
import { OfficeHud } from './ui/OfficeHud';
import { TaskEditor } from './ui/TaskEditor';
import { AvatarEditor } from './ui/AvatarEditor';
import { LevelUpOverlay, Toasts } from './ui/Overlays';
import { QuestsView } from './ui/views/QuestsView';
import { ProjectsView } from './ui/views/ProjectsView';
import { DepartmentsView, EmployeesView } from './ui/views/OrgViews';
import { AchievementsView } from './ui/views/AchievementsView';
import { SettingsView } from './ui/views/SettingsView';
import { FilesView } from './ui/views/FilesView';
import { AttendanceView } from './ui/views/AttendanceView';

const DashboardView = lazy(() => import('./ui/views/DashboardView').then((m) => ({ default: m.DashboardView })));

const VIEWS = {
  quests: QuestsView,
  projects: ProjectsView,
  attendance: AttendanceView,
  files: FilesView,
  employees: EmployeesView,
  departments: DepartmentsView,
  dashboard: DashboardView,
  achievements: AchievementsView,
  settings: SettingsView,
};

const ViewOverlay = () => {
  const view = useUi((s) => s.view);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const mobile = useIsMobile();
  if (view === 'office') return null;
  const View = VIEWS[view];
  return (
    <main
      className="pointer-events-auto absolute top-14 right-0 bottom-0 z-10 bg-ink-950/90 backdrop-blur-md transition-[left] duration-200"
      style={{
        left: mobile ? 0 : collapsed ? SIDEBAR_W.closed : SIDEBAR_W.open,
        bottom: mobile ? `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom))` : 0,
      }}
    >
      <Suspense fallback={null}>
        <div key={view} className="anim-fade-up h-full">
          <View />
        </div>
      </Suspense>
    </main>
  );
};

/** 読み込み画面：ロゴを線で描くアニメーション。描き終わるまでは表示を続ける */
const SceneLoader = () => {
  const ready = useUi((s) => s.sceneReady);
  const [drawn, setDrawn] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), LOGO_DRAW_SECONDS * 1000);
    return () => clearTimeout(t);
  }, []);
  const hide = ready && drawn;
  useEffect(() => {
    if (!hide) return;
    const t = setTimeout(() => setGone(true), 900);
    return () => clearTimeout(t);
  }, [hide]);
  if (gone) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[45] flex flex-col items-center justify-center bg-ink-950 transition-opacity duration-700 ${hide ? 'opacity-0' : 'opacity-100'}`}
    >
      <LogoDraw className={`w-[min(320px,64vw)] ${drawn ? 'anim-breathe' : ''}`} />
      <div className={`mt-8 text-[10px] tracking-[0.35em] text-zinc-500 transition-opacity duration-500 ${drawn ? 'opacity-100' : 'opacity-0'}`}>
        {ready ? 'WELCOME' : 'BUILDING YOUR OFFICE…'}
      </div>
    </div>
  );
};

export const App = () => {
  const loggedIn = useApp((s) => !!s.currentUserId);
  const view = useUi((s) => s.view);
  const mobile = useIsMobile();
  return (
    <div className="relative h-full w-full select-none">
      <div className="absolute inset-0 isolate z-0">
        <OfficeScene />
      </div>
      <SceneLoader />
      {!loggedIn ? (
        <LoginScreen />
      ) : (
        <div className="pointer-events-none absolute inset-0">
          <Header />
          {mobile ? <BottomNav /> : <Sidebar />}
          <NotificationWatcher />
          {view === 'office' && <OfficeHud />}
          <ViewOverlay />
        </div>
      )}
      {loggedIn && <TaskEditor />}
      {loggedIn && <AvatarEditor />}
      <LevelUpOverlay />
      <Toasts />
    </div>
  );
};
