import { supabase } from '../lib/supabase';
import { ElectricityBill, ElectricityShare, RoomAcReading, Room } from '../types';
import { uploadToSupabase } from './storage';

// ============================================================
// CALCULATION ENGINE
// ============================================================

/**
 * Smart unit-based calculation for electricity shares.
 * Used when bill has `totalUnits` and AC readings are provided.
 */
export function calculateSmartElectricityShares(
  bill: ElectricityBill,
  acReadings: RoomAcReading[],
  rooms: Room[],
  tenants: { id: string; name: string; roomId: string }[]
): ElectricityShare[] {
  if (!bill || tenants.length === 0) return [];
  if (!bill.totalUnits || bill.totalUnits <= 0) {
    throw new Error('Total units must be greater than 0 for unit-based billing');
  }

  const costPerUnit = bill.totalAmount / bill.totalUnits;

  // Aggregate AC units per room
  const acUnitsByRoom = new Map<string, number>();
  for (const reading of acReadings) {
    const units = (reading.currentReading - reading.previousReading) || 0;
    if (units > 0) {
      acUnitsByRoom.set(reading.roomId, (acUnitsByRoom.get(reading.roomId) || 0) + units);
    }
  }

  // Compute total AC cost
  let totalAcCost = 0;
  for (const [, units] of acUnitsByRoom) {
    totalAcCost += units * costPerUnit;
  }

  // Base cost = total - AC cost
  const baseCost = bill.totalAmount - totalAcCost;
  if (baseCost < 0) {
    throw new Error('AC readings exceed total units — base cost cannot be negative');
  }

  // Count tenants per room (only rooms with tenants)
  const tenantsByRoom = new Map<string, typeof tenants>();
  for (const t of tenants) {
    const roomTenants = tenantsByRoom.get(t.roomId) || [];
    roomTenants.push(t);
    tenantsByRoom.set(t.roomId, roomTenants);
  }

  // Base share per tenant
  const baseShare = Math.round((baseCost / tenants.length) * 100) / 100;

  return tenants.map(t => {
    const room = rooms.find(r => r.id === t.roomId);
    const roomAcUnits = acUnitsByRoom.get(t.roomId) || 0;
    const isAcRoom = room?.type === 'AC';
    const tenantsInRoom = tenantsByRoom.get(t.roomId)?.length || 1;
    const roomAcCost = roomAcUnits * costPerUnit;
    const acSharePerTenant = isAcRoom && roomAcUnits > 0
      ? Math.round((roomAcCost / tenantsInRoom) * 100) / 100
      : 0;

    return {
      tenantId: t.id,
      tenantName: t.name,
      roomId: t.roomId,
      roomNumber: room?.roomNumber,
      roomType: room?.type as 'AC' | 'Non-AC' | undefined,
      baseShare,
      acShare: acSharePerTenant,
      total: Math.round((baseShare + acSharePerTenant) * 100) / 100,
      isAcUser: isAcRoom || false,
      unitsConsumed: isAcRoom ? roomAcUnits : undefined,
      costPerUnit: Math.round(costPerUnit * 100) / 100
    };
  });
}

/**
 * Legacy calculation: manual ₹-based split.
 * Used when bill does NOT have totalUnits.
 */
export function calculateElectricityShares(
  bill: ElectricityBill,
  tenants: { id: string; name: string; is_ac_user?: boolean; isAcUser?: boolean; roomId?: string }[],
  rooms?: Room[],
  acReadings?: RoomAcReading[]
): ElectricityShare[] {
  if (!bill || tenants.length === 0) return [];

  // If totalUnits is available AND we have rooms + acReadings, use smart calculation
  if (bill.totalUnits && bill.totalUnits > 0 && rooms && rooms.length > 0) {
    try {
      return calculateSmartElectricityShares(
        bill,
        acReadings || [],
        rooms,
        tenants.map(t => ({
          id: t.id,
          name: t.name,
          roomId: t.roomId || ''
        }))
      );
    } catch {
      // Fall back to legacy if smart calc fails
    }
  }

  // Legacy: manual ₹ split
  const totalTenants = tenants.length;
  const acTenants = tenants.filter(t => t.is_ac_user || t.isAcUser);
  const acCount = acTenants.length;

  const basePool = bill.actualAmount;
  const baseShare = Math.round((basePool / totalTenants) * 100) / 100;
  const acShare = acCount > 0 ? Math.round((bill.acAmount / acCount) * 100) / 100 : 0;

  return tenants.map(t => {
    const isAc = !!(t.is_ac_user || t.isAcUser);
    const room = rooms?.find(r => r.id === t.roomId);
    return {
      tenantId: t.id,
      tenantName: t.name,
      roomId: t.roomId,
      roomNumber: room?.roomNumber,
      roomType: room?.type as 'AC' | 'Non-AC' | undefined,
      baseShare,
      acShare: isAc ? acShare : 0,
      total: baseShare + (isAc ? acShare : 0),
      isAcUser: isAc
    };
  });
}

// ============================================================
// ROOM AC READINGS CRUD
// ============================================================

export async function saveRoomAcReadings(
  readings: RoomAcReading[],
  electricityBillId: string
): Promise<void> {
  if (readings.length === 0) return;

  for (const reading of readings) {
    const payload = {
      room_id: reading.roomId,
      electricity_bill_id: electricityBillId,
      branch_id: reading.branchId,
      month: reading.month,
      previous_reading: reading.previousReading,
      current_reading: reading.currentReading
    };

    // Upsert: update if room+month exists, insert otherwise
    const { error } = await supabase
      .from('room_ac_readings')
      .upsert(payload, { onConflict: 'room_id,month' });

    if (error) throw error;
  }
}

export async function fetchRoomAcReadings(
  meterGroupId: string,
  month: string,
  rooms: Room[]
): Promise<RoomAcReading[]> {
  // Get room IDs belonging to this meter group
  const roomIds = rooms
    .filter(r => r.meterGroupId === meterGroupId)
    .map(r => r.id);

  if (roomIds.length === 0) return [];

  const { data, error } = await supabase
    .from('room_ac_readings')
    .select('*')
    .in('room_id', roomIds)
    .eq('month', month);

  if (error || !data) return [];

  return data.map(d => ({
    id: d.id,
    roomId: d.room_id,
    roomNumber: rooms.find(r => r.id === d.room_id)?.roomNumber,
    electricityBillId: d.electricity_bill_id,
    branchId: d.branch_id,
    month: d.month,
    previousReading: Number(d.previous_reading),
    currentReading: Number(d.current_reading),
    unitsConsumed: Number(d.units_consumed)
  }));
}

/**
 * Fetch the previous month's current reading to auto-fill "previous reading"
 */
export async function fetchPreviousReading(
  roomId: string,
  currentMonth: string
): Promise<number | null> {
  // Calculate previous month
  const [year, month] = currentMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1); // month is 0-indexed
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const { data } = await supabase
    .from('room_ac_readings')
    .select('current_reading')
    .eq('room_id', roomId)
    .eq('month', prevMonth)
    .maybeSingle();

  return data ? Number(data.current_reading) : null;
}

// ============================================================
// ELECTRICITY BILL CRUD
// ============================================================

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

  return mapBillFromDb(data);
}

export async function fetchElectricityBillById(
  id: string
): Promise<ElectricityBill | null> {
  const { data, error } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapBillFromDb(data);
}

export async function fetchElectricityBillsForGroup(
  meterGroupId: string
): Promise<ElectricityBill[]> {
  const { data, error } = await supabase
    .from('electricity_bills')
    .select('*')
    .eq('meter_group_id', meterGroupId)
    .order('month', { ascending: false });

  if (error || !data) return [];
  return data.map(mapBillFromDb);
}

function mapBillFromDb(d: any): ElectricityBill {
  return {
    id: d.id,
    meterGroupId: d.meter_group_id,
    branchId: d.branch_id,
    month: d.month,
    totalAmount: Number(d.total_amount),
    actualAmount: Number(d.actual_bill_amount),
    acAmount: Number(d.ac_bill_amount),
    totalUnits: d.total_units ? Number(d.total_units) : undefined,
    actualBillUrl: d.actual_bill_file_url,
    acBillUrl: d.ac_bill_file_url,
    acReading: d.ac_reading ? Number(d.ac_reading) : undefined,
    acReadingUrl: d.ac_reading_file_url,
    createdAt: d.created_at,
    roomId: d.room_id
  };
}

/**
 * Save (insert or update) an electricity bill for a meter group (flat).
 * Supports both legacy manual split and new unit-based split.
 */
export async function saveElectricityBill(params: {
  meterGroupId: string;
  branchId: string;
  month: string;
  totalAmount: number; // Total flat bill
  totalUnits?: number; // For unit-based billing
  acReadings?: RoomAcReading[]; // Per-room AC readings
  actualFile?: File;
  acFile?: File;
  existingBillId?: string;
  // Legacy fields (used when totalUnits not provided)
  actualAmount?: number;
  acAmount?: number;
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

  // Compute AC amount from readings if unit-based
  let computedAcAmount = params.acAmount || 0;
  let computedActualAmount = params.actualAmount || params.totalAmount;

  if (params.totalUnits && params.totalUnits > 0 && params.acReadings) {
    const costPerUnit = params.totalAmount / params.totalUnits;
    let totalAcUnits = 0;
    for (const r of params.acReadings) {
      const units = (r.currentReading - r.previousReading) || 0;
      if (units > 0) totalAcUnits += units;
    }
    computedAcAmount = Math.round(totalAcUnits * costPerUnit * 100) / 100;
    computedActualAmount = Math.round((params.totalAmount - computedAcAmount) * 100) / 100;
  }

  const payload: any = {
    meter_group_id: params.meterGroupId,
    branch_id: params.branchId,
    month: params.month,
    total_amount: params.totalAmount,
    actual_bill_amount: computedActualAmount,
    ac_bill_amount: computedAcAmount,
    total_units: params.totalUnits || null
  };
  if (actualBillUrl) payload.actual_bill_file_url = actualBillUrl;
  if (acBillUrl) payload.ac_bill_file_url = acBillUrl;

  let savedBill: ElectricityBill;

  if (params.existingBillId) {
    const { data, error } = await supabase
      .from('electricity_bills')
      .update(payload)
      .eq('id', params.existingBillId)
      .select()
      .single();

    if (error) throw error;
    savedBill = mapBillFromDb(data);
  } else {
    const { data, error } = await supabase
      .from('electricity_bills')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    savedBill = mapBillFromDb(data);
  }

  // Save AC readings if provided
  if (params.acReadings && params.acReadings.length > 0) {
    await saveRoomAcReadings(
      params.acReadings.map(r => ({ ...r, month: params.month, branchId: params.branchId })),
      savedBill.id
    );
  }

  return savedBill;
}

/**
 * Get the electricity share for a specific tenant in a specific month.
 */
export async function getTenantElectricityShare(
  meterGroupId: string,
  month: string,
  allTenantsInFlat: { id: string; name: string; is_ac_user?: boolean; isAcUser?: boolean; roomId?: string }[],
  targetTenantId: string,
  rooms?: Room[]
): Promise<ElectricityShare | null> {
  const bill = await fetchElectricityBill(meterGroupId, month);
  if (!bill) return null;

  let acReadings: RoomAcReading[] = [];
  if (bill.totalUnits && rooms) {
    acReadings = await fetchRoomAcReadings(meterGroupId, month, rooms);
  }

  const shares = calculateElectricityShares(bill, allTenantsInFlat, rooms, acReadings);
  return shares.find(s => s.tenantId === targetTenantId) || null;
}
