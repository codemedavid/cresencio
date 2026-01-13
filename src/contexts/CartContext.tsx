"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { CartItem, ProductWithVariations, ProductVariation } from "@/lib/types/database";

interface CartContextType {
    cartItems: CartItem[];
    cartCount: number;
    cartTotal: number;
    addToCart: (product: ProductWithVariations, variation: ProductVariation, quantity?: number) => void;
    removeFromCart: (productId: string, variationId: string) => void;
    updateQuantity: (productId: string, variationId: string, quantity: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "warped-comet-cart";

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setCartItems(parsed);
            } catch (e) {
                console.error("Failed to parse cart from storage:", e);
            }
        }
        setIsHydrated(true);
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        }
    }, [cartItems, isHydrated]);

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const cartTotal = cartItems.reduce((sum, item) => {
        const basePrice = item.product.base_price || 0;
        const modifier = item.variation.price_modifier || 0;
        return sum + (basePrice + modifier) * item.quantity;
    }, 0);

    const addToCart = useCallback((product: ProductWithVariations, variation: ProductVariation, quantity = 1) => {
        setCartItems((prev) => {
            // Check if item with same product + variation already exists
            const existingIndex = prev.findIndex(
                (item) => item.product.id === product.id && item.variation.id === variation.id
            );

            if (existingIndex >= 0) {
                // Update quantity of existing item
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + quantity,
                };
                return updated;
            }

            // Add new item
            return [...prev, { product, variation, quantity }];
        });
    }, []);

    const removeFromCart = useCallback((productId: string, variationId: string) => {
        setCartItems((prev) =>
            prev.filter(
                (item) => !(item.product.id === productId && item.variation.id === variationId)
            )
        );
    }, []);

    const updateQuantity = useCallback((productId: string, variationId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId, variationId);
            return;
        }

        setCartItems((prev) =>
            prev.map((item) =>
                item.product.id === productId && item.variation.id === variationId
                    ? { ...item, quantity }
                    : item
            )
        );
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                cartCount,
                cartTotal,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                isCartOpen,
                setIsCartOpen,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
