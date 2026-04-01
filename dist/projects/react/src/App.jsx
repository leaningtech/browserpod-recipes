const features = [
  'React renders through a Vite dev server running inside BrowserPod.',
  'The portal URL points to the app hosted on the pod’s local port 3000.',
  'Rollup and esbuild are swapped for their WASM-friendly counterparts.',
];

export default function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">React recipe</p>
        <h1>Hello from BrowserPod</h1>
        <p className="lede">
          This page is being bundled, served, and hot-reloaded entirely from a
          BrowserPod instance running in the browser.
        </p>
      </section>

      <section className="grid">
        {features.map((feature) => (
          <article key={feature} className="card">
            <h2>Browser-native workflow</h2>
            <p>{feature}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
