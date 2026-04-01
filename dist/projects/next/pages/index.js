const cards = [
  'Next runs in webpack mode here because Turbopack needs native bindings.',
  'The recipe explicitly installs the SWC WASM package so compilation stays BrowserPod-safe.',
  'This page is served from a local port inside the pod and surfaced through a BrowserPod portal.',
];

const sectionStyle = {
  borderRadius: '1.4rem',
  border: '1px solid rgba(35, 29, 23, 0.08)',
  background: 'rgba(255, 255, 255, 0.84)',
  boxShadow: '0 24px 36px rgba(35, 29, 23, 0.08)',
};

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
        color: '#231d17',
        background:
          'radial-gradient(circle at top right, rgba(17, 132, 224, 0.22), transparent 30%), linear-gradient(180deg, #f7fbff 0%, #e5ebf4 100%)',
      }}
    >
      <section style={{ ...sectionStyle, padding: '2rem' }}>
        <p
          style={{
            margin: '0 0 0.75rem',
            color: '#2266a8',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: '0.78rem',
            fontWeight: 700,
          }}
        >
          Next recipe
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            lineHeight: 0.95,
          }}
        >
          Hello from BrowserPod
        </h1>
        <p
          style={{
            margin: '1rem 0 0',
            maxWidth: '42rem',
            color: '#5d6169',
            lineHeight: 1.7,
          }}
        >
          This Next.js page is being compiled and served from inside BrowserPod,
          then embedded back into the outer recipe runner through its portal.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
          marginTop: '1rem',
        }}
      >
        {cards.map((card) => (
          <article key={card} style={{ ...sectionStyle, padding: '1.3rem' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
              BrowserPod compatibility
            </h2>
            <p style={{ margin: 0, color: '#5d6169', lineHeight: 1.7 }}>{card}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
