/** Calm, one-time entrance wrapper for major page sections. */
export default function AnimatedContent({ children, className = '' }) {
  return <div className={`animated-content ${className}`}>{children}</div>;
}
