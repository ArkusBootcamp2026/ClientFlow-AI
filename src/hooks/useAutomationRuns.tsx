import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AutomationRun {
  id: string;
  automation_id: string;
  user_id: string;
  automation_status: string;
  started_at: string;
  finished_at: string;
  error_message: string | null;
  result_data: any | null;
}

/**
 * Get the latest successful run for a specific automation
 */
export function useLatestAutomationRun(automationId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["automation-runs", automationId, user?.id],
    queryFn: async () => {
      if (!automationId || !user?.id) {
        return null;
      }
      
      const { data, error } = await ((supabase as any)
        .from("automation_runs")
        .select("*")
        .eq("automation_id", automationId)
        .eq("automation_status", "completed")
        .order("finished_at", { ascending: false })
        .limit(1));

      if (error) {
        // If no runs found, that's okay
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      // Handle both single() and array responses
      const runData = Array.isArray(data) ? data[0] : data;
      
      if (!runData) {
        return null;
      }
      
      // Parse result_data if it's a string
      if (runData.result_data && typeof runData.result_data === 'string') {
        try {
          runData.result_data = JSON.parse(runData.result_data);
        } catch (e) {
          console.error("[useLatestAutomationRun] Error parsing result_data:", e);
        }
      }
      
      return runData as AutomationRun | null;
    },
    enabled: !!automationId && !!user,
  });
}

/**
 * Get all runs for a specific automation
 */
export function useAutomationRuns(automationId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["automation-runs-list", automationId, user?.id],
    queryFn: async () => {
      if (!automationId || !user?.id) return [];
      
      const { data, error } = await ((supabase as any)
        .from("automation_runs")
        .select("*")
        .eq("automation_id", automationId)
        .order("finished_at", { ascending: false })
        .limit(10));

      if (error) throw error;
      return (data || []) as AutomationRun[];
    },
    enabled: !!automationId && !!user,
  });
}
