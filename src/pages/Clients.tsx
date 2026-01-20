import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Eye,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddClientDialog } from "@/components/dialogs/AddClientDialog";
import { ClientDetailDialog } from "@/components/dialogs/ClientDetailDialog";
import { PrioritizationAutomationDialog } from "@/components/dialogs/PrioritizationAutomationDialog";
import { useClients, type Client } from "@/hooks/useClients";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [prioritizationDialogOpen, setPrioritizationDialogOpen] = useState(false);
  const { data: clients = [], isLoading } = useClients();

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      <Header title="Clients" subtitle="Manage your clients and prospects" />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search clients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border/60 focus:border-primary/50 transition-colors shadow-sm"
            />
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button variant="outline" className="gap-2 transition-smooth hover:bg-secondary/80" onClick={() => setPrioritizationDialogOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Automate Prioritization
            </Button>
            <Button className="gap-2 shadow-sm hover:shadow-md transition-all duration-200" onClick={() => setAddClientOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>

          <AddClientDialog open={addClientOpen} onOpenChange={setAddClientOpen} />
          <PrioritizationAutomationDialog
            open={prioritizationDialogOpen}
            onOpenChange={setPrioritizationDialogOpen}
          />
        </div>

        {/* Client Detail Dialog */}
        <ClientDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          client={selectedClient}
        />

        {/* Clients Table */}
        <div className="rounded-xl bg-card border border-border/60 shadow-card overflow-hidden animate-fade-in hover:shadow-elevated transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gradient-to-r from-secondary/80 to-secondary/40">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Client
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 hidden lg:table-cell">
                    Source
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Priority
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4 hidden sm:table-cell">
                    Created
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4" colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td className="px-6 py-16 text-center" colSpan={6}>
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Users className="h-12 w-12 text-muted-foreground/40" />
                        <p className="text-sm font-medium">
                          {searchQuery ? "No clients match your search" : "No clients found"}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {searchQuery ? "Try adjusting your search query" : "Add your first client to get started"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, index) => (
                    <tr
                      key={client.id}
                      className="hover:bg-secondary/50 transition-all duration-200 cursor-pointer animate-fade-in border-b border-border/40 last:border-0 group"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => {
                        setSelectedClient(client);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm shadow-sm transition-transform duration-200 group-hover:scale-110">
                            {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{client.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{client.email || "—"}</p>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {client.notes ? (
                                <span className="italic">{client.notes.length > 60 ? `${client.notes.substring(0, 60)}...` : client.notes}</span>
                              ) : (
                                <span className="text-muted-foreground/60">No description</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary/60" />
                            <span className="truncate max-w-[200px]">{client.email || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary/60" />
                            <span>{client.phone || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground/70" />
                          <span className="text-sm text-muted-foreground capitalize">{client.source || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize font-medium px-2.5 py-1",
                            client.status === "high" && "border-destructive/50 text-destructive bg-destructive/10",
                            client.status === "medium" && "border-warning/50 text-warning bg-warning/10",
                            client.status === "low" && "border-muted-foreground/50 text-muted-foreground bg-muted/30"
                          )}
                        >
                          {client.status || "medium"}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {new Date(client.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(client);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View More
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
