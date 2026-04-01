<script setup>
const highlights = [
  'Single-file Vue component rendered from a BrowserPod-hosted Vite server.',
  'Rollup and esbuild are overridden with their WASM implementations.',
  'The app is reachable through a BrowserPod portal instead of localhost on your machine.',
];
</script>

<template>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Vue recipe</p>
      <h1>Hello from BrowserPod</h1>
      <p class="lede">
        This Vue app is running through a dev server started inside the pod,
        then surfaced back into the browser through a portal URL.
      </p>
    </section>

    <section class="cards">
      <article v-for="item in highlights" :key="item" class="card">
        <h2>Why it works</h2>
        <p>{{ item }}</p>
      </article>
    </section>
  </main>
</template>
