(function () {
  'use strict';

  const works = Array.isArray(window.PORTFOLIO_WORKS) ? window.PORTFOLIO_WORKS : [];

  const groupOrder = {
    board: 0, public: 1, character: 2,
    'motion-video': 0, 'motion-frame-a': 0, 'motion-frame-b': 1,
    model: 0, 'ue5-day': 1, 'ue5-night': 2, 'ue5-detail': 3
  };

  function byGroup(group) {
    return works
      .filter((work) => work.group === group)
      .sort((a, b) => a.file.localeCompare(b.file, 'zh-CN'));
  }

  function cardMarkup(work) {
    return [
      '<article class="work-card" data-preview="image" data-src="', work.file,
      '" data-title="', work.title, '" data-label="', work.label, '">',
      '<div class="work-card__media"><img src="', work.file,
      '" alt="', work.title, '" loading="lazy" />',
      '<span class="work-card__badge">', work.label, '</span></div>',
      '<div class="work-card__body"><div class="work-card__title">', work.title,
      '</div><div class="work-card__meta">', work.label, '</div></div>',
      '</article>'
    ].join('');
  }

  function videoMarkup(work) {
    const fallback = work.poster
      ? '<img class="video-card__poster" src="' + work.poster + '" alt="' + work.title + '" />'
      : '';
    return [
      '<article class="video-card">',
      '<div class="video-card__media">',
      '<video src="', work.file, '"',
      work.poster ? ' poster="' + work.poster + '"' : '',
      ' controls preload="metadata" playsinline onerror="this.style.display=\'none\'"></video>',
      fallback,
      '</div>',
      '<div class="video-card__body"><div class="video-card__title">', work.title,
      '</div><div class="video-card__meta">', work.label, ' · 点击播放原始视频</div></div>',
      '</article>'
    ].join('');
  }

  function render(containerId, html) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
  }

  const illustrationGroups = ['board', 'public', 'character'];
  const threeGroups = ['model', 'ue5-day', 'ue5-night', 'ue5-detail'];
  const frameGroups = ['motion-frame-a', 'motion-frame-b'];

  const illustrationWorks = illustrationGroups.flatMap(byGroup);
  const threeWorks = threeGroups.flatMap(byGroup);
  const frameWorks = frameGroups.flatMap(byGroup);
  const featuredWorks = works.filter((work) => work.featured && work.kind === 'image');
  const videoWorks = byGroup('motion-video');

  render('featuredGrid', featuredWorks.map(cardMarkup).join(''));
  render('illustrationGrid', illustrationWorks.map(cardMarkup).join(''));
  render('motionVideos', videoWorks.map(videoMarkup).join(''));
  render('motionFrames', frameWorks.map(cardMarkup).join(''));
  render('threeGrid', threeWorks.map(cardMarkup).join(''));

  // 分类筛选：每个标签栏独立绑定，插画按 group，三维按 group
  document.querySelectorAll('.tabs').forEach((tablist) => {
    const section = tablist.closest('section');
    if (!section) return;
    const grid = section.querySelector('.work-grid');
    const pool = section.id === 'illustration' ? illustrationWorks : threeWorks;
    if (!grid) return;

    tablist.addEventListener('click', (event) => {
      const button = event.target.closest('.tab');
      if (!button) return;
      const filter = button.getAttribute('data-filter');
      tablist.querySelectorAll('.tab').forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      const visible = filter === 'all' ? pool : pool.filter((work) => work.group === filter);
      grid.innerHTML = visible.map(cardMarkup).join('');
    });
  });

  // 灯箱预览
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  let lastFocused = null;

  function openLightbox(card) {
    lastFocused = document.activeElement;
    lightboxImage.src = card.getAttribute('data-src');
    lightboxImage.alt = card.getAttribute('data-title') || '作品预览';
    lightboxCaption.textContent = [card.getAttribute('data-title'), card.getAttribute('data-label')]
      .filter(Boolean).join(' · ');
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.src = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-preview="image"]');
    if (card) openLightbox(card);
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
  });

  // 移动端菜单
  const menuButton = document.getElementById('menuButton');
  const siteNav = document.getElementById('siteNav');
  if (menuButton && siteNav) {
    menuButton.addEventListener('click', () => {
      const open = siteNav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    });
    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        siteNav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', '打开导航');
      }
    });
  }

  // 站牌快捷入口与滚动按钮
  document.querySelectorAll('[data-scroll]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = document.getElementById(button.getAttribute('data-scroll'));
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 导航高亮：根据可见区更新当前栏目
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
  const sections = navLinks
    .map((link) => document.getElementById(link.getAttribute('data-nav')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('data-nav') === entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }
})();
