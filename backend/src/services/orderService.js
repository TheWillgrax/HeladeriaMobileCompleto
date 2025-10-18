import { pool, query } from "../config/db.js";

export const createOrderFromCart = async ({ userId, cartId, items }) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const total = items.reduce((acc, item) => acc + item.quantity * Number(item.unitPrice), 0);

    const [orderResult] = await connection.execute(
      "INSERT INTO orders (user_id, cart_id, total, status) VALUES (:userId, :cartId, :total, 'pending')",
      { userId, cartId, total }
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await connection.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (:orderId, :productId, :quantity, :unitPrice)",
        {
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }
      );
    }

    await connection.execute("UPDATE carts SET status = 'converted' WHERE id = :cartId", { cartId });

    await connection.commit();

    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getOrdersForUser = async (userId) => {
  return query(
    `SELECT o.id, o.total, o.status, o.created_at AS createdAt
     FROM orders o
     WHERE o.user_id = :userId
     ORDER BY o.created_at DESC`,
    { userId }
  );
};

export const getOrderItems = async (orderId) => {
  return query(
    `SELECT oi.id, oi.product_id AS productId, oi.quantity, oi.unit_price AS unitPrice,
            p.name, p.image_url AS imageUrl
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = :orderId`,
    { orderId }
  );
};

export const getOrderById = async (orderId) => {
  const rows = await query(
    `SELECT o.id, o.total, o.status, o.created_at AS createdAt, o.user_id AS userId,
            u.name AS customerName, u.email AS customerEmail
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.id = :orderId`,
    { orderId }
  );

  return rows[0];
};

export const getAllOrders = async () => {
  return query(
    `SELECT o.id, o.total, o.status, o.created_at AS createdAt, u.name AS customerName, u.email
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC`
  );
};

const adjustStockForOrder = async (connection, orderId, mode) => {
  const [items] = await connection.execute(
    "SELECT product_id AS productId, quantity FROM order_items WHERE order_id = :orderId",
    { orderId }
  );

  if (!items.length) {
    return;
  }

  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    if (!productId || !quantity) {
      continue;
    }

    const [productRows] = await connection.execute(
      "SELECT stock FROM products WHERE id = :productId FOR UPDATE",
      { productId }
    );

    if (!productRows.length) {
      continue;
    }

    const currentStock = Number(productRows[0].stock) || 0;
    let newStock = currentStock;

    if (mode === "decrease") {
      newStock = Math.max(currentStock - quantity, 0);
    } else if (mode === "increase") {
      newStock = currentStock + quantity;
    }

    if (newStock !== currentStock) {
      await connection.execute(
        "UPDATE products SET stock = :stock WHERE id = :productId",
        { stock: newStock, productId }
      );
    }
  }
};

export const updateOrderStatus = async (orderId, status) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      "SELECT status FROM orders WHERE id = :orderId FOR UPDATE",
      { orderId }
    );

    if (!orders.length) {
      const error = new Error("Orden no encontrada");
      error.statusCode = 404;
      throw error;
    }

    const previousStatus = orders[0].status;

    if (previousStatus !== status) {
      await connection.execute("UPDATE orders SET status = :status WHERE id = :orderId", { orderId, status });

      if (status === "paid" && previousStatus !== "paid") {
        await adjustStockForOrder(connection, orderId, "decrease");
      } else if (status === "cancelled" && previousStatus === "paid") {
        await adjustStockForOrder(connection, orderId, "increase");
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
