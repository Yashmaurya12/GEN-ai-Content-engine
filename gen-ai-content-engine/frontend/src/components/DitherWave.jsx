import { useEffect, useRef } from 'react';

const FRAME_INTERVAL_MS = 1000 / 30;

export default function DitherWave({ className = '', interactive = false, staticAnimation = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let frame = 0;
    let rafId = 0;
    let lastFrameAt = 0;
    let width = 0;
    let height = 0;
    let pointer = { x: 0.5, y: 0.5, active: false };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = !reducedMotion && !staticAnimation;

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(201,139,75,.14)';
      const step = 7;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const dx = x / width - pointer.x;
          const dy = y / height - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const cursorWave = interactive && pointer.active
            ? Math.max(0, 1 - distance * 2.8) * Math.sin(distance * 36 - frame * 0.025) * 10
            : 0;
          const wave = Math.sin(x * 0.009 + frame * 0.004) * 8
            + Math.sin(y * 0.018 + frame * 0.002) * 3 + cursorWave;
          if (((x + y + Math.round(wave)) / step) % 4 < 0.8) ctx.fillRect(x, y + wave, 2, 2);
        }
      }

      frame += 1;
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      draw();
    };

    const tick = (now) => {
      if (document.hidden) {
        rafId = 0;
        return;
      }
      if (now - lastFrameAt >= FRAME_INTERVAL_MS) {
        lastFrameAt = now;
        draw();
      }
      rafId = requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (shouldAnimate && !document.hidden && !rafId) {
        lastFrameAt = 0;
        rafId = requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
        active: true,
      };
      if (!shouldAnimate) draw();
    };
    const onPointerLeave = () => {
      pointer.active = false;
      if (!shouldAnimate) draw();
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else {
        resize();
        startAnimation();
      }
    };
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);

    resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (interactive) {
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
    }
    resize();
    startAnimation();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [interactive, staticAnimation]);
  return <canvas ref={ref} className={`dither-wave ${className}`} aria-hidden="true" />;
}
