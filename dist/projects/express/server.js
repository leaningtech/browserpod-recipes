const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);

app.get('/', (_req, res) => {
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Express on BrowserPod</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        background: #fbf5eb;
        color: #2c2219;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top left, rgba(201, 106, 43, 0.22), transparent 35%),
          linear-gradient(180deg, #fffaf4 0%, #f4ead8 100%);
      }

      .card {
        width: min(92vw, 42rem);
        padding: 2rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(44, 34, 25, 0.1);
        background: rgba(255, 255, 255, 0.86);
        box-shadow: 0 22px 40px rgba(44, 34, 25, 0.12);
      }

      .eyebrow {
        margin: 0 0 0.75rem;
        color: #99511f;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 6vw, 3.4rem);
        line-height: 1;
      }

      p {
        margin: 1rem 0 0;
        color: #6a5949;
        line-height: 1.7;
      }

      code {
        font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
        color: #99511f;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">Express recipe</p>
      <h1>Hello from BrowserPod</h1>
      <p>
        This HTML was served by an Express process listening on
        <code>localhost:${port}</code> entirely inside the browser.
      </p>
    </main>
  </body>
</html>`);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Express hello world listening on http://0.0.0.0:${port}`);
});
