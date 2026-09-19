import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  Plus,
  Building,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Table as TableIcon,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Deal, DealStage, DealStatus } from '../../types/sales';
import { PipelineKanbanView } from './PipelineKanbanView';

export interface DealsTableProps {
  deals: Deal[];
  onViewDetails: (deal: Deal) => void;
  onOpenCreateModal: () => void;
  onUpdateDealStage?: (deal: Deal, newStage: DealStage) => void;
  canEdit?: boolean;
  id?: string;
}

export const DealsTable: React.FC<DealsTableProps> = ({
  deals,
  onViewDetails,
  onOpenCreateModal,
  onUpdateDealStage,
  canEdit = true,
  id = 'deals-management-table',
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount-desc' | 'amount-asc' | 'date-desc' | 'client-asc'>('amount-desc');

  const STAGES: DealStage[] = ['تقديم العرض', 'المفاوضات', 'مراجعة العقود', 'جاهز للإغلاق'];

  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    return deals
      .filter((deal) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          deal.client.toLowerCase().includes(query) ||
          deal.id.toLowerCase().includes(query) ||
          deal.owner.toLowerCase().includes(query);

        const matchesStage = selectedStage === 'all' || deal.stage === selectedStage;
        const matchesStatus = selectedStatus === 'all' || deal.status === selectedStatus;

        return matchesSearch && matchesStage && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'client-asc') return a.client.localeCompare(b.client, 'ar');
        return 0;
      });
  }, [deals, searchQuery, selectedStage, selectedStatus, sortBy]);

  // Status visual mapping
  const getStatusBadge = (status: DealStatus) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>مكتمل (Success)</span>
          </span>
        );
      case 'lost':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>خاسر (Lost)</span>
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950/80 text-blue-400 border border-blue-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>قيد التنفيذ (In-Progress)</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>معلق (Pending)</span>
          </span>
        );
    }
  };

  // Stage badge mapping
  const getStageBadge = (stage: DealStage) => {
    switch (stage) {
      case 'جاهز للإغلاق':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
            {stage}
          </span>
        );
      case 'مراجعة العقود':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
            {stage}
          </span>
        );
      case 'المفاوضات':
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950/70 text-blue-300 border border-blue-800/50">
            {stage}
          </span>
        );
      case 'تقديم العرض':
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/50">
            {stage}
          </span>
        );
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['معرف الصفقة', 'العميل', 'القيمة بالدولار', 'المرحلة', 'المسؤول', 'الحالة التشغيلية', 'الأولوية', 'تاريخ الإنشاء'];
    const rows = filteredDeals.map((d) => [
      d.id,
      `"${d.client.replace(/"/g, '""')}"`,
      d.amount,
      `"${d.stage}"`,
      `"${d.owner}"`,
      d.status,
      d.priority || 'متوسطة',
      d.createdAt,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales-deals-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStage('all');
    setSelectedStatus('all');
  };

  return (
    <div
      id={id}
      className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg shadow-black/20 space-y-4"
    >
      {/* Table Section Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              إدارة الصفقات وعروض الأسعار والـ RFPs
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              {filteredDeals.length} من {deals.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Active Deals, Quotes & Interactive Sales Pipeline
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Table vs Kanban */}
          <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول مفصل</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>لوحة كانبان (Kanban)</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="تصدير الصفقات إلى ملف CSV"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>تصدير CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>صفقة / طلب RFP جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* RENDER VIEW MODE: KANBAN BOARD */}
      {viewMode === 'kanban' ? (
        <PipelineKanbanView
          deals={filteredDeals}
          onViewDetails={onViewDetails}
          onOpenCreateModal={onOpenCreateModal}
          onUpdateDealStage={(deal, newStage) => {
            if (onUpdateDealStage) {
              onUpdateDealStage(deal, newStage);
            }
          }}
          canEdit={canEdit}
        />
      ) : (
        /* RENDER VIEW MODE: DETAILED TABLE */
        <>
          {/* Filters and Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالعميل أو معرف الصفقة أو المسؤول..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Stage Filter */}
            <div className="relative">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 transition cursor-pointer appearance-none"
              >
                <option value="all">جميع المراحل (All Stages)</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Operational Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 transition cursor-pointer appearance-none"
              >
                <option value="all">جميع الحالات التشغيلية (All Statuses)</option>
                <option value="success">مكتمل ومغلق (Success)</option>
                <option value="in-progress">قيد التنفيذ (In-Progress)</option>
                <option value="pending">معلق (Pending)</option>
                <option value="lost">خاسر (Lost)</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 transition cursor-pointer appearance-none"
              >
                <option value="amount-desc">القيمة: من الأعلى للأقل</option>
                <option value="amount-asc">القيمة: من الأقل للأعلى</option>
                <option value="date-desc">الأحدث إضافة أولاً</option>
                <option value="client-asc">اسم العميل أبجدياً</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Active Filter Pills if any */}
          {(searchQuery || selectedStage !== 'all' || selectedStatus !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
              <span>الفلاتر النشطة:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-slate-200 text-[11px]">
                  بحث: "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </span>
              )}
              {selectedStage !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-slate-200 text-[11px]">
                  المرحلة: {selectedStage}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStage('all')} />
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md text-slate-200 text-[11px]">
                  الحالة: {selectedStatus}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus('all')} />
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-blue-400 hover:text-blue-300 underline text-[11px] cursor-pointer"
              >
                إلغاء جميع الفلاتر
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="py-3.5 px-4 font-mono">معرف الصفقة (ID)</th>
                  <th className="py-3.5 px-4">العميل والمؤسسة</th>
                  <th className="py-3.5 px-4">القيمة (USD)</th>
                  <th className="py-3.5 px-4">المرحلة الحالية</th>
                  <th className="py-3.5 px-4">مسؤول المبيعات</th>
                  <th className="py-3.5 px-4">الحالة التشغيلية</th>
                  <th className="py-3.5 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDeals.length > 0 ? (
                  filteredDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onViewDetails(deal)}
                    >
                      {/* Deal ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-400 bg-blue-950/50 px-2 py-1 rounded-md border border-blue-900/60">
                          {deal.id}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
                            {deal.client}
                          </div>
                          <div className="flex items-center gap-2">
                            {deal.category && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {deal.category}
                              </span>
                            )}
                            {deal.priority && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  deal.priority === 'حرجة'
                                    ? 'bg-rose-950 text-rose-300'
                                    : deal.priority === 'عالية'
                                    ? 'bg-amber-950 text-amber-300'
                                    : 'text-slate-500'
                                }`}
                              >
                                {deal.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Amount in USD */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-black text-sm text-white">
                          ${deal.amount.toLocaleString()}
                        </span>
                      </td>

                      {/* Current Stage */}
                      <td className="py-3.5 px-4">
                        {getStageBadge(deal.stage)}
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-400">
                            {deal.owner.charAt(0)}
                          </div>
                          <span className="font-medium">{deal.owner}</span>
                        </div>
                      </td>

                      {/* Operational Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(deal.status)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(deal);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 transition text-xs font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>التفاصيل والسجل</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">
                            لا توجد صفقات مطابقة للمعايير المحددة
                          </h4>
                          <p className="text-xs text-slate-400">
                            جرّب تعديل كلمات البحث أو إلغاء فلاتر المرحلة والحالة للبحث الشامل.
                          </p>
                        </div>
                        <button
                          onClick={resetFilters}
                          className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-blue-400 border border-slate-700 transition cursor-pointer"
                        >
                          إعادة ضبط الفلاتر
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Summary */}
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              إجمالي القيمة للصفقات المعروضة:{' '}
              <strong className="text-white font-mono">
                ${filteredDeals.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
              </strong>
            </div>
            <div>
              انقر فوق أي صف لفتح بطاقة تفاصيل الصفقة وسجل الأنشطة والتدقيق
            </div>
          </div>
        </>
      )}
    </div>
  );
};
