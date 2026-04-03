import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Tenant, Room, Payment, ElectricityBill, PGBranch, MeterGroup } from '../types';

export const exportToExcel = async (
  tenants: Tenant[],
  rooms: Room[],
  payments: Payment[],
  complaints: any[],
  meterGroups: MeterGroup[],
  branch: PGBranch | undefined,
  stats: any
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ElitePG';
  workbook.lastModifiedBy = 'ElitePG';
  workbook.created = new Date();
  workbook.modified = new Date();

  // --- 1. SUMMARY SHEET ---
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  const totalBeds = rooms.reduce((sum, r) => sum + (r.totalBeds || (r as any).total_beds || 0), 0);
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;
  const occupancyPercentage = totalBeds > 0 ? (activeTenantsCount / totalBeds) * 100 : 0;
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalAmount, 0);

  summarySheet.addRows([
    { metric: 'Total Tenants (Record)', value: tenants.length },
    { metric: 'Active Tenants', value: activeTenantsCount },
    { metric: 'Vacating Tenants', value: tenants.filter(t => t.vacatingStatus === 'notice_given').length },
    { metric: 'Total Rooms', value: rooms.length },
    { metric: 'Total Bed Capacity', value: totalBeds },
    { metric: 'Occupancy Percentage', value: `${occupancyPercentage.toFixed(2)}%` },
    { metric: 'Total Revenue Collected (INR)', value: totalRevenue },
    { metric: 'Total Pending Dues (INR)', value: pendingPayments },
  ]);

  // Format Summary
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getColumn('value').numFmt = '#,##0.00';
  summarySheet.getCell('B6').numFmt = '0.00"%"'; // Occupancy %
  
  // --- 2. TENANTS SHEET ---
  const tenantsSheet = workbook.addWorksheet('Tenants');
  tenantsSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Room No', key: 'room', width: 10 },
    { header: 'Bed No', key: 'bed', width: 10 },
    { header: 'Floor', key: 'floor', width: 10 },
    { header: 'Monthly Rent', key: 'rent', width: 15 },
    { header: 'Deposit Paid', key: 'deposit', width: 15 },
    { header: 'Joining Date', key: 'joiningDate', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Exit Date', key: 'exitDate', width: 15 },
  ];

  tenants.forEach(t => {
    const room = rooms.find(r => r.id === (t.roomId || (t as any).room_id));
    tenantsSheet.addRow({
      name: t.name,
      phone: t.phone,
      email: t.email || '—',
      room: room ? ((room as any).room_number || room.roomNumber) : '—',
      bed: t.bedNumber ?? (t as any).bed_number ?? '—',
      floor: room?.floor ?? '—',
      rent: t.rentAmount ?? (t as any).rent_amount ?? 0,
      deposit: t.depositAmount ?? (t as any).deposit_amount ?? 0,
      joiningDate: t.joiningDate || (t as any).joining_date || '—',
      status: t.vacatingStatus || t.status,
      exitDate: t.exitDate || (t as any).exit_date || (t.status === 'active' ? 'N/A' : '—'),
    });
  });

  tenantsSheet.getRow(1).font = { bold: true };
  tenantsSheet.getColumn('rent').numFmt = '"₹"#,##0.00';
  tenantsSheet.getColumn('deposit').numFmt = '"₹"#,##0.00';

  // --- 3. ROOMS SHEET ---
  const roomsSheet = workbook.addWorksheet('Rooms');
  roomsSheet.columns = [
    { header: 'Room Number', key: 'roomNumber', width: 15 },
    { header: 'Floor', key: 'floor', width: 10 },
    { header: 'Total Beds', key: 'totalBeds', width: 12 },
    { header: 'Occupied Beds', key: 'occupiedBeds', width: 15 },
    { header: 'Vacant Beds', key: 'vacantBeds', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Price (Rent)', key: 'price', width: 15 },
    { header: 'Occupancy %', key: 'occupancy', width: 15 },
  ];

  rooms.forEach(r => {
    const occupied = tenants.filter(t => (t.roomId || (t as any).room_id) === r.id && t.status === 'active').length;
    const tBeds = r.totalBeds || (r as any).total_beds || 0;
    const vacant = tBeds - occupied;
    const occupancy = tBeds > 0 ? (occupied / tBeds) * 100 : 0;
    roomsSheet.addRow({
      roomNumber: (r as any).room_number || r.roomNumber,
      floor: r.floor,
      totalBeds: tBeds,
      occupiedBeds: occupied,
      vacantBeds: vacant,
      type: r.type,
      price: r.price,
      occupancy: `${occupancy.toFixed(2)}%`,
    });
  });

  roomsSheet.getRow(1).font = { bold: true };
  roomsSheet.getColumn('price').numFmt = '"₹"#,##0.00';

  // --- 4. PAYMENTS SHEET ---
  const paymentsSheet = workbook.addWorksheet('Payments');
  paymentsSheet.columns = [
    { header: 'Tenant Name', key: 'tenantName', width: 20 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment Date', key: 'date', width: 15 },
  ];

  payments.forEach(p => {
    const tenant = tenants.find(t => t.id === (p.tenantId || (p as any).tenant_id));
    paymentsSheet.addRow({
      tenantName: tenant?.name || 'Unknown',
      month: p.month,
      type: p.paymentType || (p as any).payment_type,
      amount: p.totalAmount || (p as any).total_amount,
      status: p.status,
      date: p.paymentDate || (p as any).payment_date || '—',
    });
  });

  paymentsSheet.getRow(1).font = { bold: true };
  paymentsSheet.getColumn('amount').numFmt = '"₹"#,##0.00';

  // --- 5. COMPLAINTS SHEET ---
  const complaintsSheet = workbook.addWorksheet('Complaints');
  complaintsSheet.columns = [
    { header: 'Tenant Name', key: 'tenantName', width: 25 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  (complaints || []).forEach((c: any) => {
    const tenant = tenants.find(t => t.id === (c.tenantId || (c as any).tenant_id));
    complaintsSheet.addRow({
      tenantName: tenant?.name || 'Unknown',
      title: c.title,
      category: c.category,
      priority: (c.priority || '').toUpperCase(),
      status: (c.status || '').toUpperCase(),
      createdAt: c.createdAt,
    });
  });

  complaintsSheet.getRow(1).font = { bold: true };

  // --- 6. ELECTRICITY SHEET ---
  const electricitySheet = workbook.addWorksheet('Electricity');
  electricitySheet.columns = [
    { header: 'Flat / Meter Group', key: 'flat', width: 20 },
    { header: 'Tenant', key: 'tenant', width: 20 },
    { header: 'Room No', key: 'room', width: 10 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Base Share', key: 'base', width: 15 },
    { header: 'AC Share', key: 'ac', width: 15 },
    { header: 'Total Units', key: 'units', width: 12 },
    { header: 'Cost/Unit', key: 'cpu', width: 12 },
    { header: 'Total Share', key: 'total', width: 15 },
  ];

  const electricityPayments = payments.filter(p => (p.paymentType || (p as any).payment_type) === 'electricity');
  
  electricityPayments.forEach(p => {
    const tenant = tenants.find(t => t.id === (p.tenantId || (p as any).tenant_id));
    const room = rooms.find(r => r.id === (tenant?.roomId || (tenant as any)?.room_id));
    const flat = meterGroups.find(m => m.id === (room?.meterGroupId || (room as any)?.meter_group_id));

    electricitySheet.addRow({
      flat: flat?.name || 'Standard/Individual',
      tenant: tenant?.name || 'Unknown',
      room: room ? ((room as any).room_number || room.roomNumber) : '—',
      month: p.month,
      base: p.baseShare || 0,
      ac: p.acShare || 0,
      units: p.unitsConsumed || 0,
      cpu: p.costPerUnit || 0,
      total: p.totalAmount || (p as any).total_amount || 0,
    });
  });

  electricitySheet.getRow(1).font = { bold: true };
  ['base', 'ac', 'cpu', 'total'].forEach(key => {
    electricitySheet.getColumn(key).numFmt = '"₹"#,##0.00';
  });

  // --- FINALIZATION ---
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const fileName = `ElitePG_Report_${branch?.name || 'General'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, fileName);
};
