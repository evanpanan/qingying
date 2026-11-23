/**
 * LikeButton for the web, framework free, from dissolve (dissolve-ui). This file is yours.
 * The React component (like-button.tsx) wraps it; it also runs on its own:
 *
 *   const like = createLikeButton(document.querySelector('button')!, {
 *     liked: false, count: 128,
 *     onChange: (v) => like.update({ liked: v, count: 128 + (v ? 1 : 0) }),
 *   });
 *
 * Like: the heart pops and ten sparks burst around it. Unlike: the filled heart snaps away into
 * grains from its center and the outline is back underneath. Controlled, like the native one:
 * the core asks with onChange and shows the liked prop. The liked heart keeps the brand pink by
 * default (color); the outline and the idle count follow --dissolve-muted.
 */
import { play, snapshot } from './engine';
import { el, injectStyle, OUT_CUBIC, propsOf, QUAD, rectOf, reducedMotion, scope, value, vibrate } from './kit';

export type LikeButtonProps = {
  /** Controlled state. */
  liked?: boolean;
  /** Called with true right away on like, with false once the heart has snapped away. */
  onChange?: (liked: boolean) => void;
  /** Heart size in px. Default 26. */
  size?: number;
  /** Filled heart and counter when liked. Default '#FF2D55'. */
  color?: string;
  /** Outline and counter when not liked. Default the muted token. */
  idleColor?: string;
  /** Optional counter shown next to the heart. */
  count?: number;
  /** A short vibration on like and on the snap, where the browser has it. Default true. */
  haptics?: boolean;
  /** Counter text classes (size, weight). */
  countClassName?: string;
  /** Accessible label, localized by the application. */
  label?: string;
};

export type LikeButtonInstance = {
  update: (props: Partial<LikeButtonProps>) => void;
  destroy: () => void;
};

const DEFAULTS = { liked: false, size: 26, color: '#FF2D55', haptics: true };

const HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const SPARKS = 10;
const PALETTE = ['#e75a47', '#dab776', '#a9c88b', '#f4d6af', '#95bba9'];
const MUTED = 'var(--dissolve-muted, rgb(142 142 147))';

const CSS = `
:where([data-dissolve="like-button"]) {
  display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 0; border: 0; background: none;
  font: inherit; color: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
:where(.dissolve-like-heart) { position: relative; display: grid; place-items: center; flex: none; }
:where(.dissolve-like-pop) { display: grid; place-items: center; will-change: transform; }
:where(.dissolve-like-pop) > * { grid-area: 1 / 1; display: block; }
:where(.dissolve-like-pop) > [hidden] { display: none; }
:where(.dissolve-like-heart) svg { display: block; overflow: visible; }
:where(.dissolve-like-under) { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0; pointer-events: none; }
:where(.dissolve-like-spark) { position: absolute; left: 50%; top: 50%; border-radius: 50%; pointer-events: none; will-change: transform, opacity; }
:where(.dissolve-like-count) { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
:where(.dissolve-like-count[hidden]) { display: none; }
`;

const outline = (size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART}" fill="none" stroke-width="${(1.8 * 24) / size}"/></svg>`;

/** A like button on host (a <button> is best: focus and keyboard come for free). */
export function createLikeButton(host: HTMLElement, initial: LikeButtonProps = {}): LikeButtonInstance {
  injectStyle('dissolve-like-button', CSS);
  const props = propsOf(DEFAULTS, initial);
  const p = () => props.current;
  const sc = scope();
  const isButton = host instanceof HTMLButtonElement;

  host.dataset.dissolve = 'like-button';
  if (isButton) host.type = 'button';
  else host.setAttribute('role', 'button');

  const box = el('span', 'dissolve-like-heart');
  const pop = el('span', 'dissolve-like-pop');
  const idle = el('span');
  const under = el('span', 'dissolve-like-under');
  let filled = document.createElement('canvas');
  let sparks: HTMLElement[] = [];
  pop.append(idle, filled);
  const num = el('span');
  host.append(box, num);

  let busy = false;

  function build() {
    const { size, color } = p();
    box.style.width = box.style.height = size + 'px';
    sparks.forEach((s) => s.remove());
    const d = Math.max(4, size * 0.16);
    sparks = Array.from({ length: SPARKS }, (_, i) => {
      const s = el('span', 'dissolve-like-spark');
      s.style.cssText = `width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px;background:${PALETTE[i % PALETTE.length]};opacity:0`;
      return s;
    });
    box.replaceChildren(...sparks, pop, under);
    idle.innerHTML = under.innerHTML = outline(size);
    const next = snapshot(size, size, (ctx) => { ctx.scale(size / 24, size / 24); ctx.fillStyle = color; ctx.fill(new Path2D(HEART)); });
    next.style.width = next.style.height = size + 'px';
    filled.replaceWith(next);
    filled = next;
  }

  function render() {
    const { liked, color, idleColor, count, countClassName } = p();
    const idleInk = idleColor ?? MUTED;
    for (const path of [idle, under].map((n) => n.querySelector('path'))) path?.style.setProperty('stroke', idleInk);
    idle.hidden = liked;
    filled.hidden = !liked;
    num.className = 'dissolve-like-count' + (countClassName ? ' ' + countClassName : '');
    num.hidden = count === undefined;
    num.textContent = count === undefined ? '' : String(count);
    num.style.color = liked ? color : idleInk;
    host.setAttribute('aria-pressed', String(liked));
    host.setAttribute('aria-label', p().label ?? (liked ? 'Unlike' : 'Like'));
  }

  const scale = value(sc, 1, () => { pop.style.transform = `scale(${scale.v.toFixed(4)})`; });
  const burst = value(sc, 0, () => {
    const t = burst.v, size = p().size;
    sparks.forEach((s, i) => {
      const a = (i / SPARKS) * Math.PI * 2 - Math.PI / 2, r = size * 0.35 + t * size * 0.75;
      s.style.opacity = t === 0 ? '0' : (1 - t).toFixed(3);
      s.style.transform = `translate(${(Math.cos(a) * r).toFixed(2)}px,${(Math.sin(a) * r).toFixed(2)}px) scale(${(1 - t * 0.6).toFixed(3)})`;
    });
  });

  async function press() {
    if (busy) return;
    const { liked, haptics, size } = p();
    if (reducedMotion()) {
      p().onChange?.(!liked);
      return;
    }
    if (!liked) {
      if (haptics) vibrate(8);
      p().onChange?.(true);
      // A small, calm pop: 0.86 in 70 ms, back to 1 on a near critical spring (about 2 % overshoot).
      scale.to(0.86, 70, QUAD).then((ok) => ok && scale.spring(1, { stiffness: 550, damping: 35, eps: 0.001 }));
      burst.set(0);
      burst.to(1, 560, OUT_CUBIC).then((ok) => ok && burst.set(0));
      return;
    }
    busy = true;
    // While the filled heart turns to grains, the outline is already back underneath.
    under.style.opacity = '1';
    const shown = filled;
    const r = rectOf(shown);
    shown.style.opacity = '0';
    if (haptics) vibrate([4, 30, 4, 30, 4]);
    await sc.track(play({ source: shown, ...r, preset: 'snap', origin: { x: size / 2, y: size / 2 }, duration: 800, grain: Math.max(1.5, size / 14) })).done;
    if (!sc.alive) return;
    p().onChange?.(false);
    shown.style.opacity = '';
    under.style.opacity = '0';
    busy = false;
  }

  host.addEventListener('click', press);
  const stopMotion = () => {
    if (document.hidden || reducedMotion()) { scale.set(1); burst.set(0); }
  };
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener('change', stopMotion);
  document.addEventListener('visibilitychange', stopMotion);
  sc.onDispose(() => {
    preference.removeEventListener('change', stopMotion);
    document.removeEventListener('visibilitychange', stopMotion);
  });
  build();
  render();

  return {
    update(next) {
      const changed = props.update(next);
      if (!changed.size) return;
      if (changed.has('size') || changed.has('color')) build();
      render();
    },
    destroy() {
      sc.dispose();
      host.removeEventListener('click', press);
      box.remove();
      num.remove();
      host.removeAttribute('aria-pressed');
      host.removeAttribute('aria-label');
      if (!isButton) host.removeAttribute('role');
      delete host.dataset.dissolve;
    },
  };
}
