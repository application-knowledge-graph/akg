import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Welcome</h1>
      <Link href="/about">About</Link>
      <Link href="/login">Login</Link>
      <Link href="/dashboard">Dashboard</Link>
    </main>
  );
}
