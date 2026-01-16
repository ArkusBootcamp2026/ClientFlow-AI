import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useDeals } from "@/hooks/useDeals";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export function PriorityClients() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: deals = [] } = useDeals();

  // Get deals count per client and sort by priority (status)
  const priorityClients = useMemo(() => {
    return clients
      .map((client) => {
        const clientDeals = deals.filter((deal: any) => {
          const dealClientId = deal.client_id || deal.clients?.id;
          return String(dealClientId) === String(client.id);
        });
        return {
          ...client,
          deals: clientDeals.length,
          priority: client.status || "medium",
        };
      })
      .sort((a, b) => {
        // Sort by priority: high > medium > low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
        if (bPriority !== aPriority) return bPriority - aPriority;
        // If same priority, sort by number of deals
        return b.deals - a.deals;
      })
      .slice(0, 5); // Show top 5
  }, [clients, deals]);

  const handleClientClick = (clientId: string) => {
    navigate("/clients");
  };

  if (clientsLoading) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 shadow-card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (priorityClients.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 shadow-card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">AI Priority Clients</h3>
          <span className="text-xs text-muted-foreground">Sorted by priority</span>
        </div>
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-sm">No clients yet. Add your first client to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border p-5 shadow-card animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">AI Priority Clients</h3>
        <span className="text-xs text-muted-foreground">Sorted by priority</span>
      </div>
      <div className="space-y-3">
        {priorityClients.map((client, index) => (
          <div
            key={client.id}
            onClick={() => handleClientClick(client.id)}
            className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
              {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{client.name}</p>
              <p className="text-xs text-muted-foreground truncate">{client.company || "—"}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {client.notes ? (
                  <span className="italic">{client.notes.length > 50 ? `${client.notes.substring(0, 50)}...` : client.notes}</span>
                ) : (
                  <span className="text-muted-foreground/60">No description</span>
                )}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{client.deals} {client.deals === 1 ? "deal" : "deals"}</p>
              <p className="text-xs text-muted-foreground capitalize">{client.source || "—"}</p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                client.priority === "high" && "border-destructive/50 text-destructive bg-destructive/10",
                client.priority === "medium" && "border-warning/50 text-warning bg-warning/10",
                client.priority === "low" && "border-muted-foreground/50 text-muted-foreground"
              )}
            >
              {client.priority}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
