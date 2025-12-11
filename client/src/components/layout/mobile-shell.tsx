import { Link, useLocation } from "wouter";
import { Home, Calendar, TrendingUp, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function MobileShell({ children, hideNav = false }: MobileShellProps) {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calendar, label: "Today", path: "/workout" },
    { icon: TrendingUp, label: "Insights", path: "/insights" },
    { icon: MoreHorizontal, label: "More", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col max-w-md mx-auto border-x border-border/20 shadow-2xl overflow-hidden relative">
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface/90 backdrop-blur-md border-t border-border/20 px-6 py-2 pb-6 z-50">
          <div className="flex justify-between items-center">
            {navItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 w-16 h-14 transition-all duration-200 cursor-pointer",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 2}
                      className="transition-transform active:scale-90"
                    />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
