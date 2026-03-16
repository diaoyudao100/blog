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
let siteData = { profile: {}, hero: {}, posts: [], projects: [], timeline: [], skills: [], links: [] };
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
    renderSkills();
    renderLinks();
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
    // 同步底部栏面板
    document.querySelectorAll('.bottom-bar-panel').forEach(p => p.classList.remove('active'));
    const barPanel = document.querySelector(`.bottom-bar-panel[data-for="${item.dataset.tab}"]`);
    if (barPanel) barPanel.classList.add('active');
    if (item.dataset.tab === 'stats') loadStats();
  });
});

// 初始化底部栏：激活第一个面板
(function() {
  const first = document.querySelector('.bottom-bar-panel');
  if (first) first.classList.add('active');
})();

// ── 个人信息 ─────────────────────────────────────────────────────────
let profileAvatarBase64 = '';

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
  profileAvatarBase64 = p.avatar || '';
  renderAvatarPreview();
  renderTags();
}

function renderAvatarPreview() {
  const preview = $('avatarPreview');
  if (profileAvatarBase64) {
    preview.innerHTML = `<img src="${profileAvatarBase64}" alt="头像" />`;
  } else {
    preview.innerHTML = '无图片';
  }
}

$('avatarUploadBtn').addEventListener('click', () => $('p-avatar-file').click());

$('p-avatar-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 500 * 1024) {
    showToast('图片不能超过 500KB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    profileAvatarBase64 = ev.target.result;
    renderAvatarPreview();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

$('avatarClearBtn').addEventListener('click', () => {
  profileAvatarBase64 = '';
  renderAvatarPreview();
});

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
    avatar: profileAvatarBase64,
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
let selectedPosts = new Set();

function renderPosts() {
  const list = $('postsList');
  if (!siteData.posts.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无文章，点击「新建文章」开始创作</p>';
    return;
  }
  list.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;color:var(--text-muted);cursor:pointer">
        <input type="checkbox" id="selectAll" /> 全选
      </label>
      <button class="btn btn-sm btn-danger" id="batchDeleteBtn" style="display:none">删除所选</button>
      <button class="btn btn-sm btn-secondary" id="batchDraftBtn" style="display:none">设为草稿</button>
      <button class="btn btn-sm btn-secondary" id="batchPublishBtn" style="display:none">设为发布</button>
    </div>
    ${siteData.posts.map(p => `
    <div class="list-item">
      <input type="checkbox" class="post-check" data-id="${p.id}" style="flex-shrink:0" />
      <div class="list-item-info">
        <div class="list-item-title">
          ${p.published === false ? '<span style="font-size:0.75rem;color:var(--text-muted);background:var(--bg-secondary);padding:0.1rem 0.4rem;border-radius:4px;margin-right:0.4rem">草稿</span>' : ''}
          ${p.title}
        </div>
        <div class="list-item-meta">${p.category || ''} · ${p.date || ''} · ${p.wordCount ? p.wordCount + '字' : ''}</div>
      </div>
      <div class="list-item-actions">
        <a href="../post.html?id=${p.id}" target="_blank" class="btn btn-sm btn-secondary">预览</a>
        <button class="btn btn-sm btn-secondary" onclick="editPost('${p.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deletePost('${p.id}')">删除</button>
      </div>
    </div>
  `).join('')}`;

  // 全选
  $('selectAll').addEventListener('change', e => {
    document.querySelectorAll('.post-check').forEach(cb => cb.checked = e.target.checked);
    updateBatchButtons();
  });
  document.querySelectorAll('.post-check').forEach(cb => {
    cb.addEventListener('change', updateBatchButtons);
  });

  $('batchDeleteBtn').addEventListener('click', batchDelete);
  $('batchDraftBtn').addEventListener('click', () => batchSetPublished(false));
  $('batchPublishBtn').addEventListener('click', () => batchSetPublished(true));
}

function updateBatchButtons() {
  const checked = document.querySelectorAll('.post-check:checked').length;
  const show = checked > 0 ? '' : 'none';
  $('batchDeleteBtn').style.display = show;
  $('batchDraftBtn').style.display = show;
  $('batchPublishBtn').style.display = show;
}

async function batchDelete() {
  const ids = [...document.querySelectorAll('.post-check:checked')].map(cb => cb.dataset.id);
  if (!ids.length || !confirm(`确定删除选中的 ${ids.length} 篇文章？`)) return;
  try {
    const fullPosts = await fetchFullPosts();
    const newPosts = fullPosts.filter(p => !ids.includes(p.id));
    await api('PUT', '/api/posts', newPosts);
    siteData.posts = siteData.posts.filter(p => !ids.includes(p.id));
    renderPosts();
    showToast(`已删除 ${ids.length} 篇文章`);
  } catch (e) { showToast(e.message, 'error'); }
}

async function batchSetPublished(published) {
  const ids = [...document.querySelectorAll('.post-check:checked')].map(cb => cb.dataset.id);
  if (!ids.length) return;
  try {
    const fullPosts = await fetchFullPosts();
    fullPosts.forEach(p => { if (ids.includes(p.id)) p.published = published; });
    await api('PUT', '/api/posts', fullPosts);
    siteData.posts.forEach(p => { if (ids.includes(p.id)) p.published = published; });
    renderPosts();
    showToast(`已${published ? '发布' : '设为草稿'} ${ids.length} 篇文章`);
  } catch (e) { showToast(e.message, 'error'); }
}

$('newPostBtn').addEventListener('click', () => openPostModal(null));

function openPostModal(id) {
  editingPostId = id;
  $('postModalTitle').textContent = id ? '编辑文章' : '新建文章';
  if (id) {
    api('GET', `/api/posts/${id}`).then(post => {
      $('pm-title').value = post.title || '';
      $('pm-category').value = post.category || '';
      $('pm-date').value = post.date || '';
      $('pm-cover').value = post.cover || '';
      $('pm-excerpt').value = post.excerpt || '';
      $('pm-content').value = post.content || '';
      if ($('pm-tags')) $('pm-tags').value = (post.tags || []).join(', ');
      if ($('pm-published')) $('pm-published').checked = post.published !== false;
      updatePreview();
      openModal('postModal');
    }).catch(e => showToast(e.message, 'error'));
  } else {
    $('pm-title').value = '';
    $('pm-category').value = '';
    $('pm-date').value = new Date().toISOString().slice(0, 10);
    $('pm-cover').value = '';
    $('pm-excerpt').value = '';
    $('pm-content').value = '';
    if ($('pm-tags')) $('pm-tags').value = '';
    if ($('pm-published')) $('pm-published').checked = true;
    updatePreview();
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
  const tagsRaw = $('pm-tags') ? $('pm-tags').value.trim() : '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const post = {
    id: editingPostId || String(Date.now()),
    title,
    category: $('pm-category').value.trim(),
    tags,
    date: $('pm-date').value,
    cover: $('pm-cover').value.trim(),
    excerpt: $('pm-excerpt').value.trim(),
    content: $('pm-content').value,
    published: $('pm-published') ? $('pm-published').checked : true,
  };
  try {
    const fullPosts = await fetchFullPosts();
    const idx = fullPosts.findIndex(p => p.id === post.id);
    if (idx >= 0) fullPosts[idx] = post;
    else fullPosts.unshift(post);
    await api('PUT', '/api/posts', fullPosts);
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
    updatePreview();
  });
});

// Markdown 实时预览
function updatePreview() {
  const preview = $('pm-preview');
  if (!preview) return;
  const content = $('pm-content').value;
  if (typeof marked !== 'undefined') {
    preview.innerHTML = marked.parse(content || '*预览将在此显示*');
  } else {
    preview.textContent = content;
  }
}

// 监听内容输入触发预览
document.addEventListener('DOMContentLoaded', () => {
  const ta = $('pm-content');
  if (ta) ta.addEventListener('input', updatePreview);
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

// ── 技能树管理 ───────────────────────────────────────────────────────
let editingSkillCatId = null;

function renderSkills() {
  const list = $('skillsList');
  if (!siteData.skills || !siteData.skills.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无技能分类</p>';
    return;
  }
  list.innerHTML = siteData.skills.map(cat => `
    <div class="list-item" style="flex-direction:column;align-items:flex-start;gap:0.5rem">
      <div style="display:flex;width:100%;align-items:center">
        <div class="list-item-info">
          <div class="list-item-title">${cat.category}</div>
          <div class="list-item-meta">${(cat.items||[]).map(i=>i.name).join(' · ')}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-sm btn-secondary" onclick="editSkillCat('${cat.id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSkillCat('${cat.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

$('newSkillCatBtn').addEventListener('click', () => openSkillCatModal(null));

function openSkillCatModal(id) {
  editingSkillCatId = id;
  $('skillCatModalTitle').textContent = id ? '编辑技能分类' : '新建技能分类';
  const cat = id ? siteData.skills.find(x => x.id === id) : null;
  $('sc-category').value = cat ? cat.category : '';
  const itemsEl = $('sc-items-list');
  itemsEl.innerHTML = '';
  const items = cat ? cat.items : [];
  items.forEach(item => addSkillItemRow(item.name, item.level));
  openModal('skillCatModal');
}

window.editSkillCat = openSkillCatModal;

window.deleteSkillCat = async (id) => {
  if (!confirm('确定删除此技能分类？')) return;
  try {
    siteData.skills = siteData.skills.filter(s => s.id !== id);
    await api('PUT', '/api/skills', siteData.skills);
    renderSkills();
    showToast('已删除');
  } catch (e) { showToast(e.message, 'error'); }
};

function addSkillItemRow(name = '', level = 3) {
  const wrap = $('sc-items-list');
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center';
  row.innerHTML = `
    <input type="text" placeholder="技能名称" value="${name}" class="skill-name-input"
      style="flex:1;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.7rem;color:var(--text-primary);font-family:inherit;font-size:0.9rem;outline:none" />
    <select class="skill-level-select"
      style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-primary);font-family:inherit;font-size:0.85rem;outline:none">
      ${[1,2,3,4,5].map(v=>`<option value="${v}"${v===level?' selected':''}>${v} 星</option>`).join('')}
    </select>
    <button type="button" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1rem;padding:0.2rem" onclick="this.parentElement.remove()">✕</button>
  `;
  wrap.appendChild(row);
}

$('addSkillItemBtn').addEventListener('click', () => addSkillItemRow());

$('saveSkillCatBtn').addEventListener('click', async () => {
  const category = $('sc-category').value.trim();
  if (!category) { showToast('请输入分类名称', 'error'); return; }
  const rows = $('sc-items-list').querySelectorAll('div');
  const items = [];
  rows.forEach(row => {
    const nameEl = row.querySelector('.skill-name-input');
    const levelEl = row.querySelector('.skill-level-select');
    if (nameEl && nameEl.value.trim()) {
      items.push({ name: nameEl.value.trim(), level: parseInt(levelEl.value) });
    }
  });
  const cat = { id: editingSkillCatId || String(Date.now()), category, items };
  try {
    if (!siteData.skills) siteData.skills = [];
    const idx = siteData.skills.findIndex(s => s.id === cat.id);
    if (idx >= 0) siteData.skills[idx] = cat;
    else siteData.skills.push(cat);
    await api('PUT', '/api/skills', siteData.skills);
    renderSkills();
    closeModal('skillCatModal');
    showToast('技能分类已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

// ── 友情链接管理 ─────────────────────────────────────────────────────
let editingLinkId = null;

function renderLinks() {
  const list = $('linksList');
  if (!siteData.links || !siteData.links.length) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">暂无友情链接</p>';
    return;
  }
  list.innerHTML = siteData.links.map(l => `
    <div class="list-item">
      <span style="font-size:1.4rem">${l.icon || '🌐'}</span>
      <div class="list-item-info">
        <div class="list-item-title">${l.name}</div>
        <div class="list-item-meta">${l.url} · ${l.desc || ''}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editLink('${l.id}')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deleteLink('${l.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

$('newLinkBtn').addEventListener('click', () => openLinkModal(null));

function openLinkModal(id) {
  editingLinkId = id;
  $('linkModalTitle').textContent = id ? '编辑友链' : '新建友链';
  const l = id ? siteData.links.find(x => x.id === id) : {};
  $('lk-icon').value = l.icon || '';
  $('lk-name').value = l.name || '';
  $('lk-url').value = l.url || '';
  $('lk-desc').value = l.desc || '';
  openModal('linkModal');
}

window.editLink = openLinkModal;

window.deleteLink = async (id) => {
  if (!confirm('确定删除此友链？')) return;
  try {
    siteData.links = siteData.links.filter(l => l.id !== id);
    await api('PUT', '/api/links', siteData.links);
    renderLinks();
    showToast('已删除');
  } catch (e) { showToast(e.message, 'error'); }
};

$('saveLinkBtn').addEventListener('click', async () => {
  const name = $('lk-name').value.trim();
  const url = $('lk-url').value.trim();
  if (!name) { showToast('请输入名称', 'error'); return; }
  if (!url) { showToast('请输入链接', 'error'); return; }
  const link = {
    id: editingLinkId || String(Date.now()),
    icon: $('lk-icon').value.trim() || '🌐',
    name,
    url,
    desc: $('lk-desc').value.trim(),
  };
  try {
    if (!siteData.links) siteData.links = [];
    const idx = siteData.links.findIndex(l => l.id === link.id);
    if (idx >= 0) siteData.links[idx] = link;
    else siteData.links.push(link);
    await api('PUT', '/api/links', siteData.links);
    renderLinks();
    closeModal('linkModal');
    showToast('友链已保存');
  } catch (e) { showToast(e.message, 'error'); }
});

// ── 图片上传到 KV ────────────────────────────────────────────────────
async function uploadImageToKV(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 800 * 1024) { reject(new Error('图片不能超过 800KB')); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = await api('POST', '/api/upload', { data: ev.target.result, name: file.name });
        resolve(data.url);
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
}

// 封面图上传按钮
document.addEventListener('DOMContentLoaded', () => {
  const coverUploadBtn = document.getElementById('coverUploadBtn');
  const coverFileInput = document.getElementById('pm-cover-file');
  if (coverUploadBtn && coverFileInput) {
    coverUploadBtn.addEventListener('click', () => coverFileInput.click());
    coverFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      coverUploadBtn.textContent = '上传中…';
      try {
        const url = await uploadImageToKV(file);
        $('pm-cover').value = url;
        showToast('封面图已上传');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        coverUploadBtn.textContent = '上传图片';
        e.target.value = '';
      }
    });
  }
});

// ── 访客统计 ─────────────────────────────────────────────────────────
async function loadStats() {
  const wrap = $('statsWrap');
  if (!wrap) return;
  wrap.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">加载中…</p>';
  try {
    const data = await api('GET', '/api/stats');
    const topHtml = (data.topPosts || []).map(p => `
      <div style="display:flex;align-items:center;gap:0.8rem;padding:0.6rem 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;font-size:0.9rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.title}</div>
        <span style="font-size:0.8rem;color:var(--text-muted)">👁 ${p.views}</span>
        <span style="font-size:0.8rem;color:var(--text-muted)">❤️ ${p.likes}</span>
      </div>`).join('');
    // 简单柱状图
    const maxViews = Math.max(...(data.topPosts || []).map(p => p.views), 1);
    const chartHtml = (data.topPosts || []).slice(0, 5).map(p => `
      <div style="margin-bottom:0.6rem">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--text-muted);margin-bottom:0.2rem">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">${p.title}</span>
          <span>${p.views}</span>
        </div>
        <div style="background:var(--bg-secondary);border-radius:4px;height:8px">
          <div style="background:var(--accent);border-radius:4px;height:8px;width:${Math.round(p.views/maxViews*100)}%;transition:width 0.8s ease"></div>
        </div>
      </div>`).join('');
    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;text-align:center">
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent)">${data.totalViews || 0}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">总阅读量</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;text-align:center">
          <div style="font-size:1.8rem;font-weight:700;color:#f87171">${data.totalLikes || 0}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">总点赞数</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;text-align:center">
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent-2)">${(data.topPosts||[]).length}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-top:0.3rem">有阅读量文章</div>
        </div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem;margin-bottom:1rem">
        <h4 style="font-size:0.95rem;margin-bottom:1rem;color:var(--text-secondary)">阅读量 Top 5</h4>
        ${chartHtml}
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:1.2rem">
        <h4 style="font-size:0.95rem;margin-bottom:0.5rem;color:var(--text-secondary)">文章详细数据</h4>
        ${topHtml}
      </div>`;
  } catch (e) {
    wrap.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem">${e.message}</p>`;
  }
}
