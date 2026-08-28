import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Eye, EyeOff, LoaderCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

const schema = z
  .object({
    name: z.string().min(1, 'Name is required').max(150),
    email: z.string().email('Enter a valid email'),
    phone: z.string().max(50).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

export function SignUpPage() {
  const navigate = useNavigate();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      password_confirmation: '',
    },
  });

  async function onSubmit(values) {
    try {
      setIsProcessing(true);
      setError(null);
      await api.post('/auth/register', {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || null,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      toast.success('Account created. Check your email to verify.');
      navigate(`/auth/verify-email?email=${encodeURIComponent(values.email.trim())}`, {
        replace: true,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email?.[0] ||
        'Could not create your account. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="block w-full space-y-3">
        <div className="space-y-1 pb-1">
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Create your account</h2>
          <p className="text-[13px] leading-snug text-slate-500">
            Start your 14-day free trial of Finvoroo after email verification.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] text-slate-700">Full name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" autoComplete="name" className="h-9 rounded-lg border-slate-200" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] text-slate-700">Work email</FormLabel>
              <FormControl>
                <Input
                  placeholder="you@company.com"
                  type="email"
                  autoComplete="email"
                  className="h-9 rounded-lg border-slate-200"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] text-slate-700">Phone (optional)</FormLabel>
              <FormControl>
                <Input placeholder="+1 …" autoComplete="tel" className="h-9 rounded-lg border-slate-200" {...field} />
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
              <FormLabel className="text-[13px] text-slate-700">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="At least 8 characters"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="h-9 rounded-lg border-slate-200"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  >
                    {passwordVisible ? (
                      <EyeOff className="text-muted-foreground" />
                    ) : (
                      <Eye className="text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password_confirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] text-slate-700">Confirm password</FormLabel>
              <FormControl>
                <Input
                  placeholder="Repeat password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="h-9 rounded-lg border-slate-200"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="mt-1 h-10 w-full rounded-lg bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/auth/signin" className="font-semibold text-slate-900 hover:text-[#2563EB]">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
