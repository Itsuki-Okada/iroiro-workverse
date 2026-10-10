// ============================================================
// 権限ポリシー
// 将来ロールや閲覧範囲が増えても、UIはこの関数群だけを参照する。
// ============================================================
import type { CompanySettings, Employee } from '../types';

export const canViewEmployeeDetails = (
  viewer: Employee | undefined,
  target: Employee,
  settings: CompanySettings,
) => {
  if (!viewer) return false;
  if (viewer.id === target.id) return true;
  if (viewer.role === 'admin') return true;
  switch (settings.employeeViewScope) {
    case 'all':
      return true;
    case 'department':
      return viewer.departmentId === target.departmentId || viewer.role === 'manager';
    case 'admin':
      return false;
  }
};

export const canManageCategories = (viewer: Employee | undefined) =>
  !!viewer && (viewer.role === 'admin' || viewer.role === 'manager');

export const canManageOrganization = (viewer: Employee | undefined) => !!viewer && viewer.role === 'admin';

export const canEditTask = (viewer: Employee | undefined) => !!viewer;

export const ROLE_LABEL: Record<Employee['role'], string> = {
  admin: '管理者',
  manager: 'マネージャー',
  member: 'メンバー',
};

/** チーム全体の勤怠を閲覧できるか（管理者・マネージャー） */
export const canViewTeamAttendance = (viewer: Employee | undefined) => !!viewer && (viewer.role === 'admin' || viewer.role === 'manager');

/** 勤怠を修正できるか（本人または管理者） */
export const canEditAttendance = (viewer: Employee | undefined, targetId: string) => !!viewer && (viewer.role === 'admin' || viewer.id === targetId);
