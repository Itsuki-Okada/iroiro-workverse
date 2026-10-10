import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Coffee, Download, LogIn, LogOut, Pencil, Undo2, Users } from 'lucide-react';
import type { AttendanceEvent, Employee } from '../../types';
import { useApp } from '../../store/appStore';
import { canEditAttendance, canViewTeamAttendance } from '../../services/permissions';
import {
  correctionKey,
  daysOfMonth,
  EVENT_LABEL,
  fmtDuration,
  STANDARD_WORK_MIN,
  summarizeDay,
  summarizeMonth,
} from '../../game/timesheet';
import type { DaySummary } from '../../game/timesheet';
import { cx, formatTime, todayKey } from '../../lib/utils';
import { Avatar2D, Modal, Progress, Stat, StatusPill, ViewShell } from '../common';
import { useLookups, useMe } from '../hooks';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/** 勤務中の実働時間を表示更新するための現在時刻 */
const useNow = (ms = 30_000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

const dayLabel = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return { text: `${m}/${d}（${WEEK[w]}）`, weekend: w === 0 || w === 6 };
};

const hhmm = (iso: string | null) => (iso ? formatTime(iso) : '');

const useEmployeeEvents = (employeeId: string | undefined) => {
  const log = useApp((s) => s.business.attendanceLog);
  return useMemo(() => (employeeId ? (log ?? []).filter((e) => e.employeeId === employeeId) : []), [log, employeeId]);
};

// ---------------- 修正モーダル ----------------

const CorrectionModal = ({ employee, day, onClose }: { employee: Employee; day: DaySummary; onClose: () => void }) => {
  const save = useApp((s) => s.saveCorrection);
  const remove = useApp((s) => s.removeCorrection);
  const [clockIn, setIn] = useState(hhmm(day.clockIn));
  const [clockOut, setOut] = useState(hhmm(day.clockOut));
  const [breakMinutes, setBreak] = useState(String(day.breakMin));
  const [note, setNote] = useState(day.note ?? '');
  const valid = !!clockIn && !!note.trim() && (!clockOut || clockOut > clockIn);
  return (
    <Modal
      open
      onClose={onClose}
      title={`勤怠の修正 — ${employee.name} ${dayLabel(day.date).text}`}
      footer={
        <>
          {day.corrected && (
            <button
              className="btn mr-auto"
              onClick={() => {
                remove(employee.id, day.date);
                onClose();
              }}
            >
              <Undo2 size={15} /> 修正を取り消す
            </button>
          )}
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn-primary"
            disabled={!valid}
            onClick={() => {
              save({ employeeId: employee.id, date: day.date, clockIn, clockOut: clockOut || undefined, breakMinutes: Number(breakMinutes) || 0, note: note.trim() });
              onClose();
            }}
          >
            保存
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">出勤</label>
          <input type="time" className="input [color-scheme:dark]" value={clockIn} onChange={(e) => setIn(e.target.value)} />
        </div>
        <div>
          <label className="label">退勤</label>
          <input type="time" className="input [color-scheme:dark]" value={clockOut} onChange={(e) => setOut(e.target.value)} />
        </div>
        <div>
          <label className="label">休憩（分）</label>
          <input type="number" min={0} step={5} className="input" value={breakMinutes} onChange={(e) => setBreak(e.target.value)} />
        </div>
        <div className="col-span-3">
          <label className="label">修正理由 *</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：退勤打刻を忘れたため" />
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">打刻の記録はそのまま残り、修正内容が集計に優先して反映されます（修正者と日時も記録されます）。</p>
    </Modal>
  );
};

// ---------------- 今日の勤怠カード ----------------

const TodayCard = ({ employee, events, now, isMe }: { employee: Employee; events: AttendanceEvent[]; now: Date; isMe: boolean }) => {
  const att = useApp((s) => s.business.attendance[employee.id]);
  const corrections = useApp((s) => s.business.attendanceCorrections);
  const clockIn = useApp((s) => s.clockIn);
  const clockOut = useApp((s) => s.clockOut);
  const setMyStatus = useApp((s) => s.setMyStatus);
  const today = todayKey();
  const d = summarizeDay(events, today, corrections?.[correctionKey(employee.id, today)], now);
  const status = att?.status ?? 'off';

  return (
    <div className="panel-solid p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-accent" />
          <div>
            <div className="text-sm font-semibold">今日の勤怠</div>
            <div className="text-xs text-zinc-500">{dayLabel(today).text}</div>
          </div>
          <StatusPill status={status} />
        </div>
        {isMe && (
          <div className="flex flex-wrap gap-2">
            {status === 'off' ? (
              <button className="btn-primary" onClick={clockIn}>
                <LogIn size={15} /> 出勤
              </button>
            ) : (
              <>
                {status === 'away' ? (
                  <button className="btn" onClick={() => setMyStatus('working')}>
                    <Coffee size={15} /> 休憩から戻る
                  </button>
                ) : (
                  <button className="btn" onClick={() => setMyStatus('away')}>
                    <Coffee size={15} /> 休憩する
                  </button>
                )}
                <button className="btn-danger" onClick={clockOut}>
                  <LogOut size={15} /> 退勤
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['出勤', hhmm(d.clockIn) || '--:--'],
          ['退勤', d.inProgress ? '勤務中' : hhmm(d.clockOut) || '--:--'],
          ['休憩', fmtDuration(d.breakMin)],
          ['会議', fmtDuration(d.meetingMin)],
          ['実働', fmtDuration(d.workMin)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/[0.03] px-3 py-2.5">
            <div className="text-[10px] text-zinc-500">{k}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Progress value={d.workMin / STANDARD_WORK_MIN} h={5} color={d.workMin > STANDARD_WORK_MIN ? '#f2b45a' : '#38d6e8'} />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
          <span>所定 {fmtDuration(STANDARD_WORK_MIN)}</span>
          {d.overtimeMin > 0 && <span className="text-amber-300">残業 {fmtDuration(d.overtimeMin)}</span>}
        </div>
      </div>

      {d.events.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-3 text-xs">
          {d.events.map((e) => (
            <span key={e.id} className="flex items-center gap-1.5 text-zinc-400">
              <span className="tabular-nums text-zinc-200">{formatTime(e.at)}</span>
              {EVENT_LABEL[e.type]}
              {e.auto && <span className="text-amber-300">（自動）</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------- 月次タイムシート ----------------

const toCsv = (rows: (string | number)[][]) =>
  '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');

const downloadCsv = (name: string, rows: (string | number)[][]) => {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const CSV_HEAD = ['氏名', '日付', '出勤', '退勤', '休憩', '会議', '実働', '残業', '備考'];
const csvRow = (e: Employee, d: DaySummary) => [
  e.name,
  d.date,
  hhmm(d.clockIn),
  d.inProgress ? '勤務中' : hhmm(d.clockOut),
  fmtDuration(d.breakMin),
  fmtDuration(d.meetingMin),
  fmtDuration(d.workMin),
  fmtDuration(d.overtimeMin),
  [d.corrected ? `修正：${d.note ?? ''}` : '', d.autoClosed && !d.corrected ? '自動退勤' : ''].filter(Boolean).join(' / '),
];

const MonthPicker = ({ ym, onChange }: { ym: [number, number]; onChange: (v: [number, number]) => void }) => {
  const [y, m] = ym;
  const now = new Date();
  const isCurrent = y === now.getFullYear() && m === now.getMonth();
  return (
    <div className="flex items-center gap-1">
      <button className="btn-icon" aria-label="前の月" onClick={() => onChange(m === 0 ? [y - 1, 11] : [y, m - 1])}>
        <ChevronLeft size={16} />
      </button>
      <span className="w-24 text-center text-sm font-medium tabular-nums">
        {y}年{m + 1}月
      </span>
      <button className="btn-icon" aria-label="次の月" disabled={isCurrent} onClick={() => onChange(m === 11 ? [y + 1, 0] : [y, m + 1])}>
        <ChevronRight size={16} className={isCurrent ? 'opacity-30' : ''} />
      </button>
    </div>
  );
};

const Timesheet = ({ employee, events, ym, setYm, now, canEdit }: { employee: Employee; events: AttendanceEvent[]; ym: [number, number]; setYm: (v: [number, number]) => void; now: Date; canEdit: boolean }) => {
  const corrections = useApp((s) => s.business.attendanceCorrections);
  const [editing, setEditing] = useState<DaySummary | null>(null);
  const days = useMemo(
    () => daysOfMonth(ym[0], ym[1], now).map((date) => summarizeDay(events, date, corrections?.[correctionKey(employee.id, date)], now)).reverse(),
    [events, ym, corrections, employee.id, now],
  );
  const total = summarizeMonth(days);

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="section-title">月次タイムシート</div>
        <div className="flex items-center gap-2">
          <MonthPicker ym={ym} onChange={setYm} />
          <button className="btn text-xs" onClick={() => downloadCsv(`勤怠_${employee.name}_${ym[0]}-${ym[1] + 1}.csv`, [CSV_HEAD, ...[...days].reverse().map((d) => csvRow(employee, d))])}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="出勤日数" value={`${total.workDays}日`} />
        <Stat label="総実働" value={fmtDuration(total.workMin)} />
        <Stat label="平均実働" value={fmtDuration(total.avgWorkMin)} />
        <Stat label="総休憩" value={fmtDuration(total.breakMin)} accent="#f2b45a" />
        <Stat label="残業" value={fmtDuration(total.overtimeMin)} accent="#f27a7a" sub={total.autoClosedDays ? `自動退勤 ${total.autoClosedDays}日（要確認）` : undefined} />
      </div>
      <div className="panel-solid overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
              {['日付', '出勤', '退勤', '休憩', '会議', '実働', '備考', ''].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const label = dayLabel(d.date);
              const absent = !d.clockIn;
              return (
                <tr key={d.date} className={cx('border-b border-white/[0.04]', d.date === todayKey() && 'bg-cyan-400/[0.04]')}>
                  <td className={cx('px-3 py-2 whitespace-nowrap tabular-nums', label.weekend ? 'text-zinc-500' : 'text-zinc-200')}>{label.text}</td>
                  <td className="px-3 py-2 tabular-nums">{hhmm(d.clockIn) || <span className="text-zinc-600">—</span>}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {d.inProgress ? <span className="text-cyan-300">勤務中</span> : hhmm(d.clockOut) || (absent ? <span className="text-zinc-600">—</span> : <span className="text-red-300">未打刻</span>)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-zinc-400">{absent ? '' : fmtDuration(d.breakMin)}</td>
                  <td className="px-3 py-2 tabular-nums text-zinc-400">{absent ? '' : fmtDuration(d.meetingMin)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {absent ? (
                      <span className="text-xs text-zinc-600">{label.weekend ? '休日' : '休み'}</span>
                    ) : (
                      <span className={d.overtimeMin > 0 ? 'text-amber-300' : ''}>{fmtDuration(d.workMin)}</span>
                    )}
                  </td>
                  <td className="max-w-48 px-3 py-2 text-xs">
                    {d.corrected && <span className="chip mr-1 border-cyan-400/30 text-cyan-200">修正済</span>}
                    {d.autoClosed && !d.corrected && <span className="chip mr-1 border-amber-400/30 text-amber-200">自動退勤</span>}
                    {d.note && <span className="truncate text-zinc-500">{d.note}</span>}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {canEdit && (
                      <button className="btn-icon h-7 w-7" title="修正" onClick={() => setEditing(d)}>
                        <Pencil size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <CorrectionModal employee={employee} day={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

// ---------------- チームの勤怠 ----------------

const TeamTable = ({ now, onPick, ym }: { now: Date; onPick: (id: string) => void; ym: [number, number] }) => {
  const employees = useApp((s) => s.business.employees);
  const attendance = useApp((s) => s.business.attendance);
  const log = useApp((s) => s.business.attendanceLog);
  const corrections = useApp((s) => s.business.attendanceCorrections);
  const { dept } = useLookups();
  const today = todayKey();
  const dates = useMemo(() => daysOfMonth(ym[0], ym[1], now), [ym, now]);

  const rows = useMemo(
    () =>
      employees.map((e) => {
        const events = (log ?? []).filter((x) => x.employeeId === e.id);
        const days = dates.map((date) => summarizeDay(events, date, corrections?.[correctionKey(e.id, date)], now));
        return { e, today: summarizeDay(events, today, corrections?.[correctionKey(e.id, today)], now), month: summarizeMonth(days), days };
      }),
    [employees, log, corrections, dates, today, now],
  );

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          className="btn text-xs"
          onClick={() => downloadCsv(`勤怠_全メンバー_${ym[0]}-${ym[1] + 1}.csv`, [CSV_HEAD, ...rows.flatMap((r) => r.days.filter((d) => d.clockIn).map((d) => csvRow(r.e, d)))])}
        >
          <Download size={14} /> 全メンバーをCSV出力（{ym[0]}年{ym[1] + 1}月）
        </button>
      </div>
      <div className="panel-solid overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">メンバー</th>
              <th className="px-3 py-2.5 font-medium">状態</th>
              <th className="px-3 py-2.5 font-medium">本日 出勤</th>
              <th className="px-3 py-2.5 font-medium">退勤</th>
              <th className="px-3 py-2.5 font-medium">休憩</th>
              <th className="px-3 py-2.5 font-medium">実働</th>
              <th className="px-3 py-2.5 font-medium">今月 出勤日数</th>
              <th className="px-3 py-2.5 font-medium">今月 実働</th>
              <th className="px-3 py-2.5 font-medium">今月 残業</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, today: d, month }) => (
              <tr key={e.id} className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.03]" onClick={() => onPick(e.id)}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar2D employeeId={e.id} size={28} />
                    <div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-[11px] text-zinc-500">{dept[e.departmentId]?.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={attendance[e.id]?.status ?? 'off'} />
                </td>
                <td className="px-3 py-2 tabular-nums">{hhmm(d.clockIn) || '—'}</td>
                <td className="px-3 py-2 tabular-nums">{d.inProgress ? <span className="text-cyan-300">勤務中</span> : hhmm(d.clockOut) || '—'}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-400">{d.clockIn ? fmtDuration(d.breakMin) : '—'}</td>
                <td className="px-3 py-2 tabular-nums">{d.clockIn ? fmtDuration(d.workMin) : '—'}</td>
                <td className="px-3 py-2 tabular-nums">{month.workDays}日</td>
                <td className="px-3 py-2 tabular-nums">{fmtDuration(month.workMin)}</td>
                <td className={cx('px-3 py-2 tabular-nums', month.overtimeMin > 0 && 'text-amber-300')}>{fmtDuration(month.overtimeMin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">行をクリックすると、そのメンバーのタイムシートを表示します。</p>
    </div>
  );
};

// ---------------- 画面 ----------------

export const AttendanceView = () => {
  const me = useMe();
  const employees = useApp((s) => s.business.employees);
  const now = useNow();
  const [tab, setTab] = useState<'me' | 'team'>('me');
  const [targetId, setTargetId] = useState<string | undefined>(me?.id);
  const [ym, setYm] = useState<[number, number]>(() => [now.getFullYear(), now.getMonth()]);
  const canTeam = canViewTeamAttendance(me);
  const target = employees.find((e) => e.id === (canTeam ? targetId : me?.id)) ?? me;
  const events = useEmployeeEvents(target?.id);
  if (!me || !target) return null;
  const isMe = target.id === me.id;

  return (
    <ViewShell
      title="勤怠"
      subtitle="出勤・休憩・会議・退勤の打刻と勤務時間"
      actions={
        canTeam && (
          <div className="flex rounded-lg bg-white/[0.04] p-0.5">
            <button onClick={() => setTab('me')} className={cx('rounded-md px-3 py-1 text-sm', tab === 'me' ? 'bg-white/10 text-zinc-50' : 'text-zinc-400')}>
              個人
            </button>
            <button onClick={() => setTab('team')} className={cx('flex items-center gap-1.5 rounded-md px-3 py-1 text-sm', tab === 'team' ? 'bg-white/10 text-zinc-50' : 'text-zinc-400')}>
              <Users size={14} /> チーム
            </button>
          </div>
        )
      }
    >
      {tab === 'team' && canTeam ? (
        <>
          <div className="mb-3 flex justify-end">
            <MonthPicker ym={ym} onChange={setYm} />
          </div>
          <TeamTable
            now={now}
            ym={ym}
            onPick={(id) => {
              setTargetId(id);
              setTab('me');
            }}
          />
        </>
      ) : (
        <>
          {canTeam && (
            <div className="mb-3 flex items-center gap-2">
              <Avatar2D employeeId={target.id} size={30} />
              <select className="input w-auto py-1.5" value={target.id} onChange={(e) => setTargetId(e.target.value)}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.id === me.id ? '（自分）' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <TodayCard employee={target} events={events} now={now} isMe={isMe} />
          <Timesheet employee={target} events={events} ym={ym} setYm={setYm} now={now} canEdit={canEditAttendance(me, target.id)} />
        </>
      )}
    </ViewShell>
  );
};
