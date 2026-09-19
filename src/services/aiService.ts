import { auth } from './firebase';
import {
  Driver,
  FuelRecord,
  MaintenanceRecord,
  MonthlyReportSummary,
  TripRoute,
  Vehicle,
} from '../types';

export interface ScannedReceiptResult {
  date?: string;
  stationOrWorkshop?: string;
  vehiclePlate?: string;
  fuelType?: string;
  liters?: number;
  pricePerLiter?: number;
  totalCost?: number;
  receiptNumber?: string;
  category?: 'وقود' | 'صيانة';
  notes?: string;
  confidence?: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    console.warn('Could not get Firebase auth token:', e);
  }
  return headers;
}

export const aiService = {
  /**
   * Check if Gemini AI is configured and responsive
   */
  async checkStatus(): Promise<{ status: string; geminiConfigured: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const json = await res.json();
      return json.data || json;
    } catch (err) {
      console.warn('AI health check failed:', err);
      return { status: 'error', geminiConfigured: false };
    }
  },

  /**
   * Ask the Fleet AI Copilot (Authorized server-side contextual prompt)
   */
  async askFleetCopilot(
    message: string,
    contextData?: Record<string, any>,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        history,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || json.error || 'تعذر الاتصال بخدمة الذكاء الاصطناعي');
    }

    return json.data?.reply || json.reply || '';
  },

  /**
   * Scan fuel receipt or maintenance invoice using Gemini Multimodal Vision
   */
  async scanReceipt(
    imageBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<{ data: ScannedReceiptResult; rawText: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/scan-receipt', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        imageBase64,
        mimeType,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || json.error || 'فشل تحليل الإيصال بالذكاء الاصطناعي');
    }

    const payload = json.data || json;
    return {
      data: payload.receiptData || payload.data || {},
      rawText: payload.rawText || '',
    };
  },

  /**
   * Strategic Fleet Insights & Predictive Recommendations
   */
  async getFleetInsights(payload?: {
    vehicles?: Vehicle[];
    drivers?: Driver[];
    trips?: TripRoute[];
    maintenance?: MaintenanceRecord[];
    fuelRecords?: FuelRecord[];
  }): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/fleet-insights', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {}),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || json.error || 'تعذر استخراج توصيات الذكاء الاصطناعي');
    }

    return json.data?.insights || json.insights || '';
  },

  /**
   * Generate Executive Monthly Report
   */
  async generateExecutiveReport(reportSummary?: MonthlyReportSummary): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/ai/executive-report', {
      method: 'POST',
      headers,
      body: JSON.stringify({ reportSummary }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error?.message || json.error || 'تعذر توليد التقرير بالذكاء الاصطناعي');
    }

    return json.data?.report || json.report || '';
  },
};
