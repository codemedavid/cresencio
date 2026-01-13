"use client";

import { useEffect, useState } from "react";
import { Product, ProductVariation, ProductWithVariations } from "@/lib/types/database";
import { productService } from "@/lib/productService";
import { X, Plus, Trash2, Save } from "lucide-react";
import CloudinaryUpload from "./CloudinaryUpload";

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    productToEdit?: ProductWithVariations | null;
}

export default function ProductModal({ isOpen, onClose, onSave, productToEdit }: ProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: "",
        description: "",
        base_price: 0,
        image_url: "",
        is_active: true,
    });

    const [variations, setVariations] = useState<Partial<ProductVariation>[]>([]);

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name,
                description: productToEdit.description,
                base_price: productToEdit.base_price,
                image_url: productToEdit.image_url,
                is_active: productToEdit.is_active,
            });
            setVariations(productToEdit.variations || []);
        } else {
            setFormData({
                name: "",
                description: "",
                base_price: 0,
                image_url: "",
                is_active: true,
            });
            setVariations([]);
        }
    }, [productToEdit, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: string | number = value;
        if (type === "number") {
            if (value === "" || isNaN(parseFloat(value))) {
                parsedValue = "";
            } else {
                parsedValue = parseFloat(value);
            }
        }
        setFormData((prev) => ({
            ...prev,
            [name]: parsedValue,
        }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: checked,
        }));
    };

    const handleAddVariation = () => {
        setVariations([
            ...variations,
            {
                name: "",
                value: "",
                price_modifier: 0,
                is_active: true,
            },
        ]);
    };

    const handleVariationChange = (index: number, field: keyof ProductVariation, value: string | number) => {
        const updatedVariations = [...variations];
        updatedVariations[index] = {
            ...updatedVariations[index],
            [field]: field === "price_modifier" ? parseFloat(String(value)) : value,
        };
        setVariations(updatedVariations);
    };

    const handleDeleteVariation = async (index: number) => {
        const variation = variations[index];
        if (variation.id) {
            // If it has an ID, delete from database
            try {
                await productService.deleteVariation(variation.id);
            } catch (error) {
                console.error("Failed to delete variation", error);
                // Optionally show error to user
                return;
            }
        }
        const updatedVariations = variations.filter((_, i) => i !== index);
        setVariations(updatedVariations);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let productId = productToEdit?.id;

            if (productId) {
                // Update existing product
                await productService.updateProduct(productId, formData);
            } else {
                // Create new product
                const newProduct = await productService.createProduct(formData);
                if (newProduct) {
                    productId = newProduct.id;
                }
            }

            if (productId) {
                // Handle variations
                for (const variation of variations) {
                    if (variation.id) {
                        // Update existing variation
                        await productService.updateVariation(variation.id, variation);
                    } else {
                        // Create new variation
                        await productService.createVariation({
                            ...variation,
                            product_id: productId,
                        });
                    }
                }
            }

            onSave();
            onClose();
        } catch (error) {
            console.error("Error saving product:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative z-10 inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                        <button
                            onClick={onClose}
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <span className="sr-only">Close</span>
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="sm:flex sm:items-start w-full">
                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                {productToEdit ? "Edit Product" : "Add New Product"}
                            </h3>
                            <div className="mt-4">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                        <div className="sm:col-span-4">
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                Product Name
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    type="text"
                                                    name="name"
                                                    id="name"
                                                    required
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700">
                                                Base Price (₱)
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    type="number"
                                                    name="base_price"
                                                    id="base_price"
                                                    required
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.base_price}
                                                    onChange={handleInputChange}
                                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-6">
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                                Description
                                            </label>
                                            <div className="mt-1">
                                                <textarea
                                                    id="description"
                                                    name="description"
                                                    rows={3}
                                                    value={formData.description || ""}
                                                    onChange={handleInputChange}
                                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-6">
                                            <CloudinaryUpload
                                                onUpload={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                                defaultImage={formData.image_url || undefined}
                                                label="Product Image"
                                            />
                                        </div>

                                        <div className="sm:col-span-6">
                                            <div className="flex items-center">
                                                <input
                                                    id="is_active"
                                                    name="is_active"
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={handleCheckboxChange}
                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                                                    Active (Visible to users)
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Variations Section */}
                                    <div className="border-t border-gray-200 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-medium text-gray-900">Product Variations</h4>
                                            <button
                                                type="button"
                                                onClick={handleAddVariation}
                                                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Add Variation
                                            </button>
                                        </div>

                                        {variations.length > 0 ? (
                                            <div className="space-y-3">
                                                {variations.map((variation, index) => (
                                                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                                        <div className="flex-1 w-full">
                                                            <input
                                                                type="text"
                                                                placeholder="Type (e.g. Size)"
                                                                value={variation.name}
                                                                onChange={(e) => handleVariationChange(index, "name", e.target.value)}
                                                                className="block w-full sm:text-xs border-gray-300 rounded-md p-1.5 border"
                                                            />
                                                        </div>
                                                        <div className="flex-1 w-full">
                                                            <input
                                                                type="text"
                                                                placeholder="Value (e.g. A4)"
                                                                value={variation.value}
                                                                onChange={(e) => handleVariationChange(index, "value", e.target.value)}
                                                                className="block w-full sm:text-xs border-gray-300 rounded-md p-1.5 border"
                                                            />
                                                        </div>
                                                        <div className="w-full sm:w-24">
                                                            <input
                                                                type="number"
                                                                placeholder="Price +/- (₱)"
                                                                step="0.01"
                                                                value={variation.price_modifier}
                                                                onChange={(e) => handleVariationChange(index, "price_modifier", e.target.value)}
                                                                className="block w-full sm:text-xs border-gray-300 rounded-md p-1.5 border"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteVariation(index)}
                                                            className="text-red-600 hover:text-red-900 p-1"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No variations added yet.</p>
                                        )}
                                    </div>

                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="relative w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="opacity-0">Save</span>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Product
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
