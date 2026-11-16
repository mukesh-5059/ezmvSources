# ezmvSources

Unified sources repository for EzMV, containing Stremio addons and client-side JavaScript scrapers.

## Structure

```
ezmvSources/
├── sources.json       # Central manifest listing active Stremio addons and JS extractors
├── router.js          # Dynamic route matcher and batch planner
├── hianime.js         # HiAnime (Anime, EzMV standard interface)
├── gogo.js            # AniGoGo (Anime, EzMV standard interface)
├── hdhub.js           # HDHub4u (Movies/Series, EzMV standard interface)
├── 4khdhub.js         # 4K HDHub (4K Movies/Series, EzMV standard interface)
└── README.md          # Standard Scraper Specification and Mapping
```

---

## EzMV Scraper Standard Specification

All client-side JavaScript scrapers in this repository conform to the **EzMV Standard Scraper Interface**. Scrapers execute inside a sandboxed JavaScript runtime (QuickJS / JavaScriptCore) on the client (Android Phone, Tablet, and Android TV).

### 1. Host Runtime Environment (Injected by Dart Host)

The host client environment injects the following global functions into the JS context:

| Global Function | Signature | Description |
| :--- | :--- | :--- |
| `fetch` | `fetch(url, options)` | Asynchronous HTTP client returning `Promise<{ ok: bool, status: int, headers: object, body: string }>`. Supports custom headers (`User-Agent`, `Referer`, `Cookie`) and bypasses browser CORS. |
| `base64ToBytes` | `base64ToBytes(str)` | Decodes a Base64 string into a `Uint8Array`. |
| `bytesToBase64` | `bytesToBase64(bytes)` | Encodes a `Uint8Array` into a Base64 string. |
| `absUrl` | `absUrl(relative, base)` | Resolves a relative URL against a base URL string. |
| `htmlText` | `htmlText(html)` | Strips HTML tags and unescapes standard HTML entities. |

---

### 2. Standard Scraper Function Mapping

Every scraper `.js` script must expose the following top-level asynchronous functions:

```
┌────────────────────────────────────────────────────────┐
│                   Scraper Pipeline                     │
│                                                        │
│  getInfo()               -> Provider metadata          │
│  search(query, page)     -> [{ id, title, url, ... }]  │
│  getDetail(idOrUrl)      -> { title, episodes: [...] } │
│  getVideoSources(epUrl)  -> [{ url, quality, ... }]    │
│  scrape(media)           -> Unified end-to-end stream  │
└────────────────────────────────────────────────────────┘
```

#### A. `getInfo()`
Returns metadata describing the scraper provider.
- **Returns**: `Object`
  ```json
  {
    "id": "gogo",
    "name": "AniGoGo",
    "lang": "en",
    "baseUrl": "https://animex.one",
    "logo": "https://animex.one/favicon.ico",
    "type": "anime",
    "version": "1.0.0"
  }
  ```

#### B. `search(query, page)`
Searches the provider's catalog.
- **Parameters**:
  - `query` (`string`): Movie/Series/Anime title to search.
  - `page` (`number`, optional): Page number (defaults to 1).
- **Returns**: `Promise<Array<SearchResult>>`
  ```json
  [
    {
      "id": "one-piece-p8k27",
      "title": "One Piece",
      "url": "one-piece-p8k27",
      "cover": "https://example.com/poster.jpg"
    }
  ]
  ```

#### C. `getDetail(idOrUrl)`
Retrieves metadata and episode listings for a given media item.
- **Parameters**:
  - `idOrUrl` (`string`): The identifier or URL returned from `search()`.
- **Returns**: `Promise<MediaDetail>`
  ```json
  {
    "id": "one-piece-p8k27",
    "title": "One Piece",
    "cover": "https://example.com/poster.jpg",
    "description": "Synopsis text...",
    "type": "anime",
    "episodes": [
      {
        "id": "one-piece-p8k27;1",
        "number": 1,
        "title": "Ep 1: I'm Luffy! The Man Who Will Become the Pirate King!",
        "url": "one-piece-p8k27;1"
      }
    ]
  }
  ```

#### D. `getVideoSources(episodeIdOrUrl)`
Resolves direct playable stream links and subtitle tracks for a specific episode.
- **Parameters**:
  - `episodeIdOrUrl` (`string`): Episode ID or target URL from `getDetail().episodes`.
- **Returns**: `Promise<Array<StreamSource>>`
  ```json
  [
    {
      "url": "https://example.com/master.m3u8",
      "quality": "1080p",
      "headers": {
        "Referer": "https://player.example.com/"
      },
      "subtitles": [
        {
          "title": "English",
          "url": "https://example.com/sub_en.vtt"
        }
      ]
    }
  ]
  ```

#### E. `scrape(media)`
High-level entrypoint invoked by the client media engine or batch router to resolve streams in one call.
- **Parameters**:
  - `media` (`Object`):
    - `title` (`string`): Media title.
    - `year` (`number`, optional): Release year.
    - `mediaType` (`string`): `'movie'` or `'tv'`.
    - `season` (`number`, optional): Season number (default 1).
    - `episode` (`number`, optional): Episode number (default 1).
- **Returns**: `Promise<Array<StreamSource>>`
  Returns an array of playable `StreamSource` objects mapped to EzMV `shared_core` models.

---

### 3. Upstream Origin Mappings

| Origin Repo | Origin Function | EzMV Standard Function |
| :--- | :--- | :--- |
| **Zangetsu** | `getInfo()` | `getInfo()` |
| **Zangetsu** | `search(query, page)` | `search(query, page)` |
| **Zangetsu** | `getDetail(url)` | `getDetail(idOrUrl)` |
| **Zangetsu** | `getVideoSources(url)` | `getVideoSources(episodeIdOrUrl)` |
| **Miru** | `search(kw, page)` | `search(query, page)` |
| **Miru** | `detail(url)` | `getDetail(idOrUrl)` *(alias `detail` retained for compatibility)* |
| **Miru** | `watch(url)` | `getVideoSources(episodeIdOrUrl)` *(alias `watch` retained for compatibility)* |
| **Miru** | `this.request(url, opt)` | `fetch(url, options)` |

---

## Adding a New Stremio Addon

Add an entry to `stremio_addons` in `sources.json`:

```json
{
  "id": "myaddon",
  "name": "My Stremio Addon",
  "manifest_url": "https://example.com/manifest.json",
  "enabled": true,
  "priority": 10,
  "match": {
    "media_types": ["movie", "tv"]
  }
}
```

## Adding a New JS Extractor

1. Place the `.js` script in this repository following the **EzMV Standard Scraper Specification** above.
2. Add an entry to `js_extractors` in `sources.json`:

```json
{
  "id": "myscraper",
  "name": "My Scraper",
  "script_url": "myscraper.js",
  "interface": "ezmv",
  "enabled": true,
  "priority": 5,
  "match": {
    "genres": ["anime"],
    "original_languages": ["ja"]
  }
}
```

## Match Filtering

The `match` object controls when a source is triggered:
- `media_types`: `["movie", "tv"]` (omitted = both)
- `genres`: e.g. `["anime"]` (triggered if movie has this genre)
- `original_languages`: e.g. `["ja"]` (triggered if `originalLanguage` matches)
- Empty or omitted `match`: Runs for all media.
