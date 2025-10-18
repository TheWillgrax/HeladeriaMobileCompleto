import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartApi, orderApi } from "@/services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const normaliseItems = useCallback((list = []) => {
    return list.map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
    }));
  }, []);

  const computeTotals = useCallback((list = [], incomingTotals = null) => {
    const subtotalFromItems = list.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const subtotal = Number(incomingTotals?.subtotal ?? subtotalFromItems ?? 0);
    const total = Number(incomingTotals?.total ?? subtotal);
    return { subtotal, total };
  }, []);

  const syncCartState = useCallback(
    (payload) => {
      const nextItems = normaliseItems(payload?.items || []);
      setItems(nextItems);
      setTotals(computeTotals(nextItems, payload?.totals));
    },
    [computeTotals, normaliseItems]
  );

  const fetchCart = useCallback(async () => {
    if (!token) {
      syncCartState({ items: [], totals: { subtotal: 0, total: 0 } });
      return;
    }

    setLoading(true);
    try {
      const data = await cartApi.get(token);
      syncCartState(data);
    } catch (error) {
      console.warn("No se pudo obtener el carrito", error?.message);
      syncCartState({ items: [], totals: { subtotal: 0, total: 0 } });
    } finally {
      setLoading(false);
    }
  }, [token, syncCartState]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const ensureFreshState = useCallback(
    async (maybeCart) => {
      if (maybeCart?.items) {
        syncCartState(maybeCart);
        return maybeCart;
      }

      await fetchCart();
      return null;
    },
    [fetchCart, syncCartState]
  );

  const addItem = useCallback(
    async ({ productId, quantity }) => {
      if (!token) throw new Error("Es necesario iniciar sesión");
      const data = await cartApi.addItem(token, { productId, quantity });
      return ensureFreshState(data);
    },
    [token, ensureFreshState]
  );

  const updateItem = useCallback(
    async ({ itemId, quantity }) => {
      if (!token) throw new Error("Es necesario iniciar sesión");
      const data = await cartApi.updateItem(token, itemId, { quantity });
      return ensureFreshState(data);
    },
    [token, ensureFreshState]
  );

  const removeItem = useCallback(
    async (itemId) => {
      if (!token) throw new Error("Es necesario iniciar sesión");
      const data = await cartApi.deleteItem(token, itemId);
      return ensureFreshState(data);
    },
    [token, ensureFreshState]
  );

  const checkout = useCallback(async () => {
    if (!token) throw new Error("Es necesario iniciar sesión");
    const order = await orderApi.checkout(token);
    await fetchCart();
    return order;
  }, [token, fetchCart]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, totals, itemCount, loading, fetchCart, addItem, updateItem, removeItem, checkout }),
    [items, totals, itemCount, loading, fetchCart, addItem, updateItem, removeItem, checkout]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};
