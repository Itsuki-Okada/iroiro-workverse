// ============================================================
// 建築構造：床・カーテンウォール・柱・天井まわり・外構
// ============================================================
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ATMOSPHERE } from './atmosphere';
import type { DayPhase } from './atmosphere';
import * as THREE from 'three';
import { BUILDING, WALL_HEIGHT } from './layout';
import { getGeometries, getMaterials } from './materials';
import { Box } from './primitives';
import { cityWindowTexture, slatTexture } from './textures';

const H = WALL_HEIGHT;

/** カーテンウォール（ガラス＋方立） */
const CurtainWall = ({
  from,
  to,
  gaps = [],
}: {
  from: [number, number];
  to: [number, number];
  gaps?: [number, number][];
}) => {
  const m = getMaterials();
  const g = getGeometries();
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const rotY = -Math.atan2(dz, dx);
  const mullions = Math.round(len / 2.4);
  const segs: [number, number][] = [];
  let c = 0;
  for (const [a, b] of gaps) {
    segs.push([c, a]);
    c = b;
  }
  segs.push([c, len]);
  return (
    <group position={[from[0], 0, from[1]]} rotation-y={rotY}>
      {segs.map(([a, b]) => (
        <mesh key={a} geometry={g.plane} material={m.glass} position={[(a + b) / 2, H / 2, 0]} scale={[b - a, H, 1]} />
      ))}
      {Array.from({ length: mullions + 1 }, (_, i) => {
        const x = (len * i) / mullions;
        if (gaps.some(([a, b]) => x > a - 0.1 && x < b + 0.1)) return null;
        const major = i % 4 === 0;
        return <Box key={i} s={[major ? 0.35 : 0.07, H, major ? 0.35 : 0.14]} p={[x, H / 2, 0]} m={major ? m.wallLight : m.frame} />;
      })}
      {/* 窓台・頭つなぎ */}
      <Box s={[len, 0.12, 0.3]} p={[len / 2, 0.06, 0]} m={m.frame} cast={false} />
      <Box s={[len, 0.3, 0.32]} p={[len / 2, H - 0.15, 0]} m={m.wallPanel} />
      <Box s={[len, 0.05, 0.16]} p={[len / 2, 1.05, 0]} m={m.frame} cast={false} />
    </group>
  );
};

/** 遠景の高層ビル群（InstancedMesh 1回の描画） */
const City = memo(function City({ glow }: { glow: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const count = 46;
  const material = useMemo(() => {
    const tex = cityWindowTexture().clone();
    tex.repeat.set(3, 6);
    tex.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      color: '#0f1216',
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.55,
      roughness: 0.6,
      metalness: 0.4,
    });
  }, []);
  useLayoutEffect(() => {
    const m4 = new THREE.Matrix4();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd() * 0.12;
      const r = 200 + rnd() * 90;
      const w = 12 + rnd() * 18;
      const h = 30 + rnd() * 110;
      m4.compose(
        new THREE.Vector3(Math.cos(a) * r, h / 2 - 0.4, Math.sin(a) * r),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI),
        new THREE.Vector3(w, h, w * (0.7 + rnd() * 0.6)),
      );
      ref.current.setMatrixAt(i, m4);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
    return () => {
      material.emissiveMap?.dispose();
      material.dispose();
    };
  }, [material]);
  useEffect(() => {
    material.emissiveIntensity = glow;
  }, [material, glow]);
  return <instancedMesh ref={ref} args={[getGeometries().box, material, count]} />;
});

export const Building = memo(function Building({ quality, phase }: { quality: 'high' | 'low'; phase: DayPhase }) {
  const atmos = ATMOSPHERE[phase];
  const m = getMaterials();
  const { x0, x1, z0, z1 } = BUILDING;
  const W = x1 - x0;
  const D = z1 - z0;

  const slatMat = useMemo(() => {
    const t = slatTexture().clone();
    t.repeat.set(W / 1.2, 1);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  }, [W]);

  return (
    <group>
      {/* 外構 */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.32} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color={atmos.ground} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.3, z1 + 6]} receiveShadow>
        <planeGeometry args={[W + 10, 12]} />
        <meshStandardMaterial color="#1a1c1f" roughness={0.85} />
      </mesh>
      <City glow={atmos.city} />

      {/* 床スラブ */}
      <Box s={[W + 1, 0.3, D + 1]} p={[0, -0.15, 0]} m={m.slab} cast={false} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow>
        <planeGeometry args={[W, D]} />
        {/* 磨かれたコンクリート：環境マップの映り込みで光沢を表現（反射用の再描画は行わない） */}
        <meshStandardMaterial color="#2c3036" roughness={quality === 'high' ? 0.32 : 0.5} metalness={0.25} envMapIntensity={0.9} />
      </mesh>

      {/* 奥：ソリッド壁（木目スラット） */}
      <Box s={[W, H, 0.3]} p={[0, H / 2, z0 - 0.15]} m={m.wallPanel} />
      <mesh position={[0, H / 2 - 0.1, z0 + 0.02]} material={slatMat} receiveShadow>
        <planeGeometry args={[W, H - 0.4]} />
      </mesh>
      {/* 壁の間接照明（コーブ）と足元の控えめなシアンライン */}
      <mesh geometry={getGeometries().box} material={m.lightWarm} scale={[W, 0.03, 0.05]} position={[0, H - 0.32, z0 + 0.08]} />
      <mesh geometry={getGeometries().box} material={m.accentSoft} scale={[W, 0.02, 0.02]} position={[0, 0.06, z0 + 0.04]} />

      {/* 左右・正面：カーテンウォール */}
      <CurtainWall from={[x0, z0]} to={[x0, z1]} />
      <CurtainWall from={[x1, z1]} to={[x1, z0]} />
      <CurtainWall from={[x0, z1]} to={[x1, z1]} gaps={[[W / 2 - 2.6, W / 2 + 2.6]]} />

      {/* エントランス：自動ドアとキャノピー */}
      <group position={[0, 0, z1]}>
        <Box s={[5.4, 0.25, 0.4]} p={[0, H - 0.6, 0]} m={m.frame} />
        <mesh geometry={getGeometries().plane} material={m.glass} position={[-1.9, 1.5, 0.05]} scale={[1.4, 3, 1]} />
        <mesh geometry={getGeometries().plane} material={m.glass} position={[1.9, 1.5, 0.05]} scale={[1.4, 3, 1]} />
        <Box s={[0.06, 3, 0.1]} p={[-1.2, 1.5, 0.05]} m={m.silver} />
        <Box s={[0.06, 3, 0.1]} p={[1.2, 1.5, 0.05]} m={m.silver} />
        <Box s={[8, 0.18, 3.4]} p={[0, H - 0.2, 1.7]} m={m.wallPanel} />
        <mesh geometry={getGeometries().box} material={m.lightPanel} scale={[7.2, 0.01, 0.08]} position={[0, H - 0.3, 3.2]} />
        <Box s={[0.18, H - 0.3, 0.18]} p={[-3.8, (H - 0.3) / 2, 3.2]} m={m.silver} />
        <Box s={[0.18, H - 0.3, 0.18]} p={[3.8, (H - 0.3) / 2, 3.2]} m={m.silver} />
        <Box s={[4.6, 0.02, 2.2]} p={[0, 0.01, -1.3]} m={m.rug} cast={false} />
      </group>

      {/* 構造柱 */}
      {[
        [-10, -4],
        [10, -4],
        [-10, 11.75],
        [10, 11.75],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Box s={[0.6, H, 0.6]} p={[0, H / 2, 0]} m={m.wallLight} />
          <Box s={[0.64, 0.12, 0.64]} p={[0, 0.06, 0]} m={m.frame} cast={false} />
          <mesh geometry={getGeometries().box} material={m.accentSoft} scale={[0.62, 0.015, 0.62]} position={[0, 2.6, 0]} />
        </group>
      ))}

      {/* 天井際のソフィット（建物の上端を表現） */}
      <Box s={[W, 0.25, 1]} p={[0, H + 0.1, z0 + 0.5]} m={m.wallPanel} />
      <Box s={[1, 0.25, D]} p={[x0 + 0.5, H + 0.1, 0]} m={m.wallPanel} />
      <Box s={[1, 0.25, D]} p={[x1 - 0.5, H + 0.1, 0]} m={m.wallPanel} />
      <Box s={[W, 0.25, 1]} p={[0, H + 0.1, z1 - 0.5]} m={m.wallPanel} />
    </group>
  );
});
