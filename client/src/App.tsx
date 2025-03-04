import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/navbar";
import Training from "./pages/training";
import Profile from "./pages/profile";
import Log from "./pages/log";
import Auth from "./pages/auth";
import NotFound from "./pages/not-found";

// Protected route component
const ProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) => {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    setLocation("/auth");
    return null;
  }
  
  return <Component {...rest} />;
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
            <ProtectedRoute component={Training} />
          </Route>
          <Route path="/profile">
            <ProtectedRoute component={Profile} />
          </Route>
          <Route path="/log">
            <ProtectedRoute component={Log} />
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