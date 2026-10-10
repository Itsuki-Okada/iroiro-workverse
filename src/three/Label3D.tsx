// ============================================================
// 3D空間に追従するHTMLラベル（軽量版）
// drei の <Html> は React 19 でアンマウント時に同期 unmount 警告が出るため、
// 投影計算のみを行い、ルートの破棄は描画後に遅延させる独自実装を使う。
// ============================================================
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

const v = new THREE.Vector3();

export const Label3D = ({
  position,
  children,
  zIndex = 10,
}: {
  position: [number, number, number];
  children: ReactNode;
  zIndex?: number;
}) => {
  const gl = useThree((s) => s.gl);
  const group = useRef<THREE.Group>(null!);
  const [el] = useState(() => document.createElement('div'));
  const root = useRef<Root | null>(null);

  useLayoutEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;
    el.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;z-index:${zIndex};will-change:transform;display:none`;
    parent.appendChild(el);
    const r = createRoot(el);
    root.current = r;
    return () => {
      root.current = null;
      // 描画中の同期アンマウントを避けるため次のタスクで破棄
      setTimeout(() => {
        r.unmount();
        el.remove();
      }, 0);
    };
  }, [gl, el, zIndex]);

  useLayoutEffect(() => {
    root.current?.render(<div style={{ transform: 'translate(-50%, -50%)' }}>{children}</div>);
  });

  useFrame(({ camera, size }) => {
    group.current.getWorldPosition(v);
    v.project(camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
    el.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });

  return <group ref={group} position={position} />;
};
