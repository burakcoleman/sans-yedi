import { useEffect, useRef } from 'react'

const COLORS = ['#f0c040', '#aa66ff', '#00d4aa', '#4488ff', '#ff4466', '#fff']

export function Confetti({ active }) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()

        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed
        p.vy += 0.05
      })
      particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 20)
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        pointerEvents: 'none',
      }}
    />
  )
}
