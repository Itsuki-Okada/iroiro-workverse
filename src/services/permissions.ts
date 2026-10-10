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
