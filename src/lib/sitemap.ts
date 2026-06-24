import { PRODUCTS, CATEGORIES } from "@/data/products";

const BASE_URL = "https://fragranciaria.com.br";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

export function generateSitemapUrls(): SitemapUrl[] {
  const today = new Date().toISOString().split("T")[0];

  const urls: SitemapUrl[] = [
    // Home
    {
      loc: BASE_URL,
      lastmod: today,
      changefreq: "daily",
      priority: 1.0,
    },
    // Products listing
    {
      loc: `${BASE_URL}/produtos`,
      lastmod: today,
      changefreq: "daily",
      priority: 0.9,
    },
  ];

  // Category pages
  CATEGORIES.forEach((category) => {
    urls.push({
      loc: `${BASE_URL}/produtos?productType=${encodeURIComponent(category.name)}`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.8,
    });
  });

  // Product pages
  PRODUCTS.forEach((product) => {
    urls.push({
      loc: `${BASE_URL}/produto/${product.id}`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.7,
    });
  });

  return urls;
}

export function generateSitemapXml(): string {
  const urls = generateSitemapUrls();

  const urlsXml = urls
    .map(
      (url) => `
  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ""}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ""}
  </url>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
}

// For static generation, export the XML content
export const SITEMAP_XML = generateSitemapXml();
