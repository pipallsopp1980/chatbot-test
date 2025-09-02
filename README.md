# Chat with My Document (Free, No Server)
This is a static, client‑side RAG chatbot. It uses:
- [WebLLM](https://github.com/mlc-ai/web-llm) for in‑browser generation
- [transformers.js](https://github.com/xenova/transformers.js) for in‑browser embeddings
- `embeddings.json` you generate once from your document

## Files
- `index.html` — UI + script tags
- `app.js` — retrieval + lazy LLM loading (faster first load)
- `embeddings.json` — your document index (place in same folder)

## How to deploy on GitHub Pages
1. Create a new public repo and upload `index.html`, `app.js`, and `embeddings.json` to the root.
2. Repo **Settings → Pages → Build and deployment**: Source = `Deploy from a branch`.
3. Branch = `main`, Folder = `/ (root)`, Save.
4. Your site will be available at `https://USERNAME.github.io/REPO/`.

## Tips
- First load of the model can be large; use **Search‑only** for instant retrieval.
- Toggle **Upgrade to 3B** only if you need stronger answers.
- Subsequent visits are faster thanks to browser caching.
