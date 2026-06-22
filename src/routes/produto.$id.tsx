import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { storefrontApiRequest, ShopifyProduct } from "@/lib/shopify/client";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Star,
  Heart,
  ShoppingBag,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  Minus,
  Plus,
  Check,
  Loader2,
} from "lucide-react";

const MotionDiv = motion.div as any;

const GET_PRODUCT_BY_HANDLE = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      descriptionHtml
      handle
      vendor
      productType
      tags
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            availableForSale
            quantityAvailable
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

const GET_RELATED_PRODUCTS = `
  query GetRelatedProducts($productType: String!, $first: Int!) {
    products(first: $first, query: $productType) {
      edges {
        node {
          id
          title
          description
          handle
          vendor
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 2) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 5) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto | Fragranciaria" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id: handle } = Route.useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

  const { data: productData, isLoading: productLoading, error, isError } = useQuery({
    queryKey: ["product", handle],
    queryFn: async () => {
      console.log("Fetching product with handle:", handle);
      const result = await storefrontApiRequest(GET_PRODUCT_BY_HANDLE, { handle });
      console.log("Product API response:", result);
      return result;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const product = productData?.data?.product;

  // Debug log
  console.log("ProductPage state:", { handle, productLoading, isError, error, product: !!product });

  const { data: relatedData } = useQuery({
    queryKey: ["related-products", product?.productType],
    queryFn: () => storefrontApiRequest(GET_RELATED_PRODUCTS, {
      productType: `product_type:${product?.productType}`,
      first: 5
    }),
    enabled: !!product?.productType,
  });

  const relatedProducts: ShopifyProduct[] = relatedData?.data?.products?.edges?.filter(
    (p: ShopifyProduct) => p.node.handle !== handle
  ).slice(0, 4) || [];

  if (productLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5F2]">
        <Navbar />
        <div className="container mx-auto px-4 py-40 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#F7F5F2]">
        <Navbar />
        <div className="container mx-auto px-4 py-40 text-center">
          <h1 className="font-serif text-4xl mb-4">Produto não encontrado</h1>
          <Link to="/produtos">
            <Button className="bg-[#D4AF37] text-[#0F3A45]">
              Ver todos os produtos
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const images = product.images?.edges || [];
  const variants = product.variants?.edges || [];
  const selectedVariant = variants[selectedVariantIndex]?.node;

  const price = parseFloat(selectedVariant?.price?.amount || product.priceRange.minVariantPrice.amount);
  const compareAtPrice = selectedVariant?.compareAtPrice?.amount
    ? parseFloat(selectedVariant.compareAtPrice.amount)
    : null;
  const currencyCode = selectedVariant?.price?.currencyCode || product.priceRange.minVariantPrice.currencyCode;

  const discount = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    // Criar objeto ShopifyProduct compatível
    const shopifyProduct: ShopifyProduct = {
      node: {
        id: product.id,
        title: product.title,
        description: product.description,
        handle: product.handle,
        vendor: product.vendor,
        priceRange: product.priceRange,
        images: product.images,
        variants: product.variants,
        options: product.options,
      }
    };

    await addItem({
      product: shopifyProduct,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity,
      selectedOptions: selectedVariant.selectedOptions || []
    });

    toast.success("Adicionado à sacola", {
      description: `${quantity}x ${product.title} foi adicionado com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2]">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#0F3A45]/5">
        <div className="container mx-auto px-4 md:px-12 py-4 pt-24">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#0F3A45]/40 font-bold">
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/produtos" className="hover:text-[#D4AF37] transition-colors">Produtos</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#0F3A45] truncate max-w-[200px]">{product.title}</span>
          </div>
        </div>
      </div>

      {/* Product Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Images */}
            <MotionDiv
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="sticky top-28">
                {/* Main Image */}
                <div className="aspect-square bg-white mb-4 overflow-hidden">
                  <img
                    src={images[selectedImage]?.node?.url || images[0]?.node?.url}
                    alt={images[selectedImage]?.node?.altText || product.title}
                    className="w-full h-full object-contain p-8"
                  />
                </div>

                {/* Thumbnail Gallery */}
                {images.length > 1 && (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {images.map((img: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-20 h-20 bg-white p-2 transition-all ${
                          selectedImage === i
                            ? "ring-2 ring-[#D4AF37]"
                            : "hover:ring-2 hover:ring-[#0F3A45]/20"
                        }`}
                      >
                        <img src={img.node?.url} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </MotionDiv>

            {/* Product Info */}
            <MotionDiv
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Brand */}
              <p className="text-[10px] uppercase tracking-[0.5em] text-[#D4AF37] font-bold mb-4">
                {product.vendor}
              </p>

              {/* Title */}
              <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-4">
                {product.title}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" />
                  ))}
                </div>
                <span className="text-[11px] text-[#1A1A1A]/40 tracking-widest font-bold">
                  4.9/5 (128 avaliações)
                </span>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-4 mb-2">
                  {compareAtPrice && compareAtPrice > price && (
                    <span className="text-lg text-[#1A1A1A]/30 line-through">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(compareAtPrice)}
                    </span>
                  )}
                  <span className="text-4xl font-light text-[#1A1A1A]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price)}
                  </span>
                  {discount > 0 && (
                    <span className="bg-[#D4AF37] text-[#0F3A45] text-[10px] uppercase tracking-[0.2em] px-3 py-1 font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#1A1A1A]/40 uppercase tracking-[0.2em] font-bold">
                  ou 10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price / 10)} sem juros
                </p>
              </div>

              {/* Description */}
              <p className="text-[#1A1A1A]/60 mb-8 leading-relaxed">
                {product.description}
              </p>

              {/* Variants */}
              {variants.length > 1 && (
                <div className="mb-8">
                  <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#0F3A45] mb-4">
                    Opções
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v: any, i: number) => (
                      <button
                        key={v.node.id}
                        onClick={() => setSelectedVariantIndex(i)}
                        disabled={!v.node.availableForSale}
                        className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                          selectedVariantIndex === i
                            ? "bg-[#D4AF37] text-[#0F3A45]"
                            : v.node.availableForSale
                              ? "bg-white border border-[#0F3A45]/10 text-[#0F3A45]/60 hover:border-[#D4AF37]"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                        }`}
                      >
                        {v.node.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {product.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-4 py-2 bg-[#0F3A45]/5 text-[9px] uppercase tracking-[0.2em] font-bold text-[#0F3A45]/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-8">
                {selectedVariant?.availableForSale ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-[11px] uppercase tracking-[0.2em] text-green-600 font-bold">
                      Em estoque
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.2em] text-red-600 font-bold">
                    Fora de estoque
                  </span>
                )}
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex items-center border border-[#0F3A45]/20">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-14 flex items-center justify-center hover:bg-[#0F3A45]/5 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-16 h-14 flex items-center justify-center text-lg font-bold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-14 flex items-center justify-center hover:bg-[#0F3A45]/5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.availableForSale || isLoading}
                  className="flex-1 bg-[#0F3A45] hover:bg-[#D4AF37] hover:text-[#0F3A45] text-white h-14 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-3" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 mr-3" />
                  )}
                  {isLoading ? "Adicionando..." : "Adicionar à Sacola"}
                </Button>

                <button className="w-14 h-14 border border-[#0F3A45]/20 flex items-center justify-center hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-[#0F3A45]/10">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">Frete Grátis</p>
                    <p className="text-[9px] text-[#1A1A1A]/40">Acima de R$ 299</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">100% Original</p>
                    <p className="text-[9px] text-[#1A1A1A]/40">Garantia de autenticidade</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-[#D4AF37]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">Troca Fácil</p>
                    <p className="text-[9px] text-[#1A1A1A]/40">7 dias para trocar</p>
                  </div>
                </div>
              </div>
            </MotionDiv>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-12 h-[1px] bg-[#D4AF37]" />
                <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#D4AF37]">
                  Você também pode gostar
                </span>
                <div className="w-12 h-[1px] bg-[#D4AF37]" />
              </div>
              <h2 className="font-serif font-light text-[#1A1A1A] text-3xl">
                Produtos <span className="italic text-[#D4AF37]">Relacionados</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product: ShopifyProduct) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

export default ProductPage;
