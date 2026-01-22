import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Automation {
  automation_id: string;
  id?: string; // Alias for automation_id for compatibility
  user_id: string;
  name: string;
  description: string | null;
  trigger_type?: string | null; // Optional, no longer required
  action_type_type: string;
  action_type?: string; // Alias for action_type_type for compatibility
  is_enabled: boolean | null;
  is_active?: boolean | null; // Alias for is_enabled for compatibility
  config?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function useAutomations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["automations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Map database columns to interface with aliases for compatibility
      return (data || []).map((automation: any) => ({
        ...automation,
        id: automation.automation_id,
        action_type: automation.action_type_type,
        is_active: automation.is_enabled,
        config: typeof automation.config === 'string' 
          ? JSON.parse(automation.config || '{}') 
          : (automation.config || {}),
      })) as Automation[];
    },
    enabled: !!user,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (automation: Omit<Automation, "automation_id" | "id" | "created_at" | "updated_at" | "user_id">) => {
      if (!user?.id) {
        throw new Error("User must be authenticated to create an automation");
      }

      // Map interface fields to database columns
      const dbAutomation: any = {
        name: automation.name,
        description: automation.description,
        trigger_type: automation.trigger_type || null, // Optional, can be null
        action_type_type: automation.action_type_type || automation.action_type,
        is_enabled: automation.is_enabled !== undefined ? automation.is_enabled : (automation.is_active !== undefined ? automation.is_active : true),
        config: automation.config || {},
        user_id: null as any, // El trigger lo asignará automáticamente desde auth.uid()
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("automations")
        .insert(dbAutomation)
        .select()
        .single();
      if (error) throw error;
      
      // Map back to interface format (data from Supabase may have different field names)
      const automationData = data as any;
      // Parse config if it's a string
      const config = typeof automationData.config === 'string' 
        ? JSON.parse(automationData.config || '{}') 
        : (automationData.config || {});
      
      return {
        automation_id: automationData.automation_id || automationData.id,
        id: automationData.automation_id || automationData.id,
        user_id: automationData.user_id,
        name: automationData.name,
        description: automationData.description,
        action_type_type: automationData.action_type_type || automationData.action_type,
        action_type: automationData.action_type_type || automationData.action_type,
        is_enabled: automationData.is_enabled !== undefined ? automationData.is_enabled : automationData.is_active,
        is_active: automationData.is_enabled !== undefined ? automationData.is_enabled : automationData.is_active,
        config: config,
        created_at: automationData.created_at,
        updated_at: automationData.updated_at,
      } as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, automation_id, ...updates }: Partial<Automation> & { id?: string; automation_id?: string }) => {
      const targetId = automation_id || id;
      if (!targetId) {
        throw new Error("Automation ID is required");
      }

      // Map interface fields to database columns
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.action_type_type !== undefined) {
        dbUpdates.action_type_type = updates.action_type_type;
      } else if (updates.action_type !== undefined) {
        dbUpdates.action_type_type = updates.action_type;
      }
      if (updates.is_enabled !== undefined) {
        dbUpdates.is_enabled = updates.is_enabled;
      } else if (updates.is_active !== undefined) {
        dbUpdates.is_enabled = updates.is_active;
      }

      // @ts-expect-error - Type instantiation depth issue with Supabase's complex types
      const { data, error } = await supabase
        .from("automations")
        .update(dbUpdates)
        .eq("automation_id", targetId)
        .select()
        .single();
      if (error) throw error;
      
      // Map back to interface format (data from Supabase may have different field names)
      const automationData = data as any;
      return {
        automation_id: automationData.automation_id || automationData.id,
        id: automationData.automation_id || automationData.id,
        user_id: automationData.user_id,
        name: automationData.name,
        description: automationData.description,
        action_type_type: automationData.action_type_type || automationData.action_type,
        action_type: automationData.action_type_type || automationData.action_type,
        is_enabled: automationData.is_enabled !== undefined ? automationData.is_enabled : automationData.is_active,
        is_active: automationData.is_enabled !== undefined ? automationData.is_enabled : automationData.is_active,
        created_at: automationData.created_at,
        updated_at: automationData.updated_at,
      } as Automation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primero, borrar todos los automation_runs relacionados
      // Esto evita el error de foreign key constraint
      const { error: runsError } = await supabase
        .from("automation_runs")
        .delete()
        .eq("automation_id", id);
      
      if (runsError) {
        console.error("Error deleting automation runs:", runsError);
        // Continuar de todas formas, puede que no haya runs
      }

      // Luego, borrar la automatización
      const { error } = await supabase
        .from("automations")
        .delete()
        .eq("automation_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      queryClient.invalidateQueries({ queryKey: ["automation_runs"] });
    },
  });
}
