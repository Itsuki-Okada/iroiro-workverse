// ============================================================
// 3D空間に追従するHTMLラベル（軽量版）
// drei の <Html> は React 19 でアンマウント時に同期 unmount 警告が出るため、
// 投影計算のみを行い、ルートの破棄は描画後に遅延させる独自実装を使う。
// ============================================================
import { useLayoutEffect, useRef } from 'react';
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
  const el = useRef<HTMLDivElement | null>(null);
  const root = useRef<Root | null>(null);
  const content = useRef<ReactNode>(children);
  content.current = children;

  useLayoutEffect(() => {
    const parent = gl.domElement.parentElement;
    if (!parent) return;
    // エフェクトの実行ごとに専用の要素とルートを作る（StrictMode の二重実行でも衝突しない）
    const node = document.createElement('div');
    node.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;z-index:${zIndex};will-change:transform;display:none`;
    parent.appendChild(node);
    const r = createRoot(node);
    r.render(<div style={{ transform: 'translate(-50%, -50%)' }}>{content.current}</div>);
    el.current = node;
    root.current = r;
    return () => {
      if (root.current === r) root.current = null;
      if (el.current === node) el.current = null;
      // 描画中の同期アンマウントを避けるため次のタスクで破棄
      setTimeout(() => {
        r.unmount();
        node.remove();
      }, 0);
    };
  }, [gl, zIndex]);

  useLayoutEffect(() => {
    root.current?.render(<div style={{ transform: 'translate(-50%, -50%)' }}>{children}</div>);
  });

  useFrame(({ camera, size }) => {
    const node = el.current;
    if (!node) return;
    group.current.getWorldPosition(v);
    v.project(camera);
    const visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
    node.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });

  return <group ref={group} position={position} />;
};
