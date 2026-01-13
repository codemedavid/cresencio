"use client";

import { useCart } from "@/contexts/CartContext";

export default function CartButton() {
    const { cartCount, setIsCartOpen } = useCart();

    return (
        <button
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-[var(--color-brand-blue)] text-white border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center"
            aria-label="Open cart"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-7 h-7"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.044-.879 2.162-1.993l.879-8.257a1.125 1.125 0 00-1.12-1.25H5.625m1.125 16.5a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0zm12.75 0a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0z"
                />
            </svg>
            {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#facc15] text-black text-xs font-extrabold border-2 border-black w-6 h-6 rounded-full flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                </span>
            )}
        </button>
    );
}
