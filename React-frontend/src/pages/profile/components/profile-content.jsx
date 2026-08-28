import { ProfileStatistics } from './profile-statistics';
import { ProfileHighlights } from './profile-highlights';
import { ProfileContact } from './profile-contact';
import { ProfileCompaniesList } from './profile-companies-list';
import { ProfileAccountCard } from './profile-account-card';
import { ProfilePasswordCard } from './profile-password-card';
import { ProfileSessionsCard } from './profile-sessions-card';
import { profileSectionVisible } from './profile-page-menu';
import { timezoneLabel } from '@/lib/timezone-options';

function memberYear(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : String(d.getFullYear());
}

export function ProfileContent({
  user,
  companies,
  loading,
  activeSection,
  editMode,
  onEdit,
  onCancelEdit,
  register,
  errors,
  timezoneValue,
  setValue,
  timezoneOptions,
  isSubmitting,
  saveSuccess,
  saveError,
  onSaveProfile,
  regPw,
  pwErrors,
  pwSubmitting,
  pwSuccess,
  pwError,
  onChangePassword,
}) {
  const stats = [
    { number: loading ? '—' : String(companies.length), label: 'Companies' },
    {
      number: loading ? '—' : (user?.role || 'user').replace(/_/g, ' '),
      label: 'Account role',
    },
    {
      number: loading ? '—' : (user?.timezone || 'UTC').split('/').pop()?.replace(/_/g, ' ') || 'UTC',
      label: 'Timezone',
    },
    { number: loading ? '—' : memberYear(user?.created_at), label: 'Member since' },
  ];

  const showOverview = profileSectionVisible(activeSection, 'overview');
  const showAccount = profileSectionVisible(activeSection, 'account');
  const showSecurity = profileSectionVisible(activeSection, 'security');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5 pb-8">
      {showOverview ? (
        <div className="col-span-1 lg:col-span-3">
          <ProfileStatistics items={stats} />
        </div>
      ) : null}

      {showOverview ? (
        <div className="col-span-1">
          <div className="flex flex-col gap-5 lg:gap-7.5">
            <ProfileHighlights user={user} loading={loading} />
            <ProfileContact user={user} loading={loading} />
            <ProfileCompaniesList companies={companies} loading={loading} />
          </div>
        </div>
      ) : null}

      <div className={showOverview ? 'col-span-1 lg:col-span-2' : 'col-span-1 lg:col-span-3'}>
        <div className="flex flex-col gap-5 lg:gap-7.5">
          {showAccount ? (
            <ProfileAccountCard
              user={user}
              editMode={editMode}
              onEdit={onEdit}
              onCancel={onCancelEdit}
              register={register}
              errors={errors}
              timezoneValue={timezoneValue}
              setValue={setValue}
              timezoneOptions={timezoneOptions}
              isSubmitting={isSubmitting}
              saveSuccess={saveSuccess}
              saveError={saveError}
              onSubmit={onSaveProfile}
            />
          ) : null}

          {showSecurity ? (
            <>
              <ProfilePasswordCard
                register={regPw}
                errors={pwErrors}
                isSubmitting={pwSubmitting}
                pwSuccess={pwSuccess}
                pwError={pwError}
                onSubmit={onChangePassword}
              />
              <ProfileSessionsCard />
            </>
          ) : null}

          {!showOverview && activeSection === 'account' && !loading ? (
            <p className="text-sm text-muted-foreground">
              Timezone: {timezoneLabel(user?.timezone || 'UTC')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
