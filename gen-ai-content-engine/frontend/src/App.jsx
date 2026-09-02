import { useState, useEffect, useRef } from 'react';

import AppShell            from './components/AppShell';
import AuthScreen          from './components/AuthScreen';
import SourceInput         from './components/SourceInput';
import OutputSelector      from './components/OutputSelector';
import GenerationControls  from './components/GenerationControls';
import ResultsWorkspace    from './components/ResultsWorkspace';
import Toast               from './components/Toast';

import './App.css';

// Use environment variable with fallback for local development
const GW_URL = import.meta.env.VITE_GEN_AI_API_URL || 'http://localhost:8000';

const OUTPUT_OPTS = [
  'Exec Summary',
  'Advisory',
  'LinkedIn Post',
  'Video Script',
  'Presentation',
  'Twitter/X Thread',
  'Infographic',
];

const TONES = [
  'Professional',
  'Authoritative & Strategic',
  'Casual & Engaging',
  'Urgent & Action-Oriented',
  'Inspirational',
];

const AUDIENCES = [
  'Leadership / Execs',
  'General Public',
  'Tech / Developers',
  'Sales / Marketing',
  'Stakeholders & Investors',
];

const LOADING_STEP_INTERVAL_MS = 2000;

export default function App() {
  // ── Auth ──────────────────────────────────────────────────
  const [isAuthed, setIsAuthed] = useState(false);
  const [email,    setEmail]    = useState('');

  // ── Transform state ───────────────────────────────────────
  const [outputs, setOutputs] = useState({
    'Exec Summary': true,
    'Advisory':     true,
    'LinkedIn Post': true,
  });
  const [tone,       setTone]       = useState('Professional');
  const [audience,   setAudience]   = useState('Leadership / Execs');
  const [text,       setText]       = useState('');
  const [file,       setFile]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [loadingStep,setLoadingStep]= useState(0);
  const [engineErr,  setEngineErr]  = useState('');
  const [result,     setResult]     = useState(null);

  // ── Copy / Toast ──────────────────────────────────────────
  const [copied,      setCopied]      = useState('');
  const [toastVisible,setToastVisible]= useState(false);

  // ── Loading step cycling ──────────────────────────────────
  const stepTimerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      stepTimerRef.current = setInterval(() => {
        setLoadingStep((s) => s + 1);
      }, LOADING_STEP_INTERVAL_MS);
    } else {
      clearInterval(stepTimerRef.current);
    }
    return () => clearInterval(stepTimerRef.current);
  }, [loading]);

  // ── Auth handlers ─────────────────────────────────────────
  const handleAuth = (userEmail) => {
    setIsAuthed(true);
    setEmail(userEmail);
  };

  const logout = () => {
    fetch(`${GW_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setIsAuthed(false);
    setEmail('');
    setResult(null);
    setText('');
    setFile(null);
    setEngineErr('');
    setLoading(false);
  };

  // ── Transform handler ─────────────────────────────────────
  const transform = async (e) => {
    e.preventDefault();

    const selected = Object.keys(outputs).filter((k) => outputs[k]);

    if (!selected.length) {
      setEngineErr('Select at least one output format.');
      return;
    }

    if (!text.trim() && !file) {
      setEngineErr('Add source content — paste text or upload a file.');
      return;
    }

    setLoading(true);
    setEngineErr('');
    setResult(null);

    const fd = new FormData();
    if (file) fd.append('file', file);
    if (text) fd.append('text', text);
    fd.append('tone',     tone);
    fd.append('audience', audience);
    fd.append('outputs',  JSON.stringify(selected));

    try {
      const res = await fetch(`${GW_URL}/transform`, {
        method: 'POST',
        body:   fd,
        credentials: 'include',
      });

      if (res.status === 401) {
        logout();
        throw new Error('Your session expired. Please sign in again.');
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error (${res.status}).`);
      }

      setResult(await res.json());
    } catch (err) {
      setEngineErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setAllOutputs = (val) => {
    const newOutputs = {};
    OUTPUT_OPTS.forEach((opt) => {
      newOutputs[opt] = val;
    });
    setOutputs(newOutputs);
  };

  // ── Copy ──────────────────────────────────────────────────
  const handleCopy = (content, key) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(key);
      setToastVisible(true);
      setTimeout(() => {
        setCopied('');
        setToastVisible(false);
      }, 1800);
    });
  };

  // ── Render ────────────────────────────────────────────────
  if (!isAuthed) {
    return <AuthScreen onAuth={handleAuth} gwUrl={GW_URL} />;
  }

  return (
    <AppShell email={email} onLogout={logout}>
      <div className="workspace">
        {/* Top bar */}
        <header className="workspace-topbar">
          <h1 className="workspace-title">Workspace</h1>
          <p className="workspace-subtitle">
            Repurpose source content for multi-channel publishing.
          </p>
        </header>

        {/* Main content */}
        <main className="workspace-main">
          <form className="workspace-form" onSubmit={transform} noValidate>

            {/* Source content */}
            <section className="workspace-section" aria-labelledby="lbl-source">
              <span className="workspace-section-label" id="lbl-source">Source content</span>
              <SourceInput
                text={text}
                onTextChange={setText}
                file={file}
                onFileChange={setFile}
              />
            </section>

            {/* Output formats */}
            <section className="workspace-section" aria-labelledby="lbl-formats">
              <span className="workspace-section-label" id="lbl-formats">Output formats</span>
              <OutputSelector
                outputs={outputs}
                onToggle={(opt) => setOutputs((o) => ({ ...o, [opt]: !o[opt] }))}
                onToggleAll={setAllOutputs}
                options={OUTPUT_OPTS}
              />
            </section>

            {/* Tone, audience, and submit */}
            <GenerationControls
              tone={tone}           onToneChange={setTone}
              audience={audience}   onAudienceChange={setAudience}
              tones={TONES}         audiences={AUDIENCES}
              loading={loading}
              loadingStep={loadingStep}
              error={engineErr}
            />

          </form>

          {/* Results */}
          {result && (
            <section
              className="workspace-section workspace-section--results"
              aria-labelledby="lbl-results"
            >
              <span className="workspace-section-label" id="lbl-results">Results</span>
              <ResultsWorkspace
                result={result}
                onCopy={handleCopy}
                copied={copied}
              />
            </section>
          )}
        </main>
      </div>

      <Toast message="Copied to clipboard" visible={toastVisible} />
    </AppShell>
  );
}
