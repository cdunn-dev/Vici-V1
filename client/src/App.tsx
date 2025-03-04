import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./context/AuthContext"; // Ensure useAuth is correctly exported
import Navbar from "./components/layout/navbar";
import Training from "./pages/training";
import Profile from "./pages/profile";
import Log from "./pages/log";
import Auth from "./pages/auth";
import NotFound from "./pages/not-found";
import ProtectedRoute from "./components/ProtectedRoute"; // Corrected import

// AuthRequired component
const AuthRequired = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/auth");
    return null;
  }

  return children;
};


function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-16">
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/">
            <Redirect to={isAuthenticated ? "/training" : "/auth"} />
          </Route>
          <Route path="/auth" component={Auth} />
          <Route path="/training">
            <ProtectedRoute>
              <Training />
            </ProtectedRoute>
          </Route>
          <Route path="/profile">
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </Route>
          <Route path="/log">
            <ProtectedRoute>
              <Log />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      {isAuthenticated && <Navbar />}
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