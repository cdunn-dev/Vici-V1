import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { insertUserSchema } from "@shared/schema";
import { SiStrava, SiGarmin, SiNike } from "react-icons/si";

export default function Profile() {
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      name: "",
      dateOfBirth: new Date().toISOString(),
      gender: "",
      personalBests: {},
      connectedApps: [],
    },
  });

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20">
              <SiStrava className="h-8 w-8 mr-2" />
              Connect Strava
            </Button>
            <Button variant="outline" className="h-20">
              <SiGarmin className="h-8 w-8 mr-2" />
              Connect Garmin
            </Button>
            <Button variant="outline" className="h-20">
              <SiNike className="h-8 w-8 mr-2" />
              Connect Nike
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Bests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["5K", "10K", "Half Marathon", "Marathon"].map((distance) => (
              <FormItem key={distance}>
                <FormLabel>{distance}</FormLabel>
                <FormControl>
                  <Input type="time" step="1" />
                </FormControl>
              </FormItem>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
