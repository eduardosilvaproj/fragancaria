import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAffiliateRegistrationReceivedEmail } from "./affiliate-emails.functions";

const registerSchema = z.object({
  full_name: z.string().min(2, "Nome completo obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
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
});

export const registerAffiliate = createServerFn({ method: "POST" })
  .validator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Credenciais do Supabase não configuradas no servidor");
      }

      const publicClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data: authData, error: authError } = await publicClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: "affiliate",
          },
        },
      });

      if (authError) {
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
          email: data.email,
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
        throw new Error(affiliateError.message);
      }

      sendAffiliateRegistrationReceivedEmail({
        email: data.email,
        fullName: data.full_name,
      }).catch((err) => console.error("[registerAffiliate] e-mail não enviado:", err));

      return {
        success: true as const,
        data: {
          userId: authData.user.id,
          affiliateId: affiliate.id,
        },
      };
    } catch (e: any) {
      console.error("[registerAffiliate] erro:", e);
      return {
        success: false as const,
        error: e?.message || "Erro desconhecido ao realizar cadastro",
      };
    }
  });
