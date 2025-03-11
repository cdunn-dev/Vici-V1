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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
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
          <Route path="/training">
            <ProtectedRoute component={Training} />
          </Route>
          <Route path="/profile">
            <ProtectedRoute component={Profile} />
          </Route>
          <Route path="/log">
            <ProtectedRoute component={Log} />
          </Route>
          <Route path="/activities/:id">
            <ProtectedRoute component={() => <div>Activity Detail</div>} />
          </Route>
          <Route path="/strava-debug">
            <ProtectedRoute component={StravaDebugPage} />
          </Route>

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