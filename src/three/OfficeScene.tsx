// ============================================================
// 3Dオフィス シーンのルート
// ============================================================
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { companyLevelInfo, companyXp } from '../game/rules';
import { todayKey } from '../lib/utils';
import { Building } from './Building';
import { Zones } from './Zones';
import { Interior } from './Interior';
import type { MediaStats } from './Interior';
import { Workstations } from './Workstations';
import type { StandaloneChair } from './Workstations';
import { OfficeAvatars } from './OfficeAvatars';
import { Effects } from './Effects';
import { CameraRig } from './CameraRig';
import { FloorPicker } from './FloorPicker';
import { MEETING_SEATS } from './layout';
import { CEO_CHAIR, useOfficeLayout } from './placements';
import { FloorPlan2D } from '../ui/FloorPlan2D';
import { ATMOSPHERE, useDayPhase, useSeason } from './atmosphere';
import { SeasonalDecor } from './Seasonal';
import { OfficeCat } from './OfficeCat';
import { getMaterials } from './materials';
import { useIsMobile } from '../ui/hooks';

/** スマホでは自動的に軽量モード（影・追加光源なし、低解像度） */
const useQuality = () => {
  const setting = useApp((s) => s.business.settings.graphicsQuality);
  return useIsMobile() ? 'low' : setting;
};

const STATIC_CHAIRS: StandaloneChair[] = [
  ...MEETING_SEATS.map((s, i) => ({ key: `meet-${i}`, x: s.x, z: s.z, rotY: s.rotY })),
  { key: 'ceo', x: CEO_CHAIR.x, z: CEO_CHAIR.z, rotY: CEO_CHAIR.rotY },
];

export const useOfficeLevel = () => {
  const ledger = useApp((s) => s.business.xpLedger);
  const settings = useApp((s) => s.business.settings);
  return useMemo(() => {
    const auto = companyLevelInfo(companyXp({ xpLedger: ledger })).level;
    return settings.autoOfficeUpgrades ? auto : settings.manualOfficeLevel;
  }, [ledger, settings.autoOfficeUpgrades, settings.manualOfficeLevel]);
};

/** 影はほぼ静的なため、シャドウマップの更新を間引いて負荷を下げる */
const ShadowThrottle = ({ every = 3 }: { every?: number }) => {
  const gl = useThree((s) => s.gl);
  const frame = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useFrame(() => {
    if (frame.current++ % every === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
};

/** 時間帯に応じた光・背景・露出 */
const Lights = ({ quality }: { quality: 'high' | 'low' }) => {
  const a = ATMOSPHERE[useDayPhase()];
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = a.exposure;
    // 天井照明の発光色（夜は暖色）
    getMaterials().lightPanel.emissive.set(a.panel);
  }, [gl, a]);
  return (
    <>
      <color attach="background" args={[a.bg]} />
      <hemisphereLight args={[a.skyColor, a.groundColor, a.hemi]} />
      <ambientLight intensity={a.ambient} />
      <directionalLight
        position={a.sunPos}
        intensity={a.sunIntensity}
        color={a.sun}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-near={2}
        shadow-camera-far={120}
      />
      <directionalLight position={[-30, 20, -10]} intensity={0.25} color="#9fc7d6" />
    </>
  );
};

const SceneFog = ({ mobile }: { mobile: boolean }) => {
  const a = ATMOSPHERE[useDayPhase()];
  return <fog attach="fog" args={mobile ? [a.bg, 160, 420] : [a.bg, 90, 330]} />;
};

/** 反射用の環境マップ（外部HDRを使わず Lightformer で生成） */
const OfficeEnvironment = () => (
  <Environment resolution={128} frames={1}>
    <color attach="background" args={['#0c0e11']} />
    <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 6, 1]} />
    <Lightformer form="rect" intensity={1.2} position={[-12, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} color="#cfe6ee" />
    <Lightformer form="rect" intensity={1.2} position={[12, 3, 0]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
    <Lightformer form="ring" intensity={0.8} position={[0, 2, -10]} scale={4} color="#38d6e8" />
  </Environment>
);

/** 初回フレーム描画（シェーダーコンパイル完了）を通知 */
const ReadySignal = () => {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => useUi.getState().setSceneReady());
  });
  return null;
};

const SceneContent = () => {
  const layout = useOfficeLayout();
  const departments = useApp((s) => s.business.departments);
  const employees = useApp((s) => s.business.employees);
  const attendance = useApp((s) => s.business.attendance);
  const tasks = useApp((s) => s.business.tasks);
  const companyName = useApp((s) => s.business.company.name);
  const quality = useQuality();
  const officeLevel = useOfficeLevel();
  const phase = useDayPhase();
  const season = useSeason();

  const counts = useMemo(() => {
    const c: Record<string, { present: number; total: number }> = {};
    for (const d of departments) c[d.id] = { present: 0, total: 0 };
    for (const e of employees) {
      const x = c[e.departmentId];
      if (!x) continue;
      x.total++;
      if ((attendance[e.id]?.status ?? 'off') !== 'off') x.present++;
    }
    return c;
  }, [departments, employees, attendance]);

  const stats: MediaStats = useMemo(() => {
    const today = todayKey();
    const todays = tasks.filter((t) => t.dueDate === today || (t.completedAt && t.completedAt.slice(0, 10) === today));
    return {
      present: Object.values(attendance).filter((a) => a.status !== 'off').length,
      total: employees.length,
      done: todays.filter((t) => t.status === 'done').length,
      tasks: todays.length,
      level: officeLevel,
      companyName,
    };
  }, [tasks, attendance, employees.length, officeLevel, companyName]);

  return (
    <>
      <Lights quality={quality} />
      {quality === 'high' && <ShadowThrottle />}
      <Suspense fallback={null}>
        <OfficeEnvironment />
      </Suspense>
      <Building quality={quality} phase={phase} />
      <Zones departments={departments} counts={counts} desks={layout.desks} />
      <Interior officeLevel={officeLevel} quality={quality} companyName={companyName} stats={stats} phase={phase} />
      <Workstations desks={layout.desks} chairs={STATIC_CHAIRS} />
      <SeasonalDecor season={season} desks={layout.desks} />
      <OfficeAvatars layout={layout} />
      <OfficeCat desks={layout.desks} />
      <Effects placements={layout.placements} />
      <CameraRig placements={layout.placements} homeSeats={layout.homeSeats} />
      <FloorPicker />
      <ReadySignal />
    </>
  );
};

// ---------- WebGL 対応チェック & エラー時の代替表示 ----------

export const hasWebGL = (() => {
  let cached: boolean | null = null;
  return () => {
    if (cached !== null) return cached;
    try {
      const c = document.createElement('canvas');
      cached = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      cached = false;
    }
    return cached;
  };
})();

class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('[WORKVERSE] 3D描画でエラーが発生しました', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export const OfficeScene = () => {
  const view = useUi((s) => s.view);
  const quality = useQuality();
  const mobile = useIsMobile();
  const active = view === 'office';
  // 解像度：スマホは端末の画素密度（最大2倍）から開始し、重い端末では自動で少し下げる
  const maxDpr = mobile ? Math.min(2, window.devicePixelRatio || 1) : quality === 'high' ? 1.5 : 1.25;
  const minDpr = mobile ? Math.min(1.25, maxDpr) : 1;
  const [dpr, setDpr] = useState(maxDpr);
  useEffect(() => setDpr(maxDpr), [maxDpr]);

  if (!hasWebGL()) return <FloorPlan2D reason="お使いの環境では WebGL が利用できないため、2Dフロアマップを表示しています。" />;

  return (
    <SceneErrorBoundary fallback={<FloorPlan2D reason="3D表示でエラーが発生したため、2Dフロアマップに切り替えました。" />}>
      <Canvas
        shadows={quality === 'high' ? { type: THREE.PCFSoftShadowMap } : false}
        dpr={dpr}
        frameloop={active ? 'always' : 'demand'}
        camera={{ fov: 32, near: 0.5, far: 500, position: [34, 40, 44] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
        onPointerMissed={() => document.body.style.removeProperty('cursor')}
      >
        <SceneFog mobile={mobile} />
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(minDpr, +(d - 0.25).toFixed(2)))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
        />
        <SceneContent />
      </Canvas>
    </SceneErrorBoundary>
  );
};
