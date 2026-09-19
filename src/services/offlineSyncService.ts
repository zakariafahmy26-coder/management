import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { OfflineMutationItem } from '../types';

const OFFLINE_QUEUE_KEY = 'fleet_offline_mutation_queue_v3';
const MAX_RETRIES = 3;

export function getOfflineMutationQueue(): OfflineMutationItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineMutationQueue(queue: OfflineMutationItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline mutation queue:', err);
  }
}

/**
 * Enqueue a mutation when offline or when an initial write fails due to network.
 * De-duplicates operations on the same entity to prevent ghost overwrites.
 */
export function enqueueOfflineMutation(mutation: {
  companyId: string;
  collection: string;
  documentId: string;
  operationType: 'create' | 'update' | 'delete';
  payload: any;
}): OfflineMutationItem {
  const queue = getOfflineMutationQueue();
  const existingIdx = queue.findIndex(
    (item) =>
      item.companyId === mutation.companyId &&
      item.collection === mutation.collection &&
      item.documentId === mutation.documentId
  );

  const operationId = `op_${mutation.companyId}_${mutation.collection}_${mutation.documentId}_${Date.now()}`;
  const newItem: OfflineMutationItem = {
    operationId,
    companyId: mutation.companyId,
    collection: mutation.collection,
    documentId: mutation.documentId,
    operationType: mutation.operationType,
    payload: mutation.payload,
    timestamp: Date.now(),
    retryCount: 0,
    conflictStatus: 'none',
  };

  if (existingIdx >= 0) {
    // If previous was a create and this is update, keep create with merged payload
    if (queue[existingIdx].operationType === 'create' && mutation.operationType === 'update') {
      newItem.operationType = 'create';
      newItem.payload = { ...queue[existingIdx].payload, ...mutation.payload };
    }
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }

  saveOfflineMutationQueue(queue);
  return newItem;
}

// Backward compatibility helper
export function enqueueOfflineAction(action: {
  collectionName: string;
  entityId: string;
  data: any;
  companyId?: string;
}) {
  return enqueueOfflineMutation({
    companyId: action.companyId || 'company-01',
    collection: action.collectionName,
    documentId: action.entityId,
    operationType: 'update',
    payload: action.data,
  });
}

/**
 * Resolves the target Firestore document path whether top-level or company subcollection
 */
function resolveDocRef(item: OfflineMutationItem) {
  if (item.collection.startsWith('companies/')) {
    // Already full path e.g. "companies/company-01/vehicles"
    return doc(db, item.collection, item.documentId);
  }
  // Subcollection under company
  return doc(db, 'companies', item.companyId, item.collection, item.documentId);
}

/**
 * Flushes all pending mutations when connection is restored
 */
export async function flushOfflineMutationQueue(
  onProgress?: (syncedCount: number, total: number) => void
): Promise<{ success: number; failed: number; conflicts: number }> {
  const queue = getOfflineMutationQueue();
  if (!queue.length) return { success: 0, failed: 0, conflicts: 0 };

  let successCount = 0;
  let failedCount = 0;
  let conflictCount = 0;
  const remainingQueue: OfflineMutationItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    if (item.retryCount >= MAX_RETRIES) {
      console.warn(`Mutation ${item.operationId} exceeded maximum retry limit of ${MAX_RETRIES}`);
      failedCount++;
      continue;
    }

    try {
      const targetDoc = resolveDocRef(item);

      if (item.operationType === 'delete') {
        await deleteDoc(targetDoc);
        successCount++;
      } else {
        // Conflict detection check
        let hasConflict = false;
        try {
          const remoteSnap = await getDoc(targetDoc);
          if (remoteSnap.exists()) {
            const remoteData = remoteSnap.data();
            const remoteUpdatedAt = remoteData?.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;
            if (remoteUpdatedAt > item.timestamp) {
              // Server has a newer modification
              hasConflict = true;
              conflictCount++;
              item.conflictStatus = 'conflict_detected';
              // Merge non-overriding fields to avoid clobbering
              item.payload = { ...remoteData, ...item.payload, updatedAt: new Date().toISOString() };
            }
          }
        } catch {
          // If remote check fails, proceed with optimistic merge
        }

        await setDoc(targetDoc, { ...item.payload, _syncedFromOffline: true }, { merge: true });
        successCount++;
      }
    } catch (err: any) {
      console.warn(`Retry failed for mutation ${item.operationId}:`, err);
      item.retryCount += 1;
      item.error = err instanceof Error ? err.message : String(err);
      failedCount++;
      remainingQueue.push(item);
    }

    if (onProgress) {
      onProgress(successCount, queue.length);
    }
  }

  saveOfflineMutationQueue(remainingQueue);
  return { success: successCount, failed: failedCount, conflicts: conflictCount };
}

/**
 * Start listening for browser connectivity events
 */
export function startOfflineSyncListener(
  onSynced?: (syncedCount: number) => void
): () => void {
  const handleOnline = async () => {
    const queue = getOfflineMutationQueue();
    if (queue.length > 0) {
      const result = await flushOfflineMutationQueue();
      if (result.success > 0 && onSynced) {
        onSynced(result.success);
      }
    }
  };

  window.addEventListener('online', handleOnline);

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    handleOnline();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

// Backward compatibility export aliases
export const flushOfflineQueue = flushOfflineMutationQueue;
export const getOfflineQueue = getOfflineMutationQueue;
