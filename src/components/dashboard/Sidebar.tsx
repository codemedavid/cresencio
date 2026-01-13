"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC } from "react";
import { logout } from "@/app/actions/auth";

const Sidebar: FC = () => {
    const pathname = usePathname();

    const links = [
        { href: "/dashboard", label: "Products" },
        { href: "/dashboard/order", label: "New Request" },
        { href: "/dashboard/my-orders", label: "My Orders" },
    ];

    return (
        <aside className="w-64 bg-white border-r-2 border-black flex flex-col h-full min-h-screen">
            <div className="p-6 border-b-2 border-black bg-[var(--color-pastel-blue)]">
                <Link href="/" className="font-extrabold text-xl tracking-tight uppercase">
                    Cresencio
                </Link>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`block px-4 py-3 font-bold border-2 border-black text-sm uppercase tracking-wider transition-all 
                                ${isActive
                                    ? "bg-[var(--color-brand-cyan)] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]"
                                    : "bg-white hover:bg-gray-50 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                }`}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t-2 border-black">
                <form action={logout}>
                    <button
                        type="submit"
                        className="block w-full text-center px-4 py-2 bg-[var(--color-brand-magenta)] text-white border-2 border-black font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    >
                        Logout
                    </button>
                </form>
            </div>
        </aside>
    );
};

export default Sidebar;
