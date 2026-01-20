import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddDealDialog } from "@/components/dialogs/AddDealDialog";
import { DealDetailDialog } from "@/components/dialogs/DealDetailDialog";
import { useDeals, useUpdateDeal, type Deal } from "@/hooks/useDeals";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const stageConfig = [
  { id: "New", title: "New", color: "bg-muted-foreground" },
  { id: "Contacted", title: "Contacted", color: "bg-primary" },
  { id: "Follow-up", title: "Follow-up", color: "bg-warning" },
  { id: "Negotiating", title: "Negotiating", color: "bg-success" },
  { id: "Closed", title: "Closed", color: "bg-success" },
];

export default function Pipeline() {
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState("New");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const { data: deals = [], isLoading } = useDeals();
  const updateDeal = useUpdateDeal();
  const { toast } = useToast();

  // Find the selected deal from the deals array to ensure it's always up to date
  const selectedDeal = selectedDealId
    ? (deals.find((deal) => deal.id === selectedDealId) as Deal | undefined) || null
    : null;

  const stages = useMemo(() => {
    return stageConfig.map((stage) => ({
      ...stage,
      deals: deals.filter((deal) => deal.stage === stage.id),
    }));
  }, [deals]);

  const totalValue = useMemo(() => {
    return deals.reduce((acc, deal) => acc + (deal.amount || 0), 0);
  }, [deals]);

  const handleAddDeal = (stage: string) => {
    setSelectedStage(stage);
    setAddDealOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDealId(null);
    setDragOverStageId(null);
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStageId) {
      setDragOverStageId(null);
      return;
    }

    try {
      await updateDeal.mutateAsync({
        id: dealId,
        stage: targetStageId,
      });

      toast({
        title: "Deal moved",
        description: `Deal moved to ${targetStageId} stage.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move deal",
        variant: "destructive",
      });
    } finally {
      setDragOverStageId(null);
      setDraggedDealId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Header title="Pipeline" subtitle="Visual overview of your sales pipeline" />

      <div className="p-6 space-y-8 animate-fade-in">
        {/* Pipeline Stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="rounded-xl bg-card border border-border/60 p-5 shadow-card hover:shadow-elevated transition-all duration-300 min-w-[180px]">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Pipeline Value</p>
              <p className="text-3xl font-bold text-foreground">${totalValue.toLocaleString()}</p>
            </div>
            <div className="h-12 w-px bg-border/60 hidden sm:block" />
            <div className="rounded-xl bg-card border border-border/60 p-5 shadow-card hover:shadow-elevated transition-all duration-300 min-w-[180px]">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Deals</p>
              <p className="text-3xl font-bold text-foreground">{deals.length}</p>
            </div>
          </div>
          <Button className="gap-2 shadow-sm hover:shadow-md transition-all duration-200" onClick={() => handleAddDeal("New")}>
            <Plus className="h-4 w-4" />
            Add Deal
          </Button>
          <AddDealDialog open={addDealOpen} onOpenChange={setAddDealOpen} defaultStage={selectedStage} />
        </div>

        {/* Deal Detail Dialog */}
        <DealDetailDialog
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              setSelectedDealId(null);
            }
          }}
          deal={selectedDeal}
        />

        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-80">
                <Skeleton className="h-10 w-full mb-4 rounded-lg" />
                <Skeleton className="h-40 w-full mb-3 rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ))
          ) : (
            stages.map((stage, stageIndex) => (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80 animate-slide-up"
                style={{ animationDelay: `${stageIndex * 100}ms` }}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/50 border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-3 w-3 rounded-full shadow-sm", stage.color)} />
                    <h3 className="font-semibold text-foreground text-base">{stage.title}</h3>
                    <span className="text-sm font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                      {stage.deals.length}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors" 
                    onClick={() => handleAddDeal(stage.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stage Deals */}
                <div
                  className={cn(
                    "space-y-3 min-h-[150px] transition-all duration-300 rounded-xl p-3",
                    dragOverStageId === stage.id && "bg-primary/10 border-2 border-dashed border-primary/50 shadow-lg"
                  )}
                >
                  {stage.deals.map((deal: any, dealIndex) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "rounded-xl bg-card border border-border/60 p-5 shadow-card hover:shadow-elevated transition-all duration-200 cursor-grab active:cursor-grabbing group hover-lift relative overflow-hidden animate-fade-in",
                        draggedDealId === deal.id && "opacity-50 scale-95 rotate-2"
                      )}
                      style={{ animationDelay: `${(stageIndex * 100) + (dealIndex * 50)}ms` }}
                    >
                      {/* Subtle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{deal.title}</p>
                            {deal.clients && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold shadow-sm">
                                  {deal.clients.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                                <p className="text-sm text-muted-foreground font-medium truncate">
                                  {deal.clients.name}
                                </p>
                              </div>
                            )}
                            {deal.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                                {deal.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                draggable={false}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDealId(deal.id);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View More
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                          <span className="text-lg font-bold text-foreground">
                            ${(deal.amount || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(deal.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty state / Add card button */}
                  {stage.deals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all duration-200 group cursor-pointer" onClick={() => handleAddDeal(stage.id)}>
                      <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                      <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">Add deal</p>
                    </div>
                  )}
                  {stage.deals.length > 0 && (
                    <button 
                      onClick={() => handleAddDeal(stage.id)}
                      className="w-full p-4 rounded-lg border border-dashed border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 text-sm font-medium"
                    >
                      + Add deal
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
