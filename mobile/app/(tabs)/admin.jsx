import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Dimensions,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
// eslint-disable-next-line import/no-unresolved
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi, catalogApi, adminApi } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCurrency, normaliseStatus, toNumber } from "@/utils/format";

const PRODUCT_FORM_INITIAL = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  stock: "0",
  categoryId: null,
  active: true,
  imageUpload: null,
};

const USER_FORM_INITIAL = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "customer",
};

const USER_ROLES = [
  { key: "customer", label: "Cliente" },
  { key: "admin", label: "Administrador" },
];

const TABS = [
  { key: "dashboard", label: "Resumen" },
  { key: "products", label: "Productos" },
  { key: "users", label: "Usuarios" },
  { key: "settings", label: "Configuración" },
];

const DEFAULT_RANGE = "6";

const RANGE_OPTIONS = [
  { key: "3", label: "3 meses" },
  { key: "6", label: "6 meses" },
  { key: "12", label: "12 meses" },
  { key: "24", label: "24 meses" },
];

const MONTHS = [
  { value: 1, label: "Ene" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Abr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Ago" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dic" },
];

const ORDER_STATUS_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "paid", label: "Pagados" },
  { key: "cancelled", label: "Cancelados" },
];

const CHART_HEIGHT = 220;

const getStatusLabel = (status) => {
  const normalised = normaliseStatus(status);
  return ORDER_STATUS_FILTERS.find((item) => item.key === normalised)?.label || status;
};

const formatPercentage = (value) => {
  const number = Number(value || 0);
  return `${number.toFixed(1)}%`;
};

const formatDateTime = (value) => {
  if (!value) return "Fecha desconocida";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha desconocida";
  return date.toLocaleString("es-GT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const hexToRgba = (hex, alpha = 1) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return `rgba(0,0,0,${alpha})`;
  if (normalized.length === 3) {
    const r = (bigint >> 8) & 0xf;
    const g = (bigint >> 4) & 0xf;
    const b = bigint & 0xf;
    return `rgba(${(r << 4) | r}, ${(g << 4) | g}, ${(b << 4) | b}, ${alpha})`;
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatMonthLabel = (value) => {
  if (!value || typeof value !== "string") return value;
  const [year, month] = value.split("-");
  const monthNumber = Number(month) || 0;
  const label = MONTHS[monthNumber - 1]?.label || month;
  return `${label} ${year}`;
};

export default function AdminScreen() {
  const { user, token } = useAuth();
  const { colors, theme, setTheme, toggleTheme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productForm, setProductForm] = useState(PRODUCT_FORM_INITIAL);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productImageMode, setProductImageMode] = useState("url");
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [userFormVisible, setUserFormVisible] = useState(false);
  const [userForm, setUserForm] = useState(USER_FORM_INITIAL);
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [selectedRange, setSelectedRange] = useState(DEFAULT_RANGE);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chartWidth = useMemo(() => Math.max(Dimensions.get("window").width - 48, 320), []);

  const isAdmin = user?.role === "admin";

  const buildDashboardParams = useCallback(({ range, year, month }) => {
    const params = {};
    if (year) {
      params.year = year;
      if (month) {
        params.month = month;
      }
    } else if (range) {
      params.range = range;
    }
    return params;
  }, []);

  const syncDashboardFilters = useCallback((filtersData) => {
    if (!filtersData) return;
    const applied = filtersData.applied || {};
    setSelectedYear(applied.year ?? null);
    setSelectedMonth(applied.month ?? null);
    if (applied.rangeMonths != null) {
      setSelectedRange(String(applied.rangeMonths));
    } else if (applied.year != null) {
      setSelectedRange(null);
    } else {
      setSelectedRange((prev) => prev ?? DEFAULT_RANGE);
    }
  }, []);

  const applyDashboardFilters = useCallback(
    async (nextFilters) => {
      if (!token) return;
      setDashboardError(null);
      setDashboardLoading(true);
      try {
        const params = buildDashboardParams(nextFilters);
        const response = await adminApi.dashboard(token, params);
        setDashboard(response);
        syncDashboardFilters(response.filters);
      } catch (err) {
        setDashboardError(err.message || "No pudimos actualizar las métricas");
      } finally {
        setDashboardLoading(false);
      }
    },
    [token, buildDashboardParams, syncDashboardFilters]
  );

  const handleRangeChange = useCallback(
    async (rangeValue) => {
      if (!rangeValue) return;
      if (rangeValue === selectedRange && !selectedYear) return;
      setSelectedRange(rangeValue);
      setSelectedYear(null);
      setSelectedMonth(null);
      await applyDashboardFilters({ range: rangeValue });
    },
    [applyDashboardFilters, selectedRange, selectedYear]
  );

  const handleYearChange = useCallback(
    async (yearValue) => {
      const nextYear = yearValue === selectedYear ? null : yearValue;
      setSelectedYear(nextYear);
      setSelectedMonth(null);
      if (nextYear) {
        setSelectedRange(null);
        await applyDashboardFilters({ year: nextYear });
      } else {
        setSelectedRange(DEFAULT_RANGE);
        await applyDashboardFilters({ range: DEFAULT_RANGE });
      }
    },
    [applyDashboardFilters, selectedYear]
  );

  const handleMonthChange = useCallback(
    async (monthValue) => {
      if (!selectedYear) return;
      const nextMonth = monthValue === selectedMonth ? null : monthValue;
      setSelectedMonth(nextMonth);
      await applyDashboardFilters({ year: selectedYear, month: nextMonth ?? undefined });
    },
    [applyDashboardFilters, selectedMonth, selectedYear]
  );

  const yearOptions = useMemo(() => dashboard?.filters?.availableYears || [], [dashboard]);
  const rangeOptions = useMemo(() => {
    const allowedRanges = dashboard?.filters?.availableRanges;
    if (!allowedRanges || !allowedRanges.length) return RANGE_OPTIONS;
    const allowedSet = new Set(allowedRanges.map((value) => String(value)));
    const filtered = RANGE_OPTIONS.filter((option) => allowedSet.has(option.key));
    return filtered.length ? filtered : RANGE_OPTIONS;
  }, [dashboard]);

  const monthOptions = useMemo(() => {
    const allowedMonths = dashboard?.filters?.availableMonths;
    if (!allowedMonths || !allowedMonths.length) return MONTHS;
    const monthSet = new Set(allowedMonths);
    const filtered = MONTHS.filter((month) => monthSet.has(month.value));
    return filtered.length ? filtered : MONTHS;
  }, [dashboard]);

  const orderStatusSummary = useMemo(() => {
    if (!dashboard) return [];
    const summary = dashboard.summary || {};
    return [
      { key: "pending", label: "Pendientes", value: Number(summary.pendingOrders || 0), color: colors.accent },
      { key: "paid", label: "Pagados", value: Number(summary.paidOrders || 0), color: colors.success },
      { key: "cancelled", label: "Cancelados", value: Number(summary.cancelledOrders || 0), color: colors.error },
    ];
  }, [dashboard, colors.accent, colors.error, colors.success]);

  const monthlyTrend = useMemo(() => {
    if (!dashboard?.salesByMonth?.length) return null;
    const labels = dashboard.salesByMonth.map((row) => formatMonthLabel(row.month));
    const revenueValues = dashboard.salesByMonth.map((row) => Number(row.revenue || 0));
    const orderValues = dashboard.salesByMonth.map((row) => Number(row.orders || 0));
    return { labels, revenueValues, orderValues };
  }, [dashboard]);

  const lineChartData = useMemo(() => {
    if (!monthlyTrend) return null;
    return {
      labels: monthlyTrend.labels,
      datasets: [
        {
          data: monthlyTrend.revenueValues,
          color: (opacity = 1) => hexToRgba(colors.primary, opacity),
          strokeWidth: 2,
        },
      ],
    };
  }, [monthlyTrend, colors.primary]);

  const barChartData = useMemo(() => {
    if (!monthlyTrend) return null;
    return {
      labels: monthlyTrend.labels,
      datasets: [
        {
          data: monthlyTrend.orderValues,
        },
      ],
    };
  }, [monthlyTrend]);

  const pieChartData = useMemo(() => {
    if (!orderStatusSummary.length) return [];
    return orderStatusSummary
      .filter((status) => status.value > 0)
      .map((status) => ({
        name: status.label,
        population: status.value,
        color: status.color,
        legendFontColor: colors.text,
        legendFontSize: 12,
      }));
  }, [colors.text, orderStatusSummary]);

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.card,
      backgroundGradientTo: colors.card,
      decimalPlaces: 0,
      color: (opacity = 1) => hexToRgba(colors.primary, opacity),
      labelColor: (opacity = 1) => hexToRgba(colors.text, opacity),
      propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: colors.accent,
      },
      propsForBackgroundLines: {
        stroke: hexToRgba(colors.border, 0.4),
      },
      fillShadowGradientFrom: hexToRgba(colors.primary, 0.35),
      fillShadowGradientTo: hexToRgba(colors.primary, 0.05),
      fillShadowGradientOpacity: 1,
    }),
    [colors]
  );

  const chartContentWidth = useMemo(() => {
    if (!monthlyTrend) return chartWidth;
    return Math.max(chartWidth, monthlyTrend.labels.length * 60);
  }, [chartWidth, monthlyTrend]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === "all") return orders;
    return orders.filter((order) => normaliseStatus(order.status) === orderStatusFilter);
  }, [orderStatusFilter, orders]);

  useEffect(() => {
    const load = async () => {
      if (!token || !isAdmin) return;
      setLoading(true);
      setError(null);
      setDashboardError(null);
      setDashboardLoading(true);
      try {
        const dashboardParams = buildDashboardParams({ range: DEFAULT_RANGE });
        const [ordersResponse, productsResponse, categoriesResponse, dashboardResponse, usersResponse] =
          await Promise.all([
            orderApi.allOrders(token),
            catalogApi.products({ includeInactive: true }),
            catalogApi.categories(),
            adminApi.dashboard(token, dashboardParams),
            adminApi.users(token),
          ]);
        setOrders(ordersResponse.orders || []);
        setProducts(productsResponse.products || []);
        setCategories(categoriesResponse.categories || []);
        setDashboard(dashboardResponse);
        syncDashboardFilters(dashboardResponse?.filters);
        setUsersList(usersResponse.users || []);
        setProductForm((prev) => ({
          ...prev,
          categoryId: categoriesResponse.categories?.[0]
            ? String(categoriesResponse.categories[0].id)
            : prev.categoryId,
        }));
      } catch (err) {
        setError(err.message || "No pudimos obtener la información administrativa");
        setDashboardError(err.message || "No pudimos obtener las métricas");
      } finally {
        setLoading(false);
        setDashboardLoading(false);
      }
    };

    load();
  }, [token, isAdmin, buildDashboardParams, syncDashboardFilters]);

  const refreshProducts = async () => {
    const response = await catalogApi.products({ includeInactive: true });
    setProducts(response.products || []);
  };

  const refreshDashboard = useCallback(async () => {
    const params = {
      range: selectedYear ? null : selectedRange || DEFAULT_RANGE,
      year: selectedYear,
      month: selectedMonth ?? undefined,
    };
    await applyDashboardFilters(params);
  }, [applyDashboardFilters, selectedMonth, selectedRange, selectedYear]);

  const refreshUsers = async () => {
    const response = await adminApi.users(token);
    setUsersList(response.users || []);
  };

  const openCreateUserForm = () => {
    setUserForm(USER_FORM_INITIAL);
    setEditingUser(null);
    setUserFormVisible(true);
  };

  const closeUserForm = () => {
    setUserFormVisible(false);
    setUserForm(USER_FORM_INITIAL);
    setEditingUser(null);
  };

  const openEditUser = (userToEdit) => {
    setUserForm({
      name: userToEdit.name || "",
      email: userToEdit.email || "",
      phone: userToEdit.phone || "",
      password: "",
      role: userToEdit.role || "customer",
    });
    setEditingUser(userToEdit);
    setUserFormVisible(true);
  };

  const handleUserFormChange = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitUser = async () => {
    const name = userForm.name.trim();
    const email = userForm.email.trim();
    const phone = userForm.phone.trim();

    if (!name) {
      Alert.alert("Falta información", "El nombre del usuario es obligatorio");
      return;
    }

    if (!email) {
      Alert.alert("Falta información", "El correo electrónico es obligatorio");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Correo inválido", "Ingresa un correo electrónico válido");
      return;
    }

    if (!editingUser && (!userForm.password || userForm.password.length < 6)) {
      Alert.alert("Contraseña inválida", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (editingUser && userForm.password && userForm.password.length < 6) {
      Alert.alert("Contraseña inválida", "La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    const payload = {
      name,
      email: email.toLowerCase(),
      role: userForm.role,
      phone: phone ? phone : null,
    };

    if (!editingUser) {
      payload.password = userForm.password;
    } else if (userForm.password) {
      payload.password = userForm.password;
    }

    try {
      setSavingUser(true);
      if (editingUser) {
        await adminApi.updateUser(token, editingUser.id, payload);
        Alert.alert("Usuario actualizado", "Los cambios se guardaron correctamente");
      } else {
        await adminApi.createUser(token, payload);
        Alert.alert("Usuario creado", "El usuario se creó correctamente");
      }
      await refreshUsers();
      closeUserForm();
    } catch (err) {
      Alert.alert(
        editingUser ? "Error actualizando usuario" : "Error creando usuario",
        err.message || "Intenta nuevamente"
      );
    } finally {
      setSavingUser(false);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      setUpdating(true);
      const updated = await orderApi.updateStatus(token, orderId, status);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: updated.status } : order))
      );
      await refreshDashboard();
      return updated;
    } catch (err) {
      Alert.alert("Error actualizando el estado", err.message || "Intenta nuevamente");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleProduct = async (product) => {
    try {
      setUpdating(true);
      const isActive = Number(product.active) === 1;
      await catalogApi.updateProduct(token, product.id, {
        name: product.name,
        description: product.description,
        price: toNumber(product.price),
        imageUrl: product.image_url,
        stock: toNumber(product.stock),
        categoryId: Number(product.category_id),
        active: isActive ? 0 : 1,
      });
      await Promise.all([refreshProducts(), refreshDashboard()]);
    } catch (err) {
      Alert.alert("Error actualizando el producto", err.message || "Intenta de nuevo");
    } finally {
      setUpdating(false);
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      ...PRODUCT_FORM_INITIAL,
      categoryId: categories[0] ? String(categories[0].id) : null,
    });
    setProductImageMode("url");
    setProductFormVisible(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price != null ? String(product.price) : "",
      imageUrl: product.image_url || "",
      stock: product.stock != null ? String(product.stock) : "0",
      categoryId: product.category_id != null ? String(product.category_id) : null,
      active: Number(product.active) === 1,
      imageUpload: null,
    });
    setProductImageMode("url");
    setProductFormVisible(true);
  };

  const closeProductForm = () => {
    setProductFormVisible(false);
    setEditingProduct(null);
    setProductForm({
      ...PRODUCT_FORM_INITIAL,
      categoryId: categories[0] ? String(categories[0].id) : null,
    });
    setProductImageMode("url");
  };

  const handleProductFormChange = (field, value) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePickProductImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para seleccionar imágenes");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("No se pudo obtener la imagen", "Intenta nuevamente con otro archivo");
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      const filename = asset.fileName || `producto-${Date.now()}.jpg`;
      setProductForm((prev) => ({
        ...prev,
        imageUpload: {
          base64: asset.base64,
          mimeType,
          filename,
          previewUri: asset.uri,
        },
        imageUrl: "",
      }));
      setProductImageMode("upload");
    } catch (_error) {
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const handleRemoveProductImage = () => {
    setProductForm((prev) => ({ ...prev, imageUpload: null }));
  };

  const handleSubmitProduct = async () => {
    if (!productForm.name.trim()) {
      Alert.alert("Falta información", "El nombre del producto es obligatorio");
      return;
    }

    if (!productForm.price || Number.isNaN(Number(productForm.price))) {
      Alert.alert("Precio inválido", "Ingresa un precio válido");
      return;
    }

    if (!productForm.categoryId) {
      Alert.alert("Selecciona categoría", "Elige una categoría para el producto");
      return;
    }

    if (productImageMode === "upload" && !productForm.imageUpload) {
      Alert.alert("Falta imagen", "Selecciona una imagen para subir");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      imageUrl: productImageMode === "url" ? productForm.imageUrl.trim() : "",
      stock: Number(productForm.stock || 0),
      categoryId: Number(productForm.categoryId),
      active: productForm.active ? 1 : 0,
    };

    if (productImageMode === "upload" && productForm.imageUpload) {
      payload.imageUpload = {
        filename: productForm.imageUpload.filename,
        mimeType: productForm.imageUpload.mimeType,
        base64: productForm.imageUpload.base64,
      };
    }

    try {
      setSavingProduct(true);
      if (editingProduct) {
        await catalogApi.updateProduct(token, editingProduct.id, payload);
      } else {
        await catalogApi.createProduct(token, payload);
      }
      await Promise.all([refreshProducts(), refreshDashboard()]);
      closeProductForm();
    } catch (err) {
      Alert.alert("Error guardando producto", err.message || "Intenta nuevamente");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert("Eliminar producto", `¿Seguro que deseas eliminar ${product.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingProductId(product.id);
            await catalogApi.deleteProduct(token, product.id);
            await Promise.all([refreshProducts(), refreshDashboard()]);
          } catch (err) {
            Alert.alert("Error eliminando", err.message || "No se pudo eliminar");
          } finally {
            setDeletingProductId(null);
          }
        },
      },
    ]);
  };

  const formattedSummary = useMemo(() => {
    if (!dashboard) return [];
    const summary = dashboard.summary || {};
    const inventory = dashboard.inventory || {};
    const metrics = [
      { label: "Ventas totales", value: formatCurrency(summary.totalRevenue) },
      { label: "Ticket promedio", value: formatCurrency(summary.averageOrderValue) },
      { label: "Pedidos totales", value: String(summary.totalOrders || 0) },
      { label: "Tasa de pago", value: formatPercentage(summary.conversionRate) },
      { label: "Clientes únicos", value: String(summary.uniqueCustomers || 0) },
      {
        label: "Productos activos",
        value: `${inventory.activeProducts ?? 0}/${inventory.totalProducts ?? 0}`,
      },
      { label: "Stock crítico", value: String(inventory.lowStockProducts || 0) },
    ];
    return metrics;
  }, [dashboard]);

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Zona administrativa</Text>
        <Text style={styles.subtitle}>Solo los usuarios con rol administrador pueden acceder aquí.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Panel de administración</Text>
      <Text style={styles.subtitle}>Gestiona pedidos, inventario, usuarios y métricas clave.</Text>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {activeTab === "dashboard" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumen ejecutivo</Text>
            {dashboardLoading && <ActivityIndicator color={colors.primary} />}
          </View>
          <Text style={styles.sectionDescription}>
            Analiza el rendimiento de ventas, pedidos y clientes aplicando los filtros que necesites.
          </Text>

          <View style={styles.filtersCard}>
            <Text style={styles.filterHeading}>Filtros</Text>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Rango</Text>
              <View style={styles.filterChipRow}>
                {rangeOptions.map((option) => {
                  const active = !selectedYear && selectedRange === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => handleRangeChange(option.key)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Año</Text>
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !selectedYear && styles.filterChipActive]}
                  onPress={() => {
                    if (selectedYear) {
                      handleYearChange(selectedYear);
                    }
                  }}
                >
                  <Text
                    style={[styles.filterChipText, !selectedYear && styles.filterChipTextActive]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {yearOptions.map((year) => {
                  const active = selectedYear === year;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => handleYearChange(year)}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedYear && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Mes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChipRowHorizontal}>
                    {monthOptions.map((month) => {
                      const active = selectedMonth === month.value;
                      return (
                        <TouchableOpacity
                          key={month.value}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => handleMonthChange(month.value)}
                        >
                          <Text
                            style={[styles.filterChipText, active && styles.filterChipTextActive]}
                          >
                            {month.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {dashboardError && <Text style={styles.error}>{dashboardError}</Text>}

          {dashboard ? (
            <>
              <View style={styles.metricsGrid}>
                {formattedSummary.map((item) => (
                  <View key={item.label} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                    <Text style={styles.metricValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Tendencia de ingresos</Text>
                {lineChartData ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={lineChartData}
                      width={chartContentWidth}
                      height={CHART_HEIGHT}
                      chartConfig={{ ...chartConfig, decimalPlaces: 2 }}
                      bezier
                      style={styles.chart}
                      formatYLabel={(value) => formatCurrency(Number(value))}
                    />
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No hay datos suficientes para mostrar.</Text>
                )}
              </View>

              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Pedidos por mes</Text>
                {barChartData ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={barChartData}
                      width={chartContentWidth}
                      height={CHART_HEIGHT}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      fromZero
                      showValuesOnTopOfBars
                    />
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No hay pedidos registrados en este periodo.</Text>
                )}
              </View>

              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Distribución de estados</Text>
                {pieChartData.length ? (
                  <PieChart
                    data={pieChartData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    accessor="population"
                    chartConfig={chartConfig}
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                  />
                ) : (
                  <Text style={styles.emptyText}>Aún no hay pedidos suficientes para graficar.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top productos</Text>
                {dashboard.topProducts.length === 0 ? (
                  <Text style={styles.emptyText}>Todavía no hay productos vendidos.</Text>
                ) : (
                  dashboard.topProducts.map((product) => (
                    <View key={product.id} style={styles.inlineCard}>
                      <Text style={styles.inlineCardTitle}>{product.name}</Text>
                      <Text style={styles.inlineCardSubtitle}>
                        {product.unitsSold} vendidos • {formatCurrency(product.revenue)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos recientes</Text>
              {updating && <ActivityIndicator color={colors.primary} />}
            </View>

            <View style={styles.statusSummaryRow}>
              {orderStatusSummary.map((status) => (
                <View key={status.key} style={[styles.statusSummaryCard, { borderColor: status.color }]}> 
                  <Text style={[styles.statusSummaryValue, { color: status.color }]}>{status.value}</Text>
                  <Text style={styles.statusSummaryLabel}>{status.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.filterChipRow}>
              {ORDER_STATUS_FILTERS.map((option) => {
                const active = orderStatusFilter === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setOrderStatusFilter(option.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredOrders.length === 0 ? (
              <Text style={styles.emptyText}>No hay pedidos con los filtros seleccionados.</Text>
            ) : (
              filteredOrders.map((order) => {
                const orderTotal = toNumber(order?.totals?.total ?? order.total ?? 0);
                const status = normaliseStatus(order.status);
                const canMarkPaid = status !== "paid" && status !== "cancelled";
                const canCancel = status === "pending";
                return (
                  <View key={order.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>Orden #{order.id}</Text>
                        <Text style={styles.cardSubtitle}>{formatDateTime(order.createdAt)}</Text>
                      </View>
                      <Text style={[styles.badge, styles[`status${status}`] || styles.badge]}>
                        {getStatusLabel(status)}
                      </Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                      Cliente: {order.customerName || "Invitado"} • Total {formatCurrency(orderTotal)}
                    </Text>
                    <View style={styles.orderItems}>
                      {order.items?.map((item) => (
                        <Text key={item.id} style={styles.orderItem}>
                          {item.quantity}x {item.name}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, !canMarkPaid && styles.actionButtonDisabled]}
                        onPress={() => handleStatusChange(order.id, "paid")}
                        disabled={!canMarkPaid}
                      >
                        <Text
                          style={[styles.actionButtonText, !canMarkPaid && styles.actionButtonTextDisabled]}
                        >
                          Marcar pagado
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton, !canCancel && styles.actionButtonDisabled]}
                        onPress={() => handleStatusChange(order.id, "cancelled")}
                        disabled={!canCancel}
                      >
                        <Text
                          style={[
                            styles.actionButtonText,
                            styles.dangerButtonText,
                            !canCancel && styles.actionButtonTextDisabled,
                          ]}
                        >
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {activeTab === "products" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inventario</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openCreateProduct}>
              <Text style={styles.primaryButtonText}>Nuevo producto</Text>
            </TouchableOpacity>
          </View>

          {productFormVisible && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingProduct ? "Editar producto" : "Crear producto"}
              </Text>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  value={productForm.name}
                  onChangeText={(text) => handleProductFormChange("name", text)}
                  style={styles.input}
                  placeholder="Helado artesanal"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  value={productForm.description}
                  onChangeText={(text) => handleProductFormChange("description", text)}
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Describe los ingredientes"
                  placeholderTextColor={colors.textLight}
                  multiline
                />
              </View>

              <View style={styles.formRowInline}>
                <View style={styles.formColumn}>
                  <Text style={styles.inputLabel}>Precio</Text>
                  <TextInput
                    value={productForm.price}
                    onChangeText={(text) => handleProductFormChange("price", text)}
                    style={styles.input}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={styles.formColumn}>
                  <Text style={styles.inputLabel}>Stock</Text>
                  <TextInput
                    value={productForm.stock}
                    onChangeText={(text) => handleProductFormChange("stock", text)}
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Imagen</Text>
                <View style={styles.modeSwitchRow}>
                  <TouchableOpacity
                    style={[styles.modeSwitchButton, productImageMode === "url" && styles.modeSwitchButtonActive]}
                    onPress={() => {
                      setProductImageMode("url");
                      setProductForm((prev) => ({ ...prev, imageUpload: null }));
                    }}
                  >
                    <Text
                      style={[styles.modeSwitchText, productImageMode === "url" && styles.modeSwitchTextActive]}
                    >
                      Usar URL
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeSwitchButton, productImageMode === "upload" && styles.modeSwitchButtonActive]}
                    onPress={() => {
                      setProductImageMode("upload");
                    }}
                  >
                    <Text
                      style={[styles.modeSwitchText, productImageMode === "upload" && styles.modeSwitchTextActive]}
                    >
                      Subir archivo
                    </Text>
                  </TouchableOpacity>
                </View>

                {productImageMode === "url" ? (
                  <TextInput
                    value={productForm.imageUrl}
                    onChangeText={(text) => handleProductFormChange("imageUrl", text)}
                    style={styles.input}
                    placeholder="https://..."
                    placeholderTextColor={colors.textLight}
                    autoCapitalize="none"
                  />
                ) : (
                  <View style={styles.uploadContainer}>
                    {productForm.imageUpload ? (
                      <View style={styles.uploadPreviewWrapper}>
                        <Image
                          source={{ uri: productForm.imageUpload.previewUri }}
                          style={styles.uploadPreviewImage}
                        />
                        <Text style={styles.uploadPreviewName}>{productForm.imageUpload.filename}</Text>
                        <View style={styles.uploadActions}>
                          <TouchableOpacity style={styles.outlinedButton} onPress={handlePickProductImage}>
                            <Text style={styles.outlinedButtonText}>Cambiar imagen</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.linkButton} onPress={handleRemoveProductImage}>
                            <Text style={styles.linkButtonText}>Quitar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.outlinedButton} onPress={handlePickProductImage}>
                        <Text style={styles.outlinedButtonText}>Seleccionar imagen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Categoría</Text>
                <View style={styles.chipsContainer}>
                  {categories.length === 0 ? (
                    <Text style={styles.emptyText}>No hay categorías disponibles.</Text>
                  ) : (
                    categories.map((category) => {
                      const active = productForm.categoryId === String(category.id);
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => handleProductFormChange("categoryId", String(category.id))}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.name}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Estado</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, productForm.active && styles.toggleButtonActive]}
                  onPress={() => handleProductFormChange("active", !productForm.active)}
                >
                  <Text style={[styles.toggleButtonText, productForm.active && styles.toggleButtonTextActive]}>
                    {productForm.active ? "Publicado" : "Oculto"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.formButton]}
                  onPress={handleSubmitProduct}
                  disabled={savingProduct}
                >
                  {savingProduct ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {editingProduct ? "Guardar cambios" : "Crear producto"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, styles.formButton]} onPress={closeProductForm}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {products.length === 0 ? (
            <Text style={styles.emptyText}>No hay productos registrados todavía.</Text>
          ) : (
            products.map((product) => {
              const isActive = Number(product.active) === 1;
              return (
                <View key={product.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{product.name}</Text>
                      <Text style={styles.cardSubtitle}>{product.category_name}</Text>
                    </View>
                    <Text style={[styles.badge, isActive ? styles.statuspaid : styles.statuscancelled]}>
                      {isActive ? "Activo" : "Inactivo"}
                    </Text>
                  </View>
                  <Text style={styles.cardSubtitle}>Stock: {product.stock} unidades</Text>
                  <Text style={styles.cardSubtitle}>{formatCurrency(product.price)}</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openEditProduct(product)}>
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleProduct(product)}>
                      <Text style={styles.actionButtonText}>
                        {isActive ? "Despublicar" : "Publicar"}
                      </Text>
                    </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => handleDeleteProduct(product)}
                    disabled={deletingProductId === product.id}
                  >
                    {deletingProductId === product.id ? (
                      <ActivityIndicator color={colors.error} />
                    ) : (
                      <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Eliminar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
          )}
        </View>
      )}

      {activeTab === "users" && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Usuarios registrados</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openCreateUserForm}>
              <Text style={styles.primaryButtonText}>Nuevo usuario</Text>
            </TouchableOpacity>
          </View>

          {userFormVisible && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingUser ? "Editar usuario" : "Crear usuario"}
              </Text>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  value={userForm.name}
                  onChangeText={(text) => handleUserFormChange("name", text)}
                  style={styles.input}
                  placeholder="Nombre completo"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <TextInput
                  value={userForm.email}
                  onChangeText={(text) => handleUserFormChange("email", text)}
                  style={styles.input}
                  placeholder="usuario@ejemplo.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
                <TextInput
                  value={userForm.phone}
                  onChangeText={(text) => handleUserFormChange("phone", text)}
                  style={styles.input}
                  placeholder="5512345678"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <TextInput
                  value={userForm.password}
                  onChangeText={(text) => handleUserFormChange("password", text)}
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  placeholderTextColor={colors.textLight}
                />
                {editingUser && (
                  <Text style={styles.helperText}>Deja en blanco para mantener la contraseña actual.</Text>
                )}
              </View>

              <View style={styles.formRow}>
                <Text style={styles.inputLabel}>Rol</Text>
                <View style={styles.chipsContainer}>
                  {USER_ROLES.map((role) => {
                    const active = userForm.role === role.key;
                    return (
                      <TouchableOpacity
                        key={role.key}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => handleUserFormChange("role", role.key)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{role.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.formButton]}
                  onPress={handleSubmitUser}
                  disabled={savingUser}
                >
                  {savingUser ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {editingUser ? "Actualizar usuario" : "Crear usuario"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.formButton]}
                  onPress={closeUserForm}
                  disabled={savingUser}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {usersList.length === 0 ? (
            <Text style={styles.emptyText}>Todavía no hay usuarios registrados.</Text>
          ) : (
            usersList.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  editingUser?.id === item.id && { borderColor: colors.accent, borderWidth: 2 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={[styles.badge, item.role === "admin" ? styles.statuspaid : styles.statuspending]}>
                    {item.role}
                  </Text>
                </View>
                <Text style={styles.cardSubtitle}>{item.email}</Text>
                {item.phone && <Text style={styles.cardSubtitle}>Teléfono: {item.phone}</Text>}
                <Text style={styles.cardSubtitle}>Registrado: {new Date(item.createdAt).toLocaleDateString()}</Text>
                <View style={styles.inlineActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => openEditUser(item)}>
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.refreshButton} onPress={refreshUsers}>
            <Text style={styles.refreshButtonText}>Actualizar usuarios</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "settings" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferencias de apariencia</Text>
          <Text style={styles.sectionDescription}>
            Elige el modo de color que prefieras. El cambio se aplicará tanto al panel administrativo como a
            la app del cliente.
          </Text>

          <View style={styles.themeOptions}>
            {[{ key: "light", label: "Modo claro", description: "Ideal para ambientes iluminados." },
              { key: "dark", label: "Modo oscuro", description: "Protege tu vista en entornos con poca luz." }].map(
              (option) => {
                const isActive = theme === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.themeOption, isActive && styles.themeOptionActive]}
                    onPress={() => setTheme(option.key)}
                  >
                    <Text style={[styles.themeOptionTitle, isActive && styles.themeOptionTitleActive]}>
                      {option.label}
                    </Text>
                    <Text
                      style={[styles.themeOptionDescription, isActive && styles.themeOptionDescriptionActive]}
                    >
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <TouchableOpacity style={styles.toggleThemeButton} onPress={toggleTheme}>
            <Text style={styles.toggleThemeButtonText}>
              Cambiar a modo {theme === "light" ? "oscuro" : "claro"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.background,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    color: colors.textLight,
    marginTop: 6,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface || colors.card,
    borderRadius: 16,
    padding: 6,
    marginTop: 20,
    gap: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabButtonText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: colors.white,
  },
  section: {
    gap: 12,
    marginTop: 24,
  },
  sectionDescription: {
    color: colors.textLight,
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  filtersCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    color: colors.textLight,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChipRowHorizontal: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface || colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.white,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flexBasis: "48%",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    color: colors.textLight,
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  chartSection: {
    marginTop: 16,
    gap: 12,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: colors.text,
  },
  cardSubtitle: {
    color: colors.textLight,
    fontSize: 14,
  },
  inlineCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inlineCardTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  inlineCardSubtitle: {
    color: colors.textLight,
    marginTop: 4,
  },
  statusSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  statusSummaryCard: {
    flexBasis: "30%",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  statusSummaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusSummaryLabel: {
    color: colors.textLight,
    fontSize: 12,
    textTransform: "uppercase",
    marginTop: 4,
    letterSpacing: 0.4,
  },
  orderItems: {
    gap: 4,
  },
  orderItem: {
    color: colors.text,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  actionButtonDisabled: {
    backgroundColor: colors.border,
  },
  actionButtonTextDisabled: {
    color: colors.textLight,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 6,
  },
  themeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  themeOptionTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  themeOptionTitleActive: {
    color: colors.white,
  },
  themeOptionDescription: {
    color: colors.textLight,
    fontSize: 13,
  },
  themeOptionDescriptionActive: {
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  toggleThemeButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleThemeButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  dangerButton: {
    backgroundColor: colors.errorLight,
  },
  dangerButtonText: {
    color: colors.error,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: "capitalize",
    color: colors.white,
    fontWeight: "700",
    backgroundColor: colors.primary,
  },
  statuspaid: {
    backgroundColor: colors.success,
  },
  statuspending: {
    backgroundColor: colors.primary,
  },
  statuscancelled: {
    backgroundColor: colors.error,
  },
  emptyText: {
    color: colors.textLight,
  },
  error: {
    color: colors.error,
  },
  formRow: {
    marginTop: 12,
    gap: 6,
  },
  modeSwitchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  modeSwitchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  modeSwitchButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeSwitchText: {
    color: colors.text,
    fontWeight: "600",
  },
  modeSwitchTextActive: {
    color: colors.white,
  },
  formRowInline: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  formColumn: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  helperText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.white,
  },
  uploadContainer: {
    gap: 12,
  },
  uploadPreviewWrapper: {
    gap: 12,
    alignItems: "center",
  },
  uploadPreviewImage: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  uploadPreviewName: {
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadActions: {
    flexDirection: "row",
    gap: 12,
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  outlinedButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  linkButton: {
    justifyContent: "center",
  },
  linkButtonText: {
    color: colors.error,
    fontWeight: "600",
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  toggleButtonText: {
    color: colors.textLight,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: colors.white,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  formButton: {
    flex: 1,
  },
  refreshButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
});
