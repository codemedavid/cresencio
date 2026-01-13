"use client";

import { useCart } from "@/contexts/CartContext";
import Image from "next/image";
import Link from "next/link";

export default function CartDrawer() {
    const {
        cartItems,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
        removeFromCart,
        updateQuantity,
        clearCart,
    } = useCart();

    if (!isCartOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setIsCartOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l-4 border-black z-50 flex flex-col shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-4 border-black bg-[var(--color-pastel-pink)]">
                    <h2 className="text-2xl font-extrabold uppercase tracking-tight">Your Cart</h2>
                    <button
                        onClick={() => setIsCartOpen(false)}
                        className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-extrabold text-xl hover:bg-gray-100 transition-colors"
                        aria-label="Close cart"
                    >
                        ✕
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cartItems.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 font-bold text-lg">Your cart is empty</p>
                            <p className="text-gray-400 font-medium mt-2">Add some products to get started!</p>
                        </div>
                    ) : (
                        cartItems.map((item) => {
                            const itemPrice = (item.product.base_price || 0) + (item.variation.price_modifier || 0);
                            return (
                                <div
                                    key={`${item.product.id}-${item.variation.id}`}
                                    className="bg-[var(--color-pastel-blue)] border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <div className="flex gap-4">
                                        {/* Product Image */}
                                        <div className="w-20 h-20 border-2 border-black bg-white overflow-hidden flex-shrink-0">
                                            <Image
                                                src={item.product.image_url || "/placeholder.jpg"}
                                                alt={item.product.name}
                                                width={80}
                                                height={80}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-extrabold text-sm uppercase truncate">
                                                {item.product.name}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-600 mt-1">
                                                {item.variation.name}: {item.variation.value}
                                            </p>
                                            <p className="font-extrabold text-lg mt-2">
                                                ₱{itemPrice.toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => removeFromCart(item.product.id, item.variation.id)}
                                            className="text-red-600 font-bold text-sm hover:text-red-800 self-start"
                                            aria-label="Remove item"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-3 mt-4">
                                        <button
                                            onClick={() =>
                                                updateQuantity(item.product.id, item.variation.id, item.quantity - 1)
                                            }
                                            className="w-8 h-8 bg-white border-2 border-black font-extrabold hover:bg-gray-100 transition-colors"
                                        >
                                            −
                                        </button>
                                        <span className="font-extrabold text-lg w-8 text-center">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() =>
                                                updateQuantity(item.product.id, item.variation.id, item.quantity + 1)
                                            }
                                            className="w-8 h-8 bg-white border-2 border-black font-extrabold hover:bg-gray-100 transition-colors"
                                        >
                                            +
                                        </button>
                                        <span className="ml-auto font-extrabold">
                                            ₱{(itemPrice * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="border-t-4 border-black p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-extrabold text-lg uppercase">Total</span>
                            <span className="font-extrabold text-2xl">₱{cartTotal.toFixed(2)}</span>
                        </div>

                        <Link
                            href="/dashboard/order"
                            onClick={() => setIsCartOpen(false)}
                            className="block w-full text-center bg-[#facc15] text-black border-2 border-black p-4 font-extrabold uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            Proceed to Checkout
                        </Link>

                        <button
                            onClick={clearCart}
                            className="w-full text-center text-red-600 font-bold uppercase hover:text-red-800 transition-colors py-2"
                        >
                            Clear Cart
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
