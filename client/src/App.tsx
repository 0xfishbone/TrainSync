import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Workout from "@/pages/workout";
import Nutrition from "@/pages/nutrition";
import Progress from "@/pages/progress";
import Insights from "@/pages/insights";
import Profile from "@/pages/profile";
import GoalDetails from "@/pages/goal-details";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import TrainingSchedule from "@/pages/settings/schedule";
import EquipmentLimits from "@/pages/settings/equipment";
import NutritionTargets from "@/pages/settings/nutrition";
import Appearance from "@/pages/settings/appearance";
import ExportData from "@/pages/settings/export";
import { initializeNotifications, startMealReminderScheduler } from "@/lib/notifications";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    async function checkAuth() {
      // Public routes that don't require authentication
      const publicRoutes = ["/login", "/register"];
      if (publicRoutes.includes(location)) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(true);

          // Store userId in localStorage for compatibility with existing code
          localStorage.setItem("trainsync_user_id", data.userId);

          // Initialize notifications for authenticated users
          initializeNotifications().then((granted) => {
            if (granted) {
              startMealReminderScheduler();
            }
          });
        } else {
          setIsAuthenticated(false);
          // Clear localStorage
          localStorage.removeItem("trainsync_user_id");
          // Redirect to login if not on a public route
          if (!publicRoutes.includes(location)) {
            setLocation("/login");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
        localStorage.removeItem("trainsync_user_id");
        if (!publicRoutes.includes(location)) {
          setLocation("/login");
        }
      }
    }

    checkAuth();
  }, [location, setLocation]);

  // Show loading while checking authentication
  if (isAuthenticated === null && location !== "/login" && location !== "/register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/" component={Home} />
      <Route path="/workout" component={Workout} />
      <Route path="/nutrition" component={Nutrition} />
      <Route path="/progress" component={Progress} />
      <Route path="/insights" component={Insights} />
      <Route path="/profile" component={Profile} />
      <Route path="/goal-details" component={GoalDetails} />
      <Route path="/settings/schedule" component={TrainingSchedule} />
      <Route path="/settings/equipment" component={EquipmentLimits} />
      <Route path="/settings/nutrition" component={NutritionTargets} />
      <Route path="/settings/appearance" component={Appearance} />
      <Route path="/settings/export" component={ExportData} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
