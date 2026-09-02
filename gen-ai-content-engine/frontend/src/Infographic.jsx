import { useEffect, useRef, useState } from 'react';

const STATS = [
  { label: 'Content volume increase', pct: 78 },
  { label: 'Time saved per campaign', pct: 65 },
  { label: 'Marketers using AI tools', pct: 84 },
  { label: 'SEO score improvement',   pct: 52 },
  { label: 'Cost reduction in ops',   pct: 60 },
];

function Bar({ pct, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

export default function Infographic() {
  return (
    <div className="infographic">
      <div className="infographic-header">
        <p className="infographic-label">AI Content Generation — 2025</p>
        <h2 className="infographic-title">The State of AI-Powered Content</h2>
        <p className="infographic-desc">
          How generative AI is reshaping content strategy, marketing ops,
          and creative production at scale.
        </p>
      </div>

      {/* Key Stats Grid */}
      <div className="stat-grid">
        <div className="stat-cell">
          <div className="stat-value">10×</div>
          <div className="stat-label">Faster content production</div>
          <div className="stat-note">vs traditional workflows</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">+41%</div>
          <div className="stat-label">Engagement lift</div>
          <div className="stat-note">with AI-tailored copy</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">$1.8T</div>
          <div className="stat-label">Market size by 2030</div>
          <div className="stat-note">global AI content market</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">50+</div>
          <div className="stat-label">Languages supported</div>
          <div className="stat-note">by leading platforms</div>
        </div>
      </div>

      {/* Adoption Bars */}
      <p className="bar-section-title">Industry Adoption Metrics</p>
      {STATS.map((s, i) => (
        <div className="bar-row" key={i}>
          <span className="bar-label">{s.label}</span>
          <Bar pct={s.pct} delay={200 + i * 120} />
          <span className="bar-pct">{s.pct}%</span>
        </div>
      ))}

      {/* Takeaway */}
      <div className="takeaway">
        <p className="takeaway-text">
          <strong>Bottom line:</strong> Teams embedding AI into content workflows
          produce <strong>3× more output</strong> at <strong>60% lower cost</strong> while
          maintaining brand consistency and quality.
        </p>
      </div>
    </div>
  );
}
