import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Simple Next.js App</h1>
      <nav>
        <Link href="/about">About</Link>
        <Link href="/login">Login</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>
    </main>
  );
}
