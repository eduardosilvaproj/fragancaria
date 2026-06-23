import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LocalProductCard } from "@/components/shop/LocalProductCard";
import { PRODUCTS } from "@/data/products";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
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
import { useCartStore } from "@/stores/cartStore";

const MotionDiv = motion.div as any;

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto | Fragranciaria" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem, isLoading } = useCartStore();

  // Buscar produto pelo ID nos dados locais
  const product = useMemo(() => {
    return PRODUCTS.find(p => p.id === id);
  }, [id]);

  // Produtos relacionados (mesma categoria ou marca)
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return PRODUCTS.filter(p =>
      p.id !== product.id &&
      (p.category === product.category || p.brand === product.brand)
    ).slice(0, 4);
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F3EEE3]">
        <Navbar />
        <div className="container mx-auto px-4 py-40 text-center">
          <h1 className="font-serif text-4xl mb-4">Produto não encontrado</h1>
          <Link to="/produtos">
            <Button className="bg-[#B07B1E] text-[#0F3A3E]">
              Ver todos os produtos
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discount = hasDiscount && product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    // variantId: usar o sku se existir, senão usar o id do produto como local
    const variantId = product.sku
      ? `gid://shopify/ProductVariant/${product.sku}`
      : `local-${product.id}`;

    await addItem({
      product: {
        node: {
          id: `local-${product.id}`,
          title: product.name,
          description: product.description || "",
          handle: product.id,
          vendor: product.brand || "",
          productType: product.category || "",
          tags: product.tags || [],
          priceRange: {
            minVariantPrice: { amount: String(product.price), currencyCode: "BRL" }
          },
          images: {
            edges: product.images[0]
              ? [{ node: { url: product.images[0], altText: product.name } }]
              : []
          },
          variants: {
            edges: [{
              node: {
                id: variantId,
                title: "Padrão",
                price: { amount: String(product.price), currencyCode: "BRL" },
                availableForSale: product.inStock !== false,
                selectedOptions: []
              }
            }]
          },
          options: []
        }
      },
      variantId,
      variantTitle: "Padrão",
      price: { amount: String(product.price), currencyCode: "BRL" },
      quantity,
      selectedOptions: []
    });

    toast.success("Adicionado à sacola", {
      description: `${quantity}x ${product.name} foi adicionado com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#0F3A3E]/5">
        <div className="container mx-auto px-4 md:px-12 py-4 pt-24">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#0F3A3E]/40 font-bold">
            <Link to="/" className="hover:text-[#B07B1E] transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/produtos" className="hover:text-[#B07B1E] transition-colors">Produtos</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-[#0F3A3E] truncate max-w-[200px]">{product.name}</span>
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
                    src={product.images[selectedImage] || product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-contain p-8"
                  />
                </div>

                {/* Thumbnail Gallery */}
                {product.images.length > 1 && (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {product.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-20 h-20 bg-white p-2 transition-all ${
                          selectedImage === i
                            ? "ring-2 ring-[#B07B1E]"
                            : "hover:ring-2 hover:ring-[#0F3A3E]/20"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain" />
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
              {product.brand && (
                <p className="text-[10px] uppercase tracking-[0.5em] text-[#B07B1E] font-bold mb-4">
                  {product.brand}
                </p>
              )}

              {/* Title */}
              <h1 className="font-serif text-3xl md:text-4xl text-[#1C302E] font-light mb-6">
                {product.name}
              </h1>

              {/* Avaliações: exibir apenas quando integração com reviews estiver ativa */}
              {/* TODO: conectar ao Judge.me ou Shopify Product Reviews */}

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-4 mb-2">
                  {hasDiscount && product.originalPrice && (
                    <span className="text-lg text-[#1C302E]/30 line-through">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.originalPrice)}
                    </span>
                  )}
                  <span className="text-4xl font-light text-[#1C302E]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                  </span>
                  {discount > 0 && (
                    <span className="bg-[#B07B1E] text-[#0F3A3E] text-[10px] uppercase tracking-[0.2em] px-3 py-1 font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#1C302E]/40 uppercase tracking-[0.2em] font-bold">
                  ou 10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price / 10)} sem juros
                </p>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-[#1C302E]/60 mb-8 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Category Tag */}
              {product.category && (
                <div className="flex flex-wrap gap-2 mb-8">
                  <Link
                    to="/produtos"
                    search={{ productType: product.category }}
                    className="px-4 py-2 bg-[#0F3A3E]/5 text-[9px] uppercase tracking-[0.2em] font-bold text-[#0F3A3E]/60 hover:bg-[#B07B1E]/20 hover:text-[#0F3A3E] transition-colors"
                  >
                    {product.category}
                  </Link>
                </div>
              )}

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-8">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-green-600 font-bold">
                  Em estoque
                </span>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex items-center border border-[#0F3A3E]/20">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-14 flex items-center justify-center hover:bg-[#0F3A3E]/5 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-16 h-14 flex items-center justify-center text-lg font-bold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-14 flex items-center justify-center hover:bg-[#0F3A3E]/5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  className="flex-1 bg-[#0F3A3E] hover:bg-[#B07B1E] hover:text-[#0F3A3E] text-white h-14 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4 mr-3" />
                      Adicionar à Sacola
                    </>
                  )}
                </Button>

                <button className="w-14 h-14 border border-[#0F3A3E]/20 flex items-center justify-center hover:border-[#B07B1E] hover:text-[#B07B1E] transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-[#0F3A3E]/10">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1C302E]">Frete Grátis</p>
                    <p className="text-[9px] text-[#1C302E]/40">Acima de R$ 299</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1C302E]">100% Original</p>
                    <p className="text-[9px] text-[#1C302E]/40">Garantia de autenticidade</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1C302E]">Troca Fácil</p>
                    <p className="text-[9px] text-[#1C302E]/40">7 dias para trocar</p>
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
                <div className="w-12 h-[1px] bg-[#B07B1E]" />
                <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#B07B1E]">
                  Você também pode gostar
                </span>
                <div className="w-12 h-[1px] bg-[#B07B1E]" />
              </div>
              <h2 className="font-serif font-light text-[#1C302E] text-3xl">
                Produtos <span className="italic text-[#B07B1E]">Relacionados</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <LocalProductCard key={p.id} product={p} />
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
