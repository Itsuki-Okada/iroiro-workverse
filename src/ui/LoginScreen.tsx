import { useMemo, useState } from 'react';
import { ArrowRight, History, Info, LogIn, Search } from 'lucide-react';
import { useApp } from '../store/appStore';
import { DEMO_USER_ID } from '../data/seed';
import { cx, formatTime } from '../lib/utils';
import { Avatar2D, StatusPill } from './common';

export const LoginScreen = () => {
  const employees = useApp((s) => s.business.employees);
  const departments = useApp((s) => s.business.departments);
  const attendance = useApp((s) => s.business.attendance);
  const companyName = useApp((s) => s.business.company.name);
  const resumable = useApp((s) => s.resumableUserId);
  const login = useApp((s) => s.login);
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  const demo = employees.find((e) => e.id === DEMO_USER_ID) ?? employees[0];
  const resumeEmp = employees.find((e) => e.id === resumable);
  const deptName = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.name])), [departments]);
  const filtered = employees.filter((e) => !q || e.name.includes(q) || deptName[e.departmentId]?.includes(q));

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-stretch">
      {/* グラデーションで3Dを背景として見せる */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/70 to-ink-950/20" />
      <div className="relative flex w-full flex-col justify-between overflow-y-auto p-6 md:p-12 lg:w-[560px]">
        <div className="pointer-events-auto flex items-end gap-4">
          <img src={`${import.meta.env.BASE_URL}iroiro-logo-white.png`} alt={companyName} className="h-16 select-none" draggable={false} />
          <div className="pb-1 text-[10px] tracking-[0.3em] text-zinc-500">× WORKVERSE</div>
        </div>

        <div className="pointer-events-auto anim-fade-up">
          <div className="mb-3 text-xs font-medium tracking-[0.3em] text-accent">NEXT-GEN VIRTUAL OFFICE</div>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
            仕事をするほど、
            <br />
            オフィスが進化する。
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            仮想オフィスに出勤し、チームの様子を見渡しながらタスクを進めましょう。完了したタスクは経験値となり、あなたと会社を成長させます。
          </p>

          <div className="mt-8 flex max-w-md flex-col gap-3">
            {resumeEmp && (
              <button
                className="panel flex items-center gap-3 p-3 text-left transition hover:border-cyan-300/40"
                onClick={() => login(resumeEmp.id)}
              >
                <History size={18} className="text-accent" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{resumeEmp.name} さんの出勤が継続中です</div>
                  <div className="text-xs text-zinc-500">
                    {formatTime(attendance[resumeEmp.id]?.clockInAt)} 出勤 · ブラウザを閉じても勤怠は維持されています
                  </div>
                </div>
                <ArrowRight size={16} className="text-zinc-400" />
              </button>
            )}
            {demo && (
              <button className="btn-primary h-12 justify-between px-4 text-base" onClick={() => login(demo.id)}>
                <span className="flex items-center gap-3">
                  <LogIn size={18} />
                  {demo.name} として出勤する
                </span>
                <span className="text-xs font-normal opacity-70">{demo.title}</span>
              </button>
            )}
            <button className="text-left text-sm text-zinc-400 hover:text-zinc-200" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'メンバーリストを閉じる' : '別のメンバーとして出勤する →'}
            </button>
          </div>

          {showAll && (
            <div className="panel anim-fade-up mt-3 max-w-md p-3">
              <div className="relative mb-2">
                <Search size={14} className="absolute top-2.5 left-3 text-zinc-500" />
                <input className="input pl-8" placeholder="名前・部署で検索" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
                {filtered.map((e) => (
                  <button
                    key={e.id}
                    className={cx('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.06]')}
                    onClick={() => login(e.id)}
                  >
                    <Avatar2D employeeId={e.id} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{e.name}</div>
                      <div className="truncate text-[11px] text-zinc-500">
                        {deptName[e.departmentId]} · {e.title}
                      </div>
                    </div>
                    <StatusPill status={attendance[e.id]?.status ?? 'off'} compact />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex max-w-md items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
          <Info size={13} className="mt-0.5 shrink-0" />
          初期プロトタイプのため認証はデモ用です。データはこのブラウザの LocalStorage に保存されます。
        </div>
      </div>
    </div>
  );
};
