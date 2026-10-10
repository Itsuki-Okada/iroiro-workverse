import { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '../types';
import { useApp } from '../store/appStore';
import type { TaskInput } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { PRIORITY_LABEL, TASK_XP } from '../game/rules';
import { todayKey } from '../lib/utils';
import { ConfirmButton, Modal } from './common';

const EMPTY: TaskInput = {
  title: '',
  description: '',
  assigneeId: null,
  departmentId: null,
  projectId: null,
  categoryId: null,
  priority: 'medium',
  status: 'todo',
  dueDate: null,
};

export const TaskEditor = () => {
  const { open, taskId, defaults } = useUi((s) => s.taskEditor);
  const close = useUi((s) => s.closeTaskEditor);
  const task = useApp((s) => s.business.tasks.find((t) => t.id === taskId));
  const employees = useApp((s) => s.business.employees);
  const departments = useApp((s) => s.business.departments);
  const categories = useApp((s) => s.business.categories);
  const projects = useApp((s) => s.business.projects);
  const createTask = useApp((s) => s.createTask);
  const updateTask = useApp((s) => s.updateTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const me = useApp((s) => s.currentUserId);

  const [form, setForm] = useState<TaskInput>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (task) {
      const { id: _id, createdAt: _c, updatedAt: _u, xpAwarded: _x, completedAt: _d, createdBy: _b, ...rest } = task;
      setForm(rest);
    } else {
      const assigneeId = (defaults?.assigneeId as string | undefined) ?? me;
      const emp = employees.find((e) => e.id === assigneeId);
      setForm({
        ...EMPTY,
        dueDate: todayKey(),
        assigneeId: assigneeId ?? null,
        departmentId: (defaults?.departmentId as string | undefined) ?? emp?.departmentId ?? null,
        projectId: (defaults?.projectId as string | undefined) ?? null,
        categoryId: categories[0]?.id ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    const data = { ...form, title: form.title.trim() };
    if (task) updateTask(task.id, data);
    else createTask(data);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={task ? 'タスクを編集' : '新しいタスク'}
      width="max-w-xl"
      footer={
        <>
          {task && (
            <div className="mr-auto">
              <ConfirmButton
                onConfirm={() => {
                  deleteTask(task.id);
                  close();
                }}
                confirmLabel="もう一度押して削除"
              >
                <Trash2 size={15} /> 削除
              </ConfirmButton>
            </div>
          )}
          <button className="btn" onClick={close}>
            キャンセル
          </button>
          <button className="btn-primary" onClick={save}>
            <Save size={15} /> 保存
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">タイトル *</label>
          <input
            className="input"
            autoFocus
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && save()}
            placeholder="例：週次レポートを作成"
          />
          {error && <div className="mt-1 text-xs text-red-300">{error}</div>}
        </div>
        <div className="col-span-2">
          <label className="label">説明</label>
          <textarea className="input min-h-20 resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="詳細やメモ" />
        </div>
        <div>
          <label className="label">担当者</label>
          <select
            className="input"
            value={form.assigneeId ?? ''}
            onChange={(e) => {
              const id = e.target.value || null;
              const emp = employees.find((x) => x.id === id);
              setForm((f) => ({ ...f, assigneeId: id, departmentId: emp?.departmentId ?? f.departmentId }));
            }}
          >
            <option value="">未割り当て</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">部署</label>
          <select className="input" value={form.departmentId ?? ''} onChange={(e) => set('departmentId', e.target.value || null)}>
            <option value="">なし</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">期限</label>
          <input type="date" className="input [color-scheme:dark]" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} />
        </div>
        <div>
          <label className="label">優先度</label>
          <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value as TaskPriority)}>
            {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}（+{TASK_XP[p]} XP）
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">カテゴリ</label>
          <select className="input" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
            <option value="">なし</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">プロジェクト</label>
          <select className="input" value={form.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
            <option value="">なし</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">ステータス</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['todo', '未着手'],
                ['in_progress', '進行中'],
                ['done', '完了'],
              ] as [TaskStatus, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => set('status', v)}
                className={`rounded-lg border py-2 text-sm transition ${form.status === v ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-zinc-400 hover:bg-white/[0.04]'}`}
              >
                {l}
              </button>
            ))}
          </div>
          {task?.xpAwarded && <div className="mt-2 text-xs text-zinc-500">このタスクの経験値は付与済みです（再完了しても加算されません）。</div>}
        </div>
      </div>
    </Modal>
  );
};
