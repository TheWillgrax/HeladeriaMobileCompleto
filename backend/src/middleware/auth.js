import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;

  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded;
    if (queryToken) {
      delete req.query.token;
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Requiere permisos de administrador" });
  }

  next();
};
