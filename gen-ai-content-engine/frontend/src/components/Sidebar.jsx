import { useEffect } from 'react';
import cognitoLogo from '../assets/cognito-logo.png';

/* ── Icons ─────────────────────────────────────────────────── */
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 5v3.25L10 9.75" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 2v1M8 13v1M2 8h1M13 8h1M3.87 3.87l.71.71M11.42 11.42l.71.71M3.87 12.13l.71-.71M11.42 4.58l.71-.71"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M6 13H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 10.5L13.5 7.5 10 4.5M13.5 7.5H6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg
      className="sidebar-chevron"
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path d="M8.5 2L4.5 6.5l4 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: 'workspace', label: 'Workspace', Icon: IconGrid,    disabled: false },
  { id: 'history',   label: 'History',   Icon: IconHistory, disabled: false },
  { id: 'settings',  label: 'Settings',  Icon: IconSettings,disabled: true  },
];

/* ── Logo mark (2×2 grid) ──────────────────────────────────── */
function LogoMark() {
  return <img className="brand-logo" src={cognitoLogo} alt="Cognito logo" />;
}

/* ── Sidebar ────────────────────────────────────────────────── */
export default function Sidebar({
  collapsed,
  onCollapseToggle,
  email,
  onLogout,
  isMobile,
  drawerOpen,
  onDrawerClose,
  onHistory,
  onNewWorkspace,
  history = [],
  onSelectHistory,
  onDeleteHistory,
}) {
  // Lock scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && drawerOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, drawerOpen]);

  const showLabels = isMobile || !collapsed;

  const cls = [
    'sidebar',
    !isMobile && collapsed ? 'sidebar--collapsed' : '',
    isMobile              ? 'sidebar--mobile'    : '',
    isMobile && drawerOpen ? 'sidebar--open'     : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={cls} aria-label="Primary navigation">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <LogoMark />
          </div>
          {showLabels && (
            <span className="sidebar-logo-text">Cognito AI</span>
          )}
        </div>

        {isMobile ? (
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={onDrawerClose}
            aria-label="Close navigation"
          >
            <IconClose />
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={onCollapseToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <IconChevron />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        <ul className="sidebar-nav-list" role="list">
          {NAV_ITEMS.map(({ id, label, Icon, disabled }) => (
            <li key={id}>
              <button
                type="button"
                className={[
                  'sidebar-nav-item',
                  id === 'workspace' ? 'sidebar-nav-item--active' : '',
                ].filter(Boolean).join(' ')}
                disabled={disabled}
                onClick={() => id === 'history' && onHistory?.()}
                aria-current={id === 'workspace' ? 'page' : undefined}
                title={!showLabels ? label : undefined}
              >
                <span className="sidebar-nav-icon">
                  <Icon />
                </span>
                {showLabels && <span className="sidebar-nav-label">{label}</span>}
                {showLabels && disabled && (
                  <span className="sidebar-nav-badge">Coming later</span>
                )}
              </button>
              {id === 'workspace' && showLabels && <button type="button" className="sidebar-new-workspace" onClick={onNewWorkspace} title="start new workplace" aria-label="start new workplace">+</button>}
              {id === 'history' && showLabels && history.length > 0 && <div className="sidebar-history-preview">
                {history.slice(0, 4).map((item) => <div className="sidebar-history-item" key={item.id}>
                  <button type="button" onClick={() => onSelectHistory?.(item)} title={item.source}><strong>{item.source?.slice(0, 28) || 'Untitled'}{item.source?.length > 28 ? '…' : ''}</strong><span>{item.outputs?.join(', ')}</span></button>
                  <button type="button" className="sidebar-history-delete" onClick={(event) => { event.stopPropagation(); onDeleteHistory?.(item.id); }} aria-label="Delete history item">×</button>
                </div>)}
              </div>}
            </li>
          ))}
        </ul>
      </nav>

      {/* Account */}
      <div className="sidebar-account">
        {showLabels && email && (
          <div className="sidebar-email" title={email}>{email}</div>
        )}
        <button
          type="button"
          className="sidebar-signout"
          onClick={onLogout}
          title={!showLabels ? 'Sign out' : undefined}
          aria-label="Sign out"
        >
          <IconSignOut />
          {showLabels && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
