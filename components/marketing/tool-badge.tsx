"use client";

import { useEffect, useRef } from "react";

/**
 * An animated tool-assembly emblem: tool-shaped particles fly in from the
 * edges and settle into a spanner and screwdriver crossed inside a ring, with
 * a hammer, pliers and tape measure around the rim — then holds with a soft
 * glow and a slow breathing wobble, looping forever.
 *
 * Ported from a Claude Design canvas artboard (the original ran on a
 * timeline/tweaks-panel runtime specific to that editor — not something a
 * Next.js page can load) into a self-contained canvas animation with no
 * other dependency: the assemble/hold timing and per-particle physics are
 * unchanged, recoloured from the original gold-on-dark to the site's own
 * white-and-orange, and gated on prefers-reduced-motion — reduced motion
 * gets the fully assembled emblem, static, no flight or wobble.
 */

const STAGE = 960;
const CENTER = STAGE / 2;
const ASSEMBLE_SECONDS = 8;
const HOLD_SECONDS = 2;
const CYCLE_SECONDS = ASSEMBLE_SECONDS + HOLD_SECONDS;

const LINE = "#ffffff";
/** A lighter tint of the site's burnt-orange primary (#c73f08) — chosen for
 * visibility against a dark photo, the same reason the original used a light
 * gold rather than its darkest tone for the ring and satellite tools. */
const ACCENT = "#ff8a4c";
const GLOW_RGB = "255,138,76";

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(t: number) {
  const x = t - 1;
  return x * x * x + 1;
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ToolType = "spanner" | "screwdriver" | "hammer" | "pliers" | "tape";

/** Outline-only tool glyphs, stroke never fill — spanner, screwdriver, hammer, pliers, tape measure. */
function drawTool(
  ctx: CanvasRenderingContext2D,
  type: ToolType,
  size: number,
  color: string,
  weight: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size * weight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "spanner") {
    ctx.beginPath();
    ctx.arc(
      0,
      -size * 0.42,
      size * 0.2,
      (40 * Math.PI) / 180,
      (320 * Math.PI) / 180,
    );
    ctx.stroke();
    ctx.strokeRect(-size * 0.06, -size * 0.32, size * 0.12, size * 0.6);
  } else if (type === "screwdriver") {
    ctx.strokeRect(-size * 0.04, -size * 0.46, size * 0.08, size * 0.5);
    ctx.strokeRect(-size * 0.055, size * 0.05, size * 0.11, size * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, size * 0.28, size * 0.15, size * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "hammer") {
    ctx.strokeRect(-size * 0.045, -size * 0.38, size * 0.09, size * 0.66);
    ctx.strokeRect(-size * 0.26, -size * 0.48, size * 0.52, size * 0.16);
  } else if (type === "pliers") {
    ctx.save();
    ctx.rotate(0.32);
    ctx.strokeRect(-size * 0.045, -size * 0.48, size * 0.09, size * 0.96);
    ctx.restore();
    ctx.save();
    ctx.rotate(-0.32);
    ctx.strokeRect(-size * 0.045, -size * 0.48, size * 0.09, size * 0.96);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.06, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === "tape") {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(size * 0.24, -size * 0.045, size * 0.14, size * 0.09);
  }
}

interface Target {
  tx: number;
  ty: number;
  cr: number;
  cg: number;
  cb: number;
}

/** Draws the assembled badge offscreen, then samples its stroked pixels into flight targets. */
function buildTargets(): { pts: Target[]; ringR: number } {
  const S = 700;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  const cx = S / 2;
  const cy = S / 2;
  const r = S * 0.4;

  ctx.lineWidth = S * 0.012;
  ctx.strokeStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.55);
  drawTool(ctx, "spanner", S * 0.34, LINE, 0.05);
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.55);
  drawTool(ctx, "screwdriver", S * 0.34, LINE, 0.05);
  ctx.restore();

  const satellites: { type: ToolType; angle: number }[] = [
    { type: "hammer", angle: -Math.PI / 2 },
    { type: "pliers", angle: (2 * Math.PI) / 3 - Math.PI / 2 },
    { type: "tape", angle: (4 * Math.PI) / 3 - Math.PI / 2 },
  ];
  satellites.forEach((s) => {
    const x = cx + r * Math.cos(s.angle);
    const y = cy + r * Math.sin(s.angle);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.angle + Math.PI / 2);
    drawTool(ctx, s.type, S * 0.16, ACCENT, 0.055);
    ctx.restore();
  });

  const data = ctx.getImageData(0, 0, S, S).data;
  const step = 2;
  const pts: Target[] = [];
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      const idx = (y * S + x) * 4;
      if (data[idx + 3] < 60) continue;
      pts.push({
        tx: CENTER + (x - cx),
        ty: CENTER + (y - cy),
        cr: data[idx],
        cg: data[idx + 1],
        cb: data[idx + 2],
      });
    }
  }
  return { pts, ringR: r };
}

export function ToolBadge({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const { pts, ringR } = buildTargets();
    const n = pts.length;
    const rng = mulberry32(7);
    const origins = new Float32Array(n * 2);
    const delays = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const edge = Math.floor(rng() * 4);
      let sx: number;
      let sy: number;
      if (edge === 0) {
        sx = -80;
        sy = rng() * STAGE;
      } else if (edge === 1) {
        sx = STAGE + 80;
        sy = rng() * STAGE;
      } else if (edge === 2) {
        sx = rng() * STAGE;
        sy = -80;
      } else {
        sx = rng() * STAGE;
        sy = STAGE + 80;
      }
      origins[i * 2] = sx;
      origins[i * 2 + 1] = sy;
      delays[i] = rng();
    }

    function render(t: number) {
      ctx!.clearRect(0, 0, STAGE, STAGE);

      const p0 = clamp(t / ASSEMBLE_SECONDS, 0, 1);
      const span = 0.62;

      const glowAlpha = 0.22 * easeOutCubic(p0);
      const glow = ctx!.createRadialGradient(
        CENTER,
        CENTER,
        10,
        CENTER,
        CENTER,
        ringR * 1.6,
      );
      glow.addColorStop(0, `rgba(${GLOW_RGB},${glowAlpha})`);
      glow.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, STAGE, STAGE);

      const settleT = clamp((t - ASSEMBLE_SECONDS) / HOLD_SECONDS, 0, 1);
      const wobble = Math.sin(t * 0.7) * 0.01 * (0.4 + 0.6 * settleT);
      const breathe = 1 + Math.sin(t * 0.6) * 0.008 * settleT;

      ctx!.save();
      ctx!.translate(CENTER, CENTER);
      ctx!.rotate(wobble);
      ctx!.scale(breathe, breathe);
      ctx!.translate(-CENTER, -CENTER);

      for (let i = 0; i < n; i++) {
        const d = delays[i];
        let p = clamp((p0 - d * (1 - span)) / span, 0, 1);
        p = p * p * (3 - 2 * p);
        const ox = origins[i * 2];
        const oy = origins[i * 2 + 1];
        const pt = pts[i];
        const x = ox + (pt.tx - ox) * p;
        const y = oy + (pt.ty - oy) * p;
        const size = 1 + 1.3 * p;
        ctx!.fillStyle = `rgba(${pt.cr},${pt.cg},${pt.cb},${0.5 + 0.5 * p})`;
        ctx!.beginPath();
        ctx!.arc(x, y, size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
    }

    if (reduceMotion) {
      render(CYCLE_SECONDS);
      return;
    }

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = ((now - start) / 1000) % CYCLE_SECONDS;
      render(elapsed);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    // The canvas's own width/height style is 100% of ITS box, so the size and
    // position have to live on this wrapper — a canvas takes an inline style
    // over any class on itself, so size-* on the canvas directly would be
    // silently ignored and the badge would render at the size of its nearest
    // positioned ancestor instead (the whole hero, in one early version of
    // this component — particles scattered across the entire section).
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={STAGE}
        height={STAGE}
        aria-hidden
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
