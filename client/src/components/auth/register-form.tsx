const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
});

// ... rest of the code (assuming this is part of a larger component) ...

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input placeholder="your.email@example.com" type="email" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// ... rest of the code ...