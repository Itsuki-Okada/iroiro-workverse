import { Check, Pencil } from 'lucide-react';
import type { Task } from '../types';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { cx, formatShortDate, todayKey } from '../lib/utils';
import { TASK_XP } from '../game/rules';
import { Avatar2D, PriorityChip } from './common';
import { useLookups } from './hooks';

/** タスク1行（チェックで完了 / クリックで編集） */
export const TaskRow = ({ task, showAssignee = false, dense = false }: { task: Task; showAssignee?: boolean; dense?: boolean }) => {
  const setTaskStatus = useApp((s) => s.setTaskStatus);
  const openTaskEditor = useUi((s) => s.openTaskEditor);
  const { cat, emp, prj } = useLookups();
  const done = task.status === 'done';
  const overdue = !done && task.dueDate && task.dueDate < todayKey();
  const category = task.categoryId ? cat[task.categoryId] : undefined;

  return (
    <div
      className={cx(
        'group flex items-start gap-3 rounded-lg border border-transparent transition hover:border-white/[0.06] hover:bg-white/[0.03]',
        dense ? 'px-2 py-1.5' : 'px-3 py-2.5',
      )}
    >
      <button
        aria-label={done ? '未完了に戻す' : '完了にする'}
        onClick={() => setTaskStatus(task.id, done ? 'todo' : 'done')}
        className={cx(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition',
          done ? 'border-accent bg-accent text-ink-950' : 'border-zinc-500 hover:border-accent',
        )}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => openTaskEditor(task.id)}>
        <div className={cx('truncate text-sm', done ? 'text-zinc-500 line-through' : 'text-zinc-100')}>{task.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
          <PriorityChip p={task.priority} />
          {category && (
            <span className="chip" style={{ borderColor: `${category.color}55`, color: category.color }}>
              {category.name}
            </span>
          )}
          {task.status === 'in_progress' && <span className="chip border-cyan-400/30 text-cyan-200">進行中</span>}
          <span className={cx(overdue && 'text-red-300')}>{overdue ? '期限切れ ' : ''}{formatShortDate(task.dueDate)}</span>
          {!dense && task.projectId && prj[task.projectId] && <span className="truncate">· {prj[task.projectId].name}</span>}
          {!task.xpAwarded && !done && <span className="text-cyan-300/80">+{TASK_XP[task.priority]}XP</span>}
        </div>
      </button>
      {showAssignee && task.assigneeId && emp[task.assigneeId] && (
        <div className="flex shrink-0 items-center gap-1.5" title={emp[task.assigneeId].name}>
          <Avatar2D employeeId={task.assigneeId} size={22} />
          {!dense && <span className="hidden text-xs text-zinc-400 xl:inline">{emp[task.assigneeId].name}</span>}
        </div>
      )}
      <button className="btn-icon h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => openTaskEditor(task.id)} aria-label="編集">
        <Pencil size={14} />
      </button>
    </div>
  );
};
