<script setup>
const items = [
  'Nuxt boots a full dev server inside BrowserPod and is exposed through a portal URL.',
  'The recipe adds wasm32-wasi OXC bindings so Nuxt can avoid native compiler assumptions.',
  'Rollup and esbuild are overridden with the BrowserPod-friendly WASM variants from the docs.',
];
</script>

<template>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Nuxt recipe</p>
      <h1>Hello from BrowserPod</h1>
      <p class="lede">
        This Nuxt app is being served from inside a BrowserPod instance, then
        piped back into the outer recipe runner through BrowserPod portals.
      </p>
    </section>

    <section class="cards">
      <article v-for="item in items" :key="item" class="card">
        <h2>Compatibility note</h2>
        <p>{{ item }}</p>
      </article>
    </section>
  </main>
</template>

<style>
:root {
  color-scheme: light;
  font-family: 'Avenir Next', 'Segoe UI', sans-serif;
  color: #1e1f24;
  background:
    radial-gradient(circle at top left, rgba(0, 220, 130, 0.22), transparent 30%),
    linear-gradient(180deg, #f6fffa 0%, #e3ece8 100%);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.shell {
  min-height: 100vh;
  padding: 2rem;
}

.hero,
.card {
  border-radius: 1.35rem;
  border: 1px solid rgba(30, 31, 36, 0.08);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 24px 36px rgba(30, 31, 36, 0.08);
}

.hero {
  padding: 2rem;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: #0d8b56;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.78rem;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 8vw, 4rem);
  line-height: 0.95;
}

.lede,
.card p {
  color: #5a6164;
  line-height: 1.7;
}

.lede {
  max-width: 42rem;
  margin-top: 1rem;
}

.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  margin-top: 1rem;
}

.card {
  padding: 1.3rem;
}

.card h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}
</style>
