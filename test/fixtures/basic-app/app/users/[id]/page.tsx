export default function UserPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>User {params.id}</h1>
    </main>
  );
}
