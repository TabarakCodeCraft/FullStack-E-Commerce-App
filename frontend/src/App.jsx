import { Show, SignInButton, SignUpButton, useAuth, UserButton } from "@clerk/react";
import PageLoader from "./components/PageLoader";
import Layout from "./components/Layout";

function App() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return <PageLoader />;

  return (
    <Layout>
      <header>
        <Show when="signed-out">
          <SignInButton mode="model" />
          <SignUpButton mode="model" />
        </Show>
        <Show when="signed-in">
          <UserButton/>
        </Show>
      </header>

      <div className="p-10">
        <button className="btn btn-primary">Click me</button>
      </div>
    </Layout>
  );
}

export default App;
