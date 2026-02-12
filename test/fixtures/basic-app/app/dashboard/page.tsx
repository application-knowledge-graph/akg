import { getServerSession } from 'next-auth';

export default async function DashboardPage() {
  const session = await getServerSession();
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Welcome back</p>
    </main>
  );
}
