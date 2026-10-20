/**
 * CWTSConnect — Minimalist Landing Page JavaScript
 * Handles navigation interactions, portal selection modal, and FAQ accordion.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1 & 5. Optimized Scroll Handler (requestAnimationFrame + passive listener)
  const siteHeader = document.getElementById('siteHeader');
  const sections = document.querySelectorAll('section[id]');
  const sectionNavPairs = Array.from(sections).map(sec => ({
    section: sec,
    link: document.querySelector(`.nav-menu a[href*="${sec.id}"]`)
  }));

  let isScrollTicking = false;

  function handleScrollFrame() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Header scroll effect
    if (scrollY > 20) {
      siteHeader?.classList.add('scrolled');
    } else {
      siteHeader?.classList.remove('scrolled');
    }

    // Active Nav Link on Scroll
    sectionNavPairs.forEach(({ section, link }) => {
      if (!link) return;
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    isScrollTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!isScrollTicking) {
      window.requestAnimationFrame(handleScrollFrame);
      isScrollTicking = true;
    }
  }, { passive: true });

  // 2. Mobile navigation drawer
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const drawerLinks = document.querySelectorAll('.drawer-menu a');

  function toggleMobileDrawer(open) {
    if (mobileDrawer) {
      if (open) {
        mobileDrawer.classList.add('open');
        document.body.style.overflow = 'hidden';
      } else {
        mobileDrawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  }

  mobileToggle?.addEventListener('click', () => toggleMobileDrawer(true));
  drawerClose?.addEventListener('click', () => toggleMobileDrawer(false));
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => toggleMobileDrawer(false));
  });

  // 3. Portal Selector Modal
  const openModalBtns = document.querySelectorAll('.js-open-portal-modal');
  const portalModal = document.getElementById('portalModal');
  const closeModalBtn = document.getElementById('closePortalModal');

  function openPortalModal() {
    portalModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePortalModal() {
    portalModal?.classList.remove('open');
    document.body.style.overflow = '';
  }

  openModalBtns.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openPortalModal();
  }));

  closeModalBtn?.addEventListener('click', closePortalModal);
  portalModal?.addEventListener('click', (e) => {
    if (e.target === portalModal) {
      closePortalModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && portalModal?.classList.contains('open')) {
      closePortalModal();
    }
  });

  // 4. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn?.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(other => {
        if (other !== item) other.classList.remove('active');
      });
      if (!isActive) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  });

  });
});
