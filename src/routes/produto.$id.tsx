import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { RecentlyViewedSection } from "@/components/shop/RecentlyViewedSection";
import { ImageLightbox } from "@/components/shop/ImageLightbox";
import { ShareButtons } from "@/components/shop/ShareButtons";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/seo";
import { useProducts } from "@/hooks/useProducts";
import { useState, useMemo, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import { toast } from "sonner";
import {
  Star,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  ChevronDown,
  ZoomIn,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [{ title: "Produto | Fragranciaria" }],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("descricao");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const addToCart = useCartStore((state) => state.addItem);
  const setCartOpen = useCartStore((state) => state.setIsOpen);
  const addToRecentlyViewed = useRecentlyViewedStore((state) => state.addItem);
  const navigate = useNavigate();

  const { products, isPending } = useProducts();

  const product = useMemo(() => {
    return products.find((p) => p.id === id) ?? null;
  }, [products, id]);

  // Track product view
  useEffect(() => {
    if (product) {
      addToRecentlyViewed({
        id: product.id,
        title: product.name,
        vendor: product.brand || "",
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.images[0],
      });
    }
  }, [product, addToRecentlyViewed]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter(
      (pr) =>
        pr.id !== product.id &&
        (pr.category === product.category || pr.brand === product.brand)
    ).slice(0, 4);
  }, [products, product]);

  if (!product && isPending) {
    return (
      <div className="min-h-screen bg-[#F3EEE3]">
        <NavbarEditorial />
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-40 text-center">
          <p className="text-[#8A938E] text-sm uppercase tracking-[0.14em]">
            Carregando produto…
          </p>
        </div>
        <FooterEditorial />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F3EEE3]">
        <NavbarEditorial />
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-40 text-center">
          <h1 className="font-serif text-4xl mb-4 text-[#0F3A3E]">
            Produto não encontrado
          </h1>
          <Link
            to="/produtos"
            className="inline-block bg-[#0F3A3E] text-white px-8 py-4 text-[12px] uppercase tracking-[0.14em] font-medium hover:bg-[#B07B1E] transition-colors"
          >
            Ver todos os produtos
          </Link>
        </div>
        <FooterEditorial />
      </div>
    );
  }

  // TypeScript nao faz narrowing de product apos a guarda acima
  const p = product!;

  const hasDiscount = p.originalPrice && p.originalPrice > p.price;
  const discount = hasDiscount && p.originalPrice
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;

  // SEO schemas
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://fragranciaria.com.br";

  const productSchema = generateProductSchema({
    id: p.id,
    name: p.name,
    description: p.description || `${p.name} - ${p.brand || "Fragranciaria"}`,
    brand: p.brand,
    price: p.price,
    originalPrice: p.originalPrice,
    images: p.images,
    category: p.category,
    inStock: true,
    rating: 4.5,
    reviewCount: 42,
  }, baseUrl);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Produtos", url: "/produtos" },
  ];
  if (p.category) {
    breadcrumbItems.push({ name: p.category, url: `/produtos?productType=${encodeURIComponent(p.category)}` });
  }
  breadcrumbItems.push({ name: p.name, url: `/produto/${p.id}` });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems, baseUrl);

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const buildCartItem = () => {
    const variation = selectedVariationId
      ? p.variations?.find((v) => v.id === selectedVariationId)
      : undefined;
    return {
      id: variation ? `${p.id}::${variation.id}` : p.id,
      title: p.name,
      price: p.price,
      quantity,
      image: variation?.image || p.images[0],
      vendor: p.brand || "",
      productId: p.id,
      variationId: variation?.id,
      variationName: variation?.name,
    };
  };

  const handleAddToCart = () => {
    if (p.variations?.length && !selectedVariationId) {
      toast.error("Escolha uma variação antes de adicionar ao carrinho");
      return;
    }
    setIsAdding(true);
    addToCart(buildCartItem());
    toast.success("Adicionado ao carrinho!", {
      description: `${quantity}x ${p.name}`,
    });
    setTimeout(() => setIsAdding(false), 1500);
  };

  const handleBuyNow = () => {
    if (p.variations?.length && !selectedVariationId) {
      toast.error("Escolha uma variação antes de continuar");
      return;
    }
    addToCart(buildCartItem());
    setCartOpen(false);
    navigate({ to: "/checkout" });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans">
      {/* SEO Structured Data */}
      <JsonLd data={[productSchema, breadcrumbSchema]} />

      <NavbarEditorial />

      {/* Breadcrumb */}
      <div className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-4">
          <nav className="flex items-center gap-1 text-[12px] text-[#75827E] flex-wrap">
            <Link to="/" className="hover:text-[#0F3A3E] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/produtos" className="hover:text-[#0F3A3E] transition-colors">
              Produtos
            </Link>
            {p.category && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  to="/produtos"
                  search={{ productType: p.category }}
                  className="hover:text-[#0F3A3E] transition-colors"
                >
                  {p.category}
                </Link>
              </>
            )}
            {p.brand && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  to="/produtos"
                  search={{ vendor: p.brand }}
                  className="hover:text-[#0F3A3E] transition-colors"
                >
                  {p.brand}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#0F3A3E] line-clamp-1">{p.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Section */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 lg:gap-16">
            {/* Image Gallery */}
            <div className="flex gap-4">
              {/* Thumbnails - Vertical */}
              {p.images.length > 1 && (
                <div className="hidden md:flex flex-col gap-3 w-[80px] flex-shrink-0">
                  {p.images.slice(0, 5).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-[80px] h-[80px] bg-white border transition-all ${
                        selectedImage === i
                          ? "border-[#0F3A3E]"
                          : "border-[#E9E1D2] hover:border-[#B07B1E]"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Image */}
              <div className="flex-1 relative bg-white border border-[#E9E1D2] overflow-hidden group">
                {/* Discount Badge */}
                {discount > 0 && (
                  <span className="absolute top-5 left-5 z-10 bg-[#0F3A3E] text-white text-[11px] font-semibold tracking-[0.06em] px-3 py-1.5">
                    -{discount}% OFF
                  </span>
                )}

                {/* Wishlist */}
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center transition-all ${
                    isWishlisted
                      ? "text-[#B07B1E]"
                      : "text-[#0F3A3E]/40 hover:text-[#B07B1E]"
                  }`}
                  aria-label={isWishlisted ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart className={`h-6 w-6 ${isWishlisted ? "fill-current" : ""}`} />
                </button>

                {/* Zoom Button */}
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-5 right-5 z-10 w-10 h-10 flex items-center justify-center bg-white/90 text-[#0F3A3E] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="Ampliar imagem"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>

                <img
                  src={p.images[selectedImage] || p.images[0]}
                  alt={p.name}
                  className="w-full aspect-square object-contain p-12 cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="lg:pt-4">
              {/* Brand */}
              {p.brand && (
                <Link
                  to="/produtos"
                  search={{ vendor: p.brand }}
                  className="text-[12px] uppercase tracking-[0.2em] text-[#B07B1E] font-medium hover:underline"
                >
                  {p.brand}
                </Link>
              )}

              {/* Title */}
              <h1 className="font-serif text-[28px] md:text-[36px] text-[#0F3A3E] leading-[1.15] mt-3 mb-5">
                {p.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-[18px] w-[18px] ${
                        i < 4 ? "fill-[#E8C25A] text-[#E8C25A]" : "fill-[#DDD4C2] text-[#DDD4C2]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[13px] text-[#75827E]">
                  4.5 · 48 avaliações
                </span>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-3">
                  {hasDiscount && p.originalPrice && (
                    <span className="text-[16px] text-[#9AA39F] line-through">
                      {formatPrice(p.originalPrice)}
                    </span>
                  )}
                  <span className="font-serif text-[36px] text-[#0F3A3E]">
                    {formatPrice(p.price)}
                  </span>
                </div>
                <p className="text-[14px] text-[#75827E] mt-2">
                  ou <strong className="text-[#0F3A3E]">10x de {formatPrice(p.price / 10)}</strong> sem juros
                </p>
                <p className="text-[13px] text-[#1c6b4a] mt-1">
                  ✦ {formatPrice(p.price * 0.95)} no PIX (5% off)
                </p>
              </div>

              {/* Variações */}
              {p.variations && p.variations.length > 0 && (
                <div className="mb-8">
                  <p className="text-[13px] text-[#51635F] mb-3">
                    Escolha uma opção:
                    {selectedVariationId && (
                      <span className="text-[#0F3A3E] font-medium ml-1">
                        {p.variations.find((v) => v.id === selectedVariationId)?.name}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {p.variations.map((v) => {
                      const isSelected = v.id === selectedVariationId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariationId(v.id)}
                          className={`flex items-center gap-2 px-3 py-2 border text-[13px] transition-colors ${
                            isSelected
                              ? "border-[#0F3A3E] bg-[#0F3A3E] text-white"
                              : "border-[#E0D8C7] text-[#51635F] hover:border-[#B07B1E]"
                          }`}
                        >
                          {v.color && (
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                              style={{ backgroundColor: v.color }}
                            />
                          )}
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="border-t border-[#E0D8C7] my-7" />

              {/* Quantity & Add to Cart */}
              <div className="space-y-5">
                {/* Quantity Selector */}
                <div className="flex items-center gap-5">
                  <span className="text-[13px] text-[#51635F]">Quantidade:</span>
                  <div className="flex items-center border border-[#E0D8C7]">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-11 h-11 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4 text-[#0F3A3E]" />
                    </button>
                    <span className="w-14 text-center text-[#0F3A3E] font-medium text-[15px]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4 text-[#0F3A3E]" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className={`w-full py-[18px] text-[12px] uppercase tracking-[0.18em] font-semibold transition-all ${
                    isAdding
                      ? "bg-[#1c6b4a] text-white"
                      : "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
                  }`}
                >
                  {isAdding ? "✓ Adicionado ao Carrinho" : "Adicionar ao Carrinho"}
                </button>

                {/* Buy Now */}
                <button
                  onClick={handleBuyNow}
                  className="w-full py-[18px] border border-[#B07B1E] text-[#B07B1E] text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#B07B1E] hover:text-white transition-colors"
                >
                  Comprar Agora
                </button>
              </div>

              {/* Benefits Strip */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Truck className="h-5 w-5 text-[#B07B1E] mx-auto mb-2" />
                  <p className="text-[11px] text-[#51635F] leading-tight">
                    Frete grátis<br />acima R$199
                  </p>
                </div>
                <div className="text-center">
                  <Shield className="h-5 w-5 text-[#B07B1E] mx-auto mb-2" />
                  <p className="text-[11px] text-[#51635F] leading-tight">
                    Produto<br />100% original
                  </p>
                </div>
                <div className="text-center">
                  <RotateCcw className="h-5 w-5 text-[#B07B1E] mx-auto mb-2" />
                  <p className="text-[11px] text-[#51635F] leading-tight">
                    Troca fácil<br />em 30 dias
                  </p>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="mt-6 pt-6 border-t border-[#E0D8C7]">
                <ShareButtons
                  productName={p.name}
                  productUrl={`/produto/${p.id}`}
                  productImage={p.images[0]}
                  productPrice={p.price}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion Details */}
      <section className="py-12 bg-white border-t border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <div className="max-w-[800px]">
            {/* Descrição */}
            <div className="border-b border-[#E0D8C7]">
              <button
                onClick={() => toggleSection("descricao")}
                className="w-full flex items-center justify-between py-5"
              >
                <span className="text-[13px] uppercase tracking-[0.16em] text-[#0F3A3E] font-semibold">
                  Descrição do Produto
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-[#75827E] transition-transform ${
                    expandedSection === "descricao" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSection === "descricao" && (
                <div className="pb-6 text-[#51635F] leading-[1.75] text-[15px]">
                  <p>
                    {p.description ||
                      "Este produto oferece o melhor da tecnologia capilar profissional para uso doméstico. Formulado com ingredientes de alta qualidade para resultados visíveis desde a primeira aplicação."}
                  </p>
                  <p className="mt-4">
                    Ideal para quem busca cuidados profissionais em casa, com a praticidade do dia a dia.
                  </p>
                </div>
              )}
            </div>

            {/* Modo de Uso */}
            <div className="border-b border-[#E0D8C7]">
              <button
                onClick={() => toggleSection("uso")}
                className="w-full flex items-center justify-between py-5"
              >
                <span className="text-[13px] uppercase tracking-[0.16em] text-[#0F3A3E] font-semibold">
                  Modo de Uso
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-[#75827E] transition-transform ${
                    expandedSection === "uso" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSection === "uso" && (
                <div className="pb-6 text-[#51635F] leading-[1.75] text-[15px]">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Aplique o produto nos cabelos úmidos ou secos, conforme indicação.</li>
                    <li>Distribua uniformemente por todo o comprimento dos fios.</li>
                    <li>Deixe agir pelo tempo indicado na embalagem.</li>
                    <li>Enxágue abundantemente se necessário.</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Especificações */}
            <div className="border-b border-[#E0D8C7]">
              <button
                onClick={() => toggleSection("specs")}
                className="w-full flex items-center justify-between py-5"
              >
                <span className="text-[13px] uppercase tracking-[0.16em] text-[#0F3A3E] font-semibold">
                  Especificações
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-[#75827E] transition-transform ${
                    expandedSection === "specs" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSection === "specs" && (
                <div className="pb-6">
                  <ul className="space-y-3">
                    {[
                      { label: "Marca", value: p.brand || "N/A" },
                      { label: "Categoria", value: p.category || "N/A" },
                      { label: "SKU", value: p.id },
                      { label: "Peso", value: "Conforme embalagem" },
                    ].map((spec) => (
                      <li
                        key={spec.label}
                        className="flex items-center justify-between py-2 border-b border-[#F0EBE0]"
                      >
                        <span className="text-[#75827E] text-[14px]">{spec.label}</span>
                        <span className="text-[#0F3A3E] text-[14px] font-medium">
                          {spec.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-[100px] bg-[#F3EEE3]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
              <div>
                <span className="text-[12px] uppercase tracking-[0.3em] text-[#B07B1E]">
                  Você também vai gostar
                </span>
                <h2 className="font-serif text-[32px] md:text-[40px] text-[#0F3A3E] mt-2">
                  Produtos Relacionados
                </h2>
              </div>
              <Link
                to="/produtos"
                className="text-[13px] uppercase tracking-[0.16em] text-[#0F3A3E] border-b border-[#B07B1E] pb-1 hover:text-[#B07B1E] transition-colors"
              >
                Ver todos →
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCardEditorial
                  key={relatedProduct.id}
                  id={relatedProduct.id}
                  title={relatedProduct.name}
                  vendor={relatedProduct.brand || ""}
                  price={relatedProduct.price}
                  originalPrice={relatedProduct.originalPrice}
                  image={relatedProduct.images[0]}
                  rating={4.3}
                  reviewCount={Math.floor(Math.random() * 50) + 5}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      <RecentlyViewedSection excludeProductId={id} />

      <FooterEditorial />

      {/* Image Lightbox */}
      <ImageLightbox
        images={p.images}
        initialIndex={selectedImage}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        productName={p.name}
      />
    </div>
  );
}

export default ProductPage;
