export default function HistoryDrawer({ isOpen, onClose, history, onDelete, onSelect }) {
  return (
    <aside className={`history-drawer ${isOpen ? 'history-drawer--open' : ''}`}>
      <div className="history-drawer-header">
        <h2>Your History</h2>
        <button onClick={onClose} className="history-drawer-close" aria-label="Close history">
          &times;
        </button>
      </div>
      
      <div className="history-drawer-content">
        {!history.length ? (
          <p className="section-helper" style={{ padding: 16 }}>No transformations saved yet.</p>
        ) : (
          history.map(item => (
            <div key={item.id} className="history-card">
              <div className="history-card-header">
                {/* created_at is an ISO string now, so we can just use new Date() */}
                <strong>{new Date(item.created_at).toLocaleString()}</strong>
                <button onClick={() => onDelete(item.id)} className="history-card-delete" aria-label="Delete history item">
                  &times;
                </button>
              </div>
              <p className="history-card-source">{item.source}</p>
              <p className="history-card-outputs">{item.outputs?.join(', ')}</p>
              <div className="history-card-actions">
                <button onClick={() => onSelect(item)} className="history-card-load">Load</button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
