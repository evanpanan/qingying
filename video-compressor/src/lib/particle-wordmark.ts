// Adapted from Dissolve's MIT-licensed footer.js. See THIRD_PARTY_NOTICES.md.
const WORDS = ['LIGHTVID', 'DOWNLOAD', 'LIGHTVID', 'CONVERT', 'LIGHTVID', 'COMPRESS']
type Dot = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; alpha: number; targetAlpha: number }

function sample(word: string, width: number, height: number, gap: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []
  let size = height * .83
  const font = (value: number) => `800 ${value}px "Arial Black", sans-serif`
  context.font = font(size)
  size *= Math.min(1, width * .96 / context.measureText(word).width)
  context.font = font(size)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(word, width / 2, height / 2 + size * .035)
  const pixels = context.getImageData(0, 0, width, height).data
  const points: [number, number][] = []
  for (let y = gap / 2; y < height; y += gap) {
    for (let x = gap / 2; x < width; x += gap) {
      if (pixels[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] > 140) points.push([x, y])
    }
  }
  return points.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

export function mountParticleWordmark(box: HTMLElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return () => {}
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let width = 0, height = 0, gap = 5, frame = 0, last = 0, elapsed = 0, word = 0
  let visible = false, disposed = false, mouseX = -10000, mouseY = -10000
  let dots: Dot[] = [], targets: [number, number][][] = []
  const aim = () => {
    const points = targets[word]
    if (!points?.length) return
    dots.forEach((dot, index) => {
      const point = points[Math.floor(index / dots.length * points.length)]
      dot.tx = point[0]
      dot.ty = point[1]
      dot.targetAlpha = (index * points.length) % dots.length < points.length ? 1 : .3
    })
    box.dataset.word = WORDS[word]
  }
  const draw = () => {
    context.clearRect(0, 0, width, height)
    context.fillStyle = '#eeeae0'
    const radius = gap * .31
    for (const dot of dots) {
      context.globalAlpha = dot.alpha
      context.beginPath()
      context.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
      context.fill()
    }
    context.globalAlpha = 1
  }
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
    last = 0
    box.dataset.running = 'false'
  }
  const step = (now: number) => {
    frame = 0
    if (!visible || document.hidden || motion.matches || disposed) return
    const dt = Math.min(2, (now - (last || now - 16.67)) / 16.67)
    last = now
    elapsed += dt * 16.67
    if (elapsed > 3800) { elapsed = 0; word = (word + 1) % WORDS.length; aim() }
    const radius = Math.max(55, gap * 14), radiusSquared = radius * radius
    for (const dot of dots) {
      dot.vx += (dot.tx - dot.x) * .045 * dt
      dot.vy += (dot.ty - dot.y) * .045 * dt
      const dx = dot.x - mouseX, dy = dot.y - mouseY, distanceSquared = dx * dx + dy * dy
      if (distanceSquared < radiusSquared && distanceSquared > .01) {
        const force = (1 - distanceSquared / radiusSquared) * 2.8 * dt / Math.sqrt(distanceSquared)
        dot.vx += dx * force
        dot.vy += dy * force
      }
      dot.vx *= .84 ** dt
      dot.vy *= .84 ** dt
      dot.x += dot.vx * dt
      dot.y += dot.vy * dt
      dot.alpha += (dot.targetAlpha - dot.alpha) * .08 * dt
    }
    draw()
    frame = requestAnimationFrame(step)
  }
  const start = () => {
    if (visible && !document.hidden && !motion.matches && !frame && !disposed) {
      box.dataset.running = 'true'
      frame = requestAnimationFrame(step)
    }
  }
  const layout = () => {
    const nextWidth = Math.round(box.clientWidth)
    if (!nextWidth || nextWidth === width || disposed) return
    width = nextWidth
    height = Math.round(Math.min(270, Math.max(85, width * .21)))
    gap = width < 600 ? 4 : 6
    const dpr = Math.min(2, devicePixelRatio || 1)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    targets = WORDS.map((value) => sample(value, width, height, gap))
    const count = Math.max(...targets.map((points) => points.length))
    const points = targets[word]
    if (!points.length) return
    dots = Array.from({ length: count }, (_, index) => {
      const [x, y] = points[Math.floor(index / count * points.length)]
      return { x, y, tx: x, ty: y, vx: 0, vy: 0, alpha: 1, targetAlpha: 1 }
    })
    box.dataset.particles = String(count)
    box.dataset.ready = 'true'
    aim()
    draw()
    start()
  }
  const move = (event: PointerEvent) => {
    if (motion.matches) return
    const bounds = canvas.getBoundingClientRect()
    mouseX = event.clientX - bounds.left
    mouseY = event.clientY - bounds.top
  }
  const leave = () => { mouseX = mouseY = -10000 }
  const scatter = () => {
    if (motion.matches) return
    leave()
    dots.forEach((dot) => {
      const angle = Math.random() * Math.PI * 2, speed = 6 + Math.random() * 14
      dot.vx += Math.cos(angle) * speed
      dot.vy += Math.sin(angle) * speed
    })
    elapsed = 0
    start()
  }
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); scatter() }
  }
  const visibility = () => { if (document.hidden) stop(); else start() }
  const preference = () => {
    stop()
    leave()
    word = 0
    elapsed = 0
    width = 0
    layout()
  }
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) start(); else stop()
  }, { threshold: .05 })
  const resize = new ResizeObserver(layout)
  intersection.observe(box)
  resize.observe(box)
  box.addEventListener('pointermove', move, { passive: true })
  box.addEventListener('pointerleave', leave)
  box.addEventListener('pointerup', scatter)
  box.addEventListener('keydown', keyboard)
  document.addEventListener('visibilitychange', visibility)
  motion.addEventListener('change', preference)
  layout()
  void document.fonts.ready.then(() => { if (!disposed) { width = 0; layout() } })
  return () => {
    disposed = true
    stop()
    intersection.disconnect()
    resize.disconnect()
    box.removeEventListener('pointermove', move)
    box.removeEventListener('pointerleave', leave)
    box.removeEventListener('pointerup', scatter)
    box.removeEventListener('keydown', keyboard)
    document.removeEventListener('visibilitychange', visibility)
    motion.removeEventListener('change', preference)
  }
}
