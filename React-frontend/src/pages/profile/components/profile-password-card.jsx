import { CheckCircle2, KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProfilePasswordCard({
  register,
  errors,
  isSubmitting,
  pwSuccess,
  pwError,
  onSubmit,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2.5 mb-6">
          <div className="text-base font-semibold text-mono">Change password</div>
          <p className="text-sm text-foreground leading-5.5">
            Use a strong password with at least 8 characters. You will need your current password
            to confirm the change.
          </p>
        </div>

        {pwSuccess ? (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2 mb-5">
            <CheckCircle2 className="size-4" />
            Password changed successfully.
          </div>
        ) : null}

        {pwError ? (
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>Failed</AlertTitle>
            <AlertDescription>
              {pwError.msg}
              {Object.keys(pwError.fields).length > 0 ? (
                <ul className="mt-1 list-disc list-inside text-sm">
                  {Object.entries(pwError.fields).map(([f, msgs]) => (
                    <li key={f}>{Array.isArray(msgs) ? msgs[0] : msgs}</li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={onSubmit}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Current password</Label>
              <Input
                type="password"
                {...register('current_password')}
                className={errors.current_password ? 'border-destructive' : ''}
              />
              {errors.current_password ? (
                <p className="text-xs text-destructive">{errors.current_password.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                {...register('new_password')}
                className={errors.new_password ? 'border-destructive' : ''}
              />
              {errors.new_password ? (
                <p className="text-xs text-destructive">{errors.new_password.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                {...register('new_password_confirmation')}
                className={errors.new_password_confirmation ? 'border-destructive' : ''}
              />
              {errors.new_password_confirmation ? (
                <p className="text-xs text-destructive">
                  {errors.new_password_confirmation.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5">
            <Button type="submit" disabled={isSubmitting} variant="outline" className="min-w-36">
              {isSubmitting ? 'Changing...' : 'Change password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
