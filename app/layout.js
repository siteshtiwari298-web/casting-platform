export const metadata = {
  title: 'Casting Platform',
  description: 'Production database and casting platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#f7f7f8' }}>
        {children}
      </body>
    </html>
  );
}
