/**
 * 后台管理 admin.js
 */

// Worker 地址：本地开发自动用 localhost:8787，生产环境改为实际 Worker URL
const WORKER_BASE = (() => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8787';
  }
  // 部署后将此处改为你的 Worker URL，例如：
  return 'https://blog-worker.diaoyudao110.workers.dev';
  return '';
})();

// ── 状态 ────────────────────────────────────────────────────────────
let token = localStorage.getItem('admin_token') || '';
let siteData = { profile: {}, hero: {}, posts: [], projects: [], timeline: [] };
let editingPostId = null;
let editingProjectId = null;
let editingTlId = null;
let profileTags = [];

// ── 工具函数 ─────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function showToast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

async function api(method, path, body) {
  const res = await fetch(WORKER_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// ── 登录 / 登出 ──────────────────────────────────────────────────────
$('loginBtn').addEventListener('click', async () => {
  const pwd = $('loginPwd').value.trim();
  if (!pwd) return;
  $('loginBtn').textContent = '登录中…';
  try {
    const data = await api('POST', '/api/login', { password: pwd });
    token = data.token;
    localStorage.setItem('admin_token', token);
    enterAdmin();
  } catch (e) {
    $('loginErr').textContent = e.message;
  } finally {
    $('loginBtn').textContent = '登 录';
  }
});

$('loginPwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('loginBtn').click();
});

$('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  token = '';
  $('adminPage').style.display = 'none';
  $('loginPage').style.display = 'flex';
  $('loginPwd').value = '';
});

// ── 初始化进入管理页 ─────────────────────────────────────────────────
async function enterAdmin() {
  $('loginPage').style.display = 'none';
  $('adminPage').style.display = 'flex';
  try {
    siteData = await api('GET', '/api/data');
    fillProfile(siteData.profile);
    fillHero(siteData.hero);
    renderPosts();
    renderProjects();
    renderTimeline();
  } catch (e) {
    showToast('加载数据失败：' + e.message, 'error');
  }
}

// 如果已有 token，直接尝试进入管理页
if (token) enterAdmin();

// ── Tab 切换 ─────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    $('tab-' + item.dataset.tab).style.display = '';
  });
});

// ── 个人信息 ─────────────────────────────────────────────────────────
function fillProfile(p) {
  $('p-name').value = p.name || '';
  $('p-nickname').value = p.nickname || '';
  $('p-intro1').value = p.intro1 || '';
  $('p-intro2').value = p.intro2 || '';
  $('p-email').value = p.email || '';
  $('p-github').value = p.github || '';
  $('p-twitter').value = p.twitter || '';
  $('p-wechat').value = p.wechat || '';
  profileTags = Array.isArray(p.tags) ? [...p.tags] : [];
  renderTags();
}

function renderTags() {
  const wrap = $('tagsWrap');
  wrap.querySelectorAll('.tag-chip').forEach(el => el.remove());
  profileTags.forEach((tag, i) => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${tag}<button data-i="${i}" title="删除">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      profileTags.splice(i, 1);
      renderTags();
    });
    wrap.insertBefore(chip, $('tagInput'));
  });
}

$('tagInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const v = $('tagInput').value.trim();
    if (v) { profileTags.push(v); renderTags(); $('tagInput').value = ''; }
  }
});

$('saveProfile').addEventListener('click', async () => {
  const body = {
    name: $('p-name').value.trim(),
    nickname: $('p-nickname').value.trim(),
    intro1: $('p-intro1').value.trim(),
    intro2: $('p-intro2').value.trim(),
    tags: profileTags,
    email: $('p-email').value.trim(),
    github: $('p-github').value.trim(),
    twitter: $('p-twitter').value.trim(),
    wechat: $('p-wechat').value.trim(),
  };
  try {
    await api('PUT', '/api/profile', body);
    siteData.profile = body;
    showToast('个人信息已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

// ── Hero ─────────────────────────────────────────────────────────────
function fillHero(h) {
  $('h-subtitle').value = h.subtitle || '';
  $('h-title').value = h.title || '';
  $('h-desc').value = h.desc || '';
}

$('saveHero').addEventListener('click', async () => {
  const body = {
    subtitle: $('h-subtitle').value.trim(),
    title: $('h-title').value.trim(),
    desc: $('h-desc').value.trim(),
  };
  try {
    await api('PUT', '/api/hero', body);
    siteData.hero = body;
    showToast('Hero 区已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

// ── 文章管理 ─────────────────────────────────────────────────────────
function renderPosts() {
  const list = $('postsList');
  if (!siteData.posts.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无文章，点击「新建文章」开始创作</p>';
    return;
  }
  list.innerHTML = siteData.posts.map(p => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${p.title}</div>
        <div class="list-item-meta">${p.category || ''} · ${p.date || ''}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editPost('${p.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deletePost('${p.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

$('newPostBtn').addEventListener('click', () => openPostModal(null));

function openPostModal(id) {
  editingPostId = id;
  $('postModalTitle').textContent = id ? '编辑文章' : '新建文章';
  if (id) {
    // 需要获取完整内容（列表里没有 content）
    api('GET', `/api/posts/${id}`).then(post => {
      $('pm-title').value = post.title || '';
      $('pm-category').value = post.category || '';
      $('pm-date').value = post.date || '';
      $('pm-excerpt').value = post.excerpt || '';
      $('pm-content').value = post.content || '';
      openModal('postModal');
    }).catch(e => showToast(e.message, 'error'));
  } else {
    $('pm-title').value = '';
    $('pm-category').value = '';
    $('pm-date').value = new Date().toISOString().slice(0, 10);
    $('pm-excerpt').value = '';
    $('pm-content').value = '';
    openModal('postModal');
  }
}

window.editPost = openPostModal;

window.deletePost = async (id) => {
  if (!confirm('确定删除这篇文章？')) return;
  try {
    await api('DELETE', `/api/posts/${id}`);
    siteData.posts = siteData.posts.filter(p => p.id !== id);
    renderPosts();
    showToast('文章已删除');
  } catch (e) { showToast(e.message, 'error'); }
};

$('savePostBtn').addEventListener('click', async () => {
  const title = $('pm-title').value.trim();
  if (!title) { showToast('请输入文章标题', 'error'); return; }
  const post = {
    id: editingPostId || String(Date.now()),
    title,
    category: $('pm-category').value.trim(),
    date: $('pm-date').value,
    excerpt: $('pm-excerpt').value.trim(),
    content: $('pm-content').value,
  };
  try {
    // 先拉取完整文章列表（含 content），再合并保存
    const fullPosts = await fetchFullPosts();
    const idx = fullPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) fullPosts[idx] = post;
    else fullPosts.unshift(post);
    await api('PUT', '/api/posts', fullPosts);
    // 更新本地列表（不含 content）
    const { content, ...preview } = post;
    const li = siteData.posts.findIndex(p => p.id === post.id);
    if (li >= 0) siteData.posts[li] = preview;
    else siteData.posts.unshift(preview);
    renderPosts();
    closeModal('postModal');
    showToast('文章已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

async function fetchFullPosts() {
  // 逐篇拉取完整内容（含 content）
  const previews = siteData.posts;
  const full = await Promise.all(previews.map(p =>
    api('GET', `/api/posts/${p.id}`).catch(() => p)
  ));
  return full;
}

// Markdown 工具栏
document.querySelectorAll('.editor-toolbar button[data-md]').forEach(btn => {
  btn.addEventListener('click', () => {
    const ta = $('pm-content');
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.slice(start, end) || '文字';
    const tpl = btn.dataset.md.replace('{sel}', sel);
    ta.value = ta.value.slice(0, start) + tpl + ta.value.slice(end);
    ta.focus();
    ta.selectionStart = start;
    ta.selectionEnd = start + tpl.length;
  });
});

// ── 项目管理 ─────────────────────────────────────────────────────────
function renderProjects() {
  const list = $('projectsList');
  if (!siteData.projects.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无项目</p>';
    return;
  }
  list.innerHTML = siteData.projects.map(p => `
    <div class="list-item">
      <span style="font-size:1.4rem">${p.icon || '📦'}</span>
      <div class="list-item-info">
        <div class="list-item-title">${p.title}</div>
        <div class="list-item-meta">${(p.tech || []).join(' · ')}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editProject('${p.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

$('newProjectBtn').addEventListener('click', () => openProjectModal(null));

function openProjectModal(id) {
  editingProjectId = id;
  $('projectModalTitle').textContent = id ? '编辑项目' : '新建项目';
  const p = id ? siteData.projects.find(x => x.id === id) : {};
  $('pj-icon').value = p.icon || '';
  $('pj-title').value = p.title || '';
  $('pj-desc').value = p.desc || '';
  $('pj-tech').value = (p.tech || []).join(', ');
  $('pj-demo').value = p.demoUrl || '';
  $('pj-repo').value = p.repoUrl || '';
  openModal('projectModal');
}

window.editProject = openProjectModal;

window.deleteProject = async (id) => {
  if (!confirm('确定删除这个项目？')) return;
  try {
    siteData.projects = siteData.projects.filter(p => p.id !== id);
    await api('PUT', '/api/projects', siteData.projects);
    renderProjects();
    showToast('项目已删除');
  } catch (e) { showToast(e.message, 'error'); }
};

$('saveProjectBtn').addEventListener('click', async () => {
  const title = $('pj-title').value.trim();
  if (!title) { showToast('请输入项目名称', 'error'); return; }
  const proj = {
    id: editingProjectId || String(Date.now()),
    icon: $('pj-icon').value.trim() || '📦',
    title,
    desc: $('pj-desc').value.trim(),
    tech: $('pj-tech').value.split(',').map(s => s.trim()).filter(Boolean),
    demoUrl: $('pj-demo').value.trim(),
    repoUrl: $('pj-repo').value.trim(),
  };
  try {
    const idx = siteData.projects.findIndex(p => p.id === proj.id);
    if (idx >= 0) siteData.projects[idx] = proj;
    else siteData.projects.push(proj);
    await api('PUT', '/api/projects', siteData.projects);
    renderProjects();
    closeModal('projectModal');
    showToast('项目已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

// ── 时间线 ───────────────────────────────────────────────────────────
function renderTimeline() {
  const list = $('timelineList');
  if (!siteData.timeline.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无时间线条目</p>';
    return;
  }
  list.innerHTML = siteData.timeline.map(t => `
    <div class="list-item">
      <span style="font-size:1rem;color:var(--accent);font-weight:600;min-width:3rem">${t.year}</span>
      <div class="list-item-info">
        <div class="list-item-title">${t.title}</div>
        <div class="list-item-meta">${t.desc || ''}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editTl('${t.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTl('${t.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

$('newTlBtn').addEventListener('click', () => openTlModal(null));

function openTlModal(id) {
  editingTlId = id;
  $('tlModalTitle').textContent = id ? '编辑条目' : '新建条目';
  const t = id ? siteData.timeline.find(x => x.id === id) : {};
  $('tl-year').value = t.year || new Date().getFullYear();
  $('tl-title').value = t.title || '';
  $('tl-desc').value = t.desc || '';
  openModal('tlModal');
}

window.editTl = openTlModal;

window.deleteTl = async (id) => {
  if (!confirm('确定删除这条记录？')) return;
  try {
    siteData.timeline = siteData.timeline.filter(t => t.id !== id);
    await api('PUT', '/api/timeline', siteData.timeline);
    renderTimeline();
    showToast('已删除');
  } catch (e) { showToast(e.message, 'error'); }
};

$('saveTlBtn').addEventListener('click', async () => {
  const title = $('tl-title').value.trim();
  if (!title) { showToast('请输入标题', 'error'); return; }
  const item = {
    id: editingTlId || String(Date.now()),
    year: $('tl-year').value.trim(),
    title,
    desc: $('tl-desc').value.trim(),
  };
  try {
    const idx = siteData.timeline.findIndex(t => t.id === item.id);
    if (idx >= 0) siteData.timeline[idx] = item;
    else siteData.timeline.unshift(item);
    await api('PUT', '/api/timeline', siteData.timeline);
    renderTimeline();
    closeModal('tlModal');
    showToast('已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

// ── 模态框通用 ───────────────────────────────────────────────────────
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});
