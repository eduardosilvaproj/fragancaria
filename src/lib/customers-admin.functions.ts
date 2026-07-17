import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server fns para o painel /admin/clientes. Mesmo padrao de
// orders-admin.functions.ts: requireAdmin + supabaseAdmin (service role,
// bypassa RLS) + validator Zod + lista de colunas explicita.
//
// Bloqueio de login: alem de marcar `blocked` em customers, chamamos
// supabaseAdmin.auth.admin.updateUserById com ban_duration para banir o
// usuario no proprio Supabase Auth (o signIn passa a ser recusado). Cliente
// sem auth_user_id (nunca criou conta) so recebe a flag.

const customerIdSchema = z.string().uuid();

// Igual a orders-admin: PostgREST .or() injeta sintaxe crua, entao input
// nao confiavel NUNCA passa verbatim. Removemos a classe de caracteres que
// nao tem significado em busca por nome/email e e o unico caminho de
// injecao de sintaxe PostgREST.
function sanitizeSearch(raw: string): string {
  return raw
    .replace(/[(),."'`\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const BAN_DURATION_BLOCKED = "876000h"; // ~100 anos
const BAN_DURATION_NONE = "none";

export type AdminCustomerRow = {
  id: string;
  isGuest: boolean;
  authUserId: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  birthDate: string | null;
  blocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string;
};

export type AdminOrderAddress = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
} | null;

export type AdminCustomerOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCpf: string | null;
  trackingCode: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  shippingAddress: AdminOrderAddress;
};

export type AdminCustomerAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

export type AdminCustomerNote = {
  id: string;
  adminEmail: string | null;
  note: string;
  createdAt: string;
};

export type AdminCustomerDetail = {
  customer: AdminCustomerRow;
  orders: AdminCustomerOrder[];
  addresses: AdminCustomerAddress[];
  notes: AdminCustomerNote[];
};

function normalizeOrderAddress(raw: unknown): AdminOrderAddress {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    street: str(a.street),
    number: str(a.number),
    complement: str(a.complement),
    neighborhood: str(a.neighborhood),
    city: str(a.city),
    state: str(a.state),
    cep: str(a.cep) || str(a.zipCode),
  };
}

function mapOrderRow(o: Record<string, unknown>): AdminCustomerOrder {
  const rawItems = Array.isArray(o.items) ? (o.items as Array<Record<string, unknown>>) : [];
  return {
    id: String(o.id),
    status: String(o.status ?? "pending"),
    paymentStatus: String(o.payment_status ?? "pending"),
    total: Number(o.total ?? 0),
    createdAt: String(o.created_at ?? ""),
    customerName: (o.customer_name as string | null) ?? null,
    customerEmail: (o.customer_email as string | null) ?? null,
    customerPhone: (o.customer_phone as string | null) ?? null,
    customerCpf: (o.customer_cpf as string | null) ?? null,
    trackingCode: (o.tracking_code as string | null) ?? null,
    items: rawItems.map((it) => ({
      name: String(it.title ?? it.name ?? "Produto"),
      quantity: Number(it.quantity ?? 1),
      price: Number(it.price ?? 0),
    })),
    shippingAddress: normalizeOrderAddress(o.shipping_address),
  };
}

const CUSTOMER_COLUMNS = [
  "id",
  "auth_user_id",
  "email",
  "name",
  "phone",
  "cpf",
  "birth_date",
  "blocked",
  "blocked_at",
  "blocked_reason",
  "loyalty_points",
  "loyalty_tier",
  "created_at",
].join(", ");

function mapCustomer(r: Record<string, unknown>): AdminCustomerRow {
  return {
    id: String(r.id),
    isGuest: false,
    authUserId: (r.auth_user_id as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    name: (r.name as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    cpf: (r.cpf as string | null) ?? null,
    birthDate: (r.birth_date as string | null) ?? null,
    blocked: Boolean(r.blocked),
    blockedAt: (r.blocked_at as string | null) ?? null,
    blockedReason: (r.blocked_reason as string | null) ?? null,
    loyaltyPoints: Number(r.loyalty_points ?? 0),
    loyaltyTier: (r.loyalty_tier as string) ?? "bronze",
    createdAt: String(r.created_at ?? ""),
  };
}

function mapGuestCustomer(
  email: string,
  name: string | null,
  phone: string | null,
  createdAt: string,
): AdminCustomerRow {
  return {
    id: "guest:" + email.toLowerCase(),
    isGuest: true,
    authUserId: null,
    email,
    name: name || null,
    phone: phone || null,
    cpf: null,
    birthDate: null,
    blocked: false,
    blockedAt: null,
    blockedReason: null,
    loyaltyPoints: 0,
    loyaltyTier: "bronze",
    createdAt,
  };
}

export const listCustomersForAdmin = createServerFn({ method: "GET" })
  .validator(
    (d: unknown) =>
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().positive().max(200).optional(),
          offset: z.number().int().nonnegative().optional(),
        })
        .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; data: { customers: AdminCustomerRow[]; total: number } }
      | { success: false; error: string }
    > => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const limit = data.limit ?? 50;
        const offset = data.offset ?? 0;

        // 1. E-mails já cadastrados, para não duplicar guests na lista.
        let emailQuery = db
          .from("customers")
          .select("email");

        if (data.search && data.search.length > 0) {
          const cleaned = sanitizeSearch(data.search);
          if (cleaned.length > 0) {
            const ilike = "%" + cleaned.replace(/[%_]/g, (c) => "\\" + c) + "%";
            emailQuery = emailQuery.or(
              ["name.ilike." + ilike, "email.ilike." + ilike].join(","),
            );
          }
        }

        const { data: customerRows, error } = await emailQuery;
        if (error) return { success: false, error: error.message };

        // 2. Clientes cadastrados (com paginação aplicada)
        let paginatedQuery = db
          .from("customers")
          .select(CUSTOMER_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (data.search && data.search.length > 0) {
          const cleaned = sanitizeSearch(data.search);
          if (cleaned.length > 0) {
            const ilike = "%" + cleaned.replace(/[%_]/g, (c) => "\\" + c) + "%";
            paginatedQuery = paginatedQuery.or(
              ["name.ilike." + ilike, "email.ilike." + ilike].join(","),
            );
          }
        }

        const { data: paginatedRows, count, error: pageError } = await paginatedQuery;
        if (pageError) return { success: false, error: pageError.message };
        const registeredCustomers = (
          (paginatedRows ?? []) as Array<Record<string, unknown>>
        ).map(mapCustomer);

        // 3. Compradores sem conta (guests): emails únicos de pedidos que
        //    não aparecem em customers. Se não há busca, trazemos no máximo
        //    os 20 mais recentes para não inflarr a lista sem necessidade.
        const guestLimit = data.search ? limit : 20;
        const guestOffset = data.search ? offset : 0;

        // Pega emails de pedidos que NÃO estão na customers
        const { data: guestRows } = await db
          .from("orders")
          .select("customer_email, customer_name, customer_phone, created_at")
          .not("customer_email", "is", null)
          .order("created_at", { ascending: false })
          .limit(300);

        const registeredEmails = new Set(
          ((customerRows ?? []) as Array<Record<string, unknown>>).map(
            (r) => ((r.email as string) || "").toLowerCase().trim(),
          ),
        );

        const guestMap = new Map<
          string,
          { email: string; name: string | null; phone: string | null; createdAt: string }
        >();

        for (const row of (guestRows ?? []) as Array<Record<string, unknown>>) {
          const email = ((row.customer_email as string) || "").toLowerCase().trim();
          if (!email || registeredEmails.has(email) || guestMap.has(email)) continue;
          const search = data.search || "";
          const matchesSearch =
            !search ||
            email.includes(search.toLowerCase()) ||
            ((row.customer_name as string) || "")
              .toLowerCase()
              .includes(search.toLowerCase());
          if (!matchesSearch) continue;
          guestMap.set(email, {
            email,
            name: (row.customer_name as string) || null,
            phone: (row.customer_phone as string) || null,
            createdAt: String(row.created_at ?? ""),
          });
        }

        const guestList = Array.from(guestMap.values())
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(guestOffset, guestOffset + guestLimit)
          .map((g) => mapGuestCustomer(g.email, g.name, g.phone, g.createdAt));

        // Merge: clientes com conta primeiro, depois guests
        const customers = [...registeredCustomers, ...guestList];
        const registeredCount = count ?? registeredCustomers.length;
        const total = registeredCount + guestMap.size;

        return {
          success: true,
          data: { customers, total },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const getCustomerForAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z.object({ customerId: z.string().min(1) }).parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; data: AdminCustomerDetail }
      | { success: false; error: string }
    > => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const isGuest = data.customerId.startsWith("guest:");
        let customer: AdminCustomerRow;
        let guestEmail = "";

        if (isGuest) {
          guestEmail = data.customerId.slice("guest:".length).toLowerCase();
          const { data: orderRows } = await db
            .from("orders")
            .select("customer_email, customer_name, customer_phone, created_at")
            .eq("customer_email", guestEmail)
            .order("created_at", { ascending: false })
            .limit(1);
          const first = (orderRows ?? [])[0] as Record<string, unknown> | undefined;
          if (!first) return { success: false, error: "Cliente não encontrado" };
          customer = mapGuestCustomer(
            guestEmail,
            (first.customer_name as string) || null,
            (first.customer_phone as string) || null,
            String(first.created_at ?? ""),
          );
        } else {
          const { data: row, error } = await db
            .from("customers")
            .select(CUSTOMER_COLUMNS)
            .eq("id", data.customerId)
            .single();
          if (error || !row) {
            return { success: false, error: "Cliente não encontrado" };
          }
          customer = mapCustomer(row);
        }

        const orConditions: string[] = [];
        if (!isGuest && customer.authUserId)
          orConditions.push("auth_user_id.eq." + customer.authUserId);
        if (customer.email) {
          const safeEmail = customer.email.replace(/[(),."'`\\]/g, "");
          if (safeEmail.length > 0)
            orConditions.push("customer_email.eq." + safeEmail);
        }

        let orders: AdminCustomerOrder[] = [];
        if (orConditions.length > 0) {
          const { data: orderRows } = await db
            .from("orders")
            .select(
              "id, status, payment_status, total, created_at, customer_name, customer_email, customer_phone, customer_cpf, tracking_code, items, shipping_address",
            )
            .or(orConditions.join(","))
            .order("created_at", { ascending: false })
            .limit(100);
          orders = ((orderRows ?? []) as Array<Record<string, unknown>>).map(mapOrderRow);
        }

        let addresses: AdminCustomerAddress[] = [];
        if (!isGuest && customer.authUserId) {
          const { data: addressRows } = await db
            .from("customer_addresses")
            .select("id, label, recipient_name, cep, street, number, complement, neighborhood, city, state, is_default")
            .eq("user_id", customer.authUserId)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false });
          addresses = ((addressRows ?? []) as Array<Record<string, unknown>>).map((address) => ({
            id: String(address.id),
            label: (address.label as string | null) ?? null,
            recipientName: String(address.recipient_name ?? ""),
            cep: String(address.cep ?? ""),
            street: String(address.street ?? ""),
            number: String(address.number ?? ""),
            complement: (address.complement as string | null) ?? null,
            neighborhood: String(address.neighborhood ?? ""),
            city: String(address.city ?? ""),
            state: String(address.state ?? ""),
            isDefault: Boolean(address.is_default),
          }));
        }

        const { data: noteRows } = await db
          .from("customer_notes")
          .select("id, admin_email, note, created_at")
          .eq("customer_id", data.customerId)
          .order("created_at", { ascending: false });
        const notes: AdminCustomerNote[] = (
          (noteRows ?? []) as Array<Record<string, unknown>>
        ).map((n) => ({
          id: String(n.id),
          adminEmail: (n.admin_email as string | null) ?? null,
          note: String(n.note ?? ""),
          createdAt: String(n.created_at ?? ""),
        }));

        return { success: true, data: { customer, orders, addresses, notes } };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const updateCustomerForAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        customerId: z.string().min(1),
        patch: z
          .object({
            name: z.string().max(120).nullable().optional(),
            phone: z.string().max(40).nullable().optional(),
            cpf: z.string().max(20).nullable().optional(),
            birthDate: z.string().max(20).nullable().optional(),
          })
          .strict(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        if (data.customerId.startsWith("guest:")) {
          return {
            success: false,
            error: "Compradores sem conta não podem ser editados aqui. Cadastre-os primeiro.",
          };
        }

        const updatePayload: Record<string, unknown> = {};
        if (data.patch.name !== undefined) updatePayload.name = data.patch.name;
        if (data.patch.phone !== undefined)
          updatePayload.phone = data.patch.phone;
        if (data.patch.cpf !== undefined) updatePayload.cpf = data.patch.cpf;
        if (data.patch.birthDate !== undefined)
          updatePayload.birth_date = data.patch.birthDate || null;

        if (Object.keys(updatePayload).length === 0) {
          return { success: false, error: "nenhum campo para atualizar" };
        }

        const { error } = await db
          .from("customers")
          .update(updatePayload)
          .eq("id", data.customerId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

const adminOrderAddressSchema = z.object({
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(120).optional().nullable(),
  neighborhood: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  state: z.string().length(2),
  cep: z.string().min(8).max(9),
});

const adminAddressSchema = z.object({
  id: z.string().uuid(),
  label: z.string().max(60).optional().nullable(),
  recipientName: z.string().min(1).max(120),
  cep: z.string().min(8).max(9),
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(120).optional().nullable(),
  neighborhood: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  state: z.string().length(2),
  isDefault: z.boolean().optional(),
});

export const updateOrderAddressForAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        address: adminOrderAddressSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const db = supabaseAdmin as any;

      const patch = {
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement ?? "",
        neighborhood: data.address.neighborhood,
        city: data.address.city,
        state: data.address.state.toUpperCase(),
        cep: data.address.cep.replace(/\D/g, ""),
        zipCode: data.address.cep.replace(/\D/g, ""),
      };

      const { error } = await db
        .from("orders")
        .update({ shipping_address: patch })
        .eq("id", data.orderId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });

export const updateCustomerAddressForAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        customerId: z.string().uuid(),
        address: adminAddressSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const db = supabaseAdmin as any;

      const { data: customer, error: customerErr } = await db
        .from("customers")
        .select("auth_user_id")
        .eq("id", data.customerId)
        .single();
      if (customerErr || !customer?.auth_user_id) {
        return { success: false, error: "Cliente sem conta vinculada para editar endereços" };
      }

      if (data.address.isDefault) {
        await db
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("user_id", customer.auth_user_id)
          .eq("is_default", true)
          .neq("id", data.address.id);
      }

      const patch = {
        label: data.address.label ?? null,
        recipient_name: data.address.recipientName,
        cep: data.address.cep.replace(/\D/g, ""),
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement ?? null,
        neighborhood: data.address.neighborhood,
        city: data.address.city,
        state: data.address.state.toUpperCase(),
        is_default: data.address.isDefault ?? false,
      };

      const { error } = await db
        .from("customer_addresses")
        .update(patch)
        .eq("id", data.address.id)
        .eq("user_id", customer.auth_user_id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });

export const setCustomerBlocked = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        customerId: z.string().min(1),
        blocked: z.boolean(),
        reason: z.string().max(280).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; warning?: string } | { success: false; error: string }
    > => {
      try {
        if (data.customerId.startsWith("guest:")) {
          return {
            success: false,
            error: "Compradores sem conta não podem ser bloqueados.",
          };
        }

        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const { data: row, error: fetchErr } = await db
          .from("customers")
          .select("id, auth_user_id")
          .eq("id", data.customerId)
          .single();
        if (fetchErr || !row) {
          return { success: false, error: "Cliente não encontrado" };
        }

        const { error } = await db
          .from("customers")
          .update({
            blocked: data.blocked,
            blocked_at: data.blocked ? new Date().toISOString() : null,
            blocked_reason: data.blocked ? data.reason || null : null,
          })
          .eq("id", data.customerId);
        if (error) return { success: false, error: error.message };

        const authUserId = row.auth_user_id as string | null;
        if (!authUserId) {
          return {
            success: true,
            warning:
              "Cliente marcado, mas não possui conta de login para bloquear no Auth.",
          };
        }

        const { error: banErr } = await db.auth.admin.updateUserById(
          authUserId,
          {
            ban_duration: data.blocked ? BAN_DURATION_BLOCKED : BAN_DURATION_NONE,
          },
        );
        if (banErr) {
          return {
            success: true,
            warning:
              "Flag atualizada, mas falhou ao aplicar o ban no Auth: " +
              banErr.message,
          };
        }

        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const addCustomerNote = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        customerId: z.string().min(1),
        note: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; data: AdminCustomerNote } | { success: false; error: string }
    > => {
      try {
        if (data.customerId.startsWith("guest:")) {
          return {
            success: false,
            error: "Compradores sem conta não podem receber notas.",
          };
        }

        const { requireAdmin } = await import("@/lib/admin-auth");
        const admin = await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const { data: inserted, error } = await db
          .from("customer_notes")
          .insert({
            customer_id: data.customerId,
            admin_email: admin.email || null,
            note: data.note,
          })
          .select("id, admin_email, note, created_at")
          .single();
        if (error || !inserted) {
          return { success: false, error: error?.message || "erro ao salvar nota" };
        }

        return {
          success: true,
          data: {
            id: String(inserted.id),
            adminEmail: (inserted.admin_email as string | null) ?? null,
            note: String(inserted.note ?? ""),
            createdAt: String(inserted.created_at ?? ""),
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

const VALID_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
type LoyaltyTier = (typeof VALID_TIERS)[number];

export const setCustomerLoyalty = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        customerId: z.string().min(1),
        points: z.number().int().min(0),
        tier: z.enum(VALID_TIERS),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        if (data.customerId.startsWith("guest:")) {
          return {
            success: false,
            error: "Compradores sem conta não possuem programa de fidelidade.",
          };
        }

        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const { error } = await db
          .from("customers")
          .update({
            loyalty_points: data.points,
            loyalty_tier: data.tier,
          })
          .eq("id", data.customerId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );
