import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Zap,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Pipeline", href: "/pipeline", icon: Kanban },
  { name: "Automations", href: "/automations", icon: Zap },
  { name: "Reminders", href: "/reminders", icon: Bell },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const bottomNav = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground">ClientFlow AI</span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground",
              collapsed && "hidden"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-border px-2 py-4">
          {bottomNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}

          {/* Expand button when collapsed */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center px-2 py-2.5 mt-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
