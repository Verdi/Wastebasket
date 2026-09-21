# Wastebasket

An app for drafting words, not editing them.

No spell check, no grammar check, no AI, no formatting. You can't even make something bold. That's on purpose. Wastebasket lets you get the words down first, and then you take them somewhere else to edit.

[Use it on the web](https://verdi.github.io/Wastebasket/)

**A Mac app is coming.** Same idea, except it can actually switch your Mac's network off while you write — Wi-Fi, Ethernet, all of it. Turn your laptop into an offline writing device, and back into your laptop when you're done. [wastebasket.app](https://wastebasket.app)

## How it works

Everything you type is saved by your browser, on your device, in `localStorage`. There is no account, no server, and no storage backend. Nothing you write is ever uploaded, because there is nowhere for it to go.

That also means your drafts are tied to the browser you wrote them in. Use the copy button, or save a file, if you want them anywhere else.

It works offline. A service worker caches the app so a plane or a bad hotel connection does not stop you.

## Running it yourself

Wastebasket is a web app so you can open in Safari and save it to your dock or open it in Chrome and install it. Either way adds the fully functional app to your device.

If you want to alter or extend Wastebasket:

```bash
git clone https://github.com/Verdi/Wastebasket.git
cd Wastebasket
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

A plain file open (`file://`) mostly works, but the service worker will not register, so offline support and installing it as an app both need a real server.

## Layout

| | |
|---|---|
| `index.html`, `wastebasket-app.js`, `wastebasket-styles.css` | the app |
| `settings/` | the settings screen |
| `wtf/` | what it is and how to use it |
| `service-worker.js` | offline caching |
| `manifest.json` | so it can be installed like an app |

## License

[AGPL-3.0](LICENSE). You can read it, change it, and build on it — as long as what you build carries the same license.

## Contact

<hello@michaelverdi.com>
