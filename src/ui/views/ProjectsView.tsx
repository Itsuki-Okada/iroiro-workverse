import { useState } from 'react';
import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../../types';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { formatShortDate } from '../../lib/utils';
import { Avatar2D, ConfirmButton, Empty, Modal, Progress, ViewShell } from '../common';
import { projectProgress, useLookups } from '../hooks';

const STATUS_LABEL: Record<ProjectStatus, string> = { active: '進行中', paused: '保留', done: '完了' };
const STATUS_CLS: Record<ProjectStatus, string> = {
  active: 'border-cyan-400/30 text-cyan-200',
  paused: 'border-amber-400/30 text-amber-200',
  done: 'border-emerald-400/30 text-emerald-200',
};

const ProjectForm = ({ project, onClose }: { project: Partial<Project> | null; onClose: () => void }) => {
  const departments = useApp((s) => s.business.departments);
  const employees = useApp((s) => s.business.employees);
  const upsert = useApp((s) => s.upsertProject);
  const updateEmployee = useApp((s) => s.updateEmployee);
  const [form, setForm] = useState<Partial<Project>>(project ?? { status: 'active' });
  const initialMembers = project?.id ? employees.filter((e) => e.projectIds.includes(project.id!)).map((e) => e.id) : [];
  const [members, setMembers] = useState<string[]>(initialMembers);

  const save = () => {
    if (!form.name?.trim()) return;
    const id = form.id ?? `prj-${Date.now().toString(36)}`;
    upsert({ ...form, id, name: form.name.trim() });
    // メンバー割当の同期
    for (const e of employees) {
      const has = e.projectIds.includes(id);
      const want = members.includes(e.id);
      if (has !== want) updateEmployee(e.id, { projectIds: want ? [...e.projectIds, id] : e.projectIds.filter((p) => p !== id) });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'プロジェクトを編集' : '新規プロジェクト'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn-primary" onClick={save} disabled={!form.name?.trim()}>
            保存
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">プロジェクト名 *</label>
          <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </div>
        <div>
          <label className="label">説明</label>
          <textarea className="input min-h-16" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">部署</label>
            <select className="input" value={form.departmentId ?? ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value || null })}>
              <option value="">なし</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">状態</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
              {Object.entries(STATUS_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">期限</label>
            <input type="date" className="input [color-scheme:dark]" value={form.dueDate ?? ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} />
          </div>
        </div>
        <div>
          <label className="label">メンバー</label>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {employees.map((e) => {
              const on = members.includes(e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => setMembers((m) => (on ? m.filter((x) => x !== e.id) : [...m, e.id]))}
                  className={`chip ${on ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100' : ''}`}
                >
                  {e.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const ProjectsView = () => {
  const projects = useApp((s) => s.business.projects);
  const tasks = useApp((s) => s.business.tasks);
  const employees = useApp((s) => s.business.employees);
  const deleteProject = useApp((s) => s.deleteProject);
  const openTaskEditor = useUi((s) => s.openTaskEditor);
  const { dept } = useLookups();
  const [editing, setEditing] = useState<Partial<Project> | null | undefined>(undefined);

  return (
    <ViewShell
      title="プロジェクト"
      subtitle={`${projects.filter((p) => p.status === 'active').length} 件が進行中`}
      actions={
        <button className="btn-primary" onClick={() => setEditing(null)}>
          <Plus size={15} /> 新規プロジェクト
        </button>
      }
    >
      {projects.length === 0 && <Empty icon={<FolderKanban size={22} />} text="プロジェクトがありません" />}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {projects.map((p) => {
          const s = projectProgress(tasks, p.id);
          const d = p.departmentId ? dept[p.departmentId] : undefined;
          const members = employees.filter((e) => e.projectIds.includes(p.id));
          return (
            <div key={p.id} className="panel-solid group flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    {d && <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />}
                    {d?.name ?? '部署なし'}
                  </div>
                  <h3 className="mt-1 truncate font-semibold">{p.name}</h3>
                </div>
                <span className={`chip ${STATUS_CLS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
              </div>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-zinc-400">{p.description || '—'}</p>
              <div className="mt-4 flex justify-between text-xs text-zinc-400">
                <span>
                  タスク {s.done}/{s.total}
                </span>
                <span className="tabular-nums">{Math.round(s.ratio * 100)}%</span>
              </div>
              <Progress value={s.ratio} color={d?.color} className="mt-1.5" />
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {members.slice(0, 6).map((m) => (
                    <span key={m.id} title={m.name} className="rounded-full ring-2 ring-ink-850">
                      <Avatar2D employeeId={m.id} size={26} />
                    </span>
                  ))}
                  {members.length > 6 && <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/10 text-[10px]">+{members.length - 6}</span>}
                </div>
                <span className="text-xs text-zinc-500">期限 {formatShortDate(p.dueDate)}</span>
              </div>
              <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-3">
                <button className="btn flex-1 text-xs" onClick={() => openTaskEditor(null, { projectId: p.id, departmentId: p.departmentId })}>
                  <Plus size={13} /> タスク追加
                </button>
                <button className="btn text-xs" onClick={() => setEditing(p)}>
                  <Pencil size={13} />
                </button>
                <ConfirmButton className="btn text-xs" onConfirm={() => deleteProject(p.id)} confirmLabel="削除?">
                  <Trash2 size={13} />
                </ConfirmButton>
              </div>
            </div>
          );
        })}
      </div>
      {editing !== undefined && <ProjectForm project={editing} onClose={() => setEditing(undefined)} />}
    </ViewShell>
  );
};
