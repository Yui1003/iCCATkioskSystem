import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

const settingsFormSchema = z.object({
  homeTimeout: z.string()
    .refine((val) => !isNaN(parseInt(val, 10)), {
      message: "Must be a valid number"
    })
    .refine((val) => {
      const num = parseInt(val, 10);
      return num >= 1 && num <= 300;
    }, {
      message: "Timeout must be between 1 and 300 seconds"
    }),
  globalTimeout: z.string()
    .refine((val) => !isNaN(parseInt(val, 10)), {
      message: "Must be a valid number"
    })
    .refine((val) => {
      const num = parseInt(val, 10);
      return num >= 30 && num <= 600;
    }, {
      message: "Timeout must be between 30 and 600 seconds (0.5 to 10 minutes)"
    })
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminSettings() {
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      homeTimeout: "30",
      globalTimeout: "180"
    }
  });

  // Fetch current home timeout setting
  const { data: homeTimeoutSetting, isLoading: isLoadingHome, error: homeError } = useQuery<Setting>({
    queryKey: ['/api/settings/home_inactivity_timeout'],
    queryFn: async () => {
      const response = await fetch('/api/settings/home_inactivity_timeout');
      if (response.status === 404) {
        // Setting doesn't exist yet, return null to use default
        return null;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch setting');
      }
      return response.json();
    }
  });

  // Fetch current global timeout setting
  const { data: globalTimeoutSetting, isLoading: isLoadingGlobal, error: globalError } = useQuery<Setting>({
    queryKey: ['/api/settings/global_inactivity_timeout'],
    queryFn: async () => {
      const response = await fetch('/api/settings/global_inactivity_timeout');
      if (response.status === 404) {
        // Setting doesn't exist yet, return null to use default
        return null;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch setting');
      }
      return response.json();
    }
  });

  const isLoading = isLoadingHome || isLoadingGlobal;
  const error = homeError || globalError;

  useEffect(() => {
    // Reset form when data is loaded (even if settings are null/don't exist)
    if (!isLoading && !error) {
      form.reset({
        homeTimeout: homeTimeoutSetting?.value || "30",
        globalTimeout: globalTimeoutSetting?.value || "180"
      });
    }
  }, [homeTimeoutSetting, globalTimeoutSetting, isLoading, error, form]);

  // Update timeout mutation
  const updateTimeoutMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      // Update home timeout
      const homeResponse = await fetch('/api/settings/home_inactivity_timeout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: values.homeTimeout })
      });
      
      if (!homeResponse.ok) {
        const errorData = await homeResponse.json();
        throw new Error(errorData.error || 'Failed to update home timeout');
      }

      // Update global timeout
      const globalResponse = await fetch('/api/settings/global_inactivity_timeout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: values.globalTimeout })
      });
      
      if (!globalResponse.ok) {
        const errorData = await globalResponse.json();
        throw new Error(errorData.error || 'Failed to update global timeout');
      }
      
      return { home: await homeResponse.json(), global: await globalResponse.json() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/home_inactivity_timeout'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/global_inactivity_timeout'] });
      toast({
        title: "Settings Updated",
        description: "Inactivity timeouts have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateTimeoutMutation.mutate(values);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-foreground" />
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Inactivity Timeout</CardTitle>
              <CardDescription>
                Configure how long the homepage should wait before showing the screensaver (in seconds)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading settings...</span>
                </div>
              ) : error ? (
                <div className="text-destructive py-4">
                  Failed to load settings. Please refresh the page.
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="homeTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Homepage Timeout (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="300"
                              placeholder="30"
                              data-testid="input-home-timeout"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter a value between 1 and 300 seconds. Default is 30 seconds.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-lg font-medium mb-2">Page Inactivity Timeout</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure how long other pages should wait before returning to homepage due to inactivity
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="globalTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Timeout (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="30"
                                max="600"
                                placeholder="180"
                                data-testid="input-global-timeout"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter a value between 30 and 600 seconds (0.5 to 10 minutes). Default is 180 seconds (3 minutes).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateTimeoutMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateTimeoutMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {updateTimeoutMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
