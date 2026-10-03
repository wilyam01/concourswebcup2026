const slides = [...document.querySelectorAll('.slide')];
const dots = [...document.querySelectorAll('.slide-dot')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = slides.indexOf(entry.target);
    dots.forEach((dot, dotIndex) => dot.classList.toggle('current', dotIndex === index));
  });
}, { threshold: 0.55 });
slides.forEach((slide) => observer.observe(slide));
