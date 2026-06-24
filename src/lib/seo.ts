// Schema.org JSON-LD generators for SEO

export interface ProductSchemaProps {
  id: string;
  name: string;
  description: string;
  image: string;
  brand: string;
  price: number;
  originalPrice?: number;
  inStock?: boolean;
  sku?: string;
}

export function generateProductSchema(product: ProductSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku || product.id,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    offers: {
      "@type": "Offer",
      url: `https://fragranciaria.com.br/produto/${product.id}`,
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Fragranciaria",
      },
    },
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Fragranciaria",
    url: "https://fragranciaria.com.br",
    logo: "https://fragranciaria.com.br/images/logo-icon.png",
    description: "Especialista em cabelo profissional. Curadoria dos melhores cosméticos capilares.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "BR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contato@fragranciaria.com.br",
      availableLanguage: "Portuguese",
    },
    sameAs: [
      "https://instagram.com/fragranciaria",
    ],
  };
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fragranciaria",
    url: "https://fragranciaria.com.br",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://fragranciaria.com.br/produtos?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Fragranciaria",
    description: "Loja online especializada em produtos profissionais para cabelos",
    url: "https://fragranciaria.com.br",
    telephone: "",
    email: "contato@fragranciaria.com.br",
    priceRange: "$$",
    image: "https://fragranciaria.com.br/images/logo-icon.png",
    address: {
      "@type": "PostalAddress",
      addressCountry: "BR",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  };
}
