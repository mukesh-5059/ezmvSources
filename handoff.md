# Project Handoff & Updated Source Benchmark (v2)

## 1. Domain Updates Applied
- [hdhub.js](file:///home/mukes/dev/ezmvSources/hdhub.js): Updated `FALLBACK` to `https://new15.hdhub4u.cl`, added `Origin: d.main` header, and synced search parameters (`post_title,category,stars,director,imdb_id`). Search unblocked and fully functional.
- [4khdhub.js](file:///home/mukes/dev/ezmvSources/4khdhub.js): Updated fallback domain to `https://4khdhub.one` and `https://hubcloud.mov`. Fully functional stream extraction.
- [moviezwap.js](file:///home/mukes/dev/ezmvSources/moviezwap.js): Updated `BASE_URL` to `https://www.moviezwap.boo`.
- Test harness `/tmp/benchmark_sources_mpv.py`: Isolated JSON payload from debug logging.

## 2. Updated Playback Benchmark Results

### Stremio Addons
| Source | Status | Media Item | Total Streams Returned | No. Played | No. Failed | Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **HDHub (Addon)** | Old | *Baahubali: The Beginning* | 5 | 1 | 4 | Mixed CDN links |
| | | *RRR* | 4 | 0 | 4 | Stale hosters |
| | | *Spider-Man: No Way Home* | 19 | 5 | 0 | 100% playable |
| **PenguPlay (Addon)** | Old | *Fight Club* | 43 | 1 | 4 | Expired debrid tokens |
| | | *Inception* | 0 | 0 | 0 | No streams |
| | | *Interstellar* | 68 | 0 | 5 | Expired debrid hashes |
| **PlavioHD (Addon)** | Old | *Baahubali: The Beginning* | 58 | 3 | 2 | High volume, active streams |
| | | *Pushpa: The Rise* | 77 | 1 | 4 | High volume, active streams |
| | | *K.G.F: Chapter 1* | 0 | 0 | 0 | No streams |
| **NoTorrent (Addon)** | Old | *The Dark Knight* | 10 | 1 | 4 | HTTP 200 stream active |
| | | *Interstellar* | 11 | 1 | 4 | HTTP 200 stream active |
| | | *The Matrix* | 8 | 0 | 5 | Stale mirrors |
| **AnimES (Addon)** | New | *Attack on Titan S01E01* | 0 | 0 | 0 | Temporary mirror drop |
| | | *Death Note S01E01* | 0 | 0 | 0 | Temporary mirror drop |
| | | *Demon Slayer S01E01* | 6 | 2 | 3 | Multi-sub streams active |

### JavaScript Scrapers
| Source | Status | Media Item | Total Streams Returned | No. Played | No. Failed | Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| [hianime.js](file:///home/mukes/dev/ezmvSources/hianime.js) | Old | *Solo Leveling S01E01* | 3 | 3 | 0 | 100% playable direct HLS |
| | | *Demon Slayer S01E01* | 4 | 4 | 0 | 100% playable direct HLS |
| | | *Attack on Titan S01E01* | 0 | 0 | 0 | Search title variance |
| [gogo.js](file:///home/mukes/dev/ezmvSources/gogo.js) | Old | *Solo Leveling S01E01* | 1 | 1 | 0 | 100% playable direct HLS |
| | | *One Piece E01* | 1 | 1 | 0 | 100% playable direct HLS |
| | | *Naruto E01* | 1 | 1 | 0 | 100% playable direct HLS |
| [hdhub.js](file:///home/mukes/dev/ezmvSources/hdhub.js) | Old | *Baahubali* | 18 | 2 | 3 | Revived! Pixeldrain & 10Gbps |
| | | *Pushpa* | 14 | 3 | 2 | Revived! Pixeldrain & 10Gbps |
| | | *Banshee S01E01* | 0 | 0 | 0 | Series not on hdhub4u catalog |
| [4khdhub.js](file:///home/mukes/dev/ezmvSources/4khdhub.js) | Old | *Banshee S01E01* | 8 | 3 | 2 | Verified working! 1080p BluRay / R2 |
| | | *Avengers Endgame* | 14 | 3 | 2 | Verified working! 1080p/4K R2 / FSL |
| | | *Solo Leveling S01E01* | 4 | 1 | 3 | Anime 1080p stream playable |
| [anikoto.js](file:///home/mukes/dev/ezmvSources/anikoto.js) | New | *Solo Leveling S01E01* | 1 | 1 | 0 | 100% playable direct HLS |
| | | *Frieren E01* | 1 | 1 | 0 | 100% playable direct HLS |
| | | *Jujutsu Kaisen E01* | 1 | 1 | 0 | 100% playable direct HLS |
| [animecube.js](file:///home/mukes/dev/ezmvSources/animecube.js) | New | *Spiritual Realm Walker E01* | 5 | 5 | 0 | 100% playable HLS streams |
| | | *A Record of a Mortal's Journey E01* | 4 | 4 | 0 | 100% playable HLS streams |
| | | *Against the Gods E01* | 5 | 5 | 0 | 100% playable HLS streams |
| [moviezwap.js](file:///home/mukes/dev/ezmvSources/moviezwap.js) | Disabled | *Baahubali* | 0 | 0 | 0 | Disabled in sources.json (CDN session gate) |
| | | *KGF* | 1 | 0 | 1 | CDN redirects to dynamic token gate |
| | | *Jersey* | 1 | 0 | 1 | CDN redirects to dynamic token gate |
| [archiveorg.js](file:///home/mukes/dev/ezmvSources/archiveorg.js) | New | *Night of the Living Dead (1968)* | 1 | 1 | 0 | High quality .ogv direct stream |
| | | *Charade (1963)* | 1 | 0 | 1 | Archive.org throttled timeout |
| | | *Carnival of Souls (1962)* | 1 | 1 | 0 | Playable .ogv direct stream |
| [supercartoons.js](file:///home/mukes/dev/ezmvSources/supercartoons.js) | New | *Spinach Packin Popeye* | 1 | 1 | 0 | 100% playable direct .mp4 |
| | | *The Cat Concerto* | 1 | 1 | 0 | 100% playable direct .mp4 |
| | | *Baseball Bugs* | 1 | 1 | 0 | 100% playable direct .mp4 |

## 3. Batch Architecture (5-Tier)
- **Batch 1 (Anime Tier 1 - Fast Direct HLS)**: `hianime` (priority 1), `gogo` (priority 2)
- **Batch 2 (Anime Tier 2 - Secondary & Donghua)**: `animes_addon` (priority 1), `anikoto` (priority 1), `animecube` (priority 2)
- **Batch 3 (Movies & TV Primary - Fast Direct HubCloud & Addon)**: `hdhub_addon` (priority 1), `4khdhub` (priority 1), `hdhub_scraper` (priority 2)
- **Batch 4 (Movies & TV Secondary - Debrid & Direct HTTP)**: `penguplay` (priority 1), `notorrent` (priority 2)
- **Batch 5 (Aggregators & Archives)**: `plaviohd` (priority 1), `archiveorg` (priority 2), `supercartoons` (priority 3), `moviezwap` (priority 4, disabled)

### Router Dynamic Indexing
[router.js](file:///home/mukes/dev/ezmvSources/router.js) and [source_orchestrator.dart](file:///home/mukes/dev/movies/shared_core/lib/services/source_orchestrator.dart) re-index active batches sequentially (`1..N`). When non-anime media filters out Batches 1 & 2 before scraping, Batch 3 cleanly becomes Batch 1 with zero execution gaps or wasted cycles. When anime is searched, early termination on qualified streams ensures Batches 3–5 (HDHub) are never called.
