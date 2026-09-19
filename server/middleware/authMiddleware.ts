import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, getAdminDb, fetchUserProfileWithToken, hasAdminServiceAccount } from '../firebaseAdmin';
import { normalizeRole, hasPermission, ROLE_PERMISSIONS } from '../../src/auth/rbac';
import { UserRole, Permission } from '../../src/types';

// In-memory cache for user profiles (TTL: 5 minutes)
interface CachedUserProfile {
  role: UserRole;
  companyId: string;
  customPermissions: string[];
  cachedAt: number;
}
const userProfileCache = new Map<string, CachedUserProfile>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
  companyId: string;
  permissions: Permission[];
  customPermissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      companyId?: string;
    }
  }
}

/**
 * requireAuth:
 * Extracts Bearer token from Authorization header, validates with Firebase,
 * and fetches authoritative user profile & role from Firestore users collection.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'مطلوب تسجيل الدخول وتوفير رمز المصادقة (Bearer Token)',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded || !decoded.uid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'رمز المصادقة غير صالح أو منتهي الصلاحية',
        },
      });
    }

    let role: UserRole = 'VIEWER';
    let companyId = '';
    let customPermissions: string[] = [];

    const userEmailLower = (decoded.email || '').toLowerCase().trim();
    const envSuperAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();

    // 1. Authoritative Super Admin check based on cryptographically verified token claims or configured SUPER_ADMIN_EMAIL
    if (
      (decoded as any).super_admin === true ||
      (decoded as any).role === 'SUPER_ADMIN' ||
      (envSuperAdminEmail && userEmailLower === envSuperAdminEmail)
    ) {
      role = 'SUPER_ADMIN';
      companyId = decoded.companyId || 'company-01';
    } else if (decoded.role) {
      // 2. Role and companyId verified from Firebase token custom claims
      role = normalizeRole(decoded.role);
      companyId = decoded.companyId || '';
    }

    let userStatus = 'active';

    // 3. If role or companyId not fully resolved in token claims, resolve from server Firestore
    if (role !== 'SUPER_ADMIN' && (!companyId || role === 'VIEWER')) {
      const cached = userProfileCache.get(decoded.uid);
      const now = Date.now();
      if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
        role = cached.role;
        companyId = cached.companyId;
        customPermissions = cached.customPermissions;
      } else {
        // Query Firestore using server Admin DB or REST API with verified bearer token
        let fetchedData: any = null;
        if (hasAdminServiceAccount()) {
          try {
            const db = getAdminDb();
            const userDoc = await db.collection('users').doc(decoded.uid).get();
            if (userDoc.exists) {
              fetchedData = userDoc.data();
            }
          } catch (_) {}
        }

        if (!fetchedData) {
          try {
            fetchedData = await fetchUserProfileWithToken(decoded.uid, token);
          } catch (_) {
            fetchedData = null;
          }
        }

        if (fetchedData) {
          if (fetchedData.isSuperAdmin === true || fetchedData.role === 'SUPER_ADMIN') {
            role = 'SUPER_ADMIN';
          } else {
            role = normalizeRole(fetchedData.role);
          }
          companyId = fetchedData.companyId || '';
          customPermissions = fetchedData.customPermissions || [];
          userStatus = fetchedData.status || 'active';
          userProfileCache.set(decoded.uid, {
            role,
            companyId,
            customPermissions,
            cachedAt: now,
          });
        }
      }
    }

    // Check for disabled / suspended user account
    if (userStatus === 'disabled' || userStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'هذا الحساب معطل أو موقوف مؤقتاً، يرجى التواصل مع إدارة النظام',
        },
      });
    }

    // 4. Non-SUPER_ADMIN users MUST have a valid companyId assigned in their verified profile
    if (role !== 'SUPER_ADMIN') {
      if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_COMPANY_ASSIGNED',
            message: 'حساب المستخدم غير مقترن بأي شركة معتمدة في النظام، يرجى مراجعة إدارة النظام',
          },
        });
      }
    } else {
      // For SUPER_ADMIN ONLY: can optionally target a specific company via request body or query parameter
      const requestedCompanyId = (req.query?.companyId as string) || (req.body?.companyId as string);
      if (requestedCompanyId && typeof requestedCompanyId === 'string' && requestedCompanyId.trim()) {
        companyId = requestedCompanyId.trim();
      } else if (!companyId) {
        companyId = 'company-01';
      }
    }

    const permissions = ROLE_PERMISSIONS[role] || [];

    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role,
      companyId,
      permissions,
      customPermissions,
    };
    req.companyId = companyId;

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'فشلت عملية التحقق من هوية المستخدم',
      },
    });
  }
}

/**
 * requirePermission:
 * Enforces canonical permissions (e.g. 'ai.use', 'automation.execute', 'tasks.edit')
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'مطلوب تسجيل الدخول' },
      });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const allowed = hasPermission(req.user.role, permission, req.user.customPermissions);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `ليس لديك الصلاحية المطلوبة لتنفيذ هذا الإجراء (${permission})`,
        },
      });
    }

    next();
  };
}

/**
 * requireRole:
 * Enforces role hierarchy
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'مطلوب تسجيل الدخول' },
      });
    }

    const norm = normalizeRole(req.user.role);
    if (norm === 'SUPER_ADMIN') {
      return next();
    }

    if (allowedRoles.includes(norm)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_ROLE',
        message: 'الدور الحالي لحسابك لا يمتلك الإذن الكافي لتنفيذ هذا الإجراء',
      },
    });
  };
}

/**
 * requireCompanyAccess:
 * Guarantees tenant isolation — user can only access their assigned company
 */
export function requireCompanyAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'مطلوب تسجيل الدخول' },
    });
  }

  // Super admin can operate across companies
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Target company requested via body, query, or path params
  const targetCompanyId = req.body?.companyId || req.query?.companyId || req.params?.companyId;

  if (targetCompanyId && targetCompanyId !== req.user.companyId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_VIOLATION',
        message: 'غير مصرح لك بالوصول إلى بيانات شركة أخرى',
      },
    });
  }

  // Force authoritative companyId from verified token onto req
  req.companyId = req.user.companyId;

  next();
}

/**
 * Invalidates cached profile for a user (e.g. after role or status update)
 */
export function invalidateUserProfileCache(userId: string) {
  userProfileCache.delete(userId);
}

/**
 * Centralized Audit Logging for Security and Privileged Actions
 */
export async function logAuditEvent(params: {
  companyId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  details?: any;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ip?: string;
}) {
  const now = new Date().toISOString();
  const logDoc = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    companyId: params.companyId,
    userId: params.userId || 'system',
    userEmail: params.userEmail || 'system',
    action: params.action,
    resource: params.resource,
    details: params.details || {},
    status: params.status,
    ip: params.ip || 'internal',
    timestamp: now,
    createdAt: now,
  };

  try {
    if (hasAdminServiceAccount()) {
      const db = getAdminDb();
      // Record in company-isolated audit logs subcollection
      await db
        .collection('companies')
        .doc(params.companyId)
        .collection('auditLogs')
        .doc(logDoc.id)
        .set(logDoc);

      // Also record in central audit collection for compliance
      await db.collection('audit_logs').doc(logDoc.id).set(logDoc);
    }
  } catch (err) {
    console.warn('[AuditLog] Notice writing audit entry:', err);
  }
}

