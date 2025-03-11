import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseLayoutProps {
  children: ReactNode;
  className?: string;
}

export function BaseLayout({ children, className }: BaseLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Add navigation component here */}
        </div>
      </header>

      <main className={cn("flex-1 container py-6", className)}>
        {children}
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex h-14 items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Running Training Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
