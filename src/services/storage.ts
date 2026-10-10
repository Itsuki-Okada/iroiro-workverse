// ============================================================
// 永続化レイヤー
// ストア（状態管理）は StorageAdapter インターフェースのみに依存する。
// 将来は ApiStorageAdapter / リアルタイム同期アダプタに差し替える想定。
// ============================================================
import type { PersistedState } from '../types';
import { SCHEMA_VERSION } from '../data/seed';

export interface StorageAdapter {
  load(): PersistedState | null;
  save(state: PersistedState): void;
  clear(): void;
}

const STORAGE_KEY = 'workverse:data';
export const SESSION_KEY = 'workverse:session';

/** スキーマバージョンごとのマイグレーション。key = 移行元バージョン */
const MIGRATIONS: Record<number, (s: any) => any> = {
  // 例: 0: (s) => ({ ...s, schemaVersion: 1, business: { ...s.business, newField: [] } }),
};

const migrate = (raw: any): PersistedState | null => {
  if (!raw || typeof raw !== 'object' || typeof raw.schemaVersion !== 'number') return null;
  let s = raw;
  while (s.schemaVersion < SCHEMA_VERSION) {
    const fn = MIGRATIONS[s.schemaVersion];
    if (!fn) return null; // 移行手段がない古いデータは破棄
    s = fn(s);
  }
  if (s.schemaVersion > SCHEMA_VERSION) return null;
  if (!s.business || !s.presentation) return null;
  s.business.assets ??= [];
  return s as PersistedState;
};

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key = STORAGE_KEY) {}

  load() {
    try {
      const text = localStorage.getItem(this.key);
      if (!text) return null;
      return migrate(JSON.parse(text));
    } catch (e) {
      console.warn('[WORKVERSE] 保存データの読み込みに失敗しました', e);
      return null;
    }
  }

  save(state: PersistedState) {
    try {
      localStorage.setItem(this.key, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
    } catch (e) {
      console.warn('[WORKVERSE] 保存に失敗しました', e);
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* noop */
    }
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();

// ---------- セッション（タブ単位） ----------
// sessionStorage はタブを閉じると消える。
// 「ブラウザを閉じた」＝セッション消失だが勤怠は出勤中のまま保持し、
// 「明示的に退勤」した場合のみ勤怠を OFF にする。

export const sessionStore = {
  get(): string | null {
    try {
      return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  set(employeeId: string) {
    try {
      sessionStorage.setItem(SESSION_KEY, employeeId);
      // 再訪時に「前回の続きから」を提案するため最後のユーザーを記録
      localStorage.setItem(SESSION_KEY, employeeId);
    } catch {
      /* noop */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
  },
  /** タブ単位のアクティブセッションが存在するか（リロード判定） */
  hasActiveTab(): boolean {
    try {
      return !!sessionStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  },
};
