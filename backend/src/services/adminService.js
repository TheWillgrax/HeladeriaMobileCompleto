import { query } from "../config/db.js";

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

const AVAILABLE_RANGE_OPTIONS = [3, 6, 12, 24];
const DEFAULT_RANGE_MONTHS = 6;
const MAX_RANGE_MONTHS = 60;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const parseRangeMonths = (value) => {
  if (value == null) return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_RANGE_MONTHS) return null;
  return parsed;
};

const isValidYear = (year) => Number.isInteger(year) && year >= 2000 && year <= 2100;
const isValidMonth = (month) => Number.isInteger(month) && month >= 1 && month <= 12;

const normaliseFilters = (filters = {}) => {
  const applied = {
    year: isValidYear(filters.year) ? filters.year : null,
    month: isValidMonth(filters.month) ? filters.month : null,
    rangeMonths: null,
    fromDate: null,
    toDate: null,
  };

  let fromDate = filters.from ? new Date(filters.from) : null;
  let toDate = filters.to ? new Date(filters.to) : null;

  if (applied.year) {
    if (!applied.month) {
      applied.month = null;
    }
    fromDate = new Date(applied.year, applied.month ? applied.month - 1 : 0, 1);
    toDate = applied.month
      ? new Date(applied.year, applied.month, 0)
      : new Date(applied.year, 11, 31);
  } else {
    const rangeCandidate = parseRangeMonths(filters.range);

    if (!fromDate && !toDate) {
      const months = rangeCandidate || DEFAULT_RANGE_MONTHS;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setMonth(start.getMonth() - (months - 1));
      fromDate = start;
      toDate = now;
      applied.rangeMonths = months;
    } else {
      applied.rangeMonths = rangeCandidate;
    }
  }

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    fromDate = null;
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    toDate = null;
  }

  if (fromDate && toDate && fromDate > toDate) {
    const temp = fromDate;
    fromDate = toDate;
    toDate = temp;
  }

  applied.fromDate = formatDate(fromDate);
  applied.toDate = formatDate(toDate);

  if (!applied.year && applied.rangeMonths == null && applied.fromDate && applied.toDate) {
    const start = new Date(applied.fromDate);
    const end = new Date(applied.toDate);
    const monthsDiff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    applied.rangeMonths = monthsDiff > 0 ? Math.min(monthsDiff, MAX_RANGE_MONTHS) : null;
  }

  if (applied.year == null) {
    applied.month = null;
  }

  return applied;
};

const buildOrderFilters = (applied, { alias = "o", excludeCancelled = false } = {}) => {
  const prefix = alias ? `${alias}.` : "";
  const conditions = [];
  const params = {};

  if (applied.fromDate) {
    conditions.push(`DATE(${prefix}created_at) >= :fromDate`);
    params.fromDate = applied.fromDate;
  }

  if (applied.toDate) {
    conditions.push(`DATE(${prefix}created_at) <= :toDate`);
    params.toDate = applied.toDate;
  }

  if (excludeCancelled) {
    conditions.push(`${prefix}status <> 'cancelled'`);
  }

  const clause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, params };
};

const formatMonthLabel = (value) => {
  if (!value) return value;
  const [year, month] = String(value).split("-");
  const monthIndex = Number.parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] || month;
  return `${monthName} ${year}`;
};

export const getDashboardMetrics = async (filters = {}) => {
  const appliedFilters = normaliseFilters(filters);

  const { clause: orderFilters, params: orderParams } = buildOrderFilters(appliedFilters, { alias: "o" });
  const { clause: nonCancelledFilters, params: nonCancelledParams } = buildOrderFilters(
    appliedFilters,
    { alias: "o", excludeCancelled: true }
  );

  const [ordersSummary] = await query(
    `SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
        SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) AS paidOrders,
        SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        SUM(CASE WHEN o.status <> 'cancelled' THEN o.total ELSE 0 END) AS totalRevenue
      FROM orders o
      ${orderFilters}`,
    orderParams
  );

  const [uniqueCustomersRow] = await query(
    `SELECT COUNT(DISTINCT CASE WHEN o.user_id IS NOT NULL THEN o.user_id END) AS uniqueCustomers
      FROM orders o
      ${orderFilters}`,
    orderParams
  );

  const [inventorySummary] = await query(
    `SELECT
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS activeProducts,
        SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS lowStockProducts
      FROM products`
  );

  const salesByMonthRows = await query(
    `SELECT
        DATE_FORMAT(o.created_at, '%Y-%m') AS month,
        COUNT(*) AS orders,
        SUM(o.total) AS revenue
      FROM orders o
      ${nonCancelledFilters}
      GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
      ORDER BY month ASC`,
    nonCancelledParams
  );

  const topProductsRows = await query(
    `SELECT
        p.id,
        p.name,
        SUM(oi.quantity) AS unitsSold,
        SUM(oi.quantity * oi.unit_price) AS revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      ${nonCancelledFilters}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 5`,
    nonCancelledParams
  );

  const yearRows = await query(
    `SELECT DISTINCT YEAR(created_at) AS year
      FROM orders
      WHERE YEAR(created_at) IS NOT NULL
      ORDER BY year DESC`
  );

  let availableMonths = [];
  if (appliedFilters.year) {
    const monthRows = await query(
      `SELECT DISTINCT MONTH(created_at) AS month
        FROM orders
        WHERE YEAR(created_at) = :year
        ORDER BY month ASC`,
      { year: appliedFilters.year }
    );
    availableMonths = monthRows
      .map((row) => Number(row.month))
      .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12);
  }

  const totalOrders = Number(ordersSummary?.totalOrders || 0);
  const pendingOrders = Number(ordersSummary?.pendingOrders || 0);
  const paidOrders = Number(ordersSummary?.paidOrders || 0);
  const cancelledOrders = Number(ordersSummary?.cancelledOrders || 0);
  const totalRevenue = toNumber(ordersSummary?.totalRevenue || 0);
  const completedOrders = Math.max(totalOrders - cancelledOrders, 0);
  const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
  const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;
  const uniqueCustomers = Number(uniqueCustomersRow?.uniqueCustomers || 0);

  return {
    summary: {
      totalOrders,
      pendingOrders,
      paidOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue,
      conversionRate,
      uniqueCustomers,
    },
    inventory: {
      totalProducts: Number(inventorySummary?.totalProducts || 0),
      activeProducts: Number(inventorySummary?.activeProducts || 0),
      lowStockProducts: Number(inventorySummary?.lowStockProducts || 0),
    },
    salesByMonth: salesByMonthRows.map((row) => ({
      month: row.month,
      monthLabel: formatMonthLabel(row.month),
      orders: Number(row.orders || 0),
      revenue: toNumber(row.revenue || 0),
    })),
    topProducts: topProductsRows.map((row) => ({
      id: row.id,
      name: row.name,
      unitsSold: Number(row.unitsSold || 0),
      revenue: toNumber(row.revenue || 0),
    })),
    filters: {
      applied: {
        year: appliedFilters.year,
        month: appliedFilters.month,
        rangeMonths: appliedFilters.rangeMonths,
        fromDate: appliedFilters.fromDate,
        toDate: appliedFilters.toDate,
      },
      availableYears: yearRows
        .map((row) => Number(row.year))
        .filter((year) => Number.isFinite(year)),
      availableMonths,
      availableRanges: AVAILABLE_RANGE_OPTIONS,
    },
  };
};

