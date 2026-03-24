const axios = require('axios');
const cheerio = require('cheerio');

function normalizeUrl(base, url) {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

async function fetchMeta(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const $ = cheerio.load(data);

    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text();

    let desc =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    let icon =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    if (icon) icon = normalizeUrl(url, icon);

    // fallback favicon（很关键）
    if (!icon) {
      const domain = new URL(url).hostname;
      icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    return {
      title: cleanText(title),
      desc: cleanText(desc),
      icon
    };

  } catch (e) {
    return {
      title: url,
      desc: '',
      icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
    };
  }
}