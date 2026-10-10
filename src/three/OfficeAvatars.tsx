// ============================================================
// オフィス内の社員アバター配置・状態表示・クリック操作
// ============================================================
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Label3D } from './Label3D';
import type { ThreeEvent } from '@react-three/fiber';
import type { AttendanceStatus, AvatarConfig, Employee } from '../types';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { generateAvatar } from '../data/avatarFactory';
import { AvatarModel } from './AvatarModel';
import type { AvatarPlacement, OfficeLayoutData } from './placements';

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  working: '#3ddc97',
  away: '#f2b45a',
  meeting: '#9b8cff',
  off: '#6b7280',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  working: '作業中',
  away: '休憩中',
  meeting: '会議中',
  off: '退勤',
};

const ACTIVITY_LABEL = { eat: 'ランチ中', coffee: 'コーヒー休憩', chat: '雑談中' } as const;

const markerGeo = new THREE.OctahedronGeometry(0.075, 0);
const ringGeo = new THREE.RingGeometry(0.42, 0.5, 40);
const meRingGeo = new THREE.RingGeometry(0.5, 0.56, 48);
const meRingOuterGeo = new THREE.RingGeometry(0.62, 0.65, 48);
// 自分の目印：頭上の下向き矢印
const meArrowGeo = new THREE.ConeGeometry(0.13, 0.26, 4);
const meArrowMat = new THREE.MeshBasicMaterial({ color: '#38d6e8', toneMapped: false });
const meRingMat = new THREE.MeshBasicMaterial({ color: '#38d6e8', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 24, 1, true);
const hitGeo = new THREE.CylinderGeometry(0.34, 0.34, 1.8, 8);
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const markerMats = Object.fromEntries(
  Object.entries(STATUS_COLOR).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, toneMapped: false })]),
) as Record<AttendanceStatus, THREE.MeshBasicMaterial>;

interface OfficeAvatarProps {
  employee: Employee;
  config: AvatarConfig;
  placement: AvatarPlacement;
  status: AttendanceStatus;
  isMe: boolean;
  mode: 'live' | 'exit';
  instant: boolean;
  showName: boolean;
  deptColor: string;
  onExited?: () => void;
}

const OfficeAvatar = memo(function OfficeAvatar({
  employee,
  config,
  placement,
  status,
  isMe,
  mode,
  instant,
  showName,
  deptColor,
  onExited,
}: OfficeAvatarProps) {
  const id = employee.id;
  const selected = useUi((s) => s.selectedEmployeeId === id);
  const hovered = useUi((s) => s.hoveredEmployeeId === id);
  const selectEmployee = useUi((s) => s.selectEmployee);
  const setHovered = useUi((s) => s.setHovered);
  const [reactKey, setReactKey] = useState(0);
  const presence = useRef(instant ? 1 : 0);
  const exited = useRef(false);
  const marker = useRef<THREE.Mesh>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const beam = useRef<THREE.Mesh>(null!);
  const meArrow = useRef<THREE.Mesh>(null);
  const meOuter = useRef<THREE.Mesh>(null);

  const local = useMemo(
    () => ({
      ring: new THREE.MeshBasicMaterial({ color: '#38d6e8', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
      outer: new THREE.MeshBasicMaterial({ color: '#38d6e8', transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }),
      beam: new THREE.MeshBasicMaterial({
        color: '#7beaf5',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    }),
    [],
  );
  useEffect(() => () => Object.values(local).forEach((m) => m.dispose()), [local]);

  const sit = placement.pose === 'sit';
  const markerY = (sit ? 1.62 : 2.08) * config.heightScale;
  const phase = useMemo(() => (id.charCodeAt(id.length - 1) % 17) * 0.37, [id]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (mode === 'exit') {
      presence.current = Math.max(0, presence.current - dt * 1.1);
      if (presence.current <= 0 && !exited.current) {
        exited.current = true;
        onExited?.();
      }
    } else if (presence.current < 1) {
      presence.current = Math.min(1, presence.current + dt * 0.9);
    }
    const p = presence.current;
    // 登場・退出時の光の柱
    const beamOn = p < 1;
    beam.current.visible = beamOn;
    if (beamOn) {
      local.beam.opacity = Math.sin(p * Math.PI) * 0.55 + (mode === 'exit' ? (1 - p) * 0.1 : 0);
      beam.current.scale.set(1 - p * 0.5, 1, 1 - p * 0.5);
    }
    marker.current.position.y = markerY + Math.sin(t * 2 + phase) * 0.04;
    marker.current.rotation.y = t * 1.2;
    marker.current.visible = p > 0.6;
    if (meArrow.current) {
      meArrow.current.position.y = markerY + 0.42 + Math.sin(t * 3) * 0.07;
      meArrow.current.rotation.y = t * 1.5;
      meArrow.current.visible = p > 0.6;
    }
    if (meOuter.current) {
      const k = (t * 0.8) % 1;
      meOuter.current.scale.setScalar(1 + k * 0.6);
      (meOuter.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
    }
    const showRing = selected || hovered;
    ring.current.visible = showRing && p > 0.5;
    if (showRing) {
      const s = 1 + Math.sin(t * 3) * 0.06;
      ring.current.scale.setScalar(s);
      local.ring.opacity = selected ? 0.95 : 0.45;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (mode === 'exit') return;
    setReactKey((k) => k + 1);
    selectEmployee(id);
  };

  const labelVisible = mode === 'live' && (selected || hovered || isMe || showName);

  return (
    <group position={[placement.x, 0, placement.z]} rotation-y={placement.rotY}>
      <AvatarModel
        config={config}
        pose={placement.pose}
        working={placement.working}
        activity={placement.activity}
        reactKey={reactKey}
        presence={presence}
        phase={phase}
      />
      <mesh
        geometry={hitGeo}
        material={hitMat}
        position-y={sit ? 0.8 : 0.9}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = '';
        }}
      />
      <mesh ref={marker} geometry={markerGeo} material={markerMats[status]} position-y={markerY} />
      <mesh ref={ring} geometry={ringGeo} material={local.ring} rotation-x={-Math.PI / 2} position-y={0.04} visible={false} />
      {isMe && (
        <>
          <mesh ref={meArrow} geometry={meArrowGeo} material={meArrowMat} rotation-x={Math.PI} position-y={markerY + 0.42} />
          <mesh geometry={meRingGeo} material={meRingMat} rotation-x={-Math.PI / 2} position-y={0.035} />
          <mesh ref={meOuter} geometry={meRingOuterGeo} material={local.outer} rotation-x={-Math.PI / 2} position-y={0.036} />
        </>
      )}
      <mesh ref={beam} geometry={beamGeo} material={local.beam} position-y={2} visible={false} />
      {labelVisible && (
        <Label3D position={[0, markerY + (isMe ? 0.78 : 0.32), 0]} zIndex={30}>
          <div
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] shadow-lg backdrop-blur-md ${
              selected ? 'border-cyan-300/60 bg-zinc-900/85 text-white' : 'border-white/10 bg-zinc-900/75 text-zinc-200'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: deptColor }} />
            {isMe && <span className="rounded bg-cyan-400/20 px-1 text-[9px] font-semibold text-cyan-200">YOU</span>}
            <span className="font-medium">{employee.name}</span>
            <span className="text-[10px]" style={{ color: STATUS_COLOR[status] }}>
              {status === 'away' && placement.activity ? ACTIVITY_LABEL[placement.activity] : STATUS_LABEL[status]}
            </span>
          </div>
        </Label3D>
      )}
    </group>
  );
});

interface ExitGhost {
  key: string;
  employeeId: string;
  placement: AvatarPlacement;
}

export const OfficeAvatars = ({ layout }: { layout: OfficeLayoutData }) => {
  const employees = useApp((s) => s.business.employees);
  const departments = useApp((s) => s.business.departments);
  const attendance = useApp((s) => s.business.attendance);
  const avatars = useApp((s) => s.presentation.avatars);
  const me = useApp((s) => s.currentUserId);
  const showNames = useApp((s) => s.business.settings.showNameTags);
  const leaving = useUi((s) => s.leaving);

  const mountedAt = useRef(performance.now());
  const prev = useRef<Record<string, AvatarPlacement>>({});
  const [ghosts, setGhosts] = useState<ExitGhost[]>([]);

  // 退勤・状態変更で消えた社員は退出演出用のゴーストとして一時的に残す
  useEffect(() => {
    const before = prev.current;
    const gone: ExitGhost[] = [];
    for (const [id, pl] of Object.entries(before)) {
      const now = layout.placements[id];
      const moved = now && (now.location !== pl.location || now.x !== pl.x || now.z !== pl.z);
      if (!now || moved) gone.push({ key: `${id}-${Date.now()}`, employeeId: id, placement: pl });
    }
    if (gone.length) setGhosts((g) => [...g, ...gone]);
    prev.current = layout.placements;
  }, [layout.placements]);

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const deptColor = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.color])), [departments]);
  const instant = performance.now() - mountedAt.current < 1200;

  return (
    <group>
      {Object.values(layout.placements).map((pl) => {
        const e = empById[pl.employeeId];
        if (!e) return null;
        // 自分の退勤演出中は退出アニメーションへ
        const exiting = leaving && e.id === me;
        return (
          <OfficeAvatar
            key={`${e.id}:${pl.location}:${pl.x.toFixed(2)}`}
            employee={e}
            config={avatars[e.id] ?? generateAvatar(e.id)}
            placement={pl}
            status={attendance[e.id]?.status ?? 'off'}
            isMe={e.id === me}
            mode={exiting ? 'exit' : 'live'}
            instant={instant}
            showName={showNames}
            deptColor={deptColor[e.departmentId] ?? '#38d6e8'}
          />
        );
      })}
      {ghosts.map((g) => {
        const e = empById[g.employeeId];
        if (!e) return null;
        return (
          <OfficeAvatar
            key={g.key}
            employee={e}
            config={avatars[e.id] ?? generateAvatar(e.id)}
            placement={g.placement}
            status={attendance[e.id]?.status ?? 'off'}
            isMe={false}
            mode="exit"
            instant
            showName={false}
            deptColor={deptColor[e.departmentId] ?? '#38d6e8'}
            onExited={() => setGhosts((list) => list.filter((x) => x.key !== g.key))}
          />
        );
      })}
    </group>
  );
};
