import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Monitor, X, Search, CodeXml, ShieldCheck } from 'lucide-react'
import DownloadTool from '../components/DownloadTool'
import ExperienceGallery from '../components/ExperienceGallery'
import NeedsGallery from '../components/NeedsGallery'
import ParticleWordmark from '../components/ParticleWordmark'
import HeroRibbon from '../components/HeroRibbon'
import PlatformCarousel from '../components/PlatformCarousel'
import FooterAppreciation from '../components/FooterAppreciation'
import { useMotionActivity } from '../lib/motion-activity'
import { useSurfaceMotion } from '../lib/surface-motion'
import { PLATFORMS, REPRESENTATIVE_PLATFORMS, type EngineInfo } from '../lib/media'
import { invoke } from '@tauri-apps/api/core'
import type { Page } from '../types'
import { isTauri } from '../lib/env'
import './landing-refresh.css'
const faq = [
  ['哪些网站可以下载？', '轻影自行运行全量 yt-dlp 解析器，并探测普通网页中的公开视频，不限于下方推荐平台。解析器数量来自当前引擎，不等于独立网站数量或下载成功保证。登录、签名、地区、DRM 与格式限制仍可能阻止下载。'],
  ['在线版与桌面版有什么不同？', '在线版支持视频与 MP3 下载、快速修补、自然高清增强、英文字幕和配音、格式转换与压缩。桌面版增加离线 AI 修复、完整长视频处理、文件历史和应用内更新；支持的 macOS 26 设备还可使用 AI 2×超分。网页修补和语音任务有 60 秒、200 MB 的处理范围，桌面版适合大文件。'],
  ['能同时下载多个视频吗？', '可以。网页下载中仍可粘贴下一条链接、解析并保存，同时下载两个任务，其余自动排队。每项有独立进度，可单独取消或失败重试。切换工具不会打断下载，刷新或关闭页面会中断未完成任务。'],
  ['能转换成哪些格式？', 'MP4、MOV、MKV、WebM 四种视频格式，以及从视频中提取 MP3 音频。转换后的文件不会覆盖源视频。'],
  ['能单独下载 MP3 吗？', '可以。在解析结果中选择「MP3 音频」。网页端下载后在本机编码为 MP3，桌面端优先获取音频流，再保存到下载文件夹。'],
  ['修复能恢复所有细节吗？', '字幕和水印遮挡的真实内容无法保证完整恢复。简单背景可用快速修补，固定白字可用精细去字，复杂背景可尝试桌面 AI 修复。建议先预览短片段，并为短暂出现的水印设置生效时间。'],
  ['高清增强与 AI 超分有什么区别？', '自然增强通过降噪和轻度锐化整理画面，输出到 1080p 时使用插值放大。AI 2×超分使用系统模型，需要支持的 Apple Silicon 设备与 macOS 26；软件会检查当前设备和视频是否支持。'],
  ['换配音会保留背景音乐吗？', '当前英文配音会替换原音轨，不保留原配音与背景音乐，也不克隆原声。只换字幕时保留原声音；首次语音处理需要下载模型，之后使用本地缓存。'],
  ['下载失败怎么办？', '请确认链接是公开的单个作品。登录限制、地区限制、版权保护或平台风控可能阻止解析；也可以使用桌面版重试。轻影不会绕过付费权限或 DRM。'],
]

export default function Landing({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [query, setQuery] = useState('')
  const [showAllFaq, setShowAllFaq] = useState(false)
  const [faqIndex, setFaqIndex] = useState<number | null>(null)
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [guidanceKey, setGuidanceKey] = useState(0)
  const { root: heroRef, active: heroActive } = useMotionActivity<HTMLElement>()
  const { root: footerRef, active: footerActive } = useMotionActivity<HTMLElement>()
  const surface = useSurfaceMotion()
  const guideToLink = useCallback(() => setGuidanceKey(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const request = isTauri()
      ? invoke<EngineInfo>('native_engine_info')
      : fetch('/api/extract', { signal: controller.signal })
        .then((response) => response.json())
        .then((result) => result.ok ? result.engine as EngineInfo : null)
    void request.then((result) => { if (active && result) setEngine(result) }).catch(() => {})
    return () => { active = false; controller.abort() }
  }, [])
  const filtered = PLATFORMS.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
  return <main>
    <section className="hero-stage" ref={heroRef} data-motion={heroActive ? 'running' : 'paused'}>
      <div className="hero-copy reveal"><span className="eyebrow"><span className="tiny-orbit" />YOUR VIDEOS. WITH YOU.</span><h1>喜欢的视频，<br /><em>留在你身边。</em></h1><p>保存视频，也照顾每一帧。<br />去掉干扰，换种语言，轻松分享。</p><HeroRibbon /><button className="text-link" onClick={guideToLink} aria-controls="share-link">从一个链接开始 <span><ArrowRight size={17} /></span></button><div className="hero-assurances"><span><ShieldCheck size={13} />本机处理</span><span>免费使用</span><span>开源制作</span></div></div>
      <div className="hero-tool reveal" id="download-tool" onPointerMove={surface.onPointerMove} onPointerLeave={surface.onPointerLeave}><span className="tool-caption">A GOOD FIND DESERVES TO STAY.</span><DownloadTool guidanceKey={guidanceKey} /></div>
    </section>
    <ExperienceGallery onNavigate={onNavigate} />
    <section className="platform-section" id="platforms"><div className="section-heading"><div><span className="eyebrow">ONE LINK. MANY PLACES.</span><h2>从这些地方，<em>带走灵感。</em></h2></div><div className="platform-search"><Search size={15} /><label className="sr-only" htmlFor="platform-search">搜索平台</label><input id="platform-search" placeholder="搜索平台" value={query} onChange={(e) => setQuery(e.target.value)} />{query ? <button className="icon-button" aria-label="清除平台搜索" onClick={() => setQuery('')}><X size={14} /></button> : <span className="search-hint">⌕</span>}</div></div>
      <div className="engine-capability"><span className="chip-dot" /><strong>{engine ? `${engine.extractors.toLocaleString()} 个站点解析器` : '全量站点解析器'}</strong><span>+ 通用网页探测</span><small>轻影自运行 · 不使用第三方解析{engine ? ` · v${engine.version}` : ''}</small></div>
      {filtered.length > 0 && <PlatformCarousel items={query.trim() ? filtered : REPRESENTATIVE_PLATFORMS} searching={!!query.trim()} onChoose={guideToLink} />}
      {!filtered.length && <p className="muted-note">推荐列表中未收录，仍可直接粘贴该网站的作品链接尝试解析。</p>}<p className="muted-note">以上是常用平台示例，不是支持上限，也不保证每个平台的每条链接可用。仅下载公开且获授权的作品。</p>
    </section>
    <NeedsGallery onNavigate={onNavigate} />
    {!isTauri() && <section className="desktop-section" id="desktop"><div><span className="eyebrow">ON YOUR DESKTOP.</span><h2>更大的文件，<br /><em>更从容地处理。</em></h2><p>内置自有解析、JavaScript 与转换引擎。<br />下载、转格式、压缩、AI 修复与英文配音字幕，一处完成。</p><a className="primary-button" href="https://github.com/evanpanan/qingying/releases/download/v1.10.1/_1.10.1_aarch64.dmg" download><Monitor size={18} />下载 macOS 版 <ArrowDown size={17} /></a><p className="muted-note">Apple Silicon · v1.10.1 · 安装包更新：<time dateTime="2026-11-28">2026-11-28</time></p><p className="muted-note">新版支持精细去字、高清增强、独立更换英文字幕或配音；支持的 macOS 26 设备可使用 AI 2×超分。修复模型已内置，语音模型首次自动下载。</p><details className="install-help"><summary>macOS 提示无法打开？</summary><p>将轻影拖入应用程序后，在终端运行：</p><code>xattr -cr /Applications/轻影.app</code><p>当前为开源应用的临时签名，尚未完成 Apple 公证。</p></details></div><div className="desktop-tour" aria-label="桌面版功能概览"><div className="desktop-tour-bar"><span><i/><i/><i/></span><small>LIGHTVID / MAC</small></div><div className="desktop-tour-body"><div className="desktop-tour-tools"><span>↓ 下载</span><strong>◇ 画面修复</strong><span>⇄ 转换</span><span>↘ 压缩</span></div><div className="desktop-tour-features"><span className="eyebrow">YOUR VIDEO WORKSPACE</span><h3>一处完成，<br/><em>接着创作。</em></h3><ul><li><ShieldCheck size={16}/>多选区与分时修复</li><li><ShieldCheck size={16}/>高清增强与 AI 超分</li><li><ShieldCheck size={16}/>英文字幕与配音</li><li><ShieldCheck size={16}/>处理历史、打开文件、应用内更新</li></ul></div></div><p>本机处理 · 保留原文件 · 模型缓存</p></div></section>}
    <section className="faq-section" aria-label="常见问题"><div className="faq-heading"><h2>常见问题</h2><button className="quiet-button" aria-expanded={showAllFaq} aria-controls="faq-list" onClick={()=>{setShowAllFaq(!showAllFaq);setFaqIndex(null)}}>{showAllFaq?'收起问题':`查看全部 ${faq.length} 个问题`}<ArrowRight size={13}/></button></div><div id="faq-list" className="faq-grid">{faq.slice(0,showAllFaq?faq.length:4).map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faqIndex === index} aria-controls={`faq-answer-${index}`} onClick={() => setFaqIndex(faqIndex === index ? null : index)}><span>{question}</span><PlusSign open={faqIndex === index} /></button>{faqIndex === index && <p id={`faq-answer-${index}`} className="reveal">{answer}</p>}</div>)}</div></section>
    <footer className="studio-footer" ref={footerRef} data-motion={footerActive ? 'running' : 'paused'}>
      <div className="footer-top"><div className="footer-brand"><span className="eyebrow">A LITTLE TOOL. A LOT OF CARE.</span><ParticleWordmark /><div className="footer-tagline">轻影 / 让好内容，留在身边。</div><p>从一个真实的需要出发，<br />认真打磨每一点轻巧。</p></div>
        <div className="footer-maker"><span className="eyebrow">MEET THE MAKER</span><a className="author-card" href="https://x.com/Yep_Cooper" target="_blank" rel="noopener noreferrer" aria-label="访问作者 Cooper 的 X（推特）主页"><span className="author-avatar"><img src="/cooper-avatar.jpg" alt="Cooper 的头像" width={52} height={52} loading="lazy" /><span className="author-status" aria-hidden="true" title="装饰性呼吸光点，不代表实时在线状态" /></span><span className="author-details"><strong>Cooper <span className="author-x">𝕏</span></strong><small>@Yep_Cooper</small></span><span className="author-arrow"><ArrowUpRight size={19} /></span></a><p>想法、更新，和下一点新东西。<br />都在这里，欢迎来聊聊。</p><a className="footer-source" href="https://github.com/evanpanan/qingying" target="_blank" rel="noopener noreferrer"><CodeXml size={15} />查看开源代码 <ArrowUpRight size={14} /></a></div>
      </div>
      <div className="footer-bottom"><small>© 2026 LightVid · 仅下载你拥有或获授权的内容</small><FooterAppreciation /><a href="#home" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>回到顶部 <ArrowUpRight size={13} /></a></div>
    </footer>

  </main>
}
function PlusSign({ open }: { open: boolean }) { return <span className={`faq-plus ${open ? 'open' : ''}`} aria-hidden="true">+</span> }

