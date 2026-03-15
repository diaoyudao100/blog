/**
 * Cloudflare Worker — 博客后台 API
 * 路由：
 *   GET  /api/data          — 返回全站数据（公开）
 *   GET  /api/posts/:id      — 返回单篇文章（公开）
 *   POST /api/login          — 登录，返回 JWT
 *   PUT  /api/profile        — 更新个人信息（需鉴权）
 *   PUT  /api/hero           — 更新 Hero 区（需鉴权）
 *   PUT  /api/posts          — 保存文章列表（需鉴权）
 *   DELETE /api/posts/:id    — 删除文章（需鉴权）
 *   PUT  /api/projects       — 保存项目列表（需鉴权）
 *   PUT  /api/timeline       — 保存时间线（需鉴权）
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

// ── JWT 工具（Web Crypto API，无需第三方库） ──────────────────────────
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

// ── 响应工具 ────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── 鉴权中间件 ──────────────────────────────────────────────────────
async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/, '');
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;
  return payload;
}

// ── 默认数据 ────────────────────────────────────────────────────────
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
  { id: '1', title: '如何构建一个高效的个人知识库', category: '技术', date: '2025-03-10', excerpt: '知识管理不只是收藏文章，更重要的是建立属于自己的思维框架……', content: '# 如何构建一个高效的个人知识库\n\n知识管理不只是收藏文章，更重要的是建立属于自己的思维框架。\n\n## 为什么需要知识库\n\n在信息爆炸的时代，我们每天接收大量信息，但真正内化的却很少。' },
  { id: '2', title: '慢下来，感受生活的细节', category: '随笔', date: '2025-02-28', excerpt: '在这个快节奏的时代，学会慢下来本身就是一种能力……', content: '# 慢下来，感受生活的细节\n\n在这个快节奏的时代，学会慢下来本身就是一种能力。' },
  { id: '3', title: '前端性能优化的十个实用技巧', category: '技术', date: '2025-02-15', excerpt: '页面加载速度直接影响用户体验，这里总结了十个立竿见影的优化方法……', content: '# 前端性能优化的十个实用技巧\n\n页面加载速度直接影响用户体验。' },
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

// ── KV 读取（带默认值） ──────────────────────────────────────────────
async function kvGet(kv, key, defaultVal) {
  const raw = await kv.get(key);
  if (raw === null) return defaultVal;
  try { return JSON.parse(raw); } catch { return defaultVal; }
}

// ── 主路由 ──────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // GET /api/data — 全站数据
    if (method === 'GET' && path === '/api/data') {
      const [profile, hero, posts, projects, timeline] = await Promise.all([
        kvGet(env.BLOG_KV, 'site:profile', DEFAULT_PROFILE),
        kvGet(env.BLOG_KV, 'site:hero', DEFAULT_HERO),
        kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS),
        kvGet(env.BLOG_KV, 'site:projects', DEFAULT_PROJECTS),
        kvGet(env.BLOG_KV, 'site:timeline', DEFAULT_TIMELINE),
      ]);
      // 文章列表不返回 content 字段（节省流量）
      const postsWithoutContent = posts.map(({ content, ...p }) => p);
      return json({ profile, hero, posts: postsWithoutContent, projects, timeline });
    }

    // GET /api/posts/:id — 单篇文章
    const postMatch = path.match(/^\/api\/posts\/([^/]+)$/);
    if (method === 'GET' && postMatch) {
      const id = postMatch[1];
      const posts = await kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS);
      const post = posts.find(p => p.id === id);
      if (!post) return err('文章不存在', 404);
      return json(post);
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

    // PUT /api/profile
    if (method === 'PUT' && path === '/api/profile') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:profile', JSON.stringify(body));
      return json({ ok: true });
    }

    // PUT /api/hero
    if (method === 'PUT' && path === '/api/hero') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:hero', JSON.stringify(body));
      return json({ ok: true });
    }

    // PUT /api/posts — 保存整个文章列表（含内容）
    if (method === 'PUT' && path === '/api/posts') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:posts', JSON.stringify(body));
      return json({ ok: true });
    }

    // DELETE /api/posts/:id
    if (method === 'DELETE' && postMatch) {
      if (!auth) return err('未授权', 401);
      const id = postMatch[1];
      const posts = await kvGet(env.BLOG_KV, 'site:posts', DEFAULT_POSTS);
      const newPosts = posts.filter(p => p.id !== id);
      await env.BLOG_KV.put('site:posts', JSON.stringify(newPosts));
      return json({ ok: true });
    }

    // PUT /api/projects
    if (method === 'PUT' && path === '/api/projects') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:projects', JSON.stringify(body));
      return json({ ok: true });
    }

    // PUT /api/timeline
    if (method === 'PUT' && path === '/api/timeline') {
      if (!auth) return err('未授权', 401);
      const body = await request.json();
      await env.BLOG_KV.put('site:timeline', JSON.stringify(body));
      return json({ ok: true });
    }

    return err('Not Found', 404);
  },
};
