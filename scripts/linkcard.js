const axios = require('axios');
const cheerio = require('cheerio');

const cache = new Map();

// 获取 metadata
async function fetchMeta(url) {
  if (cache.has(url)) return cache.get(url);

  try {
    const { data } = await axios.get(url, { timeout: 5000 });
    const $ = cheerio.load(data);

    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text();

    let desc =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    let icon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    if (icon && !icon.startsWith('http')) {
      const origin = new URL(url).origin;
      icon = origin + icon;
    }

    const result = { title, desc, icon };
    cache.set(url, result);
    return result;
  } catch (e) {
    return {};
  }
}

// 注册 tag（异步）
hexo.extend.tag.register(
  'linkcard',
  async function (args) {
    const url = args[0];
    const domain = new URL(url).hostname;

    const meta = await fetchMeta(url);

    const title = meta.title || url;
    const desc = meta.desc || domain;

    const icon =
      meta.icon ||
      `https://icons.duckduckgo.com/ip3/${domain}.ico`;

    return `
<div class="fluid-linkcard">
  <a href="${url}" target="_blank" rel="noopener">
    <div class="card-left">
      <img src="${icon}" class="card-icon">
    </div>
    <div class="card-right">
      <div class="card-title">${title}</div>
      <div class="card-desc">${desc}</div>
      <div class="card-url">${domain}</div>
    </div>
  </a>
</div>
`;
  },
  { async: true }
);