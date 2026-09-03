import { useState, useEffect, useRef } from 'react';

import AppShell            from './components/AppShell';
import AuthScreen          from './components/AuthScreen';
import SourceInput         from './components/SourceInput';
import OutputSelector      from './components/OutputSelector';
import GenerationControls  from './components/GenerationControls';
import ResultsWorkspace    from './components/ResultsWorkspace';
import Toast               from './components/Toast';
import AnimatedContent     from './components/AnimatedContent';
import HistoryDrawer       from './components/HistoryDrawer';

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
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const historyRequestRef = useRef(0);
  const emailRef = useRef('');

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
    historyRequestRef.current += 1;
    emailRef.current = userEmail;
    setIsAuthed(true);
    setEmail(userEmail);
    setHistory([]);
    setHistoryError('');
    setShowHistory(false);
  };

  const logout = () => {
    historyRequestRef.current += 1;
    emailRef.current = '';
    fetch(`${GW_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    setIsAuthed(false);
    setEmail('');
    setHistory([]);
    setHistoryError('');
    setShowHistory(false);
    setResult(null);
    setText('');
    setFile(null);
    setEngineErr('');
    setLoading(false);
  };

  const openHistory = async () => {
    const requestId = ++historyRequestRef.current;
    const requestedEmail = email;
    setHistoryError('');
    try {
      const res = await fetch(`${GW_URL}/history`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (requestId !== historyRequestRef.current || emailRef.current !== requestedEmail) return;
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) throw new Error(data.detail || `Unable to load history (${res.status}).`);
      setHistory(data.history || []);
    } catch (err) {
      if (requestId !== historyRequestRef.current || emailRef.current !== requestedEmail) return;
      setHistoryError(err.message || 'Unable to load history.');
    }
    if (requestId !== historyRequestRef.current || emailRef.current !== requestedEmail) return;
    setShowHistory(true);
  };
  const selectHistory = (item) => { setResult(item.result || null); setText(item.source || ''); setTone(item.tone || 'Professional'); setAudience(item.audience || 'Leadership / Execs'); setShowHistory(false); };
  const newWorkspace = () => { setResult(null); setText(''); setFile(null); setEngineErr(''); setShowHistory(false); };
  const deleteHistory = async (id) => {
    const requestedEmail = email;
    try {
      const res = await fetch(`${GW_URL}/history/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Unable to delete history item.');
      if (emailRef.current === requestedEmail) {
        setHistory((items) => items.filter((item) => item.id !== id));
      }
    } catch (err) {
      if (emailRef.current === requestedEmail) {
        setHistoryError(err.message);
      }
    }
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

    setLoadingStep(0);
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
    <AppShell email={email} onLogout={logout} onHistory={openHistory} onNewWorkspace={newWorkspace} history={history} onSelectHistory={selectHistory} onDeleteHistory={deleteHistory}>
      <HistoryDrawer 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        history={history} 
        onDelete={deleteHistory} 
        onSelect={selectHistory} 
      />
      <div className="workspace">
        {/* Top bar */}
        <AnimatedContent><header className="workspace-topbar">
          <div className="eyebrow">CONTENT ENGINE / WORKSPACE</div>
          <h1 className="workspace-title">Create content</h1>
          <p className="workspace-subtitle">
            Turn source material into useful, ready-to-publish formats.
          </p>
          <div className="progress" aria-label="Creation progress">
            <span className="progress-step progress-step--current"><b>01</b> Source material</span>
            <span className="progress-rule" />
            <span className="progress-step"><b>02</b> Select formats</span>
            <span className="progress-rule" />
            <span className="progress-step"><b>03</b> Generate</span>
          </div>
        </header></AnimatedContent>

        {/* Main content */}
        <main className="workspace-main">
          <form className="workspace-form" onSubmit={transform} noValidate>

            {/* Source content */}
            <AnimatedContent><section className="workspace-section" aria-labelledby="lbl-source">
              <div className="section-heading"><div><span className="workspace-section-label" id="lbl-source">Source material</span><p className="section-helper">Paste a brief, notes, article, or transcript.</p></div></div>
              <SourceInput
                text={text}
                onTextChange={setText}
                file={file}
                onFileChange={setFile}
              />
            </section></AnimatedContent>

            {/* Output formats */}
            <AnimatedContent><section className="workspace-section" aria-labelledby="lbl-formats">
              <div className="section-heading"><div><span className="workspace-section-label" id="lbl-formats">Output formats</span><p className="section-helper">Choose the forms that fit your audience.</p></div></div>
              <OutputSelector
                outputs={outputs}
                onToggle={(opt) => setOutputs((o) => ({ ...o, [opt]: !o[opt] }))}
                onToggleAll={setAllOutputs}
                options={OUTPUT_OPTS}
              />
            </section></AnimatedContent>

            {/* Tone, audience, and submit */}
            <GenerationControls
              tone={tone}           onToneChange={setTone}
              audience={audience}   onAudienceChange={setAudience}
              tones={TONES}         audiences={AUDIENCES}
              loading={loading}
              loadingStep={loadingStep}
              error={engineErr}
              canGenerate={!!(text.trim() || file) && Object.values(outputs).some(Boolean)}
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
