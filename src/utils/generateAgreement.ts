// @ts-ignore
import jsPDF from 'jspdf';
import { format, addMonths } from 'date-fns';
import toast from 'react-hot-toast';

export const generateAgreementPDF = async (
  tenant: any,
  owner: any,
  branch: any,
  pgConfig: any,
  photoDataUrl: string,
  filename: string,
  tenantSignatureDataUrl?: string
): Promise<Blob | null> => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    let y = 0;

    // Navy Theme Colors from Receipt
    const NAVY_DARK = [15, 23, 42] as const;
    const NAVY_MID = [30, 41, 59] as const;
    const NAVY_ACCENT = [51, 65, 85] as const;
    const WHITE = [255, 255, 255] as const;
    const GRAY_900 = [17, 24, 39] as const;
    const GRAY_400 = [156, 163, 175] as const;

    // ── 1. Navy Blue Header Band
    doc.setFillColor(...NAVY_DARK);
    doc.rect(0, 0, W, 40, 'F');

    // Decorative Shapes
    doc.setFillColor(...NAVY_MID);
    doc.circle(W, 0, 50, 'F');
    doc.setFillColor(...NAVY_ACCENT);
    doc.circle(W - 10, 5, 25, 'F');

    // Logo
    let logoX = 20;
    let logoWidth = 16;
    if (pgConfig?.logoUrl) {
      try {
        doc.addImage(pgConfig.logoUrl, 'PNG', logoX, 10, logoWidth, logoWidth);
      } catch (e) {
        doc.setFillColor(...WHITE);
        doc.roundedRect(logoX, 10, logoWidth, logoWidth, 4, 4, 'F');
        doc.setTextColor(...NAVY_DARK);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text((pgConfig?.pgName || 'E').charAt(0).toUpperCase(), logoX + 8, 21, { align: 'center' });
      }
    } else {
      doc.setFillColor(...WHITE);
      doc.roundedRect(logoX, 10, logoWidth, logoWidth, 4, 4, 'F');
      doc.setTextColor(...NAVY_DARK);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text((pgConfig?.pgName || 'E').charAt(0).toUpperCase(), logoX + 8, 21, { align: 'center' });
    }

    // PG Name & Subtitle
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(pgConfig?.pgName || 'ELITE PG', 42, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_400);
    doc.text('PAYING GUEST AGREEMENT', 42, 26);

    // Agreement Date (Right)
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('AGREEMENT DATE', W - 60, 16);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'dd MMM yyyy'), W - 60, 22);

    y = 50;

    // Text Content Settings
    const margin = 20;
    const lineSpacing = 5;
    const fontSize = 9;
    doc.setTextColor(...GRAY_900);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');

    doc.text('This Paying Guest Agreement is made between:', margin, y);
    y += 8;

    // ── OWNER & TENANT DETAILS — side by side ──
    const colLeft = margin;
    const colRight = W / 2 + 5;
    const ownerPhone = owner?.phone || branch?.phone || '—';
    const ownerAddress = branch?.address || '—';

    doc.setFont('helvetica', 'bold');
    doc.text('OWNER DETAILS', colLeft, y);
    doc.text('TENANT DETAILS', colRight, y);
    y += lineSpacing;

    doc.setFont('helvetica', 'normal');
    doc.text(`PG: ${pgConfig?.pgName || 'Elite PG'}`, colLeft, y);
    doc.text(`Name: ${tenant?.name || '—'}`, colRight, y); y += lineSpacing;
    doc.text(`Contact: ${ownerPhone}`, colLeft, y);
    doc.text(`Phone: ${tenant?.phone || '—'}`, colRight, y); y += lineSpacing;
    doc.text(`Address: ${ownerAddress}`, colLeft, y);
    doc.text(`Email: ${tenant?.email || '—'}`, colRight, y); y += lineSpacing;
    doc.text('', colLeft, y);
    doc.text(`Room: ${tenant?.rooms?.room_number || tenant?.room_number || '—'}`, colRight, y); y += lineSpacing;

    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, W - margin, y);
    y += 6;

    // HELPER FUNCTION for Sections — compact
    const addSection = (title: string, lines: string[]) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, y);
      y += lineSpacing;
      doc.setFont('helvetica', 'normal');
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        if (line.startsWith('*')) {
          doc.text(`• ${line.substring(2)}`, margin + 4, y);
        } else {
          doc.text(line, margin + 4, y);
        }
        y += lineSpacing;
      });
      y += 3;
    };

    const startDate = tenant?.joining_date ? format(new Date(tenant.joining_date), 'dd MMM yyyy') : 'TBD';
    const endDate = tenant?.joining_date ? format(addMonths(new Date(tenant.joining_date), 11), 'dd MMM yyyy') : 'TBD';

    addSection('1. ACCOMMODATION DETAILS', [
      `The Owner agrees to provide accommodation in Room ${tenant?.rooms?.room_number || tenant?.room_number || '—'} at ${pgConfig?.pgName || 'Elite PG'}.`
    ]);

    addSection('2. RENT DETAILS', [
      `Monthly Rent: Rs. ${Number(tenant?.rent_amount || 0).toLocaleString()}  |  Due: ${tenant?.payment_due_date || '1'}st of every month  |  Mode: Online / Cash`
    ]);

    addSection('3. SECURITY DEPOSIT', [
      `Deposit: Rs. ${Number(tenant?.deposit_amount || 0).toLocaleString()}  •  Refundable after stay  •  Subject to damage deductions`
    ]);

    addSection('4. AGREEMENT PERIOD', [
      `Start: ${startDate}  |  End: ${endDate}`
    ]);

    addSection('5. HOUSE RULES', [
      `* Follow PG timings and curfew`,
      `* Maintain cleanliness & no illegal activities`,
      `* No damage to property`,
      `* Follow food and visitor policies`
    ]);

    addSection('6. GUEST POLICY', [
      `* Visitors allowed only with permission  •  No overnight guests without approval`
    ]);

    addSection('7. CLEANING & MAINTENANCE', [
      `* Regular cleaning provided  •  Tenant must maintain personal hygiene`
    ]);

    addSection('8. TERMINATION', [
      `* Tenant must give prior notice  •  Deposit refunded after inspection`
    ]);

    addSection('9. DAMAGES', [
      `* Any damages will be deducted from deposit`
    ]);

    doc.line(margin, y, W - margin, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('DECLARATION', margin, y);
    y += lineSpacing;
    doc.setFont('helvetica', 'normal');
    doc.text('Both parties agree to the terms and conditions mentioned above.', margin, y);
    y += 24;

    // Check page boundary for signatures strictly
    if (y > 230) {
      doc.addPage();
      y = 30;
    }

    // ── Signatures — robustly handle both Base64 and remote URLs
    const getSignatureDataUrl = async (url?: string): Promise<string | null> => {
      if (!url || url.length < 10) return null;
      if (url.startsWith('data:image')) return url;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Failed to fetch signature:', url, e);
        return null;
      }
    };

    const tenantSigUrl = tenantSignatureDataUrl || tenant?.signatureUrl || tenant?.signature_url || tenant?.users?.signature_url;
    const ownerSigUrl = owner?.signatureUrl || branch?.officialSignatureUrl;

    const tenantSig = await getSignatureDataUrl(tenantSigUrl);
    const ownerSig = await getSignatureDataUrl(ownerSigUrl);

    const ownerSigName = owner?.name || 'Admin';
    const tenantSigName = tenant?.name || 'Tenant';
    const pgFullName = pgConfig?.pgName || 'Elite PG';
    const signatureDate = format(new Date(), "dd MMMM yyyy hh:mm:ss a");

    // ── Second Party's Signature (Tenant - left side)
    const leftX = margin;
    const rightX = W / 2 + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_900);
    doc.text("Second Party's Signature", leftX, y);
    doc.text("First Party's Signature", rightX, y);
    y += 6;

    // Draw signature images
    if (tenantSig) {
      try {
        const isPNG = tenantSig.toLowerCase().includes('image/png');
        doc.addImage(tenantSig, isPNG ? 'PNG' : 'JPEG', leftX, y, 45, 18);
      } catch (e) { console.error('Tenant sig render fail:', e); }
    }
    if (ownerSig) {
      try {
        const isPNG = ownerSig.toLowerCase().includes('image/png');
        doc.addImage(ownerSig, isPNG ? 'PNG' : 'JPEG', rightX, y, 45, 18);
      } catch (e) { console.error('Owner sig render fail:', e); }
    }
    y += 22;

    // Names and date below signatures
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRAY_900);
    doc.text(tenantSigName, leftX, y);
    doc.text(pgFullName, rightX, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY_400);
    doc.text(signatureDate, leftX, y);
    doc.text(signatureDate, rightX, y);
    y += 12;

    // ── Tenant Photo Section (matching reference image)
    if (photoDataUrl) {
      if (y > 220) { doc.addPage(); y = 30; }

      const photoWidth = 35;
      const photoHeight = 45;

      // Photo on the left
      try {
        const isJPEG = photoDataUrl.includes('jpeg') || photoDataUrl.includes('jpg');
        doc.addImage(photoDataUrl, isJPEG ? 'JPEG' : 'PNG', leftX, y, photoWidth, photoHeight);
      } catch (err) { }

      y += photoHeight + 8;

      // Verified badge below the photo
      const badgeX = leftX;
      const badgeW = 60;
      const badgeH = 16;

      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(badgeX, y, badgeW, badgeH, 3, 3, 'FD');

      // Checkmark circle
      doc.setFillColor(34, 197, 94);
      doc.circle(badgeX + 8, y + badgeH / 2, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('V', badgeX + 8, y + badgeH / 2 + 1.5, { align: 'center' });

      // Badge text
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text("This user's aadhaar is", badgeX + 16, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.text("digitally verified by UIDAI", badgeX + 16, y + 11);

      y += badgeH + 8;
    }

    // Footer — positioned dynamically after all content
    if (y > 275) { doc.addPage(); y = 30; }
    y = Math.max(y, 20);
    y += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY_400);
    doc.text(`This is a system-generated agreement by ${pgConfig?.pgName || 'Elite PG'}.`, W / 2, y, { align: 'center' });

    doc.save(filename);
    return doc.output('blob');
  } catch (error) {
    console.error('Failed to generate agreement PDF:', error);
    toast.error('Failed to generate agreement.');
    return null;
  }
};
