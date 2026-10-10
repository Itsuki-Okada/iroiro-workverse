// ============================================================
// 共有マテリアル・ジオメトリ
// アプリ全体で使い回すため、モジュールスコープで1度だけ生成する。
// ============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { screenChartTexture, screenCodeTexture, screenDesignTexture, screenVideoTexture } from './textures';

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

let _mats: ReturnType<typeof createMaterials> | null = null;

const createMaterials = () => ({
  // 構造
  slab: std({ color: '#15171a', roughness: 0.9 }),
  concrete: std({ color: '#1d2024', roughness: 0.42, metalness: 0.05 }),
  wallPanel: std({ color: '#24272c', roughness: 0.75 }),
  wallLight: std({ color: '#3a3f46', roughness: 0.7 }),
  frame: std({ color: '#2f3338', roughness: 0.32, metalness: 0.85 }),
  silver: std({ color: '#b3b8be', roughness: 0.24, metalness: 0.95 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: '#b9d4dc',
    roughness: 0.06,
    metalness: 0.1,
    transparent: true,
    opacity: 0.14,
    envMapIntensity: 1.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  glassFrosted: new THREE.MeshPhysicalMaterial({
    color: '#dfe7ea',
    roughness: 0.6,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  // デスク
  deskTop: std({ color: '#d6d3cc', roughness: 0.5 }),
  deskTopDark: std({ color: '#3a332d', roughness: 0.55 }),
  metalDark: std({ color: '#1f2226', roughness: 0.38, metalness: 0.75 }),
  fabricPanel: std({ color: '#4a5058', roughness: 0.95 }),
  monitorBody: std({ color: '#0f1113', roughness: 0.35, metalness: 0.6 }),
  screenCode: new THREE.MeshBasicMaterial({ map: screenCodeTexture(), toneMapped: false }),
  screenDesign: new THREE.MeshBasicMaterial({ map: screenDesignTexture(), toneMapped: false }),
  screenChart: new THREE.MeshBasicMaterial({ map: screenChartTexture(), toneMapped: false }),
  screenVideo: new THREE.MeshBasicMaterial({ map: screenVideoTexture(), toneMapped: false }),
  keyboard: std({ color: '#1b1e22', roughness: 0.6, metalness: 0.2 }),
  laptop: std({ color: '#a7acb2', roughness: 0.3, metalness: 0.9 }),
  ceramic: std({ color: '#ecebe8', roughness: 0.35 }),
  paper: std({ color: '#f1efe9', roughness: 0.9 }),
  // 椅子
  chairFabric: std({ color: '#2a2e33', roughness: 0.92 }),
  chairMesh: std({ color: '#17191c', roughness: 0.8 }),
  // インテリア
  wood: std({ color: '#7a5d44', roughness: 0.55 }),
  woodDark: std({ color: '#4a382b', roughness: 0.6 }),
  stone: std({ color: '#e3e1dc', roughness: 0.25, metalness: 0.05 }),
  stoneDark: std({ color: '#2b2d31', roughness: 0.2, metalness: 0.1 }),
  sofa: std({ color: '#3d434b', roughness: 0.95 }),
  sofaLight: std({ color: '#8d9399', roughness: 0.95 }),
  rug: std({ color: '#3a3f46', roughness: 1 }),
  floorStone: std({ color: '#8d8b87', roughness: 0.28, metalness: 0.05 }),
  floorWood: std({ color: '#6b5240', roughness: 0.6 }),
  whiteboard: std({ color: '#f4f5f6', roughness: 0.2 }),
  cabinet: std({ color: '#c9c6c0', roughness: 0.5 }),
  leaf: std({ color: '#2f5b3a', roughness: 0.75, flatShading: true }),
  leafLight: std({ color: '#47804f', roughness: 0.75, flatShading: true }),
  stem: std({ color: '#4a3b2c', roughness: 0.9 }),
  pot: std({ color: '#d8d5cf', roughness: 0.6 }),
  potDark: std({ color: '#26282c', roughness: 0.5, metalness: 0.2 }),
  soil: std({ color: '#2a2018', roughness: 1 }),
  // 照明
  lightPanel: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 2.4, toneMapped: false }),
  lightWarm: new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffe8c4', emissiveIntensity: 2.2, toneMapped: false }),
  accent: new THREE.MeshStandardMaterial({ color: '#38d6e8', emissive: '#38d6e8', emissiveIntensity: 1.4, toneMapped: false }),
  accentSoft: new THREE.MeshStandardMaterial({ color: '#1b5a63', emissive: '#2bb3c4', emissiveIntensity: 0.6 }),
  cable: new THREE.MeshBasicMaterial({ color: '#0c0d0f' }),
});

export const getMaterials = () => (_mats ??= createMaterials());

let _geos: ReturnType<typeof createGeometries> | null = null;

const createGeometries = () => ({
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cylinderLow: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
  plane: new THREE.PlaneGeometry(1, 1),
  // デスク部品
  deskTop: new RoundedBoxGeometry(1.6, 0.04, 0.8, 2, 0.012),
  deskLeg: new RoundedBoxGeometry(0.05, 0.72, 0.68, 1, 0.01),
  deskBeam: new THREE.BoxGeometry(1.44, 0.05, 0.04),
  divider: new RoundedBoxGeometry(1.58, 0.36, 0.035, 2, 0.012),
  monitor: new RoundedBoxGeometry(0.62, 0.37, 0.028, 2, 0.008),
  screen: new THREE.PlaneGeometry(0.595, 0.335),
  monitorNeck: new THREE.BoxGeometry(0.035, 0.22, 0.025),
  monitorBase: new RoundedBoxGeometry(0.22, 0.012, 0.15, 1, 0.004),
  keyboard: new RoundedBoxGeometry(0.42, 0.016, 0.13, 1, 0.005),
  mouse: new THREE.SphereGeometry(0.5, 10, 8),
  laptopBase: new RoundedBoxGeometry(0.32, 0.014, 0.22, 1, 0.004),
  laptopLid: new RoundedBoxGeometry(0.32, 0.21, 0.008, 1, 0.003),
  laptopScreen: new THREE.PlaneGeometry(0.29, 0.18),
  mug: new THREE.CylinderGeometry(0.035, 0.032, 0.09, 14),
  notebook: new THREE.BoxGeometry(0.16, 0.012, 0.22),
  miniPot: new THREE.CylinderGeometry(0.045, 0.035, 0.07, 12),
  miniLeaf: new THREE.IcosahedronGeometry(0.06, 0),
  // 椅子部品
  chairSeat: new RoundedBoxGeometry(0.5, 0.08, 0.48, 2, 0.03),
  chairBack: new RoundedBoxGeometry(0.46, 0.56, 0.06, 2, 0.025),
  chairStem: new THREE.BoxGeometry(0.05, 0.3, 0.04),
  chairPole: new THREE.CylinderGeometry(0.025, 0.025, 0.32, 10),
  chairLeg: new THREE.BoxGeometry(0.04, 0.025, 0.3),
  chairCaster: new THREE.SphereGeometry(0.025, 8, 6),
  chairArmPost: new THREE.BoxGeometry(0.035, 0.18, 0.035),
  chairArmPad: new RoundedBoxGeometry(0.06, 0.025, 0.24, 1, 0.01),
  // 植物
  potLarge: new THREE.CylinderGeometry(0.28, 0.22, 0.55, 18),
  potRound: new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75),
  leafBlob: new THREE.IcosahedronGeometry(0.3, 1),
  snakeLeaf: new THREE.ConeGeometry(0.05, 0.9, 4),
});

export const getGeometries = () => (_geos ??= createGeometries());
