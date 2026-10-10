import { useEffect } from 'react';
import { Award, CheckCircle2, Info, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useUi } from '../store/uiStore';
import type { Toast } from '../store/uiStore';
import { cx } from '../lib/utils';

const TONE: Record<Toast['tone'], { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'text-zinc-300' },
  success: { icon: CheckCircle2, cls: 'text-emerald-300' },
  xp: { icon: Sparkles, cls: 'text-cyan-300' },
  warn: { icon: TriangleAlert, cls: 'text-amber-300' },
  badge: { icon: Award, cls: 'text-amber-300' },
};

export const Toasts = () => {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed top-[68px] left-1/2 z-[60] flex w-[min(360px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, cls } = TONE[t.tone];
        return (
          <div
            key={t.id}
            className={cx(
              'panel anim-fade-up pointer-events-auto flex items-start gap-3 px-4 py-3',
              t.tone === 'badge' && 'border-amber-300/30',
              t.tone === 'xp' && 'border-cyan-300/25',
            )}
          >
            <Icon size={18} className={cx('mt-0.5 shrink-0', cls)} />
            <div className="min-w-0 flex-1">
              <div className={cx('text-sm font-semibold', t.tone === 'xp' ? 'text-cyan-200' : 'text-zinc-100')}>{t.title}</div>
              {t.body && <div className="mt-0.5 truncate text-xs text-zinc-400">{t.body}</div>}
            </div>
            <button className="text-zinc-500 hover:text-zinc-300" onClick={() => dismiss(t.id)} aria-label="閉じる">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const LevelUpOverlay = () => {
  const lv = useUi((s) => s.levelUp);
  const close = useUi((s) => s.closeLevelUp);
  useEffect(() => {
    if (!lv) return;
    const t = setTimeout(close, 4200);
    return () => clearTimeout(t);
  }, [lv, close]);
  if (!lv) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={close}>
      <div className="anim-pop relative flex flex-col items-center px-16 py-10 text-center">
        {[0, 0.4, 0.8].map((d) => (
          <span
            key={d}
            className="anim-ring absolute top-1/2 left-1/2 -mt-24 -ml-24 h-48 w-48 rounded-full border border-cyan-300/50"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
        <div className="text-xs font-semibold tracking-[0.5em] text-cyan-200">LEVEL UP</div>
        <div className="mt-3 flex items-center gap-5">
          <span className="text-4xl font-semibold text-zinc-500 tabular-nums">{lv.from}</span>
          <span className="text-2xl text-zinc-500">→</span>
          <span className="text-shine text-8xl font-bold tabular-nums">{lv.to}</span>
        </div>
        <div className="mt-4 text-base text-zinc-200">{lv.name} さん、おめでとうございます！</div>
        <div className="mt-1 text-xs text-zinc-500">クリックで閉じる</div>
      </div>
    </div>
  );
};
