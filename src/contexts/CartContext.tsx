import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  id: string;
  variantId: string;
  handle: string;
  title: string;
  variantTitle: string;
  priceHT: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  removedItems: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  restoreItem: (variantId: string) => void;
  clearRemovedItems: () => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalHT: number;
  isOpen: boolean;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "vis-a-bois-cart";
const REMOVED_ITEMS_STORAGE_KEY = "vis-a-bois-removed-items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [removedItems, setRemovedItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem(REMOVED_ITEMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(REMOVED_ITEMS_STORAGE_KEY, JSON.stringify(removedItems));
  }, [removedItems]);

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    // Remove from removed items if it was there
    setRemovedItems((prev) => prev.filter((i) => i.variantId !== item.variantId));
    
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const removeItem = (variantId: string) => {
    const itemToRemove = items.find((i) => i.variantId === variantId);
    if (itemToRemove) {
      setRemovedItems((prev) => {
        // Don't add duplicates
        if (prev.find((i) => i.variantId === variantId)) {
          return prev;
        }
        return [...prev, itemToRemove];
      });
    }
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const restoreItem = (variantId: string) => {
    const itemToRestore = removedItems.find((i) => i.variantId === variantId);
    if (itemToRestore) {
      setItems((prev) => [...prev, itemToRestore]);
      setRemovedItems((prev) => prev.filter((i) => i.variantId !== variantId));
    }
  };

  const clearRemovedItems = () => {
    setRemovedItems([]);
    localStorage.removeItem(REMOVED_ITEMS_STORAGE_KEY);
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    // Move all items to removed
    setRemovedItems((prev) => [...prev, ...items]);
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const toggleCart = () => setIsOpen((prev) => !prev);
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalHT = items.reduce((sum, item) => sum + item.priceHT * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        removedItems,
        addItem,
        removeItem,
        restoreItem,
        clearRemovedItems,
        updateQuantity,
        clearCart,
        totalItems,
        totalHT,
        isOpen,
        toggleCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
