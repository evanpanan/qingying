import { useEffect, useRef, useState } from 'react'
import { LikeButton } from './dissolve/like-button'

const KEY = 'lightvid.appreciation.v1'
export default function FooterAppreciation() {
  const [liked, setLiked] = useState(() => {
    try { return localStorage.getItem(KEY) === 'liked' } catch { return false }
  })
  const [thanks, setThanks] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  function change(next: boolean) {
    setLiked(next)
    try { localStorage.setItem(KEY, next ? 'liked' : '') } catch { /* This local easter egg works without storage. */ }
    clearTimeout(timer.current)
    setThanks(next)
    if (next) timer.current = setTimeout(() => setThanks(false), 2600)
  }

  return <div className="footer-appreciation" data-liked={liked}>
    <LikeButton liked={liked} onChange={change} size={19} color="#e95646" idleColor="#9aaf87" haptics={false} label={liked ? '取消喜欢轻影' : '喜欢轻影'} className="footer-like-button" />
    <span>用心制作，保持轻巧。</span>
    <span className={`footer-thanks ${thanks ? 'show' : ''}`} role="status">{thanks ? '感谢您的喜欢' : ''}</span>
  </div>
}
