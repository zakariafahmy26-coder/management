import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { MigrationStatus } from '../types';

/**
 * Migration Service:
 * Gracefully transfers legacy root collections to multi-tenant subcollections:
 * e.g., root 'vehicles' -> 'companies/{companyId}/vehicles'
 * Ensures idempotency and preserves old documents without destructive drops.
 */

export async function getMigrationStatus(companyId: string): Promise<MigrationStatus | null> {
  try {
    const statusDoc = await getDoc(doc(db, 'companies', companyId, 'migration', 'status'));
    if (statusDoc.exists()) {
      return statusDoc.data() as MigrationStatus;
    }
  } catch (err) {
    console.warn(`Could not fetch migration status for ${companyId}:`, err);
  }
  return null;
}

export async function migrateLegacyDataToCompany(
  companyId: string,
  onProgress?: (msg: string) => void
): Promise<MigrationStatus> {
  const result: MigrationStatus = {
    companyId,
    isMigrated: false,
    recordsMigrated: {
      vehicles: 0,
      drivers: 0,
      tasks: 0,
      trips: 0,
      maintenance: 0,
      locations: 0,
      fuel: 0,
      notifications: 0,
      auditLogs: 0,
    },
    errors: [],
  };

  const collectionsToMigrate: Array<{
    legacyCol: string;
    subCol: string;
    statKey: keyof MigrationStatus['recordsMigrated'];
  }> = [
    { legacyCol: 'vehicles', subCol: 'vehicles', statKey: 'vehicles' },
    { legacyCol: 'drivers', subCol: 'drivers', statKey: 'drivers' },
    { legacyCol: 'trips', subCol: 'trips', statKey: 'trips' },
    { legacyCol: 'maintenance', subCol: 'maintenance', statKey: 'maintenance' },
    { legacyCol: 'locations', subCol: 'locations', statKey: 'locations' },
    { legacyCol: 'fuel', subCol: 'fuel', statKey: 'fuel' },
    { legacyCol: 'fleet_notifications', subCol: 'notifications', statKey: 'notifications' },
  ];

  try {
    for (const item of collectionsToMigrate) {
      if (onProgress) onProgress(`فحص ترحيل مجموعة: ${item.legacyCol}...`);
      try {
        const legacySnap = await getDocs(collection(db, item.legacyCol));
        if (!legacySnap.empty) {
          const batch = writeBatch(db);
          let count = 0;

          for (const docSnap of legacySnap.docs) {
            const data = docSnap.data();
            // Verify if already in company subcollection
            const targetDocRef = doc(db, 'companies', companyId, item.subCol, docSnap.id);
            const targetSnap = await getDoc(targetDocRef);
            if (!targetSnap.exists()) {
              batch.set(targetDocRef, {
                ...data,
                companyId,
                migratedFromLegacy: true,
                migratedAt: new Date().toISOString(),
              });
              count++;
            }
          }

          if (count > 0) {
            await batch.commit();
            result.recordsMigrated[item.statKey] = count;
          }
        }
      } catch (colErr: any) {
        console.warn(`Error migrating collection ${item.legacyCol}:`, colErr);
        result.errors?.push(`Collection ${item.legacyCol}: ${colErr?.message || colErr}`);
      }
    }

    result.isMigrated = true;
    result.migratedAt = new Date().toISOString();

    // Write migration tracking doc
    await setDoc(doc(db, 'companies', companyId, 'migration', 'status'), result, { merge: true });

    if (onProgress) onProgress('اكتملت عملية الترحيل المؤسسي بنجاح!');
  } catch (error: any) {
    console.error('Migration failed:', error);
    result.errors?.push(error.message || String(error));
  }

  return result;
}

export const migrationService = {
  getMigrationStatus,
  migrateLegacyDataToCompany,
  migrateLegacyFleetDataToCompany: async (
    companyId: string,
    onProgress?: (msg: string) => void
  ): Promise<MigrationStatus & { migratedRecords: number }> => {
    const res = await migrateLegacyDataToCompany(companyId, onProgress);
    const totalMigrated = Object.values(res.recordsMigrated).reduce((a, b) => a + b, 0);
    return {
      ...res,
      migratedRecords: totalMigrated,
    };
  },
};
