# Wiki Article Indexing Control

The wiki articles are now crawlable with individual URLs, but indexing is controlled by `wiki-index-config.json`.

## Default State

By default, **NO wiki articles are indexed**. Each article page includes `<meta name="robots" content="noindex">` and is excluded from `sitemap.xml`. This allows search engines to crawl the content (which is required for noindex to work) without indexing it.

## Configuration

Edit `wiki-index-config.json`:

```json
{
  "globalIndexing": false,
  "allowIndexing": []
}
```

### Options

1. **Global indexing (not recommended while content is being reviewed):**
   ```json
   {
     "globalIndexing": true,
     "allowIndexing": []
   }
   ```
   All articles will be indexed.

2. **Per-article allowlist (recommended):**
   ```json
   {
     "globalIndexing": false,
     "allowIndexing": [
       "start-welcome",
       "start-whyacomputer",
       "physics-airframe"
     ]
   }
   ```
   Only the listed article IDs will be indexed. Find article IDs in `src/wiki/articles.js`.

## Build Process

After changing `wiki-index-config.json`, rebuild:

```bash
npm run build
```

This regenerates:
- All wiki article HTML pages with correct `<meta name="robots">` tags
- `sitemap.xml` with only indexed articles included

## Article URLs

Articles are available at `/wiki/<article-id>/`, for example:
- https://webfpv.org/wiki/start-welcome/
- https://webfpv.org/wiki/physics-airframe/
- https://webfpv.org/wiki/control-pid/

These are the crawlers' copies: the article's text, and no figure, rail or search. A reader's address for an article is still `/wiki/#wiki/<id>`, which the interactive wiki opens in place, and each copy ends with a link to it.

Nothing sends a reader to a copy. `src/wiki/boot.js` once redirected every `#wiki/<id>` to its copy, and because going Back or Forward between two articles fires `hashchange`, the Back button took the reader to the plain copy of every article they went back to. A crawler never sees a fragment, so a redirect from one does nothing for indexing; the copies are canonical by their own `<link rel="canonical">` and the sitemap.

## Adding Articles to Index

1. Review the article content in the interactive wiki at https://webfpv.org/wiki/
2. If the content is accurate and ready, add its ID to `allowIndexing` in `wiki-index-config.json`
3. Run `npm run build`
4. Commit and push the changes

The article will:
- Drop its `<meta name="robots" content="noindex">` tag
- Be added to `sitemap.xml`
- Be indexed by search engines on their next crawl
