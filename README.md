# Telegram Rich Copy

A static, no-backend browser tool for copying semantic HTML messages as rich-text clipboard content into Telegram's Rich Text Editor.

## Everyday use

1. In ChatGPT Android, request a **semantic HTML fragment in exactly one HTML code block**, and copy that code block's source.
2. Open this website in Chrome on Android, tap **Paste from clipboard** (or paste into the source field), and check the preview.
3. Tap **Copy formatted message**, then paste into Telegram's Rich Text Editor.

The website does not send message text to a server. It processes content in memory in your browser. The website itself is distributed publicly through GitHub Pages. GitHub's hosting infrastructure receives ordinary visit metadata; please avoid entering secrets and review links before following them.

## Testing

Use the built-in **Short**, **Advanced** and **Reference** examples. After copying each, inspect the first pasted result in Telegram Saved Messages. Test nested collapsibles by closing and reopening them. Compare a ChatGPT-generated HTML message separately; copying browser-rendered rich text may behave differently across Android, Telegram, and browser versions.

## Deployment

Publish the repository's `main` branch `/ (root)` using **Settings → Pages → Deploy from a branch**. No build or server is required. `index.html` is the entry point; relative paths allow use under `/<repository>/`.

## Limits

This is a companion site, **not** a replacement for the official ChatGPT Android app's Copy button. It adds a browser step, and cannot guarantee all clipboard features on every device. It is also not a Telegram bot and never sends messages on your behalf.