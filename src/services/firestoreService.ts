import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Vehicle,
  Driver,
  TripRoute,
  MaintenanceRecord,
  LocationPlace,
  UserProfile,
  UserRole,
  UserStatus,
  RegionItem,
  FuelRecord,
  ExpenseRecord,
  OperationTask,
  VehicleDocument,
  AutomationRule,
  AutomationExecution,
  AppNotification,
  AuditLog,
  AreaItem,
  BranchItem,
} from '../types';
import { normalizeRole } from '../auth/rbac';
import {
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_TRIPS,
  INITIAL_MAINTENANCE,
} from '../data/initialData';
import { INITIAL_LOCATIONS } from '../data/locationsData';
import { INITIAL_REGIONS, INITIAL_FUEL, INITIAL_EXPENSES } from '../data/fuelData';
import { enqueueOfflineMutation, enqueueOfflineAction } from './offlineSyncService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isPermissionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return (
    code === 'permission-denied' ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('permission-denied') ||
    msg.includes('PERMISSION_DENIED')
  );
}

export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    msg.includes('the client is offline') ||
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('network') ||
    msg.includes('Failed to get document because the client is offline') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes("Backend didn't respond") ||
    msg.includes('deadline-exceeded') ||
    msg.includes('timeout') ||
    msg.includes('transport errored') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errorMsg = error instanceof Error ? error.message : String(error);

  if (isOfflineError(error)) {
    console.warn(`Firestore operation '${operationType}' on '${path}' deferred: client is currently in offline/cached mode.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));

  // For read or real-time query listeners, never throw uncaught exceptions into the UI loop
  if (operationType === OperationType.LIST || operationType === OperationType.GET) {
    return;
  }

  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on application boot with rapid timeout to prevent 10s backend hangs
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  if (!auth.currentUser) {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 3500)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise,
    ]);
    return true;
  } catch (error) {
    if (isOfflineError(error) || (error instanceof Error && error.message.includes('timeout'))) {
      console.warn('Firebase connection notice: client is currently operating in offline/cached mode.');
    }
    return false;
  }
}

// Root collections
export const USERS_COL = 'users';
export const COMPANIES_COL = 'companies';
export const DEFAULT_COMPANY_ID = 'company-01';

/* ----------------------------------------------------
   USER PROFILE MANAGEMENT
----------------------------------------------------- */

export async function syncUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserProfile> {
  const userRef = doc(db, USERS_COL, user.uid);
  const path = `${USERS_COL}/${user.uid}`;
  const now = new Date().toISOString();

  // Retrieve cached profile if available to provide instantaneous offline access
  const cachedKey = `fleet_profile_${user.uid}`;
  let cached: UserProfile | null = null;
  try {
    const raw = localStorage.getItem(cachedKey);
    if (raw) cached = JSON.parse(raw);
  } catch {
    // ignore parse error
  }

  // Check if bootstrap admin email via environment variable or super admin claim
  const configuredSuperAdmin = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const isBootstrapAdmin = Boolean(
    configuredSuperAdmin && user.email && user.email.trim().toLowerCase() === configuredSuperAdmin
  ) || cached?.role === 'SUPER_ADMIN';

  const fallbackProfile: UserProfile = {
    uid: user.uid,
    companyId: cached?.companyId || DEFAULT_COMPANY_ID,
    email: user.email || '',
    displayName: user.displayName || cached?.displayName || user.email?.split('@')[0] || (isBootstrapAdmin ? 'مدير الأسطول' : 'عضو جديد'),
    photoURL: user.photoURL || cached?.photoURL || '',
    role: isBootstrapAdmin ? 'SUPER_ADMIN' : normalizeRole(cached?.role || 'VIEWER'),
    status: isBootstrapAdmin ? 'active' : (cached?.status || 'active'),
    createdAt: cached?.createdAt || now,
    lastActive: now,
  };

  try {
    let existingSnap: any = null;
    try {
      existingSnap = await getDoc(userRef);
    } catch (getErr: any) {
      if (isOfflineError(getErr)) {
        console.warn('Notice: Firestore is currently offline. Returning local cached user profile.');
        localStorage.setItem(cachedKey, JSON.stringify(fallbackProfile));
        return fallbackProfile;
      }
      throw getErr;
    }

    if (existingSnap && existingSnap.exists()) {
      const current = existingSnap.data() as UserProfile;
      const updated: Partial<UserProfile> = {
        displayName: user.displayName || current.displayName || user.email?.split('@')[0] || 'مستخدم',
        photoURL: user.photoURL || current.photoURL || '',
        lastActive: now,
        role: normalizeRole(current.role),
        companyId: current.companyId || DEFAULT_COMPANY_ID,
      };

      if (isBootstrapAdmin && current.role !== 'SUPER_ADMIN' && current.role !== 'admin') {
        updated.role = 'SUPER_ADMIN';
        updated.status = 'active';
      }

      try {
        await updateDoc(userRef, updated);
      } catch (updErr) {
        if (!isOfflineError(updErr)) {
          console.warn('Notice updating profile online:', updErr);
        }
      }
      const full = { ...current, ...updated } as UserProfile;
      localStorage.setItem(cachedKey, JSON.stringify(full));
      return full;
    } else {
      let assignedRole: UserRole = isBootstrapAdmin ? 'SUPER_ADMIN' : 'VIEWER';
      let assignedStatus: UserStatus = isBootstrapAdmin ? 'active' : 'active';
      let assignedJobTitle = '';
      let assignedPhone = '';
      let assignedCompanyId = DEFAULT_COMPANY_ID;

      // Check if this email was pre-invited / added
      if (user.email) {
        try {
          const q = query(
            collection(db, USERS_COL),
            where('email', '==', user.email.trim().toLowerCase())
          );
          const inviteSnap = await getDocs(q);
          if (!inviteSnap.empty) {
            const inviteDoc = inviteSnap.docs[0];
            const inviteData = inviteDoc.data() as UserProfile;
            assignedRole = normalizeRole(inviteData.role || assignedRole);
            assignedStatus = inviteData.status || assignedStatus;
            assignedJobTitle = inviteData.jobTitle || '';
            assignedPhone = inviteData.phone || '';
            assignedCompanyId = inviteData.companyId || DEFAULT_COMPANY_ID;

            if (inviteDoc.id !== user.uid) {
              try {
                await deleteDoc(doc(db, USERS_COL, inviteDoc.id));
              } catch (delErr) {
                console.warn('Could not clean up temp invitation doc:', delErr);
              }
            }
          }
        } catch (queryErr) {
          console.warn('Invitation lookup check notice:', queryErr);
        }
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        companyId: assignedCompanyId,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || (isBootstrapAdmin ? 'مدير الأسطول' : 'عضو فريق'),
        photoURL: user.photoURL || '',
        role: isBootstrapAdmin ? 'SUPER_ADMIN' : assignedRole,
        status: assignedStatus,
        jobTitle: assignedJobTitle,
        phone: assignedPhone,
        createdAt: now,
        lastActive: now,
      };

      try {
        await setDoc(userRef, newProfile, { merge: true });
      } catch (setErr) {
        if (!isOfflineError(setErr)) {
          console.warn('Notice creating profile online:', setErr);
        }
      }
      localStorage.setItem(cachedKey, JSON.stringify(newProfile));
      return newProfile;
    }
  } catch (error: any) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } else if (isOfflineError(error)) {
      console.warn('Operating in offline mode for user profile sync.');
      localStorage.setItem(cachedKey, JSON.stringify(fallbackProfile));
      return fallbackProfile;
    }
    localStorage.setItem(cachedKey, JSON.stringify(fallbackProfile));
    return fallbackProfile;
  }
}

export function listenToUsers(callback: (users: UserProfile[]) => void) {
  const colRef = collection(db, USERS_COL);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as UserProfile);
      });
      callback(users);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, USERS_COL);
    }
  );
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (_) {}
  }
  return headers;
}

export async function createOrInviteUserAccount(accountData: {
  email: string;
  displayName: string;
  role: UserRole;
  companyId?: string;
  status?: UserStatus;
  jobTitle?: string;
  department?: string;
  assignedBranch?: string;
  phone?: string;
  assignedDriverId?: string;
  customPermissions?: string[];
}): Promise<UserProfile> {
  const normalizedEmail = accountData.email.trim().toLowerCase();
  
  // Call secure backend endpoint first
  try {
    const headers = await getAuthHeaders();
    if (headers['Authorization']) {
      const resp = await fetch('/api/users/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: normalizedEmail,
          displayName: accountData.displayName.trim(),
          role: normalizeRole(accountData.role),
          companyId: accountData.companyId || DEFAULT_COMPANY_ID,
          status: accountData.status || 'pending',
          jobTitle: accountData.jobTitle?.trim() || '',
          department: accountData.department?.trim() || '',
          assignedBranch: accountData.assignedBranch?.trim() || '',
          phone: accountData.phone?.trim() || '',
          assignedDriverId: accountData.assignedDriverId || '',
          customPermissions: accountData.customPermissions || [],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || data.error || 'فشلت إضافة الحساب عبر الخادم');
      }
      if (data.data?.profile) {
        return data.data.profile as UserProfile;
      }
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
      throw apiErr;
    }
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userRef = doc(db, USERS_COL, userId);
  const path = `${USERS_COL}/${userId}`;
  const now = new Date().toISOString();

  const newProfile: UserProfile = {
    uid: userId,
    companyId: accountData.companyId || DEFAULT_COMPANY_ID,
    email: normalizedEmail,
    displayName: accountData.displayName.trim(),
    name: accountData.displayName.trim(),
    role: normalizeRole(accountData.role),
    status: accountData.status || 'pending',
    jobTitle: accountData.jobTitle?.trim() || '',
    department: accountData.department?.trim() || '',
    assignedBranch: accountData.assignedBranch?.trim() || '',
    phone: accountData.phone?.trim() || '',
    assignedDriverId: accountData.assignedDriverId || '',
    customPermissions: accountData.customPermissions || [],
    createdAt: now,
    lastActive: now,
  };

  try {
    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function updateUserDetails(
  targetUserId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  // Call secure backend endpoint first
  try {
    const headers = await getAuthHeaders();
    if (headers['Authorization']) {
      const resp = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId,
          updates: {
            ...updates,
            role: updates.role ? normalizeRole(updates.role) : undefined,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || data.error || 'فشل تحديث الحساب عبر الخادم');
      }
      return;
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
      throw apiErr;
    }
  }

  const userRef = doc(db, USERS_COL, targetUserId);
  const path = `${USERS_COL}/${targetUserId}`;
  try {
    const dataToUpdate: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.role) {
      dataToUpdate.role = normalizeRole(updates.role);
    }
    await updateDoc(userRef, dataToUpdate);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  newStatus?: UserStatus
): Promise<void> {
  // Call secure backend endpoint first
  try {
    const headers = await getAuthHeaders();
    if (headers['Authorization']) {
      const resp = await fetch('/api/users/update-role', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetUserId,
          newRole: normalizeRole(newRole),
          newStatus,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || data.error || 'فشلت عملية تحديث الصلاحيات عبر الخادم');
      }
      return;
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
      throw apiErr;
    }
  }

  const userRef = doc(db, USERS_COL, targetUserId);
  const path = `${USERS_COL}/${targetUserId}`;
  try {
    const updates: Partial<UserProfile> = {
      role: normalizeRole(newRole),
      updatedAt: new Date().toISOString(),
    };
    if (newStatus) {
      updates.status = newStatus;
    }
    await updateDoc(userRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserAccount(targetUserId: string): Promise<void> {
  // Call secure backend endpoint first
  try {
    const headers = await getAuthHeaders();
    if (headers['Authorization']) {
      const resp = await fetch(`/api/users/${encodeURIComponent(targetUserId)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.message || data.error || 'فشلت عملية حذف الحساب عبر الخادم');
      }
      return;
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('Failed to fetch')) {
      throw apiErr;
    }
  }

  const userRef = doc(db, USERS_COL, targetUserId);
  const path = `${USERS_COL}/${targetUserId}`;
  try {
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* ----------------------------------------------------
   MULTI-TENANT COMPANY DATA LISTENERS & MUTATIONS
----------------------------------------------------- */

// Generic company subcollection path builder
export function getCompanyDocRef(companyId: string, subCol: string, docId: string) {
  return doc(db, COMPANIES_COL, companyId, subCol, docId);
}

export function getCompanyColRef(companyId: string, subCol: string) {
  return collection(db, COMPANIES_COL, companyId, subCol);
}

/**
 * Real-time fleet listener for a specific company:
 * Listens to `companies/{companyId}/[collection]` with graceful fallback to root collections.
 */
export function listenToCompanyFleetData(
  companyId: string,
  callbacks: {
    onVehicles: (data: Vehicle[]) => void;
    onDrivers: (data: Driver[]) => void;
    onTrips: (data: TripRoute[]) => void;
    onMaintenance: (data: MaintenanceRecord[]) => void;
    onLocations: (data: LocationPlace[]) => void;
    onRegions?: (data: RegionItem[]) => void;
    onFuel?: (data: FuelRecord[]) => void;
    onExpenses?: (data: ExpenseRecord[]) => void;
  }
) {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const unsubs: (() => void)[] = [];

  // Vehicles
  const companyVehiclesCol = getCompanyColRef(activeCompanyId, 'vehicles');
  unsubs.push(
    onSnapshot(
      companyVehiclesCol,
      async (snap) => {
        if (snap.empty) {
          // Check legacy root collection
          try {
            const legSnap = await getDocs(collection(db, 'vehicles'));
            if (!legSnap.empty) {
              const list: Vehicle[] = [];
              legSnap.forEach((d) => list.push(d.data() as Vehicle));
              callbacks.onVehicles(list);
              return;
            }
          } catch (e) {
            // ignore
          }
        }
        const list: Vehicle[] = [];
        snap.forEach((d) => list.push(d.data() as Vehicle));
        callbacks.onVehicles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/vehicles`)
    )
  );

  // Drivers
  const companyDriversCol = getCompanyColRef(activeCompanyId, 'drivers');
  unsubs.push(
    onSnapshot(
      companyDriversCol,
      async (snap) => {
        if (snap.empty) {
          try {
            const legSnap = await getDocs(collection(db, 'drivers'));
            if (!legSnap.empty) {
              const list: Driver[] = [];
              legSnap.forEach((d) => list.push(d.data() as Driver));
              callbacks.onDrivers(list);
              return;
            }
          } catch (e) {}
        }
        const list: Driver[] = [];
        snap.forEach((d) => list.push(d.data() as Driver));
        callbacks.onDrivers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/drivers`)
    )
  );

  // Trips
  const companyTripsCol = getCompanyColRef(activeCompanyId, 'trips');
  unsubs.push(
    onSnapshot(
      companyTripsCol,
      async (snap) => {
        if (snap.empty) {
          try {
            const legSnap = await getDocs(collection(db, 'trips'));
            if (!legSnap.empty) {
              const list: TripRoute[] = [];
              legSnap.forEach((d) => list.push(d.data() as TripRoute));
              callbacks.onTrips(list);
              return;
            }
          } catch (e) {}
        }
        const list: TripRoute[] = [];
        snap.forEach((d) => list.push(d.data() as TripRoute));
        callbacks.onTrips(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/trips`)
    )
  );

  // Maintenance
  const companyMaintCol = getCompanyColRef(activeCompanyId, 'maintenance');
  unsubs.push(
    onSnapshot(
      companyMaintCol,
      async (snap) => {
        if (snap.empty) {
          try {
            const legSnap = await getDocs(collection(db, 'maintenance'));
            if (!legSnap.empty) {
              const list: MaintenanceRecord[] = [];
              legSnap.forEach((d) => list.push(d.data() as MaintenanceRecord));
              callbacks.onMaintenance(list);
              return;
            }
          } catch (e) {}
        }
        const list: MaintenanceRecord[] = [];
        snap.forEach((d) => list.push(d.data() as MaintenanceRecord));
        callbacks.onMaintenance(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/maintenance`)
    )
  );

  // Locations
  const companyLocationsCol = getCompanyColRef(activeCompanyId, 'locations');
  unsubs.push(
    onSnapshot(
      companyLocationsCol,
      async (snap) => {
        if (snap.empty) {
          try {
            const legSnap = await getDocs(collection(db, 'locations'));
            if (!legSnap.empty) {
              const list: LocationPlace[] = [];
              legSnap.forEach((d) => list.push(d.data() as LocationPlace));
              callbacks.onLocations(list);
              return;
            }
          } catch (e) {}
        }
        const list: LocationPlace[] = [];
        snap.forEach((d) => list.push(d.data() as LocationPlace));
        callbacks.onLocations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/locations`)
    )
  );

  // Fuel
  if (callbacks.onFuel) {
    const companyFuelCol = getCompanyColRef(activeCompanyId, 'fuel');
    unsubs.push(
      onSnapshot(
        companyFuelCol,
        async (snap) => {
          if (snap.empty) {
            try {
              const legSnap = await getDocs(collection(db, 'fuel'));
              if (!legSnap.empty) {
                const list: FuelRecord[] = [];
                legSnap.forEach((d) => list.push(d.data() as FuelRecord));
                callbacks.onFuel!(list);
                return;
              }
            } catch (e) {}
          }
          const list: FuelRecord[] = [];
          snap.forEach((d) => list.push(d.data() as FuelRecord));
          callbacks.onFuel!(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/fuel`)
      )
    );
  }

  // Expenses
  if (callbacks.onExpenses) {
    const companyExpensesCol = getCompanyColRef(activeCompanyId, 'expenses');
    unsubs.push(
      onSnapshot(
        companyExpensesCol,
        (snap) => {
          const list: ExpenseRecord[] = [];
          snap.forEach((d) => list.push(d.data() as ExpenseRecord));
          callbacks.onExpenses!(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompanyId}/expenses`)
      )
    );
  }

  return () => {
    unsubs.forEach((unsub) => unsub());
  };
}

// Backward compatibility listener alias
export function listenToFleetData(callbacks: {
  onVehicles: (data: Vehicle[]) => void;
  onDrivers: (data: Driver[]) => void;
  onTrips: (data: TripRoute[]) => void;
  onMaintenance: (data: MaintenanceRecord[]) => void;
  onLocations: (data: LocationPlace[]) => void;
  onRegions?: (data: RegionItem[]) => void;
  onFuel?: (data: FuelRecord[]) => void;
  onExpenses?: (data: ExpenseRecord[]) => void;
}) {
  return listenToCompanyFleetData(DEFAULT_COMPANY_ID, callbacks);
}

// ----------------------------------------------------
// Operational Tasks: Real-time Listener & Cloud Mutations
// ----------------------------------------------------
export function listenToCompanyTasks(
  companyId: string,
  callback: (tasks: OperationTask[]) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const colRef = getCompanyColRef(activeCompanyId, 'tasks');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: OperationTask[] = [];
      snap.forEach((d) => list.push(d.data() as OperationTask));
      callback(list);
    },
    (err) => {
      console.warn(`Tasks listener notice for ${activeCompanyId}:`, err);
    }
  );
}

export async function saveTaskToCloud(task: OperationTask, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || task.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'tasks', task.id);
  const data = { ...task, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    console.warn(`Task save offline fallback: ${task.id}`, err);
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'tasks',
      documentId: task.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteTaskFromCloud(taskId: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'tasks', taskId);
  try {
    await deleteDoc(targetDoc);
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'tasks',
      documentId: taskId,
      operationType: 'delete',
      payload: {},
    });
  }
}

// ----------------------------------------------------
// Vehicle Documents: Real-time Listener & Cloud Mutations
// ----------------------------------------------------
export function listenToCompanyVehicleDocuments(
  companyId: string,
  callback: (docs: VehicleDocument[]) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const colRef = getCompanyColRef(activeCompanyId, 'vehicleDocuments');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: VehicleDocument[] = [];
      snap.forEach((d) => list.push(d.data() as VehicleDocument));
      callback(list);
    },
    (err) => {
      console.warn(`Vehicle documents listener notice:`, err);
    }
  );
}

export async function saveVehicleDocumentToCloud(
  docItem: VehicleDocument,
  companyId?: string
): Promise<void> {
  const activeCompanyId = companyId || docItem.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'vehicleDocuments', docItem.id);
  const data = { ...docItem, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'vehicleDocuments',
      documentId: docItem.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteVehicleDocumentFromCloud(docId: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'vehicleDocuments', docId);
  try {
    await deleteDoc(targetDoc);
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'vehicleDocuments',
      documentId: docId,
      operationType: 'delete',
      payload: {},
    });
  }
}

// ----------------------------------------------------
// Automation Rules & Executions: Real-time Listeners & Mutations
// ----------------------------------------------------
export function listenToCompanyAutomationRules(
  companyId: string,
  callback: (rules: AutomationRule[]) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const colRef = getCompanyColRef(activeCompanyId, 'automationRules');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: AutomationRule[] = [];
      snap.forEach((d) => list.push(d.data() as AutomationRule));
      callback(list);
    },
    (err) => {
      console.warn(`Automation rules listener notice:`, err);
    }
  );
}

export async function saveAutomationRuleToCloud(
  rule: AutomationRule,
  companyId?: string
): Promise<void> {
  const activeCompanyId = companyId || rule.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'automationRules', rule.id);
  const data = { ...rule, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'automationRules',
      documentId: rule.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteAutomationRuleFromCloud(ruleId: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'automationRules', ruleId);
  try {
    await deleteDoc(targetDoc);
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'automationRules',
      documentId: ruleId,
      operationType: 'delete',
      payload: {},
    });
  }
}

export function listenToCompanyAutomationExecutions(
  companyId: string,
  callback: (executions: AutomationExecution[]) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const colRef = getCompanyColRef(activeCompanyId, 'automationExecutions');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: AutomationExecution[] = [];
      snap.forEach((d) => list.push(d.data() as AutomationExecution));
      list.sort((a, b) => new Date(b.executionTime).getTime() - new Date(a.executionTime).getTime());
      callback(list);
    },
    (err) => {
      console.warn(`Automation executions listener notice:`, err);
    }
  );
}

export async function saveAutomationExecutionToCloud(
  exec: AutomationExecution,
  companyId?: string
): Promise<void> {
  const activeCompanyId = companyId || exec.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'automationExecutions', exec.id);
  try {
    await setDoc(targetDoc, { ...exec, companyId: activeCompanyId }, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'automationExecutions',
      documentId: exec.id,
      operationType: 'update',
      payload: exec,
    });
  }
}

// ----------------------------------------------------
// Notifications: Real-time Listener & Cloud Mutations
// ----------------------------------------------------
export function listenToCompanyNotifications(
  companyId: string,
  callback: (notifs: AppNotification[]) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const colRef = getCompanyColRef(activeCompanyId, 'notifications');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((d) => list.push(d.data() as AppNotification));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn(`Notifications listener notice:`, err);
    }
  );
}

export async function saveNotificationToCloud(notif: any, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || notif.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'notifications', notif.id);
  const data = { ...notif, companyId: activeCompanyId };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'notifications',
      documentId: notif.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteNotificationFromCloud(notifId: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'notifications', notifId);
  try {
    await deleteDoc(targetDoc);
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'notifications',
      documentId: notifId,
      operationType: 'delete',
      payload: {},
    });
  }
}

// ----------------------------------------------------
// Audit Logs: Real-time Listener & Cloud Mutations
// ----------------------------------------------------
export function listenToCompanyAuditLogs(
  companyId: string,
  callback: (logs: AuditLog[]) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const colRef = getCompanyColRef(activeCompanyId, 'auditLogs');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: AuditLog[] = [];
      snap.forEach((d) => list.push(d.data() as AuditLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    },
    (err) => {
      console.warn(`Audit logs listener notice:`, err);
    }
  );
}

export async function saveAuditLogToCloud(log: AuditLog, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || log.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'auditLogs', log.id);
  const data = { ...log, companyId: activeCompanyId };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'auditLogs',
      documentId: log.id,
      operationType: 'create',
      payload: data,
    });
  }
}

// ----------------------------------------------------
// Company Settings: Persistent Firestore Configuration (Email, SMTP, etc.)
// ----------------------------------------------------
export async function getCompanySettings(companyId: string, settingId: string = 'email'): Promise<any | null> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    const snap = await getDoc(getCompanyDocRef(activeCompanyId, 'settings', settingId));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn(`Error getting company setting ${settingId}:`, err);
  }
  return null;
}

export async function saveCompanySettings(companyId: string, settingId: string, data: any): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'settings', settingId);
  try {
    await setDoc(targetDoc, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn(`Error saving company setting ${settingId}:`, err);
  }
}

export function listenToCompanyEmailConfig(
  companyId: string,
  callback: (config: any) => void
): () => void {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'settings', 'email');
  return onSnapshot(
    targetDoc,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    (err) => {
      console.warn(`Email config listener notice:`, err);
    }
  );
}

// ----------------------------------------------------
// Vehicles, Drivers, Trips, Maintenance, Locations, Fuel
// (All updated to dual company/root subcollections with offline queueing)
// ----------------------------------------------------
export async function saveVehicleToCloud(v: Vehicle, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || v.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'vehicles', v.id);
  const data = { ...v, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
    // Also update legacy root doc if exists to maintain backward compatibility
    setDoc(doc(db, 'vehicles', v.id), data, { merge: true }).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'vehicles',
      documentId: v.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteVehicleFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'vehicles', id));
    deleteDoc(doc(db, 'vehicles', id)).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'vehicles',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function saveDriverToCloud(d: Driver, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || d.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'drivers', d.id);
  const data = { ...d, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
    setDoc(doc(db, 'drivers', d.id), data, { merge: true }).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'drivers',
      documentId: d.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteDriverFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'drivers', id));
    deleteDoc(doc(db, 'drivers', id)).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'drivers',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function saveTripToCloud(t: TripRoute, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || t.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'trips', t.id);
  const data = { ...t, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
    setDoc(doc(db, 'trips', t.id), data, { merge: true }).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'trips',
      documentId: t.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteTripFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'trips', id));
    deleteDoc(doc(db, 'trips', id)).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'trips',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function deleteMultipleDriversFromCloud(driverIds: string[], companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const batch = writeBatch(db);
  for (const id of driverIds) {
    batch.delete(getCompanyDocRef(activeCompanyId, 'drivers', id));
    batch.delete(doc(db, 'drivers', id));
  }
  try {
    await batch.commit();
  } catch (err) {
    console.warn('Notice deleting multiple drivers:', err);
  }
}

export async function clearAllDriversFromCloud(companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    const snap = await getDocs(getCompanyColRef(activeCompanyId, 'drivers'));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('Notice clearing drivers:', err);
  }
}

export async function deleteMultipleTripsFromCloud(tripIds: string[], companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  const batch = writeBatch(db);
  for (const id of tripIds) {
    batch.delete(getCompanyDocRef(activeCompanyId, 'trips', id));
    batch.delete(doc(db, 'trips', id));
  }
  try {
    await batch.commit();
  } catch (err) {
    console.warn('Notice deleting multiple trips:', err);
  }
}

export async function clearAllTripsFromCloud(companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    const snap = await getDocs(getCompanyColRef(activeCompanyId, 'trips'));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('Notice clearing trips:', err);
  }
}

export async function saveMaintenanceToCloud(record: MaintenanceRecord, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || record.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'maintenance', record.id);
  const data = { ...record, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
    setDoc(doc(db, 'maintenance', record.id), data, { merge: true }).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'maintenance',
      documentId: record.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteMaintenanceFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'maintenance', id));
    deleteDoc(doc(db, 'maintenance', id)).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'maintenance',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function saveLocationToCloud(loc: LocationPlace, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || loc.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'locations', loc.id);
  const data = { ...loc, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
    setDoc(doc(db, 'locations', loc.id), data, { merge: true }).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'locations',
      documentId: loc.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteLocationFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'locations', id));
    deleteDoc(doc(db, 'locations', id)).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'locations',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function saveFuelToCloud(fuel: FuelRecord, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || fuel.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'fuel', fuel.id);
  const data = { ...fuel, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
    setDoc(doc(db, 'fuel', fuel.id), data, { merge: true }).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'fuel',
      documentId: fuel.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteFuelFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'fuel', id));
    deleteDoc(doc(db, 'fuel', id)).catch(() => {});
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'fuel',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function saveExpenseToCloud(exp: ExpenseRecord, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || exp.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'expenses', exp.id);
  const data = { ...exp, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'expenses',
      documentId: exp.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteExpenseFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'expenses', id));
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'expenses',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

export async function saveRegionToCloud(reg: RegionItem, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || reg.companyId || DEFAULT_COMPANY_ID;
  const targetDoc = getCompanyDocRef(activeCompanyId, 'regions', reg.id);
  const data = { ...reg, companyId: activeCompanyId, updatedAt: new Date().toISOString() };

  try {
    await setDoc(targetDoc, data, { merge: true });
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'regions',
      documentId: reg.id,
      operationType: 'update',
      payload: data,
    });
  }
}

export async function deleteRegionFromCloud(id: string, companyId?: string): Promise<void> {
  const activeCompanyId = companyId || DEFAULT_COMPANY_ID;
  try {
    await deleteDoc(getCompanyDocRef(activeCompanyId, 'regions', id));
  } catch (err) {
    enqueueOfflineMutation({
      companyId: activeCompanyId,
      collection: 'regions',
      documentId: id,
      operationType: 'delete',
      payload: {},
    });
  }
}

// Seed initial data to cloud if collections are completely empty
export async function seedInitialFleetDataIfEmpty(localData?: {
  vehicles?: Vehicle[];
  drivers?: Driver[];
  trips?: TripRoute[];
  maintenance?: MaintenanceRecord[];
  locations?: LocationPlace[];
  regions?: RegionItem[];
  fuel?: FuelRecord[];
  expenses?: ExpenseRecord[];
}) {
  try {
    const vSnap = await getDocs(getCompanyColRef(DEFAULT_COMPANY_ID, 'vehicles'));
    if (!vSnap.empty) {
      return;
    }

    // Check root vehicles as well
    const rootSnap = await getDocs(collection(db, 'vehicles'));
    if (!rootSnap.empty) {
      return;
    }

    const batch = writeBatch(db);

    const vehiclesToSeed = localData?.vehicles || INITIAL_VEHICLES;
    vehiclesToSeed.forEach((v) => {
      batch.set(getCompanyDocRef(DEFAULT_COMPANY_ID, 'vehicles', v.id), { ...v, companyId: DEFAULT_COMPANY_ID });
    });

    const driversToSeed = localData?.drivers || INITIAL_DRIVERS;
    driversToSeed.forEach((d) => {
      batch.set(getCompanyDocRef(DEFAULT_COMPANY_ID, 'drivers', d.id), { ...d, companyId: DEFAULT_COMPANY_ID });
    });

    const tripsToSeed = localData?.trips || INITIAL_TRIPS;
    tripsToSeed.forEach((t) => {
      batch.set(getCompanyDocRef(DEFAULT_COMPANY_ID, 'trips', t.id), { ...t, companyId: DEFAULT_COMPANY_ID });
    });

    const maintToSeed = localData?.maintenance || INITIAL_MAINTENANCE;
    maintToSeed.forEach((m) => {
      batch.set(getCompanyDocRef(DEFAULT_COMPANY_ID, 'maintenance', m.id), { ...m, companyId: DEFAULT_COMPANY_ID });
    });

    const locsToSeed = localData?.locations || INITIAL_LOCATIONS;
    locsToSeed.forEach((l) => {
      batch.set(getCompanyDocRef(DEFAULT_COMPANY_ID, 'locations', l.id), { ...l, companyId: DEFAULT_COMPANY_ID });
    });

    const fuelToSeed = localData?.fuel || INITIAL_FUEL;
    fuelToSeed.forEach((f) => {
      batch.set(getCompanyDocRef(DEFAULT_COMPANY_ID, 'fuel', f.id), { ...f, companyId: DEFAULT_COMPANY_ID });
    });

    await batch.commit();
    console.log('Successfully seeded initial fleet data to Firestore.');
  } catch (err) {
    console.warn('Notice seeding initial fleet data to cloud:', err);
  }
}

// Backward compatibility alias for listenToNotifications
export function listenToNotifications(callback: (notifs: any[]) => void): () => void {
  return listenToCompanyNotifications(DEFAULT_COMPANY_ID, callback);
}
