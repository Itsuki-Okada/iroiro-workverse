// 自分宛の新着通知（チーム宛の制作データなど）をトーストで知らせる
// Firestore 同期時は他のメンバーの操作による通知もリアルタイムに届く。
import { useEffect, useRef } from 'react';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';

export const NotificationWatcher = () => {
  const me = useApp((s) => s.currentUserId);
  const notifications = useApp((s) => s.business.notifications);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!me) return;
    const mine = notifications.filter((n) => n.employeeId === me);
    if (!seen.current) {
      // ログイン直後：未読のチーム宛通知があれば件数だけ知らせる
      seen.current = new Set(notifications.map((n) => n.id));
      const unreadFiles = mine.filter((n) => !n.read && n.kind === 'file').length;
      if (unreadFiles) useUi.getState().toast({ tone: 'info', title: `チーム宛の制作データが${unreadFiles}件届いています`, body: 'ヘッダーの通知から確認できます' });
      return;
    }
    for (const n of mine) {
      if (seen.current.has(n.id)) continue;
      if (n.kind === 'file') useUi.getState().toast({ tone: 'info', title: n.title, body: n.body });
    }
    seen.current = new Set(notifications.map((n) => n.id));
  }, [notifications, me]);

  useEffect(() => {
    seen.current = null;
  }, [me]);

  return null;
};
