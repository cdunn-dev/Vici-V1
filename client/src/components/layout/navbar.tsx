import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Calendar, BookOpen, User, LogOut, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const links = [
    { href: "/training", icon: Calendar, label: "Training" },
    { href: "/log", icon: BookOpen, label: "Log" },
  ];

  if (!user) {
    return (
      <nav className="fixed top-0 left-0 right-0 border-b bg-background z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="font-semibold">RunAI Coach</div>
            <Link href="/auth">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Top navbar with user menu */}
      <nav className="fixed top-0 left-0 right-0 border-b bg-background z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="font-semibold">RunAI Coach</div>
              <div className="hidden md:flex items-center gap-4">
                {links.map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href}>
                    <Button
                      variant={location === href ? "default" : "ghost"}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <div className="flex items-center w-full cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/training?tab=stored">
                    <div className="flex items-center w-full cursor-pointer">
                      <Save className="mr-2 h-4 w-4" />
                      <span>Saved Training Plans</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-red-600 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Bottom navigation for mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-around">
            {links.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                    location === href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}