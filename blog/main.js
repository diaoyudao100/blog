// Worker 地址：本地开发自动用 localhost:8787，生产环境留空（同域）或填入实际 Worker URL
const WORKER_BASE = (() => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  // 部署后将此处改为你的 Worker URL，例如：
  return 'https://blog-worker.diaoyudao110.workers.dev';
  return '';
})();

// ── 导航栏滚动效果 ───────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.background = window.scrollY > 50
    ? 'rgba(13,13,13,0.95)'
    : 'rgba(13,13,13,0.8)';
});

// ── 移动端菜单 ───────────────────────────────────────────────────────
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.querySelector('.nav-links');
menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => navLinks.classList.remove('open'))
);

// ── 滚动进入动画（在内容渲染后调用） ────────────────────────────────
function initScrollAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(
    '.post-card, .project-card, .tl-item, .about-grid, .contact-box'
  ).forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// ── 渲染函数 ─────────────────────────────────────────────────────────
function renderHero(hero) {
  if (!hero) return;
  if (hero.subtitle) document.getElementById('heroSub').textContent = hero.subtitle;
  if (hero.title) {
    document.getElementById('heroTitle').textContent = hero.title;
    document.getElementById('navLogo').textContent = hero.title;
    document.title = hero.title + ' - 小小王的博客';
  }
  if (hero.desc) document.getElementById('heroDesc').textContent = hero.desc;
}

function renderProfile(profile) {
  if (!profile) return;
  if (profile.nickname) document.getElementById('avatarInner').textContent = profile.nickname;
  if (profile.name) document.getElementById('aboutName').textContent = '你好，我是' + profile.name + ' 👋';
  if (profile.intro1) document.getElementById('aboutIntro1').textContent = profile.intro1;
  if (profile.intro2) document.getElementById('aboutIntro2').textContent = profile.intro2;

  const tagsEl = document.getElementById('aboutTags');
  if (Array.isArray(profile.tags) && profile.tags.length) {
    tagsEl.innerHTML = profile.tags
      .map(t => `<span class="tag">${t}</span>`)
      .join('');
  }

  const links = document.getElementById('contactLinks');
  const contactItems = [
    profile.email ? `<a href="mailto:${profile.email}" class="contact-item">📧 邮件</a>` : '',
    profile.github && profile.github !== '#' ? `<a href="${profile.github}" target="_blank" class="contact-item">🐙 GitHub</a>` : '',
    profile.twitter && profile.twitter !== '#' ? `<a href="${profile.twitter}" target="_blank" class="contact-item">🐦 Twitter</a>` : '',
    profile.wechat ? `<a href="#" class="contact-item" title="${profile.wechat}">💼 微信</a>` : '',
  ].filter(Boolean);
  if (contactItems.length) links.innerHTML = contactItems.join('');

  if (profile.name) {
    document.getElementById('footerText').textContent =
      `© ${new Date().getFullYear()} ${profile.name} · ${document.getElementById('heroTitle').textContent} · 用心记录每一天`;
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('postsGrid');
  if (!Array.isArray(posts) || !posts.length) {
    grid.innerHTML = '<p style="color:#555;text-align:center;padding:2rem;grid-column:1/-1">暂无文章</p>';
    return;
  }
  grid.innerHTML = posts.map(p => `
    <article class="post-card">
      <div class="post-meta">
        <span class="post-cat">${p.category || ''}</span>
        <span class="post-date">${p.date || ''}</span>
      </div>
      <h3 class="post-title">${p.title}</h3>
      <p class="post-excerpt">${p.excerpt || ''}</p>
      <a href="post.html?id=${p.id}" class="post-link">阅读全文 →</a>
    </article>
  `).join('');
}

function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  if (!Array.isArray(projects) || !projects.length) {
    grid.innerHTML = '<p style="color:#555;text-align:center;padding:2rem;grid-column:1/-1">暂无项目</p>';
    return;
  }
  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-icon">${p.icon || '📦'}</div>
      <h3>${p.title}</h3>
      <p>${p.desc || ''}</p>
      <div class="project-tech">${(p.tech || []).map(t => `<span>${t}</span>`).join('')}</div>
      <div class="project-links">
        ${p.demoUrl && p.demoUrl !== '#' ? `<a href="${p.demoUrl}" target="_blank">演示</a>` : ''}
        ${p.repoUrl && p.repoUrl !== '#' ? `<a href="${p.repoUrl}" target="_blank">源码</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderTimeline(timeline) {
  const list = document.getElementById('timelineList');
  if (!Array.isArray(timeline) || !timeline.length) {
    list.innerHTML = '<p style="color:#555;text-align:center;padding:2rem">暂无时间线</p>';
    return;
  }
  list.innerHTML = timeline.map(t => `
    <div class="tl-item">
      <div class="tl-dot"></div>
      <div class="tl-content">
        <span class="tl-year">${t.year}</span>
        <h4>${t.title}</h4>
        <p>${t.desc || ''}</p>
      </div>
    </div>
  `).join('');
}

// ── 加载并渲染全站数据 ───────────────────────────────────────────────
async function loadSiteData() {
  try {
    const res = await fetch(WORKER_BASE + '/api/data');
    if (!res.ok) throw new Error('API 请求失败');
    const data = await res.json();
    renderHero(data.hero);
    renderProfile(data.profile);
    renderPosts(data.posts);
    renderProjects(data.projects);
    renderTimeline(data.timeline);
  } catch (e) {
    console.warn('无法加载动态数据，使用页面默认内容。', e.message);
    // 静态降级：为空容器填入提示，保留 Hero 等硬编码内容
    const grids = ['postsGrid', 'projectsGrid', 'timelineList', 'aboutTags', 'contactLinks'];
    grids.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.innerHTML.trim()) el.innerHTML = '';
    });
  } finally {
    initScrollAnimation();
  }
}

loadSiteData();
