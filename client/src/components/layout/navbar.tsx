import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Calendar, User, BookOpen } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/training", icon: Calendar, label: "Training" },
    { href: "/log", icon: BookOpen, label: "Log" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-around">
          {links.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <a
                className={cn(
                  "flex flex-col items-center gap-1 text-sm font-medium transition-colors hover:text-primary",
                  location === href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}