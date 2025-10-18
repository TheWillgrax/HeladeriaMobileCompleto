import { validationResult } from "express-validator";
import {
  addCartItem,
  createCart,
  getActiveCart,
  getCartItems,
  removeCartItem,
  updateCartItemQuantity,
} from "../services/cartService.js";
import { getProductById } from "../services/productService.js";
import { calculateTotals } from "../utils/totals.js";

const ensureCart = async (userId) => {
  let cart = await getActiveCart(userId);
  if (!cart) {
    const cartId = await createCart(userId);
    cart = { id: cartId, user_id: userId, status: "active" };
  }
  return cart;
};

const buildCartResponse = async (userId) => {
  const cart = await ensureCart(userId);
  const items = await getCartItems(cart.id);
  const totals = calculateTotals(items);
  return { cartId: cart.id, items, totals };
};

export const fetchCart = async (req, res) => {
  try {
    const payload = await buildCartResponse(req.user.id);
    res.json(payload);
  } catch (error) {
    console.error("Error obteniendo carrito", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const addItemToCart = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId, quantity } = req.body;

  try {
    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const cart = await ensureCart(req.user.id);
    await addCartItem({
      cartId: cart.id,
      productId,
      quantity,
      unitPrice: product.price,
    });

    const payload = await buildCartResponse(req.user.id);
    res.status(201).json(payload);
  } catch (error) {
    console.error("Error agregando al carrito", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const updateCartItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { quantity } = req.body;
  const { itemId } = req.params;

  try {
    if (quantity <= 0) {
      await removeCartItem(itemId);
    } else {
      await updateCartItemQuantity(itemId, quantity);
    }

    const payload = await buildCartResponse(req.user.id);
    res.json(payload);
  } catch (error) {
    console.error("Error actualizando carrito", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const deleteCartItem = async (req, res) => {
  try {
    await removeCartItem(req.params.itemId);
    const payload = await buildCartResponse(req.user.id);
    res.json(payload);
  } catch (error) {
    console.error("Error eliminando item del carrito", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
