import { useState, useRef, useCallback } from 'react';

const ACCEPTED_EXTENSIONS = '.pdf,.txt,.png,.jpg,.jpeg';
const ACCEPTED_MIME = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
];

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(mimeType) {
  const map = {
    'application/pdf': 'PDF',
    'text/plain':      'TXT',
    'image/png':       'PNG',
    'image/jpeg':      'JPG',
  };
  return map[mimeType] ?? 'FILE';
}

export default function SourceInput({ text, onTextChange, file, onFileChange }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const applyFile = useCallback(
    (f) => {
      if (f && ACCEPTED_MIME.includes(f.type)) {
        onFileChange(f);
      }
    },
    [onFileChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      applyFile(e.dataTransfer.files[0]);
    },
    [applyFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = (e) => {
    e.stopPropagation();
    onFileChange(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const openPicker = () => {
    if (!file) fileRef.current?.click();
  };

  const dropzoneCls = [
    'dropzone',
    dragOver ? 'dropzone--over' : '',
    file     ? 'dropzone--has-file' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="source-input">
      {/* ── Drop zone / file attachment ── */}
      <div
        className={dropzoneCls}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openPicker}
        role={file ? undefined : 'button'}
        tabIndex={file ? -1 : 0}
        onKeyDown={(e) => {
          if (!file && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-label={file ? undefined : 'Click or drag a file to attach'}
      >
        <input
          ref={fileRef}
          type="file"
          className="dropzone-file-input"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => applyFile(e.target.files[0])}
          aria-hidden="true"
          tabIndex={-1}
        />

        {file ? (
          <div className="file-attachment">
            <span className="file-badge">{getExt(file.type)}</span>
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatBytes(file.size)}</span>
            </div>
            <button
              type="button"
              className="file-remove"
              onClick={removeFile}
              aria-label={`Remove ${file.name}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="dropzone-prompt">
            {/* Upload icon */}
            <svg
              className="dropzone-prompt-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 11V4M5.5 6.5L8 4l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M3 12.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
            </svg>
            <span className="dropzone-prompt-main">
              {dragOver ? 'Drop to attach' : 'Drag a file or click to upload'}
            </span>
            <span className="dropzone-prompt-types">PDF · TXT · PNG · JPG</span>
          </div>
        )}
      </div>

      {/* ── Textarea ── */}
      <div className="textarea-wrap">
        <textarea
          className="source-textarea"
          placeholder="Or paste your content here — article, notes, report, transcript…"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          aria-label="Source text input"
          rows={6}
        />
        {text.length > 0 && (
          <span className="textarea-count" aria-live="polite">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        )}
      </div>
    </div>
  );
}
