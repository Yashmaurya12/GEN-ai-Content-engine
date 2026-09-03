import { useState } from 'react';

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M4.5 4.5V3a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M2 6.5L5 9.5L11 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function cleanOutput(value) {
  return String(value ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\u{FE0F}/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function FormattedOutput({ content }) {
  return cleanOutput(content).split(/\n{2,}/).map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    const first = lines[0];
    const isHeading = lines.length === 1 && (/^\[[A-Z ]+\]$/.test(first) || /^(Hook|Key Takeaway|Executive Summary|Conclusion|Recommendations?|Insights?):/i.test(first));
    if (isHeading) return <h3 className="results-content-heading" key={index}>{first.replace(/^\[|\]$/g, '')}</h3>;
    return <div className="results-content-block" key={index}>{lines.map((line, lineIndex) => {
      const bullet = /^[-*•]\s+/.test(line);
      return bullet ? <div className="results-content-bullet" key={lineIndex}>{line.replace(/^[-*•]\s+/, '')}</div> : <p key={lineIndex}>{line}</p>;
    })}</div>;
  });
}

export default function ResultsWorkspace({ result, onCopy, copied }) {
  const entries = Object.entries(result);

  const [activeTab, setActiveTab] = useState(
    entries.length > 0 ? entries[0][0] : ''
  );
  const [rawOpen, setRawOpen] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="results-workspace" style={{ padding: '24px 18px', color: 'var(--text-3)', fontSize: 'var(--t-base)' }}>
        No outputs were returned.
      </div>
    );
  }

  // Guard: if activeTab was from a previous result, reset to first
  const validTab = entries.some(([k]) => k === activeTab)
    ? activeTab
    : entries[0][0];

  const activeContent = cleanOutput(result[validTab] ?? '');
  const isCopied = copied === validTab;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setRawOpen(false);
  };

  return (
    <div className="results-workspace" role="region" aria-label="Generated outputs">
      {/* Tab bar */}
      <div className="results-tabs" role="tablist" aria-label="Output formats">
        {entries.map(([format]) => (
          <button
            key={format}
            type="button"
            role="tab"
            aria-selected={format === validTab}
            aria-controls={`tabpanel-${format.replace(/\s+/g, '-')}`}
            id={`tab-${format.replace(/\s+/g, '-')}`}
            className={`results-tab${format === validTab ? ' results-tab--active' : ''}`}
            onClick={() => switchTab(format)}
          >
            {format}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div
        id={`tabpanel-${validTab.replace(/\s+/g, '-')}`}
        role="tabpanel"
        aria-labelledby={`tab-${validTab.replace(/\s+/g, '-')}`}
        className="results-panel"
      >
        <div className="results-panel-header">
          <h2 className="results-panel-title">{validTab}</h2>
          <div className="results-panel-actions">
            <button
              type="button"
              className={`btn btn-ghost btn-sm${isCopied ? ' btn--copied' : ''}`}
              onClick={() => onCopy(activeContent, validTab)}
              aria-label={`Copy ${validTab} to clipboard`}
            >
              {isCopied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          </div>
        </div>

        <div className="results-content">
          <FormattedOutput content={activeContent} />
        </div>

        {/* Raw JSON — secondary, collapsed by default */}
        <details
          className="results-raw"
          open={rawOpen}
          onToggle={(e) => setRawOpen(e.target.open)}
        >
          <summary className="results-raw-toggle">
            {rawOpen ? 'Hide' : 'Show'} raw JSON
          </summary>
          {rawOpen && (
            <pre className="results-raw-pre">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </details>
      </div>
    </div>
  );
}
