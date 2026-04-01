import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantReceiptData {
  paymentId: string;
  paymentDate: string;
  month: string;
  amount: number;
  paymentType?: 'rent' | 'electricity' | string;
  electricityAmount?: number;
  lateFee: number;
  totalAmount: number;
  method: string;
  transactionId?: string;
  status: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  roomNumber?: string;
  branchName?: string;
  branchPhone?: string;
  branchAddress?: string;
  pgName?: string;
  logoUrl?: string;
  signatureUrl?: string;
  // Electricity breakdown
  baseShare?: number;
  acShare?: number;
  unitsConsumed?: number;
  costPerUnit?: number;
}

export interface SubscriptionReceiptData {
  paymentId: string;
  paymentDate: string;
  planName: string;
  billing: 'monthly' | 'annual';
  amount: number;
  adminName?: string;
  adminEmail?: string;
  branchName?: string;
  branchPhone?: string;
  branchAddress?: string;
  pgName?: string;
  logoUrl?: string;
  signatureUrl?: string;
}

// ─── Colour palette (Navy Blue Theme) ──────────────────────────────────────────
const NAVY_DARK    = [15,  23,  42] as const;   // #0f172a
const NAVY_MID     = [30,  41,  59] as const;   // #1e293b
const NAVY_ACCENT  = [51,  65,  85] as const;   // #334155
const BLUE_BRIGHT  = [59,  130, 246] as const;  // #3b82f6
const GRAY_900     = [17,   24,  39] as const;   // #111827
const GRAY_600     = [75,   85,  99] as const;   // #4b5563
const GRAY_400     = [156, 163, 175] as const;   // #9ca3af
const GRAY_200     = [229, 231, 235] as const;   // #e5e7eb
const GRAY_50      = [249, 250, 251] as const;   // #f9fafb
const WHITE        = [255, 255, 255] as const;
const SUCCESS_BG   = [240, 253, 244] as const;   // #f0fdf4
const SUCCESS_TEXT = [21,  128,  61] as const;   // #15803d

// ─── Core PDF builder ─────────────────────────────────────────────────────────

interface ReceiptConfig {
  receiptNo: string;
  date: string;
  billedToName: string;
  billedToLines: string[];
  paymentMethod: string;
  transactionId?: string;
  totalAmount: number;
  descriptionRow: string;
  branchName?: string;
  branchPhone?: string;
  branchAddress?: string;
  pgName?: string;
  logoUrl?: string;
  signatureUrl?: string;
}

async function buildPDF(cfg: ReceiptConfig, filename: string, returnBlob: boolean = false): Promise<Blob | void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 0;

  // ── 1. Navy Blue Header Band ──────────────────────────────────────────────
  doc.setFillColor(...NAVY_DARK);
  doc.rect(0, 0, W, 50, 'F');

  // Decorative Shapes
  doc.setFillColor(...NAVY_MID);
  doc.circle(W, 0, 60, 'F');
  doc.setFillColor(...NAVY_ACCENT);
  doc.circle(W - 10, 5, 30, 'F');

  // Logo
  let logoX = 15;
  let logoWidth = 20;
  if (cfg.logoUrl) {
    try {
      let finalLogoStr = cfg.logoUrl;
      if (cfg.logoUrl.startsWith('http')) {
        const response = await fetch(cfg.logoUrl);
        const blob = await response.blob();
        finalLogoStr = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      
      const isPNG = finalLogoStr.toLowerCase().includes('image/png') || cfg.logoUrl.toLowerCase().includes('png');
      doc.addImage(finalLogoStr, isPNG ? 'PNG' : 'JPEG', logoX, 10, logoWidth, logoWidth);
    } catch (e) {
      // Fallback logo
      doc.setFillColor(...WHITE);
      doc.roundedRect(logoX, 10, logoWidth, logoWidth, 4, 4, 'F');
      doc.setTextColor(...NAVY_DARK);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text((cfg.pgName || 'E').charAt(0).toUpperCase(), logoX + 10, 24, { align: 'center' });
    }
  } else {
    // Default logo
    doc.setFillColor(...WHITE);
    doc.roundedRect(logoX, 10, logoWidth, logoWidth, 4, 4, 'F');
    doc.setTextColor(...NAVY_DARK);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((cfg.pgName || 'E').charAt(0).toUpperCase(), logoX + 10, 24, { align: 'center' });
  }

  // PG Name & Subtitle
  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(cfg.pgName || 'ElitePG', 42, 24);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_400);
  doc.text('OFFICIAL PAYMENT RECEIPT', 42, 32);

  // Receipt Meta (Right)
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT NO', W - 60, 18);
  doc.setFont('helvetica', 'normal');
  doc.text(cfg.receiptNo, W - 60, 24);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE ISSUED', W - 60, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(cfg.date, W - 60, 38);

  y = 60;

  // ── 2. Status Badge ──────────────────────────────────────────────────────
  doc.setFillColor(...SUCCESS_BG);
  doc.roundedRect(15, y, 60, 10, 2, 2, 'F');
  doc.setTextColor(...SUCCESS_TEXT);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('✓  PAYMENT COMPLETED', 19, y + 6.5);

  y += 20;

  // ── 3. Information Grid ─────────────────────────────────────────────────
  const colL = 15;
  const colR = W / 2 + 10;

  // BILLED TO
  doc.setTextColor(...NAVY_DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO', colL, y);
  
  doc.setDrawColor(...BLUE_BRIGHT);
  doc.setLineWidth(0.5);
  doc.line(colL, y + 2, colL + 20, y + 2);

  // PAYMENT DETAILS
  doc.text('PAYMENT DETAILS', colR, y);
  doc.line(colR, y + 2, colR + 35, y + 2);

  y += 10;

  // Billed To Details
  doc.setTextColor(...GRAY_900);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const nameL = doc.splitTextToSize(cfg.billedToName, 80);
  doc.text(nameL, colL, y);
  y += nameL.length * 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_600);
  cfg.billedToLines.forEach(l => {
    doc.text(l, colL, y);
    y += 5;
  });

  // Payment Details Info (Right Side)
  let ry = y - (cfg.billedToLines.length * 5) - (nameL.length * 6);
  
  // Total Box
  doc.setFillColor(...GRAY_50);
  doc.roundedRect(colR, ry, 75, 20, 2, 2, 'F');
  doc.setDrawColor(...GRAY_200);
  doc.setLineWidth(0.3);
  doc.roundedRect(colR, ry, 75, 20, 2, 2, 'S');

  doc.setTextColor(...GRAY_600);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT PAID', colR + 5, ry + 6);

  doc.setTextColor(...NAVY_DARK);
  doc.setFontSize(18);
  doc.text(`Rs. ${cfg.totalAmount.toLocaleString('en-IN')}`, colR + 5, ry + 16);

  ry += 26;
  const rows = [
    ['Payment Method', cfg.paymentMethod],
    ...(cfg.transactionId ? [['Transaction ID', cfg.transactionId]] : [])
  ];

  rows.forEach(([label, val]) => {
    doc.setTextColor(...GRAY_400);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label, colR, ry);
    doc.setTextColor(...GRAY_900);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), colR + 30, ry);
    ry += 6;
  });

  y = Math.max(y, ry) + 10;

  // ── 4. Itemized Table ───────────────────────────────────────────────────
  doc.setFillColor(...NAVY_DARK);
  doc.rect(15, y, W - 30, 10, 'F');
  
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICE DESCRIPTION', 20, y + 6.5);
  doc.text('AMOUNT', W - 20, y + 6.5, { align: 'right' });

  y += 10;
  
  const dLines = doc.splitTextToSize(cfg.descriptionRow, 140);
  const rowHeight = Math.max(15, dLines.length * 6 + 5);

  doc.setFillColor(...WHITE);
  doc.rect(15, y, W - 30, rowHeight, 'F');
  doc.setDrawColor(...GRAY_200);
  doc.rect(15, y, W - 30, rowHeight, 'S');

  doc.setTextColor(...GRAY_900);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dLines, 20, y + 9);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${cfg.totalAmount.toLocaleString('en-IN')}`, W - 20, y + 9, { align: 'right' });

  y += rowHeight;

  // Total Summary
  doc.setFillColor(...GRAY_50);
  doc.rect(15, y, W - 30, 12, 'F');
  doc.setDrawColor(...GRAY_200);
  doc.rect(15, y, W - 30, 12, 'S');

  doc.setTextColor(...NAVY_DARK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL', 20, y + 8);
  doc.text(`Rs. ${cfg.totalAmount.toLocaleString('en-IN')}`, W - 20, y + 8, { align: 'right' });

  y += 22;

  // ── 5. Signature and Footer ──────────────────────────────────────────────
  doc.setDrawColor(...GRAY_200);
  doc.line(15, y, W - 15, y);
  y += 10;

  // Left - Contact
  doc.setTextColor(...NAVY_DARK);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Questions?', colL, y);
  y += 6;
  doc.setTextColor(...GRAY_600);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (cfg.branchPhone) doc.text(`Call: ${cfg.branchPhone}`, colL, y); y += 4;
  if (cfg.branchName) doc.text(`Branch: ${cfg.branchName}`, colL, y); y += 4;
  if (cfg.branchAddress) {
    const addrL = doc.splitTextToSize(cfg.branchAddress, 70);
    doc.text(addrL, colL, y);
  }

  // Right - Signature
  const sigY = y + 5;
  const sigX = W - 65;
  const sigW = 50;
  const sigH = 20;

  if (cfg.signatureUrl && cfg.signatureUrl.length > 50) { // Check if it's a valid data URL/long string
    try {
      let finalSignatureStr = cfg.signatureUrl;
      if (cfg.signatureUrl.startsWith('http')) {
        const response = await fetch(cfg.signatureUrl);
        const blob = await response.blob();
        finalSignatureStr = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Auto-detect format from data URL
      const isPNG = finalSignatureStr.toLowerCase().includes('image/png') || cfg.signatureUrl.toLowerCase().includes('png');
      const isJPEG = finalSignatureStr.toLowerCase().includes('image/jpeg') || cfg.signatureUrl.toLowerCase().includes('jpeg') || cfg.signatureUrl.toLowerCase().includes('jpg');
      const format = isPNG ? 'PNG' : (isJPEG ? 'JPEG' : 'PNG'); 
      
      doc.addImage(finalSignatureStr, format, sigX, sigY - 5, sigW, sigH);
    } catch (e) {
      console.error('Signature rendering failed:', e);
      doc.setDrawColor(...GRAY_400);
      doc.line(sigX - 5, sigY + 12, sigX + sigW + 5, sigY + 12);
    }
  } else {
    // Just a line for manual signature if no URL
    doc.setDrawColor(...GRAY_400);
    doc.line(sigX - 5, sigY + 12, sigX + sigW + 5, sigY + 12);
  }

  doc.setTextColor(GRAY_600[0], GRAY_600[1], GRAY_600[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED SIGNATURE', W - 42.5, sigY + 18, { align: 'center' });
  // Bottom Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRAY_400);
  doc.text('Thank you for choosing ElitePG. This is a computer-generated receipt.', W / 2, 285, { align: 'center' });

  if (returnBlob) return doc.output('blob');
  doc.save(filename);
}

// ─── Tenant Rent Receipt ──────────────────────────────────────────────────────

export async function generateTenantReceiptPDF(data: TenantReceiptData, returnBlob: boolean = false): Promise<Blob | void> {
  let monthLabel = data.month;
  try { monthLabel = format(parseISO(`${data.month}-01`), 'MMMM yyyy'); } catch { /* keep raw */ }

  const receiptNo = `REC-${(data.paymentId || 'NEW').slice(-8).toUpperCase()}`;
  const date = (() => { try { return format(parseISO(data.paymentDate), 'dd MMM yyyy'); } catch { return data.paymentDate; } })();

  const billedToLines: string[] = [];
  if (data.tenantPhone) billedToLines.push(`Phone: ${data.tenantPhone}`);
  if (data.tenantEmail) billedToLines.push(`Email: ${data.tenantEmail}`);
  const roomBranch = [data.roomNumber ? `Room ${data.roomNumber}` : '', data.branchName].filter(Boolean).join(' · ');
  if (roomBranch) billedToLines.push(roomBranch);

  let desc = '';
  if (data.paymentType === 'electricity') {
    const totalElec = data.electricityAmount || data.amount || 0;
    const base = data.baseShare || 0;
    const ac = data.acShare || 0;
    const units = data.unitsConsumed || 0;
    const cpu = data.costPerUnit || 0;

    desc = `ELITE ELECTRICTY BILL BREAKDOWN\n`;
    desc += `--------------------------------------------------\n`;
    desc += `Base Charges (Fixed/Pooled): Rs. ${base.toLocaleString('en-IN')}\n`;
    if (ac > 0) {
      desc += `AC Charges (${units} units x Rs. ${cpu.toFixed(2)}): Rs. ${ac.toLocaleString('en-IN')}\n`;
    }
    desc += `--------------------------------------------------\n`;
    desc += `TOTAL ELECTRICITY: Rs. ${totalElec.toLocaleString('en-IN')}\n`;
    if (data.lateFee > 0) {
      desc += `Late Fee Applied: Rs. ${data.lateFee.toLocaleString('en-IN')}\n`;
    }
    desc += `Month: ${monthLabel}`;
  } else {
    // Rent Receipt
    const lateFeeDesc = data.lateFee > 0 ? ` (+ Rs. ${data.lateFee.toLocaleString('en-IN')} Late Fee)` : '';
    desc = `Accommodation / Monthly Rent Payment\n`;
    desc += `Month: ${monthLabel}\n`;
    desc += `Base Rent: Rs. ${data.amount.toLocaleString('en-IN')}${lateFeeDesc}\n`;
    if (data.electricityAmount && data.electricityAmount > 0) {
       desc += `Electricity Shared: Rs. ${data.electricityAmount.toLocaleString('en-IN')}\n`;
    }
    desc += `Total Paid: Rs. ${data.totalAmount.toLocaleString('en-IN')}`;
  }

  return await buildPDF({
    receiptNo,
    date,
    billedToName: data.tenantName,
    billedToLines,
    paymentMethod: data.method,
    transactionId: data.transactionId,
    totalAmount: data.totalAmount,
    descriptionRow: desc,
    branchName: data.branchName,
    branchPhone: data.branchPhone,
    branchAddress: data.branchAddress,
    pgName: data.pgName,
    logoUrl: data.logoUrl,
    signatureUrl: data.signatureUrl
  }, `receipt_${(data.paymentId || 'NEW').slice(-10)}.pdf`, returnBlob);
}

// ─── Subscription Receipt ─────────────────────────────────────────────────────

export async function generateSubscriptionReceiptPDF(data: SubscriptionReceiptData, returnBlob: boolean = false): Promise<Blob | void> {
  const receiptNo = `SUB-${(data.paymentId || 'NEW').slice(-8).toUpperCase()}`;
  const date = (() => { try { return format(parseISO(data.paymentDate), 'dd MMM yyyy'); } catch { return data.paymentDate; } })();

  const billedToLines: string[] = [];
  if (data.adminEmail) billedToLines.push(`Email: ${data.adminEmail}`);
  if (data.branchName) billedToLines.push(`Branch: ${data.branchName}`);

  const desc = `ElitePG ${data.planName} Plan Subscription (${data.billing})`;

  return await buildPDF({
    receiptNo,
    date,
    billedToName: data.adminName || 'Admin',
    billedToLines,
    paymentMethod: 'Razorpay Online',
    transactionId: data.paymentId,
    totalAmount: data.amount,
    descriptionRow: desc,
    branchName: data.branchName,
    branchPhone: data.branchPhone,
    branchAddress: data.branchAddress,
    pgName: data.pgName,
    logoUrl: data.logoUrl,
    signatureUrl: data.signatureUrl
  }, `receipt_${(data.paymentId || 'NEW').slice(-10)}.pdf`, returnBlob);
}
