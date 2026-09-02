import { useEffect, useRef } from 'react';

export default function DarkVeil({
  hueShift = 46,
  scanlineIntensity = 0.2,
  speed = 1.2,
  scanlineFrequency = 1.9,
  warpAmount = 1.8,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) * 0.001 * speed;

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Deep dark background
      ctx.fillStyle = '#08080c';
      ctx.fillRect(0, 0, W, H);

      // Animated gradient warp blobs
      const cx1 = W * 0.3 + Math.sin(elapsed * 0.4) * W * 0.1 * warpAmount;
      const cy1 = H * 0.4 + Math.cos(elapsed * 0.3) * H * 0.15 * warpAmount;
      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, W * 0.45);
      g1.addColorStop(0, `hsla(${hueShift + 160}, 70%, 20%, 0.18)`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const cx2 = W * 0.7 + Math.cos(elapsed * 0.35) * W * 0.12 * warpAmount;
      const cy2 = H * 0.6 + Math.sin(elapsed * 0.45) * H * 0.12 * warpAmount;
      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, W * 0.4);
      g2.addColorStop(0, `hsla(${hueShift + 30}, 80%, 18%, 0.15)`);
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      const cx3 = W * 0.5 + Math.sin(elapsed * 0.25) * W * 0.08 * warpAmount;
      const cy3 = H * 0.2 + Math.cos(elapsed * 0.5) * H * 0.1 * warpAmount;
      const g3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, W * 0.3);
      g3.addColorStop(0, `hsla(${hueShift + 200}, 60%, 25%, 0.12)`);
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);

      // Scanlines
      const lineGap = Math.max(2, Math.round(6 / scanlineFrequency));
      ctx.fillStyle = `rgba(0, 0, 0, ${scanlineIntensity})`;
      for (let y = 0; y < H; y += lineGap) {
        ctx.fillRect(0, y, W, 1);
      }

      // Subtle noise vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [hueShift, scanlineIntensity, speed, scanlineFrequency, warpAmount]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
