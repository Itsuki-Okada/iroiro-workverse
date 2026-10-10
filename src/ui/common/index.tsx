import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { AttendanceStatus, AvatarConfig, TaskPriority } from '../../types';
import { useApp } from '../../store/appStore';
import { COSTUME_STYLE, generateAvatar } from '../../data/avatarFactory';
import { cx } from '../../lib/utils';
import { PRIORITY_LABEL } from '../../game/rules';

// ---------------- 2Dアバター（UI用ポートレート） ----------------

export const Avatar2D = ({ employeeId, size = 36, ring }: { employeeId: string; size?: number; ring?: string }) => {
  const stored = useApp((s) => s.presentation.avatars[employeeId]);
  const c: AvatarConfig = stored ?? generateAvatar(employeeId);
  const hairBack = c.hairStyle === 'long' || c.hairStyle === 'bob';
  const cos = c.costume && c.costume !== 'none' ? COSTUME_STYLE[c.costume] : null;
  if (cos) {
    const ear = cos.limb ?? cos.main;
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0 rounded-full" style={{ background: '#1d2228', boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
        <defs>
          <clipPath id={`clip-${employeeId}`}>
            <circle cx="32" cy="32" r="32" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${employeeId})`}>
          <path d="M8 64 C10 46, 22 42, 32 42 C42 42, 54 46, 56 64 Z" fill={cos.main} />
          {cos.belly !== cos.main && <ellipse cx="32" cy="60" rx="10" ry="12" fill={cos.belly} />}
          {cos.ears === 'round' && [16, 48].map((x) => <circle key={x} cx={x} cy="13" r="7" fill={ear} />)}
          {cos.ears === 'cone' && [<path key="l" d="M14 22 L18 4 L28 14 Z" fill={ear} />, <path key="r" d="M50 22 L46 4 L36 14 Z" fill={ear} />]}
          {cos.ears === 'long' && [24, 40].map((x) => <rect key={x} x={x - 4} y="-6" width="8" height="24" rx="4" fill={ear} />)}
          <circle cx="32" cy="28" r="18" fill={cos.main} />
          <ellipse cx="32" cy="31" rx="11" ry="11.5" fill={c.skinTone} />
          <circle cx="27.5" cy="31" r="1.4" fill="#16181b" />
          <circle cx="36.5" cy="31" r="1.4" fill="#16181b" />
          {cos.beak && <path d="M29.5 35 L34.5 35 L32 39 Z" fill="#f2a23a" />}
        </g>
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0 rounded-full"
      style={{ background: '#1d2228', boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      <defs>
        <clipPath id={`clip-${employeeId}`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${employeeId})`}>
        {hairBack && <rect x="15" y="20" width="34" height={c.hairStyle === 'long' ? 38 : 26} rx="12" fill={c.hairColor} />}
        {/* 胴体 */}
        <path d="M10 64 C12 48, 22 44, 32 44 C42 44, 52 48, 54 64 Z" fill={c.topColor} />
        {c.topStyle === 'jacket' && <path d="M27 45 L32 58 L37 45 Z" fill={c.innerColor} />}
        {c.topStyle === 'turtleneck' && <rect x="26" y="38" width="12" height="9" rx="3" fill={c.topColor} />}
        {c.topStyle !== 'turtleneck' && <rect x="28" y="37" width="8" height="8" rx="2" fill={c.skinTone} />}
        {/* 顔 */}
        <ellipse cx="32" cy="28" rx="12" ry="13.5" fill={c.skinTone} />
        <circle cx="27.5" cy="29" r="1.4" fill="#16181b" />
        <circle cx="36.5" cy="29" r="1.4" fill="#16181b" />
        {/* 髪 */}
        {c.accessory === 'beanie' ? (
          <path d="M19 26 C19 12, 45 12, 45 26 L45 23 L19 23 Z" fill={c.accessoryColor} />
        ) : c.hairStyle === 'curly' ? (
          <g fill={c.hairColor}>
            {[20, 25, 31, 37, 43, 22, 42].map((x, i) => (
              <circle key={i} cx={x} cy={i > 4 ? 22 : 17 + (i % 2) * 1.5} r="5.5" />
            ))}
          </g>
        ) : (
          <path
            d={
              c.hairStyle === 'buzz'
                ? 'M20.5 24 C21 13, 43 13, 43.5 24 C40 19, 24 19, 20.5 24 Z'
                : 'M19.5 27 C18 11, 46 11, 44.5 27 C42 20, 34 18, 26 20 C23 21, 21 23, 19.5 27 Z'
            }
            fill={c.hairColor}
          />
        )}
        {c.hairStyle === 'bun' && c.accessory !== 'beanie' && <circle cx="32" cy="12" r="5" fill={c.hairColor} />}
        {c.accessory === 'glasses' && (
          <g fill="none" stroke={c.accessoryColor} strokeWidth="1.4">
            <circle cx="27.5" cy="29" r="3.6" />
            <circle cx="36.5" cy="29" r="3.6" />
            <path d="M31 29 L33 29" />
          </g>
        )}
        {c.accessory === 'headphones' && (
          <g fill={c.accessoryColor}>
            <path d="M18 28 C18 9, 46 9, 46 28" fill="none" stroke={c.accessoryColor} strokeWidth="2.4" />
            <rect x="15.5" y="25" width="5" height="9" rx="2" />
            <rect x="43.5" y="25" width="5" height="9" rx="2" />
          </g>
        )}
      </g>
    </svg>
  );
};

// ---------------- ステータス ----------------

export const STATUS_META: Record<AttendanceStatus, { label: string; color: string; dot: string }> = {
  working: { label: '出勤中', color: 'text-emerald-300', dot: '#3ddc97' },
  away: { label: '離席中', color: 'text-amber-300', dot: '#f2b45a' },
  meeting: { label: '会議中', color: 'text-violet-300', dot: '#9b8cff' },
  off: { label: '退勤済み', color: 'text-zinc-400', dot: '#6b7280' },
};

export const StatusPill = ({ status, compact }: { status: AttendanceStatus; compact?: boolean }) => {
  const m = STATUS_META[status];
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-xs', m.color)}>
      <span className="relative flex h-2 w-2">
        {status !== 'off' && <span className="anim-ring absolute inline-flex h-full w-full rounded-full" style={{ background: m.dot }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: m.dot }} />
      </span>
      {!compact && m.label}
    </span>
  );
};

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: 'border-zinc-500/30 text-zinc-300',
  medium: 'border-sky-400/30 text-sky-200',
  high: 'border-amber-400/40 text-amber-200',
  urgent: 'border-red-400/50 text-red-200 bg-red-500/10',
};

export const PriorityChip = ({ p }: { p: TaskPriority }) => <span className={cx('chip', PRIORITY_STYLE[p])}>{PRIORITY_LABEL[p]}</span>;

// ---------------- 汎用 ----------------

export const Progress = ({ value, color = '#38d6e8', h = 6, className }: { value: number; color?: string; h?: number; className?: string }) => (
  <div className={cx('w-full overflow-hidden rounded-full bg-white/[0.07]', className)} style={{ height: h }}>
    <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: color }} />
  </div>
);

export const Modal = ({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm sm:p-4" onMouseDown={onClose}>
      <div className={cx('panel-solid anim-pop flex max-h-[92dvh] w-full flex-col shadow-2xl', width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

/** 2段階確認ボタン（削除など） */
export const ConfirmButton = ({
  onConfirm,
  children,
  confirmLabel = '本当に実行しますか？',
  className = 'btn-danger',
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  className?: string;
}) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
};

export const ViewShell = ({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) => (
  <div className="flex h-full flex-col">
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-6">{children}</div>
  </div>
);

export const Empty = ({ icon, text }: { icon?: ReactNode; text: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-zinc-500">
    {icon}
    {text}
  </div>
);

export const Stat = ({ label, value, sub, icon, accent }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; accent?: string }) => (
  <div className="panel-solid p-4">
    <div className="flex items-center justify-between text-xs text-zinc-400">
      <span>{label}</span>
      <span style={{ color: accent ?? '#38d6e8' }}>{icon}</span>
    </div>
    <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">{value}</div>
    {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
  </div>
);
