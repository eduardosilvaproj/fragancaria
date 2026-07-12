import { fetchActiveProducts } from "./products.functions";

const BASE_URL = "https://fragranciaria.com.br";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

// Categorias estáticas (não mudam frequentemente)
const STATIC_CATEGORIES = [
  { name: "Shampoos", slug: "shampoos" },
  { name: "Condicionadores", slug: "condicionadores" },
  { name: "Máscaras", slug: "mascaras" },
  { name: "Leave-in", slug: "leave-in" },
  { name: "Óleos", slug: "oleos" },
  { name: "Coloração", slug: "coloracao" },
  { name: "Kits", slug: "kits" },
  { name: "Finalizadores", slug: "finalizadores" },
  { name: "Tratamentos", slug: "tratamentos" },
  { name: "Maquiagem", slug: "maquiagem" },
];

export async function generateSitemapUrls(): Promise<SitemapUrl[]> {
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
  STATIC_CATEGORIES.forEach((category) => {
    urls.push({
      loc: `${BASE_URL}/produtos?productType=${encodeURIComponent(category.name)}`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.8,
    });
  });

  // Product pages from database
  try {
    const products = await fetchActiveProducts();
    products.forEach((product) => {
      urls.push({
        loc: `${BASE_URL}/produto/${product.id}`,
        lastmod: today,
        changefreq: "weekly",
        priority: 0.7,
      });
    });
  } catch (error) {
    console.error("Error fetching products for sitemap:", error);
  }

  return urls;
}

export async function generateSitemapXml(): Promise<string> {
  const urls = await generateSitemapUrls();

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
