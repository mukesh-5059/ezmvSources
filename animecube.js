// AnimeCube — Donghua (Chinese animation) source. Site: https://animecube.live
//
// Next.js App Router site: listings come from the server-rendered RSC payload
// (no clean list API) + the sitemap for search; episode streams come from a
// plaintext JSON API (`/api/anime/<slug>/episode/<epSlug>/sources`) that returns
// `{platform, videoId, privateId}` for Dailymotion (the primary host) / Rumble.
// Both resolve to a plain HLS m3u8: Dailymotion via its GEO endpoint with the
// animecube embedder + the privateId; Rumble via its embedJS API. Chinese audio
// + subs only — there is no dub on this site.

var SOURCE_ID = (typeof __SOURCE_ID !== 'undefined' && __SOURCE_ID)
  ? String(__SOURCE_ID) : 'animecube';

var SITE = 'https://animecube.live';
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function getInfo() {
  return { name: 'AnimeCube', lang: 'zh', baseUrl: SITE,
    logo: SITE + '/favicon.ico', type: 'anime', version: '1.0.5' };
}

function _get(url, ref) {
  return fetch(url, { headers: { 'User-Agent': UA, 'Referer': ref || SITE + '/' } })
    .then(function (r) { return r.body || ''; }).catch(function () { return ''; });
}
function _json(url, ref) {
  return _get(url, ref).then(function (b) {
    try { return JSON.parse(b); } catch (e) { return null; }
  });
}

// ── RSC helpers ──────────────────────────────────────────────────────────────
// The page data lives in `self.__next_f.push([1,"<escaped>"])` script chunks.
// Concatenate them and lightly un-escape so the embedded JSON can be regex-mined.
function _rsc(html) {
  var parts = [];
  var re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  var m;
  while ((m = re.exec(html)) !== null) parts.push(m[1]);
  var s = parts.join('');
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function _titleFromSlug(s) {
  return String(s).replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

// Search: sitemap lists every title, substring-match the query against slugs.
var _sitemap = null;
function _slugs() {
  if (_sitemap) return Promise.resolve(_sitemap);
  return _get(SITE + '/sitemap.xml').then(function (xml) {
    var slugs = [], seen = {}, re = /\/anime\/([a-z0-9\-]+)/g, m;
    while ((m = re.exec(xml)) !== null) { if (!seen[m[1]]) { seen[m[1]] = 1; slugs.push(m[1]); } }
    _sitemap = slugs;
    return slugs;
  }).catch(function () { return []; });
}

function search(query, page, opts) {
  var q = String(query || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!q) return Promise.resolve([]);
  var toks = q.split(' ');
  return _slugs().then(function (slugs) {
    var hits = slugs.filter(function (s) {
      var hay = s.replace(/-/g, ' ');
      for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) === -1) return false;
      return true;
    });
    return hits.slice(0, 30).map(function (s) {
      return { id: s, title: _titleFromSlug(s), url: s };
    });
  });
}

// ── Detail + episodes ────────────────────────────────────────────────────────
function getDetail(url, opts) {
  var slug = String(url);
  return _get(SITE + '/anime/' + encodeURIComponent(slug)).then(function (html) {
    var rsc = _rsc(html);
    var seen = {}, eps = [];
    var re = new RegExp('"(' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-tab-(\\d+)-ep-(\\d+))"', 'g');
    var m;
    while ((m = re.exec(rsc)) !== null) {
      if (seen[m[1]]) continue;
      seen[m[1]] = 1;
      eps.push({ epSlug: m[1], tab: parseInt(m[2], 10), ep: parseInt(m[3], 10) });
    }
    eps.sort(function (a, b) { return a.tab - b.tab || a.ep - b.ep; });
    var episodes = [];
    for (var k = 0; k < eps.length; k++) {
      var n = k + 1;
      episodes.push({
        id: eps[k].epSlug,
        number: n,
        title: 'Episode ' + n,
        url: 'animecube://' + slug + '|' + eps[k].epSlug
      });
    }

    return {
      id: slug,
      title: _titleFromSlug(slug),
      url: slug,
      episodes: episodes
    };
  });
}

function getEpisodes(url, opts) {
  return getDetail(url, opts).then(function (d) { return d.episodes; });
}

// ── Streams ──────────────────────────────────────────────────────────────────
function getVideoSources(episodeUrl) {
  var raw = String(episodeUrl).replace('animecube://', '');
  var cut = raw.indexOf('|');
  if (cut < 0) return Promise.reject(new Error('AnimeCube: bad episode url'));
  var slug = raw.slice(0, cut);
  var epSlug = raw.slice(cut + 1);
  var tm = epSlug.match(/-tab-(\d+)-ep-(\d+)/);
  if (!tm) return Promise.reject(new Error('AnimeCube: bad episode slug'));
  var seasonId = 'tab-' + tm[1];

  // The per-season `v=` token rotates; it lives in the (plaintext) versions map.
  return _json(SITE + '/api/anime-sources-versions', SITE + '/anime/' + slug).then(function (reg) {
    var by = (reg && reg.bySeason && reg.bySeason[slug]) || {};
    var primaryId = null, token = null;
    for (var p in by) { if (by[p] && by[p][seasonId]) { primaryId = p; token = by[p][seasonId]; break; } }
    if (!token) throw new Error('AnimeCube: no version token');
    var su = SITE + '/api/anime/' + slug + '/episode/' + epSlug + '/sources'
      + '?v=' + encodeURIComponent(token)
      + '&primaryTabId=' + encodeURIComponent(primaryId)
      + '&seasonId=' + encodeURIComponent(seasonId);
    return _json(su, SITE + '/anime/' + slug).then(function (j) {
      var list = (j && j.sources) || [];
      var jobs = [];
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (!s || !s.platform) continue;
        if (s.platform === 'dailymotion' && (s.privateId || s.videoId)) {
          // Dailymotion videos are embed-restricted to animecube.live; the geo
          // endpoint serves the HLS manifest when the matching `embedder` is set.
          jobs.push(_dailymotion(s.privateId || s.videoId, s.quality, slug));
        } else if (s.platform === 'rumble' && s.videoId) {
          jobs.push(_rumble(s.videoId, s.quality));
        }
      }
      return Promise.all(jobs).then(function (arrs) {
        var out = [];
        for (var a = 0; a < arrs.length; a++) if (arrs[a] && arrs[a].length) out = out.concat(arrs[a]);
        if (!out.length) throw new Error('AnimeCube: no playable sources');
        return out;
      });
    });
  });
}

// Dailymotion: the site's primary host. Videos are restricted to the
// animecube.live embedder, so the public metadata API 403s (DM010); the GEO
// endpoint with the matching `embedder` returns the HLS manifest. Use the
// `privateId` (the embed key) as the video id.
function _dailymotion(privateId, quality, slug) {
  if (!privateId) return Promise.resolve([]);
  var u = 'https://geo.dailymotion.com/video/' + encodeURIComponent(privateId)
    + '.json?legacy=true&embedder=' + encodeURIComponent(SITE + '/anime/' + slug);
  var dmRef = 'https://geo.dailymotion.com/';
  var hdr = { 'User-Agent': UA, 'Referer': dmRef };
  return _json(u, dmRef).then(function (j) {
    if (!j || j.error) return [];
    var ql = j.qualities || {};
    var master = ql.auto && ql.auto[0] && ql.auto[0].url;
    if (!master) return [];
    // The player (libmpv) cannot open Dailymotion's MASTER playlist: it carries
    // a cross-host subtitle group (www.dailymotion.com) + fMP4 variants, and the
    // open fails ("Failed to open"). So we fetch the master ourselves and return
    // each variant's media playlist DIRECTLY — a single host, no subtitle group,
    // the clean shape mpv plays reliably.
    //
    // Return up to 1080p as separate quality options (default = highest = 1080p;
    // the user can drop to 720p/480p in the player's quality menu). NOTE: these
    // are fMP4 HLS — mpv seeks them by reading sequentially (Dailymotion offers
    // no progressive-MP4 or TS variant), so a long forward seek buffers a while;
    // higher quality = more data per seek. We skip 1440/2160 (would default to
    // 4K — needlessly heavy for donghua) but keep 1080p as the user asked.
    return _get(master, dmRef).then(function (m3u8) {
      var lines = String(m3u8 || '').split('\n');
      var out = [];
      for (var i = 0; i < lines.length; i++) {
        var line = (lines[i] || '').trim();
        if (line.indexOf('#EXT-X-STREAM-INF') !== 0) continue;
        var nm = line.match(/NAME="?(\d{3,4})"?/);
        var res = line.match(/RESOLUTION=\d+x(\d+)/);
        var q = nm ? nm[1] : (res ? res[1] : '');
        var h = q ? parseInt(q, 10) : 0;
        if (h && h > 1080) continue; // skip 1440/2160 (would default to a 4K rendition)
        var vurl = ((lines[i + 1] || '').trim()).split('#')[0]; // drop #cell=… frag
        if (!vurl || vurl.charAt(0) === '#') continue;
        out.push({ url: vurl, quality: (q ? q + 'p' : (quality || 'auto')),
          container: 'hls', headers: hdr, kind: 'sub', audioLang: 'zh', subtitles: [] });
      }
      if (out.length) return out;
      // Master had no parseable variants — fall back to the master itself.
      return [{ url: master, quality: quality || 'auto', container: 'hls',
        headers: hdr, kind: 'sub', audioLang: 'zh', subtitles: [] }];
    }).catch(function () {
      return [{ url: master, quality: quality || 'auto', container: 'hls',
        headers: hdr, kind: 'sub', audioLang: 'zh', subtitles: [] }];
    });
  }).catch(function () { return []; });
}

function _rumble(videoId, quality) {
  var u = 'https://rumble.com/embedJS/u3/?request=video&ver=2&v=' + encodeURIComponent(videoId);
  return _json(u, SITE + '/').then(function (j) {
    var ua = (j && j.ua) || {};
    var out = [];
    var hdr = { 'User-Agent': UA, 'Referer': 'https://rumble.com/' };
    var hls = ua.hls && ua.hls.auto && ua.hls.auto.url;
    if (hls) out.push({ url: hls, quality: quality || 'auto', container: 'hls',
      headers: hdr, kind: 'sub', audioLang: 'zh', subtitles: [] });
    // Progressive mp4 renditions as a fallback / explicit qualities.
    var mp4 = ua.mp4 || {};
    for (var q in mp4) {
      var mu = mp4[q] && mp4[q].url;
      if (mu) out.push({ url: mu, quality: (/^\d+$/.test(q) ? q + 'p' : q), container: 'mp4',
        headers: hdr, kind: 'sub', audioLang: 'zh', subtitles: [] });
    }
    return out;
  }).catch(function () { return []; });
}


async function scrape(media) {
  try {
    var rawTitle = (media && media.title) || '';
    var title = rawTitle
      .replace(/\s+s\d+e\d+.*$/i, '')
      .replace(/\s+season\s*\d+.*$/i, '')
      .trim() || rawTitle;
    var episode = (media && media.episode) || 1;

    console.log('[AnimeCube][scrape] Starting scrape for title="' + title + '" ep=' + episode);
    if (!title) return [];

    var searchResults = await search(title, 1);
    if (!searchResults || !searchResults.length) {
      console.warn('[AnimeCube][scrape] 0 search results for "' + title + '"');
      return [];
    }

    var card = searchResults[0];
    var animeId = card.url || card.id;
    console.log('[AnimeCube][scrape] Top matched animeId="' + animeId + '" (' + (card.title || '') + ')');

    var itemDetail = await getDetail(animeId);
    var episodes = (itemDetail && itemDetail.episodes) || [];
    if (!episodes.length) {
      console.warn('[AnimeCube][scrape] 0 episodes found in details');
      return [];
    }

    var epTarget = null;
    for (var i = 0; i < episodes.length; i++) {
      var ep = episodes[i];
      if (ep.number == episode || (ep.id && String(ep.id).endsWith('ep-' + episode))) {
        epTarget = ep;
        break;
      }
    }
    if (!epTarget) epTarget = episodes[0];

    var sources = await getVideoSources(epTarget.url || epTarget.id);
    console.log('[AnimeCube][scrape] Extracted ' + (sources ? sources.length : 0) + ' stream(s)');
    return sources || [];
  } catch (e) {
    console.error('[AnimeCube][scrape] Error during scrape: ' + (e && e.stack || e));
    return [];
  }
}
