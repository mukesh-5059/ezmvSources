# ezmvSources

Unified sources repository for EzMV, containing Stremio addons and client-side JavaScript scrapers.

## Structure

```
ezmvSources/
├── sources.json       # Central manifest listing active Stremio addons and JS extractors
├── router.js          # Dynamic route matcher and sequential batch planner
├── hianime.js         # HiAnime (Anime, EzMV standard interface)
├── gogo.js            # AniGoGo (Anime, EzMV standard interface)
├── anikoto.js         # AniKoto (Anime, EzMV standard interface)
├── animecube.js       # AnimeCube (Donghua / Anime, EzMV standard interface)
├── hdhub.js           # HDHub4u (Movies/Series, EzMV standard interface)
├── 4khdhub.js         # 4K HDHub (4K Movies/Series, EzMV standard interface)
├── archiveorg.js      # Internet Archive (Classic Movies, EzMV standard interface)
├── supercartoons.js   # SuperCartoons (Vintage Cartoons, EzMV standard interface)
├── moviezwap.js       # MoviezWap (Regional, Disabled)
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

### 2. Standard Scraper Execution Contract

EzMV delegates all UI metadata (posters, descriptions, cast, ratings, and episode lists) to TMDB natively in the client. **The app never queries scrapers for metadata.**

The **only** function invoked by the EzMV Dart orchestrator is `scrape(media)`:

```
┌────────────────────────────────────────────────────────┐
│                   EzMV Scraper Model                   │
│                                                        │
│  scrape(media)  ───────>  Promise<Array<StreamSource>> │
│                                                        │
│  (Internal steps: search -> match ep -> parse streams) │
└────────────────────────────────────────────────────────┘
```

#### The `scrape(media)` Entrypoint
- **Input Parameter (`media`)**:
  ```json
  {
    "title": "Solo Leveling",
    "year": 2024,
    "mediaType": "tv",
    "season": 1,
    "episode": 1
  }
  ```
- **Return Value**: `Promise<Array<StreamSource>>`
  ```json
  [
    {
      "url": "https://stream.example.com/master.m3u8",
      "quality": "1080p",
      "headers": {
        "Referer": "https://player.example.com/"
      },
      "size": "1.4 GB",
      "subtitles": [
        {
          "title": "English",
          "url": "https://example.com/sub_en.vtt"
        }
      ]
    }
  ]
  ```

#### Internal Helper Pipeline
Inside each scraper, modular helper functions (`search()`, `getDetail()`, `getVideoSources()`) are purely internal steps to resolve the final video links. They are stripped of all metadata/poster loops and only parse URLs needed to extract playback streams.

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

---

## 5-Tier Batch Architecture

Sources are organized across 5 execution tiers managed by `router.js`:

| Batch | Focus | Sources Included |
| :---: | :--- | :--- |
| **1** | Anime Primary (Fast HLS) | `hianime` (P1), `gogo` (P2) |
| **2** | Anime Secondary / Donghua | `animes_addon` (P1), `anikoto` (P1), `animecube` (P2) |
| **3** | Movies & TV Primary (Direct HubCloud/Addon) | `hdhub_addon` (P1), `4khdhub` (P1), `hdhub_scraper` (P2) |
| **4** | Movies & TV Secondary (Debrid / Aggregators) | `penguplay` (P1), `notorrent` (P2) |
| **5** | Heavy Aggregators & Archives | `plaviohd` (P1), `archiveorg` (P2), `supercartoons` (P3), `moviezwap` (Disabled) |

### Routing Behavior
- **Anime**: Batches 1 & 2 run first. Once qualified streams are returned, the orchestrator terminates immediately, preventing HDHub from ever being called.
- **Movies / Series**: The router filters out anime sources beforehand. The surviving batches are dynamically re-indexed to `1..N`, executing Batch 3 sources immediately as Batch 1 without waiting for empty anime passes.
