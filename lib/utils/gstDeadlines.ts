/**
 * Statutory Due-Date Logic Engine & Compliance Tracker Utilities
 * PROMPT 11: Multi-Client Compliance Tracker & Statutory Due-Date Calendar
 * 
 * Rules supported:
 * 1. GSTR-1: 11th of succeeding month (Regular Monthly) or 13th of month succeeding quarter (QRMP).
 * 2. GSTR-3B: 20th of succeeding month (Regular Monthly) or 22nd/24th based on State Category (QRMP).
 * 3. CMP-08: 18th of month succeeding quarter (Composition scheme).
 * 4. GSTR-9 / GSTR-9C: 31st December of succeeding financial year.
 * 5. Section 47 Late fee computation: ₹50/day (standard) or ₹20/day (nil return).
 */

export type ReturnType = 'GSTR_1' | 'GSTR_3B' | 'CMP_08' | 'GSTR_9' | 'GSTR_9C';

export type FilingStatus =
  | 'Not Started'
  | 'Data Preparation'
  | 'Pending Client Approval'
  | 'Filed'
  | 'Overdue';

export type TaxScheme = 'Regular' | 'QRMP' | 'Composition';

export type StateCategory = 'Category_1' | 'Category_2';

export interface StatutoryFilingRecord {
  id: string;
  client_id: string;
  client_name: string;
  client_gstin: string;
  trade_name?: string;
  firm_id?: string;
  return_type: ReturnType;
  filing_period: string; // e.g. 'August 2026'
  due_date: string; // YYYY-MM-DD
  filing_status: FilingStatus;
  arn_number?: string | null;
  date_of_filing?: string | null; // YYYY-MM-DD
  tax_scheme: TaxScheme;
  is_nil: boolean;
  estimated_late_fee: number;
  days_overdue: number;
  days_remaining: number;
  state_code: string;
  state_category: StateCategory;
  state_name: string;
  tax_liability_cash?: number;
  itc_claimed?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientComplianceSummary {
  clientId: string;
  clientName: string;
  clientGstin: string;
  tradeName?: string;
  taxScheme: TaxScheme;
  stateName: string;
  stateCategory: StateCategory;
  gstr1Filing?: StatutoryFilingRecord;
  gstr3bFiling?: StatutoryFilingRecord;
  otherFilings: StatutoryFilingRecord[];
  overallHealth: 'Optimal' | 'Pending Review' | 'Critical Overdue';
  totalLateFeeAccrued: number;
}

export interface LateFeeComputation {
  daysOverdue: number;
  dailyRate: number;
  totalLateFee: number;
  cgstLateFee: number;
  sgstLateFee: number;
  isOverdue: boolean;
  maxCap: number;
}

/**
 * State Category Mapping for GSTR-3B QRMP Scheme
 * Category 1 (22nd of succeeding month): Southern and Western States
 * Category 2 (24th of succeeding month): Northern and Eastern States
 */
const CATEGORY_1_STATE_CODES = new Set([
  '22', // Chhattisgarh
  '23', // Madhya Pradesh
  '24', // Gujarat
  '26', // Dadra and Nagar Haveli and Daman and Diu
  '27', // Maharashtra
  '29', // Karnataka
  '30', // Goa
  '31', // Lakshadweep
  '32', // Kerala
  '33', // Tamil Nadu
  '34', // Puducherry
  '35', // Andaman and Nicobar Islands
  '36', // Telangana
  '37', // Andhra Pradesh
]);

export const GST_STATE_NAMES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

/**
 * Extract 2-digit State code from GSTIN
 */
export function getStateCodeFromGSTIN(gstin: string): string {
  if (!gstin || gstin.length < 2) return '27'; // Default Maharashtra
  return gstin.substring(0, 2);
}

/**
 * Determine State Category (1 vs 2) for QRMP GSTR-3B filings
 */
export function getStateCategory(stateCode: string): StateCategory {
  return CATEGORY_1_STATE_CODES.has(stateCode) ? 'Category_1' : 'Category_2';
}

/**
 * Auto-calculate statutory due date based on client profile, return type, and tax scheme
 * @param returnType 'GSTR_1' | 'GSTR_3B' | 'CMP_08' | 'GSTR_9' | 'GSTR_9C'
 * @param periodMonth 1 to 12 (Month for which return is filed, e.g. 8 for August)
 * @param periodYear 2026
 * @param taxScheme 'Regular' | 'QRMP' | 'Composition'
 * @param gstin Client's GSTIN
 */
export function calculateStatutoryDueDate(params: {
  returnType: ReturnType;
  periodMonth: number;
  periodYear: number;
  taxScheme?: TaxScheme;
  gstin?: string;
}): string {
  const { returnType, periodMonth, periodYear, taxScheme = 'Regular', gstin = '27AAAAA0000A1Z5' } = params;

  const stateCode = getStateCodeFromGSTIN(gstin);
  const stateCategory = getStateCategory(stateCode);

  // Month roll-over helper (succeeding month)
  let nextMonth = periodMonth + 1;
  let nextYear = periodYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = periodYear + 1;
  }

  // Format YYYY-MM-DD
  const format = (y: number, m: number, d: number) => {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  switch (returnType) {
    case 'GSTR_1':
      if (taxScheme === 'QRMP') {
        // QRMP filed quarterly on the 13th of month succeeding quarter
        // If mid-quarter month (month 1 or 2 of quarter), optional IFF is also 13th
        return format(nextYear, nextMonth, 13);
      }
      // Regular monthly: 11th of succeeding month
      return format(nextYear, nextMonth, 11);

    case 'GSTR_3B':
      if (taxScheme === 'QRMP') {
        // QRMP: Category 1 -> 22nd, Category 2 -> 24th
        const day = stateCategory === 'Category_1' ? 22 : 24;
        return format(nextYear, nextMonth, day);
      }
      // Regular monthly: 20th of succeeding month
      return format(nextYear, nextMonth, 20);

    case 'CMP_08':
      // Composition: 18th of month succeeding quarter
      return format(nextYear, nextMonth, 18);

    case 'GSTR_9':
    case 'GSTR_9C':
      // Annual return: 31st December of succeeding financial year
      // E.g., for FY 2025-26, due date is 31st December 2026
      return format(periodYear, 12, 31);

    default:
      return format(nextYear, nextMonth, 20);
  }
}

/**
 * Calculate Section 47 Late Fees for Overdue or Late-Filed Returns
 * - Standard return with tax: ₹50 per day (₹25 CGST + ₹25 SGST)
 * - Nil return: ₹20 per day (₹10 CGST + ₹10 SGST)
 * - Capped at statutory maxima (e.g. ₹500 for Nil, ₹2,000 for turnover <= 1.5Cr, ₹5,000 for 1.5-5Cr)
 */
export function calculateEstimatedLateFee(params: {
  dueDate: string;
  filingStatus: FilingStatus;
  dateOfFiling?: string | null;
  isNil?: boolean;
  asOfDate?: string;
  turnoverSlab?: 'NIL' | 'UP_TO_1_5_CR' | '1_5_TO_5_CR' | 'ABOVE_5_CR';
}): LateFeeComputation {
  const {
    dueDate,
    filingStatus,
    dateOfFiling,
    isNil = false,
    asOfDate,
    turnoverSlab = 'UP_TO_1_5_CR',
  } = params;

  const dueTime = new Date(dueDate).getTime();
  const effectiveEndDate =
    filingStatus === 'Filed' && dateOfFiling
      ? new Date(dateOfFiling).getTime()
      : asOfDate
      ? new Date(asOfDate).getTime()
      : new Date().getTime();

  // If filed on or before due date, zero late fee
  if (effectiveEndDate <= dueTime) {
    return {
      daysOverdue: 0,
      dailyRate: isNil ? 20 : 50,
      totalLateFee: 0,
      cgstLateFee: 0,
      sgstLateFee: 0,
      isOverdue: false,
      maxCap: isNil ? 500 : 2000,
    };
  }

  // Days overdue: difference in full 24h days
  const diffTime = effectiveEndDate - dueTime;
  const daysOverdue = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const dailyRate = isNil ? 20 : 50; // ₹10 or ₹25 each for CGST & SGST

  // Statutory Maximum Caps under Notification No. 19/2021-Central Tax & subsequent rationalizations
  let maxCap = 2000;
  if (isNil) {
    maxCap = 500;
  } else if (turnoverSlab === 'UP_TO_1_5_CR') {
    maxCap = 2000;
  } else if (turnoverSlab === '1_5_TO_5_CR') {
    maxCap = 5000;
  } else {
    maxCap = 10000;
  }

  const uncappedFee = daysOverdue * dailyRate;
  const totalLateFee = Math.min(uncappedFee, maxCap);
  const halfFee = Math.round((totalLateFee / 2) * 100) / 100;

  return {
    daysOverdue,
    dailyRate,
    totalLateFee,
    cgstLateFee: halfFee,
    sgstLateFee: halfFee,
    isOverdue: daysOverdue > 0,
    maxCap,
  };
}

/**
 * Fallback Seed Statutory Filings Generator
 * Generates realistic compliance records for onboarded clients across August 2026
 */
export function getFallbackStatutoryFilings(clients: Array<{ id: string; name: string; gstin: string; trade_name?: string }>): StatutoryFilingRecord[] {
  const filings: StatutoryFilingRecord[] = [];
  const currentPeriod = 'August 2026';
  const previousPeriod = 'July 2026';

  // Seed variations per client
  clients.forEach((client, index) => {
    const stateCode = getStateCodeFromGSTIN(client.gstin);
    const stateName = GST_STATE_NAMES[stateCode] || 'Maharashtra';
    const stateCategory = getStateCategory(stateCode);

    // Give 1 client QRMP scheme for realism
    const isQrmp = index === 2;
    const taxScheme: TaxScheme = isQrmp ? 'QRMP' : 'Regular';

    // 1. Current Period GSTR-1 (August 2026) -> Due 11 September 2026
    const gstr1DueDate = calculateStatutoryDueDate({
      returnType: 'GSTR_1',
      periodMonth: 8,
      periodYear: 2026,
      taxScheme,
      gstin: client.gstin,
    });

    // 2. Current Period GSTR-3B (August 2026) -> Due 20/22/24 September 2026
    const gstr3bDueDate = calculateStatutoryDueDate({
      returnType: 'GSTR_3B',
      periodMonth: 8,
      periodYear: 2026,
      taxScheme,
      gstin: client.gstin,
    });

    // Previous Period GSTR-3B (July 2026) -> Due 20 August 2026 (some might be overdue!)
    const prevGstr3bDueDate = calculateStatutoryDueDate({
      returnType: 'GSTR_3B',
      periodMonth: 7,
      periodYear: 2026,
      taxScheme,
      gstin: client.gstin,
    });

    // Entity Variation 0: GSTR-1 Filed, GSTR-3B in Data Preparation
    if (index === 0) {
      filings.push({
        id: `filing-${client.id}-g1-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_1',
        filing_period: currentPeriod,
        due_date: gstr1DueDate,
        filing_status: 'Filed',
        arn_number: 'AA270926019842M',
        date_of_filing: '2026-09-08',
        tax_scheme: taxScheme,
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 0,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
        tax_liability_cash: 0,
        itc_claimed: 0,
      });

      filings.push({
        id: `filing-${client.id}-g3b-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_3B',
        filing_period: currentPeriod,
        due_date: gstr3bDueDate,
        filing_status: 'Data Preparation',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: taxScheme,
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 16,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
        tax_liability_cash: 84200,
        itc_claimed: 142500,
      });
    }

    // Entity Variation 1: GSTR-1 Pending Client Approval, GSTR-3B Not Started
    else if (index === 1) {
      filings.push({
        id: `filing-${client.id}-g1-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_1',
        filing_period: currentPeriod,
        due_date: gstr1DueDate,
        filing_status: 'Pending Client Approval',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: taxScheme,
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 7,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
      });

      filings.push({
        id: `filing-${client.id}-g3b-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_3B',
        filing_period: currentPeriod,
        due_date: gstr3bDueDate,
        filing_status: 'Not Started',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: taxScheme,
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 16,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
      });
    }

    // Entity Variation 2 (QRMP): Both Filed on time
    else if (index === 2) {
      filings.push({
        id: `filing-${client.id}-g1-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_1',
        filing_period: currentPeriod,
        due_date: gstr1DueDate,
        filing_status: 'Filed',
        arn_number: 'AA270926048123A',
        date_of_filing: '2026-09-10',
        tax_scheme: 'QRMP',
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 0,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
      });

      filings.push({
        id: `filing-${client.id}-g3b-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_3B',
        filing_period: currentPeriod,
        due_date: gstr3bDueDate,
        filing_status: 'Pending Client Approval',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: 'QRMP',
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 18,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
      });
    }

    // Entity Variation 3: OVERDUE for July GSTR-3B (Creates realistic urgent action trigger!)
    else {
      // Overdue July 3B (due 20 August 2026, 15 days overdue by Sept 4)
      const lateFeeJuly = calculateEstimatedLateFee({
        dueDate: prevGstr3bDueDate,
        filingStatus: 'Overdue',
        asOfDate: '2026-09-04',
        isNil: false,
      });

      filings.push({
        id: `filing-${client.id}-g3b-july-overdue`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_3B',
        filing_period: previousPeriod,
        due_date: prevGstr3bDueDate,
        filing_status: 'Overdue',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: 'Regular',
        is_nil: false,
        estimated_late_fee: lateFeeJuly.totalLateFee,
        days_overdue: lateFeeJuly.daysOverdue,
        days_remaining: 0,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
        tax_liability_cash: 65000,
        notes: 'Tax computation ready. Client pending OTP for EVC/DSC verification.',
      });

      // August GSTR-1
      filings.push({
        id: `filing-${client.id}-g1-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_1',
        filing_period: currentPeriod,
        due_date: gstr1DueDate,
        filing_status: 'Data Preparation',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: 'Regular',
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 7,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
      });

      // August GSTR-3B
      filings.push({
        id: `filing-${client.id}-g3b-aug`,
        client_id: client.id,
        client_name: client.name,
        client_gstin: client.gstin,
        trade_name: client.trade_name,
        return_type: 'GSTR_3B',
        filing_period: currentPeriod,
        due_date: gstr3bDueDate,
        filing_status: 'Not Started',
        arn_number: null,
        date_of_filing: null,
        tax_scheme: 'Regular',
        is_nil: false,
        estimated_late_fee: 0,
        days_overdue: 0,
        days_remaining: 16,
        state_code: stateCode,
        state_category: stateCategory,
        state_name: stateName,
      });
    }
  });

  return filings;
}
