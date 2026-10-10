import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudUpload, Download, File, FileArchive, FileImage, FileText, FileVideo, Play, Search, Trash2 } from 'lucide-react';
import type { AssetMeta } from '../../types';
import { useApp } from '../../store/appStore';
import { fileStore, formatBytes } from '../../services/fileStore';
import { canManageOrganization } from '../../services/permissions';
import { cx, relativeTime } from '../../lib/utils';
import { Avatar2D, ConfirmButton, Empty, Modal, ViewShell } from '../common';
import { useLookups, useMe } from '../hooks';

const kindOf = (a: AssetMeta) =>
  a.mimeType.startsWith('image/')
    ? 'image'
    : a.mimeType.startsWith('video/')
      ? 'video'
      : a.mimeType === 'application/pdf' || a.mimeType.startsWith('text/')
        ? 'doc'
        : /zip|rar|7z|tar/.test(a.mimeType) || /\.(zip|rar|7z)$/i.test(a.name)
          ? 'archive'
          : 'other';

const KIND_ICON = { image: FileImage, video: FileVideo, doc: FileText, archive: FileArchive, other: File };

/** IndexedDB から Blob を読み出して一時URLを作る */
const useBlobUrl = (id: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    let created: string | null = null;
    fileStore
      .get(id)
      .then((blob) => {
        if (!alive || !blob) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [id]);
  return url;
};

const Thumb = ({ asset, onOpen }: { asset: AssetMeta; onOpen: () => void }) => {
  const kind = kindOf(asset);
  const url = useBlobUrl(kind === 'image' || kind === 'video' ? asset.id : null);
  const Icon = KIND_ICON[kind];
  return (
    <button onClick={onOpen} className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-ink-900">
      {kind === 'image' && url ? (
        <img src={url} alt={asset.name} className="h-full w-full object-cover" />
      ) : kind === 'video' && url ? (
        <>
          <video src={url} muted preload="metadata" className="h-full w-full object-cover" />
          <span className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
            <Play size={18} className="ml-0.5 text-white" />
          </span>
        </>
      ) : (
        <Icon size={34} className="text-zinc-500" />
      )}
    </button>
  );
};

const download = async (a: AssetMeta) => {
  const blob = await fileStore.get(a.id);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = a.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const Preview = ({ asset, onClose }: { asset: AssetMeta; onClose: () => void }) => {
  const kind = kindOf(asset);
  const url = useBlobUrl(asset.id);
  return (
    <Modal
      open
      onClose={onClose}
      title={asset.name}
      width="max-w-4xl"
      footer={
        <button className="btn-primary" onClick={() => download(asset)}>
          <Download size={15} /> ダウンロード
        </button>
      }
    >
      <div className="flex min-h-64 items-center justify-center rounded-lg bg-ink-950">
        {!url ? (
          <span className="text-sm text-zinc-500">読み込み中…</span>
        ) : kind === 'image' ? (
          <img src={url} alt={asset.name} className="max-h-[65vh] object-contain" />
        ) : kind === 'video' ? (
          <video src={url} controls autoPlay className="max-h-[65vh] w-full" />
        ) : asset.mimeType === 'application/pdf' ? (
          <iframe src={url} title={asset.name} className="h-[65vh] w-full rounded" />
        ) : (
          <span className="text-sm text-zinc-500">このファイル形式はプレビューできません。ダウンロードして確認してください。</span>
        )}
      </div>
      {asset.note && <p className="mt-3 text-sm text-zinc-300">{asset.note}</p>}
    </Modal>
  );
};

export const FilesView = () => {
  const me = useMe();
  const departments = useApp((s) => s.business.departments);
  const projects = useApp((s) => s.business.projects);
  const assets = useApp((s) => s.business.assets ?? []);
  const upload = useApp((s) => s.uploadAssets);
  const remove = useApp((s) => s.deleteAsset);
  const { emp, prj, dept } = useLookups();
  const isAdmin = canManageOrganization(me);

  const [team, setTeam] = useState<string>('all');
  const [targetDept, setTargetDept] = useState(me?.departmentId ?? departments[0]?.id ?? '');
  const [projectId, setProjectId] = useState('');
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<AssetMeta | null>(null);
  const [usage, setUsage] = useState<{ usage?: number; quota?: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fileStore.estimate().then(setUsage).catch(() => undefined);
  }, [assets.length]);

  const list = useMemo(
    () => assets.filter((a) => (team === 'all' || a.departmentId === team) && (!q || a.name.toLowerCase().includes(q.toLowerCase()) || a.note.includes(q))),
    [assets, team, q],
  );

  const send = async (files: FileList | File[] | null) => {
    if (!files || !files.length || !targetDept) return;
    setBusy(true);
    const n = await upload(Array.from(files), { departmentId: targetDept, projectId: projectId || null, note: note.trim() });
    setBusy(false);
    if (n) {
      setNote('');
      setTeam(targetDept);
    }
  };

  const total = assets.reduce((s, a) => s + a.size, 0);

  return (
    <ViewShell
      title="制作データ"
      subtitle={`各チームの制作ファイルを共有 · ${assets.length}件 / ${formatBytes(total)}`}
    >
      {/* アップロード */}
      <div className="panel-solid mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
          <div>
            <label className="label">アップロード先チーム</label>
            <select className="input" value={targetDept} onChange={(e) => setTargetDept(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">プロジェクト（任意）</label>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">なし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">メモ（任意）</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：初稿、修正版v2、入稿データ など" />
          </div>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            send(e.dataTransfer.files);
          }}
          onClick={() => input.current?.click()}
          className={cx(
            'mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition',
            dragging ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/25 hover:bg-white/[0.02]',
          )}
        >
          <CloudUpload size={28} className={dragging ? 'text-accent' : 'text-zinc-500'} />
          <div className="mt-2 text-sm text-zinc-200">{busy ? 'アップロード中…' : 'ファイルをドラッグ＆ドロップ、またはクリックして選択'}</div>
          <div className="mt-1 text-xs text-zinc-500">画像・動画・PDF・デザインデータ・ZIP など（1ファイル500MBまで・複数選択可）</div>
          <input
            ref={input}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              send(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {usage?.quota ? (
          <div className="mt-2 text-right text-[11px] text-zinc-500">
            ブラウザ保存容量：{formatBytes(usage.usage ?? 0)} / {formatBytes(usage.quota)} 使用
          </div>
        ) : null}
      </div>

      {/* フィルタ */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-lg bg-white/[0.04] p-0.5">
          {[{ id: 'all', name: 'すべて', color: '#9aa7b4' }, ...departments].map((d) => {
            const n = d.id === 'all' ? assets.length : assets.filter((a) => a.departmentId === d.id).length;
            return (
              <button
                key={d.id}
                onClick={() => setTeam(d.id)}
                className={cx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs', team === d.id ? 'bg-white/10 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200')}
              >
                {d.id !== 'all' && <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />}
                {d.name}
                <span className="text-zinc-500">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-56">
          <Search size={14} className="absolute top-2.5 left-3 text-zinc-500" />
          <input className="input py-1.5 pl-8" placeholder="ファイル名・メモで検索" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <Empty icon={<CloudUpload size={22} />} text="まだ制作データはありません" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((a) => {
            const d = dept[a.departmentId];
            const canDelete = isAdmin || a.uploaderId === me?.id;
            return (
              <div key={a.id} className="panel-solid group flex flex-col overflow-hidden p-2.5">
                <Thumb asset={a} onOpen={() => setPreview(a)} />
                <div className="mt-2.5 min-w-0 px-0.5">
                  <div className="truncate text-sm text-zinc-100" title={a.name}>
                    {a.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: d?.color }} />
                    <span className="truncate">{d?.name}</span>
                    <span>· {formatBytes(a.size)}</span>
                  </div>
                  {a.projectId && prj[a.projectId] && <div className="mt-0.5 truncate text-[11px] text-zinc-500">{prj[a.projectId].name}</div>}
                  {a.note && <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{a.note}</div>}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-2.5">
                  <Avatar2D employeeId={a.uploaderId} size={20} />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
                    {emp[a.uploaderId]?.name ?? '—'} · {relativeTime(a.uploadedAt)}
                  </span>
                  <button className="btn-icon h-7 w-7" title="ダウンロード" onClick={() => download(a)}>
                    <Download size={14} />
                  </button>
                  {canDelete && (
                    <ConfirmButton className="btn-icon h-7 w-auto px-1.5 text-zinc-500 hover:text-red-300" onConfirm={() => remove(a.id)} confirmLabel="削除?">
                      <Trash2 size={14} />
                    </ConfirmButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        ※ 初期版ではファイルはこのブラウザ内（IndexedDB）に保存されるため、他のPCとは共有されません。将来クラウドストレージに接続すると、チーム全員で共有できるようになります。
      </p>
      {preview && <Preview asset={preview} onClose={() => setPreview(null)} />}
    </ViewShell>
  );
};
