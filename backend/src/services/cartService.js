import { pool, query } from "../config/db.js";

export const getActiveCart = async (userId) => {
  const carts = await query(
    "SELECT * FROM carts WHERE user_id = :userId AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    { userId }
  );
  return carts[0];
};

export const createCart = async (userId) => {
  const [result] = await pool.execute("INSERT INTO carts (user_id) VALUES (:userId)", { userId });
  return result.insertId;
};

export const getCartItems = async (cartId) => {
  return query(
    `SELECT ci.id, ci.product_id AS productId, ci.quantity, ci.unit_price AS unitPrice,
            p.name, p.image_url AS imageUrl
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = :cartId`,
    { cartId }
  );
};

export const findCartItem = async ({ cartId, productId }) => {
  const items = await query(
    "SELECT * FROM cart_items WHERE cart_id = :cartId AND product_id = :productId",
    { cartId, productId }
  );
  return items[0];
};

export const addCartItem = async ({ cartId, productId, quantity, unitPrice }) => {
  const existing = await findCartItem({ cartId, productId });

  if (existing) {
    await pool.execute(
      "UPDATE cart_items SET quantity = quantity + :quantity WHERE id = :id",
      { id: existing.id, quantity }
    );
    return existing.id;
  }

  const [result] = await pool.execute(
    "INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES (:cartId, :productId, :quantity, :unitPrice)",
    { cartId, productId, quantity, unitPrice }
  );
  return result.insertId;
};

export const updateCartItemQuantity = async (itemId, quantity) => {
  await pool.execute("UPDATE cart_items SET quantity = :quantity WHERE id = :itemId", { itemId, quantity });
};

export const removeCartItem = async (itemId) => {
  await pool.execute("DELETE FROM cart_items WHERE id = :itemId", { itemId });
};

export const clearCart = async (cartId) => {
  await pool.execute("DELETE FROM cart_items WHERE cart_id = :cartId", { cartId });
};
