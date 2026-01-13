"use client";

import Image from "next/image";
import Link from "next/link";
import { FC, useState } from "react";

const Navbar: FC = () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-black">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <Image
                            src="/logo.png"
                            alt="Cresencio Printing Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-black uppercase">
                        Cresencio
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {["Services", "About Us", "Support"].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase().replace(" ", "-")}`}
                            className="text-sm font-bold text-black hover:text-[var(--color-brand-blue)] transition-colors relative"
                        >
                            {item.toUpperCase()}
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="hidden md:inline-flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-[var(--color-brand-blue)] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        LOGIN VIP
                    </Link>

                    <button
                        type="button"
                        className="md:hidden text-black border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                        onClick={() => setIsMobileOpen((prev) => !prev)}
                        aria-expanded={isMobileOpen}
                        aria-controls="mobile-menu"
                        aria-label="Toggle mobile menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                id="mobile-menu"
                className={`md:hidden border-t-2 border-black bg-white ${isMobileOpen ? "block" : "hidden"}`}
            >
                <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
                    {["Services", "About Us", "Support"].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase().replace(" ", "-")}`}
                            className="text-sm font-bold text-black hover:text-[var(--color-brand-blue)] transition-colors"
                            onClick={() => setIsMobileOpen(false)}
                        >
                            {item.toUpperCase()}
                        </Link>
                    ))}
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center px-6 py-2 text-sm font-bold text-white bg-[var(--color-brand-blue)] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        onClick={() => setIsMobileOpen(false)}
                    >
                        LOGIN VIP
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
