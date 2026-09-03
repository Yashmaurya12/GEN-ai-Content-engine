import { useState } from 'react';
import DotGrid from './DotGrid';
import cognitoLogo from '../assets/cognito-logo.png';

function LogoMark() {
  return <span className="brand-logo-frame"><img className="brand-logo" src={cognitoLogo} alt="Cognito logo" /></span>;
}

export default function AuthScreen({ onAuth, gwUrl }) {
  const [step, setStep] = useState('email'); // email | otp | forgot | forgot-otp
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

  const startForgot = () => { setStep('forgot'); setError(''); setMessage(''); };

  const sendCode = async (e) => {
    e.preventDefault();
      if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 8) { setError('Password is required and must be at least 8 characters.'); return; }
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
      if (data.authenticated) { onAuth(data.email || email.trim()); return; }
      setStep('otp');
      setMessage(
        data.channel === 'console'
          ? 'Check your backend terminal for the OTP.'
          : 'Verification code sent to your email.'
      );
    } catch (err) {
      setError(err.message || 'Failed to send code. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const sendForgotCode = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${gwUrl}/auth/forgot/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Unable to send code.');
      setStep('forgot-otp'); setMessage(data.channel === 'console' ? 'Check your backend terminal for the OTP.' : data.message);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch(`${gwUrl}/auth/forgot/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), code, new_password: password }), credentials: 'include' });
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Password reset failed.');
      onAuth(data.email || email.trim());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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
      <div className="auth-background" aria-hidden="true"><DotGrid
        dotSize={3} gap={24} baseColor="#292824" activeColor="#8b6036"
        proximity={120} shockRadius={250} shockStrength={5} returnDuration={1.5}
      /></div>
      <div className="auth-panel">
        {/* Branding */}
        <div className="auth-logo">
          <LogoMark />
          <span className="auth-logo-text">Cognito AI</span>
        </div>
        <div className="auth-rule" />

        {step === 'email' ? (
          <>
            <h1 className="auth-heading">Sign in</h1>
            <p className="auth-subtext">
              Log in with your email and password. New email IDs require verification once.
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
                  <span className="form-label-hint">(required)</span>
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="form-input"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" aria-hidden="true" /> Sending code…</>
                  : 'Log in'
                }
              </button>
              <button type="button" className="auth-back" onClick={startForgot}>Forgot password?</button>
            </form>
          </>
        ) : step === 'forgot' ? (
          <>
            <h1 className="auth-heading">Reset password</h1><p className="auth-subtext">Enter your registered email to receive a verification code.</p>
            <form onSubmit={sendForgotCode} noValidate><div className="form-field"><label className="form-label" htmlFor="auth-forgot-email">Email</label><input id="auth-forgot-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>{error && <p className="form-msg form-msg--error">{error}</p>}<button className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Sending…' : 'Send verification code'}</button><button type="button" className="auth-back" onClick={goBack}>← Back to login</button></form>
          </>
        ) : step === 'forgot-otp' ? (
          <>
            <h1 className="auth-heading">Set a new password</h1>{message && <p className="auth-subtext">{message}</p>}
            <form onSubmit={resetPassword} noValidate><div className="form-field"><label className="form-label">6-digit code</label><input className="form-input form-input--otp" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></div><div className="form-field"><label className="form-label">New password</label><input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div>{error && <p className="form-msg form-msg--error">{error}</p>}<button className="btn btn-primary btn-full" disabled={loading || code.length < 6 || password.length < 8}>{loading ? 'Resetting…' : 'Reset password'}</button><button type="button" className="auth-back" onClick={goBack}>← Back to login</button></form>
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
