import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Calendar, BookOpen, User, LogOut } from "lucide-react";
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
    { href: "/profile", icon: User, label: "Profile" },
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
            <div className="font-semibold">RunAI Coach</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
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

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-around">
            {links.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                    location === href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}