export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0' }}>Hello World!</h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.9 }}>Next.js running in BrowserPod</p>
      </div>
    </div>
  );
}
