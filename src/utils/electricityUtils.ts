import { supabase } from '../lib/supabase';
import { ElectricityBill, ElectricityShare } from '../types';
import { uploadToSupabase } from './storage';

/**
 * Calculate per-tenant electricity shares for a given bill and tenant list.
 * This is a pure function — no side effects.
 */
export function calculateElectricityShares(
  bill: ElectricityBill,
  tenants: { id: string; name: string; is_ac_user?: boolean; isAcUser?: boolean }[]
): ElectricityShare[] {
  if (!bill || tenants.length === 0) return [];

  const totalTenants = tenants.length;
  const acTenants = tenants.filter(t => t.is_ac_user || t.isAcUser);
  const acCount = acTenants.length;

  const basePool = bill.totalAmount - (acCount > 0 ? bill.acExtraAmount : 0);
  const baseShare = Math.round((basePool / totalTenants) * 100) / 100;
  const acShare = acCount > 0 ? Math.round((bill.acExtraAmount / acCount) * 100) / 100 : 0;

  return tenants.map(t => {
    const isAc = !!(t.is_ac_user || t.isAcUser);
    return {
      tenantId: t.id,
      tenantName: t.name,
      baseShare,
      acShare: isAc ? acShare : 0,
      total: baseShare + (isAc ? acShare : 0),
      isAcUser: isAc
    };
  });
}

/**
 * Fetch the electricity bill for a specific meter group (flat) and month.
 * Returns null if no bill exists.
 */
export async function fetchElectricityBill(
  meterGroupId: string,
  month: string
): Promise<ElectricityBill | null> {
  const { data, error } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('meter_group_id', meterGroupId)
    .eq('month', month)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    meterGroupId: data.meter_group_id,
    branchId: data.branch_id,
    month: data.month,
    totalAmount: Number(data.total_amount),
    acExtraAmount: Number(data.ac_extra_amount),
    billUrl: data.bill_url,
    createdAt: data.created_at,
    roomId: data.room_id
  };
}

/**
 * Fetch all electricity bills for a specific meter group.
 */
export async function fetchElectricityBillsForGroup(
  meterGroupId: string
): Promise<ElectricityBill[]> {
  const { data, error } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('meter_group_id', meterGroupId)
    .order('month', { ascending: false });

  if (error || !data) return [];

  return data.map(d => ({
    id: d.id,
    meterGroupId: d.meter_group_id,
    branchId: d.branch_id,
    month: d.month,
    totalAmount: Number(d.total_amount),
    acExtraAmount: Number(d.ac_extra_amount),
    billUrl: d.bill_url,
    createdAt: d.created_at,
    roomId: d.room_id
  }));
}

/**
 * Save (insert or update) an electricity bill for a meter group (flat).
 * If a file is provided, it's uploaded to Supabase Storage first.
 */
export async function saveElectricityBill(params: {
  meterGroupId: string;
  branchId: string;
  month: string;
  totalAmount: number;
  acExtraAmount: number;
  file?: File;
  existingBillId?: string;
}): Promise<ElectricityBill> {
  let billUrl: string | undefined;

  // Upload file if provided
  if (params.file) {
    const ext = params.file.name.split('.').pop() || 'pdf';
    // Use meterGroupId in path now
    const path = `${params.branchId}/flats/${params.meterGroupId}/${params.month}.${ext}`;
    billUrl = await uploadToSupabase('electricity-bills', path, params.file);
  }

  const payload: any = {
    meter_group_id: params.meterGroupId,
    branch_id: params.branchId,
    month: params.month,
    total_amount: params.totalAmount,
    ac_extra_amount: params.acExtraAmount
  };
  if (billUrl) payload.bill_url = billUrl;

  if (params.existingBillId) {
    // Update existing
    const { data, error } = await supabase
      .from('electricity_bills')
      .update(payload)
      .eq('id', params.existingBillId)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id, meterGroupId: data.meter_group_id, branchId: data.branch_id,
      month: data.month, totalAmount: Number(data.total_amount),
      acExtraAmount: Number(data.ac_extra_amount), billUrl: data.bill_url,
      createdAt: data.created_at, roomId: data.room_id
    };
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('electricity_bills')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id, meterGroupId: data.meter_group_id, branchId: data.branch_id,
      month: data.month, totalAmount: Number(data.total_amount),
      acExtraAmount: Number(data.ac_extra_amount), billUrl: data.bill_url,
      createdAt: data.created_at, roomId: data.room_id
    };
  }
}

/**
 * Get the electricity share for a specific tenant in a specific month.
 * Fetches the bill for the tenant's flat (meter group).
 */
export async function getTenantElectricityShare(
  meterGroupId: string,
  month: string,
  allTenantsInFlat: { id: string; name: string; is_ac_user?: boolean; isAcUser?: boolean }[],
  targetTenantId: string
): Promise<ElectricityShare | null> {
  const bill = await fetchElectricityBill(meterGroupId, month);
  if (!bill) return null;

  const shares = calculateElectricityShares(bill, allTenantsInFlat);
  return shares.find(s => s.tenantId === targetTenantId) || null;
}
