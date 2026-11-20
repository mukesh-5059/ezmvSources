// Internet Archive — Classic and historical movies repository (worldwide public-domain / archive.org)

var SOURCE_ID = (typeof __SOURCE_ID !== 'undefined' && __SOURCE_ID)
  ? String(__SOURCE_ID) : 'archiveorg';

var IA_BASE = 'https://archive.org';
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function getInfo() {
  return {
    id: 'archiveorg',
    name: 'Internet Archive (Classic Movies)',
    lang: 'en',
    baseUrl: IA_BASE,
    logo: IA_BASE + '/images/glogo.png',
    type: 'movie',
    version: '1.0.0'
  };
}

async function search(query, page) {
  var q = String(query || '').trim();
  if (!q) return [];
  var cleanQ = q.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  var p = page || 1;
  var rows = 20;
  var searchQuery = 'title:(' + cleanQ + ') AND mediatype:(movies) AND -title:(Trailer)';
  var url = IA_BASE + '/advancedsearch.php?q=' + encodeURIComponent(searchQuery) +
    '&fl[]=identifier,title,year,downloads&sort[]=downloads+desc&rows=' + rows + '&page=' + p + '&output=json';

  var res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Referer': IA_BASE + '/' } });
  var j = {};
  try { j = JSON.parse(res.body || '{}'); } catch (e) {}
  var docs = (j.response && j.response.docs) || [];
  var results = [];
  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    var title = doc.title || doc.identifier;
    if (doc.year) title += ' (' + doc.year + ')';
    results.push({
      id: doc.identifier,
      title: title,
      url: doc.identifier
    });
  }
  return results;
}

async function getDetail(idOrUrl) {
  var id = String(idOrUrl || '').replace(/^https?:\/\/[^\/]+\/(details|download)\//, '').split('/')[0];
  var metaUrl = IA_BASE + '/metadata/' + encodeURIComponent(id);
  var res = await fetch(metaUrl, { headers: { 'User-Agent': USER_AGENT, 'Referer': IA_BASE + '/' } });
  var data = {};
  try { data = JSON.parse(res.body || '{}'); } catch (e) {}
  var meta = data.metadata || {};
  var title = meta.title || id;
  var files = data.files || [];

  var videoFiles = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var name = f.name || '';
    if (/\.(mp4|mkv|webm|m4v|mov|ogv|avi)$/i.test(name)) {
      videoFiles.push(f);
    }
  }

  // Sort by size desc (best quality first)
  videoFiles.sort(function(a, b) { return (Number(b.size) || 0) - (Number(a.size) || 0); });

  var episodes = [];
  for (var k = 0; k < videoFiles.length; k++) {
    var vf = videoFiles[k];
    var height = vf.height ? (vf.height + 'p') : 'HD';
    var sizeMB = vf.size ? Math.round(Number(vf.size) / (1024 * 1024)) + ' MB' : '';
    var epTitle = height + (sizeMB ? (' (' + sizeMB + ')') : '') + ' - ' + vf.name;
    episodes.push({
      id: id + '/' + vf.name,
      number: k + 1,
      title: epTitle,
      url: id + '/' + vf.name
    });
  }

  return {
    id: id,
    title: title,
    episodes: episodes
  };
}

async function getVideoSources(episodeIdOrUrl) {
  var parts = String(episodeIdOrUrl || '').split('/');
  var id = parts[0];
  var fileName = parts.slice(1).join('/');
  if (!fileName) return [];

  var streamUrl = IA_BASE + '/download/' + encodeURIComponent(id) + '/' + encodeURIComponent(fileName);
  var qMatch = fileName.match(/(\d{3,4})[pP]/);
  var quality = qMatch ? qMatch[1] + 'p' : '720p';

  return [{
    url: streamUrl,
    quality: quality,
    container: fileName.split('.').pop().toLowerCase(),
    isDirect: true,
    headers: {
      'User-Agent': USER_AGENT,
      'Referer': IA_BASE + '/'
    }
  }];
}

async function scrape(media) {
  try {
    var rawTitle = (media && media.title) || '';
    var title = rawTitle.replace(/\s+s\d+e\d+.*$/i, '').replace(/\s+season\s*\d+.*$/i, '').trim() || rawTitle;
    var year = (media && media.year);
    var query = title;
    if (year) query += ' ' + year;

    console.log('[InternetArchive][scrape] Searching for: ' + query);
    var results = await search(query, 1);
    if (!results || !results.length) {
      if (year) results = await search(title, 1);
    }
    if (!results || !results.length) {
      console.warn('[InternetArchive][scrape] 0 results found');
      return [];
    }

    for (var r = 0; r < Math.min(results.length, 5); r++) {
      var detail = await getDetail(results[r].url);
      if (detail && detail.episodes && detail.episodes.length) {
        var sources = await getVideoSources(detail.episodes[0].url);
        if (sources && sources.length) {
          console.log('[InternetArchive][scrape] Extracted ' + sources.length + ' stream(s) from "' + detail.title + '"');
          return sources;
        }
      }
    }

    console.warn('[InternetArchive][scrape] 0 video files found in top search items');
    return [];
  } catch (e) {
    console.error('[InternetArchive][scrape] Error: ' + (e && e.stack || e));
    return [];
  }
}
