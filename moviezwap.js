// MoviezWap — South Indian regional & classic movies source (Telugu, Tamil, Kannada, Malayalam, Hindi)

var SOURCE_ID = (typeof __SOURCE_ID !== 'undefined' && __SOURCE_ID)
  ? String(__SOURCE_ID) : 'moviezwap';

var BASE_URL = 'https://www.moviezwap.boo';
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function getInfo() {
  return {
    id: 'moviezwap',
    name: 'MoviezWap',
    lang: 'te',
    baseUrl: BASE_URL,
    logo: BASE_URL + '/images/favicon.ico',
    type: 'movie',
    version: '1.0.0'
  };
}

async function search(query, page) {
  var q = String(query || '').trim();
  if (!q) return [];
  var url = BASE_URL + '/search.php?q=' + encodeURIComponent(q);
  var res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Referer': BASE_URL + '/' } });
  var html = (res && res.body) || '';
  var results = [];
  var re = /<div class=['"]mylist['"]>[^<]*<img[^>]*>[^<]*<a href=['"](\/movie\/[^'"]*)['"]>(.*?)<\/a>/gi;
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
  var titleMatch = html.match(/<title>(.*?)<\/title>/i);
  var title = titleMatch ? htmlText(titleMatch[1]).replace(/ - MoviezWap.*/i, '') : 'Movie';

  var episodes = [];
  var re = /href=['"]([^'"]*(?:download|dwload)\.php[^'"]*)['"][^>]*>(.*?)<\/a>/gi;
  var m;
  var count = 1;
  while ((m = re.exec(html)) !== null) {
    var dlPath = m[1].replace('dwload.php', 'download.php');
    var optTitle = htmlText(m[2]) || ('Quality ' + count);
    episodes.push({
      id: dlPath,
      number: count++,
      title: optTitle,
      url: dlPath
    });
  }

  return {
    id: idOrUrl,
    title: title,
    episodes: episodes
  };
}

async function getVideoSources(episodeIdOrUrl) {
  var url = absUrl(episodeIdOrUrl, BASE_URL);
  var res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Referer': BASE_URL + '/' } });
  var html = (res && res.body) || '';
  var sources = [];

  var re = /href=['"]([^'"]*\.mp4[^'"]*)['"]/gi;
  var m;
  while ((m = re.exec(html)) !== null) {
    var streamUrl = m[1];
    var qMatch = streamUrl.match(/(\d{3,4}p)/i) || url.match(/(\d{3,4}p)/i);
    var quality = qMatch ? qMatch[1].toLowerCase() : '720p';
    sources.push({
      url: streamUrl,
      quality: quality,
      container: 'mp4',
      isDirect: true,
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': BASE_URL + '/'
      }
    });
  }

  return sources;
}

async function scrape(media) {
  try {
    var rawTitle = (media && media.title) || '';
    var title = rawTitle
      .replace(/\s+s\d+e\d+.*$/i, '')
      .replace(/\s+season\s*\d+.*$/i, '')
      .trim() || rawTitle;

    console.log('[MoviezWap][scrape] Starting scrape for title="' + title + '"');
    if (!title) return [];

    var searchResults = await search(title, 1);
    if (!searchResults || !searchResults.length) {
      console.warn('[MoviezWap][scrape] 0 search results for "' + title + '"');
      return [];
    }

    var card = searchResults[0];
    var movieUrl = card.url || card.id;
    console.log('[MoviezWap][scrape] Top matched: "' + (card.title || '') + '"');

    var detail = await getDetail(movieUrl);
    var episodes = (detail && detail.episodes) || [];
    if (!episodes.length) {
      console.warn('[MoviezWap][scrape] 0 episode/download options found');
      return [];
    }

    // Pick top quality download option (usually 720p or highest available)
    var targetEp = episodes[episodes.length - 1] || episodes[0];
    var sources = await getVideoSources(targetEp.url || targetEp.id);
    console.log('[MoviezWap][scrape] Extracted ' + (sources ? sources.length : 0) + ' stream(s)');
    return sources || [];
  } catch (e) {
    console.error('[MoviezWap][scrape] Error: ' + (e && e.stack || e));
    return [];
  }
}
