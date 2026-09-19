import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Briefcase,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  RefreshCw,
  Layers,
  Database,
  ShieldCheck,
  Building2,
  Info,
  Calendar,
  Sparkles,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { Deal, DealStage, DealStatus } from '../../types/sales';
import { INITIAL_DEALS, MONTHLY_SALES_DATA_2026 } from '../../data/salesData';
import { KpiCard } from './KpiCard';
import { SalesChart } from './SalesChart';
import { PipelineChart } from './PipelineChart';
import { DealsTable } from './DealsTable';
import { DealFormModal } from './DealFormModal';
import { DealDetailsModal } from './DealDetailsModal';
import {
  listenToCompanyDeals,
  saveDealToCloud,
  deleteDealFromCloud,
} from '../../services/salesService';

export interface DashboardProps {
  onSwitchToFleet?: () => void;
  companyId?: string;
  currentUser?: { name?: string; email?: string; uid?: string; role?: string };
  canEdit?: boolean;
  canDelete?: boolean;
  isOnlineCloud?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSwitchToFleet,
  companyId = 'company-01',
  currentUser,
  canEdit = true,
  canDelete = true,
  isOnlineCloud = true,
}) => {
  // Deals State with fallback
  const [deals, setDeals] = useState<Deal[]>(() => {
    try {
      const stored = localStorage.getItem(`sales_deals_${companyId}`);
      if (stored) return JSON.parse(stored);
      const legacy = localStorage.getItem('sales_dashboard_deals_v1');
      if (legacy) return JSON.parse(legacy);
    } catch (e) {
      console.warn('Could not read stored deals:', e);
    }
    return INITIAL_DEALS;
  });

  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Subscribe to real-time deals from Firestore
  useEffect(() => {
    const unsubscribe = listenToCompanyDeals(companyId, (cloudDeals) => {
      if (cloudDeals && cloudDeals.length > 0) {
        setDeals(cloudDeals);
        setIsCloudSynced(true);
      } else {
        // First run: only persist initial deals if authenticated
        if (currentUser?.uid) {
          INITIAL_DEALS.forEach((deal) => {
            saveDealToCloud(companyId, { ...deal, companyId }, currentUser).catch((err) => {
              console.warn('[SalesDashboard] Initial deal sync warning:', err?.message || err);
            });
          });
        }
      }
    });

    return () => unsubscribe();
  }, [companyId, currentUser?.uid]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<Deal | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ title: string; desc: string } | null>(null);

  // Add deal
  const handleAddDeal = async (newDeal: Deal) => {
    const dealWithCompany = { ...newDeal, companyId };
    setDeals((prev) => [dealWithCompany, ...prev]);
    try {
      await saveDealToCloud(companyId, dealWithCompany, currentUser);
    } catch (e) {
      console.warn('Cloud save error, saved locally:', e);
    }

    setNotificationMsg({
      title: 'تمت إضافة الصفقة بنجاح',
      desc: `تم إدراج الصفقة (${newDeal.id}) للعميل "${newDeal.client}" بقيمة $${newDeal.amount.toLocaleString()}.`,
    });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Update deal
  const handleUpdateDeal = async (updatedDeal: Deal) => {
    const previous = deals.find((d) => d.id === updatedDeal.id);
    setDeals((prev) => prev.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)));
    setSelectedDealForDetails(updatedDeal);

    try {
      await saveDealToCloud(companyId, updatedDeal, currentUser, previous);
    } catch (e) {
      console.warn('Cloud update error, saved locally:', e);
    }

    setNotificationMsg({
      title: 'تم تحديث بيانات الصفقة',
      desc: `تم تعديل مرحلة/حالة الصفقة (${updatedDeal.id}) بنجاح.`,
    });
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Stage change directly from Kanban Drag-and-Drop
  const handleUpdateDealStage = async (deal: Deal, newStage: DealStage) => {
    const isReady = newStage === 'جاهز للإغلاق';
    const updated: Deal = {
      ...deal,
      stage: newStage,
      status: isReady ? 'success' : deal.status === 'success' ? 'in-progress' : deal.status,
      actualCloseDate: isReady ? new Date().toISOString().slice(0, 10) : deal.actualCloseDate,
    };
    await handleUpdateDeal(updated);
  };

  // Delete deal
  const handleDeleteDeal = async (dealId: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    try {
      await deleteDealFromCloud(companyId, dealId);
    } catch (e) {
      console.warn('Cloud delete error:', e);
    }

    setNotificationMsg({
      title: 'تم حذف الصفقة',
      desc: `تمت إزالة الصفقة (${dealId}) من سجل المبيعات.`,
    });
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Reset to default initial sample data
  const handleResetToDemo = async () => {
    for (const d of INITIAL_DEALS) {
      await saveDealToCloud(companyId, { ...d, companyId }, { name: 'مدير النظام' });
    }
    setDeals(INITIAL_DEALS);
    setNotificationMsg({
      title: 'تمت استعادة البيانات النموذجية',
      desc: 'تمت إعادة ضبط الصفقات على القيم التوضيحية الافتراضية بنجاح.',
    });
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const closedDeals = deals.filter((d) => d.stage === 'جاهز للإغلاق' || d.status === 'success');
    const closedRevenue = closedDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const activeDeals = deals.filter((d) => d.stage !== 'جاهز للإغلاق' && d.status !== 'success');
    const activePipeline = activeDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    const pendingRequests = deals.filter((d) => d.stage === 'تقديم العرض' || d.status === 'pending').length;

    // Realistic duration based on closed deals dates if available
    let avgCloseDuration = 18;
    const durations = closedDeals
      .filter((d) => d.actualCloseDate && d.createdAt)
      .map((d) => {
        const diff = new Date(d.actualCloseDate!).getTime() - new Date(d.createdAt).getTime();
        return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
      });
    if (durations.length > 0) {
      avgCloseDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    return {
      closedRevenue,
      activePipeline,
      pendingRequests,
      avgCloseDuration,
      totalDeals: deals.length,
      closedCount: closedDeals.length,
    };
  }, [deals]);

  const handleOpenDetails = (deal: Deal) => {
    setSelectedDealForDetails(deal);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top Banner / Sync Status Indicator */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${
                isCloudSynced
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-blue-950 text-blue-300 border-blue-800'
              }`}
            >
              {isCloudSynced ? <Cloud className="w-3.5 h-3.5 text-emerald-400" /> : <CloudOff className="w-3.5 h-3.5 text-blue-400" />}
              <span>{isCloudSynced ? 'سحابي متصل (Cloud Sync Active)' : 'تخزين محلي نشط'}</span>
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              منظومة المبيعات متكاملة ومؤمنة بقواعد Firestore مع تدقيق الأنشطة.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={handleResetToDemo}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                title="إعادة تعيين الصفقات للبيانات الافتراضية"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة ضبط النموذج</span>
              </button>
            )}

            {onSwitchToFleet && (
              <button
                onClick={onSwitchToFleet}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition cursor-pointer underline"
              >
                <Building2 className="w-3 h-3" />
                <span>الانتقال لمنظومة أسطول العمليات</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Subtitle */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    لوحة دعم المبيعات وعروض الأسعار
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-wide">
                    Sales Support & Pipeline Management Dashboard
                  </p>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col text-left font-mono text-[11px] text-slate-400 pl-3 border-l border-slate-800">
                <span className="text-slate-200 font-bold">النصف الأول (H1 2026)</span>
                <span>تحديث مستمر للفرص</span>
              </div>

              {canEdit && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة صفقة / RFP جديد</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md bg-slate-900 border border-blue-500/50 rounded-xl p-4 shadow-2xl shadow-black/50 text-right animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">{notificationMsg.title}</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">{notificationMsg.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. KPI Cards Grid (4 Cards) */}
        <section aria-label="مؤشرات الأداء الرئيسية للمبيعات" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Closed Revenue */}
          <KpiCard
            id="kpi-closed-revenue"
            title="الإيرادات المغلقة"
            titleEn="Closed Revenue"
            value={`$${kpis.closedRevenue.toLocaleString()}`}
            subtitle={`${kpis.closedCount} صفقات معتمدة ومكتملة`}
            change={{ value: 18.4, period: 'مقارنة بالشهر السابق', isPositive: true }}
            icon={DollarSign}
            accentColor="emerald"
            badgeText="H1 2026"
          />

          {/* KPI 2: Active Pipeline */}
          <KpiCard
            id="kpi-active-pipeline"
            title="قيمة الصفقات النشطة"
            titleEn="Active Pipeline"
            value={`$${kpis.activePipeline.toLocaleString()}`}
            subtitle={`${kpis.totalDeals - kpis.closedCount} فرص قيد التفاوض والمراجعة`}
            change={{ value: 12.1, period: 'فرص جديدة مضافة', isPositive: true }}
            icon={Briefcase}
            accentColor="blue"
            badgeText="جاري المتابعة"
          />

          {/* KPI 3: Pending Quote Requests */}
          <KpiCard
            id="kpi-pending-quotes"
            title="طلبات عروض الأسعار المعلقة"
            titleEn="Pending Quote Requests"
            value={kpis.pendingRequests}
            subtitle="عروض تنتظر رد لجنة البت بالعميل"
            change={{ value: 4.5, period: 'معدل استجابة أسرع', isPositive: true }}
            icon={Clock}
            accentColor="amber"
            badgeText="تحتاج متابعة"
          />

          {/* KPI 4: Average Close Duration */}
          <KpiCard
            id="kpi-avg-duration"
            title="متوسط مدة الإغلاق"
            titleEn="Avg. Close Duration"
            value={`${kpis.avgCloseDuration} يوم`}
            subtitle="من تاريخ تقديم العرض حتى التوقيع"
            change={{ value: 8.0, period: 'تقليص دورة البيع', isPositive: true }}
            icon={CheckCircle2}
            accentColor="indigo"
            badgeText="أداء ممتاز"
          />
        </section>

        {/* 2. Charts Section: Actual vs Target Bar Chart & Pipeline Donut Chart */}
        <section aria-label="الرسوم البيانية والتحليلات" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <SalesChart data={MONTHLY_SALES_DATA_2026} id="monthly-actual-vs-target" />
          </div>

          <div className="lg:col-span-5">
            <PipelineChart deals={deals} id="pipeline-stage-donut" />
          </div>
        </section>

        {/* 3. Deals Management Section (Table + Interactive Kanban Board) */}
        <section aria-label="جدول الصفقات والفرص">
          <DealsTable
            deals={deals}
            onViewDetails={handleOpenDetails}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onUpdateDealStage={handleUpdateDealStage}
            canEdit={canEdit}
            id="sales-deals-table"
          />
        </section>
      </main>

      {/* Create Deal Modal */}
      <DealFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddDeal={handleAddDeal}
        companyId={companyId}
        currentUser={currentUser}
      />

      {/* Deal Details Modal with Audit Timeline & AI Insights */}
      <DealDetailsModal
        deal={selectedDealForDetails}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onUpdateDeal={handleUpdateDeal}
        onDeleteDeal={handleDeleteDeal}
        companyId={companyId}
        currentUser={currentUser}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
};
