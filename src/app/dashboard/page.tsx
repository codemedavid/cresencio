import ProductCard from "@/components/dashboard/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/lib/types/database";

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching products:", error);
    }

    return (
        <div>
            <h1 className="text-4xl font-extrabold uppercase mb-8 tracking-tighter">Available Products</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products && products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard
                            key={product.id}
                            {...(product as Product)}
                        />
                    ))
                ) : (
                    <p>No products available.</p>
                )}
            </div>
        </div>
    );
}
