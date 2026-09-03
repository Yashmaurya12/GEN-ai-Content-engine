import { useEffect, useRef } from 'react';

export default function DotGrid({
  dotSize = 5, gap = 15, baseColor = '#605a66', activeColor = '#c8832a',
  proximity = 120, shockRadius = 250, shockStrength = 5, returnDuration = 1.5,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let pointer = { x: -9999, y: -9999 };
    let shock = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const base = baseColor.match(/\w\w/g).map((v) => parseInt(v, 16));
    const active = activeColor.match(/\w\w/g).map((v) => parseInt(v, 16));

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      requestDraw();
    };

    const move = (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      requestDraw();
    };
    const leave = () => {
      pointer = { x: -9999, y: -9999 };
      requestDraw();
    };
    const click = (e) => {
      const rect = canvas.getBoundingClientRect();
      shock = { x: e.clientX - rect.left, y: e.clientY - rect.top, time: performance.now() };
      if (reducedMotion) {
        shock = null;
        requestDraw();
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animateShock);
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, width, height);
      for (let y = gap / 2; y < height; y += gap) for (let x = gap / 2; x < width; x += gap) {
        const dx = x - pointer.x; const dy = y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / proximity);
        let offsetX = 0; let offsetY = 0;
        if (shock) {
          const sx = x - shock.x; const sy = y - shock.y; const sd = Math.hypot(sx, sy);
          const age = (now - shock.time) / 1000;
          if (age < returnDuration && sd < shockRadius) {
            const push = Math.sin((1 - age / returnDuration) * Math.PI) * (1 - sd / shockRadius) * shockStrength * 12;
            offsetX = (sx / (sd || 1)) * push; offsetY = (sy / (sd || 1)) * push;
          }
        }
        const color = base.map((v, i) => Math.round(v + (active[i] - v) * influence));
        ctx.fillStyle = `rgb(${color.join(',')})`;
        ctx.beginPath(); ctx.arc(x + offsetX, y + offsetY, dotSize / 2 + influence * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      if (shock && now - shock.time >= returnDuration * 1000) shock = null;
    };

    const requestDraw = () => {
      if (!rafId) {
        rafId = requestAnimationFrame((now) => {
          rafId = 0;
          draw(now);
        });
      }
    };

    const animateShock = (now) => {
      draw(now);
      rafId = shock ? requestAnimationFrame(animateShock) : 0;
    };

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('click', click);
    resize();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('click', click);
    };
  }, [dotSize, gap, baseColor, activeColor, proximity, shockRadius, shockStrength, returnDuration]);

  return <canvas ref={canvasRef} className="dot-grid" aria-hidden="true" />;
}
