const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);

app.get('/', (_req, res) => {
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello World</title>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>`);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Express listening on http://0.0.0.0:${port}`);
});
