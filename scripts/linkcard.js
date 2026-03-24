'use strict';

const request = require('sync-request');
const cheerio = require('cheerio');

/**
 * URL 规范化
 */
function normalizeUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/**
 * 清理文本
 */
function cleanText(str, max = 100) {
  return (str || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * 标题去噪
 */
function cleanTitle(title) {
  return (title || '')
    .replace(/\s*[-|–].*$/, '')
    .trim()
    .slice(0, 60);
}

/**
 * favicon（三级 fallback）
 */
function resolveIcon($, url) {
  const u = new URL(url);
  const origin = u.origin;
  const hostname = u.hostname;

  let icon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href');

  if (icon) {
    return normalizeUrl(url, icon);
  }

  // fallback：/favicon.ico
  return `${origin}/favicon.ico` ||
         `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}

/**
 * 描述（严格）
 */
function resolveDescription($) {
  let desc =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content');

  if (!desc) {
    const p = $('p').first().text().trim();
    if (p.length > 20 && p.length < 120) {
      desc = p;
    }
  }

  return cleanText(desc);
}

/**
 * 主函数（同步）
 */
function fetchMeta(url) {
  try {
    const res = request('GET', url, {
      timeout: 5000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
      }
    });

    const html = res.getBody('utf8');
    const $ = cheerio.load(html);

    // ===== TITLE =====
    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      url;

    title = cleanTitle(title);

    // ===== DESC =====
    let desc = resolveDescription($);

    // ===== ICON =====
    let icon = resolveIcon($, url);

    // 最终兜底
    if (!icon) {
      const hostname = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    }

    return { title, desc, icon, url };

  } catch (e) {
    const hostname = new URL(url).hostname;

    return {
      title: url,
      desc: '',
      icon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      url
    };
  }
}

/**
 * Hexo Tag（同步，无 Promise）
 */
hexo.extend.tag.register('linkcard', function(args) {
  const url = args[0];
  if (!url) return '';

  const meta = fetchMeta(url);

  return `
<div class="link-card">
  <a href="${meta.url}" target="_blank" rel="noopener">
    <div class="link-card-content">
      <div class="link-card-icon">
        <img src="${meta.icon}" loading="lazy" referrerpolicy="no-referrer"/>
      </div>
      <div class="link-card-text">
        <div class="link-card-title">${meta.title}</div>
        <div class="link-card-desc">${meta.desc}</div>
      </div>
    </div>
  </a>
</div>
`;
});