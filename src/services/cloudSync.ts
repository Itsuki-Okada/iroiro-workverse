// ============================================================
// Firestore によるリアルタイム同期（任意）
// workspaces/{WORKSPACE_ID}/state/{キー} に業務データをキー単位で保存し、
// 他のPCでの変更を onSnapshot で即座に反映する。
// ============================================================
import { create } from 'zustand';
import type { BusinessData } from '../types';
import { useApp } from '../store/appStore';
import { firebaseEnabled, getFirebaseApp, WORKSPACE_ID } from './firebase';

export type CloudStatus = 'disabled' | 'connecting' | 'synced' | 'error';
export const useCloud = create<{ status: CloudStatus; error?: string; lastSync?: string }>(() => ({
  status: firebaseEnabled ? 'connecting' : 'disabled',
}));

// 同期対象（presentation = アバター設定）
const BUSINESS_KEYS: (keyof BusinessData)[] = [
  'company',
  'departments',
  'employees',
  'tasks',
  'categories',
  'projects',
  'attendance',
  'attendanceLog',
  'attendanceCorrections',
  'xpLedger',
  'achievements',
  'missionClaims',
  'notifications',
  'assets',
  'settings',
];
const PRESENTATION = 'presentation';

const valueOf = (key: string) => {
  const s = useApp.getState();
  return key === PRESENTATION ? s.presentation : s.business[key as keyof BusinessData];
};

export const startCloudSync = async () => {
  if (!firebaseEnabled) return;
  try {
    const app = await getFirebaseApp();
    const { getFirestore, collection, doc, getDocs, onSnapshot, setDoc, serverTimestamp } = await import('firebase/firestore');
    const db = getFirestore(app);
    const col = collection(db, 'workspaces', WORKSPACE_ID, 'state');
    const keys = [...BUSINESS_KEYS, PRESENTATION];
    // 最後に送受信した JSON（エコー防止）
    const known: Record<string, string> = {};
    let applying = false;

    const push = (key: string) => {
      const json = JSON.stringify(valueOf(key) ?? null);
      if (known[key] === json) return;
      known[key] = json;
      setDoc(doc(col, key), { json, updatedAt: serverTimestamp(), by: useApp.getState().currentUserId ?? null })
        .then(() => useCloud.setState({ status: 'synced', lastSync: new Date().toISOString() }))
        .catch((e) => useCloud.setState({ status: 'error', error: String(e?.message ?? e) }));
    };

    // 初回：クラウドが空ならこのブラウザのデータを初期データとしてアップロード
    const first = await getDocs(col);
    if (first.empty) keys.forEach(push);

    onSnapshot(
      col,
      (qs) => {
        const patch: Partial<BusinessData> = {};
        let presentation: unknown;
        qs.docChanges().forEach((ch) => {
          const key = ch.doc.id;
          const json = ch.doc.data().json as string | undefined;
          if (!json || known[key] === json) return;
          known[key] = json;
          if (key === PRESENTATION) presentation = JSON.parse(json);
          else if ((BUSINESS_KEYS as string[]).includes(key)) (patch as Record<string, unknown>)[key] = JSON.parse(json);
        });
        if (Object.keys(patch).length || presentation) {
          applying = true;
          useApp.setState((s) => ({
            business: { ...s.business, ...patch },
            ...(presentation ? { presentation: presentation as typeof s.presentation } : {}),
          }));
          applying = false;
        }
        useCloud.setState({ status: 'synced', lastSync: new Date().toISOString() });
      },
      (e) => useCloud.setState({ status: 'error', error: e.message }),
    );

    // ローカルの変更をキー単位でまとめて送信
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    useApp.subscribe((s, prev) => {
      if (applying) return;
      for (const k of BUSINESS_KEYS) if (s.business[k] !== prev.business[k]) pending.add(k);
      if (s.presentation !== prev.presentation) pending.add(PRESENTATION);
      if (!pending.size) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        pending.forEach(push);
        pending.clear();
      }, 400);
    });
  } catch (e) {
    console.warn('[WORKVERSE] Firestore 同期を開始できませんでした', e);
    useCloud.setState({ status: 'error', error: String((e as Error)?.message ?? e) });
  }
};
