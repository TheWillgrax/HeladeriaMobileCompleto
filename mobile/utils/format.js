export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatCurrency = (value) => {
  const amount = toNumber(value);
  if (typeof Intl === "object" && typeof Intl.NumberFormat === "function") {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  const formatted = amount.toFixed(2);
  return `Q${formatted}`;
};

export const normaliseStatus = (value) => {
  if (value == null) {
    return "";
  }
  return String(value).trim().toLowerCase();
};
