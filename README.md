# Signal Forge — GitHub Pages Edition

Signal Forge is a browser-based experimental image/video effects workstation.

## GitHub Pages deployment

1. Create a new GitHub repository (for example `signal-forge`).
2. Upload every file in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)` folder, then save.
6. GitHub will provide the public site URL after deployment finishes.

No build step is required.

## Depth Map

Depth Map uses Depth Anything V2 Small through Transformers.js. On first use, the browser downloads the model. Inference then runs in the browser using WebGPU when available and WASM as a fallback. The model may be hundreds of MB depending on cached runtime/model assets, so the first depth use is slower than the other effects.

## Browser notes

- Chrome/Edge are recommended for WebGPU and video support.
- MP4/H.264 and WebM are the safest video input formats.
- Safari/browser codec support varies.
- The browser edition records effected video as WebM using `MediaRecorder`.
- All normal canvas effects run fully client-side.

## Local test

Because the Depth model uses JavaScript modules, serve the folder over HTTP instead of double-clicking `index.html`:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.
