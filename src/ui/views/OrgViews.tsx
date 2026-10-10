import { useMemo, useState } from 'react';
import { Crosshair, Palette, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import type { AttendanceStatus, Department, Employee } from '../../types';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { canManageOrganization, ROLE_LABEL } from '../../services/permissions';
import { ZONE_BY_ID, seatCapacity } from '../../three/layout';
import { Avatar2D, ConfirmButton, Modal, Progress, StatusPill, ViewShell } from '../common';
import { isTodayTask, taskStats, useMe } from '../hooks';

// ---------------- 社員一覧 ----------------

const EmployeeForm = ({ employee, onClose }: { employee: Employee | null; onClose: () => void }) => {
  const departments = useApp((s) => s.business.departments);
  const addEmployee = useApp((s) => s.addEmployee);
  const updateEmployee = useApp((s) => s.updateEmployee);
  const [name, setName] = useState(employee?.name ?? '');
  const [title, setTitle] = useState(employee?.title ?? '');
  const [departmentId, setDept] = useState(employee?.departmentId ?? departments[0]?.id ?? '');
  const [role, setRole] = useState<Employee['role']>(employee?.role ?? 'member');
  const [status, setStatus] = useState<AttendanceStatus>('working');

  const save = () => {
    if (!name.trim() || !departmentId) return;
    if (employee) updateEmployee(employee.id, { name: name.trim(), title: title.trim(), departmentId, role });
    else addEmployee({ name: name.trim(), title: title.trim() || 'メンバー', departmentId, role, status });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={employee ? '社員情報を編集' : '社員を追加'}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn-primary" onClick={save} disabled={!name.trim()}>
            保存
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">氏名 *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="例：山田 太郎" />
        </div>
        <div>
          <label className="label">所属部署</label>
          <select className="input" value={departmentId} onChange={(e) => setDept(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">役職</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：エンジニア" />
        </div>
        <div>
          <label className="label">権限</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Employee['role'])}>
            {Object.entries(ROLE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {!employee && (
          <div>
            <label className="label">初期ステータス</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
              <option value="working">出勤中</option>
              <option value="away">離席中</option>
              <option value="meeting">会議中</option>
              <option value="off">退勤済み</option>
            </select>
          </div>
        )}
        {!employee && <p className="col-span-2 text-xs text-zinc-500">追加した社員のデスクとアバターは、所属部署のエリアに自動で配置されます。</p>}
      </div>
    </Modal>
  );
};

export const EmployeesView = () => {
  const me = useMe();
  const employees = useApp((s) => s.business.employees);
  const departments = useApp((s) => s.business.departments);
  const attendance = useApp((s) => s.business.attendance);
  const tasks = useApp((s) => s.business.tasks);
  const deleteEmployee = useApp((s) => s.deleteEmployee);
  const setView = useUi((s) => s.setView);
  const selectEmployee = useUi((s) => s.selectEmployee);
  const openAvatarEditor = useUi((s) => s.openAvatarEditor);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [editing, setEditing] = useState<Employee | null | undefined>(undefined);
  const isAdmin = canManageOrganization(me);
  const deptById = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);

  const list = employees
    .filter((e) => !q || e.name.includes(q) || e.title.includes(q))
    .filter((e) => !dept || e.departmentId === dept)
    .filter((e) => !status || (attendance[e.id]?.status ?? 'off') === status);

  const focus = (id: string) => {
    setView('office');
    selectEmployee(id);
  };

  return (
    <ViewShell
      title="メンバー一覧"
      subtitle={`${employees.length} 名 · 出勤中 ${employees.filter((e) => (attendance[e.id]?.status ?? 'off') !== 'off').length} 名`}
      actions={
        isAdmin && (
          <button className="btn-primary" onClick={() => setEditing(null)}>
            <UserPlus size={15} /> 社員を追加
          </button>
        )
      }
    >
      <div className="panel-solid mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-48 flex-1">
          <Search size={14} className="absolute top-2.5 left-3 text-zinc-500" />
          <input className="input py-1.5 pl-8" placeholder="氏名・役職で検索" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto py-1.5" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">全部署</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select className="input w-auto py-1.5" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus | '')}>
          <option value="">全ステータス</option>
          <option value="working">出勤中</option>
          <option value="away">離席中</option>
          <option value="meeting">会議中</option>
          <option value="off">退勤済み</option>
        </select>
      </div>
      <div className="panel-solid overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">社員</th>
              <th className="px-4 py-3 font-medium">部署</th>
              <th className="px-4 py-3 font-medium">ステータス</th>
              <th className="px-4 py-3 font-medium">レベル</th>
              <th className="px-4 py-3 font-medium">本日のタスク</th>
              <th className="px-4 py-3 font-medium">権限</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => {
              const d = deptById[e.departmentId];
              const st = taskStats(tasks.filter((t) => t.assigneeId === e.id && isTodayTask(t)));
              return (
                <tr key={e.id} className="group border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <button className="flex items-center gap-3 text-left" onClick={() => focus(e.id)}>
                      <Avatar2D employeeId={e.id} size={34} />
                      <div>
                        <div className="font-medium text-zinc-100">
                          {e.name}
                          {e.id === me?.id && <span className="ml-1.5 text-[10px] text-cyan-300">YOU</span>}
                        </div>
                        <div className="text-xs text-zinc-500">{e.title}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: d?.color }} />
                      {d?.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={attendance[e.id]?.status ?? 'off'} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    <span className="font-semibold">Lv.{e.level}</span>
                    <span className="ml-2 text-xs text-zinc-500">{e.totalXp.toLocaleString()} XP</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Progress value={st.ratio} className="w-16" h={4} />
                      <span className="text-xs tabular-nums text-zinc-400">
                        {st.done}/{st.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{ROLE_LABEL[e.role]}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                      <button className="btn-icon" title="オフィスで表示" onClick={() => focus(e.id)}>
                        <Crosshair size={15} />
                      </button>
                      {(isAdmin || e.id === me?.id) && (
                        <button className="btn-icon" title="アバター編集" onClick={() => openAvatarEditor(e.id)}>
                          <Palette size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button className="btn-icon" title="編集" onClick={() => setEditing(e)}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {isAdmin && e.id !== me?.id && (
                        <ConfirmButton className="btn-icon w-auto px-2 text-red-300" onConfirm={() => deleteEmployee(e.id)} confirmLabel="削除?">
                          <Trash2 size={15} />
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <EmployeeForm employee={editing} onClose={() => setEditing(undefined)} />}
    </ViewShell>
  );
};

// ---------------- 部署管理 ----------------

const DeptForm = ({ dept, onClose }: { dept: Department; onClose: () => void }) => {
  const update = useApp((s) => s.updateDepartment);
  const [form, setForm] = useState(dept);
  return (
    <Modal
      open
      onClose={onClose}
      title="部署を編集"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              update(dept.id, { name: form.name.trim() || dept.name, nameEn: form.nameEn, color: form.color, description: form.description });
              onClose();
            }}
          >
            保存
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">部署名</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">英語表記（サイン用）</label>
          <input className="input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value.toUpperCase() })} />
        </div>
        <div className="col-span-2">
          <label className="label">説明</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">テーマカラー</label>
          <div className="flex items-center gap-2">
            <input type="color" className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <span className="text-xs text-zinc-500">{form.color}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const DepartmentsView = () => {
  const me = useMe();
  const departments = useApp((s) => s.business.departments);
  const employees = useApp((s) => s.business.employees);
  const attendance = useApp((s) => s.business.attendance);
  const tasks = useApp((s) => s.business.tasks);
  const setView = useUi((s) => s.setView);
  const selectDepartment = useUi((s) => s.selectDepartment);
  const [editing, setEditing] = useState<Department | null>(null);
  const isAdmin = canManageOrganization(me);

  return (
    <ViewShell title="チーム管理" subtitle="チームごとの出勤状況とタスク進捗">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {departments.map((d) => {
          const members = employees.filter((e) => e.departmentId === d.id);
          const present = members.filter((e) => (attendance[e.id]?.status ?? 'off') !== 'off').length;
          const today = taskStats(tasks.filter((t) => t.departmentId === d.id && isTodayTask(t)));
          const all = taskStats(tasks.filter((t) => t.departmentId === d.id));
          const zone = ZONE_BY_ID[d.zoneId];
          const cap = zone ? seatCapacity(zone.deskArea) : 0;
          return (
            <div key={d.id} className="panel-solid overflow-hidden">
              <div className="h-1" style={{ background: d.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] tracking-[0.2em] text-zinc-500">{d.nameEn}</div>
                    <h3 className="mt-0.5 text-lg font-semibold">{d.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{d.description}</p>
                  </div>
                  {isAdmin && (
                    <button className="btn-icon" onClick={() => setEditing(d)}>
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <div className="text-lg font-semibold tabular-nums">
                      {present}
                      <span className="text-xs text-zinc-500">/{members.length}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">出勤</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <div className="text-lg font-semibold tabular-nums">{Math.round(today.ratio * 100)}%</div>
                    <div className="text-[10px] text-zinc-500">本日達成率</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] py-2">
                    <div className="text-lg font-semibold tabular-nums">
                      {members.length}
                      <span className="text-xs text-zinc-500">/{cap}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">座席</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-xs text-zinc-400">
                  <span>全タスク進捗</span>
                  <span>
                    {all.done}/{all.total}
                  </span>
                </div>
                <Progress value={all.ratio} color={d.color} className="mt-1.5" h={4} />
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {members.slice(0, 7).map((m) => (
                      <span key={m.id} className="rounded-full ring-2 ring-ink-850" title={m.name}>
                        <Avatar2D employeeId={m.id} size={26} />
                      </span>
                    ))}
                  </div>
                  <button
                    className="btn text-xs"
                    onClick={() => {
                      setView('office');
                      selectDepartment(d.id);
                    }}
                  >
                    <Crosshair size={13} /> オフィスで表示
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        ※ 初期版では部署ごとに3Dオフィス内の専用エリアが割り当てられています。部署の新設（エリアの追加）は今後のバージョンで対応予定です。
      </p>
      {editing && <DeptForm dept={editing} onClose={() => setEditing(null)} />}
    </ViewShell>
  );
};
