import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAffiliateRegistrationReceivedEmail } from "./affiliate-emails.functions";

const registerSchema = z.object({
  full_name: z.string().min(2, "Nome completo obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres").optional().nullable(),
  phone: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_number: z.string().optional().nullable(),
  address_complement: z.string().optional().nullable(),
  address_neighborhood: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip: z.string().optional().nullable(),
  pix_key: z.string().optional().nullable(),
  pix_key_type: z.enum(["cpf", "email", "phone", "random", "cnpj"]).optional().nullable(),
  instagram: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  accepted_terms: z.boolean().refine((val) => val === true, "Você deve aceitar os termos"),
  sessionUserId: z.string().uuid().optional().nullable(),
  sessionEmail: z.string().email().optional().nullable(),
});

type RegisterAffiliateResult =
  | { success: true; state: "registered"; data: { userId: string; affiliateId: string } }
  | { success: false; state: "needs_login"; email: string; loginUrl: string; error: string }
  | { success: false; state: "needs_confirmation"; email: string; resendUrl: string; error: string }
  | { success: false; state: "already_affiliate"; affiliateId: string; error: string }
  | { success: false; state: "invalid_session"; error: string }
  | { success: false; state: "conflict"; error: string }
  | { success: false; state: "error"; error: string };

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(error.message);
  return (data.users ?? []).find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export const registerAffiliate = createServerFn({ method: "POST" })
  .validator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }): Promise<RegisterAffiliateResult> => {
    try {
      const email = data.email.toLowerCase().trim();
      const sessionUserId = data.sessionUserId ?? null;
      const sessionEmail = data.sessionEmail?.toLowerCase().trim() ?? null;
      const existingUser = await findAuthUserByEmail(email);

      if (existingUser) {
        const isConfirmed = Boolean(existingUser.email_confirmed_at);
        const isLoggedAsSameUser = Boolean(sessionUserId && existingUser.id === sessionUserId);

        const { data: existingAffiliate, error: affiliateLookupError } = await supabaseAdmin
          .from("affiliates")
          .select("id, user_id")
          .eq("email", email)
          .maybeSingle();

        if (affiliateLookupError) {
          return { success: false, state: "error", error: "Não foi possível verificar o cadastro de afiliado." };
        }

        if (existingAffiliate) {
          return {
            success: false,
            state: "already_affiliate",
            affiliateId: existingAffiliate.id,
            error: "Este e-mail já está vinculado a um cadastro de afiliado.",
          };
        }

        if (!isConfirmed) {
          return {
            success: false,
            state: "needs_confirmation",
            email,
            resendUrl: "/afiliado/login",
            error: "Sua conta ainda não foi confirmada. Confirme o e-mail antes de continuar ou solicite o reenvio da confirmação no login.",
          };
        }

        if (!isLoggedAsSameUser) {
          return {
            success: false,
            state: "needs_login",
            email,
            loginUrl: "/afiliado/login",
            error: "Você já tem conta no site. Faça login para continuar o cadastro de afiliado.",
          };
        }

        const { data: affiliate, error: affiliateError } = await supabaseAdmin
          .from("affiliates")
          .insert({
            user_id: existingUser.id,
            full_name: data.full_name,
            email,
            phone: data.phone || null,
            cpf: data.cpf || null,
            birth_date: data.birth_date || null,
            address_street: data.address_street || null,
            address_number: data.address_number || null,
            address_complement: data.address_complement || null,
            address_neighborhood: data.address_neighborhood || null,
            address_city: data.address_city || null,
            address_state: data.address_state || null,
            address_zip: data.address_zip || null,
            pix_key: data.pix_key || null,
            pix_key_type: data.pix_key_type || null,
            instagram: data.instagram || null,
            youtube: data.youtube || null,
            tiktok: data.tiktok || null,
            website: data.website || null,
            accepted_terms: data.accepted_terms,
            accepted_terms_at: data.accepted_terms ? new Date().toISOString() : null,
            status: "pending",
          })
          .select()
          .single();

        if (affiliateError) {
          return { success: false, state: "conflict", error: affiliateError.message };
        }

        sendAffiliateRegistrationReceivedEmail({
          email,
          fullName: data.full_name,
        }).catch((err) => console.error("[registerAffiliate] e-mail não enviado:", err));

        return {
          success: true,
          state: "registered",
          data: {
            userId: existingUser.id,
            affiliateId: affiliate.id,
          },
        };
      }

      if (!data.password) {
        return {
          success: false,
          state: "needs_login",
          email,
          loginUrl: "/afiliado/login",
          error: "Você já tem conta no site. Faça login para continuar o cadastro de afiliado.",
        };
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.full_name,
          role: "affiliate",
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already been registered")) {
          return {
            success: false,
            state: "needs_login",
            email,
            loginUrl: "/afiliado/login",
            error: "Você já tem conta no site. Faça login para continuar o cadastro de afiliado.",
          };
        }
        throw new Error(authError.message);
      }
      if (!authData.user) {
        throw new Error("Erro ao criar usuário no Auth");
      }

      const { data: affiliate, error: affiliateError } = await supabaseAdmin
        .from("affiliates")
        .insert({
          user_id: authData.user.id,
          full_name: data.full_name,
          email,
          phone: data.phone || null,
          cpf: data.cpf || null,
          birth_date: data.birth_date || null,
          address_street: data.address_street || null,
          address_number: data.address_number || null,
          address_complement: data.address_complement || null,
          address_neighborhood: data.address_neighborhood || null,
          address_city: data.address_city || null,
          address_state: data.address_state || null,
          address_zip: data.address_zip || null,
          pix_key: data.pix_key || null,
          pix_key_type: data.pix_key_type || null,
          instagram: data.instagram || null,
          youtube: data.youtube || null,
          tiktok: data.tiktok || null,
          website: data.website || null,
          accepted_terms: data.accepted_terms,
          accepted_terms_at: data.accepted_terms ? new Date().toISOString() : null,
          status: "pending",
        })
        .select()
        .single();

      if (affiliateError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { success: false, state: "conflict", error: affiliateError.message };
      }

      sendAffiliateRegistrationReceivedEmail({
        email,
        fullName: data.full_name,
      }).catch((err) => console.error("[registerAffiliate] e-mail não enviado:", err));

      return {
        success: true,
        state: "registered",
        data: {
          userId: authData.user.id,
          affiliateId: affiliate.id,
        },
      };
    } catch (e: any) {
      console.error("[registerAffiliate] erro:", e);
      return {
        success: false,
        state: "error",
        error: e?.message || "Erro desconhecido ao realizar cadastro",
      };
    }
  });
