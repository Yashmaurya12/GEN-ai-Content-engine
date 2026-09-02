const FORMAT_DESCRIPTIONS = {
  'Exec Summary':     'Concise leadership-ready overview',
  'Advisory':         'Strategic recommendation memo',
  'LinkedIn Post':    'Professional social content',
  'Video Script':     'Narrated script with scene beats',
  'Presentation':     'Slide-ready talking points',
  'Twitter/X Thread': 'Numbered, shareable thread',
  'Infographic':      'Visual-first structured summary',
};

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path
        d="M1.5 4.5L3.5 6.5L7.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
            {selectedCount} of {options.length} selected
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
            <label
              key={opt}
              className={`output-row${selected ? ' output-row--selected' : ''}`}
            >
              <input
                type="checkbox"
                className="output-checkbox"
                checked={selected}
                onChange={() => onToggle(opt)}
                aria-label={opt}
              />
              <span className="output-indicator" aria-hidden="true">
                {selected && <CheckIcon />}
              </span>
              <div className="output-content">
                <span className="output-name">{opt}</span>
                <span className="output-desc">
                  {FORMAT_DESCRIPTIONS[opt] ?? ''}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
