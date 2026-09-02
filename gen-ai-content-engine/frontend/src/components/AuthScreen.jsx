import { useState } from 'react';

function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="8" height="8" rx="2" fill="var(--accent)" />
      <rect x="11" y="1" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.45" />
      <rect x="1" y="11" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.45" />
      <rect x="11" y="11" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.15" />
    </svg>
  );
}

export default function AuthScreen({ onAuth, gwUrl }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const goBack = () => {
    setStep('email');
    setCode('');
    setError('');
    setMessage('');
  };

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setError('');
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${gwUrl}/auth/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Unable to send code.');
      setStep('otp');
      setMessage(
        data.channel === 'console'
          ? 'Check your backend terminal for the OTP.'
          : 'Verification code sent to your email.'
      );
    } catch {
      setError('Failed to send code. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${gwUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, code }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        onAuth(data.email || email.trim());
      } else {
        setError('Invalid or expired code. Please try again.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        {/* Branding */}
        <div className="auth-logo">
          <LogoMark />
          <span className="auth-logo-text">Content Engine</span>
        </div>
        <div className="auth-rule" />

        {step === 'email' ? (
          <>
            <h1 className="auth-heading">Sign in</h1>
            <p className="auth-subtext">
              Enter your email to receive a one-time verification code.
            </p>

            <form onSubmit={sendCode} noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="auth-password">
                  Password{' '}
                  <span className="form-label-hint">(optional)</span>
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="form-input"
                  placeholder="Leave blank if none set"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="form-msg form-msg--error" role="alert">{error}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: 18 }}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" aria-hidden="true" /> Sending code…</>
                  : 'Send verification code'
                }
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-heading">Enter your code</h1>
            {message && <p className="auth-subtext">{message}</p>}

            <form onSubmit={verifyCode} noValidate>
              <div className="form-field">
                <label className="form-label" htmlFor="auth-otp">6-digit code</label>
                <input
                  id="auth-otp"
                  type="text"
                  className="form-input form-input--otp"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="form-msg form-msg--error" role="alert">{error}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                style={{ marginTop: 18 }}
                disabled={loading || code.length < 6}
              >
                {loading
                  ? <><span className="spinner" aria-hidden="true" /> Verifying…</>
                  : 'Verify and sign in'
                }
              </button>

              <button
                type="button"
                className="auth-back"
                onClick={goBack}
              >
                ← Back to email
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
