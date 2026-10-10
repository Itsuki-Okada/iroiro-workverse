import { useMemo } from 'react';
import { Activity, Building2, CheckCircle2, FolderKanban, Info, ListTodo, Percent, Trophy, Users } from 'lucide-react';
import type { AttendanceStatus } from '../../types';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { companyLevelInfo, companyXp } from '../../game/rules';
import { relativeTime } from '../../lib/utils';
import { Avatar2D, Progress, Stat, STATUS_META, ViewShell } from '../common';
import { computeDashboard, isTodayTask, taskStats, useLookups } from '../hooks';

export const DashboardView = () => {
  const business = useApp((s) => s.business);
  const setView = useUi((s) => s.setView);
  const { emp } = useLookups();
  const k = useMemo(() => computeDashboard(business), [business]);
  const cxp = companyXp(business);
  const company = companyLevelInfo(cxp);

  const byStatus = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { working: 0, away: 0, meeting: 0, off: 0 };
    for (const e of business.employees) c[business.attendance[e.id]?.status ?? 'off']++;
    return c;
  }, [business]);

  const deptRows = business.departments.map((d) => {
    const members = business.employees.filter((e) => e.departmentId === d.id);
    const present = members.filter((e) => (business.attendance[e.id]?.status ?? 'off') !== 'off').length;
    const s = taskStats(business.tasks.filter((t) => t.departmentId === d.id && isTodayTask(t)));
    return { d, members: members.length, present, s };
  });

  const leaders = [...business.employees].sort((a, b) => b.totalXp - a.totalXp).slice(0, 6);
  const activity = [...business.xpLedger].filter((e) => !e.refId.startsWith('seed:')).reverse().slice(0, 8);

  return (
    <ViewShell
      title="ダッシュボード"
      subtitle={business.company.name}
      actions={
        <button className="btn" onClick={() => setView('office')}>
          <Building2 size={15} /> 3Dオフィスに戻る
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="本日の出勤人数" value={k.present} sub={`総社員 ${k.total} 名中`} icon={<Users size={16} />} />
        <Stat label="総社員数" value={k.total} sub={`${business.departments.length} 部署`} icon={<Users size={16} />} accent="#9aa7b4" />
        <Stat
          label="本日のタスク数（会社全体）"
          value={k.todayTasks}
          sub={
            <span className="flex flex-wrap gap-x-2 gap-y-0.5">
              <span>今日まで {k.breakdown.dueToday}</span>
              {k.breakdown.overdue > 0 && <span className="text-red-300">遅れ {k.breakdown.overdue}</span>}
              {k.breakdown.early > 0 && <span className="text-emerald-300">前倒し {k.breakdown.early}</span>}
            </span>
          }
          icon={<ListTodo size={16} />}
          accent="#4fa3ff"
        />
        <Stat label="完了タスク数" value={k.doneTasks} sub="会社全体の本日のタスクのうち完了" icon={<CheckCircle2 size={16} />} accent="#3ddc97" />
        <Stat label="タスク達成率" value={`${Math.round(k.ratio * 100)}%`} sub={<Progress value={k.ratio} h={4} className="mt-1" />} icon={<Percent size={16} />} />
        <Stat label="進行中のプロジェクト" value={k.activeProjects} sub={`全 ${business.projects.length} 件`} icon={<FolderKanban size={16} />} accent="#f2b45a" />
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-zinc-400">
        <Info size={14} className="mt-0.5 shrink-0 text-zinc-500" />
        <span>
          <b className="font-medium text-zinc-300">本日のタスク（会社全体）</b>
          ＝ 全メンバー分の「今日が期限のタスク」＋「期限を過ぎてまだ終わっていないタスク（遅れ）」＋「期限は先だけど今日終わらせたタスク（前倒し）」。
          会社全体で今日やるべき仕事の量と、その達成状況を表します。
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="panel-solid p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">部署別の状況</h3>
            <span className="text-xs text-zinc-500">出勤 / 本日のタスク進捗</span>
          </div>
          <div className="space-y-3.5">
            {deptRows.map(({ d, members, present, s }) => (
              <div key={d.id} className="grid grid-cols-[120px_1fr_64px] items-center gap-4 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[10px] text-zinc-500">出勤</span>
                    <Progress value={members ? present / members : 0} color={d.color} h={5} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-[10px] text-zinc-500">進捗</span>
                    <Progress value={s.ratio} color="#ffffff99" h={5} />
                  </div>
                </div>
                <span className="text-right text-xs tabular-nums text-zinc-400">
                  {present}/{members}
                  <br />
                  {s.done}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-solid p-5">
          <h3 className="mb-4 text-sm font-semibold">出勤ステータス</h3>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
            {(Object.keys(byStatus) as AttendanceStatus[]).map((s) => (
              <div key={s} style={{ width: `${(byStatus[s] / Math.max(1, k.total)) * 100}%`, background: STATUS_META[s].dot }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(Object.keys(byStatus) as AttendanceStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-zinc-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].dot }} />
                  {STATUS_META[s].label}
                </span>
                <span className="font-semibold tabular-nums">{byStatus[s]}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">会社の成長</span>
              <span className="font-semibold">オフィス Lv.{company.level}</span>
            </div>
            <Progress value={company.ratio} color="#ffd27a" className="mt-2" />
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500">
              <span>{cxp.toLocaleString()} XP</span>
              <span>{company.next ? `次: ${company.next.name}（${company.next.requiredXp.toLocaleString()}）` : '最大'}</span>
            </div>
          </div>
        </div>

        <div className="panel-solid p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Trophy size={15} className="text-amber-300" /> レベルランキング
          </h3>
          <div className="space-y-1">
            {leaders.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                <span className="w-4 text-xs font-semibold text-zinc-500">{i + 1}</span>
                <Avatar2D employeeId={e.id} size={28} />
                <span className="flex-1 truncate text-sm">{e.name}</span>
                <span className="text-xs font-semibold tabular-nums text-accent">Lv.{e.level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-solid p-5 xl:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Activity size={15} className="text-accent" /> 最近のアクティビティ
          </h3>
          {activity.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">まだアクティビティはありません。タスクを完了してみましょう。</div>
          ) : (
            <div className="space-y-1">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
                  <Avatar2D employeeId={a.employeeId} size={26} />
                  <span className="text-zinc-300">{emp[a.employeeId]?.name ?? '—'}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-500">{a.reason}</span>
                  <span className="text-xs font-semibold text-cyan-300">+{a.amount}</span>
                  <span className="w-16 text-right text-[11px] text-zinc-500">{relativeTime(a.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ViewShell>
  );
};
