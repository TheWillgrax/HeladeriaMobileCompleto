import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { ENV } from "../config/env.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyUserPassword,
} from "../services/userService.js";

const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, ENV.JWT_SECRET, {
    expiresIn: "7d",
  });

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, phone } = req.body;

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const userId = await createUser({ name, email, password, phone });
    const user = await findUserById(userId);
    const token = generateToken({ ...user });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error("Error registrando usuario", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const isPasswordValid = await verifyUserPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = generateToken({ ...user, password_hash: undefined });
    const { password_hash, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (error) {
    console.error("Error iniciando sesión", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error obteniendo perfil", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
