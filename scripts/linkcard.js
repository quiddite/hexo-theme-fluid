const axios = require('axios');
const cheerio = require('cheerio');

const cache = new Map();

/**
 * 将相对路径转为绝对路径
 */
function normalizeUrl(base, url) {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * 清洗文本（去 HTML + 限长）
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')   // 去 HTML 标签
    .replace(/\s+/g, ' ')      // 合并空白
    .trim()
    .slice(0, 120);            // 限制长度
}

/**
 * 获取 metadata（核心）
 */
async function fetchMeta(url) {
  if (cache.has(url)) return cache.get(url);

  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const $ = cheerio.load(data);

    // 标题
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      url;

    // 描述（只用 meta，不抓正文）
    let desc =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    // icon
    let icon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    if (icon) {
      icon = normalizeUrl(url, icon);
    }

    // fallback favicon（关键）
    if (!icon) {
      const domain = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    const result = {
      title: cleanText(title),
      desc: cleanText(desc),
      icon
    };

    cache.set(url, result);
    return result;

  } catch (e) {
    const domain = new URL(url).hostname;

    const fallback = {
      title: url,
      desc: '',
      icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    };

    cache.set(url, fallback);
    return fallback;
  }
}

/**
 * 注册 tag: {% linkcard url %}
 */
hexo.extend.tag.register(
  'linkcard',
  async function (args) {
    const url = args[0];
    if (!url) return '';

    const meta = await fetchMeta(url);

    return `
<div class="fluid-linkcard">
  <a href="${url}" target="_blank" rel="noopener">
    <div class="card-left">
      <img src="${meta.icon}" class="card-icon" loading="lazy">
    </div>
    <div class="card-right">
      <div class="card-title">${meta.title}</div>
      <div class="card-desc">${meta.desc}</div>
      <div class="card-url">${new URL(url).hostname}</div>
    </div>
  </a>
</div>
`;
  },
  { async: true }
);