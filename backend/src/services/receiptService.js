const escapePdfText = (text = "") => text.replace(/[\\()]/g, "\\$&");

const currencyFormatter = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
});

const buildLines = ({ user, items, totals, issuedAt }) => {
  const formatter = new Intl.DateTimeFormat("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const dateLine = `Fecha: ${formatter.format(issuedAt)}`;
  const lines = [
    dateLine,
    `Cliente: ${user?.name || "Invitado"}`,
  ];

  if (user?.email) {
    lines.push(`Correo: ${user.email}`);
  }

  lines.push("", "Detalle del pedido:");

  items.forEach((item) => {
    const total = Number(item.quantity || 0) * Number(item.unitPrice ?? item.unit_price ?? 0);
    lines.push(`${item.quantity}x ${item.name} - ${currencyFormatter.format(total)}`);
  });

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  lines.push(
    "",
    `Artículos totales: ${totalItems}`,
    `Subtotal: ${currencyFormatter.format(totals.subtotal)}`,
    `Total: ${currencyFormatter.format(totals.total)}`,
    "",
    "¡Gracias por tu compra!"
  );

  return lines;
};

const createContentStream = ({ title, lines }) => {
  const commands = [
    "BT",
    "/F1 20 Tf",
    "72 760 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 12 Tf",
    "0 -28 Td",
    "16 TL",
  ];

  if (lines.length) {
    commands.push(`(${escapePdfText(lines[0])}) Tj`);
    for (let i = 1; i < lines.length; i += 1) {
      commands.push("T*");
      if (lines[i]) {
        commands.push(`(${escapePdfText(lines[i])}) Tj`);
      }
    }
  }

  commands.push("ET");
  return commands.join("\n");
};

export const generateOrderReceipt = async ({ orderId, user, items, totals, issuedAt }) => {
  const buffers = [];
  let offset = 0;

  const push = (content) => {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    buffers.push(buffer);
    offset += buffer.length;
  };

  const objectOffsets = [];

  const addObject = (body) => {
    const index = objectOffsets.length + 1;
    const objectString = `${index} 0 obj\n${body}\nendobj\n`;
    objectOffsets.push(offset);
    push(objectString);
    return index;
  };

  const addStreamObject = (streamContent) => {
    const length = Buffer.byteLength(streamContent, "utf8");
    const index = objectOffsets.length + 1;
    const objectString = `${index} 0 obj\n<< /Length ${length} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
    objectOffsets.push(offset);
    push(objectString);
    return index;
  };

  push("%PDF-1.4\n");

  const contentStream = createContentStream({
    title: `Comprobante de pedido #${orderId}`,
    lines: buildLines({ user, items, totals, issuedAt }),
  });

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");
  addStreamObject(contentStream);
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const xrefOffset = offset;
  let xref = `xref\n0 ${objectOffsets.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  objectOffsets.forEach((value) => {
    xref += `${value.toString().padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objectOffsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  push(xref);

  return Buffer.concat(buffers);
};
