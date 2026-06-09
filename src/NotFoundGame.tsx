import { useState, useEffect, useRef, useCallback } from 'react'
import './NotFoundGame.css'

type GameState = 'start' | 'playing' | 'transition' | 'complete'

interface LevelConfig {
  count: number
  speed: number
  target: string
  targetColor: string
  sizeVariance: number
}

const LEVELS: LevelConfig[] = [
  { count: 10,  speed: 1.3, target: '500', targetColor: '#ffe600', sizeVariance: 24 },
  { count: 18,  speed: 2.0, target: '418', targetColor: '#ff8800', sizeVariance: 20 },
  { count: 28,  speed: 2.8, target: '301', targetColor: '#ff44aa', sizeVariance: 18 },
  { count: 38,  speed: 3.6, target: '403', targetColor: '#bb33ff', sizeVariance: 14 },
  { count: 52,  speed: 4.8, target: '503', targetColor: '#dd2222', sizeVariance: 8  },
]

const DECOY_COLORS = ['#cc1111', '#dd2222', '#bb1111', '#cc2222', '#ee2222', '#aa1111']
const BG = '#06060f'
const MONO = '"Courier New", Consolas, monospace'

interface Bubble {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  isTarget: boolean
  color: string
  glitchX: number
  glitchY: number
  glitchTimer: number
  glitchDuration: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

function makeBubbles(lvl: number, w: number, h: number): Bubble[] {
  const cfg = LEVELS[lvl]
  const list: Bubble[] = []

  for (let i = 0; i < cfg.count - 1; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = cfg.speed * (0.5 + Math.random())
    list.push({
      id: i,
      x: 60 + Math.random() * (w - 120),
      y: 60 + Math.random() * (h - 120),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      size: 14 + Math.random() * cfg.sizeVariance,
      isTarget: false,
      color: DECOY_COLORS[Math.floor(Math.random() * DECOY_COLORS.length)],
      glitchX: 0, glitchY: 0,
      glitchTimer: Math.floor(Math.random() * 200) + 40,
      glitchDuration: 0,
    })
  }

  const a = Math.random() * Math.PI * 2
  const sp = cfg.speed * (0.5 + Math.random())
  list.push({
    id: cfg.count - 1,
    x: 60 + Math.random() * (w - 120),
    y: 60 + Math.random() * (h - 120),
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    size: 14 + Math.random() * cfg.sizeVariance,
    isTarget: true,
    color: cfg.targetColor,
    glitchX: 0, glitchY: 0,
    glitchTimer: Math.floor(Math.random() * 200) + 40,
    glitchDuration: 0,
  })

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

export default function NotFoundGame() {
  const [gameState, setGameState] = useState<GameState>('start')
  const [level, setLevel] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const gameStateRef = useRef<GameState>('start')
  const levelRef = useRef(0)
  const shakeRef = useRef(0)
  const wRef = useRef(window.innerWidth)
  const hRef = useRef(window.innerHeight)

  gameStateRef.current = gameState
  levelRef.current = level

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current
      if (!c) return
      c.width = window.innerWidth
      c.height = window.innerHeight
      wRef.current = window.innerWidth
      hRef.current = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const spawnParticles = useCallback((x: number, y: number, success: boolean) => {
    const colors = success
      ? ['#ffe600', '#ffaa00', '#ffffff', '#ff8800']
      : ['#ff0000', '#cc0000', '#ff4444']
    const count = success ? 32 : 14
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
      const sp = (success ? 4 : 2) + Math.random() * 5
      particlesRef.current.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (success ? 2 : 0),
        life: (success ? 50 : 20) + Math.floor(Math.random() * 30),
        maxLife: success ? 80 : 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * (success ? 5 : 3),
      })
    }
  }, [])

  useEffect(() => {
    if (gameState === 'start' || gameState === 'complete') return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!

    const loop = () => {
      const W = wRef.current
      const H = hRef.current
      const state = gameStateRef.current
      const lvl = levelRef.current
      const cfg = LEVELS[lvl]

      let sx = 0, sy = 0
      if (shakeRef.current > 0) {
        shakeRef.current--
        const mag = shakeRef.current * 0.45
        sx = (Math.random() - 0.5) * mag
        sy = (Math.random() - 0.5) * mag
      }

      ctx.fillStyle = state === 'playing' ? 'rgba(6,6,15,0.28)' : BG
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(sx, sy)

      ctx.strokeStyle = 'rgba(200,20,20,0.045)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      if (Math.random() < 0.018 && state === 'playing') {
        const gy = Math.random() * H
        ctx.fillStyle = `rgba(255,${Math.random() > 0.5 ? 0 : 180},0,${0.08 + Math.random() * 0.12})`
        ctx.fillRect(0, gy, W, 1 + Math.random() * 4)
      }

      bubblesRef.current.forEach(b => {
        if (state === 'playing') {
          b.x += b.vx; b.y += b.vy
          if (b.x < b.size)     { b.x = b.size;     b.vx =  Math.abs(b.vx) }
          if (b.x > W - b.size) { b.x = W - b.size; b.vx = -Math.abs(b.vx) }
          if (b.y < b.size)     { b.y = b.size;     b.vy =  Math.abs(b.vy) }
          if (b.y > H - b.size) { b.y = H - b.size; b.vy = -Math.abs(b.vy) }

          if (b.glitchDuration > 0) {
            b.glitchDuration--
            if (b.glitchDuration === 0) { b.glitchX = 0; b.glitchY = 0; b.glitchTimer = 60 + Math.floor(Math.random() * 160) }
          } else {
            if (--b.glitchTimer <= 0) {
              b.glitchDuration = 3 + Math.floor(Math.random() * 9)
              b.glitchX = (Math.random() - 0.5) * 14
              b.glitchY = (Math.random() - 0.5) * 7
            }
          }
        }

        const text = b.isTarget ? cfg.target : '404'
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.font = `bold ${b.size}px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (b.glitchDuration > 0) {
          ctx.globalAlpha = 0.45
          ctx.fillStyle = '#ff0000'; ctx.fillText(text,  b.glitchX, 0)
          ctx.fillStyle = '#00ffff'; ctx.fillText(text, -b.glitchX * 0.6, b.glitchY)
          ctx.globalAlpha = 1
        }

        ctx.shadowColor = b.color
        ctx.shadowBlur = 14
        ctx.fillStyle = b.color
        ctx.fillText(text, 0, 0)
        ctx.restore()
      })

      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.13; p.vx *= 0.97; p.life--
        ctx.save()
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color; ctx.shadowBlur = 8
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        ctx.restore()
      })

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameState])

  // Auto-transition after level flash
  useEffect(() => {
    if (gameState !== 'transition') return
    const t = setTimeout(() => setGameState('playing'), 700)
    return () => clearTimeout(t)
  }, [gameState])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameStateRef.current !== 'playing') return
    const c = canvasRef.current!
    const rect = c.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    let hit: Bubble | null = null
    let best = Infinity
    for (const b of bubblesRef.current) {
      const d = Math.hypot(b.x - mx, b.y - my)
      if (d < b.size * 1.4 && d < best) { best = d; hit = b }
    }
    if (!hit) return

    if (hit.isTarget) {
      spawnParticles(hit.x, hit.y, true)
      if (levelRef.current >= LEVELS.length - 1) {
        setTimeout(() => setGameState('complete'), 900)
      } else {
        const next = levelRef.current + 1
        setGameState('transition')
        setTimeout(() => {
          setLevel(next)
          bubblesRef.current = makeBubbles(next, wRef.current, hRef.current)
          particlesRef.current = []
        }, 350)
      }
    } else {
      spawnParticles(hit.x, hit.y, false)
      shakeRef.current = 22
    }
  }, [spawnParticles])

  const startGame = useCallback(() => {
    bubblesRef.current = makeBubbles(0, wRef.current, hRef.current)
    particlesRef.current = []
    setLevel(0)
    setGameState('playing')
  }, [])

  const cfg = LEVELS[Math.min(level, LEVELS.length - 1)]

  return (
    <div className="game-root">
      <canvas ref={canvasRef} onClick={handleClick} className={`game-canvas${gameState === 'playing' ? ' cursor-aim' : ''}`} />
      <div className="scanlines" />
      <div className="vignette" />

      {/* Between-level flash: just the anomalous code, briefly */}
      {gameState === 'transition' && (
        <div className="overlay transition-overlay" aria-hidden>
          <span className="transition-code" style={{ color: cfg.targetColor, textShadow: `0 0 60px ${cfg.targetColor}` }}>
            {cfg.target}
          </span>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'start' && (
        <div className="overlay start-overlay" onClick={startGame}>
          <div className="start-bg-noise" aria-hidden>
            {Array.from({ length: 280 }, (_, i) => (
              <span key={i} style={{ opacity: 0.06 + Math.random() * 0.1 }}>404</span>
            ))}
          </div>
          <div className="start-title">404</div>
          <div className="start-tagline">quelque chose cloche.</div>
          <div className="start-caret">_</div>
        </div>
      )}

      {/* End screen */}
      {gameState === 'complete' && (
        <div className="overlay end-overlay" onClick={startGame}>
          <div className="end-code">200</div>
          <div className="end-ok">OK</div>
          <div className="end-line" />
          <div className="end-sub">tu as trouvé ce qui manquait.</div>
        </div>
      )}
    </div>
  )
}
