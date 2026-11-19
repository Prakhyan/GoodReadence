# Working on GoodReadence

Start with [README](README.md) and the [documentation index](docs/README.md). Keep changes focused and preserve books, notes and progress already stored on a reader’s device.

1. Create a branch from `main` and run `npm run preview`.
2. Verify the affected flow on a narrow touch layout and a desktop layout, in light and dark appearances.
3. For document/storage changes, test a real import, persistence after reload and offline reopening. Never use personal documents in committed fixtures or screenshots.
4. Run the relevant checks in `scripts/`. Dependency changes must also update the locally served bundle and `vendor/PINS.json`; run `npm run check:vendor` and `npm run audit:security`.
5. Public-library additions must pass the [source and PDF checks](docs/PUBLIC-LIBRARY.md). Do not replace complete books with samples, invent ratings or duplicate titles to fill a genre.
6. Release changes update `release.json`, package versions, visible version labels, the update badge identifier and service-worker cache identifier together. Keep public notes short and version-based.

GitHub’s `main` branch is connected to the production Vercel project. A push to `main` publishes a release: verify the resulting deployment and live version before calling it complete.

Do not commit secrets, OAuth tokens, personal reading data, local research or generated print intermediates. Keep historical one-time tools in `scripts/archive/`.
