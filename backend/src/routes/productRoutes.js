import { Router } from "express";
import { body } from "express-validator";
import {
  createCategoryController,
  createProductController,
  deleteProductController,
  listCategories,
  listProducts,
  showProduct,
  updateCategoryController,
  updateProductController,
} from "../controllers/productController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/categories", listCategories);
router.get("/products", listProducts);
router.get("/products/:id", showProduct);

router.post(
  "/categories",
  [
    authenticate,
    requireAdmin,
    body("name").notEmpty().withMessage("El nombre es requerido"),
    body("description").optional(),
    body("active").optional().isInt({ min: 0, max: 1 }),
  ],
  createCategoryController
);

router.put(
  "/categories/:id",
  [
    authenticate,
    requireAdmin,
    body("name").notEmpty().withMessage("El nombre es requerido"),
    body("description").optional(),
    body("active").isInt({ min: 0, max: 1 }),
  ],
  updateCategoryController
);

router.post(
  "/products",
  [
    authenticate,
    requireAdmin,
    body("name").notEmpty(),
    body("description").optional(),
    body("price").isFloat({ min: 0 }),
    body("imageUrl").optional().isString(),
    body("imageUpload")
      .optional()
      .custom((value) => {
        if (typeof value !== "object" || value === null) {
          throw new Error("Formato de imagen inválido");
        }
        if (typeof value.base64 !== "string" || !value.base64) {
          throw new Error("Falta el contenido de la imagen");
        }
        return true;
      }),
    body("stock").isInt({ min: 0 }),
    body("categoryId").isInt({ min: 1 }),
    body("active").optional().isInt({ min: 0, max: 1 }),
  ],
  createProductController
);

router.put(
  "/products/:id",
  [
    authenticate,
    requireAdmin,
    body("name").notEmpty(),
    body("description").optional(),
    body("price").isFloat({ min: 0 }),
    body("imageUrl").optional().isString(),
    body("imageUpload")
      .optional()
      .custom((value) => {
        if (typeof value !== "object" || value === null) {
          throw new Error("Formato de imagen inválido");
        }
        if (typeof value.base64 !== "string" || !value.base64) {
          throw new Error("Falta el contenido de la imagen");
        }
        return true;
      }),
    body("stock").isInt({ min: 0 }),
    body("categoryId").isInt({ min: 1 }),
    body("active").isInt({ min: 0, max: 1 }),
  ],
  updateProductController
);

router.delete("/products/:id", authenticate, requireAdmin, deleteProductController);

export default router;
