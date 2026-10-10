import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Maximize, Minus, Plus, RotateCcw, RotateCw, Sparkles, Swords } from 'lucide-react';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { companyLevelInfo, companyXp, levelInfo, MISSIONS } from '../game/rules';
import { cx, todayKey } from '../lib/utils';
import { Avatar2D, Progress } from './common';
import { isTodayTask, taskStats, useIsMobile, useMe } from './hooks';
import { TaskRow } from './TaskRow';
import { DepartmentPanel, EmployeePanel } from './panels/InfoPanels';
import { SIDEBAR_W } from './Sidebar';

/** スマホ用ボトムシート（下部タブバーの上） */
export const SHEET_MOBILE = 'fixed inset-x-2 bottom-[calc(72px+env(safe-area-inset-bottom))] max-h-[46dvh]';

const useLeft = () => {
  const collapsed = useUi((s) => s.sidebarCollapsed);
  return (collapsed ? SIDEBAR_W.closed : SIDEBAR_W.open) + 12;
};

const DepartmentList = () => {
  const departments = useApp((s) => s.business.departments);
  const employees = useApp((s) => s.business.employees);
  const attendance = useApp((s) => s.business.attendance);
  const tasks = useApp((s) => s.business.tasks);
  const selected = useUi((s) => s.selectedDepartmentId);
  const selectDepartment = useUi((s) => s.selectDepartment);
  const cameraTo = useUi((s) => s.cameraTo);
  const open = useUi((s) => s.deptListOpen);
  const setOpen = useUi((s) => s.setDeptListOpen);
  const left = useLeft();
  const mobile = useIsMobile();

  const rows = useMemo(
    () =>
      departments.map((d) => {
        const members = employees.filter((e) => e.departmentId === d.id);
        const present = members.filter((e) => (attendance[e.id]?.status ?? 'off') !== 'off').length;
        const s = taskStats(tasks.filter((t) => t.departmentId === d.id && isTodayTask(t)));
        return { d, total: members.length, present, s };
      }),
    [departments, employees, attendance, tasks],
  );

  if (mobile)
    return (
      <div className="pointer-events-auto absolute inset-x-0 top-[60px] z-10 flex gap-1.5 overflow-x-auto px-2 pb-1">
        <button
          className={cx('flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md', !selected ? 'border-cyan-300/50 bg-cyan-400/15 text-white' : 'border-white/10 bg-ink-900/75 text-zinc-300')}
          onClick={() => {
            selectDepartment(null);
            cameraTo({ kind: 'overview' });
          }}
        >
          <Maximize size={12} /> 全体
        </button>
        {rows.map(({ d, total, present }) => (
          <button
            key={d.id}
            onClick={() => selectDepartment(d.id)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur-md',
              selected === d.id ? 'border-white/30 bg-white/15 text-white' : 'border-white/10 bg-ink-900/75 text-zinc-300',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
            {d.name}
            <span className="text-zinc-500">
              {present}/{total}
            </span>
          </button>
        ))}
      </div>
    );

  return (
    <div className="panel pointer-events-auto absolute top-[68px] z-10 w-[248px] overflow-hidden" style={{ left }}>
      <button className="flex w-full items-center justify-between px-4 py-3" onClick={() => setOpen(!open)}>
        <span className="section-title">チーム</span>
        {open ? <ChevronUp size={15} className="text-zinc-500" /> : <ChevronDown size={15} className="text-zinc-500" />}
      </button>
      {open && (
        <div className="px-2 pb-2">
          <button
            className={cx('mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-white/[0.05]', !selected && 'text-zinc-100')}
            onClick={() => {
              selectDepartment(null);
              cameraTo({ kind: 'overview' });
            }}
          >
            <Maximize size={14} className="text-accent" /> オフィス全体
          </button>
          {rows.map(({ d, total, present, s }) => (
            <button
              key={d.id}
              onClick={() => selectDepartment(d.id)}
              className={cx(
                'w-full rounded-lg border px-2.5 py-2 text-left transition',
                selected === d.id ? 'border-white/15 bg-white/[0.07]' : 'border-transparent hover:bg-white/[0.04]',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 truncate text-sm text-zinc-100">{d.name}</span>
                <span className="text-xs tabular-nums text-zinc-400">
                  {present}/{total}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 pl-4">
                <Progress value={s.ratio} color={d.color} h={3} />
                <span className="w-8 text-right text-[10px] tabular-nums text-zinc-500">{Math.round(s.ratio * 100)}%</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CameraBar = () => {
  const cameraTo = useUi((s) => s.cameraTo);
  const mobile = useIsMobile();
  const btn = 'btn-icon h-9 w-9';
  if (mobile)
    return (
      <div className="panel pointer-events-auto absolute top-[108px] right-2 z-10 flex flex-col gap-0.5 p-1">
        <button className={btn} aria-label="全体表示" onClick={() => cameraTo({ kind: 'overview' })}>
          <Maximize size={16} />
        </button>
        <button className={btn} aria-label="ズームイン" onClick={() => cameraTo({ kind: 'zoom', delta: 8 })}>
          <Plus size={16} />
        </button>
        <button className={btn} aria-label="ズームアウト" onClick={() => cameraTo({ kind: 'zoom', delta: -8 })}>
          <Minus size={16} />
        </button>
        <button className={btn} aria-label="回転" onClick={() => cameraTo({ kind: 'rotate', delta: 0.5 })}>
          <RotateCcw size={16} />
        </button>
      </div>
    );
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5">
      <div className="panel flex items-center gap-0.5 p-1">
        <button className={btn} title="左に回転" onClick={() => cameraTo({ kind: 'rotate', delta: 0.5 })}>
          <RotateCcw size={16} />
        </button>
        <button className={btn} title="右に回転" onClick={() => cameraTo({ kind: 'rotate', delta: -0.5 })}>
          <RotateCw size={16} />
        </button>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <button className={btn} title="ズームアウト" onClick={() => cameraTo({ kind: 'zoom', delta: -8 })}>
          <Minus size={16} />
        </button>
        <button className={btn} title="ズームイン" onClick={() => cameraTo({ kind: 'zoom', delta: 8 })}>
          <Plus size={16} />
        </button>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <button className="btn h-9 border-0 bg-transparent text-xs" onClick={() => cameraTo({ kind: 'overview' })}>
          <Maximize size={15} /> 全体表示
        </button>
      </div>
      <div className="hidden text-[10px] text-zinc-500 md:block">ドラッグ：回転 ／ 右ドラッグ：移動 ／ ホイール：ズーム ／ クリック：社員を選択</div>
    </div>
  );
};

const PlayerCard = () => {
  const me = useMe();
  const ledger = useApp((s) => s.business.xpLedger);
  const business = useApp((s) => s.business);
  const setView = useUi((s) => s.setView);
  const left = useLeft();
  const mobile = useIsMobile();
  if (!me || mobile) return null;
  const lv = levelInfo(me.totalXp);
  const cxp = companyXp({ xpLedger: ledger });
  const company = companyLevelInfo(cxp);
  const today = todayKey();
  const missionsDone = MISSIONS.filter((m) => business.missionClaims.some((c) => c.date === today && c.employeeId === me.id && c.missionId === m.id)).length;
  return (
    <div className="panel pointer-events-auto absolute bottom-3 z-10 w-[248px] p-3.5" style={{ left }}>
      <div className="flex items-center gap-3">
        <Avatar2D employeeId={me.id} size={40} ring="#38d6e8" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="truncate text-sm font-medium">{me.name}</span>
            <span className="text-xs font-semibold text-accent">Lv.{me.level}</span>
          </div>
          <Progress value={lv.ratio} className="mt-1.5" h={5} />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-zinc-500">
            <span>
              {lv.current}/{lv.need} XP
            </span>
            <span>次のレベルまで {lv.need - lv.current}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-lg bg-white/[0.03] px-2.5 py-2 text-left hover:bg-white/[0.06]" onClick={() => setView('achievements')}>
          <div className="text-[10px] text-zinc-500">デイリーミッション</div>
          <div className="text-sm font-semibold tabular-nums">
            {missionsDone}
            <span className="text-zinc-500">/{MISSIONS.length}</span>
          </div>
        </button>
        <button className="rounded-lg bg-white/[0.03] px-2.5 py-2 text-left hover:bg-white/[0.06]" onClick={() => setView('achievements')}>
          <div className="text-[10px] text-zinc-500">オフィス Lv.{company.level}</div>
          <Progress value={company.ratio} color="#ffd27a" h={4} className="mt-1.5" />
          <div className="mt-1 truncate text-[10px] text-zinc-500">{company.next ? `次: ${company.next.name}` : '最大レベル'}</div>
        </button>
      </div>
    </div>
  );
};

const TodayQuests = () => {
  const me = useApp((s) => s.currentUserId);
  const tasks = useApp((s) => s.business.tasks);
  const openTaskEditor = useUi((s) => s.openTaskEditor);
  const setView = useUi((s) => s.setView);
  const arriving = useUi((s) => s.arriving);
  const mobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(mobile);
  const mine = useMemo(() => tasks.filter((t) => t.assigneeId === me && isTodayTask(t)), [tasks, me]);
  const st = taskStats(mine);
  const sorted = [...mine].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'));

  // 出勤演出の後に本日のタスクを開く
  useEffect(() => {
    if (arriving) setCollapsed(false);
  }, [arriving]);

  return (
    <aside className={cx('panel anim-fade-up pointer-events-auto z-10 flex flex-col overflow-hidden', mobile ? SHEET_MOBILE : 'absolute top-[68px] right-3 max-h-[calc(100%-150px)] w-[340px]')}>
      <button className="flex items-center justify-between px-4 py-3" onClick={() => setCollapsed((c) => !c)}>
        <span className="flex items-center gap-2">
          <Swords size={15} className="text-accent" />
          <span className="text-sm font-semibold">本日のクエスト</span>
          <span className="text-xs tabular-nums text-zinc-500">
            {st.done}/{st.total}
          </span>
        </span>
        {collapsed ? <ChevronDown size={15} className="text-zinc-500" /> : <ChevronUp size={15} className="text-zinc-500" />}
      </button>
      {!collapsed && (
        <>
          <div className="px-4 pb-2">
            <Progress value={st.ratio} h={4} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {sorted.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">本日のタスクはありません</div>
            ) : (
              sorted.map((t) => <TaskRow key={t.id} task={t} dense />)
            )}
          </div>
          <div className="flex gap-2 border-t border-white/[0.06] p-2.5">
            <button className="btn flex-1 text-xs" onClick={() => openTaskEditor(null, { assigneeId: me })}>
              <Plus size={14} /> 新規タスク
            </button>
            <button className="btn flex-1 text-xs" onClick={() => setView('quests')}>
              すべて表示
            </button>
          </div>
        </>
      )}
    </aside>
  );
};

/** 出勤時の処理ステップ演出 */
const ArrivalSequence = () => {
  const arriving = useUi((s) => s.arriving);
  const me = useMe();
  const dept = useApp((s) => s.business.departments.find((d) => d.id === me?.departmentId));
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!arriving) return;
    setStep(0);
    const timers = [1, 2, 3, 4, 5].map((i) => setTimeout(() => setStep(i), i * 380));
    return () => timers.forEach(clearTimeout);
  }, [arriving]);
  if (!arriving || !me) return null;
  const steps = ['ユーザー情報を読み込み', `所属部署：${dept?.name ?? '-'}`, '出勤状態を ON', 'デスクへ移動', '本日のタスクを準備'];
  return (
    <div className="pointer-events-none absolute top-20 left-1/2 z-30 -translate-x-1/2">
      <div className="panel anim-pop w-[300px] px-5 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="text-sm font-semibold">出勤しています…</span>
        </div>
        <ul className="space-y-1.5">
          {steps.map((s, i) => (
            <li key={s} className={cx('flex items-center gap-2 text-xs transition', i < step ? 'text-zinc-200' : 'text-zinc-600')}>
              <span className={cx('flex h-4 w-4 items-center justify-center rounded-full border', i < step ? 'border-accent bg-accent text-ink-950' : 'border-zinc-600')}>
                {i < step && <Check size={10} strokeWidth={3} />}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const OfficeHud = () => {
  const selectedEmployee = useUi((s) => s.selectedEmployeeId);
  const selectedDept = useUi((s) => s.selectedDepartmentId);
  return (
    <>
      <DepartmentList />
      <PlayerCard />
      <CameraBar />
      <ArrivalSequence />
      {selectedEmployee ? (
        <EmployeePanel employeeId={selectedEmployee} />
      ) : selectedDept ? (
        <DepartmentPanel departmentId={selectedDept} />
      ) : (
        <TodayQuests />
      )}
    </>
  );
};
