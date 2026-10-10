// ============================================================
// 共用エリアのインテリア：受付・共有スペース・会議室・休憩スペース・社長室
// 会社レベル（officeLevel）に応じて設備が追加される。
// ============================================================
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Merged } from '@react-three/drei';
import type { InstanceProps } from '@react-three/drei';
import type { FC } from 'react';
import { AREAS, CAFE_TABLES, rectCenter } from './layout';
import { getGeometries, getMaterials } from './materials';
import { Box, Cyl, GlassWall, PendantLine } from './primitives';
import { drawMediaWall, logoTexture, slideTexture } from './textures';
import { CEO_CHAIR } from './placements';
import { ATMOSPHERE } from './atmosphere';
import type { DayPhase } from './atmosphere';

// ---------------- 家具 ----------------

const Sofa = ({ p, rotY = 0, w = 2.2, light = false }: { p: [number, number, number]; rotY?: number; w?: number; light?: boolean }) => {
  const m = getMaterials();
  const mat = light ? m.sofaLight : m.sofa;
  return (
    <group position={p} rotation-y={rotY}>
      <Box s={[w, 0.32, 0.9]} p={[0, 0.22, 0]} m={mat} />
      <Box s={[w - 0.36, 0.14, 0.7]} p={[0, 0.44, -0.06]} m={mat} />
      <Box s={[w, 0.5, 0.2]} p={[0, 0.6, 0.35]} m={mat} />
      <Box s={[0.18, 0.56, 0.9]} p={[-w / 2 + 0.09, 0.36, 0]} m={mat} />
      <Box s={[0.18, 0.56, 0.9]} p={[w / 2 - 0.09, 0.36, 0]} m={mat} />
      <Box s={[w - 0.1, 0.06, 0.8]} p={[0, 0.03, 0]} m={m.metalDark} cast={false} />
    </group>
  );
};

const Armchair = ({ p, rotY = 0 }: { p: [number, number, number]; rotY?: number }) => <Sofa p={p} rotY={rotY} w={0.95} light />;

const CoffeeTable = ({ p, r = 0.55 }: { p: [number, number, number]; r?: number }) => {
  const m = getMaterials();
  return (
    <group position={p}>
      <Cyl s={[r * 2, 0.04, r * 2]} p={[0, 0.42, 0]} m={m.stone} />
      <Cyl s={[0.08, 0.4, 0.08]} p={[0, 0.2, 0]} m={m.metalDark} low />
      <Cyl s={[0.6, 0.02, 0.6]} p={[0, 0.01, 0]} m={m.metalDark} low cast={false} />
    </group>
  );
};

const FloorLamp = ({ p }: { p: [number, number, number] }) => {
  const m = getMaterials();
  return (
    <group position={p}>
      <Cyl s={[0.3, 0.02, 0.3]} p={[0, 0.01, 0]} m={m.metalDark} low />
      <Cyl s={[0.025, 1.5, 0.025]} p={[0, 0.76, 0]} m={m.metalDark} low />
      <mesh geometry={getGeometries().cylinder} material={m.lightWarm} scale={[0.38, 0.3, 0.38]} position={[0, 1.6, 0]} />
    </group>
  );
};

const ScreenPanel = ({ p, rotY, w, h, material }: { p: [number, number, number]; rotY: number; w: number; h: number; material: THREE.Material }) => {
  const m = getMaterials();
  return (
    <group position={p} rotation-y={rotY}>
      <Box s={[w + 0.08, h + 0.08, 0.06]} p={[0, 0, 0]} m={m.monitorBody} />
      <mesh geometry={getGeometries().plane} material={material} position={[0, 0, 0.032]} scale={[w, h, 1]} />
    </group>
  );
};

/** 曲面の受付カウンター（ExtrudeGeometry） */
const arcGeometry = (r0: number, r1: number, a0: number, a1: number, height: number) => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r1, a0, a1, false);
  shape.absarc(0, 0, r0, a1, a0, true);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2);
  return geo;
};

const ReceptionDesk = memo(function ReceptionDesk({ p }: { p: [number, number, number] }) {
  const m = getMaterials();
  const geos = useMemo(() => {
    const a0 = -Math.PI / 2 - 0.95;
    const a1 = -Math.PI / 2 + 0.95;
    return {
      body: arcGeometry(2.25, 2.55, a0, a1, 1.04),
      top: arcGeometry(2.15, 2.72, a0 - 0.03, a1 + 0.03, 0.05),
      work: arcGeometry(1.7, 2.25, a0, a1, 0.04),
      led: arcGeometry(2.56, 2.6, a0, a1, 0.025),
    };
  }, []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  return (
    <group position={p}>
      <mesh geometry={geos.body} material={m.stone} castShadow receiveShadow />
      <mesh geometry={geos.top} material={m.stoneDark} position-y={1.04} castShadow receiveShadow />
      <mesh geometry={geos.work} material={m.deskTop} position-y={0.72} castShadow receiveShadow />
      <mesh geometry={geos.led} material={m.accent} position-y={0.06} />
    </group>
  );
});

// ---------------- 植物（Merged でインスタンス化） ----------------

type PlantKind = 'tall' | 'bush' | 'snake';
interface PlantSpot {
  x: number;
  z: number;
  kind: PlantKind;
  s?: number;
}
type PlantParts = Record<string, FC<InstanceProps>>;

const Plant = ({ P, spot }: { P: PlantParts; spot: PlantSpot }) => {
  const s = spot.s ?? 1;
  return (
    <group position={[spot.x, 0, spot.z]} scale={s} rotation-y={(spot.x * 3.1 + spot.z) % 6.28}>
      {spot.kind === 'bush' ? (
        <>
          <P.PotRound position={[0, 0.3, 0]} />
          <P.LeafA position={[0, 0.72, 0]} scale={[1.1, 0.9, 1.1]} />
          <P.LeafB position={[0.2, 0.62, 0.1]} scale={0.8} />
          <P.LeafA position={[-0.18, 0.6, -0.12]} scale={0.75} />
        </>
      ) : (
        <>
          <P.Pot position={[0, 0.275, 0]} />
          <P.Soil position={[0, 0.54, 0]} />
        </>
      )}
      {spot.kind === 'tall' && (
        <>
          <P.Stem position={[0, 1.05, 0]} />
          <P.LeafA position={[0, 1.75, 0]} scale={[1.1, 1.2, 1.1]} />
          <P.LeafB position={[0.22, 1.4, 0.08]} scale={0.85} />
          <P.LeafA position={[-0.2, 1.2, -0.1]} scale={0.75} />
          <P.LeafB position={[0.05, 2.05, -0.1]} scale={0.7} />
        </>
      )}
      {spot.kind === 'snake' &&
        [0, 1, 2, 3, 4, 5, 6].map((i) => (
          <P.Snake
            key={i}
            position={[Math.cos(i * 0.9) * 0.1, 0.95 + (i % 3) * 0.08, Math.sin(i * 0.9) * 0.1]}
            rotation={[Math.sin(i * 1.7) * 0.18, i, Math.cos(i * 1.3) * 0.18]}
          />
        ))}
    </group>
  );
};

const BASE_PLANTS: PlantSpot[] = [
  { x: -3.6, z: 19.6, kind: 'tall' },
  { x: 3.6, z: 19.6, kind: 'tall' },
  { x: -7.4, z: 9.8, kind: 'snake' },
  { x: 7.4, z: 9.8, kind: 'snake' },
  { x: -29, z: 13.6, kind: 'tall' },
  { x: 28.9, z: 19, kind: 'tall' },
  { x: 29, z: -11.6, kind: 'bush' },
  { x: 22.6, z: -19, kind: 'tall', s: 0.9 },
  { x: -7.5, z: -2, kind: 'bush' },
  { x: 7.5, z: -2, kind: 'bush' },
  { x: -29, z: -19, kind: 'tall' },
  { x: -10.8, z: -19, kind: 'snake' },
  { x: 10.6, z: -19, kind: 'snake' },
  { x: -29, z: -2, kind: 'bush' },
  { x: 29, z: -2, kind: 'bush' },
];

const GREEN_PLANTS: PlantSpot[] = [
  { x: -10, z: 2, kind: 'tall' },
  { x: 10, z: 2, kind: 'tall' },
  { x: -10, z: -12, kind: 'snake' },
  { x: 10, z: -12, kind: 'snake' },
  { x: -12, z: 12, kind: 'bush' },
  { x: 12, z: 12, kind: 'bush' },
  { x: -13.4, z: 18.8, kind: 'snake' },
  { x: 13.4, z: 18.8, kind: 'snake' },
  { x: -29, z: 10, kind: 'tall' },
  { x: 29, z: 10, kind: 'tall' },
  { x: -20, z: -4, kind: 'bush', s: 0.8 },
  { x: 20, z: -4, kind: 'bush', s: 0.8 },
  { x: 0, z: -4.2, kind: 'snake' },
];

const Greenery = memo(function Greenery({ level }: { level: number }) {
  const meshes = useMemo(() => {
    const g = getGeometries();
    const m = getMaterials();
    return {
      Pot: new THREE.Mesh(g.potLarge, m.pot),
      PotRound: new THREE.Mesh(g.potRound, m.potDark),
      Soil: new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16), m.soil),
      Stem: new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.1, 6), m.stem),
      LeafA: new THREE.Mesh(g.leafBlob, m.leaf),
      LeafB: new THREE.Mesh(g.leafBlob.clone(), m.leafLight),
      Snake: new THREE.Mesh(g.snakeLeaf, m.leaf),
    };
  }, []);
  useEffect(
    () => () => {
      meshes.Soil.geometry.dispose();
      meshes.Stem.geometry.dispose();
      meshes.LeafB.geometry.dispose();
    },
    [meshes],
  );
  const spots = level >= 2 ? [...BASE_PLANTS, ...GREEN_PLANTS] : BASE_PLANTS;
  return (
    <Merged meshes={meshes} limit={400} frames={3} castShadow receiveShadow frustumCulled={false}>
      {(P: PlantParts) => (
        <>
          {spots.map((s) => (
            <Plant key={`${s.x}:${s.z}`} P={P} spot={s} />
          ))}
        </>
      )}
    </Merged>
  );
});

// ---------------- エリア ----------------

const Reception = memo(function Reception({ companyName, level, stats }: { companyName: string; level: number; stats: MediaStats }) {
  const m = getMaterials();
  const logoMat = useMemo(() => new THREE.MeshBasicMaterial({ map: logoTexture(companyName), toneMapped: false }), [companyName]);
  useEffect(
    () => () => {
      logoMat.map?.dispose();
      logoMat.dispose();
    },
    [logoMat],
  );
  return (
    <group>
      {/* ロゴウォール */}
      <Box s={[10, 3.2, 0.3]} p={[0, 1.6, 9.2]} m={m.wallPanel} />
      <mesh geometry={getGeometries().plane} material={logoMat} position={[0, 1.85, 9.36]} scale={[6.0, 2.4, 1]} />
      <mesh geometry={getGeometries().box} material={m.lightWarm} scale={[9.6, 0.025, 0.04]} position={[0, 3.12, 9.38]} />
      <mesh geometry={getGeometries().box} material={m.accentSoft} scale={[9.6, 0.02, 0.02]} position={[0, 0.08, 9.37]} />
      <ReceptionDesk p={[0, 0, 12.2]} />
      {/* 受付スタッフ用PC */}
      {[-0.7, 0.7].map((x) => (
        <group key={x} position={[x, 0.76, 13.95]} rotation-y={x * 0.3}>
          <Box s={[0.5, 0.3, 0.025]} p={[0, 0.3, 0]} m={m.monitorBody} />
          <Box s={[0.03, 0.15, 0.03]} p={[0, 0.08, -0.03]} m={m.silver} />
        </group>
      ))}
      {/* 待合ソファ */}
      <Sofa p={[-5.6, 0, 15.2]} rotY={-Math.PI / 2} w={2.6} />
      <Sofa p={[5.6, 0, 15.2]} rotY={Math.PI / 2} w={2.6} />
      <CoffeeTable p={[-4.4, 0, 15.2]} r={0.45} />
      <CoffeeTable p={[4.4, 0, 15.2]} r={0.45} />
      <FloorLamp p={[-6.3, 0, 17.4]} />
      <FloorLamp p={[6.3, 0, 17.4]} />
      {/* 天井照明：リング型ペンダント */}
      <mesh material={m.lightPanel} position={[0, 3.05, 14.6]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.7, 0.04, 8, 64]} />
      </mesh>
      {/* 受付エリアの石張り床 */}
      <Box s={[16, 0.02, 11.3]} p={[0, 0.008, 14.15]} m={m.floorStone} cast={false} />
      {level >= 4 && <MediaWall stats={stats} />}
    </group>
  );
});

export interface MediaStats {
  present: number;
  total: number;
  done: number;
  tasks: number;
  level: number;
  companyName: string;
}

const MediaWall = ({ stats }: { stats: MediaStats }) => {
  const { canvas, material } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 320;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, material: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) };
  }, []);
  useEffect(() => {
    drawMediaWall(canvas, stats);
    material.map!.needsUpdate = true;
  }, [canvas, material, stats]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  return (
    <>
      <ScreenPanel p={[-7.7, 1.75, 14.2]} rotY={Math.PI / 2} w={5.2} h={1.62} material={material} />
      <ScreenPanel p={[7.7, 1.75, 14.2]} rotY={-Math.PI / 2} w={5.2} h={1.62} material={material} />
    </>
  );
};

const Lounge = memo(function Lounge({ level }: { level: number }) {
  const m = getMaterials();
  const [cx, cz] = rectCenter(AREAS.lounge);
  return (
    <group>
      {/* 木質フローリング */}
      <Box s={[16, 0.02, 7.5]} p={[cx, 0.008, cz]} m={m.floorWood} cast={false} />
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.02, cz]} receiveShadow material={m.rug}>
        <circleGeometry args={[3.1, 48]} />
      </mesh>
      <Sofa p={[cx - 2.3, 0, cz]} rotY={-Math.PI / 2} w={2.6} />
      <Sofa p={[cx + 2.3, 0, cz]} rotY={Math.PI / 2} w={2.6} />
      <Armchair p={[cx, 0, cz - 2.1]} rotY={Math.PI} />
      <CoffeeTable p={[cx, 0, cz]} r={0.7} />
      <FloorLamp p={[cx - 3.6, 0, cz - 2.2]} />
      {/* ブックシェルフ */}
      <group position={[cx + 5.6, 0, cz - 2.0]}>
        <Box s={[2.2, 1.6, 0.4]} p={[0, 0.8, 0]} m={m.woodDark} />
        {[0.45, 0.95, 1.4].map((y) => (
          <Box key={y} s={[2.1, 0.03, 0.36]} p={[0, y, 0.03]} m={m.wood} />
        ))}
      </group>
      {/* スタンディングテーブル（Lv5ではシンボルツリーに置き換え） */}
      {level < 5 && <group position={[cx - 5.4, 0, cz - 1.6]}>
        <Box s={[1.8, 0.05, 0.7]} p={[0, 1.05, 0]} m={m.stone} />
        <Box s={[0.08, 1.02, 0.5]} p={[-0.7, 0.51, 0]} m={m.metalDark} />
        <Box s={[0.08, 1.02, 0.5]} p={[0.7, 0.51, 0]} m={m.metalDark} />
      </group>}
      <PendantLine p={[cx, 2.9, cz]} length={4} warm />
      {level >= 5 && <AtriumTree x={cx - 5.2} z={cz - 1.2} />}
      {level >= 5 && <ArtWall />}
    </group>
  );
});

const AtriumTree = ({ x, z }: { x: number; z: number }) => {
  const m = getMaterials();
  const g = getGeometries();
  const canopy: [number, number, number, number][] = [
    [0, 3.0, 0, 1.6],
    [0.7, 2.6, 0.4, 1.1],
    [-0.6, 2.7, -0.3, 1.2],
    [0.2, 2.4, -0.7, 1.0],
    [-0.3, 3.4, 0.4, 0.9],
  ];
  return (
    <group position={[x, 0, z]}>
      <Cyl s={[2.4, 0.45, 2.4]} p={[0, 0.225, 0]} m={m.wood} />
      <Cyl s={[2.2, 0.02, 2.2]} p={[0, 0.46, 0]} m={m.soil} cast={false} />
      <Cyl s={[0.18, 2.4, 0.18]} p={[0, 1.6, 0]} m={m.stem} low />
      {canopy.map(([cx, cy, cz, s], i) => (
        <mesh key={i} geometry={g.leafBlob} material={i % 2 ? m.leafLight : m.leaf} position={[cx, cy, cz]} scale={s * 1.6} castShadow />
      ))}
    </group>
  );
};

const ArtWall = () => {
  const m = getMaterials();
  const arts = useMemo(
    () =>
      ['#b59cff', '#38d6e8', '#f2b45a'].map(
        (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }),
      ),
    [],
  );
  useEffect(() => () => arts.forEach((a) => a.dispose()), [arts]);
  return (
    <group position={[0, 0, 9.02]} rotation-y={Math.PI}>
      {arts.map((a, i) => (
        <group key={i} position={[(i - 1) * 2.6, 1.8, 0]}>
          <Box s={[1.9, 1.3, 0.05]} p={[0, 0, 0]} m={m.frame} />
          <Box s={[1.7, 1.1, 0.02]} p={[0, 0, 0.03]} m={m.paper} />
          <Box s={[0.9 - i * 0.15, 0.6 + i * 0.1, 0.01]} p={[(i - 1) * 0.2, 0.05, 0.045]} m={a} />
        </group>
      ))}
    </group>
  );
};

const MeetingRoom = memo(function MeetingRoom() {
  const m = getMaterials();
  const r = AREAS.meeting;
  const [cx, cz] = rectCenter(r);
  const slide = useMemo(() => new THREE.MeshBasicMaterial({ map: slideTexture(), toneMapped: false }), []);
  useEffect(() => () => slide.dispose(), [slide]);
  return (
    <group>
      {/* カーペット */}
      <Box s={[r.x1 - r.x0, 0.02, r.z1 - r.z0]} p={[cx, 0.01, cz]} m={m.rug} cast={false} />
      <GlassWall from={[r.x0 + 0.2, r.z0]} to={[r.x1, r.z0]} height={3.3} band />
      <GlassWall from={[r.x1, r.z0]} to={[r.x1, r.z1 - 0.2]} height={3.3} band gaps={[[0.3, 1.7]]} />
      {/* 会議テーブル */}
      <group position={[cx, 0, cz]}>
        <Box s={[7.4, 0.06, 2.0]} p={[0, 0.74, 0]} m={m.woodDark} />
        <Box s={[0.5, 0.71, 1.1]} p={[-2.4, 0.355, 0]} m={m.metalDark} />
        <Box s={[0.5, 0.71, 1.1]} p={[2.4, 0.355, 0]} m={m.metalDark} />
        {[-2.2, 0, 2.2].map((x) => (
          <Box key={x} s={[0.3, 0.012, 0.12]} p={[x, 0.776, 0]} m={m.metalDark} />
        ))}
      </group>
      <ScreenPanel p={[r.x0 + 0.45, 1.65, cz]} rotY={Math.PI / 2} w={3.0} h={1.69} material={slide} />
      <PendantLine p={[cx, 2.6, cz]} length={5.6} warm />
    </group>
  );
});

const Cafe = memo(function Cafe({ level }: { level: number }) {
  const m = getMaterials();
  const r = AREAS.cafe;
  const [cx, cz] = rectCenter(r);
  return (
    <group>
      <Box s={[r.x1 - r.x0, 0.02, r.z1 - r.z0]} p={[cx, 0.01, cz]} m={m.deskTopDark} cast={false} />
      <GlassWall from={[r.x0, r.z1 - 0.2]} to={[r.x0, r.z0]} gaps={[[4.2, 6.2]]} />
      {/* ハイテーブル */}
      {CAFE_TABLES.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl s={[0.95, 0.04, 0.95]} p={[0, 1.05, 0]} m={m.stone} />
          <Cyl s={[0.07, 1.02, 0.07]} p={[0, 0.52, 0]} m={m.metalDark} low />
          <Cyl s={[0.5, 0.03, 0.5]} p={[0, 0.015, 0]} m={m.metalDark} low cast={false} />
        </group>
      ))}
      {/* テーブルの上のカップ・ランチプレート */}
      {CAFE_TABLES.map(([x, z], i) => (
        <group key={`cup${x}`} position={[x, 1.07, z]}>
          <Cyl s={[0.07, 0.09, 0.07]} p={[0.15, 0.045, -0.1]} m={m.ceramic} />
          {i !== 1 && <Cyl s={[0.07, 0.09, 0.07]} p={[-0.18, 0.045, 0.05]} m={m.ceramic} />}
        </group>
      ))}
      {[cx - 0.6, cx + 2.6].map((x) => (
        <group key={`plate${x}`} position={[x, 0.44, r.z1 - 1.8]}>
          <Cyl s={[0.26, 0.015, 0.26]} p={[-0.08, 0.01, 0]} m={m.ceramic} />
          <mesh geometry={getGeometries().sphere} material={m.wood} scale={[0.12, 0.06, 0.1]} position={[-0.08, 0.04, 0]} />
          <Cyl s={[0.07, 0.09, 0.07]} p={[0.18, 0.045, 0.05]} m={m.ceramic} />
        </group>
      ))}
      {/* ベンチソファ（窓際） */}
      <Sofa p={[cx + 1, 0, r.z1 - 0.75]} rotY={0} w={6} />
      <CoffeeTable p={[cx - 0.6, 0, r.z1 - 1.8]} r={0.4} />
      <CoffeeTable p={[cx + 2.6, 0, r.z1 - 1.8]} r={0.4} />
      {/* 自販機・冷蔵庫 */}
      {[0, 1].map((i) => (
        <group key={i} position={[r.x1 - 0.6, 0, r.z0 + 0.9 + i * 1.05]} rotation-y={-Math.PI / 2}>
          <Box s={[0.95, 1.9, 0.7]} p={[0, 0.95, 0]} m={m.monitorBody} />
          <mesh geometry={getGeometries().box} material={m.lightPanel} scale={[0.75, 1.2, 0.01]} position={[0, 1.2, -0.355]} />
        </group>
      ))}
      {level >= 3 && <CoffeeBar x={cx - 3} z={r.z0 + 0.8} />}
    </group>
  );
});

const CoffeeBar = ({ x, z }: { x: number; z: number }) => {
  const m = getMaterials();
  return (
    <group position={[x, 0, z]}>
      <Box s={[6, 1.0, 0.75]} p={[0, 0.5, 0]} m={m.wood} />
      <Box s={[6.1, 0.05, 0.85]} p={[0, 1.02, 0]} m={m.stone} />
      <mesh geometry={getGeometries().box} material={m.lightWarm} scale={[5.8, 0.02, 0.02]} position={[0, 0.06, 0.39]} />
      {/* コーヒーマシン */}
      <group position={[-1.8, 1.05, -0.05]}>
        <Box s={[0.55, 0.48, 0.42]} p={[0, 0.24, 0]} m={m.silver} />
        <Box s={[0.45, 0.2, 0.02]} p={[0, 0.32, 0.22]} m={m.monitorBody} />
      </group>
      {/* ショーケース */}
      <group position={[0.8, 1.05, 0]}>
        <mesh geometry={getGeometries().box} material={m.glass} scale={[1.4, 0.45, 0.6]} position={[0, 0.225, 0]} />
        <Box s={[1.4, 0.04, 0.6]} p={[0, 0.02, 0]} m={m.metalDark} />
      </group>
      {/* ペンダント照明 */}
      {[-2, 0, 2].map((px) => (
        <group key={px} position={[px, 0, 0.1]}>
          <Box s={[0.006, 1.2, 0.006]} p={[0, 3.0, 0]} m={m.cable} cast={false} receive={false} />
          <mesh geometry={getGeometries().sphere} material={m.lightWarm} scale={0.32} position={[0, 2.35, 0]} />
        </group>
      ))}
    </group>
  );
};

const CeoOffice = memo(function CeoOffice() {
  const m = getMaterials();
  const r = AREAS.ceo;
  const [cx, cz] = rectCenter(r);
  const books = useMemo(() => {
    const list: { x: number; y: number; w: number; h: number; mat: THREE.Material }[] = [];
    const mats = [m.paper, m.metalDark, m.wood, m.fabricPanel];
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const y of [0.55, 1.15, 1.75]) {
      let x = -1.8;
      while (x < 1.7) {
        const w = 0.05 + rnd() * 0.05;
        const h = 0.24 + rnd() * 0.14;
        if (rnd() > 0.15) list.push({ x, y: y + h / 2, w, h, mat: mats[Math.floor(rnd() * mats.length)] });
        x += w + 0.01;
      }
    }
    return list;
  }, [m]);
  return (
    <group>
      <Box s={[r.x1 - r.x0, 0.02, r.z1 - r.z0]} p={[cx, 0.012, cz]} m={m.woodDark} cast={false} />
      <GlassWall from={[r.x0, r.z0 + 0.2]} to={[r.x0, r.z1]} height={3.3} band />
      <GlassWall from={[r.x0, r.z1]} to={[r.x1 - 0.2, r.z1]} height={3.3} band gaps={[[0.4, 1.8]]} />
      {/* エグゼクティブデスク */}
      <group position={[CEO_CHAIR.x, 0, CEO_CHAIR.z + 0.72]}>
        <Box s={[2.2, 0.06, 0.95]} p={[0, 0.75, 0]} m={m.woodDark} />
        <Box s={[0.06, 0.72, 0.9]} p={[-1.05, 0.36, 0]} m={m.woodDark} />
        <Box s={[0.06, 0.72, 0.9]} p={[1.05, 0.36, 0]} m={m.woodDark} />
        <Box s={[2.0, 0.5, 0.04]} p={[0, 0.45, 0.42]} m={m.woodDark} />
        <group position={[0, 0.78, -0.15]}>
          <Box s={[0.7, 0.42, 0.03]} p={[0, 0.32, 0]} m={m.monitorBody} />
          <Box s={[0.04, 0.12, 0.04]} p={[0, 0.06, 0.03]} m={m.silver} />
        </group>
      </group>
      {/* 本棚 */}
      <group position={[cx, 0, r.z0 + 0.35]}>
        <Box s={[4, 2.3, 0.4]} p={[0, 1.15, 0]} m={m.woodDark} />
        {books.map((b, i) => (
          <Box key={i} s={[b.w, b.h, 0.26]} p={[b.x, b.y, 0.09]} m={b.mat} cast={false} />
        ))}
      </group>
      {/* 応接セット */}
      <Sofa p={[cx + 0.4, 0, r.z1 - 1.3]} rotY={Math.PI} w={2.4} light />
      <CoffeeTable p={[cx + 0.4, 0, r.z1 - 2.5]} r={0.5} />
    </group>
  );
});

// ---------------- 照明 ----------------

/** 部屋ごとの実光源（影なし）。高品質モードのみ追加光源を増やす */
const AreaLights = memo(function AreaLights({ quality, phase }: { quality: 'high' | 'low'; phase: DayPhase }) {
  const atmos = ATMOSPHERE[phase];
  const points: [number, number, number, number, string][] = [
    [-20, 3.2, -12, 45, '#f2f6ff'],
    [0, 3.2, -12, 45, '#f2f6ff'],
    [16, 3.2, -12, 40, '#f2f6ff'],
    [-20, 3.2, 4, 45, '#f2f6ff'],
    [20, 3.2, 4, 45, '#f2f6ff'],
    [0, 3.0, 14, 40, '#fff3e0'],
    [0, 3.0, 1, 30, '#ffe9cc'],
    [-21.7, 2.8, 16.2, 28, '#fff1dc'],
    [21.7, 2.8, 16.2, 28, '#ffe9cc'],
    [25.8, 2.8, -15, 24, '#fff1dc'],
  ];
  const list = quality === 'high' ? points : points.slice(0, 6);
  return (
    <>
      {list.map(([x, y, z, intensity, color]) => (
        <pointLight key={`${x}:${z}`} position={[x, y, z]} intensity={intensity * atmos.interiorBoost} distance={18} decay={1.5} color={phase === 'night' || phase === 'evening' ? atmos.interior : color} />
      ))}
    </>
  );
});

// ---------------- まとめ ----------------

export const Interior = ({
  officeLevel,
  quality,
  companyName,
  stats,
  phase,
}: {
  officeLevel: number;
  quality: 'high' | 'low';
  companyName: string;
  stats: MediaStats;
  phase: DayPhase;
}) => {
  return (
    <group>
      <Reception companyName={companyName} level={officeLevel} stats={stats} />
      <Lounge level={officeLevel} />
      <MeetingRoom />
      <Cafe level={officeLevel} />
      <CeoOffice />
      <Greenery level={officeLevel} />
      <AreaLights quality={quality} phase={phase} />
    </group>
  );
};
