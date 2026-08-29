# Fixtures / Record-Replay

## Rule

CI and normal development must never call live SerpApi.

## Workflow

1. Deliberately execute a small number of live representative searches.
2. Save:
   - canonical request;
   - SerpApi `search_metadata.id`;
   - raw JSON;
   - normalized `SearchResponse`;
   - timestamp.
3. Name fixture by request SHA-256.
4. Use `ReplaySearchProvider` in tests.

## Required fixture scenarios

- new valid provider deal;
- irrelevant AI-news result;
- duplicate URLs;
- same event from multiple publications;
- known provider quota change;
- old promo resurfacing;
- snippet conflicts with official page;
- newly discovered provider that requires targeted `site:` source search;
- zero-results search;
- SerpApi error response.

## Archive

For the first 31 days after a live call, Search Archive can retrieve the completed search by `search_metadata.id`. Store raw fixtures locally/repo so tests remain reproducible after that retention window.
