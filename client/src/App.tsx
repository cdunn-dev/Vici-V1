import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "./components/layout/navbar";
import Training from "./pages/training";
import Profile from "./pages/profile";
import Log from "./pages/log";
import Auth from "./pages/auth";
import NotFound from "./pages/not-found";
import StravaDebugPage from "@/pages/strava-debug";

function ProtectedRoute({ path, children }: { path: string, children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Route path={path}>
      {user ? children : <Redirect to="/auth" />}
    </Route>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {user && <Navbar />}
      <main className="container mx-auto px-4 py-8">
        <Switch>
          {/* Public route - redirect to training if already logged in */}
          <Route path="/auth">
            {user ? <Redirect to="/training" /> : <Auth />}
          </Route>

          {/* Protected routes */}
          <ProtectedRoute path="/training">
            <Training />
          </ProtectedRoute>

          <ProtectedRoute path="/profile">
            <Profile />
          </ProtectedRoute>

          <ProtectedRoute path="/log">
            <Log />
          </ProtectedRoute>

          <ProtectedRoute path="/activities/:id">
            <div>Activity Detail</div>
          </ProtectedRoute>

          <ProtectedRoute path="/strava-debug">
            <StravaDebugPage />
          </ProtectedRoute>

          {/* Default route */}
          <Route path="/">
            <Redirect to="/training" />
          </Route>

          {/* 404 route */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;