'use server';

import { createClient } from '@/utils/supabase/server';
import {
  DepartmentNotice,
  NoticeReply,
  getFallbackDepartmentNotices,
  STATUTORY_PRECEDENTS,
} from '@/lib/scrutiny/statutory-defense';

// In-memory runtime cache for seamless session updates if remote db migration is pending
let runtimeNoticesCache: Record<string, DepartmentNotice[]> = {};
let runtimeRepliesCache: Record<string, NoticeReply[]> = {};

/**
 * Fetch all departmental scrutiny notices for the active client
 */
export async function getDepartmentNoticesAction(clientId: string): Promise<{
  success: boolean;
  data: DepartmentNotice[];
  error?: string;
}> {
  if (!clientId) {
    return { success: false, data: [], error: 'Client ID required' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('department_notices')
      .select('*')
      .eq('client_id', clientId)
      .order('due_date', { ascending: true });

    if (error || !data || data.length === 0) {
      // Return session-created notices or real empty array
      return { success: true, data: runtimeNoticesCache[clientId] || [] };
    }

    // Merge with any session-cached new notices
    const dbNotices = (data as any[]).map((row) => ({
      id: row.id,
      client_id: row.client_id,
      firm_id: row.firm_id,
      notice_reference_no: row.notice_reference_no,
      notice_type: row.notice_type,
      financial_year: row.financial_year,
      issue_date: row.issue_date,
      due_date: row.due_date,
      demand_tax: Number(row.demand_tax || 0),
      demand_interest: Number(row.demand_interest || 0),
      demand_penalty: Number(row.demand_penalty || 0),
      allegation_category: row.allegation_category,
      status: row.status,
      issuing_authority: row.issuing_authority,
      jurisdiction_office: row.jurisdiction_office,
      allegation_description: row.allegation_description,
      discrepancy_items: row.discrepancy_items || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as DepartmentNotice[];

    runtimeNoticesCache[clientId] = dbNotices;
    return { success: true, data: dbNotices };
  } catch (err: any) {
    console.warn('Fallback to seed scrutiny notices:', err.message);
    if (!runtimeNoticesCache[clientId] || runtimeNoticesCache[clientId].length === 0) {
      runtimeNoticesCache[clientId] = getFallbackDepartmentNotices(clientId);
    }
    return { success: true, data: runtimeNoticesCache[clientId] };
  }
}

/**
 * Fetch notice by ID along with its replies
 */
export async function getNoticeByIdAction(
  noticeId: string,
  clientId: string
): Promise<{
  success: boolean;
  notice?: DepartmentNotice;
  reply?: NoticeReply;
  error?: string;
}> {
  try {
    let notice: DepartmentNotice | undefined;

    // Check runtime cache first
    const clientNotices = runtimeNoticesCache[clientId] || getFallbackDepartmentNotices(clientId);
    notice = clientNotices.find((n) => n.id === noticeId);

    const supabase = await createClient();
    if (!notice) {
      const { data, error } = await supabase
        .from('department_notices')
        .select('*')
        .eq('id', noticeId)
        .single();

      if (!error && data) {
        notice = data as DepartmentNotice;
      }
    }

    if (!notice) {
      // Find across all cached clients
      for (const cId in runtimeNoticesCache) {
        const found = runtimeNoticesCache[cId].find((n) => n.id === noticeId);
        if (found) {
          notice = found;
          break;
        }
      }
    }

    if (!notice) {
      return { success: false, error: 'Notice not found' };
    }

    // Check for existing reply
    let reply: NoticeReply | undefined;
    const clientReplies = runtimeRepliesCache[noticeId];
    if (clientReplies && clientReplies.length > 0) {
      reply = clientReplies[0];
    } else {
      const { data: replyData, error: replyErr } = await supabase
        .from('notice_replies')
        .select('*')
        .eq('notice_id', noticeId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!replyErr && replyData && replyData.length > 0) {
        reply = replyData[0] as NoticeReply;
      }
    }

    return { success: true, notice, reply };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Save or update notice reply draft
 */
export async function saveNoticeReplyAction(payload: {
  noticeId: string;
  clientId: string;
  replyReferenceNo: string;
  factualRebuttal: string;
  preliminaryObjections?: string;
  statutoryCitations: any[];
  taxAccepted: number;
  taxDisputed: number;
  interestComputed: number;
  interestDisputed: number;
  penaltyDisputed: number;
  challanDetails?: any;
  status: 'Draft' | 'Partner Approved' | 'Submitted_ASMT11';
  signatoryName: string;
  signatoryDesignation: string;
}): Promise<{
  success: boolean;
  reply?: NoticeReply;
  error?: string;
}> {
  try {
    const replyRecord: NoticeReply = {
      id: `reply-${Date.now()}`,
      notice_id: payload.noticeId,
      client_id: payload.clientId,
      reply_reference_no: payload.replyReferenceNo,
      form_type: 'ASMT_11',
      subject: `Reply in Form GST ASMT-11 to Scrutiny Notice`,
      reply_date: new Date().toISOString().split('T')[0],
      preliminary_objections: payload.preliminaryObjections || '',
      factual_rebuttal: payload.factualRebuttal,
      statutory_citations: payload.statutoryCitations,
      reconciliation_annexures: [],
      tax_accepted: payload.taxAccepted,
      tax_disputed: payload.taxDisputed,
      interest_computed_50_1: payload.interestComputed,
      interest_disputed_50_3: payload.interestDisputed,
      penalty_disputed: payload.penaltyDisputed,
      challan_details: payload.challanDetails,
      status: payload.status,
      verified_by_name: payload.signatoryName,
      verified_by_designation: payload.signatoryDesignation,
      updated_at: new Date().toISOString(),
    };

    // Save to runtime cache
    runtimeRepliesCache[payload.noticeId] = [replyRecord];

    // Update parent notice status
    if (runtimeNoticesCache[payload.clientId]) {
      runtimeNoticesCache[payload.clientId] = runtimeNoticesCache[payload.clientId].map((n) => {
        if (n.id === payload.noticeId) {
          const newStatus =
            payload.status === 'Partner Approved'
              ? 'Partner Approved'
              : payload.status === 'Submitted_ASMT11'
              ? 'Submitted_ASMT11'
              : 'Drafting Reply';
          return { ...n, status: newStatus as any };
        }
        return n;
      });
    }

    // Try Supabase insert
    try {
      const supabase = await createClient();
      await supabase.from('notice_replies').upsert(
        {
          notice_id: payload.noticeId,
          client_id: payload.clientId,
          reply_reference_no: payload.replyReferenceNo,
          form_type: 'ASMT_11',
          subject: replyRecord.subject,
          reply_date: replyRecord.reply_date,
          preliminary_objections: payload.preliminaryObjections,
          factual_rebuttal: payload.factualRebuttal,
          statutory_citations: payload.statutoryCitations,
          tax_accepted: payload.taxAccepted,
          tax_disputed: payload.taxDisputed,
          interest_computed_50_1: payload.interestComputed,
          interest_disputed_50_3: payload.interestDisputed,
          penalty_disputed: payload.penaltyDisputed,
          challan_details: payload.challanDetails,
          status: payload.status,
          verified_by_name: payload.signatoryName,
          verified_by_designation: payload.signatoryDesignation,
        },
        { onConflict: 'notice_id' }
      );

      await supabase
        .from('department_notices')
        .update({
          status:
            payload.status === 'Partner Approved'
              ? 'Partner Approved'
              : payload.status === 'Submitted_ASMT11'
              ? 'Submitted_ASMT11'
              : 'Drafting Reply',
        })
        .eq('id', payload.noticeId);
    } catch (e) {
      // Ignored if DB table not yet migrated
    }

    return { success: true, reply: replyRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Log official GST Portal ARN upon submission
 */
export async function submitNoticeReplyARNAction(payload: {
  noticeId: string;
  clientId: string;
  arn: string;
  submissionDate?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const submissionDate = payload.submissionDate || new Date().toISOString();

    // Update in runtime cache
    if (runtimeNoticesCache[payload.clientId]) {
      runtimeNoticesCache[payload.clientId] = runtimeNoticesCache[payload.clientId].map((n) => {
        if (n.id === payload.noticeId) {
          return { ...n, status: 'Submitted_ASMT11' };
        }
        return n;
      });
    }

    if (runtimeRepliesCache[payload.noticeId]) {
      runtimeRepliesCache[payload.noticeId] = runtimeRepliesCache[payload.noticeId].map((r) => ({
        ...r,
        status: 'Submitted_ASMT11',
        arn: payload.arn,
        submitted_at: submissionDate,
      }));
    }

    try {
      const supabase = await createClient();
      await supabase
        .from('department_notices')
        .update({ status: 'Submitted_ASMT11' })
        .eq('id', payload.noticeId);

      await supabase
        .from('notice_replies')
        .update({
          status: 'Submitted_ASMT11',
          arn: payload.arn,
          submitted_at: submissionDate,
        })
        .eq('notice_id', payload.noticeId);
    } catch (e) {
      // DB optional fallback
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update notice workflow status (e.g. Under Review -> Partner Approved)
 */
export async function updateNoticeStatusAction(
  noticeId: string,
  clientId: string,
  newStatus: DepartmentNotice['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    if (runtimeNoticesCache[clientId]) {
      runtimeNoticesCache[clientId] = runtimeNoticesCache[clientId].map((n) => {
        if (n.id === noticeId) {
          return { ...n, status: newStatus };
        }
        return n;
      });
    }

    try {
      const supabase = await createClient();
      await supabase
        .from('department_notices')
        .update({ status: newStatus })
        .eq('id', noticeId);
    } catch (e) {
      // DB optional fallback
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a new Departmental Scrutiny Notice (e.g. from officer upload or CA intake)
 */
export async function createDepartmentNoticeAction(
  clientId: string,
  noticeData: Partial<DepartmentNotice>
): Promise<{ success: boolean; notice?: DepartmentNotice; error?: string }> {
  try {
    const newNotice: DepartmentNotice = {
      id: `notice-${Date.now()}`,
      client_id: clientId,
      notice_reference_no: noticeData.notice_reference_no || `ASMT10/${Date.now().toString().slice(-6)}`,
      notice_type: noticeData.notice_type || 'ASMT_10',
      financial_year: noticeData.financial_year || '2022-23',
      issue_date: noticeData.issue_date || new Date().toISOString().split('T')[0],
      due_date:
        noticeData.due_date ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      demand_tax: Number(noticeData.demand_tax || 0),
      demand_interest: Number(noticeData.demand_interest || 0),
      demand_penalty: Number(noticeData.demand_penalty || 0),
      allegation_category: noticeData.allegation_category || 'ITC_2B_VS_3B',
      status: 'Under Review',
      issuing_authority:
        noticeData.issuing_authority || 'Superintendent of Central Tax, Range-IV, Division-II',
      jurisdiction_office: noticeData.jurisdiction_office || 'Mumbai Central Commissionerate',
      allegation_description:
        noticeData.allegation_description ||
        'Discrepancy identified between tax returns and statutory records under Section 61.',
      discrepancy_items: noticeData.discrepancy_items || [],
      created_at: new Date().toISOString(),
    };

    if (!runtimeNoticesCache[clientId]) {
      runtimeNoticesCache[clientId] = getFallbackDepartmentNotices(clientId);
    }
    runtimeNoticesCache[clientId].unshift(newNotice);

    try {
      const supabase = await createClient();
      await supabase.from('department_notices').insert({
        client_id: clientId,
        notice_reference_no: newNotice.notice_reference_no,
        notice_type: newNotice.notice_type,
        financial_year: newNotice.financial_year,
        issue_date: newNotice.issue_date,
        due_date: newNotice.due_date,
        demand_tax: newNotice.demand_tax,
        demand_interest: newNotice.demand_interest,
        demand_penalty: newNotice.demand_penalty,
        allegation_category: newNotice.allegation_category,
        status: newNotice.status,
        issuing_authority: newNotice.issuing_authority,
        jurisdiction_office: newNotice.jurisdiction_office,
        allegation_description: newNotice.allegation_description,
        discrepancy_items: newNotice.discrepancy_items,
      });
    } catch (e) {
      // Optional DB insert
    }

    return { success: true, notice: newNotice };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
