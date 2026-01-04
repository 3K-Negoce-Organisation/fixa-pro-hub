import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

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
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "vis-a-bois-cart";
const REMOVED_ITEMS_STORAGE_KEY = "vis-a-bois-removed-items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [removedItems, setRemovedItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Load cart from localStorage (for initial render and guests)
  const loadLocalCart = useCallback(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const storedRemoved = localStorage.getItem(REMOVED_ITEMS_STORAGE_KEY);
    return {
      items: stored ? JSON.parse(stored) : [],
      removedItems: storedRemoved ? JSON.parse(storedRemoved) : [],
    };
  }, []);

  // Save cart to Supabase for authenticated users
  const saveCartToSupabase = useCallback(async (userId: string, cartItems: CartItem[]) => {
    try {
      // Check if cart exists first
      const { data: existingCart } = await supabase
        .from('user_carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingCart) {
        // Update existing cart
        const { error } = await supabase
          .from('user_carts')
          .update({
            items: JSON.parse(JSON.stringify(cartItems)),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error("[CART] Error updating cart in Supabase:", error);
        } else {
          console.log("[CART] Updated in Supabase:", cartItems.length, "items");
        }
      } else {
        // Insert new cart
        const { error } = await supabase
          .from('user_carts')
          .insert({
            user_id: userId,
            items: JSON.parse(JSON.stringify(cartItems)),
          });

        if (error) {
          console.error("[CART] Error inserting cart in Supabase:", error);
        } else {
          console.log("[CART] Inserted in Supabase:", cartItems.length, "items");
        }
      }
    } catch (err) {
      console.error("[CART] Failed to save cart:", err);
    }
  }, []);

  // Load cart from Supabase for authenticated users
  const loadCartFromSupabase = useCallback(async (userId: string): Promise<CartItem[]> => {
    try {
      const { data, error } = await supabase
        .from('user_carts')
        .select('items')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error("[CART] Error loading from Supabase:", error);
        return [];
      }

      if (data?.items && Array.isArray(data.items)) {
        console.log("[CART] Loaded from Supabase:", data.items.length, "items");
        return data.items as unknown as CartItem[];
      }
      return [];
    } catch (err) {
      console.error("[CART] Failed to load cart:", err);
      return [];
    }
  }, []);

  // Clear cart from Supabase
  const clearCartFromSupabase = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('user_carts')
        .delete()
        .eq('user_id', userId);
      console.log("[CART] Cleared from Supabase");
    } catch (err) {
      console.error("[CART] Failed to clear cart:", err);
    }
  }, []);

  // Initialize cart based on auth state
  useEffect(() => {
    const initializeCart = async () => {
      setIsLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Load from Supabase for authenticated users
        const supabaseCart = await loadCartFromSupabase(currentUser.id);
        const localCart = loadLocalCart();

        // Merge local cart with Supabase cart (local takes priority for new items)
        if (localCart.items.length > 0 && supabaseCart.length === 0) {
          // User had local cart, save it to Supabase
          setItems(localCart.items);
          await saveCartToSupabase(currentUser.id, localCart.items);
        } else if (supabaseCart.length > 0) {
          // Use Supabase cart
          setItems(supabaseCart);
        } else {
          setItems([]);
        }
        
        // Clear local storage after loading to Supabase
        localStorage.removeItem(CART_STORAGE_KEY);
        setRemovedItems(localCart.removedItems);
      } else {
        // Load from localStorage for guests
        const localCart = loadLocalCart();
        setItems(localCart.items);
        setRemovedItems(localCart.removedItems);
      }

      isInitializedRef.current = true;
      setIsLoading(false);
    };

    initializeCart();

    // Listen for auth changes (IMPORTANT: keep callback sync-only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      // Defer any Supabase calls to avoid auth deadlocks
      window.setTimeout(() => {
        (async () => {
          try {
            if (event === "SIGNED_IN" && newUser && isInitializedRef.current) {
              // User just signed in - merge local cart with backend
              const supabaseCart = await loadCartFromSupabase(newUser.id);
              const localCart = loadLocalCart();

              // Merge carts - combine items, avoiding duplicates
              const mergedItems = [...supabaseCart];
              for (const localItem of localCart.items) {
                const existingIndex = mergedItems.findIndex(
                  (i) => i.variantId === localItem.variantId
                );
                if (existingIndex >= 0) {
                  mergedItems[existingIndex].quantity += localItem.quantity;
                } else {
                  mergedItems.push(localItem);
                }
              }

              setItems(mergedItems);
              if (mergedItems.length > 0) {
                await saveCartToSupabase(newUser.id, mergedItems);
              }
              localStorage.removeItem(CART_STORAGE_KEY);
            } else if (event === "SIGNED_OUT") {
              // User signed out - clear state
              setItems([]);
              setRemovedItems([]);
            }
          } catch (err) {
            console.error("[CART] onAuthStateChange handler failed", err);
          }
        })();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadCartFromSupabase, loadLocalCart, saveCartToSupabase]);

  // Save cart changes (debounced for performance)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid too many requests
    saveTimeoutRef.current = setTimeout(() => {
      if (user) {
        // Save to Supabase for authenticated users
        saveCartToSupabase(user.id, items);
      } else {
        // Save to localStorage for guests
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, user, saveCartToSupabase]);

  // Save removed items to localStorage (always local)
  useEffect(() => {
    if (!isInitializedRef.current) return;
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

  const clearCart = async () => {
    // Move all items to removed
    setRemovedItems((prev) => [...prev, ...items]);
    setItems([]);
    
    if (user) {
      await clearCartFromSupabase(user.id);
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
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
        isLoading,
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
