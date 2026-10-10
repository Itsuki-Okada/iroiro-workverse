// ============================================================
// 部署エリア：床・パーティション・サイン・選択時のハイライト
// ============================================================
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Label3D } from './Label3D';
import type { Department } from '../types';
import { useUi } from '../store/uiStore';
import { AREA_LABELS, rectCenter, rectSize, ZONE_BY_ID } from './layout';
import type { DeskInfo } from './placements';
import { getGeometries, getMaterials } from './materials';
import { Box, Cyl, GlassWall, PendantLine } from './primitives';
import { carpetTexture, makeFloorLabelTexture, makeSignTexture } from './textures';

/** 部署エリアの備品：収納キャビネット・複合機・ホワイトボード */
const ZoneFurniture = memo(function ZoneFurniture({ zoneId, accent }: { zoneId: string; accent: string }) {
  const m = getMaterials();
  const zone = ZONE_BY_ID[zoneId];
  const { x0, x1, z0, z1 } = zone.rect;
  const [cx, cz] = rectCenter(zone.rect);
  const isBack = z0 < -15;
  const isLeft = cx < 0;
  const marker = useMemo(() => new THREE.MeshBasicMaterial({ color: accent }), [accent]);
  useEffect(() => () => marker.dispose(), [marker]);

  // 収納キャビネット
  const credenza = isBack
    ? { x: (x0 + 1 + (zoneId === 'zone-admin' ? 21.4 : x1 - 1)) / 2, z: z0 + 0.3, len: (zoneId === 'zone-admin' ? 21.4 : x1 - 1) - (x0 + 1), rot: 0 }
    : { x: isLeft ? x0 + 0.3 : x1 - 0.3, z: cz, len: z1 - z0 - 2.5, rot: Math.PI / 2 };
  const printer = isBack ? { x: x1 - 1.0, z: z1 - 0.9, rot: Math.PI } : { x: isLeft ? x1 - 1.0 : x0 + 1.0, z: z0 + 0.9, rot: 0 };
  const board = isBack ? { x: x0 + 0.7, z: cz, rot: Math.PI / 2 } : { x: cx + (isLeft ? -3 : 3), z: z0 + 0.6, rot: 0 };
  const binders = Array.from({ length: Math.floor(credenza.len / 1.4) }, (_, i) => -credenza.len / 2 + 0.6 + i * 1.4);

  return (
    <group>
      <group position={[credenza.x, 0, credenza.z]} rotation-y={credenza.rot}>
        <Box s={[credenza.len, 0.7, 0.45]} p={[0, 0.37, 0]} m={m.cabinet} />
        <Box s={[credenza.len + 0.04, 0.03, 0.48]} p={[0, 0.735, 0]} m={m.wood} />
        <Box s={[credenza.len, 0.04, 0.4]} p={[0, 0.02, 0]} m={m.metalDark} cast={false} />
        {binders.map((x, i) => (
          <group key={x} position={[x, 0.75, 0]}>
            {i % 3 === 1 ? (
              <>
                <Cyl s={[0.16, 0.16, 0.16]} p={[0, 0.08, 0]} m={m.pot} />
                <mesh geometry={getGeometries().leafBlob} material={m.leafLight} position={[0, 0.26, 0]} scale={0.45} castShadow />
              </>
            ) : (
              [0, 1, 2, 3].map((k) => <Box key={k} s={[0.06, 0.3, 0.24]} p={[k * 0.07, 0.15, 0]} m={k % 2 ? m.metalDark : m.fabricPanel} />)
            )}
          </group>
        ))}
      </group>
      {/* 複合機 */}
      <group position={[printer.x, 0, printer.z]} rotation-y={printer.rot}>
        <Box s={[0.62, 0.95, 0.55]} p={[0, 0.475, 0]} m={m.cabinet} />
        <Box s={[0.58, 0.12, 0.45]} p={[0, 1.01, -0.02]} m={m.monitorBody} />
        <Box s={[0.22, 0.02, 0.14]} p={[0.15, 1.08, 0.14]} m={m.accentSoft} cast={false} />
      </group>
      {/* キャスター付きホワイトボード */}
      <group position={[board.x, 0, board.z]} rotation-y={board.rot}>
        <Box s={[1.8, 1.05, 0.03]} p={[0, 1.35, 0]} m={m.whiteboard} />
        <Box s={[1.86, 0.04, 0.05]} p={[0, 0.81, 0]} m={m.silver} />
        <Box s={[0.04, 1.85, 0.04]} p={[-0.92, 0.93, 0]} m={m.silver} />
        <Box s={[0.04, 1.85, 0.04]} p={[0.92, 0.93, 0]} m={m.silver} />
        <Box s={[0.08, 0.03, 0.6]} p={[-0.92, 0.03, 0]} m={m.metalDark} />
        <Box s={[0.08, 0.03, 0.6]} p={[0.92, 0.03, 0]} m={m.metalDark} />
        {[0.35, 0.2, 0.05, -0.1].map((y, i) => (
          <mesh key={y} geometry={getGeometries().box} material={i === 0 ? marker : m.monitorBody} scale={[0.9 - i * 0.18, 0.025, 0.005]} position={[-0.3 + i * 0.05, 1.35 + y, 0.02]} />
        ))}
        <mesh geometry={getGeometries().box} material={marker} scale={[0.3, 0.3, 0.005]} position={[0.55, 1.45, 0.02]} />
      </group>
    </group>
  );
});

const DeptZone = memo(function DeptZone({
  dept,
  present,
  total,
}: {
  dept: Department;
  present: number;
  total: number;
}) {
  const zone = ZONE_BY_ID[dept.zoneId];
  const selected = useUi((s) => s.selectedDepartmentId === dept.id);
  const selectDepartment = useUi((s) => s.selectDepartment);
  const overlay = useRef<THREE.Mesh>(null!);
  const g = getGeometries();
  const m = getMaterials();

  const [cx, cz] = rectCenter(zone.rect);
  const [w, d] = rectSize(zone.rect);

  const mats = useMemo(() => {
    const tex = carpetTexture().clone();
    tex.repeat.set(w / 2, d / 2);
    tex.needsUpdate = true;
    return {
      carpet: new THREE.MeshStandardMaterial({ color: zone.floorTone, map: tex, roughness: 0.95 }),
      inlay: new THREE.MeshStandardMaterial({ color: dept.color, emissive: dept.color, emissiveIntensity: 0.25 }),
      overlay: new THREE.MeshBasicMaterial({ color: dept.color, transparent: true, opacity: 0, depthWrite: false }),
      sign: new THREE.MeshBasicMaterial({ map: makeSignTexture(dept.name, dept.nameEn, dept.color), toneMapped: false }),
    };
  }, [dept.color, dept.name, dept.nameEn, zone.floorTone, w, d]);

  useEffect(
    () => () => {
      mats.carpet.map?.dispose();
      mats.sign.map?.dispose();
      Object.values(mats).forEach((x) => x.dispose());
    },
    [mats],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const target = selected ? 0.07 + Math.sin(t * 2.2) * 0.03 : 0;
    mats.overlay.opacity += (target - mats.overlay.opacity) * 0.12;
    overlay.current.visible = mats.overlay.opacity > 0.003;
    const ei = selected ? 1.4 : 0.25;
    mats.inlay.emissiveIntensity += (ei - mats.inlay.emissiveIntensity) * 0.12;
  });

  const { x0, x1, z0, z1 } = zone.rect;
  const isBack = z0 < -15;
  const isLeft = cx < 0;
  const signZ = isBack ? z1 - 0.9 : z1 - 0.9;

  return (
    <group>
      {/* カーペット */}
      <mesh geometry={g.box} material={mats.carpet} scale={[w, 0.02, d]} position={[cx, 0.01, cz]} receiveShadow />
      {/* 縁取り（部署カラーのインレイ） */}
      <mesh geometry={g.box} material={mats.inlay} scale={[w, 0.022, 0.05]} position={[cx, 0.012, z1]} />
      <mesh geometry={g.box} material={mats.inlay} scale={[w, 0.022, 0.05]} position={[cx, 0.012, z0]} />
      <mesh geometry={g.box} material={mats.inlay} scale={[0.05, 0.022, d]} position={[x0, 0.012, cz]} />
      <mesh geometry={g.box} material={mats.inlay} scale={[0.05, 0.022, d]} position={[x1, 0.012, cz]} />
      {/* 選択時のハイライト */}
      <mesh
        ref={overlay}
        geometry={g.plane}
        material={mats.overlay}
        rotation-x={-Math.PI / 2}
        scale={[w, d, 1]}
        position={[cx, 0.03, cz]}
      />

      <ZoneFurniture zoneId={dept.zoneId} accent={dept.color} />

      {/* 低いガラスパーティション（開口部付き） */}
      {isBack ? (
        <GlassWall from={[x0 + 0.3, z1]} to={[x1 - 0.3, z1]} gaps={[[w / 2 - 1.6, w / 2 + 1.6]]} />
      ) : (
        <>
          <GlassWall from={[x0 + 0.3, z0]} to={[x1 - 0.3, z0]} gaps={[[w / 2 - 1.6, w / 2 + 1.6]]} />
          <GlassWall from={[x0 + 0.3, z1]} to={[x1 - 0.3, z1]} gaps={[[w / 2 - 1.6, w / 2 + 1.6]]} />
          <GlassWall
            from={isLeft ? [x1, z0 + 0.3] : [x0, z0 + 0.3]}
            to={isLeft ? [x1, z1 - 0.3] : [x0, z1 - 0.3]}
            gaps={[[d / 2 - 1.4, d / 2 + 1.4]]}
          />
        </>
      )}

      {/* 吊り下げサイン（正面・背面） */}
      <group position={[cx, 2.75, signZ]}>
        <Box s={[3.7, 0.86, 0.06]} p={[0, 0, 0]} m={m.monitorBody} receive={false} />
        <mesh geometry={g.plane} material={mats.sign} position={[0, 0, 0.032]} scale={[3.6, 0.9 * 0.86, 1]} />
        <mesh geometry={g.plane} material={mats.sign} position={[0, 0, -0.032]} rotation-y={Math.PI} scale={[3.6, 0.9 * 0.86, 1]} />
        <Box s={[0.008, 0.5, 0.008]} p={[-1.5, 0.68, 0]} m={m.cable} cast={false} receive={false} />
        <Box s={[0.008, 0.5, 0.008]} p={[1.5, 0.68, 0]} m={m.cable} cast={false} receive={false} />
      </group>
      {/* 奥壁の大型ウォールサイン */}
      {isBack && (
        <mesh geometry={g.plane} material={mats.sign} position={[cx, 2.3, z0 + 0.06]} scale={[5.2, 1.3, 1]} />
      )}

      {/* 画面上でも読める部署ラベル */}
      <Label3D position={[cx, 3.9, cz]} zIndex={10}>
        <button
          onClick={() => selectDepartment(dept.id)}
          className={`pointer-events-auto whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-md transition ${
            selected ? 'border-cyan-300/70 bg-cyan-400/20 text-white' : 'border-white/10 bg-zinc-900/70 text-zinc-200 hover:border-white/30'
          }`}
        >
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: dept.color }} />
          {dept.name}
          <span className="ml-2 text-zinc-400">
            {present}/{total}
          </span>
        </button>
      </Label3D>
    </group>
  );
});

const AreaLabel = memo(function AreaLabel({ areaKey, name, nameEn, x, z, w }: { areaKey: string; name: string; nameEn: string; x: number; z: number; w: number }) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: makeFloorLabelTexture(nameEn), transparent: true, depthWrite: false, opacity: 0.6 }),
    [nameEn],
  );
  useEffect(
    () => () => {
      mat.map?.dispose();
      mat.dispose();
    },
    [mat],
  );
  const lw = Math.min(w * 0.8, 7);
  return (
    <group>
      <mesh geometry={getGeometries().plane} material={mat} rotation-x={-Math.PI / 2} position={[x, 0.025, z]} scale={[lw, lw * 0.156, 1]} />
      <Label3D position={[x, 2.2, z]} zIndex={5}>
        <button
          onClick={() => useUi.getState().cameraTo({ kind: 'area', area: areaKey })}
          className="pointer-events-auto whitespace-nowrap rounded-full border border-white/10 bg-zinc-900/65 px-2.5 py-0.5 text-[10px] text-zinc-300 backdrop-blur transition hover:border-white/30 hover:text-white"
        >
          {name}
        </button>
      </Label3D>
    </group>
  );
});

/** デスク島の上に吊るすライン照明 */
const DeskLights = memo(function DeskLights({ desks }: { desks: DeskInfo[] }) {
  const lights = useMemo(
    () =>
      desks
        .filter((d) => Number(d.key.split('-').pop()) % 4 === 0)
        .map((d) => ({ key: d.key, x: d.x + 0.8, z: d.z - 0.4 })),
    [desks],
  );
  return (
    <>
      {lights.map((l) => (
        <PendantLine key={l.key} p={[l.x, 2.95, l.z]} length={3.0} />
      ))}
    </>
  );
});

export const Zones = ({
  departments,
  counts,
  desks,
}: {
  departments: Department[];
  counts: Record<string, { present: number; total: number }>;
  desks: DeskInfo[];
}) => (
  <group>
    {departments
      .filter((d) => ZONE_BY_ID[d.zoneId])
      .map((d) => (
        <DeptZone key={d.id} dept={d} present={counts[d.id]?.present ?? 0} total={counts[d.id]?.total ?? 0} />
      ))}
    {AREA_LABELS.map((a) => {
      const [x, z] = rectCenter(a.rect);
      const [w, d] = rectSize(a.rect);
      // ラベルは床の手前寄りに配置（家具と重ならないように）
      const lz = a.key === 'reception' ? a.rect.z1 - 2.2 : a.key === 'lounge' ? a.rect.z1 - 0.8 : z + d / 2 - 0.9;
      return <AreaLabel key={a.key} areaKey={a.key} name={a.name} nameEn={a.nameEn} x={x} z={lz} w={w} />;
    })}
    <DeskLights desks={desks} />
  </group>
);
