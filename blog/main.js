// Worker 地址
const WORKER_BASE = (() => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  return 'https://blog-worker.diaoyudao110.workers.dev';
})();

// ── 主题切换 ─────────────────────────────────────────────────────────
function getTheme() { return localStorage.getItem('theme') || 'dark'; }

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '🌙' : '☀️';
  // 联动 Giscus（如果存在）
  const giscus = document.querySelector('iframe.giscus-frame');
  if (giscus) {
    giscus.contentWindow.postMessage(
      { giscus: { setConfig: { theme: t === 'dark' ? 'dark' : 'light' } } },
      'https://giscus.app'
    );
  }
}

applyTheme(getTheme());

const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  });
}

// ── 导航栏滚动效果 ───────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  navbar.style.background = window.scrollY > 50
    ? (getTheme() === 'dark' ? 'rgba(13,13,13,0.95)' : 'rgba(248,247,244,0.97)')
    : (getTheme() === 'dark' ? 'rgba(13,13,13,0.8)' : 'rgba(248,247,244,0.85)');
});

// ── 移动端菜单 ───────────────────────────────────────────────────────
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.querySelector('.nav-links');
menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => navLinks.classList.remove('open'))
);

// ── 回到顶部 ─────────────────────────────────────────────────────────
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('visible', window.scrollY > 400);
});
backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── 滚动进入动画 ─────────────────────────────────────────────────────
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
    '.post-card, .project-card, .tl-item, .about-grid, .contact-box, .skill-category, .link-card'
  ).forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  // 技能条动画
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width;
        });
        barObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.skill-category').forEach(el => barObserver.observe(el));
}

// ── 预计阅读时间 ─────────────────────────────────────────────────────
function readingTime(content) {
  const words = (content || '').replace(/[#*`>\-\[\]!]/g, '').length;
  const mins = Math.max(1, Math.round(words / 300));
  return `${mins} 分钟`;
}

// ── 渲染函数 ─────────────────────────────────────────────────────────
function renderHero(hero) {
  if (!hero) return;
  if (hero.subtitle) document.getElementById('heroSub').textContent = hero.subtitle;
  if (hero.title) {
    document.getElementById('heroTitle').textContent = hero.title;
    document.getElementById('navLogo').textContent = hero.title;
    document.title = hero.title + ' - 小小王的博客';
    document.querySelector('meta[property="og:title"]').content = hero.title + ' - 小小王的博客';
  }
  if (hero.desc) {
    document.getElementById('heroDesc').textContent = hero.desc;
    document.querySelector('meta[property="og:description"]').content = hero.desc;
    document.querySelector('meta[name="description"]').content = hero.desc;
  }
}

function renderProfile(profile) {
  if (!profile) return;
  const avatarEl = document.getElementById('avatarInner');
  if (profile.avatar) {
    avatarEl.innerHTML = `<img src="${profile.avatar}" alt="头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
  } else if (profile.nickname) {
    avatarEl.textContent = profile.nickname;
  }
  if (profile.name) document.getElementById('aboutName').textContent = '你好，我是' + profile.name + ' 👋';
  if (profile.intro1) document.getElementById('aboutIntro1').textContent = profile.intro1;
  if (profile.intro2) document.getElementById('aboutIntro2').textContent = profile.intro2;

  const tagsEl = document.getElementById('aboutTags');
  if (Array.isArray(profile.tags) && profile.tags.length) {
    tagsEl.innerHTML = profile.tags.map(t => `<span class="tag">${t}</span>`).join('');
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

// 全量文章数据（含 content，用于搜索/阅读时间）
let allPosts = [];
let activeCategory = '全部';
let searchKeyword = '';

function renderPosts(posts) {
  allPosts = posts || [];
  buildFilterBar(allPosts);
  filterAndRender();
}

function buildFilterBar(posts) {
  const cats = ['全部', ...new Set(posts.map(p => p.category).filter(Boolean))];
  const bar = document.getElementById('filterBar');
  bar.innerHTML = cats.map(c =>
    `<button class="filter-btn${c === activeCategory ? ' active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterAndRender();
    });
  });
}

function filterAndRender() {
  let list = allPosts;
  if (activeCategory !== '全部') list = list.filter(p => p.category === activeCategory);
  if (searchKeyword) {
    const kw = searchKeyword.toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(kw) ||
      (p.excerpt || '').toLowerCase().includes(kw)
    );
  }
  const grid = document.getElementById('postsGrid');
  if (!list.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">没有找到相关文章</p>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const coverHtml = p.cover
      ? `<img class="post-cover" src="${p.cover}" alt="封面" loading="lazy" />`
      : '';
    const rt = p.content ? `<span class="read-time">· ${readingTime(p.content)}</span>` : '';
    return `
      <article class="post-card">
        ${coverHtml}
        <div class="post-meta">
          <span class="post-cat">${p.category || ''}</span>
          <span class="post-date">${p.date || ''}${rt}</span>
        </div>
        <h3 class="post-title">${p.title}</h3>
        <p class="post-excerpt">${p.excerpt || ''}</p>
        <a href="post.html?id=${p.id}" class="post-link">阅读全文 →</a>
      </article>
    `;
  }).join('');
  initScrollAnimation();
}

// 搜索监听
document.getElementById('searchInput').addEventListener('input', e => {
  searchKeyword = e.target.value.trim();
  filterAndRender();
});

function renderStats(posts, projects) {
  const postCount = Array.isArray(posts) ? posts.length : 0;
  const projCount = Array.isArray(projects) ? projects.length : 0;
  // 运行天数：从博客第一篇文章日期或固定起始日期计算
  const startDate = new Date('2025-01-01');
  const days = Math.floor((Date.now() - startDate.getTime()) / 86400000);
  document.getElementById('statPosts').textContent = postCount;
  document.getElementById('statProjects').textContent = projCount;
  document.getElementById('statDays').textContent = days;
}

function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  if (!Array.isArray(projects) || !projects.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">暂无项目</p>';
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
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无时间线</p>';
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

function renderSkills(skills) {
  const grid = document.getElementById('skillsGrid');
  if (!Array.isArray(skills) || !skills.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">暂无技能数据</p>';
    return;
  }
  grid.innerHTML = skills.map(cat => `
    <div class="skill-category">
      <h3>${cat.category}</h3>
      ${(cat.items || []).map(item => `
        <div class="skill-item">
          <div class="skill-name-row">
            <span>${item.name}</span>
            <span>${'★'.repeat(item.level)}${'☆'.repeat(5 - item.level)}</span>
          </div>
          <div class="skill-bar-bg">
            <div class="skill-bar-fill" data-width="${item.level * 20}%" style="width:0"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderLinks(links) {
  const grid = document.getElementById('linksGrid');
  if (!Array.isArray(links) || !links.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">暂无友情链接</p>';
    return;
  }
  grid.innerHTML = links.map(l => `
    <a href="${l.url}" target="_blank" rel="noopener" class="link-card">
      <span class="link-icon">${l.icon || '🌐'}</span>
      <div class="link-info">
        <h4>${l.name}</h4>
        <p>${l.desc || ''}</p>
      </div>
    </a>
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
    renderStats(data.posts, data.projects);
    renderProjects(data.projects);
    renderTimeline(data.timeline);
    renderSkills(data.skills);
    renderLinks(data.links);
  } catch (e) {
    console.warn('无法加载动态数据，使用页面默认内容。', e.message);
  } finally {
    initScrollAnimation();
  }
}

loadSiteData();
