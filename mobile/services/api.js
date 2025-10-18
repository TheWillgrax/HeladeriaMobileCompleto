export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5001/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api$/i, "");

export const resolveImageUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalised = String(path).replace(/^\/+/, "");
  return `${API_ORIGIN}/${normalised}`;
};

const createHeaders = (token) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || "Error desconocido";
    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

const request = async (path, { method = "GET", token, body } = {}) => {
  const url = `${API_BASE_URL}${path}`;
  const options = {
    method,
    headers: createHeaders(token),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return handleResponse(response);
};

export const authApi = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  profile: (token) => request("/auth/me", { token }),
};

export const catalogApi = {
  categories: () => request("/categories"),
  products: (params = {}) => {
    const query = new URLSearchParams();
    if (params.categoryId) query.set("categoryId", String(params.categoryId));
    if (params.search) query.set("search", params.search);
    if (params.includeInactive) query.set("includeInactive", "1");
    const path = `/products${query.toString() ? `?${query.toString()}` : ""}`;
    return request(path);
  },
  product: (id) => request(`/products/${id}`),
  createProduct: (token, payload) => request("/products", { method: "POST", token, body: payload }),
  updateProduct: (token, id, payload) => request(`/products/${id}`, { method: "PUT", token, body: payload }),
  deleteProduct: (token, id) => request(`/products/${id}`, { method: "DELETE", token }),
  createCategory: (token, payload) => request("/categories", { method: "POST", token, body: payload }),
  updateCategory: (token, id, payload) => request(`/categories/${id}`, { method: "PUT", token, body: payload }),
};

export const cartApi = {
  get: (token) => request("/cart", { token }),
  addItem: (token, payload) => request("/cart/items", { method: "POST", token, body: payload }),
  updateItem: (token, itemId, payload) =>
    request(`/cart/items/${itemId}`, { method: "PUT", token, body: payload }),
  deleteItem: (token, itemId) => request(`/cart/items/${itemId}`, { method: "DELETE", token }),
};

export const orderApi = {
  checkout: (token) => request("/orders/checkout", { method: "POST", token }),
  myOrders: (token) => request("/orders/mine", { token }),
  allOrders: (token) => request("/orders", { token }),
  updateStatus: (token, orderId, status) =>
    request(`/orders/${orderId}/status`, { method: "PATCH", token, body: { status } }),
};

export const adminApi = {
  dashboard: (token, params = {}) => {
    const query = new URLSearchParams();
    if (params.year) query.set("year", String(params.year));
    if (params.month) query.set("month", String(params.month));
    if (params.range) query.set("range", String(params.range));
    if (params.from) query.set("from", String(params.from));
    if (params.to) query.set("to", String(params.to));
    const path = `/admin/dashboard${query.toString() ? `?${query.toString()}` : ""}`;
    return request(path, { token });
  },
  users: (token) => request("/admin/users", { token }),
  createUser: (token, payload) => request("/admin/users", { method: "POST", token, body: payload }),
  updateUser: (token, id, payload) =>
    request(`/admin/users/${id}`, { method: "PUT", token, body: payload }),
};
