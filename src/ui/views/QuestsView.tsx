import { useMemo, useState } from 'react';
import { ListFilter, Plus, Search, Swords, Tags } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { PRIORITY_LABEL } from '../../game/rules';
import { cx } from '../../lib/utils';
import { Empty, Progress, ViewShell } from '../common';
import { taskStats, useMe } from '../hooks';
import { TaskRow } from '../TaskRow';
import { CategoryManager } from './SettingsView';

const STATUS_COLS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: 'todo', label: '未着手', dot: '#9aa7b4' },
  { key: 'in_progress', label: '進行中', dot: '#38d6e8' },
  { key: 'done', label: '完了', dot: '#3ddc97' },
];

export const QuestsView = () => {
  const me = useMe();
  const tasks = useApp((s) => s.business.tasks);
  const departments = useApp((s) => s.business.departments);
  const categories = useApp((s) => s.business.categories);
  const employees = useApp((s) => s.business.employees);
  const openTaskEditor = useUi((s) => s.openTaskEditor);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [dept, setDept] = useState('');
  const [cat, setCat] = useState('');
  const [prio, setPrio] = useState<TaskPriority | ''>('');
  const [assignee, setAssignee] = useState('');
  const [q, setQ] = useState('');
  const [showCats, setShowCats] = useState(false);

  const filtered = useMemo(
    () =>
      tasks
        .filter((t) => (scope === 'mine' ? t.assigneeId === me?.id : true))
        .filter((t) => !dept || t.departmentId === dept)
        .filter((t) => !cat || t.categoryId === cat)
        .filter((t) => !prio || t.priority === prio)
        .filter((t) => !assignee || t.assigneeId === assignee)
        .filter((t) => !q || t.title.includes(q) || t.description.includes(q))
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    [tasks, scope, me, dept, cat, prio, assignee, q],
  );
  const st = taskStats(filtered);

  return (
    <ViewShell
      title="クエスト"
      subtitle="タスクを完了して経験値を獲得しましょう"
      actions={
        <>
          <button className="btn" onClick={() => setShowCats((v) => !v)}>
            <Tags size={15} /> カテゴリ管理
          </button>
          <button className="btn-primary" onClick={() => openTaskEditor(null)}>
            <Plus size={15} /> 新規タスク
          </button>
        </>
      }
    >
      {showCats && (
        <div className="panel-solid anim-fade-up mb-4 p-4">
          <CategoryManager />
        </div>
      )}
      <div className="panel-solid mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-lg bg-white/[0.04] p-0.5">
          {(
            [
              ['mine', '自分のタスク'],
              ['all', 'すべて'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setScope(k)} className={cx('rounded-md px-3 py-1 text-sm', scope === k ? 'bg-white/10 text-zinc-50' : 'text-zinc-400')}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative min-w-40 flex-1">
          <Search size={14} className="absolute top-2.5 left-3 text-zinc-500" />
          <input className="input py-1.5 pl-8" placeholder="タスクを検索" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ListFilter size={15} className="text-zinc-500" />
        <select className="input w-auto py-1.5" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">全部署</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {scope === 'all' && (
          <select className="input w-auto py-1.5" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">全担当者</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
        <select className="input w-auto py-1.5" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input w-auto py-1.5" value={prio} onChange={(e) => setPrio(e.target.value as TaskPriority | '')}>
          <option value="">全優先度</option>
          {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center gap-3 text-xs text-zinc-400">
        <span className="tabular-nums">
          {st.done}/{st.total} 完了
        </span>
        <Progress value={st.ratio} className="max-w-xs" h={4} />
      </div>

      {filtered.length === 0 ? (
        <Empty icon={<Swords size={22} />} text="条件に一致するタスクはありません" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {STATUS_COLS.map((col) => {
            const list = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="panel-solid flex min-h-40 flex-col">
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="text-xs text-zinc-500">{list.length}</span>
                </div>
                <div className="p-1.5">
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} showAssignee={scope === 'all'} />
                  ))}
                  {list.length === 0 && <div className="py-6 text-center text-xs text-zinc-600">なし</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ViewShell>
  );
};
