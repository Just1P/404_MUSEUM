import { useState, useEffect, useRef, useCallback } from 'react'
import './Layout404A.css'

type GameState = 'start' | 'hunt404' | 'redirect' | 'hunt403' | 'redirect2' | 'hunt429' | 'complete'

const COUNT_404 = 45
const COUNT_403 = 40
const NOISE_429 = 60
const REVEAL_RADIUS = 65
const BG = '#06060f'
const MONO = '"Courier New", Consolas, monospace'

interface Code {
  id: number
  x: number
  y: number
  size: number
  isTarget: boolean
}

interface NoisePos {
  x: number
  y: number
  size: number
}

function makeGrid(count: number, w: number, h: number): Code[] {
  const codes: Code[] = []
  const cols = Math.ceil(Math.sqrt(count * (w / h)))
  const rows = Math.ceil(count / cols)
  const cellW = w / cols
  const cellH = h / rows

  let id = 0
  for (let r = 0; r < rows && id < count; r++) {
    for (let c = 0; c < cols && id < count; c++) {
      codes.push({
        id: id++,
        x: c * cellW + cellW * 0.15 + Math.random() * cellW * 0.7,
        y: r * cellH + cellH * 0.15 + Math.random() * cellH * 0.7,
        size: 14 + Math.random() * 8,
        isTarget: false,
      })
    }
  }

  codes[Math.floor(Math.random() * codes.length)].isTarget = true
  return codes
}

export default function Layout404A() {
  const [gameState, setGameState] = useState<GameState>('start')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const codesRef = useRef<Code[]>([])
  const noise429Ref = useRef<NoisePos[]>([])
  const target429Ref = useRef({ x: 0, y: 0 })
  const activityRef = useRef(0)
  const animFrameRef = useRef<number>(0)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const wRef = useRef(window.innerWidth)
  const hRef = useRef(window.innerHeight)
  const gameStateRef = useRef<GameState>('start')

  gameStateRef.current = gameState

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

  // Flashlight loop — hunt404 & hunt403
  useEffect(() => {
    if (gameState !== 'hunt404' && gameState !== 'hunt403') return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!

    const loop = () => {
      const W = wRef.current
      const H = hRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const is403 = gameStateRef.current === 'hunt403'

      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = is403 ? 'rgba(200,80,0,0.025)' : 'rgba(200,20,20,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 52) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += 52) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      codesRef.current.forEach(code => {
        const dist = Math.hypot(code.x - mx, code.y - my)
        const proximity = Math.max(0, 1 - dist / REVEAL_RADIUS)
        const isLit = dist < REVEAL_RADIUS

        ctx.save()
        ctx.font = `bold ${code.size}px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (isLit) {
          const text = is403
            ? (code.isTarget ? 'GRANTED' : 'DENIED')
            : (code.isTarget ? '301' : '404')
          const color = is403
            ? (code.isTarget ? '#22cc44' : '#cc4400')
            : (code.isTarget ? '#ff6600' : '#cc1111')
          ctx.globalAlpha = 0.5 + proximity * 0.5
          ctx.shadowColor = color
          ctx.shadowBlur = 6 + proximity * 18
          ctx.fillStyle = color
          ctx.fillText(text, code.x, code.y)
        } else {
          ctx.globalAlpha = 0.09
          ctx.fillStyle = is403 ? '#994400' : '#aa1111'
          ctx.fillText(is403 ? '██████' : '404', code.x, code.y)
        }

        ctx.restore()
      })

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameState])

  // Activity loop — hunt429
  useEffect(() => {
    if (gameState !== 'hunt429') return
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!

    const loop = () => {
      const W = wRef.current
      const H = hRef.current
      const activity = activityRef.current

      activityRef.current = Math.max(0, activityRef.current - 0.4)

      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = `rgba(200,20,20,${0.01 + (activity / 100) * 0.05})`
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 52) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += 52) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Noise codes — jittery when active
      const noiseAlpha = (activity / 100) * 0.75
      if (noiseAlpha > 0.01) {
        noise429Ref.current.forEach(pos => {
          const jitter = activity * 0.12
          ctx.save()
          ctx.globalAlpha = noiseAlpha
          ctx.font = `bold ${pos.size}px ${MONO}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#cc1111'
          ctx.fillText('429',
            pos.x + (Math.random() - 0.5) * jitter,
            pos.y + (Math.random() - 0.5) * jitter
          )
          ctx.restore()
        })
      }

      // Glitch lines when very active
      if (activity > 40 && Math.random() < activity / 300) {
        ctx.fillStyle = `rgba(255,0,0,${(activity / 100) * 0.1})`
        ctx.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3)
      }

      // Target — emerges when calm (activity < 40)
      const calmness = Math.max(0, 1 - activity / 40)
      if (calmness > 0) {
        const t = target429Ref.current
        ctx.save()
        ctx.globalAlpha = calmness
        ctx.font = `bold 52px ${MONO}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = '#ff8800'
        ctx.shadowBlur = 20 + calmness * 20
        ctx.fillStyle = '#ff8800'
        ctx.fillText('429', t.x, t.y)
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameState])

  // 301 → 403 transition
  useEffect(() => {
    if (gameState !== 'redirect') return
    const t = setTimeout(() => {
      codesRef.current = makeGrid(COUNT_403, wRef.current, hRef.current)
      mouseRef.current = { x: -9999, y: -9999 }
      setGameState('hunt403')
    }, 700)
    return () => clearTimeout(t)
  }, [gameState])

  // 403 → 429 transition
  useEffect(() => {
    if (gameState !== 'redirect2') return
    const t = setTimeout(() => {
      const W = wRef.current, H = hRef.current
      const noise: NoisePos[] = []
      for (let i = 0; i < NOISE_429; i++) {
        noise.push({
          x: 60 + Math.random() * (W - 120),
          y: 60 + Math.random() * (H - 120),
          size: 12 + Math.random() * 14,
        })
      }
      noise429Ref.current = noise
      target429Ref.current = {
        x: W * 0.25 + Math.random() * W * 0.5,
        y: H * 0.25 + Math.random() * H * 0.5,
      }
      activityRef.current = 100
      mouseRef.current = { x: -9999, y: -9999 }
      setGameState('hunt429')
    }, 700)
    return () => clearTimeout(t)
  }, [gameState])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (gameStateRef.current === 'hunt429') {
      activityRef.current = Math.min(100, activityRef.current + 4)
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = gameStateRef.current
    if (state !== 'hunt404' && state !== 'hunt403' && state !== 'hunt429') return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (state === 'hunt429') {
      const t = target429Ref.current
      if (activityRef.current < 20 && Math.hypot(t.x - mx, t.y - my) < 70) {
        setGameState('complete')
        return
      }
      activityRef.current = Math.min(100, activityRef.current + 20)
      return
    }

    for (const code of codesRef.current) {
      if (!code.isTarget) continue
      if (Math.hypot(code.x - mx, code.y - my) < REVEAL_RADIUS) {
        setGameState(state === 'hunt404' ? 'redirect' : 'redirect2')
        return
      }
    }
  }, [])

  const startGame = useCallback(() => {
    codesRef.current = makeGrid(COUNT_404, wRef.current, hRef.current)
    mouseRef.current = { x: -9999, y: -9999 }
    setGameState('hunt404')
  }, [])

  const isPlaying = gameState === 'hunt404' || gameState === 'hunt403' || gameState === 'hunt429'

  return (
    <div className="l404a-root">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className={`l404a-canvas${isPlaying ? ' cursor-aim' : ''}`}
      />
      <div className="l404a-scanlines" />
      <div className="l404a-vignette" />

      {gameState === 'redirect' && (
        <div className="l404a-overlay l404a-transition" aria-hidden>
          <span className="l404a-transition-code" style={{ color: '#ff6600', textShadow: '0 0 60px #ff660088' }}>
            301
          </span>
        </div>
      )}

      {gameState === 'redirect2' && (
        <div className="l404a-overlay l404a-transition" aria-hidden>
          <span className="l404a-transition-code" style={{ color: '#ff2222', textShadow: '0 0 60px #ff000088' }}>
            429
          </span>
        </div>
      )}

      {gameState === 'start' && (
        <div className="l404a-overlay l404a-start" onClick={startGame}>
          <div className="l404a-noise" aria-hidden>
            {Array.from({ length: 280 }, (_, i) => (
              <span key={i} style={{ opacity: 0.06 + Math.random() * 0.1 }}>404</span>
            ))}
          </div>
          <div className="l404a-title">404</div>
          <div className="l404a-tagline">quelque chose cloche.</div>
          <div className="l404a-caret">_</div>
        </div>
      )}

      {gameState === 'complete' && (
        <div className="l404a-overlay l404a-end" onClick={startGame}>
          <div className="l404a-end-code">200</div>
          <div className="l404a-end-ok">OK</div>
          <div className="l404a-end-line" />
          <div className="l404a-end-sub">accès autorisé.</div>
        </div>
      )}
    </div>
  )
}
