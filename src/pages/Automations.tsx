import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Zap,
  Mail,
  Clock,
  Calendar,
  Plus,
  Play,
  Pause,
  Loader2,
  Sparkles,
  User,
  Eye,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateAutomationDialog } from "@/components/dialogs/CreateAutomationDialog";
import { AISummaryDialog } from "@/components/dialogs/AISummaryDialog";
import { useAutomations, useUpdateAutomation, useDeleteAutomation } from "@/hooks/useAutomations";
import { useExecuteAutomation } from "@/hooks/useExecuteAutomation";
import { useLatestAutomationRun } from "@/hooks/useAutomationRuns";
import { useClients } from "@/hooks/useClients";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const actionLabels: Record<string, string> = {
  "email": "Send email",
  "meeting": "Send meeting follow-up",
  "ai-summary": "Generate AI summary",
};

export default function Automations() {
  const [createAutomationOpen, setCreateAutomationOpen] = useState(false);
  const { data: automations = [], isLoading } = useAutomations();
  const updateAutomation = useUpdateAutomation();
  const executeAutomation = useExecuteAutomation();

  // Separate automations by type
  const { aiSummaries, otherAutomations } = useMemo(() => {
    const aiSummaries = automations.filter(
      (auto) => auto.action_type === "ai-summary"
    );
    const otherAutomations = automations.filter(
      (auto) => auto.action_type !== "ai-summary"
    );
    return { aiSummaries, otherAutomations };
  }, [automations]);

  const toggleAutomation = (id: string, currentValue: boolean) => {
    updateAutomation.mutate({ id, is_active: !currentValue });
  };

  const handleExecute = (automation: any) => {
    executeAutomation.mutate(
      { automation },
      {
        onSuccess: () => {
          // Force refetch of automation runs after execution
          // This will be handled by the query invalidation in useExecuteAutomation
        },
      }
    );
  };

  // Component for AI Summary cards (needs to be separate to use hooks)
  const AISummaryCard = ({ automation, index }: { automation: any; index: number }) => {
    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [isExecutingThis, setIsExecutingThis] = useState(false);
    // Use automation_id if available, otherwise fall back to id
    const automationId = automation.automation_id || automation.id;
    const { data: latestRun, isLoading: isLoadingRun } = useLatestAutomationRun(automationId);
    const { data: clients = [] } = useClients();
    const clientId = automation.config?.client_id;
    const client = clients.find((c) => c.id === clientId || (c as any).client_id === clientId);
    const summary = latestRun?.result_data?.summary;
    const clientName = latestRun?.result_data?.clientName || client?.name || "Unknown Client";
    const summaryData = latestRun?.result_data;
    
    // Create a separate execute mutation for this specific automation
    const executeThisAutomation = useExecuteAutomation();
    
    // Check if summary exists
    const hasSummary = summary && typeof summary === 'string' && summary.trim().length > 0;
    
    // Monitor when summary becomes available after execution
    useEffect(() => {
      if (isExecutingThis && hasSummary) {
        // Summary is now available, hide the loading banner
        setIsExecutingThis(false);
      }
    }, [isExecutingThis, hasSummary]);
    
    // Determine if we should show the loading banner
    const showLoadingBanner = isExecutingThis || executeThisAutomation.isPending;

    return (
      <div
        className="group rounded-xl bg-card border border-border/60 p-6 shadow-card hover:shadow-elevated transition-all duration-300 animate-slide-up hover-lift"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110",
                automation.is_active ? "bg-gradient-to-br from-primary/20 to-primary/10" : "bg-muted/50"
              )}
            >
              {automation.is_active ? (
                <Sparkles className="h-6 w-6 text-primary" />
              ) : (
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{automation.name}</h3>
              </div>
              {automation.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {automation.description}
                </p>
              )}
              
              {/* Client Info */}
              <div className="flex items-center gap-2 mt-4 p-2 rounded-lg bg-secondary/50">
                <User className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-medium text-foreground">
                  Client: {clientName}
                </span>
              </div>

              {/* Loading Banner - Show when generating summary */}
              {showLoadingBanner && (
                <div className="mt-3 p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium text-primary">Generating Summary...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please wait while we analyze the client data and generate your summary.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Preview */}
              {!showLoadingBanner && hasSummary && (
                <>
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs font-medium text-primary mb-2">Latest Summary:</p>
                    <p className="text-sm text-foreground line-clamp-3">
                      {summary}
                    </p>
                  </div>
                  {/* View More Button */}
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSummaryDialogOpen(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View More
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Summary Dialog */}
        <AISummaryDialog
          open={summaryDialogOpen}
          onOpenChange={setSummaryDialogOpen}
          automation={automation}
          summaryData={summaryData}
          clientName={clientName}
        />
      </div>
    );
  };

  // Component for Email/Communication automation cards (needs to be separate to use hooks)
  const AutomationCard = ({ automation, index }: { automation: any; index: number }) => {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const { toast } = useToast();
    const deleteAutomation = useDeleteAutomation();

    // Extract email_send_date from config
    // Config can be a string (JSON) or an object
    let config = automation.config || {};
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        console.error('Error parsing config:', e);
        config = {};
      }
    }
    const emailSendDate = config.email_send_date;
    
    // Format the date for display
    let formattedDate = null;
    if (emailSendDate) {
      try {
        const date = new Date(emailSendDate);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }

    const handleDelete = async () => {
      try {
        const id = automation.automation_id || automation.id;
        if (!id) {
          toast({
            title: "Error",
            description: "Could not identify the automation",
            variant: "destructive",
          });
          return;
        }

        await deleteAutomation.mutateAsync(id);
        toast({
          title: "Automation deleted",
          description: `${automation.name} has been deleted successfully.`,
        });
        setDeleteDialogOpen(false);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete automation",
          variant: "destructive",
        });
      }
    };

    return (
      <div
        className="group rounded-xl bg-card border border-border/60 p-6 shadow-card hover:shadow-elevated transition-all duration-300 animate-slide-up hover-lift"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110",
                automation.is_active ? "bg-gradient-to-br from-primary/20 to-primary/10" : "bg-muted/50"
              )}
            >
              {automation.is_active ? (
                <Play className="h-6 w-6 text-primary" />
              ) : (
                <Pause className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{automation.name}</h3>
              </div>
              {automation.description && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {automation.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="text-xs font-medium px-2.5 py-1">
                  {actionLabels[automation.action_type] || automation.action_type}
                </Badge>
                {formattedDate && (
                  <Badge variant="outline" className="text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary border-primary/20">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formattedDate}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExecute(automation)}
              disabled={!automation.is_active || executeAutomation.isPending}
              className="gap-2 transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            >
              {executeAutomation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Switch
              checked={automation.is_active || false}
              onCheckedChange={() =>
                toggleAutomation(automation.id, automation.is_active || false)
              }
            />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete{" "}
                <strong>{automation.name}</strong> and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteAutomation.isPending}
              >
                {deleteAutomation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <Header title="Automations" subtitle="Automate your workflow with AI-powered actions" />

      <div className="p-6 space-y-8 animate-fade-in">
        {/* Header with Create Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-1">Automations</h2>
            <p className="text-sm text-muted-foreground">Manage your automated workflows</p>
          </div>
          <Button className="gap-2 shadow-sm hover:shadow-md transition-all duration-200" onClick={() => setCreateAutomationOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Custom
          </Button>
          <CreateAutomationDialog open={createAutomationOpen} onOpenChange={setCreateAutomationOpen} />
        </div>

        {/* Email & Communication Automations Section */}
        <section className="animate-fade-in">
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-card/50 border border-border/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Email & Communication Automations</h2>
              <p className="text-sm text-muted-foreground">Automated emails and meeting follow-ups</p>
            </div>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : otherAutomations.length === 0 ? (
              <div className="rounded-xl bg-card border border-border/60 p-12 text-center animate-fade-in">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50">
                    <Mail className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground mb-1">No email automations yet.</p>
                    <p className="text-sm text-muted-foreground">Create email or meeting follow-up automations to get started</p>
                  </div>
                </div>
              </div>
            ) : (
              otherAutomations.map((automation, index) => (
                <AutomationCard key={automation.id} automation={automation} index={index} />
              ))
            )}
          </div>
        </section>

        {/* AI Client Summary Section */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-card/50 border border-border/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-sm">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">AI Client Summaries</h2>
              <p className="text-sm text-muted-foreground">Generate AI-powered summaries for your clients</p>
            </div>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : aiSummaries.length === 0 ? (
              <div className="rounded-xl bg-card border border-border/60 p-12 text-center animate-fade-in">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary/50" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground mb-1">No AI Client Summary automations yet.</p>
                    <p className="text-sm text-muted-foreground">Create one to generate intelligent client insights</p>
                  </div>
                </div>
              </div>
            ) : (
              aiSummaries.map((automation, index) => (
                <AISummaryCard key={automation.id} automation={automation} index={index} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
