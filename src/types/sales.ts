export type DealStage = 'تقديم العرض' | 'المفاوضات' | 'مراجعة العقود' | 'جاهز للإغلاق';

export type DealStatus = 'pending' | 'in-progress' | 'success' | 'lost';

export type DealPriority = 'منخفضة' | 'متوسطة' | 'عالية' | 'حرجة';

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'meeting'
  | 'stage_change'
  | 'status_change'
  | 'rfp_sent'
  | 'system';

export interface DealActivity {
  id: string;
  companyId?: string;
  dealId: string;
  type: ActivityType;
  title: string;
  description: string;
  userName: string;
  userEmail?: string;
  timestamp: string; // ISO timestamp
  previousValue?: string;
  newValue?: string;
}

export interface DealAiInsight {
  winProbability: number; // 0 - 100
  summary: string;
  recommendations: string[];
  sentiment: 'positive' | 'neutral' | 'risk';
  suggestedFollowUp?: string;
  lastAnalyzedAt?: string;
}

export interface Deal {
  id: string; // e.g. "DEAL-2026-101"
  companyId?: string;
  client: string;
  amount: number; // in USD
  stage: DealStage;
  owner: string;
  ownerEmail?: string;
  status: DealStatus;
  createdAt: string; // ISO or YYYY-MM-DD
  updatedAt?: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  contactEmail?: string;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  rfpNumber?: string;
  category?: 'توريدات' | 'خدمات لوجستية' | 'عقود سنوية' | 'حلول تقنية';
  priority?: DealPriority;
  winProbability?: number;
  lostReason?: string;
  lastContactDate?: string;
  aiInsights?: DealAiInsight;
  createdBy?: string;
}

export interface DealAlert {
  id: string;
  dealId: string;
  client: string;
  type: 'overdue' | 'stagnant' | 'closing_soon' | 'high_value_risk';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  daysPassed?: number;
  expectedDate?: string;
}

export interface MonthlySalesData {
  month: string; // "Jan 2026"
  monthAr: string; // "يناير 2026"
  shortMonth: string; // "يناير"
  actual: number; // actual revenue in USD
  target: number; // target quota in USD
}

export interface SalesKpiSummary {
  closedRevenue: number;
  activePipeline: number;
  pendingQuoteRequests: number;
  avgCloseDurationDays: number;
  totalDealsCount: number;
  closedDealsCount: number;
  lostDealsCount: number;
  winRatePercentage: number;
  revenueAchievementRate: number;
  urgentAlertsCount: number;
}

