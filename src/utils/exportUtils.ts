import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Tenant, Room, Payment, ElectricityBill, PGBranch, MeterGroup, KYCData, Employee, User } from '../types';

const applyHeaderStyle = (sheet: ExcelJS.Worksheet, endCol?: number) => {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.eachCell((cell, colNumber) => {
    if (!endCol || colNumber <= endCol) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB4C6E7' } // Light Blue from user reference
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  });
};

export const exportToExcel = async (
  tenants: Tenant[],
  rooms: Room[],
  payments: Payment[],
  complaints: any[],
  meterGroups: MeterGroup[] | undefined,
  branch: PGBranch | undefined,
  branches: PGBranch[] = [],
  stats: any,
  expenses: any[] = []
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
  const totalRevenue = payments
    .filter(p => p.status === 'paid' && ['rent', 'token'].includes((p.paymentType || (p as any).payment_type || 'rent').toLowerCase()))
    .reduce((sum, p) => sum + (p.totalAmount || (p as any).total_amount || 0), 0);
  const totalExpenses = expenses.filter(e => e.status !== 'rejected').reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.totalAmount || (p as any).total_amount || 0), 0);

  summarySheet.addRows([
    { metric: 'Total Tenants (Record)', value: tenants.length },
    { metric: 'Active Tenants', value: activeTenantsCount },
    { metric: 'Vacating Tenants', value: tenants.filter(t => t.vacatingStatus === 'notice_given').length },
    { metric: 'Total Rooms', value: rooms.length },
    { metric: 'Total Bed Capacity', value: totalBeds },
    { metric: 'Occupancy Percentage', value: `${occupancyPercentage.toFixed(2)}%` },
    { metric: 'Vacant Beds', value: totalBeds - activeTenantsCount },
    { metric: 'Vacant Rooms', value: stats.vacantRoomsList?.length || 0 },
    { metric: 'Vacancy Percentage', value: `${(100 - occupancyPercentage).toFixed(2)}%` },
    { metric: 'Total Revenue Collected (INR)', value: totalRevenue },
    { metric: 'Total Expenses (INR)', value: totalExpenses },
    { metric: 'Net Profit (INR)', value: totalRevenue - totalExpenses },
    { metric: 'Total Partner Payouts — Paid (INR)', value: stats.currentMonthPayouts || 0 },
    { metric: 'Remaining Balance After Payouts (INR)', value: stats.remainingBalance || (totalRevenue - totalExpenses) },
    { metric: 'Total Pending Dues (INR)', value: pendingPayments },
  ]);

  // Format Summary
  applyHeaderStyle(summarySheet, 2);
  summarySheet.getColumn('value').numFmt = '#,##0.00';
  summarySheet.getCell('B6').numFmt = '0.00"%"'; // Occupancy %
  
  // --- 2. TENANTS SHEET ---
  const tenantsSheet = workbook.addWorksheet('Tenants');
  tenantsSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Branch', key: 'branchName', width: 25 },
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
    const tBranch = branches.find(b => b.id === (t.branchId || (t as any).branch_id)) || branch;
    tenantsSheet.addRow({
      name: t.name,
      branchName: tBranch?.name || 'Unknown',
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

  applyHeaderStyle(tenantsSheet, 12);
  tenantsSheet.getColumn('rent').numFmt = '"₹"#,##0.00';
  tenantsSheet.getColumn('deposit').numFmt = '"₹"#,##0.00';

  // --- 3. ROOMS SHEET ---
  const roomsSheet = workbook.addWorksheet('Rooms');
  roomsSheet.columns = [
    { header: 'Room Number', key: 'roomNumber', width: 15 },
    { header: 'Branch', key: 'branchName', width: 25 },
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
    const rBranch = branches.find(b => b.id === (r.branchId || (r as any).branch_id)) || branch;
    roomsSheet.addRow({
      roomNumber: (r as any).room_number || r.roomNumber,
      branchName: rBranch?.name || 'Unknown',
      floor: r.floor,
      totalBeds: tBeds,
      occupiedBeds: occupied,
      vacantBeds: vacant,
      type: r.type,
      price: r.price,
      occupancy: `${occupancy.toFixed(2)}%`,
    });
  });

  applyHeaderStyle(roomsSheet, 9);
  roomsSheet.getColumn('price').numFmt = '"₹"#,##0.00';

  // --- 4. PAYMENTS SHEET ---
  const paymentsSheet = workbook.addWorksheet('Payments');
  paymentsSheet.columns = [
    { header: 'Tenant Name', key: 'tenantName', width: 20 },
    { header: 'Branch', key: 'branchName', width: 25 },
    { header: 'Month', key: 'month', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Payment Date', key: 'date', width: 15 },
  ];

  payments.forEach(p => {
    const tenant = tenants.find(t => t.id === (p.tenantId || (p as any).tenant_id));
    const pBranch = branches.find(b => b.id === (p.branchId || (p as any).branch_id)) || branch;
    paymentsSheet.addRow({
      tenantName: tenant?.name || 'Unknown',
      branchName: pBranch?.name || 'Unknown',
      month: p.month,
      type: p.paymentType || (p as any).payment_type,
      amount: p.totalAmount || (p as any).total_amount,
      status: p.status,
      date: p.paymentDate || (p as any).payment_date || '—',
    });
  });

  applyHeaderStyle(paymentsSheet, 7);
  paymentsSheet.getColumn('amount').numFmt = '"₹"#,##0.00';

  // --- 5. COMPLAINTS SHEET ---
  const complaintsSheet = workbook.addWorksheet('Complaints');
  complaintsSheet.columns = [
    { header: 'Tenant Name', key: 'tenantName', width: 25 },
    { header: 'Branch', key: 'branchName', width: 25 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 18 },
  ];

  (complaints || []).forEach((c: any) => {
    const tenant = tenants.find(t => t.id === (c.tenantId || (c as any).tenant_id));
    const cBranch = branches.find(b => b.id === (c.branchId || (c as any).branch_id)) || branch;
    complaintsSheet.addRow({
      tenantName: tenant?.name || 'Unknown',
      branchName: cBranch?.name || 'Unknown',
      title: c.title,
      category: c.category,
      priority: (c.priority || '').toUpperCase(),
      status: (c.status || '').toUpperCase(),
      createdAt: c.createdAt,
    });
  });

  applyHeaderStyle(complaintsSheet, 7);

  // --- 6. ELECTRICITY SHEET ---
  const electricitySheet = workbook.addWorksheet('Electricity');
  electricitySheet.columns = [
    { header: 'Flat / Meter Group', key: 'flat', width: 20 },
    { header: 'Tenant', key: 'tenant', width: 20 },
    { header: 'Branch', key: 'branchName', width: 25 },
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

    const eBranch = branches.find(b => b.id === (p.branchId || (p as any).branch_id)) || branch;

    electricitySheet.addRow({
      flat: flat?.name || 'Standard/Individual',
      tenant: tenant?.name || 'Unknown',
      branchName: eBranch?.name || 'Unknown',
      room: room ? ((room as any).room_number || room.roomNumber) : '—',
      month: p.month,
      base: p.baseShare || 0,
      ac: p.acShare || 0,
      units: p.unitsConsumed || 0,
      cpu: p.costPerUnit || 0,
      total: p.totalAmount || (p as any).total_amount || 0,
    });
  });

  applyHeaderStyle(electricitySheet, 10);
  ['base', 'ac', 'cpu', 'total'].forEach(key => {
    electricitySheet.getColumn(key).numFmt = '"₹"#,##0.00';
  });

  // --- 7. EXPENSES SHEET ---
  const expensesSheet = workbook.addWorksheet('Expenses');
  expensesSheet.columns = [
    { header: 'Title', key: 'title', width: 25 },
    { header: 'Branch', key: 'branchName', width: 25 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Month', key: 'month', width: 15 },
  ];

  expenses.forEach(e => {
     const eBranch = branches.find(b => b.id === (e.branchId || (e as any).branch_id)) || branch;
     expensesSheet.addRow({
       title: e.title,
       branchName: eBranch?.name || 'Unknown',
       category: e.category,
       amount: e.amount,
       status: e.status,
       date: e.date,
       month: e.month
     });
  });

  applyHeaderStyle(expensesSheet, 7);
  expensesSheet.getColumn('amount').numFmt = '"₹"#,##0.00';

  // --- 8. VACANCY SHEET ---
  if (stats.vacantRoomsList && stats.vacantRoomsList.length > 0) {
    const vacancySheet = workbook.addWorksheet('Vacant Rooms');
    vacancySheet.columns = [
      { header: 'Room Number', key: 'room', width: 15 },
      { header: 'Flat / Meter Group', key: 'flat', width: 25 },
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Total Beds', key: 'beds', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    stats.vacantRoomsList.forEach((r: any) => {
      const vBranch = branches.find(b => b.id === (r.branchId || (r as any).branch_id)) || branch;
      const flat = meterGroups?.find(m => m.id === (r.meterGroupId || (r as any).meter_group_id));
      
      vacancySheet.addRow({
        room: r.roomNumber || (r as any).room_number || '—',
        flat: flat?.name || '—',
        branch: vBranch?.name || 'Unknown',
        beds: r.totalBeds || (r as any).total_beds || 0,
        status: 'Vacant'
      });
    });

    applyHeaderStyle(vacancySheet, 5);
  }

  // --- 9. BRANCH COMPARISON SHEET ---
  if (stats.branchComparisonData && stats.branchComparisonData.length > 0) {
    const branchComparisonSheet = workbook.addWorksheet('Branch Comparison');
    branchComparisonSheet.columns = [
      { header: 'Branch Name', key: 'name', width: 25 },
      { header: 'Revenue', key: 'revenue', width: 15 },
      { header: 'Expenses', key: 'expenses', width: 15 },
      { header: 'Profit', key: 'profit', width: 15 },
    ];

    stats.branchComparisonData.forEach((b: any) => {
      branchComparisonSheet.addRow({
        name: b.name,
        revenue: b.revenue,
        expenses: b.expenses,
        profit: b.profit
      });
    });

    applyHeaderStyle(branchComparisonSheet, 4);
    ['revenue', 'expenses', 'profit'].forEach(key => {
      branchComparisonSheet.getColumn(key).numFmt = '"₹"#,##0.00';
    });
  }

  // --- 10. PARTNER PAYOUTS SHEET ---
  if (stats.partnerPayouts && stats.partnerPayouts.length > 0) {
    const payoutsSheet = workbook.addWorksheet('Partner Payouts');
    payoutsSheet.columns = [
      { header: 'Partner', key: 'partner', width: 25 },
      { header: 'Branch', key: 'branch', width: 25 },
      { header: 'Month', key: 'month', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    stats.partnerPayouts.forEach((p: any) => {
      const pBranch = branches.find(b => b.id === (p.branchId || (p as any).branch_id)) || branch;
      payoutsSheet.addRow({
        partner: p.partnerName || 'Partner',
        branch: pBranch?.name || 'Unknown',
        month: p.month,
        amount: p.amount,
        status: p.status,
        date: p.paymentDate || p.createdAt || '—'
      });
    });

    applyHeaderStyle(payoutsSheet, 6);
    payoutsSheet.getColumn('amount').numFmt = '"₹"#,##0.00';
  }

  // --- FINALIZATION ---
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const fileName = `ElitePG_Report_${branch?.name || 'General'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, fileName);
};

export const exportExpensesExcel = async (
  expenses: any[],
  branches: PGBranch[],
  currentTimeRange: string = 'All Time'
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ElitePG';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Expenses Export');
  
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Branch', key: 'branch', width: 25 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Title / Description', key: 'description', width: 40 },
    { header: 'Amount (INR)', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Month', key: 'month', width: 15 },
  ];

  // Formatting header
  applyHeaderStyle(sheet, 7);

  expenses.forEach(e => {
    const branch = branches.find(b => b.id === (e.branchId || e.branch_id));
    sheet.addRow({
      date: e.date,
      branch: branch ? branch.name : 'Unknown',
      category: e.category,
      description: e.title + (e.description ? ` - ${e.description}` : ''),
      amount: e.amount,
      status: (e.status || 'saved').toUpperCase(),
      month: e.month
    });
  });

  // Currency formatting
  sheet.getColumn('amount').numFmt = '"₹"#,##0.00';

  // Finalization
  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const fileName = `ElitePG_Expenses_${currentTimeRange.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, fileName);
};

export const exportKYCToExcel = async (
  kycs: KYCData[],
  tenants: Tenant[],
  employees: Employee[],
  rooms: Room[],
  branches: PGBranch[],
  users: User[],
  currentBranch?: PGBranch
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ElitePG';
  workbook.lastModifiedBy = 'ElitePG';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('KYC Records');
  sheet.columns = [
    { header: 'Person Name', key: 'name', width: 25 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Branch', key: 'branchName', width: 25 },
    { header: 'Contact', key: 'contact', width: 20 },
    { header: 'Room No (Tenants)', key: 'room', width: 15 },
    { header: 'KYC Status', key: 'status', width: 15 },
    { header: 'Document Type', key: 'docType', width: 20 },
    { header: 'Submission Date', key: 'submittedAt', width: 20 },
    { header: 'Verified By', key: 'verifiedBy', width: 20 },
    { header: 'Verification Date', key: 'verifiedAt', width: 20 },
    { header: 'Rejection Reason', key: 'rejectionReason', width: 30 }
  ];

  // Include people with pending/unsubmitted KYC that don't have records yet
  const pendingTenants = tenants.filter(t => !kycs.some(k => k.tenantId === t.id));
  const pendingEmployees = employees.filter(e => !kycs.some(k => k.employeeId === e.id));

  const allRecords = [
    ...kycs.map(k => ({ ...k, isRecord: true })),
    ...pendingTenants.map(t => ({ tenantId: t.id, status: t.kycStatus || 'pending', docType: 'Unsubmitted', isRecord: false })),
    ...pendingEmployees.map(e => ({ employeeId: e.id, status: e.kycStatus || 'pending', docType: 'Unsubmitted', isRecord: false }))
  ];

  allRecords.forEach((k: any) => {
    const tenant = tenants.find(t => t.id === k.tenantId);
    const employee = employees.find(e => e.id === k.employeeId);
    const person = tenant || employee;
    if (!person) return;

    const role = tenant ? 'Tenant' : 'Employee';
    const tBranch = branches.find(b => b.id === (person.branchId || (person as any).branch_id)) || currentBranch;
    const room = tenant ? rooms.find(r => r.id === (tenant.roomId || (tenant as any).room_id)) : null;

    sheet.addRow({
      name: person.name,
      role: role,
      branchName: tBranch?.name || 'Unknown',
      contact: person.phone || person.email || '—',
      room: room ? (room.roomNumber || (room as any).room_number) : '—',
      status: (k.status?.toUpperCase() || 'UNKNOWN'),
      docType: k.documentType || k.docType || '—',
      submittedAt: k.submittedAt || '—',
      verifiedBy: users.find(u => u.id === k.verifiedBy)?.name || k.verifiedBy || '—',
      verifiedAt: k.verifiedAt || '—',
      rejectionReason: k.rejectionReason || '—'
    });
  });

  applyHeaderStyle(sheet, 11);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 11 }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const blob = new Blob([buffer], { type: fileType });
  saveAs(blob, `ElitePG_KYC_Export_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
};

