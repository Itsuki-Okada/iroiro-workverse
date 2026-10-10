import { Check, Gift, Lock } from 'lucide-react';
import { useApp } from '../../store/appStore';
import { ACHIEVEMENTS, companyLevelInfo, companyXp, levelInfo, MISSIONS, OFFICE_UPGRADES } from '../../game/rules';
import { cx, todayKey } from '../../lib/utils';
import { Progress, ViewShell } from '../common';
import { useMe } from '../hooks';
import { ACHIEVEMENT_ICON } from '../icons';

export const AchievementsView = () => {
  const me = useMe();
  const business = useApp((s) => s.business);
  const claimMission = useApp((s) => s.claimMission);
  if (!me) return null;
  const today = todayKey();
  const lv = levelInfo(me.totalXp);
  const owned = new Map(business.achievements.filter((a) => a.employeeId === me.id).map((a) => [a.achievementId, a.at]));
  const cxp = companyXp(business);
  const company = companyLevelInfo(cxp);

  return (
    <ViewShell title="実績" subtitle="個人の成長と、会社全体の成長">
      <div className="grid gap-4 xl:grid-cols-3">
        {/* 個人レベル */}
        <div className="panel-solid relative overflow-hidden p-5">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="section-title">プレイヤーレベル</div>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-semibold tabular-nums">{me.level}</span>
            <span className="pb-1.5 text-sm text-zinc-400">累計 {me.totalXp.toLocaleString()} XP</span>
          </div>
          <Progress value={lv.ratio} className="mt-4" h={8} />
          <div className="mt-1.5 flex justify-between text-xs tabular-nums text-zinc-500">
            <span>
              {lv.current} / {lv.need} XP
            </span>
            <span>Lv.{me.level + 1} まで {lv.need - lv.current} XP</span>
          </div>
          <div className="mt-5 text-xs text-zinc-500">
            タスク完了で経験値を獲得（低 10 / 中 20 / 高 35 / 緊急 50）。1つのタスクにつき1回のみ付与されます。
          </div>
        </div>

        {/* デイリーミッション */}
        <div className="panel-solid p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="section-title">デイリーミッション</div>
            <span className="text-xs text-zinc-500">毎日リセット</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {MISSIONS.map((m) => {
              const progress = Math.min(m.target, m.progress(business, me.id, today));
              const claimed = business.missionClaims.some((c) => c.date === today && c.employeeId === me.id && c.missionId === m.id);
              const ready = progress >= m.target && !claimed;
              return (
                <div key={m.id} className={cx('rounded-lg border p-3.5', ready ? 'border-amber-300/40 bg-amber-300/[0.05]' : 'border-white/[0.06] bg-white/[0.02]')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-zinc-500">{m.description}</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-cyan-300">+{m.reward} XP</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={progress / m.target} h={4} color={claimed ? '#3ddc97' : '#38d6e8'} />
                    <span className="text-xs tabular-nums text-zinc-400">
                      {progress}/{m.target}
                    </span>
                    {claimed ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-300">
                        <Check size={13} /> 受取済
                      </span>
                    ) : (
                      <button className="btn-primary px-2.5 py-1 text-xs" disabled={!ready} onClick={() => claimMission(m.id)}>
                        <Gift size={13} /> 受け取る
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* バッジ */}
      <div className="mt-6 mb-3 flex items-baseline justify-between">
        <div className="section-title">実績バッジ</div>
        <span className="text-xs text-zinc-500">
          {owned.size}/{ACHIEVEMENTS.length} 獲得
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {ACHIEVEMENTS.map((a) => {
          const Icon = ACHIEVEMENT_ICON[a.icon];
          const got = owned.has(a.id);
          return (
            <div key={a.id} className={cx('panel-solid flex flex-col items-center p-4 text-center', !got && 'opacity-50')}>
              <div
                className={cx(
                  'flex h-12 w-12 items-center justify-center rounded-full border',
                  got ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-white/10 bg-white/[0.03] text-zinc-500',
                )}
              >
                {got ? <Icon size={22} /> : <Lock size={18} />}
              </div>
              <div className="mt-3 text-sm font-medium">{a.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{a.description}</div>
              {got && <div className="mt-2 text-[10px] text-zinc-500">{new Date(owned.get(a.id)!).toLocaleDateString('ja-JP')} 獲得</div>}
            </div>
          );
        })}
      </div>

      {/* 会社の成長 */}
      <div className="mt-6 mb-3 section-title">会社の成長 · オフィス設備</div>
      <div className="panel-solid p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-sm text-zinc-400">全社員の獲得経験値</div>
            <div className="text-2xl font-semibold tabular-nums">{cxp.toLocaleString()} XP</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">オフィス Lv.{company.level}「{company.current.name}」</div>
            {company.next && <div className="text-xs text-zinc-500">次のアップグレードまで {(company.next.requiredXp - cxp).toLocaleString()} XP</div>}
          </div>
        </div>
        <Progress value={company.ratio} color="#ffd27a" className="mt-3" h={6} />
        <div className="mt-5 grid gap-2 md:grid-cols-5">
          {OFFICE_UPGRADES.map((u) => {
            const unlocked = company.level >= u.level;
            return (
              <div key={u.level} className={cx('rounded-lg border p-3', unlocked ? 'border-amber-300/30 bg-amber-300/[0.04]' : 'border-white/[0.06] opacity-60')}>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Lv.{u.level}</span>
                  {unlocked ? <Check size={13} className="text-amber-300" /> : <Lock size={12} />}
                </div>
                <div className="mt-1 text-sm font-medium">{u.name}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{u.description}</div>
                <div className="mt-2 text-[10px] tabular-nums text-zinc-500">{u.requiredXp.toLocaleString()} XP</div>
              </div>
            );
          })}
        </div>
      </div>
    </ViewShell>
  );
};
