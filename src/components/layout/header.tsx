"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Zap,
  Map as MapIcon,
  Heart,
  LayoutDashboard,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Calculator,
  Search,
  TrendingUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthDialog } from "@/components/auth/auth-dialog";
import { cn } from "@/lib/utils";

export type View =
  | "home"
  | "map"
  | "calculator"
  | "destinations"
  | "planner"
  | "favorites"
  | "about"
  | "admin";

interface HeaderProps {
  view: View;
  onViewChange: (v: View) => void;
}

// All nav items as direct buttons — no dropdown.
// Tools (Calculator, Destinations, Planner) live inline, between Find Stations and Favorites.
const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Zap },
  { id: "map", label: "Find Stations", icon: MapIcon },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "destinations", label: "Destinations", icon: Search },
  { id: "planner", label: "EV Planner", icon: TrendingUp },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "about", label: "About", icon: Info },
];

export function Header({ view, onViewChange }: HeaderProps) {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [authTab, setAuthTab] = React.useState<"login" | "register">("login");
  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isAdmin = session?.user?.role === "ADMIN";

  const navItems = isAdmin
    ? [...NAV_ITEMS, { id: "admin" as View, label: "Admin", icon: LayoutDashboard }]
    : NAV_ITEMS;

  function openAuth(tab: "login" | "register") {
    setAuthTab(tab);
    setAuthOpen(true);
  }

  function initials() {
    const name = session?.user?.name || session?.user?.email || "U";
    return name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <button
              onClick={() => onViewChange("home")}
              className="flex items-center gap-2 group shrink-0"
            >
              <div
                className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"
              >
                <Zap className="w-5 h-5 text-white" fill="white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-bold text-base leading-tight tracking-tight">
                  VoltRoute
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  EV Charging Network
                </p>
              </div>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {active && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 bg-primary/10 rounded-md -z-10"
                        transition={{ type: "spring", duration: 0.5 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
                aria-label="Toggle theme"
              >
                {mounted && theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>

              {status === "authenticated" && session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-2 rounded-full pr-3 pl-1.5 h-9"
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {initials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                        {session.user.name || session.user.email.split("@")[0]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {session.user.name || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {session.user.email}
                        </span>
                        <span className="text-[10px] mt-1 inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium uppercase tracking-wide">
                          {session.user.role}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onViewChange("favorites")}>
                      <Heart className="w-4 h-4 mr-2" /> My Favorites
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => onViewChange("admin")}>
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAuth("login")}
                  >
                    Sign In
                  </Button>
                  <Button size="sm" onClick={() => openAuth("register")}>
                    Get Started
                  </Button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full"
                onClick={() => setMobileOpen((s) => !s)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border py-3 space-y-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
              {status !== "authenticated" && (
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      openAuth("login");
                      setMobileOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      openAuth("register");
                      setMobileOpen(false);
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </header>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
      />
    </>
  );
}
