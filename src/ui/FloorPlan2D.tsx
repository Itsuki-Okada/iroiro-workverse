// WebGL が使えない環境向けの 2D フロアマップ（代替表示）
import { useEffect } from 'react';
import { useApp } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { AREA_LABELS, BUILDING, ZONE_BY_ID } from '../three/layout';
import { useOfficeLayout } from '../three/placements';
import { STATUS_META } from './common';

export const FloorPlan2D = ({ reason }: { reason: string }) => {
  const layout = useOfficeLayout();
  const departments = useApp((s) => s.business.departments);
  const employees = useApp((s) => s.business.employees);
  const attendance = useApp((s) => s.business.attendance);
  const selectEmployee = useUi((s) => s.selectEmployee);
  const selectDepartment = useUi((s) => s.selectDepartment);
  const selected = useUi((s) => s.selectedEmployeeId);
  const { x0, z0, x1, z1 } = BUILDING;
  useEffect(() => useUi.getState().setSceneReady(), []);
  const empName = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950 p-6 pt-20 pl-56">
      <svg viewBox={`${x0 - 1} ${z0 - 1} ${x1 - x0 + 2} ${z1 - z0 + 2}`} className="max-h-full w-full max-w-5xl">
        <rect x={x0} y={z0} width={x1 - x0} height={z1 - z0} fill="#15181c" stroke="#2f3338" strokeWidth={0.3} rx={0.5} />
        {AREA_LABELS.map((a) => (
          <g key={a.key}>
            <rect x={a.rect.x0} y={a.rect.z0} width={a.rect.x1 - a.rect.x0} height={a.rect.z1 - a.rect.z0} fill="#1b1f24" stroke="#2a2f35" strokeWidth={0.15} />
            <text x={(a.rect.x0 + a.rect.x1) / 2} y={a.rect.z1 - 0.8} fill="#6b7480" fontSize={0.9} textAnchor="middle">
              {a.name}
            </text>
          </g>
        ))}
        {departments.map((d) => {
          const z = ZONE_BY_ID[d.zoneId];
          if (!z) return null;
          return (
            <g key={d.id} onClick={() => selectDepartment(d.id, { fly: false })} className="cursor-pointer">
              <rect x={z.rect.x0} y={z.rect.z0} width={z.rect.x1 - z.rect.x0} height={z.rect.z1 - z.rect.z0} fill={`${d.color}14`} stroke={d.color} strokeWidth={0.12} />
              <text x={z.rect.x0 + 0.6} y={z.rect.z0 + 1.4} fill="#d4dae0" fontSize={1.1} fontWeight={600}>
                {d.name}
              </text>
            </g>
          );
        })}
        {layout.desks.map((d) => (
          <rect key={d.key} x={d.x - 0.8} y={d.z - 0.4} width={1.6} height={0.8} fill="#2a2f36" />
        ))}
        {Object.values(layout.placements).map((p) => {
          const st = attendance[p.employeeId]?.status ?? 'off';
          return (
            <g key={p.employeeId} onClick={() => selectEmployee(p.employeeId, { fly: false })} className="cursor-pointer">
              <circle cx={p.x} cy={p.z} r={0.45} fill={STATUS_META[st].dot} stroke={selected === p.employeeId ? '#38d6e8' : '#0a0c0f'} strokeWidth={0.15} />
              <title>{empName[p.employeeId]}</title>
            </g>
          );
        })}
      </svg>
      <p className="mt-4 text-sm text-zinc-500">{reason}</p>
    </div>
  );
};
