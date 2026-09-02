import { useState } from 'react';
import DarkVeil from './DarkVeil';
import Infographic from './Infographic';
import './App.css';

const GW_URL = 'http://localhost:8000';
const OUTPUT_OPTS = ['Exec Summary', 'Advisory', 'LinkedIn Post', 'Video Script', 'Presentation', 'Twitter/X Thread', 'Infographic'];
const TONES = ['Professional', 'Authoritative & Strategic', 'Casual & Engaging', 'Urgent & Action-Oriented', 'Inspirational'];
const AUDIENCES = ['Leadership / Execs', 'General Public', 'Tech / Developers', 'Sales / Marketing', 'Stakeholders & Investors'];

export default function App() {
  // ── Auth State ─────────────────────────────────────
  const [isAuthed, setIsAuthed]     = useState(false);
  const [otpSent, setOtpSent]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [auth, setAuth]             = useState({ email: '', password: '', code: '' });
  const [authErr, setAuthErr]       = useState('');
  const [authMsg, setAuthMsg]       = useState('');

  // ── Transform State ────────────────────────────────
  const [outputs, setOutputs] = useState({ 'Exec Summary': true, 'Advisory': true, 'LinkedIn Post': true });
  const [tone, setTone]       = useState('Professional');
  const [audience, setAudience] = useState('Leadership / Execs');
  const [text, setText]         = useState('');
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [engineErr, setEngineErr] = useState('');
  const [result, setResult]     = useState(null);
  const [rawView, setRawView]   = useState(false);
  const [copied, setCopied]     = useState('');

  // ── Auth Handlers ──────────────────────────────────
  const sendCode = async (e) => {
    e.preventDefault();
    if (!auth.email) { setAuthErr('Email is required.'); return; }
    setAuthErr(''); setSending(true); setAuthMsg('');
    try {
      const res = await fetch(`${GW_URL}/auth/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.email, password: auth.password }),
      });
      const data = await res.json();
      setOtpSent(true);
      setAuthMsg(data.channel === 'console'
        ? 'Check your backend terminal for the OTP.'
        : 'Verification code sent to your email.');
    } catch {
      setAuthErr('Failed to send code. Is the backend running?');
    } finally { setSending(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setAuthErr('');
    try {
      const res = await fetch(`${GW_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.email, password: auth.password, code: auth.code }),
      });
      const ok = await res.json();
      if (ok === true) setIsAuthed(true);
      else setAuthErr('Invalid verification code.');
    } catch { setAuthErr('Verification failed.'); }
  };

  const logout = () => {
    setIsAuthed(false); setOtpSent(false);
    setAuth({ email: '', password: '', code: '' });
    setResult(null);
  };

  // ── Transform Handler ──────────────────────────────
  const transform = async (e) => {
    e.preventDefault();
    const selected = Object.keys(outputs).filter(k => outputs[k]);
    if (!selected.length) { setEngineErr('Select at least one output format.'); return; }
    setLoading(true); setEngineErr(''); setResult(null);
    const fd = new FormData();
    if (file) fd.append('file', file);
    if (text)  fd.append('text', text);
    fd.append('tone', tone);
    fd.append('audience', audience);
    fd.append('outputs', JSON.stringify(selected));
    try {
      const res = await fetch(`${GW_URL}/transform`, { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed.'); }
      setResult(await res.json());
    } catch (err) { setEngineErr(err.message); }
    finally { setLoading(false); }
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const toggleOutput = (opt) =>
    setOutputs(o => ({ ...o, [opt]: !o[opt] }));

  // ── Render ─────────────────────────────────────────
  return (
    <div className="app-root">
      {/* DarkVeil — fixed, behind everything */}
      <DarkVeil
        hueShift={46}
        scanlineIntensity={0.2}
        speed={1.2}
        scanlineFrequency={1.9}
        warpAmount={1.8}
      />

      {/* ── Login Screen ── */}
      {!isAuthed && (
        <div className="auth-wrapper">
          <div className="auth-panel">
            <h1 className="auth-heading">Gen AI Engine</h1>
            <p className="auth-subtext">Enter your email to receive a one-time login code.</p>

            <form onSubmit={otpSent ? verifyCode : sendCode}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={auth.email}
                  onChange={e => setAuth(a => ({ ...a, email: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Optional"
                  value={auth.password}
                  disabled={otpSent}
                  onChange={e => setAuth(a => ({ ...a, password: e.target.value }))}
                />
              </div>

              {!otpSent && (
                <button type="submit" className="btn btn-primary btn-full" disabled={sending}>
                  {sending ? <><span className="spinner" /> Sending…</> : 'Send Verification Code'}
                </button>
              )}

              {otpSent && (
                <>
                  <div className="divider" />
                  <div className="field">
                    <label>6-Digit Code</label>
                    <input
                      type="text"
                      className="otp-input"
                      placeholder="123456"
                      maxLength={6}
                      value={auth.code}
                      onChange={e => setAuth(a => ({ ...a, code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="input-row">
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      Verify & Login
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setOtpSent(false)}>
                      Back
                    </button>
                  </div>
                </>
              )}

              {authErr && <div className="msg msg-error">{authErr}</div>}
              {authMsg && <div className="msg msg-success">{authMsg}</div>}
            </form>
          </div>
        </div>
      )}

      {/* ── Dashboard ── */}
      {isAuthed && (
        <div className="content-layer">
          <div className="page-column">

            {/* Header */}
            <div className="page-header">
              <div className="page-header-inner">
                <div>
                  <p className="page-title">Content Transformation Engine</p>
                  <p className="page-subtitle">Repurpose content for multi-channel publishing.</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={logout}>Sign Out</button>
              </div>
            </div>

            {/* Transform Form */}
            <div className="panel">
              <p className="panel-title">Input</p>
              <form onSubmit={transform}>
                <div className="field">
                  <label>Upload Document (PDF / TXT / PNG / JPG)</label>
                  <input
                    type="file"
                    className="file-input"
                    onChange={e => setFile(e.target.files[0])}
                  />
                </div>

                <div className="field">
                  <label>Or paste raw text</label>
                  <textarea
                    placeholder="Paste article, meeting notes, research, or raw text…"
                    value={text}
                    onChange={e => setText(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Output Formats</label>
                  <div className="pill-group">
                    {OUTPUT_OPTS.map(opt => (
                      <label key={opt} className={`pill ${outputs[opt] ? 'active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!!outputs[opt]}
                          onChange={() => toggleOutput(opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="two-col">
                  <div className="field">
                    <label>Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value)}>
                      {TONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Target Audience</label>
                    <select value={audience} onChange={e => setAudience(e.target.value)}>
                      {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading
                    ? <><span className="spinner" /> Generating…</>
                    : 'Transform Content'}
                </button>
              </form>

              {engineErr && <div className="msg msg-error">{engineErr}</div>}
            </div>

            {/* Results */}
            {result && (
              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p className="panel-title" style={{ marginBottom: 0 }}>Generated Outputs</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setRawView(v => !v)}>
                    {rawView ? 'Formatted' : 'Raw JSON'}
                  </button>
                </div>

                {rawView ? (
                  <pre className="raw-json">{JSON.stringify(result, null, 2)}</pre>
                ) : (
                  Object.entries(result).map(([format, content]) => (
                    <div className="result-item" key={format}>
                      <div className="result-item-header">
                        <span className="result-format-name">{format}</span>
                        <button
                          className={`btn btn-ghost btn-sm ${copied === format ? 'copied-btn' : ''}`}
                          onClick={() => copyText(content, format)}
                        >
                          {copied === format ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="result-body">{content}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Infographic */}
            <div className="panel">
              <Infographic />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
