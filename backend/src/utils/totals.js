export const calculateTotals = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    return sum + quantity * unitPrice;
  }, 0);

  return { subtotal, total: subtotal };
};
