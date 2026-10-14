// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href')
    if (targetId === '#') return
    const target = document.querySelector(targetId)
    if (target) {
      e.preventDefault()
      const offset = 80
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  })
})

// Close other FAQ items when one opens
const faqItems = document.querySelectorAll('.faq-item')
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      faqItems.forEach((other) => {
        if (other !== item) other.open = false
      })
    }
  })
})

// Reveal-on-scroll animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1'
      entry.target.style.transform = 'translateY(0)'
      revealObserver.unobserve(entry.target)
    }
  })
}, observerOptions)

document.querySelectorAll('.feature-card, .step, .download-card, .faq-item').forEach((el) => {
  el.style.opacity = '0'
  el.style.transform = 'translateY(24px)'
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
  revealObserver.observe(el)
})
