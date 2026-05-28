import React from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 lg:pl-64">
        <div className="p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
