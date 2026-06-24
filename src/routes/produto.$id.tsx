import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { PRODUCTS } from "@/data/products";
import { useState, useMemo } from "react";
import { useCartStore } from "@/stores/cartStore";
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
  const addToCart = useCartStore((state) => state.addItem);

  const product = useMemo(() => {
    return PRODUCTS.find((p) => p.id === id);
  }, [id]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return PRODUCTS.filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.brand === product.brand)
    ).slice(0, 4);
  }, [product]);

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

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discount = hasDiscount && product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      id: product.id,
      title: product.name,
      price: product.price,
      quantity,
      image: product.images[0],
      vendor: product.brand || "",
    });
    toast.success("Adicionado ao carrinho!", {
      description: `${quantity}x ${product.name}`,
    });
    setTimeout(() => setIsAdding(false), 1500);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans">
      <NavbarEditorial />

      {/* Breadcrumb */}
      <div className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-4">
          <nav className="text-[12px] text-[#75827E]">
            <Link to="/" className="hover:text-[#0F3A3E] transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/produtos" className="hover:text-[#0F3A3E] transition-colors">
              Produtos
            </Link>
            {product.brand && (
              <>
                <span className="mx-2">/</span>
                <Link
                  to="/produtos"
                  search={{ vendor: product.brand }}
                  className="hover:text-[#0F3A3E] transition-colors"
                >
                  {product.brand}
                </Link>
              </>
            )}
            <span className="mx-2">/</span>
            <span className="text-[#0F3A3E]">{product.name.substring(0, 40)}...</span>
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
              {product.images.length > 1 && (
                <div className="hidden md:flex flex-col gap-3 w-[80px] flex-shrink-0">
                  {product.images.slice(0, 5).map((img, i) => (
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
              <div className="flex-1 relative bg-[#F8F4EA] border border-[#E9E1D2] overflow-hidden">
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

                <img
                  src={product.images[selectedImage] || product.images[0]}
                  alt={product.name}
                  className="w-full aspect-square object-contain p-12"
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="lg:pt-4">
              {/* Brand */}
              {product.brand && (
                <Link
                  to="/produtos"
                  search={{ vendor: product.brand }}
                  className="text-[12px] uppercase tracking-[0.2em] text-[#B07B1E] font-medium hover:underline"
                >
                  {product.brand}
                </Link>
              )}

              {/* Title */}
              <h1 className="font-serif text-[28px] md:text-[36px] text-[#0F3A3E] leading-[1.15] mt-3 mb-5">
                {product.name}
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
                  {hasDiscount && product.originalPrice && (
                    <span className="text-[16px] text-[#9AA39F] line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="font-serif text-[36px] text-[#0F3A3E]">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <p className="text-[14px] text-[#75827E] mt-2">
                  ou <strong className="text-[#0F3A3E]">10x de {formatPrice(product.price / 10)}</strong> sem juros
                </p>
                <p className="text-[13px] text-[#1c6b4a] mt-1">
                  ✦ {formatPrice(product.price * 0.95)} no PIX (5% off)
                </p>
              </div>

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
                <button className="w-full py-[18px] border border-[#B07B1E] text-[#B07B1E] text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#B07B1E] hover:text-white transition-colors">
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
                    {product.description ||
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
                      { label: "Marca", value: product.brand || "N/A" },
                      { label: "Categoria", value: product.category || "N/A" },
                      { label: "SKU", value: product.id },
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

      <FooterEditorial />
    </div>
  );
}

export default ProductPage;
