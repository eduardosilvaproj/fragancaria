import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook client-side para descobrir o user atual.
export function useSupabaseUser() {
  return useQuery({
    queryKey: ["supabase-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return { user: null };
      return { user: data.user };
    },
    staleTime: 30_000,
  });
}

export default useSupabaseUser;
