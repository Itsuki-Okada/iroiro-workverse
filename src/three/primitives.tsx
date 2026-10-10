// ============================================================
// 共通プリミティブ（単位ジオメトリ + スケールで再利用）
// ============================================================
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { getGeometries, getMaterials } from './materials';

type V3 = [number, number, number];

export const Box = ({
  s,
  p,
  r,
  m,
  cast = true,
  receive = true,
}: {
  s: V3;
  p: V3;
  r?: V3;
  m: THREE.Material;
  cast?: boolean;
  receive?: boolean;
}) => (
  <mesh geometry={getGeometries().box} material={m} scale={s} position={p} rotation={r} castShadow={cast} receiveShadow={receive} />
);

export const Cyl = ({ s, p, r, m, low = false, cast = true }: { s: V3; p: V3; r?: V3; m: THREE.Material; low?: boolean; cast?: boolean }) => (
  <mesh
    geometry={low ? getGeometries().cylinderLow : getGeometries().cylinder}
    material={m}
    scale={s}
    position={p}
    rotation={r}
    castShadow={cast}
    receiveShadow
  />
);

/**
 * ガラスパーティション。from → to の直線上にガラス面・上下レール・支柱を配置。
 * gaps で開口部（出入口）を指定できる（始点からの距離）。
 */
export const GlassWall = ({
  from,
  to,
  height = 1.15,
  gaps = [],
  frosted = false,
  band = false,
}: {
  from: [number, number];
  to: [number, number];
  height?: number;
  gaps?: [number, number][];
  frosted?: boolean;
  band?: boolean;
}) => {
  const m = getMaterials();
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const rotY = -Math.atan2(dz, dx);
  // 開口部を除いたセグメント
  const segs: [number, number][] = [];
  let cursor = 0;
  for (const [a, b] of [...gaps].sort((x, y) => x[0] - y[0])) {
    if (a > cursor) segs.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < len) segs.push([cursor, len]);

  return (
    <group position={[from[0], 0, from[1]]} rotation-y={rotY}>
      {segs.map(([a, b]) => {
        const w = b - a;
        const cx = a + w / 2;
        const posts = Math.max(1, Math.round(w / 1.6));
        const children: ReactNode[] = [];
        for (let i = 0; i <= posts; i++) {
          children.push(<Box key={`p${i}`} s={[0.04, height, 0.05]} p={[a + (w * i) / posts, height / 2, 0]} m={m.frame} receive={false} />);
        }
        return (
          <group key={`${a}-${b}`}>
            <mesh geometry={getGeometries().plane} material={frosted ? m.glassFrosted : m.glass} position={[cx, height / 2, 0]} scale={[w, height, 1]} />
            {band && (
              <mesh geometry={getGeometries().plane} material={m.glassFrosted} position={[cx, 1.25, 0.003]} scale={[w, 0.35, 1]} />
            )}
            <Box s={[w, 0.04, 0.06]} p={[cx, height, 0]} m={m.frame} receive={false} />
            <Box s={[w, 0.05, 0.07]} p={[cx, 0.025, 0]} m={m.frame} cast={false} />
            {children}
          </group>
        );
      })}
    </group>
  );
};

/** 吊り下げ式ライン照明（ケーブル付き） */
export const PendantLine = ({ p, length, rotY = 0, warm = false }: { p: V3; length: number; rotY?: number; warm?: boolean }) => {
  const m = getMaterials();
  const top = 3.65;
  const cableH = top - p[1];
  return (
    <group position={p} rotation-y={rotY}>
      <Box s={[length, 0.045, 0.14]} p={[0, 0.02, 0]} m={m.wallLight} cast={false} receive={false} />
      <mesh geometry={getGeometries().box} material={warm ? m.lightWarm : m.lightPanel} scale={[length - 0.06, 0.01, 0.1]} position={[0, -0.005, 0]} />
      <Box s={[0.008, cableH, 0.008]} p={[-length / 2 + 0.2, cableH / 2, 0]} m={m.cable} cast={false} receive={false} />
      <Box s={[0.008, cableH, 0.008]} p={[length / 2 - 0.2, cableH / 2, 0]} m={m.cable} cast={false} receive={false} />
    </group>
  );
};
