// ============================================================
// オフィス内の社員アバター：通路を歩いて移動・状態表示・クリック操作
// ============================================================
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { AttendanceStatus, AvatarConfig, Employee } from '../types';
import { useApp } from '../store/appStore';
import { GATHER_POINT, useUi } from '../store/uiStore';
import { generateAvatar } from '../data/avatarFactory';
import { hashString } from '../lib/utils';
import { AvatarModel } from './AvatarModel';
import { Label3D } from './Label3D';
import { faceTowards } from './layout';
import { ENTRANCE, planRoute } from './nav';
import type { NavSpot, P2 } from './nav';
import type { AvatarPlacement, OfficeLayoutData, Pose } from './placements';
import { useSeason } from './atmosphere';

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

const ACTIVITY_LABEL: Record<string, string> = { eat: 'ランチ中', coffee: 'コーヒー休憩', chat: '雑談中', cheer: 'ハイタッチ！' };

const markerGeo = new THREE.OctahedronGeometry(0.075, 0);
const ringGeo = new THREE.RingGeometry(0.42, 0.5, 40);
const meRingGeo = new THREE.RingGeometry(0.5, 0.56, 48);
const meRingOuterGeo = new THREE.RingGeometry(0.62, 0.65, 48);
const meArrowGeo = new THREE.ConeGeometry(0.13, 0.26, 4);
const meArrowMat = new THREE.MeshBasicMaterial({ color: '#38d6e8', toneMapped: false });
const meRingMat = new THREE.MeshBasicMaterial({ color: '#38d6e8', transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 24, 1, true);
const hitGeo = new THREE.CylinderGeometry(0.34, 0.34, 1.8, 8);
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const markerMats = Object.fromEntries(
  Object.entries(STATUS_COLOR).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, toneMapped: false })]),
) as Record<AttendanceStatus, THREE.MeshBasicMaterial>;

const WALK_SPEED = 1.9;
const COMMUTE_SPEED = 3.0;

const toSpot = (p: AvatarPlacement): NavSpot => ({ x: p.x, z: p.z, rotY: p.rotY, location: p.location, pose: p.pose });
const angleTo = (from: number, to: number) => {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

interface OfficeAvatarProps {
  employee: Employee;
  config: AvatarConfig;
  /** 目的地（null = 退勤して入口から退出） */
  target: AvatarPlacement | null;
  status: AttendanceStatus;
  isMe: boolean;
  instant: boolean;
  showName: boolean;
  deptColor: string;
  hat?: 'santa' | 'witch';
  message?: string;
  onExited: () => void;
}

const OfficeAvatar = memo(function OfficeAvatar({
  employee,
  config,
  target,
  status,
  isMe,
  instant,
  showName,
  deptColor,
  hat,
  message,
  onExited,
}: OfficeAvatarProps) {
  const id = employee.id;
  const selected = useUi((s) => s.selectedEmployeeId === id);
  const hovered = useUi((s) => s.hoveredEmployeeId === id);
  const selectEmployee = useUi((s) => s.selectEmployee);
  const setHovered = useUi((s) => s.setHovered);
  const [reactKey, setReactKey] = useState(0);

  const startAt = instant && target ? target : null;
  const group = useRef<THREE.Group>(null!);
  const pos = useRef({ x: startAt?.x ?? ENTRANCE.x, z: startAt?.z ?? ENTRANCE.z, rot: startAt?.rotY ?? Math.PI });
  const route = useRef<P2[]>([]);
  const step = useRef(0);
  const speed = useRef(WALK_SPEED);
  const walkRef = useRef(false);
  const leaving = useRef(false);
  const exited = useRef(false);
  const settledAt = useRef<AvatarPlacement | null>(startAt);
  const presence = useRef(instant ? 1 : 0);
  const [pose, setPose] = useState<Pose>(startAt?.pose ?? 'stand');
  const [moving, setMoving] = useState(!startAt);

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

  // 目的地が変わったら、通路を通るルートを計算して歩き出す
  const targetKey = target ? `${target.location}:${target.x.toFixed(2)}:${target.z.toFixed(2)}` : 'exit';
  const lastKey = useRef(startAt ? targetKey : '');
  useEffect(() => {
    if (lastKey.current === targetKey) return;
    lastKey.current = targetKey;
    const dest = target ? toSpot(target) : ENTRANCE;
    const fromEntrance = !settledAt.current && !walkRef.current;
    const from: NavSpot | P2 = fromEntrance ? ENTRANCE : walkRef.current || !settledAt.current ? [pos.current.x, pos.current.z] : toSpot(settledAt.current);
    route.current = planRoute(from, dest);
    step.current = 1;
    speed.current = fromEntrance || !target ? COMMUTE_SPEED : WALK_SPEED;
    leaving.current = !target;
    walkRef.current = true;
    settledAt.current = null;
    setPose('stand');
    setMoving(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const sit = pose === 'sit';
  const markerY = (sit ? 1.62 : 2.08) * config.heightScale;
  const phase = useMemo(() => (hashString(id) % 17) * 0.37, [id]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.1);

    // 歩行
    if (walkRef.current) {
      let remain = speed.current * d;
      const pts = route.current;
      while (remain > 0 && step.current < pts.length) {
        const [tx, tz] = pts[step.current];
        const dx = tx - pos.current.x;
        const dz = tz - pos.current.z;
        const len = Math.hypot(dx, dz);
        if (len > 0.001) pos.current.rot += angleTo(pos.current.rot, faceTowards(pos.current.x, pos.current.z, tx, tz)) * Math.min(1, d * 12);
        if (len <= remain) {
          pos.current.x = tx;
          pos.current.z = tz;
          step.current++;
          remain -= len;
        } else {
          pos.current.x += (dx / len) * remain;
          pos.current.z += (dz / len) * remain;
          remain = 0;
        }
      }
      if (step.current >= pts.length) {
        walkRef.current = false;
        if (!leaving.current && target) {
          pos.current.rot = target.rotY;
          settledAt.current = target;
          setPose(target.pose);
          setMoving(false);
        }
      }
    }

    // 入口での登場・退出（光の柱）
    if (leaving.current && !walkRef.current) {
      presence.current = Math.max(0, presence.current - d * 1.2);
      if (presence.current <= 0 && !exited.current) {
        exited.current = true;
        onExited();
      }
    } else if (presence.current < 1) {
      presence.current = Math.min(1, presence.current + d * 1.2);
    }

    group.current.position.set(pos.current.x, 0, pos.current.z);
    group.current.rotation.y = pos.current.rot;

    const p = presence.current;
    const beamOn = p < 1;
    beam.current.visible = beamOn;
    if (beamOn) {
      local.beam.opacity = Math.sin(p * Math.PI) * 0.55 + (leaving.current ? (1 - p) * 0.1 : 0);
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
      local.outer.opacity = 0.7 * (1 - k);
    }
    const showRing = selected || hovered;
    ring.current.visible = showRing && p > 0.5;
    if (showRing) {
      ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
      local.ring.opacity = selected ? 0.95 : 0.45;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!target) return;
    setReactKey((k) => k + 1);
    selectEmployee(id);
  };

  const activity = moving ? undefined : target?.activity;
  const live = !!target;
  const labelVisible = live && (selected || hovered || isMe || showName);
  const statusText = target?.location === 'gather' ? 'ハイタッチ！' : moving ? '移動中' : status === 'away' && activity ? ACTIVITY_LABEL[activity] : STATUS_LABEL[status];

  return (
    <group ref={group}>
      <AvatarModel
        config={config}
        pose={pose}
        working={!moving && !!target?.working}
        activity={activity}
        hat={hat}
        walkRef={walkRef}
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
              {statusText}
            </span>
          </div>
        </Label3D>
      )}
      {live && message && (
        <Label3D position={[0, markerY + (labelVisible ? (isMe ? 1.2 : 0.75) : 0.42), 0]} zIndex={25}>
          <div className="relative max-w-[180px] rounded-xl bg-white px-2.5 py-1 text-[11px] leading-snug font-medium text-zinc-800 shadow-lg">
            {message}
            <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        </Label3D>
      )}
    </group>
  );
});

export const OfficeAvatars = ({ layout }: { layout: OfficeLayoutData }) => {
  const employees = useApp((s) => s.business.employees);
  const departments = useApp((s) => s.business.departments);
  const attendance = useApp((s) => s.business.attendance);
  const avatars = useApp((s) => s.presentation.avatars);
  const me = useApp((s) => s.currentUserId);
  const showNames = useApp((s) => s.business.settings.showNameTags);
  const gathering = useUi((s) => s.gathering);
  const season = useSeason();

  const mountedAt = useRef(performance.now());
  const [exiting, setExiting] = useState<string[]>([]);
  const prevIds = useRef<Set<string>>(new Set());

  // ハイタッチ中のメンバーは集合場所へ
  const targets = useMemo(() => {
    const t: Record<string, AvatarPlacement> = { ...layout.placements };
    if (gathering) {
      const ids = gathering.memberIds.filter((id) => t[id]);
      const r = 0.9 + ids.length * 0.12;
      ids.forEach((id, i) => {
        const a = (i / ids.length) * Math.PI * 2;
        const x = GATHER_POINT[0] + Math.cos(a) * r;
        const z = GATHER_POINT[1] + Math.sin(a) * r;
        t[id] = { employeeId: id, x, z, rotY: faceTowards(x, z, GATHER_POINT[0], GATHER_POINT[1]), pose: 'stand', location: 'gather', working: false, activity: 'cheer' };
      });
    }
    return t;
  }, [layout.placements, gathering]);

  // 退勤した社員は入口まで歩いてから消える
  useEffect(() => {
    const now = new Set(Object.keys(targets));
    const gone = [...prevIds.current].filter((id) => !now.has(id) && employees.some((e) => e.id === id));
    setExiting((list) => {
      const next = list.filter((id) => !now.has(id));
      for (const id of gone) if (!next.includes(id)) next.push(id);
      return next.length === list.length && next.every((v, i) => v === list[i]) ? list : next;
    });
    prevIds.current = now;
  }, [targets, employees]);

  const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
  const deptColor = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d.color])), [departments]);
  const instant = performance.now() - mountedAt.current < 1500;
  const ids = [...new Set([...Object.keys(targets), ...exiting])];

  return (
    <group>
      {ids.map((id) => {
        const e = empById[id];
        if (!e) return null;
        const hat = season === 'christmas' ? 'santa' : season === 'halloween' && hashString(id) % 3 === 0 ? 'witch' : undefined;
        return (
          <OfficeAvatar
            key={id}
            employee={e}
            config={avatars[id] ?? generateAvatar(id)}
            target={targets[id] ?? null}
            status={attendance[id]?.status ?? 'off'}
            isMe={id === me}
            instant={instant}
            showName={showNames}
            deptColor={deptColor[e.departmentId] ?? '#38d6e8'}
            hat={hat}
            message={attendance[id]?.message}
            onExited={() => setExiting((list) => list.filter((x) => x !== id))}
          />
        );
      })}
    </group>
  );
};
