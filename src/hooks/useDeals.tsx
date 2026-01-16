import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Deal {
  id: string;
  title: string;
  amount: number;
  client_id: string | null;
  stage: string;
  priority: string | null;
  description: string | null;
  created_at: string;
}

export function useDeals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("*, clients(name)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Error fetching deals:", error);
        throw error;
      }
      console.log("Deals fetched:", data);
      return data || [];
    },
    enabled: !!user,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (deal: Omit<Deal, "id" | "created_at">) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("deals")
        .insert({ ...deal, user_id: user.id })
        .select("*, clients(name)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", user?.id] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*, clients(name)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", user?.id] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { error } = await supabase
        .from("deals")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", user?.id] });
    },
  });
}
