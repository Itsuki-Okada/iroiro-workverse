// ============================================================
// 時間帯（朝・昼・夕方・夜）と季節イベントの判定
// ============================================================
import { useEffect, useState } from 'react';
import { useApp } from '../store/appStore';

export type DayPhase = 'morning' | 'day' | 'evening' | 'night';
export type Season = 'none' | 'halloween' | 'christmas' | 'newyear';

export const PHASE_LABEL: Record<DayPhase, string> = { morning: '朝', day: '昼', evening: '夕方', night: '夜' };
export const SEASON_LABEL: Record<Season, string> = { none: 'なし', halloween: 'ハロウィン', christmas: 'クリスマス', newyear: 'お正月' };

export const phaseOf = (d: Date): DayPhase => {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
};

export const seasonOf = (d: Date): Season => {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (m === 10) return 'halloween';
  if (m === 12 && day <= 25) return 'christmas';
  if ((m === 12 && day >= 26) || (m === 1 && day <= 10)) return 'newyear';
  return 'none';
};

export interface Atmosphere {
  bg: string;
  ground: string;
  skyColor: string;
  groundColor: string;
  hemi: number;
  ambient: number;
  sun: string;
  sunIntensity: number;
  sunPos: [number, number, number];
  exposure: number;
  /** 遠景ビルの窓明かり */
  city: number;
  /** 天井照明の発光色 */
  panel: string;
  /** 室内の実光源の色・強さ倍率 */
  interior: string;
  interiorBoost: number;
}

export const ATMOSPHERE: Record<DayPhase, Atmosphere> = {
  morning: {
    bg: '#1d2836',
    ground: '#1a1f26',
    skyColor: '#ffe6c7',
    groundColor: '#2a2c31',
    hemi: 1.0,
    ambient: 0.3,
    sun: '#ffd6a0',
    sunIntensity: 2.8,
    sunPos: [42, 18, 26],
    exposure: 1.32,
    city: 0.2,
    panel: '#f4f8ff',
    interior: '#f2f6ff',
    interiorBoost: 0.9,
  },
  day: {
    bg: '#2a3644',
    ground: '#1d222a',
    skyColor: '#eef4fa',
    groundColor: '#2a2e34',
    hemi: 1.1,
    ambient: 0.32,
    sun: '#fff6ea',
    sunIntensity: 2.5,
    sunPos: [22, 40, 16],
    exposure: 1.33,
    city: 0.12,
    panel: '#f4f8ff',
    interior: '#f2f6ff',
    interiorBoost: 0.9,
  },
  evening: {
    bg: '#2b1e22',
    ground: '#1a1416',
    skyColor: '#ffb07e',
    groundColor: '#2b2226',
    hemi: 0.85,
    ambient: 0.24,
    sun: '#ff8f4a',
    sunIntensity: 2.4,
    sunPos: [-44, 14, 22],
    exposure: 1.26,
    city: 0.55,
    panel: '#fff1dd',
    interior: '#ffe7c9',
    interiorBoost: 1.1,
  },
  night: {
    bg: '#06080c',
    ground: '#07090c',
    skyColor: '#8ea6cf',
    groundColor: '#14161a',
    hemi: 0.5,
    ambient: 0.14,
    sun: '#a9bcff',
    sunIntensity: 0.55,
    sunPos: [-22, 40, -12],
    exposure: 1.18,
    city: 1.0,
    panel: '#ffe1b5',
    interior: '#ffd9a6',
    interiorBoost: 1.45,
  },
};

/** 1分ごとに時刻を確認して現在の時間帯を返す（設定で固定も可能） */
export const useDayPhase = (): DayPhase => {
  const setting = useApp((s) => s.business.settings.timeOfDay ?? 'auto');
  const [auto, setAuto] = useState(() => phaseOf(new Date()));
  useEffect(() => {
    const t = setInterval(() => setAuto(phaseOf(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);
  return setting === 'auto' ? auto : setting;
};

export const useSeason = (): Season => {
  const setting = useApp((s) => s.business.settings.season ?? 'auto');
  return setting === 'auto' ? seasonOf(new Date()) : setting;
};
