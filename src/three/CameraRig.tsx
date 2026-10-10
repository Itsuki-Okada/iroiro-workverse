// ============================================================
// カメラ制御（camera-controls）
// ドラッグ回転 / ホイールズーム / 右ドラッグ・2本指でパン
// 部署・社員へのフォーカス移動と、操作しやすい可動範囲の制限を行う。
// ============================================================
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useUi } from '../store/uiStore';
import type { CameraCommand } from '../store/uiStore';
import { useApp } from '../store/appStore';
import { AREAS, BUILDING, DEFAULT_CAMERA, rectCenter, rectSize } from './layout';
import { departmentRect } from './placements';
import { isMobileNow } from '../ui/hooks';
import type { AvatarPlacement } from './placements';

const BOUNDS = new THREE.Box3(
  new THREE.Vector3(BUILDING.x0 + 2, -4, BUILDING.z0 + 2),
  new THREE.Vector3(BUILDING.x1 - 2, 3, BUILDING.z1 - 1),
);

/** 縦長のスマホ画面では建物全体が収まるよう引きで見る */
const setOverview = (c: CameraControls, smooth: boolean) => {
  const k = isMobileNow() ? 2.0 : 1;
  const [px, py, pz] = DEFAULT_CAMERA.position;
  const [tx, ty, tz] = DEFAULT_CAMERA.target;
  c.setLookAt(tx + (px - tx) * k, ty + (py - ty) * k, tz + (pz - tz) * k, tx, ty, tz, smooth);
};

export const CameraRig = ({
  placements,
  homeSeats,
}: {
  placements: Record<string, AvatarPlacement>;
  homeSeats: Record<string, { x: number; z: number }>;
}) => {
  const ref = useRef<CameraControls>(null);
  const handled = useRef(0);
  const data = useRef({ placements, homeSeats });
  data.current = { placements, homeSeats };

  const run = (cmd: CameraCommand | null) => {
    const c = ref.current;
    if (!c || !cmd || cmd.nonce === handled.current) return;
    handled.current = cmd.nonce;
    const az = c.azimuthAngle;
    // 右側の情報パネルに隠れないよう、注視点を画面右方向へずらす（対象は画面左寄りに映る）
    const toward = (ox: number, oy: number, oz: number, dist: number, polar: number, shift = 0, fixedAz?: number) => {
      // 壁際の対象でカメラが建物の外に出てしまう場合は、建物の中心側から見る
      let a = fixedAz ?? az;
      const probe = new THREE.Vector3().setFromSphericalCoords(dist, polar, a);
      const m = 1.5;
      if (fixedAz === undefined && (ox + probe.x > BUILDING.x1 - m || ox + probe.x < BUILDING.x0 + m || oz + probe.z > BUILDING.z1 - m || oz + probe.z < BUILDING.z0 + m)) {
        a = Math.atan2(-ox, 6 - oz);
      }
      const tx = ox + Math.cos(a) * shift;
      const tz = oz - Math.sin(a) * shift;
      const off = new THREE.Vector3().setFromSphericalCoords(dist, polar, a);
      c.setLookAt(tx + off.x, oy + off.y, tz + off.z, tx, oy, tz, true);
    };
    switch (cmd.kind) {
      case 'overview':
        setOverview(c, true);
        break;
      case 'department': {
        const dept = useApp.getState().business.departments.find((d) => d.id === cmd.departmentId);
        if (!dept) return;
        const r = departmentRect(dept);
        const [x, z] = rectCenter(r);
        const [w, d] = rectSize(r);
        if (isMobileNow()) toward(x, -3, z, Math.max(w, d) * 1.6 + 10, 0.82, 0);
        else toward(x, 0.5, z, Math.max(w, d) * 1.15 + 6, 0.82, 3.5);
        break;
      }
      case 'employee': {
        const p = data.current.placements[cmd.employeeId] ?? data.current.homeSeats[cmd.employeeId];
        if (!p) return;
        // スマホは下部シートに隠れないよう対象を画面上寄りに
        if (isMobileNow()) toward(p.x, -0.4, p.z, 15, 0.85, 0);
        else toward(p.x, 0.9, p.z, 10, 0.9, 0.7);
        break;
      }
      case 'point': {
        // キャラクターの動きが見える距離まで寄る
        if (isMobileNow()) toward(cmd.x, -0.6, cmd.z, 21, 0.85, 0);
        else toward(cmd.x, 0.6, cmd.z, 16, 0.88, 0);
        break;
      }
      case 'area': {
        const r = AREAS[cmd.area as keyof typeof AREAS];
        if (!r) return;
        const [x, z] = rectCenter(r);
        const [w, d] = rectSize(r);
        const dist = Math.max(w, d) * 0.75 + 5;
        // 受付は入口側から見下ろす（ロゴ壁の裏側から見ないように）
        if (cmd.area === 'reception') {
          if (isMobileNow()) toward(x, -1, z, 20, 0.45, 0, 0.25);
          else toward(x, 0.6, z, 14, 0.5, 0, 0.25);
          break;
        }
        if (isMobileNow()) toward(x, -1.2, z, dist * 1.45, 0.85, 0);
        else toward(x, 0.6, z, dist, 0.85, 1.5);
        break;
      }
      case 'zoom':
        c.dolly(cmd.delta, true);
        break;
      case 'rotate':
        c.rotate(cmd.delta, 0, true);
        break;
    }
  };

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // 縦長画面では画角を広げる
    const cam = c.camera as THREE.PerspectiveCamera;
    if (isMobileNow() && cam.isPerspectiveCamera) {
      cam.fov = 45;
      cam.updateProjectionMatrix();
    }
    setOverview(c, false);
    c.setBoundary(BOUNDS);
    c.boundaryFriction = 0.2;
    // マウント前に発行されたコマンド（ログイン直後など）を処理
    const pending = useUi.getState().camera;
    if (pending) setTimeout(() => run(pending), 400);
    return useUi.subscribe((s, prev) => {
      if (s.camera !== prev.camera) run(s.camera);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ログイン画面ではゆっくりとオフィスを周回
  useFrame((_, dt) => {
    if (!useApp.getState().currentUserId && ref.current) ref.current.rotate(dt * 0.04, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={4}
      maxDistance={170}
      minPolarAngle={0.12}
      maxPolarAngle={1.2}
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      dollySpeed={0.35}
      truckSpeed={1.4}
      dollyToCursor
    />
  );
};
