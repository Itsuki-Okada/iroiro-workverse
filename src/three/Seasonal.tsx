// ============================================================
// 季節イベントの飾り付け（ハロウィン / クリスマス / お正月）
// ============================================================
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Season } from './atmosphere';
import type { DeskInfo } from './placements';
import { BUILDING } from './layout';

type V3 = [number, number, number];

// ---------- 共有マテリアル・ジオメトリ ----------
const M = {
  pumpkin: new THREE.MeshStandardMaterial({ color: '#e8761e', roughness: 0.55 }),
  stem: new THREE.MeshStandardMaterial({ color: '#4c5a2a', roughness: 0.8 }),
  glow: new THREE.MeshBasicMaterial({ color: '#ffcf4a', toneMapped: false }),
  ghost: new THREE.MeshStandardMaterial({ color: '#f4f6fa', emissive: '#cfe3ff', emissiveIntensity: 0.25, roughness: 0.6, transparent: true, opacity: 0.92 }),
  black: new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.6 }),
  treeDark: new THREE.MeshStandardMaterial({ color: '#1f4d2e', roughness: 0.8, flatShading: true }),
  treeLight: new THREE.MeshStandardMaterial({ color: '#2b6a3d', roughness: 0.8, flatShading: true }),
  trunk: new THREE.MeshStandardMaterial({ color: '#5a3d28', roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: '#e8c25a', emissive: '#ffcf5a', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 }),
  red: new THREE.MeshStandardMaterial({ color: '#c8283a', roughness: 0.4, metalness: 0.2 }),
  white: new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.5 }),
  bamboo: new THREE.MeshStandardMaterial({ color: '#6f9a45', roughness: 0.5 }),
  bambooCut: new THREE.MeshStandardMaterial({ color: '#d9e6b0', roughness: 0.6 }),
  straw: new THREE.MeshStandardMaterial({ color: '#c9a86a', roughness: 0.9 }),
  pine: new THREE.MeshStandardMaterial({ color: '#2f5a33', roughness: 0.8, flatShading: true }),
  mikan: new THREE.MeshStandardMaterial({ color: '#f29a2e', roughness: 0.6 }),
  mochi: new THREE.MeshStandardMaterial({ color: '#f7f4ec', roughness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.6 }),
};
const G = {
  lobe: new THREE.SphereGeometry(0.5, 14, 10),
  stem: new THREE.CylinderGeometry(0.06, 0.09, 0.22, 6),
  eye: new THREE.ConeGeometry(0.12, 0.14, 3),
  mouth: new THREE.BoxGeometry(0.34, 0.07, 0.04),
  ghostHead: new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  ghostBody: new THREE.CylinderGeometry(0.22, 0.27, 0.4, 16, 1, true),
  dot: new THREE.SphereGeometry(0.03, 8, 6),
  wing: new THREE.ConeGeometry(0.12, 0.05, 3),
  batBody: new THREE.SphereGeometry(0.05, 8, 6),
  bulb: new THREE.SphereGeometry(0.045, 8, 6),
  cone: new THREE.ConeGeometry(1, 1, 9),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  star: new THREE.OctahedronGeometry(0.16, 0),
  sphere: new THREE.SphereGeometry(0.5, 12, 10),
  pineBlob: new THREE.IcosahedronGeometry(0.18, 0),
};

const bulbMats = new Map<string, THREE.MeshBasicMaterial>();
const bulbMat = (c: string) => {
  let m = bulbMats.get(c);
  if (!m) bulbMats.set(c, (m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false })));
  return m;
};

// ---------- ハロウィン ----------

/** ジャック・オー・ランタン */
const Pumpkin = ({ p, s = 1, rot = 0 }: { p: V3; s?: number; rot?: number }) => (
  <group position={p} scale={s} rotation-y={rot}>
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return <mesh key={i} geometry={G.lobe} material={M.pumpkin} position={[Math.cos(a) * 0.14, 0.26, Math.sin(a) * 0.14]} scale={[0.42, 0.5, 0.42]} castShadow />;
    })}
    <mesh geometry={G.lobe} material={M.pumpkin} position-y={0.26} scale={[0.6, 0.52, 0.6]} castShadow />
    <mesh geometry={G.stem} material={M.stem} position-y={0.54} rotation-z={0.2} />
    {/* 顔（正面 = +Z） */}
    <mesh geometry={G.eye} material={M.glow} position={[-0.1, 0.32, 0.29]} rotation-x={Math.PI / 2} rotation-z={Math.PI} scale={0.6} />
    <mesh geometry={G.eye} material={M.glow} position={[0.1, 0.32, 0.29]} rotation-x={Math.PI / 2} rotation-z={Math.PI} scale={0.6} />
    <mesh geometry={G.mouth} material={M.glow} position={[0, 0.19, 0.29]} scale={[0.8, 1, 1]} />
  </group>
);

const Ghost = ({ p, phase }: { p: V3; phase: number }) => {
  const ref = useRef<THREE.Group>(null!);
  useFrame((st) => {
    const t = st.clock.elapsedTime + phase;
    ref.current.position.y = p[1] + Math.sin(t * 1.4) * 0.15;
    ref.current.rotation.y = Math.sin(t * 0.5) * 0.8;
    ref.current.position.x = p[0] + Math.sin(t * 0.35) * 0.6;
  });
  return (
    <group ref={ref} position={p}>
      <mesh geometry={G.ghostHead} material={M.ghost} />
      <mesh geometry={G.ghostBody} material={M.ghost} position-y={-0.2} />
      <mesh geometry={G.dot} material={M.black} position={[-0.07, 0.06, 0.2]} scale={[1, 1.4, 1]} />
      <mesh geometry={G.dot} material={M.black} position={[0.07, 0.06, 0.2]} scale={[1, 1.4, 1]} />
      <mesh geometry={G.dot} material={M.black} position={[0, -0.04, 0.21]} scale={[1.2, 1.6, 1]} />
    </group>
  );
};

const Bat = ({ center, radius, phase }: { center: V3; radius: number; phase: number }) => {
  const ref = useRef<THREE.Group>(null!);
  const wl = useRef<THREE.Mesh>(null!);
  const wr = useRef<THREE.Mesh>(null!);
  useFrame((st) => {
    const t = st.clock.elapsedTime * 0.6 + phase;
    ref.current.position.set(center[0] + Math.cos(t) * radius, center[1] + Math.sin(t * 2.3) * 0.25, center[2] + Math.sin(t) * radius);
    ref.current.rotation.y = -t;
    const f = Math.sin(st.clock.elapsedTime * 16 + phase) * 0.7;
    wl.current.rotation.z = 0.3 + f;
    wr.current.rotation.z = -0.3 - f;
  });
  return (
    <group ref={ref}>
      <mesh geometry={G.batBody} material={M.black} />
      <mesh ref={wl} geometry={G.wing} material={M.black} position={[-0.1, 0, 0]} rotation-x={Math.PI / 2} />
      <mesh ref={wr} geometry={G.wing} material={M.black} position={[0.1, 0, 0]} rotation-x={Math.PI / 2} />
    </group>
  );
};

/** たるませた電飾 */
const StringLights = ({ from, to, sag = 0.3, colors }: { from: V3; to: V3; sag?: number; colors: string[] }) => {
  const bulbs = useMemo(() => {
    const n = 28;
    return Array.from({ length: n }, (_, i) => {
      const k = i / (n - 1);
      return {
        p: [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * sag, from[2] + (to[2] - from[2]) * k] as V3,
        c: colors[i % colors.length],
      };
    });
  }, [from, to, sag, colors]);
  const group = useRef<THREE.Group>(null!);
  // ゆっくり明滅
  useFrame((st) => {
    group.current.children.forEach((c, i) => {
      c.scale.setScalar(0.8 + Math.max(0, Math.sin(st.clock.elapsedTime * 2 + i * 0.9)) * 0.5);
    });
  });
  return (
    <group ref={group}>
      {bulbs.map((b, i) => (
        <mesh key={i} geometry={G.bulb} material={bulbMat(b.c)} position={b.p} />
      ))}
    </group>
  );
};

const deskTopPoint = (d: DeskInfo, lx: number, lz: number): V3 => {
  const c = Math.cos(d.rotY);
  const s = Math.sin(d.rotY);
  return [d.x + lx * c + lz * s, 0.765, d.z - lx * s + lz * c];
};

const Halloween = ({ desks }: { desks: DeskInfo[] }) => {
  const deskPumpkins = useMemo(() => desks.filter((d) => d.occupantId).filter((_, i) => i % 3 === 0).slice(0, 8), [desks]);
  return (
    <group>
      <Pumpkin p={[-4.6, 0, 19.1]} s={1.5} rot={0.2} />
      <Pumpkin p={[4.6, 0, 19.1]} s={1.3} rot={-0.3} />
      <Pumpkin p={[-4.1, 0, 19.4]} s={0.8} rot={0.5} />
      <Pumpkin p={[-1.37, 1.09, 14.2]} s={0.45} rot={-0.5} />
      <Pumpkin p={[1.37, 1.09, 14.2]} s={0.45} rot={0.5} />
      <Pumpkin p={[0, 0.44, 1.25]} s={0.5} />
      <Pumpkin p={[17.75, 1.07, 15.85]} s={0.4} />
      <Pumpkin p={[26.6, 0.78, -16.4]} s={0.4} rot={Math.PI} />
      {deskPumpkins.map((d) => (
        <Pumpkin key={d.key} p={deskTopPoint(d, 0.62, -0.25)} s={0.28} rot={d.rotY} />
      ))}
      <Ghost p={[-3.8, 2.3, 3.4]} phase={0} />
      <Ghost p={[-22, 2.2, 15.2]} phase={2} />
      <Ghost p={[25, 2.3, 17]} phase={4} />
      {[0, 1.6, 3.2, 4.8].map((ph) => (
        <Bat key={ph} center={[0, 2.9, 14]} radius={2.6 + ph * 0.15} phase={ph} />
      ))}
      <StringLights from={[-5, 3.08, 9.42]} to={[5, 3.08, 9.42]} colors={['#ff8a1f', '#a76bff']} />
    </group>
  );
};

// ---------- クリスマス ----------

const ChristmasTree = ({ p }: { p: V3 }) => {
  const ornaments = useMemo(() => {
    const list: { p: V3; c: THREE.Material }[] = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const y = 0.6 + rnd() * 1.9;
      const r = (1 - (y - 0.5) / 2.4) * 0.95;
      const a = rnd() * Math.PI * 2;
      list.push({ p: [Math.cos(a) * r, y, Math.sin(a) * r], c: rnd() > 0.5 ? M.red : M.gold });
    }
    return list;
  }, []);
  const star = useRef<THREE.Mesh>(null!);
  useFrame((st) => (star.current.rotation.y = st.clock.elapsedTime));
  return (
    <group position={p}>
      <mesh geometry={G.cyl} material={M.trunk} scale={[0.22, 0.4, 0.22]} position-y={0.2} />
      {[
        [1.15, 1.1, 0.9],
        [0.9, 0.95, 1.55],
        [0.65, 0.8, 2.1],
        [0.4, 0.6, 2.55],
      ].map(([r, h, y], i) => (
        <mesh key={i} geometry={G.cone} material={i % 2 ? M.treeLight : M.treeDark} scale={[r, h, r]} position-y={y} castShadow />
      ))}
      {ornaments.map((o, i) => (
        <mesh key={i} geometry={G.sphere} material={o.c} scale={0.1} position={o.p} />
      ))}
      <mesh ref={star} geometry={G.star} material={M.gold} position-y={2.95} scale={[1, 1.3, 1]} />
      {/* プレゼント */}
      {[
        [0.9, 0.9, '#c8283a'],
        [-0.8, 0.6, '#2f6fd1'],
        [0.2, -1.0, '#e8c25a'],
        [-0.4, 0.95, '#2b8a4b'],
      ].map(([x, z, c], i) => (
        <group key={i} position={[x as number, 0.16, z as number]} rotation-y={i}>
          <mesh geometry={G.box} material={bulbMat(c as string)} scale={[0.34, 0.32, 0.34]} />
          <mesh geometry={G.box} material={M.white} scale={[0.36, 0.33, 0.05]} />
          <mesh geometry={G.box} material={M.white} scale={[0.05, 0.33, 0.36]} />
        </group>
      ))}
    </group>
  );
};

/** 建物の外に降る雪 */
const Snow = memo(function Snow() {
  const COUNT = 1800;
  const { geo, mat, speed } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      let x = 0;
      let z = 0;
      do {
        x = (Math.random() - 0.5) * 180;
        z = (Math.random() - 0.5) * 160;
      } while (Math.abs(x) < BUILDING.x1 + 1 && Math.abs(z) < BUILDING.z1 + 1);
      pos.set([x, Math.random() * 40, z], i * 3);
      speed[i] = 1 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.28, transparent: true, opacity: 0.85, depthWrite: false });
    return { geo, mat, speed };
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame((st, dt) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      let y = p.getY(i) - speed[i] * dt;
      if (y < 0) y = 40;
      p.setY(i, y);
      p.setX(i, p.getX(i) + Math.sin(t + i) * 0.004);
    }
    p.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
});

const Christmas = () => (
  <group>
    <ChristmasTree p={[6.6, 0, 10.6]} />
    <StringLights from={[-5, 3.08, 9.42]} to={[5, 3.08, 9.42]} colors={['#ff3b4a', '#3bd16f', '#ffd25a', '#ffffff']} />
    <Snow />
  </group>
);

// ---------- お正月 ----------

const Kadomatsu = ({ p }: { p: V3 }) => (
  <group position={p}>
    <mesh geometry={G.cyl} material={M.straw} scale={[0.55, 0.45, 0.55]} position-y={0.225} castShadow />
    {[
      [0, 1.25, 0],
      [-0.12, 1.0, 0.1],
      [0.12, 0.85, 0.08],
    ].map(([x, h, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <mesh geometry={G.cyl} material={M.bamboo} scale={[0.1, h, 0.1]} position-y={h / 2 + 0.1} castShadow />
        <mesh geometry={G.cyl} material={M.bambooCut} scale={[0.1, 0.01, 0.1]} position-y={h + 0.1} rotation-x={0.5} />
      </group>
    ))}
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return <mesh key={i} geometry={G.pineBlob} material={M.pine} position={[Math.cos(a) * 0.22, 0.55, Math.sin(a) * 0.22]} />;
    })}
    <mesh geometry={G.sphere} material={M.red} scale={0.06} position={[0.2, 0.62, 0.15]} />
    <mesh geometry={G.sphere} material={M.red} scale={0.06} position={[0.24, 0.6, 0.06]} />
  </group>
);

const KagamiMochi = ({ p }: { p: V3 }) => (
  <group position={p}>
    <mesh geometry={G.box} material={M.wood} scale={[0.3, 0.06, 0.3]} position-y={0.03} />
    <mesh geometry={G.sphere} material={M.mochi} scale={[0.26, 0.12, 0.26]} position-y={0.12} />
    <mesh geometry={G.sphere} material={M.mochi} scale={[0.2, 0.1, 0.2]} position-y={0.2} />
    <mesh geometry={G.sphere} material={M.mikan} scale={0.08} position-y={0.28} />
  </group>
);

const NewYear = () => (
  <group>
    <Kadomatsu p={[-4.6, 0, 19.2]} />
    <Kadomatsu p={[4.6, 0, 19.2]} />
    <KagamiMochi p={[0, 1.09, 14.6]} />
    <StringLights from={[-5, 3.08, 9.42]} to={[5, 3.08, 9.42]} colors={['#ff3b4a', '#ffffff']} />
  </group>
);

export const SeasonalDecor = ({ season, desks }: { season: Season; desks: DeskInfo[] }) => {
  if (season === 'halloween') return <Halloween desks={desks} />;
  if (season === 'christmas') return <Christmas />;
  if (season === 'newyear') return <NewYear />;
  return null;
};
