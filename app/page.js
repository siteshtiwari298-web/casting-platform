import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Casting Platform</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        Create your profile, or sign in to manage it.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/signup" style={buttonStyle}>Create Actor Profile</Link>
        <Link href="/login" style={{ ...buttonStyle, background: '#fff', color: '#111', border: '1px solid #ddd' }}>
          Log In
        </Link>
      </div>
    </main>
  );
}

const buttonStyle = {
  display: 'block',
  padding: '14px 20px',
  borderRadius: 10,
  background: '#111',
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 600,
};
