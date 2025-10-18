import { Router } from "express";
import { body, param } from "express-validator";
import { addItemToCart, deleteCartItem, fetchCart, updateCartItem } from "../controllers/cartController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, fetchCart);

router.post(
  "/items",
  [
    authenticate,
    body("productId").isInt({ min: 1 }).withMessage("Producto inválido"),
    body("quantity").isInt({ min: 1 }).withMessage("Cantidad inválida"),
  ],
  addItemToCart
);

router.put(
  "/items/:itemId",
  [
    authenticate,
    param("itemId").isInt({ min: 1 }),
    body("quantity").isInt().withMessage("Cantidad inválida"),
  ],
  updateCartItem
);

router.delete(
  "/items/:itemId",
  [authenticate, param("itemId").isInt({ min: 1 })],
  deleteCartItem
);

export default router;
