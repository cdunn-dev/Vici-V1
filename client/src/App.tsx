import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import Navbar from "./components/layout/navbar";
import Training from "./pages/training";
import Profile from "./pages/profile";
import Log from "./pages/log";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/">
            <Redirect to="/training" />
          </Route>
          <Route path="/training" component={Training} />
          <Route path="/profile" component={Profile} />
          <Route path="/log" component={Log} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Navbar />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;