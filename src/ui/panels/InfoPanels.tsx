import { useMemo } from 'react';
import { Crosshair, Lock, Palette, Plus, X } from 'lucide-react';
import type { AttendanceStatus } from '../../types';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { canManageOrganization, canViewEmployeeDetails, ROLE_LABEL } from '../../services/permissions';
import { ACHIEVEMENTS, levelInfo } from '../../game/rules';
import { cx, formatTime } from '../../lib/utils';
import { Avatar2D, Progress, STATUS_META, StatusPill } from '../common';
import { isTodayTask, taskStats, useIsMobile, useLookups, useMe } from '../hooks';
import { TaskRow } from '../TaskRow';
import { ACHIEVEMENT_ICON } from '../icons';

const PanelFrame = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => {
  const mobile = useIsMobile();
  return (
  <aside
    className={cx(
      'panel anim-fade-up pointer-events-auto z-20 flex flex-col overflow-hidden',
      mobile ? 'fixed inset-x-2 bottom-[calc(72px+env(safe-area-inset-bottom))] max-h-[58dvh]' : 'absolute top-[68px] right-3 bottom-3 w-[340px]',
    )}
  >
    <button className="btn-icon absolute top-2.5 right-2.5 z-10" onClick={onClose} aria-label="閉じる">
      <X size={17} />
    </button>
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
  </aside>
  );
};

export const EmployeePanel = ({ employeeId }: { employeeId: string }) => {
  const me = useMe();
  const employee = useApp((s) => s.business.employees.find((e) => e.id === employeeId));
  const settings = useApp((s) => s.business.settings);
  const att = useApp((s) => s.business.attendance[employeeId]);
  const tasks = useApp((s) => s.business.tasks);
  const achievements = useApp((s) => s.business.achievements);
  const setEmployeeStatus = useApp((s) => s.setEmployeeStatus);
  const selectEmployee = useUi((s) => s.selectEmployee);
  const cameraTo = useUi((s) => s.cameraTo);
  const openTaskEditor = useUi((s) => s.openTaskEditor);
  const openAvatarEditor = useUi((s) => s.openAvatarEditor);
  const { dept, prj } = useLookups();

  const mine = useMemo(() => tasks.filter((t) => t.assigneeId === employeeId), [tasks, employeeId]);
  const todays = useMemo(() => mine.filter((t) => isTodayTask(t)), [mine]);
  if (!employee) return null;

  const d = dept[employee.departmentId];
  const canView = canViewEmployeeDetails(me, employee, settings);
  const isMe = me?.id === employee.id;
  const isAdmin = canManageOrganization(me);
  const lv = levelInfo(employee.totalXp);
  const st = taskStats(todays);
  const status: AttendanceStatus = att?.status ?? 'off';
  const badges = achievements.filter((a) => a.employeeId === employee.id);
  const open = mine.filter((t) => t.status !== 'done' && !isTodayTask(t)).slice(0, 4);

  return (
    <PanelFrame onClose={() => selectEmployee(null)}>
      <div className="relative border-b border-white/[0.06] p-5">
        <div className="absolute inset-x-0 top-0 h-16 opacity-25" style={{ background: `linear-gradient(180deg, ${d?.color ?? '#38d6e8'}, transparent)` }} />
        <div className="relative flex items-center gap-4">
          <Avatar2D employeeId={employee.id} size={64} ring={STATUS_META[status].dot} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold">{employee.name}</h3>
              {isMe && <span className="rounded bg-cyan-400/15 px-1.5 text-[10px] font-semibold text-cyan-200">YOU</span>}
            </div>
            <div className="truncate text-sm text-zinc-400">
              {employee.title}
              {employee.fullName && <span className="ml-2 text-xs text-zinc-500">{employee.fullName}</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="chip" style={{ borderColor: `${d?.color}55` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: d?.color }} />
                {d?.name}
              </span>
              <StatusPill status={status} />
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex gap-2">
          <button className="btn flex-1 text-xs" onClick={() => cameraTo({ kind: 'employee', employeeId: employee.id })}>
            <Crosshair size={14} /> フォーカス
          </button>
          {(isMe || isAdmin) && (
            <button className="btn flex-1 text-xs" onClick={() => openAvatarEditor(employee.id)}>
              <Palette size={14} /> アバター
            </button>
          )}
          <button className="btn flex-1 text-xs" onClick={() => openTaskEditor(null, { assigneeId: employee.id, departmentId: employee.departmentId })}>
            <Plus size={14} /> タスク
          </button>
        </div>
      </div>

      {!canView ? (
        <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-zinc-500">
          <Lock size={20} />
          この社員の詳細情報を閲覧する権限がありません。
          <span className="text-xs">閲覧範囲は「設定」から管理者が変更できます。</span>
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="panel-solid p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] text-zinc-500">LEVEL</div>
                <div className="text-3xl font-semibold tabular-nums">{employee.level}</div>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <div className="tabular-nums">
                  {lv.current} / {lv.need} XP
                </div>
                <div className="text-zinc-500">累計 {employee.totalXp.toLocaleString()} XP</div>
              </div>
            </div>
            <Progress value={lv.ratio} className="mt-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['本日のタスク', st.total],
              ['完了', st.done],
              ['出勤', att?.clockInAt && status !== 'off' ? formatTime(att.clockInAt) : '--:--'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white/[0.03] py-2.5">
                <div className="text-lg font-semibold tabular-nums">{v}</div>
                <div className="text-[10px] text-zinc-500">{k}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="section-title mb-2">担当プロジェクト</div>
            <div className="flex flex-wrap gap-1.5">
              {employee.projectIds.length === 0 && <span className="text-xs text-zinc-500">なし</span>}
              {employee.projectIds.map((id) => prj[id] && <span key={id} className="chip">{prj[id].name}</span>)}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="section-title">本日のタスク</span>
              <span className="text-[11px] text-zinc-500">
                {st.done}/{st.total}
              </span>
            </div>
            {todays.length === 0 ? (
              <div className="rounded-lg bg-white/[0.02] py-4 text-center text-xs text-zinc-500">本日のタスクはありません</div>
            ) : (
              <div className="-mx-2">{todays.map((t) => <TaskRow key={t.id} task={t} dense />)}</div>
            )}
            {open.length > 0 && (
              <>
                <div className="section-title mt-3 mb-1.5">今後のタスク</div>
                <div className="-mx-2">{open.map((t) => <TaskRow key={t.id} task={t} dense />)}</div>
              </>
            )}
          </div>

          <div>
            <div className="section-title mb-2">実績バッジ</div>
            <div className="flex flex-wrap gap-1.5">
              {badges.length === 0 && <span className="text-xs text-zinc-500">まだありません</span>}
              {badges.map((b) => {
                const def = ACHIEVEMENTS.find((a) => a.id === b.achievementId);
                if (!def) return null;
                const Icon = ACHIEVEMENT_ICON[def.icon];
                return (
                  <span key={b.achievementId} title={def.description} className="chip border-amber-300/30 text-amber-200">
                    <Icon size={12} /> {def.name}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            権限: {ROLE_LABEL[employee.role]} · {employee.email}
          </div>

          {isAdmin && !isMe && (
            <div className="rounded-lg border border-dashed border-white/10 p-3">
              <div className="mb-2 text-[11px] text-zinc-500">デモ用：ステータスを手動で設定（管理者のみ）</div>
              <div className="grid grid-cols-4 gap-1">
                {(['working', 'away', 'meeting', 'off'] as const).map((s) => (
                  <button
                    key={s}
                    className={cx('rounded-md border px-1 py-1.5 text-[11px]', status === s ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-zinc-400 hover:bg-white/[0.05]')}
                    onClick={() => setEmployeeStatus(employee.id, s)}
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelFrame>
  );
};

const DeptAssets = ({ departmentId }: { departmentId: string }) => {
  const assets = useApp((s) => s.business.assets ?? []);
  const setView = useUi((s) => s.setView);
  const list = assets.filter((a) => a.departmentId === departmentId);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="section-title">制作データ</span>
        <button className="text-[11px] text-cyan-300 hover:text-cyan-200" onClick={() => setView('files')}>
          {list.length}件 · 開く →
        </button>
      </div>
      {list.slice(0, 3).map((a) => (
        <div key={a.id} className="truncate rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-white/[0.03]">
          {a.name}
        </div>
      ))}
      {list.length === 0 && <div className="text-xs text-zinc-500">まだアップロードはありません</div>}
    </div>
  );
};

export const DepartmentPanel = ({ departmentId }: { departmentId: string }) => {
  const dept = useApp((s) => s.business.departments.find((d) => d.id === departmentId));
  const employees = useApp((s) => s.business.employees);
  const attendance = useApp((s) => s.business.attendance);
  const tasks = useApp((s) => s.business.tasks);
  const projects = useApp((s) => s.business.projects);
  const selectDepartment = useUi((s) => s.selectDepartment);
  const selectEmployee = useUi((s) => s.selectEmployee);

  const members = useMemo(() => employees.filter((e) => e.departmentId === departmentId), [employees, departmentId]);
  if (!dept) return null;
  const present = members.filter((e) => (attendance[e.id]?.status ?? 'off') !== 'off');
  const deptTasks = tasks.filter((t) => t.departmentId === departmentId);
  const today = taskStats(deptTasks.filter((t) => isTodayTask(t)));
  const all = taskStats(deptTasks);
  const deptProjects = projects.filter((p) => p.departmentId === departmentId);

  return (
    <PanelFrame onClose={() => selectDepartment(null)}>
      <div className="relative border-b border-white/[0.06] p-5">
        <div className="absolute inset-x-0 top-0 h-20 opacity-25" style={{ background: `linear-gradient(180deg, ${dept.color}, transparent)` }} />
        <div className="relative">
          <div className="text-[11px] tracking-[0.2em] text-zinc-400">{dept.nameEn}</div>
          <h3 className="mt-1 text-xl font-semibold">{dept.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">{dept.description}</p>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="panel-solid p-3">
            <div className="text-[11px] text-zinc-500">出勤人数</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {present.length}
              <span className="text-sm text-zinc-500"> / {members.length}</span>
            </div>
          </div>
          <div className="panel-solid p-3">
            <div className="text-[11px] text-zinc-500">本日の達成率</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{Math.round(today.ratio * 100)}%</div>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
            <span>本日のタスク</span>
            <span className="tabular-nums">
              {today.done}/{today.total}
            </span>
          </div>
          <Progress value={today.ratio} color={dept.color} />
          <div className="mt-3 mb-1.5 flex justify-between text-xs text-zinc-400">
            <span>全タスク</span>
            <span className="tabular-nums">
              {all.done}/{all.total}
            </span>
          </div>
          <Progress value={all.ratio} color={dept.color} h={4} />
        </div>
        <div>
          <div className="section-title mb-2">所属社員</div>
          <div className="space-y-0.5">
            {members.map((e) => (
              <button key={e.id} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.05]" onClick={() => selectEmployee(e.id)}>
                <Avatar2D employeeId={e.id} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{e.name}</div>
                  <div className="truncate text-[11px] text-zinc-500">{e.title}</div>
                </div>
                <span className="text-[11px] text-zinc-500">Lv.{e.level}</span>
                <StatusPill status={attendance[e.id]?.status ?? 'off'} compact />
              </button>
            ))}
          </div>
        </div>
        <DeptAssets departmentId={departmentId} />
        {deptProjects.length > 0 && (
          <div>
            <div className="section-title mb-2">プロジェクト</div>
            <div className="space-y-2">
              {deptProjects.map((p) => {
                const s = taskStats(tasks.filter((t) => t.projectId === p.id));
                return (
                  <div key={p.id} className="rounded-lg bg-white/[0.03] p-3">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-zinc-500">{Math.round(s.ratio * 100)}%</span>
                    </div>
                    <Progress value={s.ratio} color={dept.color} h={4} className="mt-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  );
};
