import { CheckCircle2, Pencil, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';

export function ProfileAccountCard({
  user,
  editMode,
  onEdit,
  onCancel,
  register,
  errors,
  timezoneValue,
  setValue,
  timezoneOptions,
  isSubmitting,
  saveSuccess,
  saveError,
  onSubmit,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Account profile</CardTitle>
        {!editMode ? (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-4" />
            Edit profile
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="size-4" />
            Cancel
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {saveSuccess ? (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2 mb-5">
            <CheckCircle2 className="size-4" />
            Profile updated successfully.
          </div>
        ) : null}

        {saveError ? (
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>Update failed</AlertTitle>
            <AlertDescription>
              {saveError.msg}
              {Object.keys(saveError.fields).length > 0 ? (
                <ul className="mt-1 list-disc list-inside text-sm">
                  {Object.entries(saveError.fields).map(([f, msgs]) => (
                    <li key={f}>{Array.isArray(msgs) ? msgs[0] : msgs}</li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={onSubmit}>
          <div className="grid gap-2.5 mb-7">
            <div className="text-base font-semibold text-mono">Personal details</div>
            <p className="text-sm text-foreground leading-5.5">
              Update your name, email, phone, and timezone. These details apply across your
              account and are used for notifications and sign-in.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col gap-1.5">
              <Label>Full name</Label>
              <Input
                {...register('name')}
                disabled={!editMode}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email address</Label>
              <Input
                type="email"
                {...register('email')}
                disabled={!editMode}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Phone <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input {...register('phone')} disabled={!editMode} placeholder="+1 555 000 0000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Timezone</Label>
              <SearchableCombobox
                value={timezoneValue || 'UTC'}
                onValueChange={(v) => setValue('timezone', v, { shouldDirty: true })}
                options={timezoneOptions}
                placeholder="Select timezone"
                searchPlaceholder="Search timezones…"
                disabled={!editMode}
                triggerClassName="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Personal default. Each company can set its own timezone in company settings.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Role</Label>
              <div className="flex h-10 items-center">
                <Badge variant="outline" className="capitalize">
                  {(user?.role || 'user').replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {editMode ? (
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting} className="min-w-28">
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
