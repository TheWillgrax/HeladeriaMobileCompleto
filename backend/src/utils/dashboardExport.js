
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const formatNumber = (value) => {
  const number = Number(value) || 0;
  try {
    return new Intl.NumberFormat("es-GT").format(number);
  } catch (_error) {
    return String(number);
  }
};

const formatCurrency = (value) => {
  const number = Number(value) || 0;
  try {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
      minimumFractionDigits: 2,
    }).format(number);
  } catch (_error) {
    return `Q${number.toFixed(2)}`;
  }
};

const formatPercentage = (value) => {
  const number = Number(value) || 0;
  return `${number.toFixed(1)}%`;
};

const describeFilters = (filters) => {
  const applied = filters?.applied || {};
  if (applied.year && applied.month) {
    const monthName = MONTH_NAMES[applied.month - 1] || applied.month;
    return `${monthName} ${applied.year}`;
  }
  if (applied.year) {
    return `Año ${applied.year}`;
  }
  if (applied.rangeMonths) {
    return `Últimos ${applied.rangeMonths} meses`;
  }
  if (applied.fromDate && applied.toDate) {
    return `Del ${applied.fromDate} al ${applied.toDate}`;
  }
  if (applied.fromDate) {
    return `Desde ${applied.fromDate}`;
  }
  if (applied.toDate) {
    return `Hasta ${applied.toDate}`;
  }
  return "Rango predeterminado";
};

const buildSummaryItems = (metrics) => {
  const summary = metrics?.summary || {};
  const inventory = metrics?.inventory || {};
  return [
    { label: "Ventas totales", value: formatCurrency(summary.totalRevenue) },
    { label: "Ticket promedio", value: formatCurrency(summary.averageOrderValue) },
    { label: "Pedidos totales", value: formatNumber(summary.totalOrders) },
    { label: "Pedidos pagados", value: formatNumber(summary.paidOrders) },
    { label: "Pedidos pendientes", value: formatNumber(summary.pendingOrders) },
    { label: "Pedidos cancelados", value: formatNumber(summary.cancelledOrders) },
    { label: "Tasa de pago", value: formatPercentage(summary.conversionRate) },
    { label: "Clientes únicos", value: formatNumber(summary.uniqueCustomers) },
    {
      label: "Productos activos",
      value: `${formatNumber(inventory.activeProducts)} / ${formatNumber(inventory.totalProducts)}`,
    },
    { label: "Productos con stock crítico", value: formatNumber(inventory.lowStockProducts) },
  ];
};

const escapePdfText = (text) =>
  String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, "\\n");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const generateDashboardPdf = async (metrics) => {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;

  const generatedAt = new Date();
  const filtersDescription = describeFilters(metrics?.filters);

  const lines = [];
  const addLine = (text, options = {}) => {
    lines.push({
      text,
      size: options.size ?? 12,
      bold: Boolean(options.bold),
      lineHeight: options.lineHeight ?? (options.size ?? 12) + 4,
    });
  };
  const addSpacer = (height = 8) => {
    lines.push({ text: "", size: 0, bold: false, lineHeight: height });
  };

  addLine("Reporte del dashboard", { size: 20, bold: true, lineHeight: 28 });
  addLine(`Generado: ${generatedAt.toLocaleString("es-GT")}`);
  addLine(`Filtros aplicados: ${filtersDescription}`);
  addSpacer();

  addLine("Métricas generales", { bold: true, size: 14, lineHeight: 22 });
  buildSummaryItems(metrics).forEach((item) => {
    addLine(`${item.label}: ${item.value}`);
  });

  addSpacer();
  addLine("Ventas por mes", { bold: true, size: 14, lineHeight: 22 });
  if (metrics?.salesByMonth?.length) {
    metrics.salesByMonth.forEach((row) => {
      const monthLabel = row.monthLabel || row.month;
      addLine(`${monthLabel}: ${formatNumber(row.orders)} pedidos • ${formatCurrency(row.revenue)}`);
    });
  } else {
    addLine("No hay datos disponibles para el rango seleccionado.");
  }

  addSpacer();
  addLine("Top productos", { bold: true, size: 14, lineHeight: 22 });
  if (metrics?.topProducts?.length) {
    metrics.topProducts.forEach((product, index) => {
      addLine(
        `${index + 1}. ${product.name} — ${formatNumber(product.unitsSold)} vendidos • ${formatCurrency(
          product.revenue
        )}`
      );
    });
  } else {
    addLine("Todavía no hay productos con ventas registradas.");
  }

  const pages = [];
  let currentPage = [];
  let cursorY = pageHeight - margin;
  pages.push(currentPage);

  lines.forEach((line) => {
    const size = line.size || 12;
    const lineHeight = line.lineHeight || size + 4;

    if (cursorY - lineHeight < margin) {
      currentPage = [];
      pages.push(currentPage);
      cursorY = pageHeight - margin;
    }

    if (line.text) {
      currentPage.push({
        text: line.text,
        size,
        bold: line.bold,
        y: cursorY,
      });
    }

    cursorY -= lineHeight;
  });

  const contentStreams = pages.map((pageLines) => {
    const instructions = ["BT"];
    let currentFont = null;
    let currentSize = null;

    pageLines.forEach((line) => {
      const fontKey = line.bold ? "F2" : "F1";
      if (currentFont !== fontKey || currentSize !== line.size) {
        instructions.push(`/${fontKey} ${line.size} Tf`);
        currentFont = fontKey;
        currentSize = line.size;
      }
      instructions.push(`1 0 0 1 ${margin.toFixed(2)} ${line.y.toFixed(2)} Tm`);
      instructions.push(`(${escapePdfText(line.text)}) Tj`);
    });

    instructions.push("ET");
    return instructions.join("\n");
  });

  const pagesCount = pages.length;
  const catalogId = 1;
  const pagesId = 2;
  const pageIds = Array.from({ length: pagesCount }, (_, index) => 3 + index);
  const contentIds = Array.from({ length: pagesCount }, (_, index) => 3 + pagesCount + index);
  const fontRegularId = 3 + pagesCount * 2;
  const fontBoldId = fontRegularId + 1;
  const totalObjects = fontBoldId;

  let pdf = "%PDF-1.4\n";
  const offsets = new Array(totalObjects + 1).fill(0);

  const writeObject = (id, content) => {
    offsets[id] = Buffer.byteLength(pdf, "utf8");
    pdf += `${id} 0 obj\n${content}\nendobj\n`;
  };

  writeObject(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  writeObject(pagesId, `<< /Type /Pages /Kids [${kids}] /Count ${pagesCount} >>`);

  pageIds.forEach((pageId, index) => {
    const contentId = contentIds[index];
    writeObject(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(
        2
      )}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`
    );
  });

  contentIds.forEach((contentId, index) => {
    const stream = contentStreams[index] || "BT\nET";
    const length = Buffer.byteLength(stream, "utf8");
    writeObject(contentId, `<< /Length ${length} >>\nstream\n${stream}\nendstream`);
  });

  writeObject(fontRegularId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  writeObject(fontBoldId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += "xref\n";
  pdf += `0 ${totalObjects + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= totalObjects; i += 1) {
    const offset = offsets[i] ?? 0;
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjects + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

export const generateDashboardExcel = (metrics) => {
  const filtersDescription = describeFilters(metrics?.filters);
  const generatedAt = new Date().toLocaleString("es-GT");

  const summaryRows = buildSummaryItems(metrics).map((item) => [item.label, item.value]);
  const monthlyRows = metrics?.salesByMonth?.length
    ? metrics.salesByMonth.map((row) => [
        row.monthLabel || row.month,
        formatNumber(row.orders),
        formatCurrency(row.revenue),
      ])
    : [["Sin datos para el rango seleccionado", "", ""]];
  const productRows = metrics?.topProducts?.length
    ? metrics.topProducts.map((product, index) => [
        index + 1,
        product.name,
        formatNumber(product.unitsSold),
        formatCurrency(product.revenue),
      ])
    : [["No hay productos con ventas registradas", "", "", ""]];

  const buildTable = (headers, rows) => {
    const thead = headers
      ? `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`
      : "";
    const tbody = rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
      .join("");
    return `<table border="1" cellspacing="0" cellpadding="4">${thead}<tbody>${tbody}</tbody></table>`;
  };

  const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Reporte del dashboard</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; }
      table { margin-bottom: 24px; border-collapse: collapse; }
      th { background-color: #f0f0f0; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>Reporte del dashboard</h1>
    <p><strong>Generado:</strong> ${escapeHtml(generatedAt)}</p>
    <p><strong>Filtros:</strong> ${escapeHtml(filtersDescription)}</p>
    <h2>Métricas generales</h2>
    ${buildTable(["Métrica", "Valor"], summaryRows)}
    <h2>Ventas por mes</h2>
    ${buildTable(["Mes", "Pedidos", "Ingresos"], monthlyRows)}
    <h2>Top productos</h2>
    ${buildTable(["Posición", "Producto", "Unidades vendidas", "Ingresos"], productRows)}
  </body>
</html>`;

  return Buffer.from(html, "utf8");
};

