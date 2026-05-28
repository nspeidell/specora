import Link from "next/link";
import { Zap } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">Specora</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="hover:text-foreground transition-colors"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {userId ? (
              <Link
                href="/dashboard"
                className="text-sm px-4 py-2 rounded-lg gradient-brand text-white font-medium hover:opacity-90 transition-opacity"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm px-4 py-2 rounded-lg gradient-brand text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Start free →
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded gradient-brand flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-foreground">Specora</span>
            <span className="ml-2">© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link
              href="/sign-in"
              className="hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
