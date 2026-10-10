// ============================================================
// オフィス猫「イロ」
// 通路を散歩し、ときどき誰かのデスクで丸くなって眠る。タップすると「にゃー」。
// ============================================================
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Label3D } from './Label3D';
import { faceTowards } from './layout';
import { planRoute, routeToNode, WANDER_NODES, nodePos } from './nav';
import type { P2 } from './nav';
import type { DeskInfo } from './placements';

const M = {
  fur: new THREE.MeshStandardMaterial({ color: '#d4691f', roughness: 0.85 }),
  white: new THREE.MeshStandardMaterial({ color: '#f5efe4', roughness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 0.6 }),
  eye: new THREE.MeshStandardMaterial({ color: '#7fae4a', roughness: 0.3, emissive: '#2c4a14', emissiveIntensity: 0.4 }),
  nose: new THREE.MeshStandardMaterial({ color: '#e7a0a0', roughness: 0.5 }),
  hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
};
const G = {
  body: new THREE.CapsuleGeometry(0.085, 0.22, 4, 12),
  head: new THREE.SphereGeometry(0.085, 16, 12),
  muzzle: new THREE.SphereGeometry(0.04, 10, 8),
  ear: new THREE.ConeGeometry(0.032, 0.065, 4),
  eye: new THREE.SphereGeometry(0.013, 8, 6),
  leg: new THREE.CapsuleGeometry(0.021, 0.1, 3, 6),
  tail: new THREE.CapsuleGeometry(0.019, 0.1, 3, 6),
  chest: new THREE.SphereGeometry(0.07, 10, 8),
  hit: new THREE.SphereGeometry(0.4, 8, 6),
};

type Mode = 'walk' | 'idle' | 'sleep' | 'jumpUp' | 'jumpDown';

/** 合成音の「にゃー」（音声ファイルを使わない） */
let audio: AudioContext | null = null;
const meow = (sleepy: boolean) => {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    const base = sleepy ? 380 : 520;
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.linearRampToValueAtTime(base * 1.75, t0 + 0.12);
    osc.frequency.linearRampToValueAtTime(base * 1.1, t0 + 0.45);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1300, t0);
    filter.frequency.linearRampToValueAtTime(900, t0 + 0.45);
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(sleepy ? 0.05 : 0.12, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.55);
  } catch {
    /* 音が出せない環境では無視 */
  }
};

const deskSpot = (d: DeskInfo, lx: number, lz: number): P2 => {
  const c = Math.cos(d.rotY);
  const s = Math.sin(d.rotY);
  return [d.x + lx * c + lz * s, d.z - lx * s + lz * c];
};

export const OfficeCat = ({ desks }: { desks: DeskInfo[] }) => {
  const root = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const tail = useRef<THREE.Group>(null!);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const deskList = useRef(desks);
  deskList.current = desks;

  const start = nodePos('LF');
  const st = useRef({
    mode: 'idle' as Mode,
    x: start[0],
    z: start[1],
    y: 0,
    rot: 0,
    route: [] as P2[],
    step: 0,
    timer: 2,
    jumpFrom: [0, 0, 0] as [number, number, number],
    jumpTo: [0, 0, 0] as [number, number, number],
    jumpT: 0,
    sleepDesk: null as DeskInfo | null,
    afterWalk: 'idle' as 'idle' | 'jumpUp',
  });
  const [mode, setMode] = useState<Mode>('idle');
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hover, setHover] = useState(false);
  const phase = useMemo(() => Math.random() * 10, []);

  if (import.meta.env.DEV) Object.assign(window, { __cat: st.current });

  const go = (m: Mode) => {
    st.current.mode = m;
    setMode(m);
  };

  /** 次の行動を決める */
  const decide = () => {
    const s = st.current;
    const occupied = deskList.current.filter((d) => d.occupantId);
    if (Math.random() < 0.3 && occupied.length) {
      // 誰かのデスクで昼寝
      const d = occupied[Math.floor(Math.random() * occupied.length)];
      const [cx, cz] = deskSpot(d, 0.62, 0.95);
      s.route = planRoute([s.x, s.z], { x: cx, z: cz, rotY: d.rotY, location: 'desk' });
      s.sleepDesk = d;
      s.afterWalk = 'jumpUp';
    } else {
      const n = WANDER_NODES[Math.floor(Math.random() * WANDER_NODES.length)];
      s.route = routeToNode([s.x, s.z], n);
      s.afterWalk = 'idle';
    }
    s.step = 1;
    go('walk');
  };

  useFrame((state, dt) => {
    const s = st.current;
    const d = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime + phase;

    switch (s.mode) {
      case 'walk': {
        let remain = 0.95 * d;
        while (remain > 0 && s.step < s.route.length) {
          const [tx, tz] = s.route[s.step];
          const dx = tx - s.x;
          const dz = tz - s.z;
          const len = Math.hypot(dx, dz);
          if (len > 0.001) {
            let diff = faceTowards(s.x, s.z, tx, tz) - s.rot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            s.rot += diff * Math.min(1, d * 8);
          }
          if (len <= remain) {
            s.x = tx;
            s.z = tz;
            s.step++;
            remain -= len;
          } else {
            s.x += (dx / len) * remain;
            s.z += (dz / len) * remain;
            remain = 0;
          }
        }
        if (s.step >= s.route.length) {
          if (s.afterWalk === 'jumpUp' && s.sleepDesk) {
            const [dx, dz] = deskSpot(s.sleepDesk, 0.62, 0.08);
            s.jumpFrom = [s.x, 0, s.z];
            s.jumpTo = [dx, 0.765, dz];
            s.jumpT = 0;
            s.rot = faceTowards(s.x, s.z, dx, dz);
            go('jumpUp');
          } else {
            s.timer = 3 + Math.random() * 5;
            go('idle');
          }
        }
        break;
      }
      case 'idle':
        s.timer -= d;
        if (s.timer <= 0) decide();
        break;
      case 'sleep':
        s.timer -= d;
        if (s.timer <= 0) wakeUp();
        break;
      case 'jumpUp':
      case 'jumpDown': {
        s.jumpT = Math.min(1, s.jumpT + d / 0.6);
        const k = s.jumpT;
        s.x = s.jumpFrom[0] + (s.jumpTo[0] - s.jumpFrom[0]) * k;
        s.z = s.jumpFrom[2] + (s.jumpTo[2] - s.jumpFrom[2]) * k;
        s.y = s.jumpFrom[1] + (s.jumpTo[1] - s.jumpFrom[1]) * k + Math.sin(k * Math.PI) * 0.35;
        if (k >= 1) {
          if (s.mode === 'jumpUp') {
            s.timer = 25 + Math.random() * 25;
            s.rot += 0.8;
            go('sleep');
          } else {
            s.y = 0;
            s.timer = 1;
            go('idle');
          }
        }
        break;
      }
    }

    root.current.position.set(s.x, s.y, s.z);
    root.current.rotation.y = s.rot;

    // 姿勢
    const walking = s.mode === 'walk';
    const sleeping = s.mode === 'sleep';
    const sitting = s.mode === 'idle';
    const stride = walking ? Math.sin(t * 13) : 0;
    legs.current.forEach((g, i) => {
      if (!g) return;
      const sign = i % 2 === 0 ? 1 : -1;
      const front = i < 2;
      g.rotation.x = walking ? stride * 0.55 * sign * (front ? 1 : -1) : 0;
      g.visible = !sleeping;
    });
    body.current.position.y = sleeping ? 0.07 : 0.2 + (walking ? Math.abs(stride) * 0.012 : 0);
    body.current.rotation.x = sitting ? -0.55 : 0;
    body.current.scale.set(sleeping ? 1.25 : 1, sleeping ? 0.75 + Math.sin(t * 1.4) * 0.03 : 1, sleeping ? 0.8 : 1);
    head.current.rotation.set(sleeping ? 0.5 : sitting ? 0.25 : 0, sleeping ? 0.9 : sitting ? Math.sin(t * 0.6) * 0.5 : 0, sleeping ? 0.3 : 0);
    tail.current.rotation.x = sleeping ? 1.4 : walking ? -0.9 + Math.sin(t * 4) * 0.12 : -0.3 + Math.sin(t * 1.5) * 0.25;
    tail.current.rotation.y = sleeping ? 1.2 : Math.sin(t * 2) * 0.3;
  });

  const wakeUp = () => {
    const s = st.current;
    const d = s.sleepDesk;
    s.sleepDesk = null;
    const [cx, cz] = d ? deskSpot(d, 0.62, 0.95) : [s.x, s.z];
    s.jumpFrom = [s.x, s.y, s.z];
    s.jumpTo = [cx, 0, cz];
    s.jumpT = 0;
    go('jumpDown');
  };

  const onTap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const sleeping = st.current.mode === 'sleep';
    meow(sleeping);
    setBubble(sleeping ? 'にゃ…？' : 'にゃー');
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 1600);
    if (sleeping) setTimeout(wakeUp, 900);
    else if (st.current.mode === 'walk' || st.current.mode === 'idle') {
      // 立ち止まってこちらを見る
      st.current.timer = 3;
      go('idle');
    }
  };

  return (
    <group ref={root}>
      <group ref={body} position-y={0.2}>
        <mesh geometry={G.body} material={M.fur} rotation-x={Math.PI / 2} castShadow />
        <mesh geometry={G.chest} material={M.white} position={[0, -0.02, -0.12]} scale={[0.9, 1, 0.8]} />
        <group ref={head} position={[0, 0.09, -0.2]}>
          <mesh geometry={G.head} material={M.fur} castShadow />
          <mesh geometry={G.muzzle} material={M.white} position={[0, -0.025, -0.065]} scale={[1.1, 0.8, 0.8]} />
          <mesh geometry={G.eye} material={M.eye} position={[-0.033, 0.015, -0.074]} />
          <mesh geometry={G.eye} material={M.eye} position={[0.033, 0.015, -0.074]} />
          <mesh geometry={G.eye} material={M.nose} position={[0, -0.012, -0.1]} scale={0.7} />
          <mesh geometry={G.ear} material={M.fur} position={[-0.045, 0.075, -0.005]} rotation-z={0.25} />
          <mesh geometry={G.ear} material={M.fur} position={[0.045, 0.075, -0.005]} rotation-z={-0.25} />
        </group>
        <group ref={tail} position={[0, 0.03, 0.18]}>
          <mesh geometry={G.tail} material={M.fur} position={[0, 0, 0.07]} rotation-x={Math.PI / 2} />
          <mesh geometry={G.tail} material={M.fur} position={[0, 0.06, 0.15]} rotation-x={Math.PI / 2.8} />
          <mesh geometry={G.tail} material={M.dark} position={[0, 0.13, 0.19]} rotation-x={Math.PI / 6} scale={0.85} />
        </group>
      </group>
      {[
        [-0.045, -0.12],
        [0.045, -0.12],
        [-0.045, 0.12],
        [0.045, 0.12],
      ].map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            legs.current[i] = g;
          }}
          position={[x, 0.15, z]}
        >
          <mesh geometry={G.leg} material={i < 2 ? M.white : M.fur} position-y={-0.07} />
        </group>
      ))}
      <mesh
        geometry={G.hit}
        material={M.hit}
        position-y={0.2}
        onClick={onTap}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      />
      {(bubble || hover || mode === 'sleep') && (
        <Label3D position={[0, 0.65, 0]} zIndex={28}>
          <div className="flex flex-col items-center gap-0.5">
            {bubble ? (
              <div className="rounded-xl bg-white px-2.5 py-0.5 text-xs font-bold text-zinc-800 shadow-lg">{bubble}</div>
            ) : mode === 'sleep' ? (
              <div className="animate-pulse text-sm font-bold text-sky-200 drop-shadow">Zzz…</div>
            ) : null}
            {hover && <div className="rounded bg-zinc-900/80 px-1.5 text-[10px] whitespace-nowrap text-zinc-200">オフィス猫 イロ</div>}
          </div>
        </Label3D>
      )}
    </group>
  );
};
