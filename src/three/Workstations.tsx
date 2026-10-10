// ============================================================
// ワークステーション（デスク・椅子・モニター等）
// drei の <Merged> で部品ごとに InstancedMesh 化し、描画コールを削減する。
// ============================================================
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Merged } from '@react-three/drei';
import type { InstanceProps } from '@react-three/drei';
import type { FC } from 'react';
import { getGeometries, getMaterials } from './materials';
import type { DeskInfo } from './placements';

type Parts = Record<string, FC<InstanceProps>>;

const SCREEN_ON = new THREE.Color('#ffffff');
const SCREEN_OFF = new THREE.Color('#060708');

const LEG_ANGLES = [0, 1, 2, 3, 4].map((i) => (i / 5) * Math.PI * 2);

/** オフィスチェア（チェア原点は座面中心の床位置、正面は local -Z） */
export const Chair = memo(function Chair({
  P,
  position,
  rotY,
  pulled = 0,
}: {
  P: Parts;
  position: [number, number, number];
  rotY: number;
  pulled?: number;
}) {
  return (
    <group position={position} rotation-y={rotY}>
      <group position-z={pulled}>
        {LEG_ANGLES.map((a) => (
          <group key={a} rotation-y={a}>
            <P.ChairLeg position={[0, 0.05, 0.15]} />
            <P.ChairCaster position={[0, 0.025, 0.29]} />
          </group>
        ))}
        <P.ChairPole position={[0, 0.23, 0]} />
        <P.ChairSeat position={[0, 0.42, 0]} />
        <P.ChairStem position={[0, 0.55, 0.25]} />
        <P.ChairBack position={[0, 0.86, 0.28]} rotation-x={0.12} />
        <P.ArmPost position={[-0.27, 0.54, 0.02]} />
        <P.ArmPost position={[0.27, 0.54, 0.02]} />
        <P.ArmPad position={[-0.27, 0.64, 0]} />
        <P.ArmPad position={[0.27, 0.64, 0]} />
      </group>
    </group>
  );
});

const Monitor = ({ P, x, rot, screen, on }: { P: Parts; x: number; rot: number; screen: string; on: boolean }) => {
  const Screen = P[screen];
  return (
    <group position={[x, 0, -0.22]} rotation-y={rot}>
      <P.MonBase position={[0, 0.766, 0]} />
      <P.Neck position={[0, 0.875, -0.025]} />
      <P.Monitor position={[0, 1.08, 0]} />
      <Screen position={[0, 1.08, 0.0145]} color={on ? SCREEN_ON : SCREEN_OFF} />
    </group>
  );
};

const SCREEN_PART = { code: 'ScreenCode', design: 'ScreenDesign', chart: 'ScreenChart', video: 'ScreenVideo' } as const;

/** デスク1台分。原点はデスク中心、作業者は local +Z 側 */
const Workstation = memo(function Workstation({ P, desk }: { P: Parts; desk: DeskInfo }) {
  const v = desk.variant;
  const screen = SCREEN_PART[desk.screenKind];
  const occupied = !!desk.occupantId;
  const dual = v <= 2;
  return (
    <group position={[desk.x, 0, desk.z]} rotation-y={desk.rotY}>
      <P.DeskTop position={[0, 0.74, 0]} />
      <P.DeskLeg position={[-0.76, 0.36, 0]} />
      <P.DeskLeg position={[0.76, 0.36, 0]} />
      <P.DeskBeam position={[0, 0.6, -0.28]} />
      {desk.rotY === 0 && <P.Divider position={[0, 0.94, -0.4]} />}

      {dual ? (
        <>
          <Monitor P={P} x={-0.31} rot={0.16} screen={screen} on={desk.screenOn} />
          <Monitor P={P} x={0.31} rot={-0.16} screen={screen} on={desk.screenOn} />
        </>
      ) : (
        <>
          <Monitor P={P} x={-0.1} rot={0.05} screen={screen} on={desk.screenOn} />
          {v <= 4 && (
            <group position={[0.48, 0, 0.02]} rotation-y={-0.35}>
              <P.LaptopBase position={[0, 0.767, 0]} />
              <group position={[0, 0.774, -0.105]} rotation-x={-0.25}>
                <P.LaptopLid position={[0, 0.105, 0]} />
                <P.LaptopScreen position={[0, 0.105, 0.0045]} color={desk.screenOn ? SCREEN_ON : SCREEN_OFF} />
              </group>
            </group>
          )}
        </>
      )}

      <P.Keyboard position={[-0.05, 0.768, 0.24]} />
      <P.Mouse position={[0.3, 0.772, 0.25]} scale={[0.06, 0.03, 0.095]} />
      {v % 2 === 0 && <P.Mug position={[-0.64, 0.805, -0.02]} />}
      {v % 3 === 0 && (
        <group position={[0.66, 0, -0.26]}>
          <P.MiniPot position={[0, 0.795, 0]} />
          <P.MiniLeaf position={[0, 0.86, 0]} />
        </group>
      )}
      {(v === 1 || v === 4) && <P.Notebook position={[-0.52, 0.767, 0.2]} rotation-y={0.2} />}

      <Chair P={P} position={[0, 0, 0.78]} rotY={occupied ? 0 : ((v % 3) - 1) * 0.25} pulled={occupied ? -0.08 : 0.12 + (v % 3) * 0.04} />
    </group>
  );
});

export interface StandaloneChair {
  key: string;
  x: number;
  z: number;
  rotY: number;
}

export const Workstations = ({ desks, chairs }: { desks: DeskInfo[]; chairs: StandaloneChair[] }) => {
  const meshes = useMemo(() => {
    const g = getGeometries();
    const m = getMaterials();
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat);
    // Merged は geometry.uuid をキーにするため、同一ジオメトリを複数部品で使う場合は clone する
    return {
      DeskTop: mk(g.deskTop, m.deskTop),
      DeskLeg: mk(g.deskLeg, m.metalDark),
      DeskBeam: mk(g.deskBeam, m.metalDark),
      Divider: mk(g.divider, m.fabricPanel),
      Monitor: mk(g.monitor, m.monitorBody),
      Neck: mk(g.monitorNeck, m.metalDark),
      MonBase: mk(g.monitorBase, m.metalDark),
      ScreenCode: mk(g.screen, m.screenCode),
      ScreenDesign: mk(g.screen.clone(), m.screenDesign),
      ScreenChart: mk(g.screen.clone(), m.screenChart),
      ScreenVideo: mk(g.screen.clone(), m.screenVideo),
      Keyboard: mk(g.keyboard, m.keyboard),
      Mouse: mk(g.mouse, m.keyboard),
      LaptopBase: mk(g.laptopBase, m.laptop),
      LaptopLid: mk(g.laptopLid, m.laptop),
      LaptopScreen: mk(g.laptopScreen, m.screenCode),
      Mug: mk(g.mug, m.ceramic),
      Notebook: mk(g.notebook, m.paper),
      MiniPot: mk(g.miniPot, m.pot),
      MiniLeaf: mk(g.miniLeaf, m.leafLight),
      ChairSeat: mk(g.chairSeat, m.chairFabric),
      ChairBack: mk(g.chairBack, m.chairMesh),
      ChairStem: mk(g.chairStem, m.metalDark),
      ChairPole: mk(g.chairPole, m.silver),
      ChairLeg: mk(g.chairLeg, m.metalDark),
      ChairCaster: mk(g.chairCaster, m.chairMesh),
      ArmPost: mk(g.chairArmPost, m.metalDark),
      ArmPad: mk(g.chairArmPad, m.chairMesh),
    };
  }, []);

  useEffect(
    () => () => {
      meshes.ScreenDesign.geometry.dispose();
      meshes.ScreenChart.geometry.dispose();
      meshes.ScreenVideo.geometry.dispose();
    },
    [meshes],
  );

  return (
    <Merged meshes={meshes} limit={1600} frames={3} castShadow receiveShadow frustumCulled={false}>
      {(P: Parts) => (
        <>
          {desks.map((d) => (
            <Workstation key={d.key} P={P} desk={d} />
          ))}
          {chairs.map((c) => (
            <Chair key={c.key} P={P} position={[c.x, 0, c.z]} rotY={c.rotY} />
          ))}
        </>
      )}
    </Merged>
  );
};
