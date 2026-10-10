// ============================================================
// 3Dエフェクト：タスク完了パーティクル / レベルアップ演出
// ============================================================
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Label3D } from './Label3D';
import { useUi } from '../store/uiStore';
import type { FxEvent } from '../store/uiStore';
import type { AvatarPlacement } from './placements';

const COUNT = 36;

const TaskBurst = ({ at, xp, onDone }: { at: AvatarPlacement; xp: number; onDone: () => void }) => {
  const points = useRef<THREE.Points>(null!);
  const label = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const y0 = at.pose === 'sit' ? 1.3 : 1.7;
  const { geo, mat, vel } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 0.9;
      vel[i * 3] = Math.cos(a) * r;
      vel[i * 3 + 1] = 1.2 + Math.random() * 1.6;
      vel[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: '#7beaf5',
      size: 0.12,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo, mat, vel };
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const p = t / 1.6;
    if (p >= 1) return onDone();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      pos.setXYZ(i, vel[i * 3] * t, y0 + vel[i * 3 + 1] * t - 1.4 * t * t, vel[i * 3 + 2] * t);
    }
    pos.needsUpdate = true;
    mat.opacity = 1 - p;
    if (label.current) {
      label.current.style.transform = `translateY(${-p * 40}px)`;
      label.current.style.opacity = String(1 - p * p);
    }
  });
  return (
    <group position={[at.x, 0, at.z]}>
      <points ref={points} geometry={geo} material={mat} frustumCulled={false} />
      <Label3D position={[0, y0 + 0.9, 0]} zIndex={40}>
        <div ref={label} className="whitespace-nowrap text-sm font-bold text-cyan-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          +{xp} XP
        </div>
      </Label3D>
    </group>
  );
};

const ringGeo = new THREE.RingGeometry(0.85, 1, 64);
const pillarGeo = new THREE.CylinderGeometry(0.6, 0.6, 6, 32, 1, true);

const LevelBurst = ({ at, level, onDone }: { at: AvatarPlacement; level: number; onDone: () => void }) => {
  const rings = useRef<THREE.Group>(null!);
  const pillar = useRef<THREE.Mesh>(null!);
  const start = useRef<number | null>(null);
  const mats = useMemo(
    () => ({
      ring: new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
      pillar: new THREE.MeshBasicMaterial({ color: '#9ff3ff', transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;
    const p = t / 2.6;
    if (p >= 1) return onDone();
    rings.current.children.forEach((c, i) => {
      const q = Math.max(0, Math.min(1, p * 1.6 - i * 0.18));
      c.scale.setScalar(0.2 + q * 3.2);
      c.position.y = 0.05 + q * 0.6 * i;
    });
    mats.ring.opacity = 0.9 * (1 - p);
    mats.pillar.opacity = Math.sin(Math.min(1, p * 1.3) * Math.PI) * 0.5;
    pillar.current.scale.set(1 - p * 0.6, 1, 1 - p * 0.6);
  });
  return (
    <group position={[at.x, 0, at.z]}>
      <group ref={rings}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} geometry={ringGeo} material={mats.ring} rotation-x={-Math.PI / 2} />
        ))}
      </group>
      <mesh ref={pillar} geometry={pillarGeo} material={mats.pillar} position-y={3} />
      <Label3D position={[0, 3.2, 0]} zIndex={40}>
        <div className="whitespace-nowrap rounded-full border border-amber-200/40 bg-zinc-900/80 px-3 py-1 text-xs font-bold tracking-widest text-amber-200">
          LEVEL {level}
        </div>
      </Label3D>
    </group>
  );
};

export const Effects = ({ placements }: { placements: Record<string, AvatarPlacement> }) => {
  const fx = useUi((s) => s.fx);
  const consume = useUi((s) => s.consumeFx);

  // 位置を持たない（退勤中など）イベントや、アバター側で処理するイベントは即座に破棄
  useEffect(() => {
    for (const f of fx) {
      if (f.kind === 'arrive' || f.kind === 'leave' || !placements[f.employeeId]) consume(f.id);
    }
  }, [fx, placements, consume]);

  return (
    <>
      {fx.map((f: FxEvent) => {
        const at = placements[f.employeeId];
        if (!at) return null;
        if (f.kind === 'taskComplete') return <TaskBurst key={f.id} at={at} xp={f.xp} onDone={() => consume(f.id)} />;
        if (f.kind === 'levelUp') return <LevelBurst key={f.id} at={at} level={f.level} onDone={() => consume(f.id)} />;
        return null;
      })}
    </>
  );
};
