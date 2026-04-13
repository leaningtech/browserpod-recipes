export const metadata = {
  title: 'Hello from BrowserPod',
  description: 'Next.js running in BrowserPod',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
