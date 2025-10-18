import Constants from "expo-constants";

const normalizeBaseUrl = (value) =>
  value?.trim().replace(/\/$/, "");

const parseHostFromUri = (uri) => {
  if (!uri) return null;

  const sanitized = uri.includes("://") ? uri : `http://${uri}`;

  try {
    const { hostname } = new URL(sanitized);
    return hostname || null;
  } catch (error) {
    return sanitized.replace(/^[a-z]+:\/\//i, "").split(":")[0] || null;
  }
};

const resolveHostFromConstants = () => {
  const {
    expoConfig,
    expoGoConfig,
    manifest2,
  } = Constants ?? {};

  return (
    expoConfig?.hostUri ||
    expoGoConfig?.hostUri ||
    manifest2?.extra?.expoClient?.hostUri ||
    null
  );
};

const buildFallbackBaseUrl = () => {
  const host = parseHostFromUri(resolveHostFromConstants());
  if (!host) {
    return "http://localhost:5001/api";
  }
  return `http://${host}:5001/api`;
};

export const API_BASE_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) ||
  normalizeBaseUrl(buildFallbackBaseUrl());

export const API_ORIGIN = API_BASE_URL.replace(/\/api$/i, "");

export const API_URL = API_BASE_URL;

if (__DEV__) {
  // Helpful to verify that Expo is injecting the correct URL when using a physical device
  console.log("[API] Base URL =>", API_BASE_URL);
}
