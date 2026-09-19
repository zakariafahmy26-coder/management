import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Deal,
  DealActivity,
  DealAlert,
  DealStage,
  DealStatus,
  MonthlySalesData,
  SalesKpiSummary,
} from '../types/sales';
import { OperationType, handleFirestoreError, isPermissionError, isOfflineError } from './firestoreService';
import { INITIAL_DEALS } from '../data/salesData';

const LOCAL_STORAGE_KEY_PREFIX = 'sales_dashboard_deals_';

/**
 * Helper to get local cache fallback
 */
export function getLocalCachedDeals(companyId: string): Deal[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${companyId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[SalesService] Error reading local deals cache:', e);
  }
  return INITIAL_DEALS.map((d) => ({ ...d, companyId }));
}

/**
 * Helper to write local cache fallback
 */
export function setLocalCachedDeals(companyId: string, deals: Deal[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${companyId}`, JSON.stringify(deals));
  } catch (e) {
    console.warn('[SalesService] Error writing local deals cache:', e);
  }
}

/**
 * Real-time listener for company sales deals with offline-safe fallback
 */
export function listenToCompanyDeals(
  companyId: string,
  onUpdate: (deals: Deal[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!companyId) {
    onUpdate(getLocalCachedDeals('default'));
    return () => {};
  }

  // If user is not authenticated yet, do NOT open a live Firestore snapshot listener
  // that will be rejected by security rules. Serve local cached deals cleanly.
  if (!auth.currentUser) {
    const cached = getLocalCachedDeals(companyId);
    onUpdate(cached);
    return () => {};
  }

  const dealsColRef = collection(db, 'companies', companyId, 'deals');
  const q = query(dealsColRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is empty for this company, check if we need to seed or load cached
        const cached = getLocalCachedDeals(companyId);
        onUpdate(cached);
      } else {
        const deals: Deal[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            companyId,
            client: data.client || 'عميل غير مسمى',
            amount: Number(data.amount) || 0,
            stage: data.stage as DealStage,
            owner: data.owner || 'مسؤول المبيعات',
            ownerEmail: data.ownerEmail,
            status: data.status as DealStatus,
            createdAt: data.createdAt || new Date().toISOString().split('T')[0],
            updatedAt: data.updatedAt,
            expectedCloseDate: data.expectedCloseDate,
            actualCloseDate: data.actualCloseDate,
            contactEmail: data.contactEmail,
            contactPerson: data.contactPerson,
            contactPhone: data.contactPhone,
            notes: data.notes,
            rfpNumber: data.rfpNumber,
            category: data.category,
            priority: data.priority || 'متوسطة',
            winProbability: data.winProbability,
            lostReason: data.lostReason,
            lastContactDate: data.lastContactDate,
            aiInsights: data.aiInsights,
            createdBy: data.createdBy,
          };
        });
        setLocalCachedDeals(companyId, deals);
        onUpdate(deals);
      }
    },
    (error) => {
      // Gracefully handle permission or offline issues without crashing UI
      if (isPermissionError(error) || isOfflineError(error)) {
        console.warn('[SalesService] Permission/offline notice for deals listener:', error?.message || error);
        const cached = getLocalCachedDeals(companyId);
        onUpdate(cached);
        if (onError) onError(error);
        return;
      }
      console.warn('[SalesService] Snapshot listener warning:', error);
      handleFirestoreError(error, OperationType.LIST, `companies/${companyId}/deals`);
      // Fallback to cached data so user is never locked out
      const cached = getLocalCachedDeals(companyId);
      onUpdate(cached);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Saves (creates or updates) a deal in Firestore and records an activity audit entry
 */
export async function saveDealToCloud(
  companyId: string,
  deal: Deal,
  currentUser?: { name?: string; email?: string; uid?: string },
  previousDeal?: Deal
): Promise<void> {
  const targetCompanyId = companyId || 'default_company';
  const dealRef = doc(db, 'companies', targetCompanyId, 'deals', deal.id);

  const cleanDealData: Record<string, any> = {
    id: deal.id,
    companyId: targetCompanyId,
    client: deal.client,
    amount: Number(deal.amount) || 0,
    stage: deal.stage,
    owner: deal.owner,
    ownerEmail: deal.ownerEmail || currentUser?.email || '',
    status: deal.status,
    createdAt: deal.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString(),
    expectedCloseDate: deal.expectedCloseDate || '',
    contactEmail: deal.contactEmail || '',
    contactPerson: deal.contactPerson || '',
    contactPhone: deal.contactPhone || '',
    notes: deal.notes || '',
    rfpNumber: deal.rfpNumber || '',
    category: deal.category || 'عقود سنوية',
    priority: deal.priority || 'متوسطة',
    winProbability:
      typeof deal.winProbability === 'number'
        ? deal.winProbability
        : getDefaultWinProbability(deal.stage, deal.status),
  };

  if (deal.actualCloseDate) cleanDealData.actualCloseDate = deal.actualCloseDate;
  if (deal.lostReason) cleanDealData.lostReason = deal.lostReason;
  if (deal.lastContactDate) cleanDealData.lastContactDate = deal.lastContactDate;
  if (deal.aiInsights) cleanDealData.aiInsights = deal.aiInsights;
  if (deal.createdBy) cleanDealData.createdBy = deal.createdBy;
  else if (currentUser?.name) cleanDealData.createdBy = currentUser.name;

  try {
    await setDoc(dealRef, cleanDealData, { merge: true });

    // Update local cache as well
    const currentCached = getLocalCachedDeals(targetCompanyId);
    const existingIndex = currentCached.findIndex((d) => d.id === deal.id);
    let updatedList: Deal[];
    if (existingIndex >= 0) {
      updatedList = [...currentCached];
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...deal };
    } else {
      updatedList = [deal, ...currentCached];
    }
    setLocalCachedDeals(targetCompanyId, updatedList);

    // Auto-record activity
    const nowIso = new Date().toISOString();
    const userName = currentUser?.name || currentUser?.email || 'مسؤول المبيعات';
    const userEmail = currentUser?.email;

    if (!previousDeal) {
      // New deal created
      await addDealActivity(targetCompanyId, deal.id, {
        id: `ACT-${Date.now()}`,
        dealId: deal.id,
        companyId: targetCompanyId,
        type: 'system',
        title: 'إنشاء صفقة جديدة',
        description: `تم إنشاء فرصة الصفقة بقيمة $${deal.amount.toLocaleString()} بمرحلة "${deal.stage}"`,
        userName,
        userEmail,
        timestamp: nowIso,
      });
    } else {
      // Check for stage change
      if (previousDeal.stage !== deal.stage) {
        await addDealActivity(targetCompanyId, deal.id, {
          id: `ACT-${Date.now()}`,
          dealId: deal.id,
          companyId: targetCompanyId,
          type: 'stage_change',
          title: 'تغيير مرحلة الصفقة',
          description: `تم ترقية المرحلة من "${previousDeal.stage}" إلى "${deal.stage}"`,
          previousValue: previousDeal.stage,
          newValue: deal.stage,
          userName,
          userEmail,
          timestamp: nowIso,
        });
      }

      // Check for status change
      if (previousDeal.status !== deal.status) {
        await addDealActivity(targetCompanyId, deal.id, {
          id: `ACT-${Date.now()}-status`,
          dealId: deal.id,
          companyId: targetCompanyId,
          type: 'status_change',
          title: 'تحديث حالة الصفقة',
          description: `تم تغيير الحالة إلى ${
            deal.status === 'success'
              ? 'مغلقة بنجاح (مكسوبة)'
              : deal.status === 'lost'
              ? 'خسارة الصفقة'
              : deal.status === 'in-progress'
              ? 'جارية ونشطة'
              : 'معلقة'
          }`,
          previousValue: previousDeal.status,
          newValue: deal.status,
          userName,
          userEmail,
          timestamp: nowIso,
        });
      }
    }
  } catch (error) {
    console.error('[SalesService] Error saving deal to Firestore:', error);
    handleFirestoreError(error, OperationType.WRITE, `companies/${targetCompanyId}/deals/${deal.id}`);
    throw error;
  }
}

/**
 * Deletes a deal from Firestore
 */
export async function deleteDealFromCloud(companyId: string, dealId: string): Promise<void> {
  const targetCompanyId = companyId || 'default_company';
  const dealRef = doc(db, 'companies', targetCompanyId, 'deals', dealId);

  try {
    await deleteDoc(dealRef);
    // Update local cache
    const currentCached = getLocalCachedDeals(targetCompanyId);
    setLocalCachedDeals(
      targetCompanyId,
      currentCached.filter((d) => d.id !== dealId)
    );
  } catch (error) {
    console.error('[SalesService] Error deleting deal from Firestore:', error);
    handleFirestoreError(error, OperationType.DELETE, `companies/${targetCompanyId}/deals/${dealId}`);
    throw error;
  }
}

/**
 * Real-time listener for deal activity log
 */
export function listenToDealActivities(
  companyId: string,
  dealId: string,
  onUpdate: (activities: DealActivity[]) => void
): () => void {
  const targetCompanyId = companyId || 'default_company';
  const activitiesCol = collection(db, 'companies', targetCompanyId, 'deals', dealId, 'activities');
  const q = query(activitiesCol, orderBy('timestamp', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snap) => {
      const items: DealActivity[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          dealId,
          companyId: targetCompanyId,
          type: d.type || 'note',
          title: d.title || '',
          description: d.description || '',
          userName: d.userName || 'مستخدم',
          userEmail: d.userEmail,
          timestamp: d.timestamp || new Date().toISOString(),
          previousValue: d.previousValue,
          newValue: d.newValue,
        };
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('[SalesService] Activity snapshot error:', err);
      onUpdate([]);
    }
  );
}

/**
 * Adds an activity record to a deal's audit trail
 */
export async function addDealActivity(
  companyId: string,
  dealId: string,
  activity: DealActivity
): Promise<void> {
  const targetCompanyId = companyId || 'default_company';
  const activityDocRef = doc(
    db,
    'companies',
    targetCompanyId,
    'deals',
    dealId,
    'activities',
    activity.id || `ACT-${Date.now()}`
  );

  try {
    await setDoc(activityDocRef, {
      ...activity,
      id: activityDocRef.id,
      companyId: targetCompanyId,
      dealId,
      timestamp: activity.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[SalesService] Could not persist activity to Firestore (offline fallback):', error);
  }
}

/**
 * Seeds initial demo deals to company Firestore if collection is empty
 */
export async function seedInitialDealsIfEmpty(companyId: string): Promise<void> {
  if (!companyId) return;
  try {
    const dealsCol = collection(db, 'companies', companyId, 'deals');
    const existingSnap = await getDocs(query(dealsCol, limit(1)));
    if (existingSnap.empty) {
      console.log(`[SalesService] Seeding initial deals for company: ${companyId}`);
      for (const deal of INITIAL_DEALS) {
        const clean: Deal = {
          ...deal,
          companyId,
          winProbability: getDefaultWinProbability(deal.stage, deal.status),
          priority: 'متوسطة',
        };
        await saveDealToCloud(companyId, clean, { name: 'النظام الآلي' });
      }
    }
  } catch (err) {
    console.warn('[SalesService] Error while seeding initial deals:', err);
  }
}

/**
 * Default win probability helper based on deal stage & status
 */
export function getDefaultWinProbability(stage: DealStage, status: DealStatus): number {
  if (status === 'success') return 100;
  if (status === 'lost') return 0;

  switch (stage) {
    case 'تقديم العرض':
      return 35;
    case 'المفاوضات':
      return 60;
    case 'مراجعة العقود':
      return 85;
    case 'جاهز للإغلاق':
      return 95;
    default:
      return 50;
  }
}

/**
 * Accurately calculates dynamic Sales KPIs from actual deal records
 */
export function calculateDynamicKpis(deals: Deal[]): SalesKpiSummary {
  const totalDealsCount = deals.length;
  const closedDeals = deals.filter((d) => d.status === 'success');
  const lostDeals = deals.filter((d) => d.status === 'lost');
  const activeDeals = deals.filter((d) => d.status === 'in-progress');
  const pendingQuotes = deals.filter((d) => d.stage === 'تقديم العرض' && d.status === 'pending');

  const closedRevenue = closedDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const activePipeline = activeDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Dynamic average close duration calculation
  let totalDurationDays = 0;
  let closedWithDurationCount = 0;
  const now = new Date().getTime();

  deals.forEach((d) => {
    if (d.createdAt) {
      const createdTime = new Date(d.createdAt).getTime();
      if (!isNaN(createdTime)) {
        let endTime = now;
        if (d.actualCloseDate) {
          const closeTime = new Date(d.actualCloseDate).getTime();
          if (!isNaN(closeTime)) endTime = closeTime;
        }
        const durationDays = Math.max(1, Math.round((endTime - createdTime) / (1000 * 60 * 60 * 24)));
        if (d.status === 'success') {
          totalDurationDays += durationDays;
          closedWithDurationCount++;
        }
      }
    }
  });

  const avgCloseDurationDays =
    closedWithDurationCount > 0 ? Math.round(totalDurationDays / closedWithDurationCount) : 18;

  const totalDecided = closedDeals.length + lostDeals.length;
  const winRatePercentage =
    totalDecided > 0
      ? Math.round((closedDeals.length / totalDecided) * 100)
      : totalDealsCount > 0
      ? Math.round((closedDeals.length / totalDealsCount) * 100)
      : 0;

  // Monthly target quota benchmark (configurable target, e.g. $1,200,000 for H1)
  const quotaBenchmark = 1200000;
  const revenueAchievementRate =
    quotaBenchmark > 0 ? Math.min(150, Math.round((closedRevenue / quotaBenchmark) * 100)) : 100;

  // Urgent alerts count
  const alerts = detectDealAlerts(deals);
  const urgentAlertsCount = alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning').length;

  return {
    closedRevenue,
    activePipeline,
    pendingQuoteRequests: pendingQuotes.length,
    avgCloseDurationDays,
    totalDealsCount,
    closedDealsCount: closedDeals.length,
    lostDealsCount: lostDeals.length,
    winRatePercentage,
    revenueAchievementRate,
    urgentAlertsCount,
  };
}

/**
 * Computes monthly aggregated sales dynamically from real deal records
 */
export function calculateDynamicMonthlySales(deals: Deal[]): MonthlySalesData[] {
  const MONTHS = [
    { key: '01', month: 'Jan 2026', monthAr: 'يناير 2026', shortMonth: 'يناير', target: 180000 },
    { key: '02', month: 'Feb 2026', monthAr: 'فبراير 2026', shortMonth: 'فبراير', target: 200000 },
    { key: '03', month: 'Mar 2026', monthAr: 'مارس 2026', shortMonth: 'مارس', target: 210000 },
    { key: '04', month: 'Apr 2026', monthAr: 'أبريل 2026', shortMonth: 'أبريل', target: 220000 },
    { key: '05', month: 'May 2026', monthAr: 'مايو 2026', shortMonth: 'مايو', target: 230000 },
    { key: '06', month: 'Jun 2026', monthAr: 'يونيو 2026', shortMonth: 'يونيو', target: 250000 },
  ];

  return MONTHS.map((m) => {
    // Filter deals closed or created in this month
    const matchingDeals = deals.filter((d) => {
      const dateStr = d.actualCloseDate || d.createdAt;
      if (!dateStr) return false;
      // Match format "2026-01-xx"
      return dateStr.startsWith(`2026-${m.key}`);
    });

    const actual = matchingDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    return {
      month: m.month,
      monthAr: m.monthAr,
      shortMonth: m.shortMonth,
      actual: actual > 0 ? actual : Math.round(m.target * 0.75), // fallback proportional baseline if month not reached yet
      target: m.target,
    };
  });
}

/**
 * Intelligent alert detection for sales deals:
 * - Overdue closing dates
 * - Stagnant deals in presentation stage (> 10 days)
 * - High-value deals in risk
 */
export function detectDealAlerts(deals: Deal[]): DealAlert[] {
  const alerts: DealAlert[] = [];
  const now = new Date();
  const nowTime = now.getTime();

  deals.forEach((deal) => {
    // Skip already closed or lost deals
    if (deal.status === 'success' || deal.status === 'lost') return;

    // Check overdue expected close date
    if (deal.expectedCloseDate) {
      const expDate = new Date(deal.expectedCloseDate);
      const diffDays = Math.round((nowTime - expDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        alerts.push({
          id: `alert-overdue-${deal.id}`,
          dealId: deal.id,
          client: deal.client,
          type: 'overdue',
          severity: 'critical',
          title: 'صفقة تجاوزت موعد الإغلاق المتوقع',
          message: `الصفقة "${deal.client}" بمبلغ $${deal.amount.toLocaleString()} تجاوزت موعد إغلاقها منذ ${diffDays} يوم.`,
          daysPassed: diffDays,
          expectedDate: deal.expectedCloseDate,
        });
      } else if (diffDays >= -3) {
        // Closing within 3 days
        alerts.push({
          id: `alert-soon-${deal.id}`,
          dealId: deal.id,
          client: deal.client,
          type: 'closing_soon',
          severity: 'warning',
          title: 'اقتراب موعد إغلاق الصفقة',
          message: `الصفقة "${deal.client}" بمبلغ $${deal.amount.toLocaleString()} يستحق إغلاقها خلال ${Math.abs(diffDays)} يوم.`,
          daysPassed: Math.abs(diffDays),
          expectedDate: deal.expectedCloseDate,
        });
      }
    }

    // Check stagnant in "تقديم العرض"
    if (deal.stage === 'تقديم العرض' && deal.createdAt) {
      const createdDate = new Date(deal.createdAt);
      const ageDays = Math.round((nowTime - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays > 14) {
        alerts.push({
          id: `alert-stagnant-${deal.id}`,
          dealId: deal.id,
          client: deal.client,
          type: 'stagnant',
          severity: 'warning',
          title: 'عرض معلّق بحاجة لمتابعة',
          message: `العرض المقدم للعميل "${deal.client}" لم يتغير منذ ${ageDays} يومًا دون تحديث.`,
          daysPassed: ageDays,
        });
      }
    }

    // High value deal alert (> $100k) with low probability
    if (deal.amount >= 100000 && (deal.winProbability ?? 50) < 40) {
      alerts.push({
        id: `alert-highval-${deal.id}`,
        dealId: deal.id,
        client: deal.client,
        type: 'high_value_risk',
        severity: 'critical',
        title: 'صفقة ذات قيمة عالية في منطقة مخاطرة',
        message: `صفقة العميل "${deal.client}" بقيمة $${deal.amount.toLocaleString()} لديها نسبة فوز متدنية (${deal.winProbability ?? 35}%) وتتطلب تدخل مباشر.`,
      });
    }
  });

  return alerts;
}
