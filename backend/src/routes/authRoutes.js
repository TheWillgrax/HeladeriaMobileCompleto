import { Router } from "express";
import { body } from "express-validator";
import { getProfile, login, register } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("El nombre es requerido"),
    body("email").isEmail().withMessage("Correo inválido"),
    body("password").isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
    body("phone").optional(),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Correo inválido"),
    body("password").notEmpty().withMessage("La contraseña es requerida"),
  ],
  login
);

router.get("/me", authenticate, getProfile);

export default router;
