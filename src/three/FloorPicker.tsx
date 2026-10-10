// ============================================================
// 床のタップ操作
// ・ダブルタップ（ダブルクリック）：その地点へカメラ移動してズーム
// ・休憩スペースなど共用エリアの床をシングルタップ：エリア全体が見える距離へズーム
// ドラッグ（視点操作）の終わりに誤反応しないよう、移動量の小さいタップだけを扱う。
// ============================================================
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useUi } from '../store/uiStore';
import { AREAS, BUILDING } from './layout';

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 36;
const TAP_MAX_MOVE = 8;

const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

const areaAt = (x: number, z: number) =>
  (Object.keys(AREAS) as (keyof typeof AREAS)[]).find((k) => {
    const r = AREAS[k];
    return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  });

export const FloorPicker = () => {
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_MAX_MOVE) return; // ドラッグ操作の終わり
    const now = performance.now();
    const { clientX, clientY } = e.nativeEvent;
    const { x, z } = e.point;
    const prev = last.current;
    const isDouble = prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(clientX - prev.x, clientY - prev.y) < DOUBLE_TAP_PX;

    if (isDouble) {
      // ダブルタップ：シングルタップ処理を取り消してその地点へ
      if (pending.current) clearTimeout(pending.current);
      pending.current = null;
      last.current = null;
      useUi.getState().cameraTo({ kind: 'point', x, z });
      return;
    }

    last.current = { t: now, x: clientX, y: clientY };
    const area = areaAt(x, z);
    if (!area) return;
    // シングルタップは少し待ってから（ダブルタップの可能性があるため）
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      pending.current = null;
      useUi.getState().cameraTo({ kind: 'area', area });
    }, DOUBLE_TAP_MS);
  };

  const w = BUILDING.x1 - BUILDING.x0;
  const d = BUILDING.z1 - BUILDING.z0;
  return (
    <mesh
      material={pickMat}
      rotation-x={-Math.PI / 2}
      position={[(BUILDING.x0 + BUILDING.x1) / 2, 0.06, (BUILDING.z0 + BUILDING.z1) / 2]}
      onClick={onClick}
    >
      <planeGeometry args={[w, d]} />
    </mesh>
  );
};
