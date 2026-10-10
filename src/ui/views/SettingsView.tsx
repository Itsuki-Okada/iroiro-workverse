import { useState } from 'react';
import type { ReactNode } from 'react';
import { Database, Download, Eye, Monitor, Palette, Plus, RefreshCw, Shield, Sparkles, Tags, Trash2 } from 'lucide-react';
import type { ViewScope } from '../../types';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { canManageCategories, canManageOrganization } from '../../services/permissions';
import { OFFICE_UPGRADES } from '../../game/rules';
import { cx } from '../../lib/utils';
import { ConfirmButton, ViewShell } from '../common';
import { useMe } from '../hooks';
import { useCloud } from '../../services/cloudSync';
import { cloudFilesEnabled, WORKSPACE_ID } from '../../services/firebase';

const Section = ({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children: ReactNode }) => (
  <section className="panel-solid p-5">
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 text-accent">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
      </div>
    </div>
    {children}
  </section>
);

const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button className="flex w-full items-center justify-between py-1.5 text-sm" onClick={() => onChange(!on)}>
    <span className="text-zinc-300">{label}</span>
    <span className={cx('relative h-5 w-9 rounded-full transition', on ? 'bg-accent' : 'bg-white/15')}>
      <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </span>
  </button>
);

const Segmented = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
  <div className="flex rounded-lg bg-white/[0.04] p-0.5">
    {options.map(([v, l]) => (
      <button key={v} onClick={() => onChange(v)} className={cx('flex-1 rounded-md px-3 py-1.5 text-xs', value === v ? 'bg-white/10 text-zinc-50' : 'text-zinc-400')}>
        {l}
      </button>
    ))}
  </div>
);

/** カテゴリの追加・編集・削除（業種に依存しない自由設定） */
export const CategoryManager = () => {
  const me = useMe();
  const categories = useApp((s) => s.business.categories);
  const tasks = useApp((s) => s.business.tasks);
  const upsert = useApp((s) => s.upsertCategory);
  const remove = useApp((s) => s.deleteCategory);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#38d6e8');
  const canEdit = canManageCategories(me);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Tags size={15} className="text-accent" />
        <span className="text-sm font-semibold">タスクカテゴリ</span>
        {!canEdit && <span className="text-xs text-zinc-500">（編集にはマネージャー以上の権限が必要です）</span>}
      </div>
      <div className="space-y-1.5">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input
              type="color"
              disabled={!canEdit}
              className="h-8 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
              value={c.color}
              onChange={(e) => upsert({ id: c.id, name: c.name, color: e.target.value })}
            />
            <input className="input py-1.5" disabled={!canEdit} value={c.name} onChange={(e) => upsert({ id: c.id, name: e.target.value })} />
            <span className="w-14 shrink-0 text-right text-[11px] text-zinc-500">{tasks.filter((t) => t.categoryId === c.id).length}件</span>
            {canEdit && (
              <ConfirmButton className="btn-icon w-auto px-2 text-zinc-500 hover:text-red-300" onConfirm={() => remove(c.id)} confirmLabel="削除?">
                <Trash2 size={14} />
              </ConfirmButton>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="mt-3 flex items-center gap-2">
          <input type="color" className="h-8 w-9 cursor-pointer rounded border border-white/10 bg-transparent" value={color} onChange={(e) => setColor(e.target.value)} />
          <input
            className="input py-1.5"
            placeholder="新しいカテゴリ名（例：製造、接客、研究）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && name.trim()) {
                upsert({ name: name.trim(), color });
                setName('');
              }
            }}
          />
          <button
            className="btn shrink-0"
            disabled={!name.trim()}
            onClick={() => {
              upsert({ name: name.trim(), color });
              setName('');
            }}
          >
            <Plus size={14} /> 追加
          </button>
        </div>
      )}
    </div>
  );
};

export const SettingsView = () => {
  const me = useMe();
  const company = useApp((s) => s.business.company);
  const settings = useApp((s) => s.business.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const setCompanyName = useApp((s) => s.setCompanyName);
  const resetToDemo = useApp((s) => s.resetToDemo);
  const wipeAll = useApp((s) => s.wipeAll);
  const exportJson = useApp((s) => s.exportJson);
  const openAvatarEditor = useUi((s) => s.openAvatarEditor);
  const isAdmin = canManageOrganization(me);
  const cloud = useCloud();

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workverse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ViewShell title="設定" subtitle="会社設定・表示・データ管理">
      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={<Database size={17} />} title="会社設定">
          <label className="label">会社名</label>
          <input className="input" disabled={!isAdmin} value={company.name} onChange={(e) => setCompanyName(e.target.value)} />
          {!isAdmin && <p className="mt-2 text-xs text-zinc-500">会社設定の変更には管理者権限が必要です。</p>}
        </Section>

        <Section icon={<Palette size={17} />} title="マイアバター" desc="3Dオフィスに表示されるあなたのアバターを変更します。">
          <button className="btn" onClick={() => me && openAvatarEditor(me.id)}>
            <Palette size={15} /> アバターを編集
          </button>
        </Section>

        <Section icon={<Shield size={17} />} title="閲覧権限" desc="社員の詳細情報（レベル・タスクなど）を閲覧できる範囲。管理者は常にすべて閲覧できます。">
          <Segmented<ViewScope>
            value={settings.employeeViewScope}
            onChange={(v) => isAdmin && updateSettings({ employeeViewScope: v })}
            options={[
              ['all', '全社員'],
              ['department', '同じ部署のみ'],
              ['admin', '管理者のみ'],
            ]}
          />
        </Section>

        <Section icon={<Monitor size={17} />} title="グラフィック" desc="動作が重い場合は「軽量」に切り替えてください（影・床面反射・追加光源を無効化）。">
          <Segmented
            value={settings.graphicsQuality}
            onChange={(v) => updateSettings({ graphicsQuality: v })}
            options={[
              ['high', '高品質'],
              ['low', '軽量'],
            ]}
          />
          <div className="mt-3">
            <Toggle on={settings.showNameTags} onChange={(v) => updateSettings({ showNameTags: v })} label="すべての社員の名前を常に表示" />
          </div>
        </Section>

        <Section icon={<Sparkles size={17} />} title="オフィスの雰囲気" desc="時間帯や季節に合わせて、照明・窓の外の景色・飾り付けが変わります。">
          <div className="label">時間帯</div>
          <Segmented
            value={settings.timeOfDay ?? 'auto'}
            onChange={(v) => updateSettings({ timeOfDay: v })}
            options={[
              ['auto', '自動'],
              ['morning', '朝'],
              ['day', '昼'],
              ['evening', '夕方'],
              ['night', '夜'],
            ]}
          />
          <div className="label mt-3">季節イベント</div>
          <Segmented
            value={settings.season ?? 'auto'}
            onChange={(v) => updateSettings({ season: v })}
            options={[
              ['auto', '自動'],
              ['none', 'なし'],
              ['halloween', 'ハロウィン'],
              ['christmas', 'クリスマス'],
              ['newyear', 'お正月'],
            ]}
          />
          <p className="mt-2 text-xs text-zinc-500">「自動」は現在の時刻・日付に連動します（10月はハロウィン、12/1〜25はクリスマス、年末年始はお正月）。</p>
        </Section>

        <Section icon={<Eye size={17} />} title="オフィス設備" desc="会社の成長に応じて内装が自動で進化します。手動でレベルを選んでプレビューすることもできます。">
          <Toggle on={settings.autoOfficeUpgrades} onChange={(v) => updateSettings({ autoOfficeUpgrades: v })} label="会社の成長に合わせて自動で反映" />
          {!settings.autoOfficeUpgrades && (
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {OFFICE_UPGRADES.map((u) => (
                <button
                  key={u.level}
                  title={u.name}
                  onClick={() => updateSettings({ manualOfficeLevel: u.level })}
                  className={cx('rounded-lg border py-2 text-xs', settings.manualOfficeLevel === u.level ? 'border-cyan-300/50 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-zinc-400 hover:bg-white/[0.04]')}
                >
                  Lv.{u.level}
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section icon={<Tags size={17} />} title="カテゴリ管理" desc="業種に合わせてタスクのカテゴリを自由に追加・編集できます。">
          <CategoryManager />
        </Section>

        <Section icon={<Database size={17} />} title="データ管理" desc="データはこのブラウザの LocalStorage に保存されています（スキーマバージョン管理あり）。">
          <div className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">クラウド同期（Firestore）</span>
              <span
                className={cx(
                  'font-medium',
                  cloud.status === 'synced' ? 'text-emerald-300' : cloud.status === 'error' ? 'text-red-300' : cloud.status === 'connecting' ? 'text-amber-300' : 'text-zinc-500',
                )}
              >
                {{ disabled: '未設定（このブラウザのみ）', connecting: '接続中…', synced: `同期中（${WORKSPACE_ID}）`, error: 'エラー' }[cloud.status]}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-zinc-400">制作データの保存先</span>
              <span className="text-zinc-300">{cloudFilesEnabled ? 'Cloud Storage for Firebase' : 'このブラウザ（IndexedDB）'}</span>
            </div>
            {cloud.error && <div className="mt-1 break-all text-red-300">{cloud.error}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={download}>
              <Download size={15} /> JSONでエクスポート
            </button>
            <ConfirmButton className="btn" onConfirm={resetToDemo} confirmLabel="もう一度押して初期化">
              <RefreshCw size={15} /> デモデータに初期化
            </ConfirmButton>
            {isAdmin && (
              <ConfirmButton onConfirm={wipeAll} confirmLabel="もう一度押して全削除">
                <Trash2 size={15} /> すべてのデータを削除
              </ConfirmButton>
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            「すべてのデータを削除」は保存データを消去し、会社・部署・デモユーザーのみの最小構成で再作成します。複数PC間でのリアルタイム共有は初期版の対象外です。
          </p>
        </Section>
      </div>
    </ViewShell>
  );
};
