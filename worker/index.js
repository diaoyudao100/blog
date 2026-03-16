/**
 * Cloudflare Worker — 博客后台 API
 * 路由：
 *   GET  /api/data          — 返回全站数据（公开）
 *   GET  /api/posts/:id      — 返回单篇文章（公开，自动 +1 阅读量）
 *   GET  /api/views          — 返回所有文章阅读量（公开）
 *   GET  /feed.xml           — RSS 订阅源
 *   POST /api/login          — 登录，返回 JWT
 *   PUT  /api/profile        — 更新个人信息（需鉴权）
 *   PUT  /api/hero           — 更新 Hero 区（需鉴权）
 *   PUT  /api/posts          — 保存文章列表（需鉴权）
 *   DELETE /api/posts/:id    — 删除文章（需鉴权）
 *   PUT  /api/projects       — 保存项目列表（需鉴权）
 *   PUT  /api/timeline       — 保存时间线（需鉴权）
 *   PUT  /api/skills         — 保存技能树（需鉴权）
 *   PUT  /api/links          — 保存友情链接（需鉴权）
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

// ── JWT 工具 ─────────────────────────────────────────────────────────
async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = enc(header) + '.' + enc(payload);
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return data + '.' + sigB64;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const data = parts[0] + '.' + parts[1];
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── 响应工具 ─────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── 鉴权中间件 ───────────────────────────────────────────────────────
async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/, '');
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;
  return payload;
}

// ── 默认数据 ─────────────────────────────────────────────────────────
const DEFAULT_PROFILE = {
  name: '小小王',
  nickname: '小小王',
  intro1: '一个热爱技术与生活的普通人，喜欢在键盘上敲出思想的痕迹。这里是我的数字花园，记录学习、感悟与创作。',
  intro2: '相信知识的力量，相信文字的温度，相信每一次细微的积累都是成长的养分。',
  tags: ['💻 编程爱好者', '📚 终身学习', '🎵 音乐', '✈️ 旅行', '☕ 咖啡'],
  email: 'hello@example.com',
  github: '#',
  twitter: '#',
  wechat: '#',
};

const DEFAULT_HERO = {
  subtitle: '欢迎来到我的小角落',
  title: '润物细无声',
  desc: '记录思考，分享成长，用文字丈量世界。',
};

const DEFAULT_POSTS = [
  { id: '1', title: '如何构建一个高效的个人知识库', category: '技术', tags: ['知识管理', '效率'], date: '2025-03-10', excerpt: '知识管理不只是收藏文章，更重要的是建立属于自己的思维框架……', content: '# 如何构建一个高效的个人知识库\n\n知识管理不只是收藏文章，更重要的是建立属于自己的思维框架。\n\n## 为什么需要知识库\n\n在信息爆炸的时代，我们每天接收大量信息，但真正内化的却很少。', published: true },
  { id: '2', title: '慢下来，感受生活的细节', category: '随笔', tags: ['生活', '感悟'], date: '2025-02-28', excerpt: '在这个快节奏的时代，学会慢下来本身就是一种能力……', content: '# 慢下来，感受生活的细节\n\n在这个快节奏的时代，学会慢下来本身就是一种能力。', published: true },
  { id: '3', title: '前端性能优化的十个实用技巧', category: '技术', tags: ['前端', '性能'], date: '2025-02-15', excerpt: '页面加载速度直接影响用户体验，这里总结了十个立竿见影的优化方法……', content: '# 前端性能优化的十个实用技巧\n\n页面加载速度直接影响用户体验。', published: true },
];

const DEFAULT_PROJECTS = [
  { id: '1', icon: '🛠️', title: '项目一', desc: '一个简洁高效的任务管理工具，帮助你专注于真正重要的事情。', tech: ['HTML', 'CSS', 'JS'], demoUrl: '#', repoUrl: '#' },
  { id: '2', icon: '📊', title: '项目二', desc: '数据可视化仪表盘，将复杂数据转化为直观的图表与洞察。', tech: ['Vue', 'ECharts', 'Node'], demoUrl: '#', repoUrl: '#' },
  { id: '3', icon: '🤖', title: '项目三', desc: '基于大语言模型的智能写作助手，让创作更加流畅自然。', tech: ['Python', 'FastAPI', 'Claude'], demoUrl: '#', repoUrl: '#' },
];

const DEFAULT_TIMELINE = [
  { id: '1', year: '2025', title: '开始写博客', desc: '创建「润物细无声」，用文字记录思考与成长。' },
  { id: '2', year: '2024', title: '深入学习 AI 技术', desc: '系统学习大语言模型原理，完成多个 AI 相关项目。' },
  { id: '3', year: '2023', title: '全栈开发进阶', desc: '掌握前后端全栈技术，独立完成多个完整项目。' },
  { id: '4', year: '2022', title: '踏入编程世界', desc: '写下人生第一行代码，从此爱上这门语言的魔法。' },
];

const DEFAULT_SKILLS = [
  {
    id: '1', category: '前端开发',
    items: [
      { name: 'HTML / CSS', level: 5 },
      { name: 'JavaScript', level: 5 },
      { name: 'Vue.js', level: 4 },
      { name: 'React', level: 3 },
    ],
  },
  {
    id: '2', category: '后端 & 工具',
    items: [
      { name: 'Node.js', level: 4 },
      { name: 'Python', level: 4 },
      { name: 'Git', level: 5 },
      { name: 'Docker', level: 3 },
    ],
  },
];

const DEFAULT_LINKS = [
  { id: '1', name: '示例博客', url: 'https://example.com', desc: '一个优秀的技术博客', icon: '🌐' },
  { id: '2', name: '好友站点', url: 'https://example.org', desc: '记录生活与思考', icon: '✍️' },
];

// ── KV 读取（带默认值） ──────────────────────────────────────────────
async function kvGet(kv, key, defaultVal) {
  const raw = await kv.get(key);
  if (raw === null) return defaultVal;
  try { return JSON.parse(raw); } catch { return defaultVal; }
}

// ── 字数统计 ─────────────────────────────────────────────────────────
function countWords(content) {
  return (content || '').replace(/[#*`>\-\[\]!]/g, '').length;
}

// ── RSS 生成 ─────────────────────────────────────────────────────────
function buildRSS(hero, posts, baseUrl) {
  const siteTitle = hero.title || '润物细无声';
  const siteDesc = hero.desc || '';
  const items = posts
    .filter(p => p.published !== false)
    .slice(0, 20)
    .map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${baseUrl}/post.html?id=${p.id}</link>
      <guid>${baseUrl}/post.html?id=${p.id}</guid>
      <pubDate>${p.date ? new Date(p.date).toUTCString() : ''}</pubDate>
      <description><![CDATA[${p.excerpt || ''}]]></description>
      ${(p.tags || []).map(t => `<category>${t}</category>`).join('')}
    </item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${siteTitle}]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[${siteDesc}]]></description>
    <language>zh-CN</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;
}

// ── 主路由 ───────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET /feed.xml — RSS
    if (method === 'GET' && path === '/feed.xml') {
      const [hero, posts] = await Promise.all([
        kvGet(env.BLOG_KV, 'site:hero', DEFAULT_HERO),
        kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS),
      ]);
      const baseUrl = url.origin.includes('worker') ? 'https://06bca6da.blog-f1v.pages.dev' : url.origin;
      const rss = buildRSS(hero, posts, baseUrl);
      return new Response(rss, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/rss+xml; charset=utf-8' },
      });
    }

    // GET /api/data — 全站数据
    if (method === 'GET' && path === '/api/data') {
      const [profile, hero, posts, projects, timeline, skills, links, views] = await Promise.all([
        kvGet(env.BLOG_KV, 'site:profile', DEFAULT_PROFILE),
        kvGet(env.BLOG_KV, 'site:hero', DEFAULT_HERO),
        kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS),
        kvGet(env.BLOG_KV, 'site:projects', DEFAULT_PROJECTS),
        kvGet(env.BLOG_KV, 'site:timeline', DEFAULT_TIMELINE),
        kvGet(env.BLOG_KV, 'site:skills', DEFAULT_SKILLS),
        kvGet(env.BLOG_KV, 'site:links', DEFAULT_LINKS),
        kvGet(env.BLOG_KV, 'site:views', {}),
      ]);
      // 只返回已发布文章，剥除正文，补充字数
      const postsWithoutContent = posts
        .filter(p => p.published !== false)
        .map(({ content, ...p }) => ({ ...p, wordCount: countWords(content) }));
      return json({ profile, hero, posts: postsWithoutContent, projects, timeline, skills, links, views });
    }

    // GET /api/views
    if (method === 'GET' && path === '/api/views') {
      const views = await kvGet(env.BLOG_KV, 'site:views', {});
      return json(views);
    }

    // GET /api/archive — 归档数据
    if (method === 'GET' && path === '/api/archive') {
      const posts = await kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS);
      const published = posts.filter(p => p.published !== false);
      const archive = {};
      published.forEach(p => {
        const year = (p.date || '').slice(0, 4) || '未知';
        if (!archive[year]) archive[year] = [];
        archive[year].push({ id: p.id, title: p.title, date: p.date, category: p.category, tags: p.tags || [] });
      });
      return json(archive);
    }

    // GET /api/posts/:id
    const postMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (method === 'GET' && postMatch) {
      const id = postMatch[1];
      const posts = await kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS);
      const idx = posts.findIndex(p => p.id === id);
      if (idx < 0) return err('文章不存在', 404);
      const post = posts[idx];
      if (post.published === false) return err('文章不存在', 404);
      // 上一篇/下一篇（仅已发布）
      const published = posts.filter(p => p.published !== false);
      const pidx = published.findIndex(p => p.id === id);
      const prev = pidx > 0 ? { id: published[pidx - 1].id, title: published[pidx - 1].title } : null;
      const next = pidx < published.length - 1 ? { id: published[pidx + 1].id, title: published[pidx + 1].title } : null;
      // 阅读量 +1
      env.BLOG_KV.get('site:views').then(raw => {
        const views = raw ? JSON.parse(raw) : {};
        views[id] = (views[id] || 0) + 1;
        env.BLOG_KV.put('site:views', JSON.stringify(views));
      }).catch(() => {});
      return json({ ...post, wordCount: countWords(post.content), prev, next });
    }

    // POST /api/login
    if (method === 'POST' && path === '/api/login') {
      let body;
      try { body = await request.json(); } catch { return err('请求格式错误'); }
      const { password } = body || {};
      if (!password) return err('请输入密码');
      const correctPassword = env.ADMIN_PASSWORD || 'admin123';
      if (password !== correctPassword) return err('密码错误', 401);
      const token = await signJWT(
        { sub: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
        env.JWT_SECRET || 'dev-secret'
      );
      return json({ token });
    }

    // 以下路由需要鉴权
    const auth = await requireAuth(request, env.JWT_SECRET ? env : { JWT_SECRET: 'dev-secret', ...env });

    // GET /api/admin/posts — 管理员获取全部文章（含草稿）
    if (method === 'GET' && path === '/api/admin/posts') {
      if (!auth) return err('未授权', 401);
      const posts = await kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS);
      return json(posts.map(({ content, ...p }) => ({ ...p, wordCount: countWords(content) })));
    }

    if (method === 'PUT' && path === '/api/profile') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:profile', JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'PUT' && path === '/api/hero') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:hero', JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'PUT' && path === '/api/posts') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:posts', JSON.stringify(body));
      return json({ ok: true });
    }
    const postMatch2 = path.match(/^\/api\/posts\/([^/]+)$/);
    if (method === 'DELETE' && postMatch2) {
      if (!auth) return err('未授权', 401);
      const id = postMatch2[1];
      const posts = await kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS);
      await env.BLOG_KV.put('site:posts', JSON.stringify(posts.filter(p => p.id !== id)));
      return json({ ok: true });
    }
    if (method === 'PUT' && path === '/api/projects') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:projects', JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'PUT' && path === '/api/timeline') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:timeline', JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'PUT' && path === '/api/skills') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:skills', JSON.stringify(body));
      return json({ ok: true });
    }
    if (method === 'PUT' && path === '/api/links') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:links', JSON.stringify(body));
      return json({ ok: true });
    }

    return err('Not Found', 404);
  },
};
