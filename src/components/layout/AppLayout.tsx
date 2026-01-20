import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64 transition-all duration-300 ease-in-out lg:pl-64 md:pl-16 sm:pl-0">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
