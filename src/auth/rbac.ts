import { UserRole, Permission } from '../types';

/**
 * Canonical 9 Roles
 */
export const CANONICAL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'OPERATIONS_MANAGER',
  'SUPERVISOR',
  'DISPATCHER',
  'FINANCE',
  'MAINTENANCE',
  'DRIVER',
  'VIEWER',
];

/**
 * Role Labels in Arabic for UI Display
 */
export const ROLE_LABELS_AR: Record<UserRole, string> = {
  SUPER_ADMIN: 'مدير النظام الأعلى (Super Admin)',
  COMPANY_ADMIN: 'مدير الشركة (Company Admin)',
  OPERATIONS_MANAGER: 'مدير العمليات والحركة (Operations Manager)',
  SUPERVISOR: 'مشرف تشغيل وميداني (Supervisor)',
  DISPATCHER: 'مرحل وموزع رحلات (Dispatcher)',
  FINANCE: 'مسؤول مالي وحسابات (Finance)',
  MAINTENANCE: 'مسؤول صيانة وورشة (Maintenance)',
  DRIVER: 'سائق أسطول (Driver)',
  VIEWER: 'مراقب / مشاهد فقط (Viewer)',
  // Legacy aliases
  admin: 'مدير النظام (Admin)',
  manager: 'مدير عمليات (Manager)',
  operation: 'مشرف تشغيل (Operation)',
  finance: 'محاسب مالي (Finance)',
  driver: 'سائق (Driver)',
  maintenance: 'فني صيانة (Maintenance)',
  viewer: 'مشاهد (Viewer)',
};

/**
 * Normalizes legacy or lowercase role strings to the canonical uppercase role
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'VIEWER';
  const upper = role.toUpperCase();
  switch (upper) {
    case 'SUPER_ADMIN':
    case 'SUPERADMIN':
      return 'SUPER_ADMIN';
    case 'COMPANY_ADMIN':
    case 'ADMIN':
      return 'COMPANY_ADMIN';
    case 'OPERATIONS_MANAGER':
    case 'MANAGER':
      return 'OPERATIONS_MANAGER';
    case 'SUPERVISOR':
    case 'OPERATION':
      return 'SUPERVISOR';
    case 'DISPATCHER':
      return 'DISPATCHER';
    case 'FINANCE':
      return 'FINANCE';
    case 'MAINTENANCE':
      return 'MAINTENANCE';
    case 'DRIVER':
      return 'DRIVER';
    case 'VIEWER':
    default:
      return 'VIEWER';
  }
}

/**
 * Canonical Role-to-Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'dashboard.view',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.assign',
    'tasks.complete',
    'fleet.view',
    'fleet.create',
    'fleet.edit',
    'fleet.delete',
    'drivers.view',
    'drivers.create',
    'drivers.edit',
    'drivers.delete',
    'maintenance.view',
    'maintenance.create',
    'maintenance.edit',
    'fuel.view',
    'fuel.create',
    'fuel.edit',
    'locations.view',
    'locations.manage',
    'automation.view',
    'automation.create',
    'automation.edit',
    'automation.delete',
    'automation.execute',
    'notifications.view',
    'notifications.manage',
    'reports.view',
    'reports.export',
    'ai.use',
    'users.view',
    'users.manage',
    'settings.manage',
    'audit.view',
    'sales.view',
    'sales.create',
    'sales.edit',
    'sales.delete',
    'sales.export',
  ],
  COMPANY_ADMIN: [
    'dashboard.view',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.assign',
    'tasks.complete',
    'fleet.view',
    'fleet.create',
    'fleet.edit',
    'fleet.delete',
    'drivers.view',
    'drivers.create',
    'drivers.edit',
    'drivers.delete',
    'maintenance.view',
    'maintenance.create',
    'maintenance.edit',
    'fuel.view',
    'fuel.create',
    'fuel.edit',
    'locations.view',
    'locations.manage',
    'automation.view',
    'automation.create',
    'automation.edit',
    'automation.delete',
    'automation.execute',
    'notifications.view',
    'notifications.manage',
    'reports.view',
    'reports.export',
    'ai.use',
    'users.view',
    'users.manage',
    'settings.manage',
    'audit.view',
    'sales.view',
    'sales.create',
    'sales.edit',
    'sales.delete',
    'sales.export',
  ],
  OPERATIONS_MANAGER: [
    'dashboard.view',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.delete',
    'tasks.assign',
    'tasks.complete',
    'fleet.view',
    'fleet.create',
    'fleet.edit',
    'drivers.view',
    'drivers.create',
    'drivers.edit',
    'maintenance.view',
    'maintenance.create',
    'fuel.view',
    'fuel.create',
    'locations.view',
    'locations.manage',
    'automation.view',
    'automation.execute',
    'notifications.view',
    'notifications.manage',
    'reports.view',
    'reports.export',
    'ai.use',
    'users.view',
    'audit.view',
    'sales.view',
    'sales.create',
    'sales.edit',
    'sales.delete',
    'sales.export',
  ],
  SUPERVISOR: [
    'dashboard.view',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.assign',
    'tasks.complete',
    'fleet.view',
    'drivers.view',
    'maintenance.view',
    'fuel.view',
    'locations.view',
    'automation.view',
    'notifications.view',
    'reports.view',
    'ai.use',
    'sales.view',
    'sales.create',
    'sales.edit',
  ],
  DISPATCHER: [
    'dashboard.view',
    'tasks.view',
    'tasks.create',
    'tasks.edit',
    'tasks.assign',
    'tasks.complete',
    'fleet.view',
    'drivers.view',
    'locations.view',
    'notifications.view',
  ],
  FINANCE: [
    'dashboard.view',
    'fuel.view',
    'fuel.create',
    'fuel.edit',
    'maintenance.view',
    'reports.view',
    'reports.export',
    'notifications.view',
    'sales.view',
    'sales.export',
  ],
  MAINTENANCE: [
    'dashboard.view',
    'fleet.view',
    'maintenance.view',
    'maintenance.create',
    'maintenance.edit',
    'notifications.view',
  ],
  DRIVER: [
    'tasks.view',
    'tasks.complete',
    'fuel.create',
    'notifications.view',
  ],
  VIEWER: [
    'dashboard.view',
    'tasks.view',
    'fleet.view',
    'drivers.view',
    'locations.view',
    'reports.view',
    'notifications.view',
    'sales.view',
  ],
  // Legacy aliases mapping
  admin: [] as Permission[],
  manager: [] as Permission[],
  operation: [] as Permission[],
  finance: [] as Permission[],
  driver: [] as Permission[],
  maintenance: [] as Permission[],
  viewer: [] as Permission[],
};

// Fill in legacy aliases with canonical equivalents
ROLE_PERMISSIONS.admin = ROLE_PERMISSIONS.COMPANY_ADMIN;
ROLE_PERMISSIONS.manager = ROLE_PERMISSIONS.OPERATIONS_MANAGER;
ROLE_PERMISSIONS.operation = ROLE_PERMISSIONS.SUPERVISOR;
ROLE_PERMISSIONS.finance = ROLE_PERMISSIONS.FINANCE;
ROLE_PERMISSIONS.driver = ROLE_PERMISSIONS.DRIVER;
ROLE_PERMISSIONS.maintenance = ROLE_PERMISSIONS.MAINTENANCE;
ROLE_PERMISSIONS.viewer = ROLE_PERMISSIONS.VIEWER;

/**
 * Checks if a role has a given permission, accounting for custom permissions overrides
 */
export function hasPermission(
  role: UserRole | string,
  permission: Permission,
  customPermissions?: string[]
): boolean {
  const norm = normalizeRole(role);
  if (norm === 'SUPER_ADMIN') return true;

  if (customPermissions && Array.isArray(customPermissions)) {
    if (customPermissions.includes(permission)) return true;
  }

  const rolePerms = ROLE_PERMISSIONS[norm] || [];
  return rolePerms.includes(permission);
}

/**
 * Role hierarchy for seniority comparisons
 */
export const ROLE_HIERARCHY_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  COMPANY_ADMIN: 90,
  OPERATIONS_MANAGER: 80,
  SUPERVISOR: 70,
  DISPATCHER: 60,
  FINANCE: 50,
  MAINTENANCE: 40,
  DRIVER: 20,
  VIEWER: 10,
  // Legacy
  admin: 90,
  manager: 80,
  operation: 70,
  finance: 50,
  maintenance: 40,
  driver: 20,
  viewer: 10,
};

export function isRoleHigherOrEqual(role: UserRole | string, targetRole: UserRole | string): boolean {
  const r1 = normalizeRole(role);
  const r2 = normalizeRole(targetRole);
  return (ROLE_HIERARCHY_LEVEL[r1] || 0) >= (ROLE_HIERARCHY_LEVEL[r2] || 0);
}
