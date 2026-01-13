import Sidebar from "@/components/dashboard/Sidebar";
import { CartProvider } from "@/contexts/CartContext";
import CartButton from "@/components/dashboard/CartButton";
import CartDrawer from "@/components/dashboard/CartDrawer";
import { FC, ReactNode } from "react";

interface DashboardLayoutProps {
    children: ReactNode;
}

const DashboardLayout: FC<DashboardLayoutProps> = ({ children }) => {
    return (
        <CartProvider>
            <div className="flex min-h-screen bg-[var(--color-pastel-yellow)]">
                <div className="fixed inset-y-0 z-50 hidden md:block">
                    <Sidebar />
                </div>
                <main className="flex-1 md:ml-64 p-8">
                    {children}
                </main>
                <CartButton />
                <CartDrawer />
            </div>
        </CartProvider>
    );
};

export default DashboardLayout;

