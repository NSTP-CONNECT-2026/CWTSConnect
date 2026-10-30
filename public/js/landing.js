/**
 * CWTSConnect — Single-Section Landing Page JavaScript
 * Laguna State Polytechnic University – Siniloan Campus
 * NSTP-CWTS Community Deployment & Needs Matching System
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll elevation effect
  const siteHeader = document.getElementById('siteHeader');
  let isScrollTicking = false;

  function handleScrollFrame() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollY > 15) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }
    isScrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!isScrollTicking) {
      window.requestAnimationFrame(handleScrollFrame);
      isScrollTicking = true;
    }
  }, { passive: true });
});
