import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Zap } from "lucide-react";
import { SidebarNav } from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-7 h-7 rounded-md gradient-brand glow-brand">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">
            Specora
          </span>
        </div>

        <SidebarNav />

        {/* User */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Link
              href="/links"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium gradient-brand text-white hover:opacity-90 transition-opacity"
            >
              <Zap className="w-3.5 h-3.5" />
              New discovery link
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
