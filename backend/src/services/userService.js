import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool, query } from "../config/db.js";

const BCRYPT_ROUNDS = 10;

const HEX_DIGEST_LENGTH_ALGORITHMS = (() => {
  const algorithmsByLength = new Map();

  for (const algorithm of crypto.getHashes()) {
    try {
      const hash = crypto.createHash(algorithm);
      hash.update("compatibility-check", "utf8");
      const digest = hash.digest("hex");

      if (!/^[a-f0-9]+$/i.test(digest)) {
        continue;
      }

      const normalizedAlgorithm = algorithm.toLowerCase();
      const existingAlgorithms = algorithmsByLength.get(digest.length) || [];

      if (!existingAlgorithms.includes(normalizedAlgorithm)) {
        algorithmsByLength.set(digest.length, [...existingAlgorithms, normalizedAlgorithm]);
      }
    } catch (error) {
      // Some algorithms (e.g. shake/cshake variants) require additional options.
      // If they throw, we simply skip them because they are not used for legacy passwords.
      continue;
    }
  }

  return algorithmsByLength;
})();

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);

const isHexString = (value) => typeof value === "string" && /^[a-f0-9]+$/i.test(value);

const getAlgorithmsForHexHash = (value) => {
  if (!isHexString(value)) {
    return [];
  }

  return HEX_DIGEST_LENGTH_ALGORITHMS.get(value.length) || [];
};

const createHash = (algorithm, value) =>
  crypto.createHash(algorithm).update(value, "utf8").digest("hex");

const verifyAndUpgradeLegacyHash = async (user, password) => {
  const algorithms = getAlgorithmsForHexHash(user.password_hash);

  for (const algorithm of algorithms) {
    if (createHash(algorithm, password) === user.password_hash.toLowerCase()) {
      await updatePasswordHash(user.id, password);
      return true;
    }
  }

  return false;
};

const updatePasswordHash = async (userId, password) => {
  const passwordHash = await hashPassword(password);
  await pool.execute("UPDATE users SET password_hash = :passwordHash WHERE id = :id", {
    passwordHash,
    id: userId,
  });
};

export const findUserByEmail = async (email) => {
  const normalisedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
  const users = await query("SELECT * FROM users WHERE email = :email", { email: normalisedEmail });
  return users[0];
};

export const findUserById = async (id) => {
  const users = await query("SELECT id, name, email, phone, role, created_at FROM users WHERE id = :id", { id });
  return users[0];
};

export const createUser = async ({ name, email, password, phone, role = "customer" }) => {
  const passwordHash = await hashPassword(password);
  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = phone ? String(phone).trim() : null;
  const normalizedRole = role === "admin" ? "admin" : "customer";
  const [result] = await pool.execute(
    "INSERT INTO users (name, email, password_hash, phone, role) VALUES (:name, :email, :passwordHash, :phone, :role)",
    { name: normalizedName, email: normalizedEmail, passwordHash, phone: normalizedPhone, role: normalizedRole }
  );
  return result.insertId;
};

export const listUsers = async () => {
  return query(
    `SELECT id, name, email, phone, role, created_at AS createdAt
     FROM users
     ORDER BY created_at DESC`
  );
};

export const updateUser = async (id, { name, email, phone, role, password }) => {
  const normalizedName = name != null ? String(name).trim() : undefined;
  const normalizedEmail = email != null ? String(email).trim().toLowerCase() : undefined;
  const normalizedPhone = phone === null ? null : phone != null ? String(phone).trim() : undefined;
  const normalizedRole = role != null ? (role === "admin" ? "admin" : "customer") : undefined;

  const fields = [];
  const params = { id };

  if (normalizedName != null) {
    fields.push("name = :name");
    params.name = normalizedName;
  }

  if (normalizedEmail != null) {
    fields.push("email = :email");
    params.email = normalizedEmail;
  }

  if (normalizedPhone !== undefined) {
    fields.push("phone = :phone");
    params.phone = normalizedPhone;
  }

  if (normalizedRole != null) {
    fields.push("role = :role");
    params.role = normalizedRole;
  }

  if (fields.length > 0) {
    await pool.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = :id`, params);
  }

  if (password) {
    await updatePasswordHash(id, password);
  }
};

export const verifyUserPassword = async (user, password) => {
  if (!user?.password_hash) {
    return false;
  }

  if (isBcryptHash(user.password_hash)) {
    try {
      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      return false;
    }
  }

  const legacyHashIsValid = await verifyAndUpgradeLegacyHash(user, password);

  if (legacyHashIsValid) {
    return true;
  }

  if (user.password_hash === password) {
    await updatePasswordHash(user.id, password);
    return true;
  }

  return false;
};

export const ensureAdminUser = async ({ name, email, password, phone }) => {
  if (!email || !password) {
    return;
  }

  const existingAdmin = await findUserByEmail(email);
  if (!existingAdmin) {
    await createUser({
      name: name || "Administrador",
      email,
      password,
      phone,
      role: "admin",
    });
    return;
  }

  if (existingAdmin.role !== "admin") {
    await pool.execute("UPDATE users SET role = 'admin' WHERE id = :id", { id: existingAdmin.id });
  }

  const hasValidPassword = await verifyUserPassword(existingAdmin, password);

  if (!hasValidPassword) {
    await updatePasswordHash(existingAdmin.id, password);
  }
};
