# ezmvSources

Unified sources repository for EzMV, containing Stremio addons and client-side JavaScript scrapers.

## Structure

```
ezmvSources/
├── sources.json       # Central manifest listing active Stremio addons and JS extractors
├── hianime.js         # HiAnime (Anime, Zangetsu interface)
├── gogo.js            # AniGoGo (Anime, Miru interface)
├── hdhub.js           # HDHub4u (Movies/Series, Zangetsu interface)
├── 4khdhub.js         # 4K HDHub (4K Movies/Series, Zangetsu interface)
└── README.md
```

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

1. Place the `.js` script in this repository.
2. Add an entry to `js_extractors` in `sources.json`:

```json
{
  "id": "myscraper",
  "name": "My Scraper",
  "script_url": "myscraper.js",
  "interface": "zangetsu",
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
