// SEO Structured Data helpers for e-commerce
// Generates JSON-LD schema.org markup

export interface ProductSchemaData {
  id: string;
  name: string;
  description: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category?: string;
  sku?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface OrganizationSchemaData {
  name: string;
  url: string;
  logo: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  socialProfiles?: string[];
}

/**
 * Generate Product schema for PDP pages
 */
export function generateProductSchema(product: ProductSchemaData, baseUrl: string): object {
  const productUrl = `${baseUrl}/produto/${product.id}`;
  const imageUrls = product.images.map((img) =>
    img.startsWith("http") ? img : `${baseUrl}${img}`
  );

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: imageUrls,
    url: productUrl,
    sku: product.sku || product.id,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BRL",
      price: product.price.toFixed(2),
      availability: product.inStock !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Fragranciaria",
      },
    },
  };

  if (product.brand) {
    schema.brand = {
      "@type": "Brand",
      name: product.brand,
    };
  }

  if (product.category) {
    schema.category = product.category;
  }

  if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[], baseUrl: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Generate Organization schema for the website
 * Uses default Fragranciaria values if no data provided
 */
export function generateOrganizationSchema(org?: Partial<OrganizationSchemaData>): object {
  const defaults: OrganizationSchemaData = {
    name: "Fragranciaria",
    url: "https://fragranciaria.com.br",
    logo: "https://fragranciaria.com.br/images/logo.png",
    description: "Especialista em cabelo profissional. Curadoria dos melhores cosméticos para cabelos.",
    email: "contato@fragranciaria.com.br",
    socialProfiles: [
      "https://instagram.com/fragranciaria",
      "https://facebook.com/fragranciaria",
    ],
  };

  const data = { ...defaults, ...org };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.name,
    url: data.url,
    logo: data.logo,
  };

  if (data.description) {
    schema.description = data.description;
  }

  if (data.email) {
    schema.email = data.email;
  }

  if (data.phone) {
    schema.telephone = data.phone;
  }

  if (data.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: data.address.street,
      addressLocality: data.address.city,
      addressRegion: data.address.state,
      postalCode: data.address.postalCode,
      addressCountry: data.address.country || "BR",
    };
  }

  if (data.socialProfiles && data.socialProfiles.length > 0) {
    schema.sameAs = data.socialProfiles;
  }

  return schema;
}

/**
 * Generate WebSite schema with SearchAction
 * Uses default Fragranciaria URL if none provided
 */
export function generateWebsiteSchema(baseUrl?: string): object {
  const url = baseUrl || "https://fragranciaria.com.br";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fragranciaria",
    url: url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/produtos?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate ItemList schema for product listings (PLP)
 */
export function generateProductListSchema(
  products: ProductSchemaData[],
  listName: string,
  baseUrl: string
): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        url: `${baseUrl}/produto/${product.id}`,
        image: product.images[0]?.startsWith("http")
          ? product.images[0]
          : `${baseUrl}${product.images[0]}`,
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: product.price.toFixed(2),
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };
}

/**
 * Serialize schema to JSON-LD script tag content
 */
export function schemaToJsonLd(schema: object): string {
  return JSON.stringify(schema);
}

/**
 * Generate multiple schemas as a single array
 */
export function combineSchemas(...schemas: object[]): string {
  return JSON.stringify(schemas);
}
