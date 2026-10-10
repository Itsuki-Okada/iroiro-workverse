// ============================================================
// 制作データ（ファイル本体）の保存先：IndexedDB
// LocalStorage は数MBしか保存できないため、画像・動画などの本体は IndexedDB に置く。
// 将来はクラウドストレージ（S3等）のアダプタに差し替える想定。
// ============================================================

import { cloudFilesEnabled, getFirebaseApp, WORKSPACE_ID } from './firebase';

const DB_NAME = 'workverse-files';
const STORE = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () =>
  (dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));

const tx = async <T,>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
};

const local = {
  put: (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id)),
  get: (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>),
  remove: (id: string) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()),
};

const cloudRef = async (id: string) => {
  const app = await getFirebaseApp();
  const { getStorage, ref } = await import('firebase/storage');
  return { ref: ref(getStorage(app), `workspaces/${WORKSPACE_ID}/assets/${id}`), mod: await import('firebase/storage') };
};

export const fileStore = {
  put: async (id: string, blob: Blob) => {
    if (cloudFilesEnabled) {
      const { ref, mod } = await cloudRef(id);
      await mod.uploadBytes(ref, blob, { contentType: blob.type || 'application/octet-stream' });
    }
    await local.put(id, blob).catch(() => undefined);
  },
  get: async (id: string): Promise<Blob | undefined> => {
    const cached = await local.get(id).catch(() => undefined);
    if (cached || !cloudFilesEnabled) return cached;
    // 他のメンバーがアップロードしたファイルはクラウドから取得してキャッシュ
    const { ref, mod } = await cloudRef(id);
    const blob = await mod.getBlob(ref);
    local.put(id, blob).catch(() => undefined);
    return blob;
  },
  remove: async (id: string) => {
    if (cloudFilesEnabled) {
      const { ref, mod } = await cloudRef(id);
      await mod.deleteObject(ref).catch(() => undefined);
    }
    await local.remove(id);
  },
  /** このブラウザのキャッシュを消去（クラウド上のファイルは消さない） */
  clear: () => local.clear(),
  /** ブラウザが許可している保存容量の目安 */
  estimate: async () => (navigator.storage?.estimate ? navigator.storage.estimate() : null),
};

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 1ファイル 500MB まで

export const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};
