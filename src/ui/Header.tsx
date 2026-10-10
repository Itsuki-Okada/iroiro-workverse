import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, ChevronDown, Clock as ClockIcon, LogOut, Palette, Power, Settings, UserRound } from 'lucide-react';
import type { AttendanceStatus } from '../types';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { cx, formatDateJa, formatTime, relativeTime } from '../lib/utils';
import { Avatar2D, STATUS_META, StatusPill } from './common';
import { useMe } from './hooks';

/** 社名ロゴ（iroiro Co.）の白抜きマーク */
export const Logo = ({ height = 22 }: { height?: number }) => (
  <img src={`${import.meta.env.BASE_URL}iroiro-mark-white.png`} alt="iroiro Co." style={{ height }} className="select-none" draggable={false} />
);

const useClickOutside = (open: boolean, close: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open, close]);
  return ref;
};

const Dropdown = ({ trigger, children, align = 'right', width = 'w-64' }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: string }) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useClickOutside(open, close);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          className={cx(
            'panel-solid anim-fade-up z-50 overflow-hidden shadow-2xl max-sm:fixed max-sm:inset-x-2 max-sm:top-[60px] max-sm:w-auto sm:absolute sm:top-full sm:mt-2',
            width,
            align === 'right' ? 'sm:right-0' : 'sm:left-0',
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};

const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden items-baseline gap-2 text-sm lg:flex">
      <span className="text-zinc-400">{formatDateJa(now)}</span>
      <span className="font-medium tabular-nums text-zinc-200">{formatTime(now.toISOString())}</span>
    </div>
  );
};

const AttendanceMenu = () => {
  const me = useMe();
  const att = useApp((s) => (me ? s.business.attendance[me.id] : undefined));
  const setMyStatus = useApp((s) => s.setMyStatus);
  const clockIn = useApp((s) => s.clockIn);
  const clockOut = useApp((s) => s.clockOut);
  const setMyMessage = useApp((s) => s.setMyMessage);
  const [draft, setDraft] = useState('');
  const status: AttendanceStatus = att?.status ?? 'off';
  return (
    <Dropdown
      width="w-72"
      trigger={(open) => (
        <button className={cx('btn h-9 gap-2', open && 'border-white/25')}>
          <StatusPill status={status} />
          {att?.clockInAt && status !== 'off' && <span className="hidden text-xs text-zinc-500 sm:inline">{formatTime(att.clockInAt)}〜</span>}
          <ChevronDown size={14} className="text-zinc-500" />
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          <div className="px-2.5 py-1.5 text-[11px] text-zinc-500">ステータスを変更</div>
          {(['working', 'away', 'meeting'] as const).map((s) => (
            <button
              key={s}
              className={cx('flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-white/[0.06]', status === s && 'bg-white/[0.05]')}
              onClick={() => {
                setMyStatus(s);
                close();
              }}
            >
              <StatusPill status={s} />
              {status === s && <span className="text-[10px] text-cyan-300">現在</span>}
            </button>
          ))}
          {status !== 'off' && (
            <>
              <div className="my-1 h-px bg-white/[0.06]" />
              <div className="px-2.5 py-1.5 text-[11px] text-zinc-500">ひとこと（頭上の吹き出し）</div>
              {att?.message && (
                <div className="mx-2.5 mb-1.5 flex items-center justify-between rounded-lg bg-white/[0.05] px-2 py-1 text-xs">
                  <span className="truncate">💬 {att.message}</span>
                  <button className="text-zinc-500 hover:text-zinc-200" onClick={() => setMyMessage(null)}>
                    消す
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
                {['集中モード中🎧', 'ランチ行ってきます🍙', 'MTG中📅', '手が空いてます🙌', '外出中🚶'].map((m) => (
                  <button key={m} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-white/[0.06]" onClick={() => setMyMessage(m)}>
                    {m}
                  </button>
                ))}
              </div>
              <form
                className="flex gap-1 px-2.5 pb-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim()) setMyMessage(draft);
                  setDraft('');
                }}
              >
                <input className="input py-1 text-xs" maxLength={30} placeholder="自由に入力（30文字まで）" value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button className="btn shrink-0 px-2 py-1 text-xs" type="submit">
                  設定
                </button>
              </form>
            </>
          )}
          <div className="my-1 h-px bg-white/[0.06]" />
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
            onClick={() => {
              useUi.getState().setView('attendance');
              close();
            }}
          >
            <ClockIcon size={15} /> 勤怠を見る
          </button>
          {status === 'off' ? (
            <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-cyan-200 hover:bg-white/[0.06]" onClick={() => (clockIn(), close())}>
              <Power size={15} /> 出勤する
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-200 hover:bg-red-500/10"
              onClick={() => {
                clockOut();
                close();
              }}
            >
              <Power size={15} /> 退勤する
            </button>
          )}
        </div>
      )}
    </Dropdown>
  );
};

const Notifications = () => {
  const me = useApp((s) => s.currentUserId);
  const all = useApp((s) => s.business.notifications);
  const markRead = useApp((s) => s.markNotificationsRead);
  const list = all.filter((n) => n.employeeId === null || n.employeeId === me).slice(0, 20);
  const unread = list.filter((n) => !n.read).length;
  return (
    <Dropdown
      width="w-80"
      trigger={() => (
        <button className="btn-icon relative h-9 w-9" aria-label="通知" onClick={() => setTimeout(markRead, 1500)}>
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink-950">
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {() => (
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <span className="text-sm font-medium">通知</span>
            <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={markRead}>
              すべて既読
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.length === 0 && <div className="px-4 py-8 text-center text-sm text-zinc-500">通知はありません</div>}
            {list.map((n) => (
              <div key={n.id} className={cx('border-b border-white/[0.04] px-4 py-2.5', !n.read && 'bg-cyan-400/[0.04]')}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-zinc-100">{n.title}</span>
                  <span className="shrink-0 text-[10px] text-zinc-500">{relativeTime(n.at)}</span>
                </div>
                {n.body && <div className="mt-0.5 text-xs text-zinc-400">{n.body}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Dropdown>
  );
};

const UserMenu = () => {
  const me = useMe();
  const dept = useApp((s) => s.business.departments.find((d) => d.id === me?.departmentId));
  const logout = useApp((s) => s.logout);
  const openAvatarEditor = useUi((s) => s.openAvatarEditor);
  const setView = useUi((s) => s.setView);
  const selectEmployee = useUi((s) => s.selectEmployee);
  if (!me) return null;
  const item = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]';
  return (
    <Dropdown
      width="w-64"
      trigger={() => (
        <button className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 hover:bg-white/[0.05]">
          <Avatar2D employeeId={me.id} size={32} />
          <div className="hidden text-left leading-tight md:block">
            <div className="text-sm font-medium text-zinc-100">{me.name}</div>
            <div className="text-[11px] text-zinc-500">
              Lv.{me.level} · {dept?.name}
            </div>
          </div>
          <ChevronDown size={14} className="text-zinc-500" />
        </button>
      )}
    >
      {(close) => (
        <div className="p-1.5">
          <button className={item} onClick={() => (setView('office'), selectEmployee(me.id), close())}>
            <UserRound size={16} /> マイプロフィール
          </button>
          <button className={item} onClick={() => (openAvatarEditor(me.id), close())}>
            <Palette size={16} /> アバターを編集
          </button>
          <button className={item} onClick={() => (setView('settings'), close())}>
            <Settings size={16} /> 設定
          </button>
          <div className="my-1 h-px bg-white/[0.06]" />
          <button className={item} onClick={() => (logout({ clockOut: false }), close())}>
            <LogOut size={16} /> ログアウト（出勤は継続）
          </button>
          <button className={cx(item, 'text-red-200 hover:bg-red-500/10')} onClick={() => (logout({ clockOut: true }), close())}>
            <Power size={16} /> 退勤してログアウト
          </button>
        </div>
      )}
    </Dropdown>
  );
};

export const Header = () => {
  const companyName = useApp((s) => s.business.company.name);
  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-ink-900/80 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-3">
        <Logo height={22} />
        <div className="hidden h-6 w-px bg-white/10 sm:block" />
        <div className="hidden leading-tight sm:block">
          <div className="text-[13px] font-semibold text-zinc-50">{companyName}</div>
          <div className="text-[9px] tracking-[0.25em] text-zinc-500">WORKVERSE</div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <Clock />
        <div className="mx-1 hidden h-6 w-px bg-white/[0.08] lg:block" />
        <AttendanceMenu />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
};

export { STATUS_META };
