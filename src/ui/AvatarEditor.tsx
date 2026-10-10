import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Lock, Shuffle, Sparkles } from 'lucide-react';
import type { AvatarConfig } from '../types';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import {
  ACCESSORIES,
  ACCESSORY_COLORS,
  BOTTOM_COLORS,
  COSTUMES,
  generateAvatar,
  HAIR_COLORS,
  HAIR_STYLES,
  INNER_COLORS,
  nextUnlocks,
  SHOE_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  TOP_STYLES,
} from '../data/avatarFactory';
import type { AvatarOption } from '../data/avatarFactory';
import { AvatarModel } from '../three/AvatarModel';
import { hasWebGL } from '../three/OfficeScene';
import { cx, hashString, uid } from '../lib/utils';
import { Avatar2D, Modal } from './common';

const Swatches = ({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {colors.map((c) => (
      <button
        key={c}
        onClick={() => onChange(c)}
        className={cx('h-7 w-7 rounded-full border-2 transition', value === c ? 'scale-110 border-accent' : 'border-white/10 hover:border-white/30')}
        style={{ background: c }}
        aria-label={c}
      />
    ))}
    <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-white/20" title="カスタムカラー">
      <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="flex h-full items-center justify-center text-xs text-zinc-400">+</span>
    </label>
  </div>
);

/** レベル未到達のパーツはロック表示 */
const Options = <T extends string>({ items, value, level, onChange }: { items: AvatarOption<T>[]; value: T; level: number; onChange: (v: T) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((i) => {
      const locked = i.unlock > level;
      return (
        <button
          key={i.value}
          disabled={locked}
          title={locked ? `レベル${i.unlock}で解放` : undefined}
          onClick={() => onChange(i.value)}
          className={cx(
            'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition',
            locked
              ? 'cursor-not-allowed border-white/5 text-zinc-600'
              : value === i.value
                ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100'
                : 'border-white/10 text-zinc-400 hover:bg-white/[0.04]',
          )}
        >
          {locked && <Lock size={11} />}
          {i.label}
          {locked && <span className="text-[10px]">Lv.{i.unlock}</span>}
        </button>
      );
    })}
  </div>
);

const Preview = ({ config }: { config: AvatarConfig }) => (
  <Canvas camera={{ position: [1.9, 1.55, -3.4], fov: 30 }} shadows dpr={[1, 2]}>
    <color attach="background" args={['#14171b']} />
    <hemisphereLight args={['#e8f0f6', '#1a1c20', 0.9]} />
    <directionalLight position={[2, 4, -3]} intensity={1.6} castShadow />
    <directionalLight position={[-3, 2, 2]} intensity={0.4} color="#38d6e8" />
    <Suspense fallback={null}>
      <AvatarModel config={config} pose="stand" />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={3} blur={2.4} far={2} />
    </Suspense>
    <OrbitControls target={[0, 1.0, 0]} enablePan={false} minDistance={2} maxDistance={5} minPolarAngle={0.6} maxPolarAngle={1.7} />
  </Canvas>
);

const pickUnlocked = <T,>(items: AvatarOption<T>[], level: number, seed: number) => {
  const ok = items.filter((i) => i.unlock <= level);
  return ok[seed % ok.length].value;
};

export const AvatarEditor = () => {
  const employeeId = useUi((s) => s.avatarEditorFor);
  const close = useUi((s) => s.openAvatarEditor);
  const stored = useApp((s) => (employeeId ? s.presentation.avatars[employeeId] : undefined));
  const employee = useApp((s) => s.business.employees.find((e) => e.id === employeeId));
  const update = useApp((s) => s.updateAvatar);
  if (!employeeId) return null;
  const c = stored ?? generateAvatar(employeeId);
  const level = employee?.level ?? 1;
  const set = (patch: Partial<AvatarConfig>) => update(employeeId, patch);
  const upcoming = nextUnlocks(level).slice(0, 3);

  const randomize = () => {
    const { employeeId: _ignored, ...rand } = generateAvatar(uid('rand'));
    const h = hashString(uid('r'));
    set({
      ...rand,
      hairStyle: pickUnlocked(HAIR_STYLES, level, h),
      topStyle: pickUnlocked(TOP_STYLES, level, h >>> 4),
      accessory: pickUnlocked(ACCESSORIES, level, h >>> 8),
      costume: h % 4 === 0 ? pickUnlocked(COSTUMES, level, h >>> 12) : 'none',
    });
  };

  return (
    <Modal open onClose={() => close(null)} title={`アバター編集 — ${employee?.name ?? ''}`} width="max-w-3xl">
      <div className="grid gap-5 md:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-3">
          <div className="h-[260px] overflow-hidden rounded-xl border border-white/[0.06] md:h-[340px]">
            {hasWebGL() ? (
              <Preview config={c} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Avatar2D employeeId={employeeId} size={140} />
              </div>
            )}
          </div>
          <button className="btn" onClick={randomize}>
            <Shuffle size={15} /> ランダム
          </button>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <Sparkles size={13} className="text-amber-300" /> 現在 Lv.{level}
            </div>
            {upcoming.length ? (
              <ul className="mt-1.5 space-y-0.5 text-zinc-500">
                {upcoming.map((u) => (
                  <li key={`${u.value}-${u.unlock}`}>
                    Lv.{u.unlock}：{u.label}
                    {COSTUMES.some((x) => x.value === u.value) ? 'の着ぐるみ' : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 text-zinc-500">すべてのパーツを解放済みです</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="label">着ぐるみ（レベルで解放）</div>
            <Options items={COSTUMES} value={c.costume ?? 'none'} level={level} onChange={(v) => set({ costume: v })} />
          </div>
          <div>
            <div className="label">肌の色</div>
            <Swatches colors={SKIN_TONES} value={c.skinTone} onChange={(v) => set({ skinTone: v })} />
          </div>
          <div className={cx('space-y-4', c.costume && c.costume !== 'none' && 'pointer-events-none opacity-40')}>
            <div>
              <div className="label">髪型</div>
              <Options items={HAIR_STYLES} value={c.hairStyle} level={level} onChange={(v) => set({ hairStyle: v })} />
            </div>
            <div>
              <div className="label">髪の色</div>
              <Swatches colors={HAIR_COLORS} value={c.hairColor} onChange={(v) => set({ hairColor: v })} />
            </div>
            <div>
              <div className="label">トップス</div>
              <Options items={TOP_STYLES} value={c.topStyle} level={level} onChange={(v) => set({ topStyle: v })} />
              <div className="mt-2">
                <Swatches colors={TOP_COLORS} value={c.topColor} onChange={(v) => set({ topColor: v })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="label">インナー</div>
                <Swatches colors={INNER_COLORS} value={c.innerColor} onChange={(v) => set({ innerColor: v })} />
              </div>
              <div>
                <div className="label">ボトムス</div>
                <Swatches colors={BOTTOM_COLORS} value={c.bottomColor} onChange={(v) => set({ bottomColor: v })} />
              </div>
              <div>
                <div className="label">シューズ</div>
                <Swatches colors={SHOE_COLORS} value={c.shoeColor} onChange={(v) => set({ shoeColor: v })} />
              </div>
            </div>
            <div>
              <div className="label">アクセサリー</div>
              <Options items={ACCESSORIES} value={c.accessory} level={level} onChange={(v) => set({ accessory: v })} />
              {c.accessory !== 'none' && (
                <div className="mt-2">
                  <Swatches colors={ACCESSORY_COLORS} value={c.accessoryColor} onChange={(v) => set({ accessoryColor: v })} />
                </div>
              )}
            </div>
          </div>
          {c.costume && c.costume !== 'none' && <p className="text-xs text-zinc-500">着ぐるみ着用中は髪型・服・アクセサリーは隠れます。</p>}
          <div>
            <div className="label">身長</div>
            <input type="range" min={0.94} max={1.06} step={0.01} value={c.heightScale} onChange={(e) => set({ heightScale: Number(e.target.value) })} className="w-full max-w-xs accent-cyan-400" />
          </div>
        </div>
      </div>
    </Modal>
  );
};
