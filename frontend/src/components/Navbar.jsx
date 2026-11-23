import { Show, SignInButton, useAuth, UserButton } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { Link } from "react-router";

import {
  LogInIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  StoreIcon,
} from "lucide-react";
import { useCart } from "../store/cart";

const Navbar = () => {
  const { getToken, isSignedIn } = useAuth();

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/api/me", { getToken }),
    enabled: isSignedIn,
  });

  const role = meData?.user?.role;

  const cartCount = useCart((s) =>
    s.items.reduce((n, line) => n + line.quantity, 0),
  );

  return (
    <header className="sticky top-0 z-50 border-b border-base-300 bg-base-100/95 shadow-sm backdrop-blur-md">
      {/* Changed max-w-7xl to max-w-screen-2xl */}
      <div className="navbar mx-auto min-h-14 max-w-screen-2xl gap-2 px-4 py-2.5 sm:px-6 md:px-8 md:py-3">
        <div className="min-w-0 flex-1">
          <Link
            to="/"
            className="btn btn-ghost min-w-0 gap-1.5 px-1.5 font-mono text-base font-semibold uppercase tracking-wide sm:gap-2 sm:px-2 sm:text-lg md:text-xl"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 p-1 text-primary sm:size-10">
              <StoreIcon className="size-6 sm:size-8" aria-hidden />
            </span>
            <span className="truncate leading-none">Northwind</span>
          </Link>
        </div>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <Link
            to="/"
            className="btn btn-ghost gap-2 px-3 font-medium sm:px-4"
          >
            <ShoppingBagIcon className="size-5 shrink-0 opacity-90 sm:size-6" aria-hidden />
            <span className="hidden sm:inline">Shop</span>
          </Link>

          <Show when={"signed-in"}>
            <Link
              to="/orders"
              className="btn btn-ghost gap-2 px-3 font-medium sm:px-4"
            >
              <PackageIcon className="size-5 shrink-0 opacity-90 sm:size-6" aria-hidden />
              <span className="hidden sm:inline">Orders</span>
            </Link>

            {role === "admin" ? (
              <Link
                to="/admin"
                className="btn btn-ghost gap-2 px-3 font-medium text-secondary sm:px-4"
              >
                <SettingsIcon className="size-5 shrink-0 sm:size-6" aria-hidden />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : null}
          </Show>

          <Link
            to="/cart"
            className="btn btn-ghost indicator gap-2 px-3 font-medium sm:px-4"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
          >
            {cartCount > 0 ? (
              <span className="indicator-item badge badge-sm badge-primary min-w-2 px-1.5 font-sans text-xs tabular-nums">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
            <ShoppingCartIcon className="size-5 shrink-0 opacity-90 sm:size-6" aria-hidden />
            <span className="hidden sm:inline">Cart</span>
          </Link>

          <Show when={"signed-out"}>
            <SignInButton mode="modal">
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1.5 px-3 shadow-md sm:px-4"
              >
                <LogInIcon className="size-4 shrink-0 drop-shadow-sm" aria-hidden />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            </SignInButton>
          </Show>

          <Show when={"signed-in"}>
            <div className="flex shrink-0 items-center gap-2 border-l border-base-300 pl-3 sm:pl-4">
              <UserButton
                appearance={{
                  elements: { avatarBox: "h-9 w-9 ring-2 ring-base-300 sm:h-10 sm:w-10" },
                }}
              />
              {role === "support" || role === "admin" ? (
                <span className="badge badge-primary badge-sm hidden capitalize md:inline-flex">
                  {role}
                </span>
              ) : null}
            </div>
          </Show>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;