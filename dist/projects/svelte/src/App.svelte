<script>
  const callouts = [
    'Svelte mounts through a Vite dev server running inside BrowserPod.',
    'The package overrides swap native esbuild and rollup binaries for WASM implementations.',
    'The iframe you see in the outer app is loading the BrowserPod portal URL, not localhost.',
  ];
</script>

<main class="shell">
  <section class="hero">
    <p class="eyebrow">Svelte recipe</p>
    <h1>Hello from BrowserPod</h1>
    <p class="lede">
      This Svelte app is compiled and served from a pod in the browser, then
      reflected back into the same page through BrowserPod portals.
    </p>
  </section>

  <section class="cards">
    {#each callouts as callout}
      <article class="card">
        <h2>Pod-friendly setup</h2>
        <p>{callout}</p>
      </article>
    {/each}
  </section>
</main>
