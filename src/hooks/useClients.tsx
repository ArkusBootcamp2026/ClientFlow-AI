import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching clients:", error);
        throw error;
      }
      // Map client_id to id, lead_source to source, and priority to status for consistency
      const mappedData = (data || []).map((client: any) => ({
        ...client,
        id: client.client_id || client.id,
        source: client.source || client.lead_source || null,
        status: client.priority || client.status || null, // Use priority first, then fallback to status
      }));
      return mappedData as Client[];
    },
    enabled: !!user,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (client: Omit<Client, "id" | "created_at" | "updated_at" | "user_id">) => {
      if (!user?.id) {
        throw new Error("User must be authenticated to create a client");
      }

      const { data, error } = await supabase
        .from("clients")
        .insert({ 
          ...client, 
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_contact: new Date().toISOString()
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string } & Record<string, any>): Promise<any> => {
      const { id, ...updates } = input;
      const updateData: any = { ...updates, updated_at: new Date().toISOString() };
      // @ts-expect-error - Type instantiation depth issue with Supabase's complex types
      const { data, error } = await (supabase
        .from("clients")
        .update(updateData)
        .eq("client_id", id)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("client_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
