import { Users, Clock, Target } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PriorityClients } from "@/components/dashboard/PriorityClients";
import { useClients } from "@/hooks/useClients";
import { useDeals } from "@/hooks/useDeals";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: deals = [], isLoading: dealsLoading } = useDeals();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalClients = clients.length;
    
    // Clients in Follow-up (unique clients with deals in "Follow-up" stage)
    const followUpDeals = deals.filter((deal: any) => deal.stage === "Follow-up");
    const followUpClientIds = new Set(
      followUpDeals
        .map((deal: any) => deal.client_id || deal.clients?.id)
        .filter((id: any) => id !== null && id !== undefined)
    );
    const clientsInFollowUp = followUpClientIds.size;

    // Closed deals this month
    const nowMonth = new Date();
    const firstDayOfMonth = new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1);
    const closedThisMonth = deals.filter((deal: any) => {
      if (deal.stage !== "Closed" && deal.stage !== "closed" && deal.stage !== "won") return false;
      const dealDate = new Date(deal.created_at);
      return dealDate >= firstDayOfMonth;
    });

    return [
      {
        title: "Total Clients",
        value: totalClients.toString(),
        change: totalClients > 0 ? `${totalClients} active clients` : "No clients yet",
        changeType: "neutral" as const,
        icon: Users,
      },
      {
        title: "Clients in Follow-up",
        value: clientsInFollowUp.toString(),
        change: clientsInFollowUp > 0 ? `${followUpDeals.length} deals in follow-up` : "No follow-ups",
        changeType: clientsInFollowUp > 0 ? ("neutral" as const) : ("positive" as const),
        icon: Clock,
      },
      {
        title: "Closed This Month",
        value: closedThisMonth.length.toString(),
        change: closedThisMonth.length > 0 ? `${closedThisMonth.length} deals closed` : "No deals closed yet",
        changeType: "neutral" as const,
        icon: Target,
      },
    ];
  }, [clients, deals]);

  const isLoading = clientsLoading || dealsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Header title="Dashboard" subtitle="Welcome back! Here's your overview." />
      
      <div className="p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : (
            stats.map((stat, index) => (
              <div key={stat.title} style={{ animationDelay: `${index * 100}ms` }}>
                <StatsCard {...stat} />
              </div>
            ))
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2">
            <PriorityClients />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
