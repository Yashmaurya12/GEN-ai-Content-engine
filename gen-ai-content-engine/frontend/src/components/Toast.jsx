import { useEffect, useState } from 'react';

export default function Toast({ message, visible }) {
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    } else {
      const t = setTimeout(() => setRendered(false), 280);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <div
      className={`toast ${visible ? 'toast--visible' : 'toast--hiding'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Check icon */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M2.5 7L5.5 10L11.5 4"
          stroke="var(--success)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {message}
    </div>
  );
}
