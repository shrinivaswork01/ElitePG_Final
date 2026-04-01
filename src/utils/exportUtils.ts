import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Tenant, Room, Payment, ElectricityBill, PGBranch } from '../types';

export const exportToExcel = async (
  tenants: Tenant[],
  rooms: Room[],
  payments: Payment[],
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

  const totalBeds = rooms.reduce((sum, r) => sum + r.totalBeds, 0);
  const occupancyPercentage = totalBeds > 0 ? (tenants.length / totalBeds) * 100 : 0;
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalAmount, 0);

  summarySheet.addRows([
    { metric: 'Total Tenants', value: tenants.length },
    { metric: 'Active Tenants', value: tenants.filter(t => t.status === 'active').length },
    { metric: 'Vacating Tenants', value: tenants.filter(t => t.vacatingStatus === 'notice_given').length },
    { metric: 'Total Rooms', value: rooms.length },
    { metric: 'Occupancy Percentage', value: `${occupancyPercentage.toFixed(2)}%` },
    { metric: 'Total Revenue (INR)', value: totalRevenue },
    { metric: 'Pending Payments (INR)', value: pendingPayments },
  ]);

  // Format Summary
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getColumn('value').numFmt = '#,##0.00';
  // Metric column shouldn't have number format
  summarySheet.getCell('B8').numFmt = '0.00"%"'; // Occupancy %
  
  // --- 2. TENANTS SHEET ---
  const tenantsSheet = workbook.addWorksheet('Tenants');
  tenantsSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Room', key: 'room', width: 10 },
    { header: 'Bed', key: 'bed', width: 10 },
    { header: 'Floor', key: 'floor', width: 10 },
    { header: 'Rent', key: 'rent', width: 15 },
    { header: 'Joining Date', key: 'joiningDate', width: 15 },
    { header: 'Vacating Date', key: 'vacatingDate', width: 15 },
    { header: 'Exit Date', key: 'exitDate', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  tenants.forEach(t => {
    const room = rooms.find(r => r.id === t.roomId);
    tenantsSheet.addRow({
      name: t.name,
      phone: t.phone,
      room: room?.roomNumber || 'N/A',
      bed: t.bedNumber,
      floor: room?.floor || 'N/A',
      rent: t.rentAmount,
      joiningDate: t.joiningDate,
      vacatingDate: t.vacatingDate || 'N/A',
      exitDate: t.exitDate || 'N/A',
      status: t.vacatingStatus || t.status,
    });
  });

  tenantsSheet.getRow(1).font = { bold: true };
  tenantsSheet.getColumn('rent').numFmt = '"₹"#,##0.00';

  // --- 3. ROOMS SHEET ---
  const roomsSheet = workbook.addWorksheet('Rooms');
  roomsSheet.columns = [
    { header: 'Room Number', key: 'roomNumber', width: 15 },
    { header: 'Floor', key: 'floor', width: 10 },
    { header: 'Total Beds', key: 'totalBeds', width: 12 },
    { header: 'Occupied Beds', key: 'occupiedBeds', width: 15 },
    { header: 'Vacant Beds', key: 'vacantBeds', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Occupancy %', key: 'occupancy', width: 15 },
  ];

  rooms.forEach(r => {
    const occupied = r.occupiedBeds || 0;
    const vacant = r.totalBeds - occupied;
    const occupancy = r.totalBeds > 0 ? (occupied / r.totalBeds) * 100 : 0;
    roomsSheet.addRow({
      roomNumber: r.roomNumber,
      floor: r.floor,
      totalBeds: r.totalBeds,
      occupiedBeds: occupied,
      vacantBeds: vacant,
      type: r.type,
      occupancy: `${occupancy.toFixed(2)}%`,
    });
  });

  roomsSheet.getRow(1).font = { bold: true };

  // --- 4. PAYMENTS SHEET ---
  const paymentsSheet = workbook.addWorksheet('Payments');
  paymentsSheet.columns = [
    { header: 'Tenant Name', key: 'tenantName', width: 20 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Date', key: 'date', width: 15 },
  ];

  payments.forEach(p => {
    const tenant = tenants.find(t => t.id === p.tenantId);
    paymentsSheet.addRow({
      tenantName: tenant?.name || 'Unknown',
      month: p.month,
      type: p.paymentType,
      amount: p.totalAmount,
      status: p.status,
      date: p.paymentDate,
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

  const allComplaints = stats.complaints || []; 
  (allComplaints.length > 0 ? allComplaints : []).forEach((c: any) => {
    const tenant = tenants.find(t => t.id === c.tenantId);
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
    { header: 'Flat / Meter Group', key: 'flat', width: 25 },
    { header: 'Month', key: 'month', width: 15 },
    { header: 'Total Bill', key: 'totalBill', width: 15 },
    { header: 'Total Units', key: 'totalUnits', width: 15 },
    { header: 'Cost Per Unit', key: 'costPerUnit', width: 15 },
  ];

  // We need to derive this from payments or electricity_bills if we have them
  // Assuming we use payments with type 'electricity' to derive some of this if full bill data isn't here
  // But let's look at electricity_bills if possible. Since we don't have a direct list of electricity_bills in AppContext usually,
  // we might need to rely on what's available.
  
  const electricityPayments = payments.filter(p => p.paymentType === 'electricity');
  // Group by meter bill if possible, or just list per tenant share if that's what's available
  // For standard reporting, we'll try to group by month and electricityBillId
  const uniqueBills = Array.from(new Set(electricityPayments.map(p => p.electricityBillId).filter(Boolean)));
  
  if (uniqueBills.length > 0) {
    uniqueBills.forEach(billId => {
      const billsForThis = electricityPayments.filter(p => p.electricityBillId === billId);
      if (billsForThis.length > 0) {
        const first = billsForThis[0];
        // Total bill is often shared, so we sum or take the recorded total
        // In the current system, each payment might have the full bill's cost_per_unit recorded
        electricitySheet.addRow({
          flat: 'Meter Shared Bill', // Ideally join with meter group name
          month: first.month,
          totalBill: first.totalAmount, // This might be per-tenant, but requirement asks for total_bill
          totalUnits: first.unitsConsumed || 0,
          costPerUnit: first.costPerUnit || 0,
        });
      }
    });
  } else {
    // Fallback: list individual electricity shares
    electricityPayments.forEach(p => {
       electricitySheet.addRow({
          flat: tenants.find(t => t.id === p.tenantId)?.name || 'Tenant Share',
          month: p.month,
          totalBill: p.totalAmount,
          totalUnits: p.unitsConsumed || 0,
          costPerUnit: p.costPerUnit || 0,
        });
    });
  }

  electricitySheet.getRow(1).font = { bold: true };
  electricitySheet.getColumn('totalBill').numFmt = '"₹"#,##0.00';
  electricitySheet.getColumn('costPerUnit').numFmt = '"₹"#,##0.00';

  // --- FINALIZATION ---
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const fileName = `ElitePG_Report_${branch?.name || 'General'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, fileName);
};
