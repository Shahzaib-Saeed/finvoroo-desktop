import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const ERROR_MESSAGES = {
  invalid_or_expired: 'This verification link has expired or is invalid.',
  user_not_found: "We couldn't find an account for this verification link.",
  invalid_hash: 'This verification link is invalid.',
};

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');
  const emailFromQuery = searchParams.get('email') || '';
  const legacyVerifyUrl = searchParams.get('verify_url');
  const verifyId = searchParams.get('id');
  const verifyHash = searchParams.get('hash');
  const expires = searchParams.get('expires');
  const signature = searchParams.get('signature');

  const hasSignedLink = Boolean(verifyId && verifyHash && expires && signature);
  const hasLegacyLink = Boolean(legacyVerifyUrl);

  const [email, setEmail] = useState(emailFromQuery);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState(
    hasSignedLink || hasLegacyLink ? 'verifying' : 'idle',
  );
  const [error, setError] = useState(
    errorParam ? ERROR_MESSAGES[errorParam] || "We couldn't verify your email." : null,
  );

  const verifyKey = useMemo(
    () => [verifyId, verifyHash, expires, signature].join('|'),
    [verifyId, verifyHash, expires, signature],
  );

  useEffect(() => {
    if (hasLegacyLink) {
      window.location.replace(legacyVerifyUrl);
      return undefined;
    }

    if (!hasSignedLink) return undefined;
    let cancelled = false;

    (async () => {
      setStatus('verifying');
      setError(null);
      try {
        const res = await api.get(`/auth/email/verify/${verifyId}/${verifyHash}`, {
          params: { expires, signature, format: 'json' },
          skipCacheBust: true,
        });
        if (cancelled) return;
        const verifiedEmail = res.data?.data?.email || emailFromQuery;
        setStatus('verified');
        toast.success('Email verified. You can now sign in.');
        navigate(
          `/auth/signin?verified=1&email=${encodeURIComponent(verifiedEmail || '')}`,
          { replace: true },
        );
      } catch (err) {
        if (cancelled) return;
        setStatus('failed');
        setError(
          err?.response?.data?.message ||
            ERROR_MESSAGES.invalid_or_expired,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasLegacyLink, legacyVerifyUrl, hasSignedLink, verifyKey, verifyId, verifyHash, expires, signature, emailFromQuery, navigate]);

  async function handleResend() {
    if (!email.trim()) {
      toast.error('Enter the email you registered with.');
      return;
    }
    setResending(true);
    try {
      await api.post('/auth/email/verification-notification', { email: email.trim() });
      toast.success('If that email is registered and unverified, a new link was sent.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  }

  if (status === 'verifying') {
    return (
      <div className="space-y-3 py-4 text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-[#2563EB]" />
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Verifying your email</h2>
        <p className="text-sm text-slate-500">Please wait a moment…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1 pb-1">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">Check your email</h2>
        <p className="text-sm text-slate-500">
          We sent a verification link. Open it in this browser — you stay on Finvoroo.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" appearance="light">
          <AlertIcon>
            <AlertCircle />
          </AlertIcon>
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <label className="text-sm font-medium">Email address</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
        <Button type="button" className="w-full" onClick={handleResend} disabled={resending}>
          {resending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Sending…
            </span>
          ) : (
            'Resend verification email'
          )}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/auth/signin" className="font-semibold text-foreground hover:text-primary">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
