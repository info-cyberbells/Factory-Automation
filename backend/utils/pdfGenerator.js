const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

// Draw general page header
const drawHeader = (doc, org, title) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  // Draw primary accent bar at top
  doc.rect(0, 0, 595.28, 15).fill(themeColor);
  
  // Left - Logo
  let logoPlaced = false;
  if (org.settings && org.settings.logo && org.settings.logo !== '/logo.png') {
    try {
      const logoPath = path.join(__dirname, '../', org.settings.logo);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 30, { fit: [120, 50] });
        logoPlaced = true;
      }
    } catch (err) {
      console.error('PDF Logo placement failed:', err.message);
    }
  }
  
  if (!logoPlaced) {
    // Elegant fallback logo badge
    doc.circle(75, 55, 22).fill(themeColor);
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(org.name ? org.name.charAt(0).toUpperCase() : 'T', 50, 48, { width: 50, align: 'center' });
  }
  
  // Right - Org details
  doc.fillColor('#1f2937');
  doc.font('Helvetica-Bold').fontSize(14).text(org.name || 'TrackBells Enterprise', 200, 30, { align: 'right', width: 345 });
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
  doc.text((org.settings && org.settings.brandSubtitle) || 'Factory Automation', 200, 48, { align: 'right', width: 345 });
  if (org.address) {
    doc.text(org.address, 200, 60, { align: 'right', width: 345 });
  }
  let contactInfo = '';
  if (org.contactPhone) contactInfo += `Phone: ${org.contactPhone}`;
  if (org.contactEmail) contactInfo += (contactInfo ? ' | ' : '') + `Email: ${org.contactEmail}`;
  if (contactInfo) {
    doc.text(contactInfo, 200, 72, { align: 'right', width: 345 });
  }
  
  // Divider
  doc.moveTo(50, 95).lineTo(545.28, 95).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  // Document Title
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(16).text(title, 50, 110);
};

// Draw general page footer
const drawFooter = (doc, org) => {
  const footerText = (org.settings && org.settings.footerText) || 'Powered by Cyberbells ITES services pvt ltd';
  doc.moveTo(50, 765).lineTo(545.28, 765).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  doc.fillColor('#9ca3af').fontSize(8).font('Helvetica');
  doc.text(footerText, 50, 775, { width: 350 });
  doc.text('Authorized Signatory', 400, 775, { width: 145, align: 'right' });
};

/**
 * Generate Sales Order PDF dynamically
 */
exports.generateSalesOrderPDF = (doc, order, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  drawHeader(doc, org, 'SALES ORDER');
  
  // Client info
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('BILL TO / CLIENT:', 50, 150);
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12).text(order.clientName, 50, 165);
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('TrackBells Registered Client', 50, 182);
  
  // Order meta
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('ORDER DETAILS:', 320, 150);
  
  const rightGridX = 320;
  const rightGridValX = 420;
  let currentY = 165;
  
  const addMetaRow = (label, val, bold = false) => {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(label, rightGridX, currentY);
    doc.fillColor('#1f2937').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(val, rightGridValX, currentY);
    currentY += 16;
  };
  
  addMetaRow('Order Number:', order.orderNumber, true);
  addMetaRow('Order Date:', formatDate(order.createdAt));
  addMetaRow('Delivery By:', formatDate(order.deliveryDate));
  addMetaRow('Status:', (order.status || 'PENDING').toUpperCase(), true);
  
  // Items Table
  currentY = 250;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Item / Model Number', 60, currentY + 7);
  doc.text('Description', 220, currentY + 7);
  doc.text('Quantity', 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Table Row 1
  doc.rect(50, currentY, 495.28, 24).fill('#f9fafb');
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
  doc.text(order.modelNumber, 60, currentY + 7);
  doc.text('Extruded Nylon / Assembly Chain Product', 220, currentY + 7);
  doc.text(`${order.orderQuantity} Meters`, 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Divider
  doc.moveTo(50, currentY + 10).lineTo(545.28, currentY + 10).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 15;
  
  // Summary
  doc.fillColor('#4b5563').font('Helvetica').fontSize(10).text('Total Order Volume:', 320, currentY);
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12).text(`${order.orderQuantity} Meters`, 450, currentY, { align: 'right', width: 80 });
  
  // Note/T&C
  currentY += 50;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('Terms & Conditions:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text('1. This is a computer generated document and does not require a physical signature.', 50, currentY, { width: 495.28 });
  doc.text('2. Goods once manufactured according to the specifications are not subject to return.', 50, currentY + 12, { width: 495.28 });
  doc.text('3. Expected delivery date is subject to production capacity and raw material availability.', 50, currentY + 24, { width: 495.28 });
  
  drawFooter(doc, org);
};

/**
 * Generate Purchase Order PDF dynamically
 */
exports.generatePurchaseOrderPDF = (doc, po, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  drawHeader(doc, org, 'PURCHASE ORDER');
  
  // Vendor details
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('VENDOR / SUPPLIER:', 50, 150);
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12).text(po.vendorId?.vendorName || 'N/A', 50, 165);
  let vendorGst = po.vendorId?.gstNumber ? `GSTIN: ${po.vendorId.gstNumber}` : 'GSTIN: Not Provided';
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(vendorGst, 50, 182);
  doc.text(`Primary Product: ${po.vendorId?.materialSupplied || 'Raw Materials'}`, 50, 195);
  
  // PO meta
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('PURCHASE ORDER DETAILS:', 320, 150);
  
  const rightGridX = 320;
  const rightGridValX = 420;
  let currentY = 165;
  
  const addMetaRow = (label, val, bold = false) => {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(label, rightGridX, currentY);
    doc.fillColor('#1f2937').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(val, rightGridValX, currentY);
    currentY += 16;
  };
  
  addMetaRow('PO Number:', po.poNumber || 'N/A', true);
  addMetaRow('PO Date:', formatDate(po.createdAt));
  addMetaRow('Status:', (po.status || 'PENDING').toUpperCase(), true);
  
  // Table
  currentY = 250;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Material / Description', 60, currentY + 7);
  doc.text('Quantity (kg)', 250, currentY + 7, { align: 'right', width: 80 });
  doc.text('Rate / kg', 350, currentY + 7, { align: 'right', width: 80 });
  doc.text('Total Amount', 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Table Row 1
  doc.rect(50, currentY, 495.28, 24).fill('#f9fafb');
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
  doc.text(`${po.materialType} Raw Material`, 60, currentY + 7);
  doc.text(`${po.quantityKg} kg`, 250, currentY + 7, { align: 'right', width: 80 });
  doc.text(formatCurrency(po.ratePerKg), 350, currentY + 7, { align: 'right', width: 80 });
  doc.text(formatCurrency(po.totalAmount), 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Divider
  doc.moveTo(50, currentY + 10).lineTo(545.28, currentY + 10).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 15;
  
  // Summary
  const summaryX = 350;
  const summaryValX = 450;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Subtotal:', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(po.totalAmount), summaryValX, currentY, { align: 'right', width: 80 });
  currentY += 16;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Tax (0%):', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(0), summaryValX, currentY, { align: 'right', width: 80 });
  currentY += 18;
  
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('Grand Total:', summaryX, currentY);
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11).text(formatCurrency(po.totalAmount), summaryValX, currentY - 1, { align: 'right', width: 80 });
  
  // Note/T&C
  currentY += 60;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('Terms & Conditions:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text('1. Material delivery must align with the requested parameters and quality norms.', 50, currentY, { width: 495.28 });
  doc.text('2. Please supply the invoice mentioning this Purchase Order Number during dispatch.', 50, currentY + 12, { width: 495.28 });
  doc.text('3. Payment will be processed after quantity validation and quality check approval.', 50, currentY + 24, { width: 495.28 });
  
  drawFooter(doc, org);
};

/**
 * Generate Sales Invoice PDF dynamically
 */
exports.generateSalesInvoicePDF = (doc, invoice, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  drawHeader(doc, org, 'TAX INVOICE');
  
  // Client details
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('BILL TO / CLIENT:', 50, 150);
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12).text(invoice.clientName || 'N/A', 50, 165);
  
  let clientDetailsY = 182;
  if (invoice.clientAddress) {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(invoice.clientAddress, 50, clientDetailsY);
    clientDetailsY += 14;
  }
  if (invoice.clientGST) {
    doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text(`GSTIN: ${invoice.clientGST}`, 50, clientDetailsY);
  }
  
  // Invoice meta
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('INVOICE DETAILS:', 320, 150);
  
  const rightGridX = 320;
  const rightGridValX = 420;
  let currentY = 165;
  
  const addMetaRow = (label, val, bold = false) => {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(label, rightGridX, currentY);
    doc.fillColor('#1f2937').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(val, rightGridValX, currentY);
    currentY += 16;
  };
  
  addMetaRow('Invoice Number:', invoice.invoiceNumber || 'N/A', true);
  addMetaRow('Invoice Date:', formatDate(invoice.invoiceDate));
  if (invoice.dueDate) {
    addMetaRow('Due Date:', formatDate(invoice.dueDate));
  }
  
  // Table
  currentY = 240;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('S.No', 55, currentY + 7);
  doc.text('Item Description', 90, currentY + 7);
  doc.text('Qty', 270, currentY + 7, { align: 'right', width: 40 });
  doc.text('Rate', 320, currentY + 7, { align: 'right', width: 60 });
  doc.text('GST %', 390, currentY + 7, { align: 'right', width: 40 });
  doc.text('Total (INR)', 445, currentY + 7, { align: 'right', width: 90 });
  
  currentY += 24;
  
  // Table Rows
  (invoice.items || []).forEach((item, idx) => {
    // Zebra striping
    if (idx % 2 === 0) {
      doc.rect(50, currentY, 495.28, 22).fill('#f9fafb');
    }
    
    doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
    doc.text(String(idx + 1), 55, currentY + 6);
    doc.text(item.description || 'N/A', 90, currentY + 6, { width: 175 });
    doc.text(String(item.quantity), 270, currentY + 6, { align: 'right', width: 40 });
    doc.text(formatCurrency(item.rate).replace('₹', '').trim(), 320, currentY + 6, { align: 'right', width: 60 });
    doc.text(`${item.taxRate || 18}%`, 390, currentY + 6, { align: 'right', width: 40 });
    doc.text(formatCurrency(item.amount).replace('₹', '').trim(), 445, currentY + 6, { align: 'right', width: 90 });
    
    currentY += 22;
  });
  
  // Divider
  doc.moveTo(50, currentY + 5).lineTo(545.28, currentY + 5).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 10;
  
  // Summary
  const summaryX = 350;
  const summaryValX = 450;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Subtotal:', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(invoice.subtotal), summaryValX, currentY, { align: 'right', width: 80 });
  currentY += 16;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('GST Tax Amount:', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(invoice.taxAmount), summaryValX, currentY, { align: 'right', width: 80 });
  currentY += 18;
  
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('Grand Total:', summaryX, currentY);
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11).text(formatCurrency(invoice.grandTotal), summaryValX, currentY - 1, { align: 'right', width: 80 });
  
  // Note/T&C
  currentY += 50;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('Notes:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text(invoice.notes || 'Thank you for your business!', 50, currentY, { width: 495.28 });
  
  currentY += 24;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280').text('Terms & Conditions:', 50, currentY);
  doc.font('Helvetica').fontSize(7).fillColor('#9ca3af');
  doc.text('1. Payment is due within the stipulated time frame.', 50, currentY + 12, { width: 495.28 });
  doc.text('2. Interest of 18% p.a. will be charged for payments delayed beyond the due date.', 50, currentY + 20, { width: 495.28 });
  
  drawFooter(doc, org);
};
