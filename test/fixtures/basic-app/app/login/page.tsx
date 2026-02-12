export default function LoginPage() {
  return (
    <main>
      <h1>Sign In</h1>
      <form action="/api/auth/login" method="POST">
        <input name="email" type="email" placeholder="Email" />
        <input name="password" type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
    </main>
  );
}
