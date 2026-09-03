const FORMAT_DESCRIPTIONS = {
  'Exec Summary':     'Concise leadership-ready overview',
  'Advisory':         'Strategic recommendation memo',
  'LinkedIn Post':    'Professional social content',
  'Video Script':     'Narrated script with scene beats',
  'Presentation':     'Slide-ready talking points',
  'Twitter/X Thread': 'Numbered, shareable thread',
  'Infographic':      'Visual-first structured summary',
};
const FORMAT_META = { 'Exec Summary':'3–5 min', Advisory:'Approx. 500 words', 'LinkedIn Post':'Approx. 150 words', 'Video Script':'2–3 min', Presentation:'8–10 slides', 'Twitter/X Thread':'6–8 posts', Infographic:'Visual outline' };
const FORMAT_ICONS = { 'Exec Summary':'▤', Advisory:'◌', 'LinkedIn Post':'in', 'Video Script':'▶', Presentation:'▥', 'Twitter/X Thread':'#', Infographic:'▦' };

export default function OutputSelector({ outputs, onToggle, onToggleAll, options }) {
  const selectedCount = options.filter((opt) => outputs[opt]).length;
  const allSelected   = selectedCount === options.length;
  const noneSelected  = selectedCount === 0;

  const handleToggleAll = () => {
    onToggleAll(!allSelected);
  };

  return (
    <div className="output-selector">
      {/* Header row */}
      <div className="output-selector-header">
        <div className="output-meta">
          <span className="output-count">
            {selectedCount} selected
          </span>
          <button
            type="button"
            className="text-btn"
            onClick={handleToggleAll}
            disabled={noneSelected && !allSelected ? false : false}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
      </div>

      {/* Format rows */}
      <div
        className="output-list"
        role="group"
        aria-label="Output format selection"
      >
        {options.map((opt) => {
          const selected = !!outputs[opt];
          return (
            <button
              type="button"
              key={opt}
              className={`output-row${selected ? ' output-row--selected' : ''}`}
              onClick={() => onToggle(opt)}
              aria-pressed={selected}
              aria-label={`${opt}: ${selected ? 'selected' : 'not selected'}`}
            >
              <span className="output-indicator" aria-hidden="true">
                <span className="output-indicator-dot" />
              </span>
              <div className="output-content">
                <span className="output-icon" aria-hidden="true">{FORMAT_ICONS[opt]}</span><span className="output-name">{opt}</span>
                <span className="output-desc">
                  {FORMAT_DESCRIPTIONS[opt] ?? ''}
                </span>
              </div>
              <span className="output-format-meta">{FORMAT_META[opt]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
