import { pool, query } from "../config/db.js";

export const getCategories = async () => {
  return query("SELECT id, name, description, active FROM categories ORDER BY name ASC");
};

export const createCategory = async ({ name, description, active = 1 }) => {
  const [result] = await pool.execute(
    "INSERT INTO categories (name, description, active) VALUES (:name, :description, :active)",
    { name, description, active }
  );
  return result.insertId;
};

export const updateCategory = async (id, { name, description, active }) => {
  await pool.execute(
    "UPDATE categories SET name = :name, description = :description, active = :active WHERE id = :id",
    { id, name, description, active }
  );
};

export const getProducts = async ({ categoryId, search, includeInactive = false }) => {
  let sql =
    "SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.active, p.category_id, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id";
  const params = {};
  const filters = [];

  if (categoryId) {
    filters.push("p.category_id = :categoryId");
    params.categoryId = categoryId;
  }

  if (search) {
    filters.push("(p.name LIKE :search OR p.description LIKE :search)");
    params.search = `%${search}%`;
  }

  if (!includeInactive) {
    filters.push("p.active = 1");
  }

  if (filters.length) {
    sql += ` WHERE ${filters.join(" AND ")}`;
  }

  sql += " ORDER BY p.created_at DESC";

  return query(sql, params);
};

export const getProductById = async (id) => {
  const rows = await query(
    "SELECT p.id, p.name, p.description, p.price, p.image_url, p.stock, p.active, p.category_id, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = :id",
    { id }
  );
  return rows[0];
};

export const createProduct = async ({
  name,
  description,
  price,
  imageUrl,
  stock,
  categoryId,
  active = 1,
}) => {
  const normalisedImageUrl = imageUrl ? imageUrl : null;
  const [result] = await pool.execute(
    "INSERT INTO products (name, description, price, image_url, stock, category_id, active) VALUES (:name, :description, :price, :imageUrl, :stock, :categoryId, :active)",
    { name, description, price, imageUrl: normalisedImageUrl, stock, categoryId, active }
  );
  return result.insertId;
};

export const updateProduct = async (id, {
  name,
  description,
  price,
  imageUrl,
  stock,
  categoryId,
  active,
}) => {
  const normalisedImageUrl = imageUrl ? imageUrl : null;
  await pool.execute(
    "UPDATE products SET name = :name, description = :description, price = :price, image_url = :imageUrl, stock = :stock, category_id = :categoryId, active = :active WHERE id = :id",
    { id, name, description, price, imageUrl: normalisedImageUrl, stock, categoryId, active }
  );
};

export const deleteProduct = async (id) => {
  await pool.execute("DELETE FROM products WHERE id = :id", { id });
};
