import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, Target, Activity } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-6">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
          Welcome to Your Running Journey
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Track your progress, follow personalized training plans, and achieve your running goals with AI-powered coaching.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/training">
            <Button size="lg" className="gap-2">
              Start Training <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="transform transition-all hover:scale-105">
          <CardHeader>
            <Target className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Training Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Get personalized AI-powered training plans tailored to your goals and experience level.
            </p>
            <Link href="/training">
              <Button variant="outline" className="w-full group">
                View Plan <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transform transition-all hover:scale-105">
          <CardHeader>
            <Activity className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Track your runs, analyze your performance, and monitor your progress over time.
            </p>
            <Link href="/log">
              <Button variant="outline" className="w-full group">
                View Log <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transform transition-all hover:scale-105">
          <CardHeader>
            <Calendar className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Profile & Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Customize your profile, connect your running apps, and manage your preferences.
            </p>
            <Link href="/profile">
              <Button variant="outline" className="w-full group">
                View Profile <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Stats or Highlights Section */}
      <section className="mt-12 bg-primary/5 rounded-lg p-8">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-semibold">Why Choose RunAI Coach?</h2>
          <p className="text-muted-foreground">
            Experience the power of AI-driven personalized training
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">AI-Powered</div>
            <p className="text-muted-foreground">Personalized training plans that adapt to your progress</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">Smart</div>
            <p className="text-muted-foreground">Real-time adjustments based on your performance</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">Connected</div>
            <p className="text-muted-foreground">Integrate with your favorite running apps</p>
          </div>
        </div>
      </section>
    </div>
  );
}