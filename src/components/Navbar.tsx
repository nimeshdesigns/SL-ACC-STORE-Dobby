import React from "react";
import { UserProfile, SiteSettings } from "../types";
import { Gamepad2, ShieldCheck, User, LogOut } from "lucide-react";

interface NavbarProps {
  currentUser: UserProfile | null;
  settings: SiteSettings | null;
  activeView: "shop" | "profile" | "admin";
  onNavigate: (view: "shop" | "profile" | "admin", tab?: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export default function Navbar({
  currentUser,
  settings,
  activeView,
  onNavigate,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  // Use settings config if available, else static gaming fallbacks
  const storeName = settings?.siteName || "FIRE STORE";
  const logoImage = settings?.siteLogo || null;

  const showAdminTab = currentUser && (currentUser.role === "owner" || (currentUser.role === "admin" && settings?.siteActive !== false));

  return (
    <nav
      id="portal-primary-navbar"
      className="sticky top-0 z-40 bg-zinc-950/80 text-white backdrop-blur-md border-b border-zinc-900/60 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onNavigate("shop")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {logoImage ? (
              <img
                src={logoImage}
                alt="Brand logo"
                referrerPolicy="no-referrer"
                className="w-9 h-9 object-contain rounded-lg border border-amber-500/20"
              />
            ) : (
              <Gamepad2 className="w-8 h-8 text-amber-500 group-hover:rotate-12 transition-transform duration-200" />
            )}
            <span className="hidden sm:inline-block font-extrabold text-lg tracking-wider text-white bg-gradient-to-r from-amber-400 options:via-orange-500 to-red-500 bg-clip-text text-transparent uppercase font-mono">
              {storeName}
            </span>
          </div>

          {/* Center navigation links */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-300 font-bold uppercase tracking-wider">
            <button
              onClick={() => onNavigate("shop")}
              className={`py-1.5 px-3.5 rounded-xl transition cursor-pointer ${
                activeView === "shop"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "hover:text-amber-500 hover:bg-zinc-900/60"
              }`}
            >
              Browse Shop
            </button>

            {currentUser && (
              <button
                onClick={() => onNavigate("profile")}
                className={`py-1.5 px-3.5 rounded-xl transition cursor-pointer ${
                  activeView === "profile"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "hover:text-amber-500 hover:bg-zinc-900/60"
                }`}
              >
                Client Profile
              </button>
            )}

            {showAdminTab && (
              <button
                onClick={() => onNavigate("admin")}
                className={`flex items-center gap-1 py-1.5 px-3.5 rounded-xl text-amber-500 border border-dashed border-amber-500/35 bg-amber-500/5 transition cursor-pointer hover:scale-[1.02] ${
                  activeView === "admin"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : "hover:bg-amber-500/10"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Admin Dashboard
              </button>
            )}
          </div>

          {/* Right controls: social, User card triggers */}
          <div className="flex items-center gap-3">
            {/* Mobile View Navigation elements (smaller screen support) */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={() => onNavigate("shop")}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition border ${
                  activeView === "shop"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : "text-zinc-500 border-transparent hover:bg-zinc-900"
                }`}
              >
                Shop
              </button>
              {currentUser && (
                <button
                  onClick={() => onNavigate("profile")}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition border ${
                    activeView === "profile"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "text-zinc-500 border-transparent hover:bg-zinc-900"
                  }`}
                >
                  Profile
                </button>
              )}
              {showAdminTab && (
                <button
                  onClick={() => onNavigate("admin")}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition border ${
                    activeView === "admin"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "text-zinc-500 border-transparent hover:bg-zinc-900"
                  }`}
                >
                  Admin
                </button>
              )}
            </div>

            {/* User Account panel switcher */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-2 cursor-pointer p-1 pr-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-full transition"
                >
                  <img
                    src={currentUser.photoURL || "https://api.dicebear.com/7.x/identicon/svg?seed=ffclient"}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full bg-zinc-950 object-cover"
                  />
                  <span className="text-[10px] font-mono tracking-wide text-zinc-350 max-w-[80px] truncate uppercase font-bold">
                    {currentUser.name}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                  title="Sign out of game session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 py-1.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition duration-150 active:scale-95 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
