// ============================================================
// プログラム生成テクスチャ（外部アセット不使用）
// 共有テクスチャはモジュール内でキャッシュし再利用する。
// ============================================================
import * as THREE from 'three';

const JP_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
const EN_FONT = '"Inter", "Helvetica Neue", "Segoe UI", Arial, sans-serif';

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};

const toTexture = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
};

const cache = new Map<string, THREE.Texture>();
const cached = (key: string, make: () => THREE.Texture) => {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
};

/** 部署サイン（壁面サイン） */
export const makeSignTexture = (name: string, nameEn: string, color: string) => {
  const [c, g] = makeCanvas(1024, 256);
  g.fillStyle = '#121518';
  g.fillRect(0, 0, 1024, 256);
  // 細いアクセントライン
  g.fillStyle = color;
  g.fillRect(48, 70, 6, 116);
  g.fillStyle = '#eef2f5';
  g.font = `600 84px ${JP_FONT}`;
  g.textBaseline = 'middle';
  g.fillText(name, 84, 110);
  g.fillStyle = '#8f9aa5';
  g.font = `500 34px ${EN_FONT}`;
  g.fillText(nameEn.split('').join(String.fromCharCode(8202)), 88, 182);
  return toTexture(c);
};

/** エリア名の床サイン（半透明） */
export const makeFloorLabelTexture = (nameEn: string) => {
  const [c, g] = makeCanvas(1024, 160);
  g.clearRect(0, 0, 1024, 160);
  g.fillStyle = 'rgba(220,230,238,0.55)';
  g.font = `700 92px ${EN_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(nameEn.split('').join(' '), 512, 84);
  return toTexture(c);
};

/** エディタ風の画面（開発系） */
export const screenCodeTexture = () =>
  cached('screen-code', () => {
    const [c, g] = makeCanvas(512, 288);
    g.fillStyle = '#0d1117';
    g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#161b22';
    g.fillRect(0, 0, 96, 288);
    g.fillRect(0, 0, 512, 18);
    const palette = ['#7ee0ee', '#c7d0d9', '#8fb6ff', '#e6c07b', '#9ad4a4', '#5c6773'];
    for (let i = 0; i < 26; i++) {
      const y = 28 + i * 10;
      let x = 108 + (i % 5 === 0 ? 0 : 14 + ((i * 7) % 3) * 14);
      const segs = 2 + ((i * 13) % 4);
      for (let s = 0; s < segs; s++) {
        const w = 18 + ((i * 31 + s * 17) % 70);
        g.fillStyle = palette[(i + s * 3) % palette.length];
        g.fillRect(x, y, w, 5);
        x += w + 8;
      }
    }
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i === 4 ? '#2b6f7a' : '#2a3038';
      g.fillRect(10, 28 + i * 15, 60 - ((i * 11) % 30), 6);
    }
    return toTexture(c);
  });

/** デザインツール風の画面（クリエイティブ系） */
export const screenDesignTexture = () =>
  cached('screen-design', () => {
    const [c, g] = makeCanvas(512, 288);
    g.fillStyle = '#1b1d21';
    g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#25282d';
    g.fillRect(0, 0, 70, 288);
    g.fillRect(442, 0, 70, 288);
    g.fillStyle = '#e9e7e2';
    g.fillRect(100, 34, 150, 220);
    g.fillRect(270, 34, 150, 110);
    g.fillStyle = '#b59cff';
    g.fillRect(112, 50, 126, 70);
    g.fillStyle = '#38d6e8';
    g.beginPath();
    g.arc(345, 89, 34, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2b2f36';
    for (let i = 0; i < 6; i++) g.fillRect(112, 134 + i * 16, 126 - i * 12, 7);
    g.fillStyle = '#f2b45a';
    g.fillRect(270, 156, 150, 98);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = '#3a3e45';
      g.fillRect(452, 20 + i * 20, 50, 8);
      g.fillRect(10, 20 + i * 20, 50, 8);
    }
    return toTexture(c);
  });

/** ダッシュボード風の画面（営業・マーケ・管理） */
export const screenChartTexture = () =>
  cached('screen-chart', () => {
    const [c, g] = makeCanvas(512, 288);
    g.fillStyle = '#10141a';
    g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#18202a';
    for (let i = 0; i < 3; i++) g.fillRect(16 + i * 164, 16, 150, 60);
    g.fillStyle = '#e6edf3';
    for (let i = 0; i < 3; i++) g.fillRect(28 + i * 164, 30, 70, 12);
    g.fillStyle = '#38d6e8';
    for (let i = 0; i < 3; i++) g.fillRect(28 + i * 164, 52, 40 + i * 20, 8);
    g.fillStyle = '#18202a';
    g.fillRect(16, 90, 320, 182);
    g.fillRect(348, 90, 148, 182);
    for (let i = 0; i < 12; i++) {
      const h = 30 + ((i * 47) % 110);
      g.fillStyle = i % 4 === 3 ? '#4fa3ff' : '#2e8f9c';
      g.fillRect(34 + i * 25, 256 - h, 14, h);
    }
    g.strokeStyle = '#f2b45a';
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 12; i++) g.lineTo(41 + i * 25, 160 - Math.sin(i * 0.8) * 30 - i * 3);
    g.stroke();
    g.fillStyle = '#7fd1a8';
    g.beginPath();
    g.moveTo(422, 180);
    g.arc(422, 180, 52, -Math.PI / 2, Math.PI * 0.9);
    g.fill();
    g.fillStyle = '#2b3440';
    g.beginPath();
    g.moveTo(422, 180);
    g.arc(422, 180, 52, Math.PI * 0.9, Math.PI * 1.5);
    g.fill();
    return toTexture(c);
  });

/** 動画編集ソフト風の画面（タイムライン） */
export const screenVideoTexture = () =>
  cached('screen-video', () => {
    const [c, g] = makeCanvas(512, 288);
    g.fillStyle = '#121418';
    g.fillRect(0, 0, 512, 288);
    // プレビュー
    const grad = g.createLinearGradient(140, 12, 380, 150);
    grad.addColorStop(0, '#3a4a5c');
    grad.addColorStop(1, '#c98a6a');
    g.fillStyle = grad;
    g.fillRect(140, 12, 232, 130);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.moveTo(246, 60);
    g.lineTo(246, 94);
    g.lineTo(274, 77);
    g.fill();
    g.fillStyle = '#1b1e23';
    g.fillRect(8, 12, 124, 130);
    g.fillRect(380, 12, 124, 130);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = ['#4f6273', '#7a5a4a', '#55705f'][i % 3];
      g.fillRect(16 + (i % 2) * 58, 20 + Math.floor(i / 2) * 40, 50, 32);
    }
    // タイムライン
    g.fillStyle = '#1a1d22';
    g.fillRect(0, 152, 512, 136);
    const tracks = ['#5b8def', '#5b8def', '#b07cf0', '#3fbf8f', '#3fbf8f'];
    tracks.forEach((col, t) => {
      let x = 10;
      for (let k = 0; k < 6; k++) {
        const w = 30 + ((t * 37 + k * 53) % 70);
        g.fillStyle = col;
        g.globalAlpha = 0.85;
        g.fillRect(x, 162 + t * 24, w, 18);
        x += w + 4;
      }
    });
    g.globalAlpha = 1;
    g.fillStyle = '#f26b6b';
    g.fillRect(232, 152, 2, 136);
    return toTexture(c);
  });

/** 会議室のプレゼン画面 */
export const slideTexture = () =>
  cached('slide', () => {
    const [c, g] = makeCanvas(1024, 576);
    g.fillStyle = '#f3f4f5';
    g.fillRect(0, 0, 1024, 576);
    g.fillStyle = '#14181d';
    g.fillRect(0, 0, 1024, 90);
    g.fillStyle = '#38d6e8';
    g.fillRect(60, 36, 12, 20);
    g.fillStyle = '#ffffff';
    g.font = `600 36px ${JP_FONT}`;
    g.textBaseline = 'middle';
    g.fillText('Q4 プロジェクト進捗レビュー', 90, 46);
    g.fillStyle = '#1d232a';
    g.font = `600 30px ${JP_FONT}`;
    g.fillText('ハイライト', 60, 150);
    g.fillStyle = '#5b6570';
    for (let i = 0; i < 4; i++) g.fillRect(60, 200 + i * 52, 360 - i * 40, 16);
    const bars = [180, 240, 210, 300, 340];
    bars.forEach((h, i) => {
      g.fillStyle = i === 4 ? '#2bb3c4' : '#a9b4bf';
      g.fillRect(540 + i * 82, 500 - h, 52, h);
    });
    return toTexture(c);
  });

/** エントランスのロゴウォール（社名ロゴ画像を白抜きで表示） */
export const LOGO_URL = `${import.meta.env.BASE_URL}iroiro-logo-white.png`;

export const logoTexture = (companyName: string) => {
  const [c, g] = makeCanvas(1600, 640);
  const tex = toTexture(c);
  const paint = (img?: HTMLImageElement) => {
    const grad = g.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, '#1a1d21');
    grad.addColorStop(1, '#121417');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1600, 640);
    if (img) {
      const h = 470;
      const w = (img.width / img.height) * h;
      g.drawImage(img, (1600 - w) / 2, (640 - h) / 2, w, h);
    } else {
      g.fillStyle = '#e8ecef';
      g.font = `600 140px ${EN_FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(companyName, 800, 320);
    }
    tex.needsUpdate = true;
  };
  paint();
  const img = new Image();
  img.onload = () => paint(img);
  img.src = LOGO_URL;
  return tex;
};

/** 旧ロゴ（WORKVERSE ワードマーク） */
export const workverseLogoTexture = (companyName: string) => {
  const [c, g] = makeCanvas(1600, 480);
  const grad = g.createLinearGradient(0, 0, 0, 480);
  grad.addColorStop(0, '#1a1d21');
  grad.addColorStop(1, '#121417');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1600, 480);
  // ロゴマーク
  g.strokeStyle = '#38d6e8';
  g.lineWidth = 16;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(250, 170);
  g.lineTo(300, 310);
  g.lineTo(355, 210);
  g.lineTo(410, 310);
  g.lineTo(460, 170);
  g.stroke();
  const tg = g.createLinearGradient(0, 160, 0, 320);
  tg.addColorStop(0, '#f4f6f8');
  tg.addColorStop(1, '#a9b0b8');
  g.fillStyle = tg;
  g.font = `700 150px ${EN_FONT}`;
  g.textBaseline = 'middle';
  g.fillText('WORKVERSE', 520, 240);
  g.fillStyle = '#7d8893';
  g.font = `500 40px ${EN_FONT}`;
  g.fillText(companyName.toUpperCase().split('').join(' '), 528, 360);
  return toTexture(c);
};

/** 夜景ビル窓（遠景） */
export const cityWindowTexture = () =>
  cached('city', () => {
    const [c, g] = makeCanvas(128, 256);
    g.fillStyle = '#0d1014';
    g.fillRect(0, 0, 128, 256);
    for (let y = 6; y < 256; y += 10) {
      for (let x = 6; x < 128; x += 12) {
        const r = Math.random();
        g.fillStyle = r > 0.78 ? '#c9d6e0' : r > 0.7 ? '#6f8597' : '#161b21';
        g.fillRect(x, y, 7, 5);
      }
    }
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });

/** 木目調のスラット壁 */
export const slatTexture = () =>
  cached('slat', () => {
    const [c, g] = makeCanvas(512, 64);
    g.fillStyle = '#16181b';
    g.fillRect(0, 0, 512, 64);
    for (let x = 0; x < 512; x += 16) {
      const v = 38 + ((x * 7) % 9);
      g.fillStyle = `rgb(${v + 14},${v + 8},${v})`;
      g.fillRect(x + 2, 0, 11, 64);
    }
    const t = toTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });

/** タイルカーペットの微細なパターン */
export const carpetTexture = () =>
  cached('carpet', () => {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const v = 110 + Math.floor(Math.random() * 40);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(60,60,60,0.5)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 128, 128);
    g.strokeRect(128, 128, 128, 128);
    g.strokeRect(128, 0, 128, 128);
    g.strokeRect(0, 128, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  });

/** メディアウォール（会社の指標を表示・動的更新） */
export const drawMediaWall = (
  canvas: HTMLCanvasElement,
  stats: { present: number; total: number; done: number; tasks: number; level: number; companyName: string },
) => {
  const g = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0b1418');
  grad.addColorStop(1, '#0d1016');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#38d6e8';
  g.font = `600 30px ${EN_FONT}`;
  g.fillText('LIVE  ·  ' + stats.companyName.toUpperCase(), 40, 56);
  const items = [
    ['出勤', `${stats.present}/${stats.total}`],
    ['本日完了', `${stats.done}/${stats.tasks}`],
    ['オフィスLv', `${stats.level}`],
  ];
  items.forEach(([k, v], i) => {
    const x = 40 + i * ((W - 80) / 3);
    g.fillStyle = '#7d8893';
    g.font = `500 30px ${JP_FONT}`;
    g.fillText(k, x, 130);
    g.fillStyle = '#f1f4f6';
    g.font = `700 92px ${EN_FONT}`;
    g.fillText(v, x, 230);
  });
  const ratio = stats.tasks ? stats.done / stats.tasks : 0;
  g.fillStyle = '#1c252c';
  g.fillRect(40, 280, W - 80, 14);
  g.fillStyle = '#38d6e8';
  g.fillRect(40, 280, (W - 80) * ratio, 14);
};
