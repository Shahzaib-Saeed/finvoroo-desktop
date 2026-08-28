import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { clearLegacyAuthStorage } from '@/auth/auth-cookies';
import { resetSessionRedirectFlag } from '@/auth/session';
import { useAuthStore } from '@/store/authStore';
import { setPageTitle } from '@/lib/page-title';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, clearSuperAdminBrowsing } = useAuthStore();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPageTitle('Sign In');
    resetSessionRedirectFlag();
    clearLegacyAuthStorage();
    clearSuperAdminBrowsing();
  }, [clearSuperAdminBrowsing]);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values) {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
        remember: !!values.rememberMe,
      });

      const { token, user, companies } = response.data.data;

      if ((user?.role ?? '') !== 'super_admin') {
        const message = 'This portal is for super administrators only.';
        setError(message);
        toast.error(message);
        return;
      }

      login(token, user, companies ?? [], !!values.rememberMe);

      const nextPath = location.state?.from?.pathname;
      if (nextPath && nextPath.startsWith('/superadmin')) {
        navigate(nextPath, { replace: true });
        return;
      }

      navigate('/superadmin/dashboard', { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="block w-full space-y-5">
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Super Admin Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Platform administration access only.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="admin@example.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={passwordVisible ? 'text' : 'password'}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    size="sm"
                    className="absolute end-0 top-1/2 -translate-y-1/2"
                    onClick={() => setPasswordVisible((v) => !v)}
                  >
                    {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer">Remember me</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <>
              <LoaderCircleIcon className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </Form>
  );
}
