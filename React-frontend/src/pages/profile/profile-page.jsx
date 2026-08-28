import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { Camera, Mail, Pencil, ShieldCheck, User } from 'lucide-react';
import { Container } from '@/components/common/container';
import { UserHero } from '@/partials/common/user-hero';
import { Navbar, NavbarActions } from '@/partials/navbar/navbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { authService } from '@/auth/services/auth-service';
import { useAuthStore } from '@/store/authStore';
import { resolveUserAvatarUrl } from '@/lib/helpers';
import { getTimezoneOptions, timezoneLabel } from '@/lib/timezone-options';
import { ProfilePageMenu } from './components/profile-page-menu';
import { ProfileContent } from './components/profile-content';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(191),
  email: z.string().email('Invalid email').max(191),
  phone: z.string().max(50).optional().or(z.literal('')),
  timezone: z.string().max(64).optional().or(z.literal('')),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'At least 8 characters'),
    new_password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.new_password === d.new_password_confirmation, {
    message: 'Passwords do not match',
    path: ['new_password_confirmation'],
  });

const TIMEZONE_OPTIONS = getTimezoneOptions();
const timezoneComboboxOptions = TIMEZONE_OPTIONS.map((tz) => ({
  value: tz,
  label: timezoneLabel(tz),
  keywords: [tz.replace(/_/g, ' ')],
}));

function AvatarInitial({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-full border-2 border-green-200 size-[100px] shrink-0 bg-primary text-primary-foreground text-3xl font-bold">
      {initials}
    </div>
  );
}

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('section') || 'overview';
  const [user, setUser] = useState(authService.getUser());
  const [companies, setCompanies] = useState(authService.getCompanies());
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(
    ['overview', 'account', 'security'].includes(initialSection) ? initialSection : 'overview',
  );

  useEffect(() => {
    const section = searchParams.get('section') || 'overview';
    if (['overview', 'account', 'security'].includes(section)) {
      setActiveSection(section);
    }
  }, [searchParams]);

  const [editMode, setEditMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarFileRef = useRef(null);
  const avatarFileObj = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      timezone: user?.timezone || 'UTC',
    },
  });

  const timezoneValue = watch('timezone');
  const timezoneOptions = useMemo(() => timezoneComboboxOptions, []);

  const {
    register: regPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data.data.user;
        const c = res.data.data.companies || [];
        setUser(u);
        setCompanies(c);
        reset({
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          timezone: u.timezone || 'UTC',
        });
        useAuthStore.getState().updateUser(u);
      })
      .finally(() => setLoading(false));
  }, [reset]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarFileObj.current = file;
    setAvatarPreview(URL.createObjectURL(file));
    setEditMode(true);
    setActiveSection('account');
  }

  function startEdit() {
    setSaveError(null);
    setEditMode(true);
    setActiveSection('account');
  }

  function cancelEdit() {
    setEditMode(false);
    reset({
      name: user?.name,
      email: user?.email,
      phone: user?.phone || '',
      timezone: user?.timezone || 'UTC',
    });
    setAvatarPreview(null);
    avatarFileObj.current = null;
  }

  async function onSaveProfile(values) {
    try {
      setSaveError(null);
      setSaveSuccess(false);
      const form = new FormData();
      form.append('name', values.name);
      form.append('email', values.email);
      if (values.phone) form.append('phone', values.phone);
      if (values.timezone) form.append('timezone', values.timezone);
      if (avatarFileObj.current) form.append('avatar', avatarFileObj.current);
      form.append('_method', 'PUT');

      const res = await api.post('/auth/profile', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data.data;
      setUser(updated);
      useAuthStore.getState().updateUser(updated);
      setSaveSuccess(true);
      setEditMode(false);
      avatarFileObj.current = null;
      setAvatarPreview(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update profile.';
      const fields = err?.response?.data?.errors || {};
      setSaveError({ msg, fields });
    }
  }

  async function onChangePassword(values) {
    try {
      setPwError(null);
      setPwSuccess(false);
      await api.put('/auth/profile', {
        name: user?.name,
        email: user?.email,
        current_password: values.current_password,
        new_password: values.new_password,
        new_password_confirmation: values.new_password_confirmation,
      });
      setPwSuccess(true);
      resetPw();
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to change password.';
      const fields = err?.response?.data?.errors || {};
      setPwError({ msg, fields });
    }
  }

  const avatarSrc =
    avatarPreview || resolveUserAvatarUrl(user);

  const heroImage = loading ? (
    <Skeleton className="size-[100px] rounded-full" />
  ) : (
    <div className="relative">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          className="size-[100px] rounded-full border-2 border-green-200 object-cover shrink-0 bg-background"
          alt={user?.name}
        />
      ) : (
        <AvatarInitial name={user?.name} />
      )}
      <button
        type="button"
        onClick={() => avatarFileRef.current?.click()}
        className="absolute bottom-0 end-0 size-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition"
        title="Change photo"
      >
        <Camera className="size-4" />
      </button>
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
    </div>
  );

  const roleLabel = (user?.role || 'user').replace(/_/g, ' ');

  return (
    <Fragment>
      <UserHero
        name={loading ? 'Loading...' : user?.name || 'Account'}
        image={heroImage}
        info={[
          { label: roleLabel, icon: ShieldCheck },
          { label: timezoneLabel(user?.timezone || 'UTC'), icon: User },
          { label: user?.email || '—', icon: Mail },
        ]}
      />

      <Container>
        <Navbar>
          <ProfilePageMenu activeSection={activeSection} onSectionChange={setActiveSection} />
          <NavbarActions>
            <Button
              onClick={startEdit}
              disabled={loading || editMode}
            >
              <Pencil className="size-4" />
              Edit profile
            </Button>
          </NavbarActions>
        </Navbar>
      </Container>

      <Container>
        <ProfileContent
          user={user}
          companies={companies}
          loading={loading}
          activeSection={activeSection}
          editMode={editMode}
          onEdit={startEdit}
          onCancelEdit={cancelEdit}
          register={register}
          errors={errors}
          timezoneValue={timezoneValue}
          setValue={setValue}
          timezoneOptions={timezoneOptions}
          isSubmitting={isSubmitting}
          saveSuccess={saveSuccess}
          saveError={saveError}
          onSaveProfile={handleSubmit(onSaveProfile)}
          regPw={regPw}
          pwErrors={pwErrors}
          pwSubmitting={pwSubmitting}
          pwSuccess={pwSuccess}
          pwError={pwError}
          onChangePassword={handlePwSubmit(onChangePassword)}
        />
      </Container>
    </Fragment>
  );
}
