# Wastebasket

A writing app for drafting, not editing.

No spell check, no grammar check, no AI, no formatting. You cannot even make
something bold. That is on purpose — it is somewhere to get the words down, and
then you take them somewhere else.

**[Use it →](https://verdi.github.io/Wastebasket/)**

## How it works

Everything you type is saved by your browser, on your device, in `localStorage`.
There is no account, no server, and no storage backend to have one. Nothing you
write is ever uploaded, because there is nowhere for it to go.

That also means your drafts are tied to the browser you wrote them in. Use the
copy button, or save a file, if you want them anywhere else.

It works offline. A service worker caches the app so a plane or a bad hotel
connection does not stop you.

## Running it yourself

There is no build step. It is HTML, CSS and one JavaScript file.

```bash
git clone https://github.com/Verdi/Wastebasket.git
cd Wastebasket
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

A plain file open (`file://`) mostly works, but the service worker will not
register, so offline support and installing it as an app both need a real
server.

## Layout

| | |
|---|---|
| `index.html`, `wastebasket-app.js`, `wastebasket-styles.css` | the app |
| `settings/` | the settings screen |
| `wtf/` | what it is and how to use it |
| `service-worker.js` | offline caching |
| `manifest.json` | so it can be installed like an app |

**A note on the service worker**, since it is the one place this repo has been
bitten. It is network-first for pages: a page is fetched fresh whenever there is
a connection, and the cache is only the fallback. An earlier version was
cache-first over `/` and `/index.html` with no revalidation, which meant every
returning visitor kept the version they first saw and nothing shipped afterwards
ever reached them. Nobody noticed for months. If you fork this, do not put that
back. Bump `CACHE_VERSION` to discard everything cached.

## License

[AGPL-3.0](LICENSE). You can read it, change it, and build on it — as long as
what you build carries the same license.

## Contact

<hello@michaelverdi.com>
