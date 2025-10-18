import { validationResult } from "express-validator";
import { getActiveCart, getCartItems } from "../services/cartService.js";
import {
  createOrderFromCart,
  getAllOrders,
  getOrderById,
  getOrderItems,
  getOrdersForUser,
  updateOrderStatus,
} from "../services/orderService.js";
import { generateOrderReceipt } from "../services/receiptService.js";
import { calculateTotals } from "../utils/totals.js";

export const checkout = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cart = await getActiveCart(req.user.id);
    if (!cart) {
      return res.status(400).json({ message: "No hay carrito activo" });
    }

    const items = await getCartItems(cart.id);
    if (!items.length) {
      return res.status(400).json({ message: "El carrito está vacío" });
    }

    const orderId = await createOrderFromCart({ userId: req.user.id, cartId: cart.id, items });
    const orderItems = await getOrderItems(orderId);
    const totals = calculateTotals(orderItems);

    res.status(201).json({
      orderId,
      items: orderItems,
      totals,
      receipt: { url: `/orders/${orderId}/receipt` },
    });
  } catch (error) {
    console.error("Error al procesar checkout", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const listMyOrders = async (req, res) => {
  try {
    const orders = await getOrdersForUser(req.user.id);
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const items = await getOrderItems(order.id);
        return {
          ...order,
          items,
          totals: calculateTotals(items),
          receipt: { url: `/orders/${order.id}/receipt` },
        };
      })
    );

    res.json({ orders: enrichedOrders });
  } catch (error) {
    console.error("Error obteniendo órdenes", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const listAllOrders = async (req, res) => {
  try {
    const orders = await getAllOrders();
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const items = await getOrderItems(order.id);
        return {
          ...order,
          items,
          totals: calculateTotals(items),
          receipt: { url: `/orders/${order.id}/receipt` },
        };
      })
    );

    res.json({ orders: enrichedOrders });
  } catch (error) {
    console.error("Error obteniendo órdenes administrativas", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const downloadReceipt = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const isOwner = order.userId === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No tienes permisos para este comprobante" });
    }

    const items = await getOrderItems(orderId);
    const totals = calculateTotals(items);
    const issuedAt = order.createdAt ? new Date(order.createdAt) : new Date();

    const buffer = await generateOrderReceipt({
      orderId: Number(orderId),
      user: { name: order.customerName || req.user.name, email: order.customerEmail || req.user.email },
      items,
      totals,
      issuedAt,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="comprobante-pedido-${orderId}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error generando comprobante", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateOrderStatusController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { orderId } = req.params;
  const { status } = req.body;

  try {
    await updateOrderStatus(orderId, status);
    const items = await getOrderItems(orderId);
    res.json({ orderId: Number(orderId), status, items });
  } catch (error) {
    console.error("Error actualizando estado de orden", error);
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message || "Orden no encontrada" });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
