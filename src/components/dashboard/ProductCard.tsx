"use client";

import Image from "next/image";
import { FC, useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { ProductVariation, ProductWithVariations } from "@/lib/types/database";
import { productService } from "@/lib/productService";

interface ProductCardProps {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    base_price: number;
}

const ProductCard: FC<ProductCardProps> = ({ id, name, description, image_url, base_price }) => {
    const { addToCart, setIsCartOpen } = useCart();
    const [variations, setVariations] = useState<ProductVariation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [added, setAdded] = useState(false);

    // Fetch variations for this product
    useEffect(() => {
        const fetchVariations = async () => {
            try {
                const product = await productService.getProductById(id);
                if (product?.variations) {
                    const activeVariations = product.variations.filter(v => v.is_active);
                    setVariations(activeVariations);
                    // Auto-select if only one variation
                    if (activeVariations.length === 1) {
                        setSelectedVariation(activeVariations[0]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch variations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVariations();
    }, [id]);

    const handleAddToCart = () => {
        // For products without variations, create a placeholder variation
        const variationToUse = selectedVariation || (variations.length === 0 ? {
            id: 'base',
            product_id: id,
            name: 'Standard',
            value: 'Base',
            price_modifier: 0,
            is_active: true,
            created_at: '',
        } : null);

        if (!variationToUse) return;

        const product: ProductWithVariations = {
            id,
            name,
            description,
            image_url,
            base_price,
            is_active: true,
            created_at: "",
            updated_at: "",
            variations,
        };

        addToCart(product, variationToUse, quantity);
        setAdded(true);

        // Show feedback briefly then open cart
        setTimeout(() => {
            setAdded(false);
            setIsCartOpen(true);
        }, 500);
    };

    const calculatedPrice = selectedVariation
        ? base_price + (selectedVariation.price_modifier || 0)
        : base_price;

    return (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
            {/* Product Image */}
            <div className="relative h-48 w-full border-b-4 border-black overflow-hidden bg-gray-100">
                <Image
                    src={image_url || "/placeholder.jpg"}
                    alt={name}
                    fill
                    className="object-cover"
                />
            </div>

            <div className="p-6 flex-1 flex flex-col">
                {/* Product Name */}
                <h3 className="text-2xl font-extrabold uppercase mb-2">{name}</h3>

                {/* Price */}
                <p className="text-lg font-bold text-gray-900 mb-2">
                    {selectedVariation ? (
                        <>₱{calculatedPrice.toFixed(2)}</>
                    ) : (
                        <>Starts at ₱{Number.isFinite(base_price) ? base_price.toFixed(2) : "N/A"}</>
                    )}
                </p>

                {/* Description */}
                <p className="text-sm font-bold text-gray-600 mb-4 flex-1 line-clamp-2">{description}</p>

                {/* Variation Selection */}
                {loading ? (
                    <div className="text-sm text-gray-500 font-bold mb-4">Loading options...</div>
                ) : variations.length > 0 ? (
                    <div className="mb-4">
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">
                            Select Variation *
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {variations.map((v) => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVariation(v)}
                                    className={`px-3 py-2 text-xs font-bold border-2 border-black transition-all ${selectedVariation?.id === v.id
                                        ? "bg-[var(--color-brand-blue)] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        : "bg-white hover:bg-gray-100"
                                        }`}
                                >
                                    {v.value}
                                    {v.price_modifier !== 0 && (
                                        <span className="ml-1 opacity-75">
                                            {v.price_modifier > 0 ? `+₱${v.price_modifier}` : `-₱${Math.abs(v.price_modifier)}`}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {!selectedVariation && (
                            <p className="text-xs text-red-600 font-bold mt-2">Please select a variation</p>
                        )}
                    </div>
                ) : null}

                {/* Quantity - show for products with variation selected OR products without variations */}
                {(selectedVariation || variations.length === 0) && (
                    <div className="flex items-center gap-3 mb-4">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Qty:</label>
                        <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="w-8 h-8 bg-white border-2 border-black font-extrabold hover:bg-gray-100"
                        >
                            −
                        </button>
                        <span className="font-extrabold w-8 text-center">{quantity}</span>
                        <button
                            onClick={() => setQuantity((q) => q + 1)}
                            className="w-8 h-8 bg-white border-2 border-black font-extrabold hover:bg-gray-100"
                        >
                            +
                        </button>
                    </div>
                )}

                {/* Add to Cart Button */}
                <button
                    onClick={handleAddToCart}
                    disabled={loading || (variations.length > 0 && !selectedVariation)}
                    className={`w-full text-center px-6 py-3 border-2 border-black font-extrabold uppercase transition-all ${(selectedVariation || variations.length === 0)
                        ? added
                            ? "bg-[#a3e635] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                            : "bg-[var(--color-brand-blue)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    {added ? "✓ Added!" : (selectedVariation || variations.length === 0) ? "Add to Cart" : "Select Variation First"}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;

