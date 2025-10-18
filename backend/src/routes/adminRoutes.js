import { Router } from "express";
import { body, param } from "express-validator";
import {
  createUserController,
  dashboardController,
  listUsersController,
  updateUserController,
} from "../controllers/adminController.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/dashboard", dashboardController);
router.get("/users", listUsersController);
router.post(
  "/users",
  [
    body("name").trim().notEmpty().withMessage("El nombre es requerido"),
    body("email").isEmail().withMessage("Correo inválido"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
    body("phone").optional({ nullable: true }).isLength({ min: 5 }).withMessage("Teléfono inválido"),
    body("role")
      .optional()
      .isIn(["admin", "customer"])
      .withMessage("Rol inválido"),
  ],
  createUserController
);

router.put(
  "/users/:id",
  [
    param("id").isInt({ gt: 0 }).withMessage("ID de usuario inválido"),
    body("name").trim().notEmpty().withMessage("El nombre es requerido"),
    body("email").isEmail().withMessage("Correo inválido"),
    body("password")
      .optional({ nullable: true, checkFalsy: true })
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
    body("phone").optional({ nullable: true }).isLength({ min: 5 }).withMessage("Teléfono inválido"),
    body("role")
      .optional()
      .isIn(["admin", "customer"])
      .withMessage("Rol inválido"),
  ],
  updateUserController
);

export default router;
