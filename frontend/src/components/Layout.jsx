import Footer from "./Footer";
import Navbar from "./Navbar";

function Layout({ children }) {
  return (
    <div className="flex min-h-svh flex-col bg-base-200 text-base-content">
      <Navbar />
      <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 2xl:px-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;