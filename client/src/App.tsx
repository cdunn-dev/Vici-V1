import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Navbar from "./components/layout/navbar";
import Training from "./pages/training";
import Profile from "./pages/profile";
import Log from "./pages/log";
import Auth from "./pages/auth";
import NotFound from "./pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType }) {
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
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          {/* Auth route - redirect to training if already logged in */}
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
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
import React from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/profile";
import NotFound from "@/pages/NotFound";
import { ThemeProvider } from "@/context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/">
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Route>
            <Route path="/profile">
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
