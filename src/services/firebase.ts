// ============================================================
// Firebase 設定（任意）
// .env に VITE_FIREBASE_* を設定した場合のみ有効になる。
// 未設定ならこれまで通りブラウザ内（LocalStorage / IndexedDB）に保存する。
// Firebase SDK は有効時だけ動的に読み込むため、未使用時のバンドルは増えない。
// ============================================================
import type { FirebaseApp } from 'firebase/app';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** Firestore 同期が有効か */
export const firebaseEnabled = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
/** 制作データ本体を Cloud Storage for Firebase に保存するか（Blazeプランが必要） */
export const cloudFilesEnabled = firebaseEnabled && !!firebaseConfig.storageBucket && env.VITE_FIREBASE_USE_STORAGE === 'true';
/** 会社（ワークスペース）単位のデータ区画 */
export const WORKSPACE_ID = (env.VITE_WORKSPACE_ID as string | undefined) || 'iroiro';

let appPromise: Promise<FirebaseApp> | null = null;

/** Firebase アプリを初期化し、匿名ログインまで済ませる */
export const getFirebaseApp = () =>
  (appPromise ??= (async () => {
    const { initializeApp } = await import('firebase/app');
    const app = initializeApp(firebaseConfig);
    const { getAuth, signInAnonymously } = await import('firebase/auth');
    await signInAnonymously(getAuth(app));
    return app;
  })());
