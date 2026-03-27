import { supabase } from '../lib/supabase';
import { ElectricityBill, ElectricityShare } from '../types';
import { uploadToSupabase } from './storage';

/**
 * Calculate per-tenant electricity shares for a given bill and tenant list.
 */
export function calculateElectricityShares(
  bill: ElectricityBill,
  tenants: { id: string; name: string; is_ac_user?: boolean; isAcUser?: boolean }[]
): ElectricityShare[] {
  if (!bill || tenants.length === 0) return [];

  const totalTenants = tenants.length;
  const acTenants = tenants.filter(t => t.is_ac_user || t.isAcUser);
  const acCount = acTenants.length;

  const basePool = bill.actualAmount;
  const baseShare = Math.round((basePool / totalTenants) * 100) / 100;
  const acShare = acCount > 0 ? Math.round((bill.acAmount / acCount) * 100) / 100 : 0;

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
    actualAmount: Number(data.actual_bill_amount),
    acAmount: Number(data.ac_bill_amount),
    actualBillUrl: data.actual_bill_file_url,
    acBillUrl: data.ac_bill_file_url,
    createdAt: data.created_at,
    roomId: data.room_id
  };
}

/**
 * Fetch a specific electricity bill by its ID.
 */
export async function fetchElectricityBillById(
  id: string
): Promise<ElectricityBill | null> {
  const { data, error } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    meterGroupId: data.meter_group_id,
    branchId: data.branch_id,
    month: data.month,
    totalAmount: Number(data.total_amount),
    actualAmount: Number(data.actual_bill_amount),
    acAmount: Number(data.ac_bill_amount),
    actualBillUrl: data.actual_bill_file_url,
    acBillUrl: data.ac_bill_file_url,
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
    actualAmount: Number(d.actual_bill_amount),
    acAmount: Number(d.ac_bill_amount),
    actualBillUrl: d.actual_bill_file_url,
    acBillUrl: d.ac_bill_file_url,
    createdAt: d.created_at,
    roomId: d.room_id
  }));
}

/**
 * Save (insert or update) an electricity bill for a meter group (flat).
 * If files are provided, they are uploaded to Supabase Storage first.
 */
export async function saveElectricityBill(params: {
  meterGroupId: string;
  branchId: string;
  month: string;
  actualAmount: number;
  acAmount: number;
  actualFile?: File;
  acFile?: File;
  existingBillId?: string;
}): Promise<ElectricityBill> {
  let actualBillUrl: string | undefined;
  let acBillUrl: string | undefined;

  // Upload Base Bill File
  if (params.actualFile) {
    const ext = params.actualFile.name.split('.').pop() || 'pdf';
    const path = `${params.branchId}/flats/${params.meterGroupId}/${params.month}_base.${ext}`;
    actualBillUrl = await uploadToSupabase('electricity-bills', path, params.actualFile);
  }

  // Upload AC Bill File
  if (params.acFile) {
    const ext = params.acFile.name.split('.').pop() || 'pdf';
    const path = `${params.branchId}/flats/${params.meterGroupId}/${params.month}_ac.${ext}`;
    acBillUrl = await uploadToSupabase('electricity-bills', path, params.acFile);
  }

  const payload: any = {
    meter_group_id: params.meterGroupId,
    branch_id: params.branchId,
    month: params.month,
    total_amount: params.actualAmount + params.acAmount,
    actual_bill_amount: params.actualAmount,
    ac_bill_amount: params.acAmount
  };
  if (actualBillUrl) payload.actual_bill_file_url = actualBillUrl;
  if (acBillUrl) payload.ac_bill_file_url = acBillUrl;

  if (params.existingBillId) {
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
      actualAmount: Number(data.actual_bill_amount), acAmount: Number(data.ac_bill_amount),
      actualBillUrl: data.actual_bill_file_url, acBillUrl: data.ac_bill_file_url,
      createdAt: data.created_at, roomId: data.room_id
    };
  } else {

    const { data, error } = await supabase
      .from('electricity_bills')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id, meterGroupId: data.meter_group_id, branchId: data.branch_id,
      month: data.month, totalAmount: Number(data.total_amount),
      actualAmount: Number(data.actual_bill_amount), acAmount: Number(data.ac_bill_amount),
      actualBillUrl: data.actual_bill_file_url, acBillUrl: data.ac_bill_file_url,
      createdAt: data.created_at, roomId: data.room_id
    };
  }
}

/**
 * Get the electricity share for a specific tenant in a specific month.
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
