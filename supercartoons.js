// SuperCartoons — Vintage & classic cartoon archive (Tom & Jerry, Looney Tunes, Popeye, Disney, etc.)

var SOURCE_ID = (typeof __SOURCE_ID !== 'undefined' && __SOURCE_ID)
  ? String(__SOURCE_ID) : 'supercartoons';

var BASE_URL = 'https://www.supercartoons.net';
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function getInfo() {
  return {
    id: 'supercartoons',
    name: 'SuperCartoons (Vintage)',
    lang: 'en',
    baseUrl: BASE_URL,
    logo: BASE_URL + '/wp-content/themes/supercartoons/favicon.png',
    type: 'anime',
    version: '1.0.0'
  };
}

async function search(query, page) {
  var q = String(query || '').trim().replace(/ /g, '+');
  if (!q) return [];
  var url = BASE_URL + '/?s=' + encodeURIComponent(q) + '&search=Search';
  var res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Referer': BASE_URL + '/' } });
  var html = (res && res.body) || '';
  var results = [];
  var re = /<div[^>]*class=["'](?:[^"']*\s)?item(?:\s[^"']*)?["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var rawTitle = htmlText(m[2]);
    results.push({
      id: m[1],
      title: rawTitle,
      url: m[1]
    });
  }
  return results;
}

async function getDetail(idOrUrl) {
  var url = absUrl(idOrUrl, BASE_URL);
  var res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Referer': BASE_URL + '/' } });
  var html = (res && res.body) || '';

  var contentUrlMatch = html.match(/"contentUrl":\s*"([^"]+\.mp4)"/i);
  var streamUrl = contentUrlMatch ? contentUrlMatch[1] : null;

  if (!streamUrl) {
    var jwMatch = html.match(/file:\s*"([^"]+\.mp4)"/i);
    streamUrl = jwMatch ? jwMatch[1] : null;
  }

  var titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  var title = titleMatch ? htmlText(titleMatch[1]) : 'Cartoon';

  var episodes = [];
  if (streamUrl) {
    episodes.push({
      id: 'ep1',
      number: 1,
      title: title,
      url: streamUrl
    });
  }

  return {
    id: idOrUrl,
    title: title,
    episodes: episodes
  };
}

async function getVideoSources(episodeIdOrUrl) {
  var streamUrl = episodeIdOrUrl;
  if (!streamUrl) return [];
  return [{
    url: streamUrl,
    quality: '480p',
    container: 'mp4',
    isDirect: true,
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': BASE_URL + '/'
    }
  }];
}

async function scrape(media) {
  try {
    var rawTitle = (media && media.title) || '';
    var title = rawTitle
      .replace(/\s+s\d+e\d+.*$/i, '')
      .replace(/\s+season\s*\d+.*$/i, '')
      .trim() || rawTitle;

    console.log('[SuperCartoons][scrape] Starting scrape for title="' + title + '"');
    if (!title) return [];

    var searchResults = await search(title, 1);
    if (!searchResults || !searchResults.length) {
      console.warn('[SuperCartoons][scrape] 0 search results for "' + title + '"');
      return [];
    }

    var card = searchResults[0];
    var detail = await getDetail(card.url || card.id);
    var episodes = (detail && detail.episodes) || [];
    if (!episodes.length) return [];

    return await getVideoSources(episodes[0].url);
  } catch (e) {
    console.error('[SuperCartoons][scrape] Error: ' + (e && e.stack || e));
    return [];
  }
}
