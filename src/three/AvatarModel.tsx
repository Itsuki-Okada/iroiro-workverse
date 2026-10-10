// ============================================================
// 社員アバター（ローポリ人型）
// 原点 = 足元、正面 = local -Z。ジオメトリ・マテリアルは全アバターで共有。
// ============================================================
import { memo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { AvatarConfig } from '../types';
import { COSTUME_STYLE } from '../data/avatarFactory';
import type { Pose } from './placements';
import type { BreakActivity } from './layout';

// ---------- 共有ジオメトリ ----------
const G = (() => {
  const capsule = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 4, 10);
  return {
    pelvis: new RoundedBoxGeometry(0.3, 0.15, 0.2, 2, 0.05),
    thigh: capsule(0.072, 0.28),
    shin: capsule(0.058, 0.26),
    shoe: new RoundedBoxGeometry(0.11, 0.075, 0.25, 2, 0.03),
    torso: capsule(0.155, 0.26),
    shirtFront: new RoundedBoxGeometry(0.11, 0.26, 0.02, 1, 0.008),
    lapel: new THREE.BoxGeometry(0.05, 0.24, 0.012),
    collar: new THREE.TorusGeometry(0.062, 0.018, 6, 16),
    hood: new THREE.TorusGeometry(0.1, 0.045, 8, 16),
    pocket: new RoundedBoxGeometry(0.2, 0.08, 0.02, 1, 0.01),
    neck: new THREE.CylinderGeometry(0.048, 0.052, 0.12, 12),
    turtle: new THREE.CylinderGeometry(0.062, 0.068, 0.12, 14),
    head: new THREE.SphereGeometry(0.125, 22, 16),
    ear: new THREE.SphereGeometry(0.03, 8, 6),
    eye: new THREE.SphereGeometry(0.014, 8, 6),
    brow: new THREE.BoxGeometry(0.04, 0.008, 0.01),
    upperArm: capsule(0.05, 0.18),
    forearm: capsule(0.044, 0.17),
    hand: new THREE.SphereGeometry(0.044, 10, 8),
    // 髪
    cap: new THREE.SphereGeometry(0.136, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.43),
    capThin: new THREE.SphereGeometry(0.129, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    shellShort: new THREE.SphereGeometry(0.139, 22, 14, -0.67, 4.48, 0, Math.PI * 0.62),
    shellLong: new THREE.SphereGeometry(0.145, 22, 16, -0.75, 4.64, 0, Math.PI * 0.74),
    longBack: new RoundedBoxGeometry(0.25, 0.3, 0.07, 2, 0.03),
    bun: new THREE.SphereGeometry(0.062, 14, 10),
    fringe: new RoundedBoxGeometry(0.19, 0.05, 0.07, 2, 0.02),
    curl: new THREE.IcosahedronGeometry(0.056, 1),
    // アクセサリー
    lens: new THREE.TorusGeometry(0.03, 0.0055, 6, 16),
    bridge: new THREE.BoxGeometry(0.026, 0.005, 0.005),
    band: new THREE.TorusGeometry(0.148, 0.014, 6, 24, Math.PI),
    cup: new THREE.CylinderGeometry(0.046, 0.046, 0.04, 14),
    earring: new THREE.SphereGeometry(0.012, 8, 6),
    beanie: new THREE.SphereGeometry(0.143, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    beanieRim: new THREE.TorusGeometry(0.138, 0.022, 8, 24),
    mug: new THREE.CylinderGeometry(0.035, 0.03, 0.09, 12),
    // 着ぐるみ
    belly: new THREE.SphereGeometry(0.12, 16, 12),
    hoodCap: new THREE.SphereGeometry(0.152, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.36),
    hoodShell: new THREE.SphereGeometry(0.158, 22, 16, -0.6, 4.34, 0, Math.PI * 0.8),
    earRound: new THREE.SphereGeometry(0.055, 12, 10),
    earCone: new THREE.ConeGeometry(0.05, 0.12, 4),
    earLong: new THREE.CapsuleGeometry(0.032, 0.2, 4, 8),
    tailBall: new THREE.SphereGeometry(0.065, 12, 10),
    tailLong: new THREE.CapsuleGeometry(0.025, 0.34, 4, 8),
    tailDino: new THREE.ConeGeometry(0.1, 0.5, 10),
    spike: new THREE.ConeGeometry(0.035, 0.09, 4),
    beak: new THREE.ConeGeometry(0.032, 0.08, 8),
  };
})();

// ---------- 色別マテリアルキャッシュ ----------
const matCache = new Map<string, THREE.MeshStandardMaterial>();
const mat = (color: string, roughness = 0.75, side: THREE.Side = THREE.FrontSide) => {
  const key = `${color}|${roughness}|${side}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, side });
    matCache.set(key, m);
  }
  return m;
};
const EYE = new THREE.MeshStandardMaterial({ color: '#14161a', roughness: 0.3 });
const BEAK = new THREE.MeshStandardMaterial({ color: '#f2a23a', roughness: 0.5 });
// 休憩の小物
const BENTO_BOX = new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.4 });
const RICE = new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.8 });
const SIDE_DISH = new THREE.MeshStandardMaterial({ color: '#e0773f', roughness: 0.7 });
const GREEN = new THREE.MeshStandardMaterial({ color: '#5f9e4f', roughness: 0.7 });
const CHOPSTICK = new THREE.MeshStandardMaterial({ color: '#b5835a', roughness: 0.6 });
const COFFEE = new THREE.MeshStandardMaterial({ color: '#3b2318', roughness: 0.3 });
const G2 = {
  bento: new THREE.BoxGeometry(0.17, 0.045, 0.12),
  rice: new THREE.BoxGeometry(0.075, 0.012, 0.1),
  dish: new THREE.SphereGeometry(0.022, 8, 6),
  chopstick: new THREE.CylinderGeometry(0.0035, 0.0035, 0.2, 5),
  coffee: new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12),
};

/** 0→1→0 のなめらかなパルス（周期 period 秒のうち len 秒間） */
const pulse = (t: number, period: number, len: number) => {
  const x = ((t % period) + period) % period;
  if (x > len) return 0;
  return Math.sin((x / len) * Math.PI) ** 2;
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const MUG = new THREE.MeshStandardMaterial({ color: '#f0eee9', roughness: 0.4 });

const Hair = ({ c }: { c: AvatarConfig }) => {
  const m = mat(c.hairColor, 0.6);
  const mDouble = mat(c.hairColor, 0.6, THREE.DoubleSide);
  switch (c.hairStyle) {
    case 'buzz':
      return <mesh geometry={G.capThin} material={m} position-y={0.012} scale={[0.95, 1, 1]} />;
    case 'short':
      return (
        <>
          <mesh geometry={G.cap} material={m} position-y={0.014} scale={[0.95, 1.02, 1]} />
          <mesh geometry={G.shellShort} material={mDouble} position-y={0.008} scale={[0.95, 1, 1]} />
        </>
      );
    case 'sidepart':
      return (
        <>
          <mesh geometry={G.cap} material={m} position-y={0.018} scale={[0.96, 1.06, 1.01]} />
          <mesh geometry={G.shellShort} material={mDouble} position-y={0.008} scale={[0.95, 1, 1]} />
          <mesh geometry={G.fringe} material={m} position={[-0.025, 0.088, -0.095]} rotation={[0.35, 0, 0.22]} />
        </>
      );
    case 'bob':
      return (
        <>
          <mesh geometry={G.cap} material={m} position-y={0.016} scale={[0.98, 1.05, 1.02]} />
          <mesh geometry={G.shellLong} material={mDouble} position-y={0.0} scale={[1, 0.9, 1.02]} />
        </>
      );
    case 'long':
      return (
        <>
          <mesh geometry={G.cap} material={m} position-y={0.016} scale={[0.98, 1.05, 1.02]} />
          <mesh geometry={G.shellLong} material={mDouble} scale={[1, 1, 1.02]} />
          <mesh geometry={G.longBack} material={m} position={[0, -0.16, 0.075]} rotation-x={-0.1} />
        </>
      );
    case 'bun':
      return (
        <>
          <mesh geometry={G.cap} material={m} position-y={0.014} scale={[0.96, 1.04, 1]} />
          <mesh geometry={G.shellShort} material={mDouble} position-y={0.006} scale={[0.96, 1, 1]} />
          <mesh geometry={G.bun} material={m} position={[0, 0.115, 0.085]} />
        </>
      );
    case 'curly':
      return (
        <>
          <mesh geometry={G.cap} material={m} position-y={0.014} scale={[0.97, 1.04, 1]} />
          {CURLS.map(([x, y, z], i) => (
            <mesh key={i} geometry={G.curl} material={m} position={[x, y, z]} />
          ))}
        </>
      );
  }
};

const CURLS: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const front = Math.sin(a) < -0.55; // 正面は空ける
    if (front) continue;
    pts.push([Math.cos(a) * 0.11, 0.06, Math.sin(a) * 0.11]);
  }
  pts.push([0, 0.13, 0.02], [0.05, 0.11, 0.06], [-0.05, 0.11, 0.06], [0, 0.1, 0.1]);
  return pts;
})();

const Accessory = ({ c }: { c: AvatarConfig }) => {
  const m = mat(c.accessoryColor, 0.35);
  switch (c.accessory) {
    case 'glasses':
      return (
        <group position={[0, 0.012, -0.12]}>
          <mesh geometry={G.lens} material={m} position-x={-0.044} />
          <mesh geometry={G.lens} material={m} position-x={0.044} />
          <mesh geometry={G.bridge} material={m} />
        </group>
      );
    case 'headphones':
      return (
        <group position-y={0.0}>
          <mesh geometry={G.band} material={m} position-y={0.005} />
          <mesh geometry={G.cup} material={m} position={[-0.135, -0.005, 0]} rotation-z={Math.PI / 2} />
          <mesh geometry={G.cup} material={m} position={[0.135, -0.005, 0]} rotation-z={Math.PI / 2} />
        </group>
      );
    case 'earrings':
      return (
        <>
          <mesh geometry={G.earring} material={m} position={[-0.118, -0.05, 0]} />
          <mesh geometry={G.earring} material={m} position={[0.118, -0.05, 0]} />
        </>
      );
    case 'beanie':
      return (
        <>
          <mesh geometry={G.beanie} material={mat(c.accessoryColor, 0.95)} position-y={0.02} scale={[1, 1.08, 1]} />
          <mesh geometry={G.beanieRim} material={mat(c.accessoryColor, 0.95)} position-y={0.03} rotation-x={Math.PI / 2} />
        </>
      );
    default:
      return null;
  }
};

const Top = ({ c }: { c: AvatarConfig }) => {
  const top = mat(c.topColor, 0.85);
  const inner = mat(c.innerColor, 0.8);
  switch (c.topStyle) {
    case 'jacket':
      return (
        <>
          <mesh geometry={G.shirtFront} material={inner} position={[0, 0.36, -0.108]} />
          <mesh geometry={G.lapel} material={mat(c.topColor, 0.6)} position={[-0.05, 0.36, -0.112]} rotation-z={-0.22} />
          <mesh geometry={G.lapel} material={mat(c.topColor, 0.6)} position={[0.05, 0.36, -0.112]} rotation-z={0.22} />
        </>
      );
    case 'shirt':
      return <mesh geometry={G.collar} material={top} position={[0, 0.52, -0.01]} rotation-x={Math.PI / 2} scale={[1, 1, 1.2]} />;
    case 'hoodie':
      return (
        <>
          <mesh geometry={G.hood} material={top} position={[0, 0.53, 0.055]} rotation-x={Math.PI / 2.4} />
          <mesh geometry={G.pocket} material={mat(c.topColor, 0.95)} position={[0, 0.14, -0.108]} />
        </>
      );
    case 'knit':
      return <mesh geometry={G.collar} material={inner} position={[0, 0.52, -0.012]} rotation-x={Math.PI / 2} />;
    default:
      return null;
  }
};

type CostumeStyle = (typeof COSTUME_STYLE)[keyof typeof COSTUME_STYLE];

/** 着ぐるみのフードと耳（頭グループ内） */
const CostumeHood = ({ s }: { s: CostumeStyle }) => {
  const main = mat(s.main, 0.95);
  const mainDouble = mat(s.main, 0.95, THREE.DoubleSide);
  const ear = mat(s.limb ?? s.main, 0.95);
  const inner = mat(s.belly, 0.95);
  return (
    <>
      <mesh geometry={G.hoodCap} material={main} position-y={0.012} castShadow />
      <mesh geometry={G.hoodShell} material={mainDouble} position-y={-0.005} />
      {s.ears === 'round' &&
        [-1, 1].map((k) => <mesh key={k} geometry={G.earRound} material={ear} position={[k * 0.105, 0.125, 0.01]} castShadow />)}
      {s.ears === 'cone' &&
        [-1, 1].map((k) => (
          <group key={k} position={[k * 0.085, 0.16, 0]} rotation-z={-k * 0.3}>
            <mesh geometry={G.earCone} material={ear} castShadow />
            <mesh geometry={G.earCone} material={inner} position={[0, -0.01, -0.012]} scale={0.6} />
          </group>
        ))}
      {s.ears === 'long' &&
        [-1, 1].map((k) => (
          <group key={k} position={[k * 0.05, 0.27, 0.02]} rotation-z={-k * 0.14}>
            <mesh geometry={G.earLong} material={ear} castShadow />
            <mesh geometry={G.earLong} material={inner} position={[0, 0, -0.018]} scale={[0.55, 0.85, 0.4]} />
          </group>
        ))}
      {s.spikes && (
        <>
          <mesh geometry={G.spike} material={inner} position={[0, 0.16, 0.03]} />
          <mesh geometry={G.spike} material={inner} position={[0, 0.12, 0.11]} rotation-x={0.8} />
        </>
      )}
      {s.beak && <mesh geometry={G.beak} material={BEAK} position={[0, -0.025, -0.13]} rotation-x={-Math.PI / 2} />}
    </>
  );
};

export interface AvatarModelProps {
  config: AvatarConfig;
  pose: Pose;
  /** タイピング中 */
  working?: boolean;
  /** 休憩中の過ごし方：食事 / コーヒー / 立ち話 */
  activity?: BreakActivity;
  /** 変化するとクリック時リアクションを再生 */
  reactKey?: number;
  /** 0=非表示 → 1=表示（登場・退出演出に使用） */
  presence?: React.MutableRefObject<number>;
  phase?: number;
  castShadow?: boolean;
}

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const AvatarModel = memo(function AvatarModel({
  config: c,
  pose,
  working = false,
  activity,
  reactKey = 0,
  presence,
  phase = 0,
  castShadow = true,
}: AvatarModelProps) {
  const root = useRef<THREE.Group>(null!);
  const hips = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const foreL = useRef<THREE.Group>(null!);
  const foreR = useRef<THREE.Group>(null!);
  const mug = useRef<THREE.Group>(null);
  const bento = useRef<THREE.Group>(null);
  const react = useRef({ key: reactKey, start: -10 });

  const sit = pose === 'sit';
  const cos = c.costume && c.costume !== 'none' ? COSTUME_STYLE[c.costume] : null;
  const skin = mat(c.skinTone, 0.55);
  const top = cos ? mat(cos.main, 0.95) : mat(c.topColor, 0.85);
  const limb = cos ? mat(cos.limb ?? cos.main, 0.95) : top;
  const bottom = cos ? mat(cos.limb ?? cos.main, 0.95) : mat(c.bottomColor, 0.85);
  const shoe = cos ? mat(cos.limb ?? cos.main, 0.95) : mat(c.shoeColor, 0.5);
  const hand = cos ? limb : skin;
  const isTurtle = !cos && c.topStyle === 'turtleneck';

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (react.current.key !== reactKey) react.current = { key: reactKey, start: state.clock.elapsedTime };
    const rp = (state.clock.elapsedTime - react.current.start) / 1.3; // 0..1 リアクション進行
    const reacting = rp >= 0 && rp < 1;

    // 登場・退出
    const p = presence ? presence.current : 1;
    const s = p >= 1 ? 1 : Math.max(0.001, easeOutBack(Math.max(0, p)));
    root.current.scale.setScalar(s * c.heightScale);
    root.current.visible = p > 0.001;

    // 呼吸
    const breath = Math.sin(t * 1.7) * 0.012;
    torso.current.scale.set(1 + breath * 0.4, 1 + breath, 1 + breath * 0.6);

    // リアクション：ジャンプ（立ち）/ 体を弾ませる（座り）
    const hop = reacting ? Math.sin(rp * Math.PI) * (sit ? 0.05 : 0.16) : 0;
    hips.current.position.y = (sit ? 0.5 : 0.86) + hop;

    if (sit) {
      // 前傾してモニターを見る
      torso.current.rotation.x = working ? -0.14 : -0.04;
      head.current.rotation.x = working ? 0.12 + Math.sin(t * 0.6) * 0.03 : 0.02;
      head.current.rotation.y = working ? Math.sin(t * 0.35) * 0.16 : Math.sin(t * 0.25) * 0.35;
      if (activity === 'eat') {
        // 左手でお弁当を持ち、右手の箸で口へ運ぶ
        const bite = pulse(t, 3.2, 1.6);
        torso.current.rotation.x = -0.08 + bite * 0.06;
        head.current.rotation.x = 0.28 - bite * 0.3;
        head.current.rotation.y = Math.sin(t * 0.2) * 0.1;
        armL.current.rotation.set(0.5, 0, 0.32);
        foreL.current.rotation.x = 1.35;
        armR.current.rotation.set(lerp(0.55, 1.2, bite), 0, lerp(-0.25, -0.3, bite));
        foreR.current.rotation.x = lerp(1.3, 2.35, bite);
      } else if (activity === 'coffee' || activity === 'chat') {
        // ソファにもたれてコーヒー
        const sip = pulse(t, 7, 1.6);
        torso.current.rotation.x = 0.1;
        head.current.rotation.x = -0.05 - sip * 0.12;
        head.current.rotation.y = Math.sin(t * 0.25) * 0.3 * (1 - sip);
        armL.current.rotation.set(0.35, 0, -0.08);
        foreL.current.rotation.x = 0.9;
        armR.current.rotation.set(lerp(0.4, 1.2, sip), 0, lerp(0.1, -0.28, sip));
        foreR.current.rotation.x = lerp(1.45, 2.4, sip);
      } else if (working) {
        const k = Math.sin(t * 13) * 0.05;
        armL.current.rotation.set(0.62, 0, -0.1);
        armR.current.rotation.set(0.62, 0, 0.1);
        foreL.current.rotation.x = 1.05 + k;
        foreR.current.rotation.x = 1.05 - k + (Math.sin(t * 0.7) > 0.6 ? 0.08 : 0);
      } else {
        armL.current.rotation.set(0.4, 0, -0.08);
        armR.current.rotation.set(0.4, 0, 0.08);
        foreL.current.rotation.x = 1.0;
        foreR.current.rotation.x = 1.0;
      }
    } else {
      torso.current.rotation.x = 0;
      hips.current.rotation.z = Math.sin(t * 0.5) * 0.02;
      head.current.rotation.x = Math.sin(t * 0.4) * 0.04;
      head.current.rotation.y = Math.sin(t * 0.3) * 0.3;
      if (activity === 'chat') {
        // 立ち話：左手で身振り、うなずき
        const g = pulse(t, 4.5, 2.2);
        armL.current.rotation.set(0.25 + g * 0.35, 0, -0.15 - g * 0.1);
        foreL.current.rotation.x = 0.6 + g * (0.6 + Math.sin(t * 6) * 0.15);
        head.current.rotation.x = Math.sin(t * 2.4) * 0.06 * g;
      } else {
        armL.current.rotation.set(Math.sin(t * 0.5) * 0.03, 0, -0.1);
        foreL.current.rotation.x = 0.1;
      }
      if (activity === 'coffee' || activity === 'chat') {
        // マグカップを持ち、ときどき口へ運ぶ
        const sip = pulse(t, activity === 'chat' ? 9 : 6, 1.6);
        armR.current.rotation.set(lerp(0.35, 1.2, sip), 0, lerp(0.12, -0.28, sip));
        foreR.current.rotation.x = lerp(1.5, 2.4, sip) + Math.sin(t * 0.4) * 0.05 * (1 - sip);
        head.current.rotation.x -= sip * 0.15;
        if (sip > 0.2) head.current.rotation.y *= 1 - sip;
      } else {
        armR.current.rotation.set(-Math.sin(t * 0.5) * 0.03, 0, 0.1);
        foreR.current.rotation.x = 0.1;
      }
    }

    // クリック時：右手を振る
    if (reacting) {
      const w = Math.sin(rp * Math.PI);
      armR.current.rotation.set(-0.2 * w, 0, 2.5 * w + 0.1 * (1 - w));
      foreR.current.rotation.x = 0.3 + Math.sin(rp * Math.PI * 6) * 0.35 * w;
      head.current.rotation.y = 0;
    }

    // 小物は腕の角度を打ち消して水平に保つ
    if (mug.current) mug.current.rotation.x = -(armR.current.rotation.x + foreR.current.rotation.x) + 0.15;
    if (bento.current) bento.current.rotation.x = -(armL.current.rotation.x + foreL.current.rotation.x);
  });

  return (
    <group ref={root}>
      <group ref={hips} position-y={sit ? 0.5 : 0.86}>
        <mesh geometry={G.pelvis} material={cos ? top : bottom} castShadow={castShadow} />
        {cos?.tail === 'ball' && <mesh geometry={G.tailBall} material={mat(cos.belly === cos.main ? cos.main : cos.limb ?? cos.main, 0.95)} position={[0, 0, 0.13]} />}
        {cos?.tail === 'small' && <mesh geometry={G.tailBall} material={top} position={[0, -0.03, 0.11]} scale={0.6} />}
        {cos?.tail === 'long' && <mesh geometry={G.tailLong} material={top} position={[0.03, 0.08, 0.22]} rotation={[-0.9, 0, -0.2]} />}
        {cos?.tail === 'dino' && <mesh geometry={G.tailDino} material={top} position={[0, -0.06, 0.32]} rotation-x={Math.PI / 2 + 0.3} castShadow={castShadow} />}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.085, -0.02, 0]} rotation-x={sit ? Math.PI / 2 - 0.12 : 0}>
            <mesh geometry={G.thigh} material={bottom} position-y={-0.19} castShadow={castShadow} />
            <group position-y={-0.38} rotation-x={sit ? -(Math.PI / 2 - 0.12) : 0}>
              <mesh geometry={G.shin} material={bottom} position-y={-0.17} castShadow={castShadow} />
              <mesh geometry={G.shoe} material={shoe} position={[0, -0.36, -0.04]} castShadow={castShadow} />
            </group>
          </group>
        ))}

        <group ref={torso} position-y={0.06}>
          <mesh geometry={G.torso} material={top} position-y={0.27} scale={[1.12, 1, 0.72]} castShadow={castShadow} />
          {cos ? (
            <>
              {cos.belly !== cos.main && <mesh geometry={G.belly} material={mat(cos.belly, 0.95)} position={[0, 0.24, -0.072]} scale={[1, 1.3, 0.45]} />}
              {cos.spikes && [0.12, 0.27, 0.42].map((y) => <mesh key={y} geometry={G.spike} material={mat(cos.belly, 0.95)} position={[0, y, 0.11]} rotation-x={Math.PI / 2} />)}
            </>
          ) : (
            <Top c={c} />
          )}
          <mesh geometry={isTurtle ? G.turtle : G.neck} material={isTurtle || cos ? top : skin} position-y={0.6} />

          <group ref={head} position-y={0.75}>
            <mesh geometry={G.head} material={skin} scale={[0.92, 1.05, 0.98]} castShadow={castShadow} />
            <mesh geometry={G.ear} material={skin} position={[-0.113, -0.005, 0.005]} scale={[0.5, 0.9, 0.7]} />
            <mesh geometry={G.ear} material={skin} position={[0.113, -0.005, 0.005]} scale={[0.5, 0.9, 0.7]} />
            <mesh geometry={G.eye} material={EYE} position={[-0.042, 0.008, -0.113]} />
            <mesh geometry={G.eye} material={EYE} position={[0.042, 0.008, -0.113]} />
            <mesh geometry={G.brow} material={mat(c.hairColor, 0.6)} position={[-0.043, 0.04, -0.113]} />
            <mesh geometry={G.brow} material={mat(c.hairColor, 0.6)} position={[0.043, 0.04, -0.113]} />
            {cos ? (
              <CostumeHood s={cos} />
            ) : (
              <>
                {c.accessory !== 'beanie' && <Hair c={c} />}
                <Accessory c={c} />
              </>
            )}
          </group>

          {/* 腕 */}
          <group ref={armL} position={[-0.215, 0.49, 0]}>
            <mesh geometry={G.upperArm} material={limb} position-y={-0.13} castShadow={castShadow} />
            <group ref={foreL} position-y={-0.27}>
              <mesh geometry={G.forearm} material={limb} position-y={-0.11} castShadow={castShadow} />
              <mesh geometry={G.hand} material={hand} position-y={-0.25} />
              {activity === 'eat' && (
                <group ref={bento} position={[0.03, -0.27, -0.02]}>
                  <mesh geometry={G2.bento} material={BENTO_BOX} position={[0.04, 0.0, -0.03]} />
                  <mesh geometry={G2.rice} material={RICE} position={[0.0, 0.025, -0.03]} />
                  <mesh geometry={G2.dish} material={SIDE_DISH} position={[0.075, 0.03, -0.055]} />
                  <mesh geometry={G2.dish} material={GREEN} position={[0.08, 0.028, -0.005]} scale={0.8} />
                </group>
              )}
            </group>
          </group>
          <group ref={armR} position={[0.215, 0.49, 0]}>
            <mesh geometry={G.upperArm} material={limb} position-y={-0.13} castShadow={castShadow} />
            <group ref={foreR} position-y={-0.27}>
              <mesh geometry={G.forearm} material={limb} position-y={-0.11} castShadow={castShadow} />
              <mesh geometry={G.hand} material={hand} position-y={-0.25} />
              {(activity === 'coffee' || activity === 'chat') && (
                <group ref={mug} position={[0, -0.27, -0.03]}>
                  <mesh geometry={G.mug} material={MUG} />
                  <mesh geometry={G2.coffee} material={COFFEE} position-y={0.044} />
                </group>
              )}
              {activity === 'eat' && (
                <group position={[0, -0.3, -0.02]} rotation-x={0.5}>
                  <mesh geometry={G2.chopstick} material={CHOPSTICK} position={[-0.006, -0.06, 0]} />
                  <mesh geometry={G2.chopstick} material={CHOPSTICK} position={[0.006, -0.06, 0.006]} rotation-z={0.06} />
                </group>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
