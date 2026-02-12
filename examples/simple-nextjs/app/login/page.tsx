export default function Login() {
  return (
    <main>
      <h1>Login</h1>
      <form action="/api/hello" method="POST">
        <input name="email" type="email" placeholder="Email" />
        <input name="password" type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
    </main>
  );
}
