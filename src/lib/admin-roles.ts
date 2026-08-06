// =====================================================
// Mapa único: área administrativa -> papéis que acessam.
// =====================================================
// Nenhuma server function deve repetir essa lista. Se a regra mudar,
// edite aqui — não em cada fn. Este projeto já teve três casos de valor
// duplicado que divergiu sem ninguém ver (contador do menu, categorias
// do menu, productType).

export const ADMIN_ROLES = {
  total: "total",
  social: "social",
  logistica: "logistica",
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

// Áreas mapeadas por arquivo de server fns. O primeiro papel da lista é o
// dono; os demais são os que também podem chamar.
export const ADMIN_AREA_ROLES: Record<string, readonly AdminRole[]> = {
  // --- Só total (dados sensíveis: pagamento, cliente, financeiro) ---
  orders: [ADMIN_ROLES.total],
  customers: [ADMIN_ROLES.total],
  payments: [ADMIN_ROLES.total],
  financeiro: [ADMIN_ROLES.total],
  refund: [ADMIN_ROLES.total],
  returns: [ADMIN_ROLES.total],
  coupons: [ADMIN_ROLES.total],
  affiliates: [ADMIN_ROLES.total],
  affiliatePayouts: [ADMIN_ROLES.total],
  affiliateSettings: [ADMIN_ROLES.total],
  storeSettings: [ADMIN_ROLES.total],
  auditLogs: [ADMIN_ROLES.total],
  adminUsers: [ADMIN_ROLES.total],

  // --- Total + logistica (envios/etiquetas; consultam orders internamente) ---
  logistics: [ADMIN_ROLES.total, ADMIN_ROLES.logistica],
  shipping: [ADMIN_ROLES.total, ADMIN_ROLES.logistica],
  // shippingSettings guarda sender_info (CNPJ, endereço) e credenciais do
  // Melhor Envio — configuração, não operação. Só total.
  shippingSettings: [ADMIN_ROLES.total],

  // --- Total + social (produtos, categorias, imagens, SAC, social) ---
  products: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  categories: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  productImages: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  productEnrich: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  sac: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  socialPublish: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  reviews: [ADMIN_ROLES.total, ADMIN_ROLES.social],
  whatsapp: [ADMIN_ROLES.total, ADMIN_ROLES.social],
};

// Acesso genérico para layout: um papel pode acessar a área se a lista
// incluir o papel.
export function roleAllowsArea(
  role: AdminRole,
  area: keyof typeof ADMIN_AREA_ROLES,
): boolean {
  return ADMIN_AREA_ROLES[area]?.includes(role) ?? false;
}

// Áreas acessíveis para um papel. Útil para filtrar a sidebar no cliente.
export function allowedAreasForRole(
  role: AdminRole,
): Array<keyof typeof ADMIN_AREA_ROLES> {
  return (
    Object.keys(ADMIN_AREA_ROLES) as Array<keyof typeof ADMIN_AREA_ROLES>
  ).filter((area) => ADMIN_AREA_ROLES[area].includes(role));
}
