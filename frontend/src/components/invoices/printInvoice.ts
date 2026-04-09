/**
 * Opens a new print window with the rendered invoice content,
 * copying all Tailwind CSS styles from the current document.
 * This ensures the printed invoice looks identical to the on-screen preview.
 */
export function printInvoiceFromRef(ref: React.RefObject<HTMLDivElement | null>) {
  const el = ref.current;
  if (!el) return;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  // Collect all stylesheets from the current page
  const styles: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.cssRules) {
        const rules = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join('\n');
        styles.push(rules);
      }
    } catch {
      // Cross-origin stylesheets can't be read — copy via link instead
      if (sheet.href) {
        styles.push(`@import url("${sheet.href}");`);
      }
    }
  }

  // Also collect <link rel="stylesheet"> hrefs as fallback
  const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((link) => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}" />`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Print Invoice</title>
  ${linkTags}
  <style>
    ${styles.join('\n')}

    /* ── Print-specific overrides ── */
    @page {
      size: A4 portrait;
      margin: 0;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      display: flex;
      justify-content: center;
    }

    .print-invoice-root {
      width: 210mm;
      max-height: 297mm;
      margin: 0 auto;
      background: #fff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Ensure the inner invoice container also fills A4 */
    .print-invoice-root > div {
      max-height: 297mm;
      display: flex;
      flex-direction: column;
    }

    /* Prevent page breaks — force single page */
    * {
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
      break-before: avoid !important;
      break-after: avoid !important;
      break-inside: avoid !important;
    }

    /* Screen-only: show action bar */
    @media screen {
      body {
        background: #f3f4f6;
        padding: 0;
      }
      .no-print-bar {
        display: flex;
        justify-content: center;
        gap: 8px;
        padding: 16px;
        background: #fff;
        border-bottom: 1px solid #e5e7eb;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .no-print-bar button {
        padding: 8px 20px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .btn-print { background: #0284c7; color: #fff; }
      .btn-print:hover { opacity: 0.9; }
      .btn-close { background: #f3f4f6; color: #374151; }
      .btn-close:hover { background: #e5e7eb; }
    }

    @media print {
      .no-print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Print Invoice</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
  <div class="print-invoice-root">
    ${el.outerHTML}
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for styles/fonts to load, then auto-scale and print
  printWindow.onload = () => {
    setTimeout(() => {
      // Auto-scale to fit A4 single page
      const root = printWindow.document.querySelector('.print-invoice-root') as HTMLElement;
      if (root) {
        const A4_HEIGHT_PX = 1122; // 297mm at 96 DPI
        const naturalHeight = root.scrollHeight;
        if (naturalHeight > A4_HEIGHT_PX) {
          const scale = A4_HEIGHT_PX / naturalHeight;
          root.style.transform = `scale(${scale})`;
          root.style.transformOrigin = 'top left';
          root.style.width = `${100 / scale}%`;
          root.style.maxWidth = 'none';
          // Also override maxWidth on the inner template div
          const inner = root.querySelector(':scope > div') as HTMLElement;
          if (inner) inner.style.maxWidth = 'none';
        }
      }
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
}
