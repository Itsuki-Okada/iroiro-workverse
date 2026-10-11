// ============================================================
// ロゴを「SVGで線を引いて描く」アニメーション（読み込み画面用）
// 各パスの輪郭を順番に描き、描き終わったら塗りつぶす。
// ============================================================
import type { CSSProperties } from 'react';
import { LOGO_MARK_PATHS, LOGO_TEXT_PATHS, LOGO_TRANSFORM, LOGO_VIEWBOX } from './logoPaths';

/** 全体の描画時間の目安（秒） */
export const LOGO_DRAW_SECONDS = 3.4;

const pathStyle = (delay: number, draw: number, color: string): CSSProperties => ({
  fill: '#ffffff',
  fillOpacity: 0,
  stroke: color,
  strokeOpacity: 1,
  strokeDasharray: 1,
  strokeDashoffset: 1,
  animation: `wv-draw ${draw}s cubic-bezier(.6,.05,.3,1) ${delay}s forwards, wv-fill 0.5s ease-out ${delay + draw * 0.85}s forwards`,
});

export const LogoDraw = ({ className = '', accent = '#38d6e8' }: { className?: string; accent?: string }) => (
  <svg viewBox={LOGO_VIEWBOX} className={className} role="img" aria-label="iroiro Co.">
    <g transform={LOGO_TRANSFORM}>
      {/* 上段のマーク：左から順に描く */}
      {LOGO_MARK_PATHS.map((d, i) => (
        <path key={`m${i}`} d={d} pathLength={1} vectorEffect="non-scaling-stroke" strokeWidth={2.2} strokeLinejoin="round" style={pathStyle(0.15 + i * 0.22, 1.25, accent)} />
      ))}
      {/* 下段の文字：少し遅れて、速めに描く */}
      {LOGO_TEXT_PATHS.map((d, i) => (
        <path key={`t${i}`} d={d} pathLength={1} vectorEffect="non-scaling-stroke" strokeWidth={1.4} strokeLinejoin="round" style={pathStyle(1.3 + i * 0.07, 0.75, '#9fb4c2')} />
      ))}
    </g>
  </svg>
);
