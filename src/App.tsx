import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import InteractiveBackground from "./components/InteractiveBackground";
import CatalogCard from "./components/CatalogCard";
import CatalogModal from "./components/CatalogModal";
import AuthModal, { checkOrCreateUserProfile } from "./components/AuthModal";
import ClientProfile from "./components/ClientProfile";
import AdminDashboard from "./components/AdminDashboard";
import LightboxModal from "./components/LightboxModal";
import ReviewsSection from "./components/ReviewsSection";
import TutorialCard from "./components/TutorialCard";
import { Typewriter } from "./components/Typewriter";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from "firebase/firestore";
import { UserProfile, Catalog, SiteSettings, Tutorial } from "./types";
import {
  Gamepad2,
  Lock,
  Search,
  Filter,
  Flame,
  Globe,
  Trophy,
  Phone,
  MessageSquare,
  Facebook,
  Youtube,
  Instagram,
  Sparkles,
  Smile,
  ShieldCheck,
  ShieldAlert,
  Users,
  Clock,
  Heart,
} from "lucide-react";
// @ts-ignore
import moneyHeistBg from "./assets/images/money_heist_bg_1780429752543.png";

// Bespoke, fully stylized actual vector brand representation for TikTok
function Tiktok({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Path drawing the actual TikTok logo note shape */}
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export default function App() {
  // Navigation states
  const [activeView, setActiveView] = useState<"shop" | "profile" | "admin">("shop");
  const [profileActiveTab, setProfileActiveTab] = useState<string>("dashboard");

  // Core Data sets
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allCatalogs, setAllCatalogs] = useState<Catalog[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  // Subscription initialization states for loading screen check
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [bypassLoader, setBypassLoader] = useState(false);

  // Network/offline resilience safety fallback timer to bypass loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setBypassLoader(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Rotating homepage banner states
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const defaultBanners = [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1553481187-be93c21490a9?w=1600&auto=format&fit=crop&q=80"
  ];

  useEffect(() => {
    const banners = settings?.bannerImages && settings.bannerImages.length > 0
      ? settings.bannerImages
      : defaultBanners;

    if (currentBannerIdx >= banners.length) {
      setCurrentBannerIdx(0);
    }

    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % banners.length);
    }, 6000); // slow 6s swap

    return () => clearInterval(interval);
  }, [settings?.bannerImages, currentBannerIdx]);

  // Filter systems
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "wishlist">("default");

  // Modal dialog states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);

  // Pagination current state
  const [currentPage, setCurrentPage] = useState(1);

  // Video Tutorials active list state
  const [allTutorials, setAllTutorials] = useState<Tutorial[]>([]);

  const handleToggleWishlist = async (catalogId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentLikes = currentUser.wishlist || [];
    let updatedLikes: string[];
    if (currentLikes.includes(catalogId)) {
      updatedLikes = currentLikes.filter((id) => id !== catalogId);
    } else {
      updatedLikes = [...currentLikes, catalogId];
    }

    try {
      setCurrentUser({
        ...currentUser,
        wishlist: updatedLikes,
      });

      await updateDoc(doc(db, "users", currentUser.id), {
        wishlist: updatedLikes,
      });
    } catch (err) {
      console.error("Failed to update user wishlist in Firestore: ", err);
    }
  };

  // Verified user auth checking state
  const [authLoading, setAuthLoading] = useState(true);

  // Custom Cursor pointer tracker state
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isCursorActive, setIsCursorActive] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!isCursorActive) setIsCursorActive(true);
    };
    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isCursorActive]);

  // Initialize Theme and increment Website Refresh Traffic visits counter
  useEffect(() => {
    // Standard Dark Theme mode
    document.documentElement.classList.add("dark");

    // Increment visit log for today
    const trackRefreshVisit = async () => {
      try {
        const todayStr = new Date().toISOString().substring(0, 10);
        const visitRef = doc(db, "visits", todayStr);
        const snap = await getDoc(visitRef);

        if (snap.exists()) {
          // Atomic count increment
          await updateDoc(visitRef, { count: increment(1) });
        } else {
          await setDoc(visitRef, { id: todayStr, count: 1 });
        }
      } catch (err) {
        console.warn("Visits tracking not initialized or database connection offline: ", err);
      }
    };
    trackRefreshVisit();
  }, []);

  // Sync core Firestore collections
  useEffect(() => {
    // 1. Subscribe to active site configuration settings
    const unsubSettings = onSnapshot(doc(db, "settings", "site"), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      } else {
        // Bootstrap template site configs if fresh database
        const blankSettings: SiteSettings = {
          id: "site",
          siteName: "DUGGY FF STORE",
          siteLogo: "https://api.dicebear.com/7.x/identicon/svg?seed=duggyff",
          bankDetails: "🏦 BANK: Sampath Bank Sri Lanka\nAcc Name: Store Owner\nAcc Number: 124578965",
          ezCashDetails: "📱 Ez Cash Number: 077 524 9876",
          otherPaymentDetails: "💳 Dialog Genie / Binance Pay: billing@store.com",
          whatsappContact: "+94 77 123 4567",
          callContact: "+94 77 987 6543",
          facebookLink: "https://facebook.com",
          youtubeLink: "https://youtube.com",
          tiktokLink: "https://tiktok.com",
          discordLink: "https://discord.gg",
          lightboxEnabled: true,
          lightboxImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop",
          lightboxTitle: "HOT SUMMER EVENT UPTO 40% OFF!",
          lightboxDescription: "Verify receipt slips instantly for premium skins and rare emotes bundles today! Use our direct WhatsApp helpline if you encounter technical errors during login binding.",
          clientSatisfaction: "99.8% Verified",
          escrowOrdersCompleted: "14,350+ Trades",
          fastAndReliableBig: "24/7",
          fastAndReliableSmall: "Fast and Reliable",
          deliverySpeedBig: "Within a Single Day",
          deliverySpeedSmall: "Delivery speed",
          additionalBillingDetails: "💡 Double-check the transaction slip and reference ID before sending. Transfer approval typical processing limit is 30 mins.",
          heroHeadline: "BUY & SELL VIP FF ACCOUNTS SECURELY",
          heroSubheading: "The most trusted marketplace. Hand-moderated catalog credentials, deposit bank verification slips, and instant coordinate transfers. Over 10,000 satisfied survivors.",
        };
        setDoc(doc(db, "settings", "site"), blankSettings);
        setSettings(blankSettings);
      }
      setSettingsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "settings/site");
      setSettingsLoaded(true);
    });

    // 2. Subscribe to catalog account listings
    const unsubCatalogs = onSnapshot(collection(db, "catalogs"), (snapshot) => {
      const items: Catalog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Catalog;
        items.push({
          ...data,
          id: data.id || doc.id
        });
      });
      setAllCatalogs(items);
      setCatalogsLoaded(true);

      // Seed default listings if the database started completely empty
      if (items.length === 0) {
        seedDefaultCatalogs();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "catalogs");
      setCatalogsLoaded(true);
    });

    // 3. Subscribe to tutorials listings
    const unsubTutorials = onSnapshot(collection(db, "tutorials"), (snapshot) => {
      const items: Tutorial[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Tutorial;
        items.push({
          ...data,
          id: data.id || doc.id
        });
      });
      // Sort by newest first
      items.sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
      setAllTutorials(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "tutorials");
    });

    return () => {
      unsubSettings();
      unsubCatalogs();
      unsubTutorials();
    };
  }, []);

  // Listen to Auth State change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user && user.email) {
        try {
          const profile = await checkOrCreateUserProfile(
            user.uid,
            user.email,
            user.displayName || "Survivor",
            user.photoURL || undefined
          );
          if (profile.status === "banned") {
            await signOut(auth);
            setCurrentUser(null);
            alert("This profile has been banned from accessing portal catalogs.");
          } else {
            setCurrentUser(profile);
          }
        } catch (err) {
          console.warn("Auth profile syncing mismatch (resolved via fallback):", err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Quick automated Seeder for a beautiful empty-state shop landing
  const seedDefaultCatalogs = async () => {
    const list: Catalog[] = [
      {
        id: "default_cat_1",
        title: "VIP EVOLUTION MEGA ACCOUNT [S2+SKINS]",
        images: [
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop",
        ],
        server: "ASIA",
        level: 72,
        guns: 15,
        fashion: 48,
        emotes: 32,
        description: "Excellent collector profile. Original founder bindings secure. High rate win stats.",
        price: 15000.00,
        status: "available",
        createdAt: new Date().toISOString(),
      },
      {
        id: "default_cat_2",
        title: "BRUTE CRIMINAL GENTLEMAN LEVEL 68",
        images: [
          "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop",
        ],
        server: "EUROPE",
        level: 68,
        guns: 8,
        fashion: 24,
        emotes: 15,
        description: "Great tier competitive competitive. Full VK login bind coordinates loaded.",
        price: 8500.00,
        status: "available",
        createdAt: new Date().toISOString(),
      },
      {
        id: "default_cat_3",
        title: "S1 SAKURA ELITE LEGENDARY RARE",
        images: [
          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop",
        ],
        server: "BHARAT",
        level: 78,
        guns: 25,
        fashion: 85,
        emotes: 40,
        description: "The ultimate holy grail account layout. Secure Google Account authentication.",
        price: 35000.00,
        status: "available",
        createdAt: new Date().toISOString(),
      },
    ];

    try {
      for (const item of list) {
        await setDoc(doc(db, "catalogs", item.id), item);
      }
    } catch (err) {
      console.warn("Bootstrap write catalogs seed bypass: ", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setActiveView("shop");
  };

  // Filter Catalog listings array
  const filteredCatalogs = allCatalogs.filter((cat) => {
    // Wait, catalogs under verification are hidden from general list unless owner is browsing
    if (cat.status === "pending_verification") return false;

    let matchesFilter = true;
    if (selectedLevelFilter !== "ALL") {
      const parts = selectedLevelFilter.split("-");
      if (parts.length === 2) {
        const minLvl = parseInt(parts[0].trim(), 10);
        const maxLvl = parseInt(parts[1].trim(), 10);
        matchesFilter = cat.level >= minLvl && cat.level <= maxLvl;
      }
    }

    const textToSearch = `${cat.title} ${cat.server} ${cat.level} ${cat.guns} ${cat.fashion} ${cat.emotes} ${cat.description}`.toLowerCase();
    const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedLevelFilter, sortBy]);

  // Sort listings:
  // 1. Sold-out catalogs should always be last.
  // 2. If 'sortBy' is "wishlist" and user is authenticated with a wishlist, put those at the top.
  const sortedCatalogs = [...filteredCatalogs].sort((a, b) => {
    const aSold = a.status === "sold";
    const bSold = b.status === "sold";
    if (aSold !== bSold) {
      return aSold ? 1 : -1;
    }

    if (sortBy === "wishlist" && currentUser?.wishlist) {
      const aWish = currentUser.wishlist.includes(a.id);
      const bWish = currentUser.wishlist.includes(b.id);
      if (aWish !== bWish) {
        return aWish ? -1 : 1;
      }
    }

    return new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime();
  });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pagination calculation
  const itemsPerPage = isMobile ? 4 : 16;
  const totalPages = Math.ceil(sortedCatalogs.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedCatalogs = sortedCatalogs.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    const element = document.getElementById("shop-listings-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isInitiallyLoading = (!settingsLoaded || !catalogsLoaded || authLoading) && !bypassLoader;

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-zinc-950 text-white cursor-crosshair">
      {/* High-fidelity full viewport loading cover to completely hide uninitialized prototype */}
      <AnimatePresence mode="wait">
        {isInitiallyLoading && (
          <motion.div
            key="global-site-loader"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
            className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-zinc-950 text-white"
          >
            {/* Background design elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden bg-zinc-950 z-0">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl animate-pulse" />
              {/* Tactical grid background overlay aligning with FF esports aesthetic */}
              <div className="absolute inset-x-0 inset-y-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-sm text-center px-8 space-y-6">
              {/* Dual-ring spinning game radar */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Outer clockwise rotation */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                />
                {/* Inner counter-clockwise rotation */}
                <motion.div
                  className="absolute inset-1.5 rounded-full border border-orange-500/40 border-t-transparent border-b-transparent"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
                
                {/* Dynamic live updated Site Logo with Gamepad2 gaming fallback icon */}
                {settings?.siteLogo ? (
                  <img
                    src={settings.siteLogo}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] rounded-lg z-10"
                  />
                ) : (
                  <Gamepad2 className="w-7 h-7 text-amber-500 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse z-10" />
                )}
              </div>

              {/* Status and title display */}
              <div className="space-y-3">
                <h2 className="text-sm font-mono font-black uppercase tracking-[0.25em] text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] select-none">
                  {settings?.siteName || "BEST ACCOUNT STORE"}
                </h2>
                
                {/* Animated loading sublines */}
                <div className="flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                  <span>Site Data Loading</span>
                  <div className="flex gap-0.5">
                    <motion.span
                      className="w-1 h-1 rounded-full bg-amber-500"
                      animate={{ scale: [0.6, 1.2, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                    />
                    <motion.span
                      className="w-1 h-1 rounded-full bg-amber-500"
                      animate={{ scale: [0.6, 1.2, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                    />
                    <motion.span
                      className="w-1 h-1 rounded-full bg-amber-500"
                      animate={{ scale: [0.6, 1.2, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                    />
                  </div>
                </div>

                <p className="text-[8px] font-mono tracking-[0.2em] text-zinc-600 uppercase pt-2 select-none">
                  SECURE ACCOUNT TRANSACTIONS ESCROW V2
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tactical HUD Gaming Crosshair (Cursor trailing animation) */}
      {isCursorActive && (
        <>
          {/* Centered scope dot */}
          <motion.div
            className="hidden md:block fixed pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_12px_#f59e0b] mix-blend-screen"
            animate={{
              left: mousePos.x,
              top: mousePos.y,
              scale: isMouseDown ? 1.5 : 1,
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 400,
              mass: 0.1,
            }}
          />
          {/* Reactive scope ring with crosshair reticle details */}
          <motion.div
            className="hidden md:block fixed pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-500/70 mix-blend-screen flex items-center justify-center font-sans"
            animate={{
              left: mousePos.x,
              top: mousePos.y,
              width: isMouseDown ? 20 : 28,
              height: isMouseDown ? 20 : 28,
              scale: isMouseDown ? 0.8 : 1.2,
              borderColor: isMouseDown ? "#f97316" : "#f59e0b",
            }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 125,
              mass: 0.5,
            }}
          >
            {/* Fine Reticle Lines */}
            <div className="absolute w-2 h-[1px] bg-amber-500/40 left-0 -translate-x-1" />
            <div className="absolute w-2 h-[1px] bg-amber-500/40 right-0 translate-x-1" />
            <div className="absolute w-[1px] h-2 bg-amber-500/40 top-0 -translate-y-1" />
            <div className="absolute w-[1px] h-2 bg-amber-500/40 bottom-0 translate-y-1" />
          </motion.div>
          {/* Outer compass ambient ring */}
          <motion.div
            className="hidden md:block fixed pointer-events-none z-[9997] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-orange-500/25 mix-blend-screen"
            animate={{
              left: mousePos.x,
              top: mousePos.y,
              width: isMouseDown ? 36 : 48,
              height: isMouseDown ? 36 : 48,
              rotate: isMouseDown ? 180 : 0,
            }}
            transition={{
              type: "spring",
              damping: 22,
              stiffness: 90,
              mass: 0.8,
            }}
          />
        </>
      )}

      {/* Interactive Background */}
      <InteractiveBackground />

      {/* Seasonal Promotion popup on site load */}
      <LightboxModal settings={settings} />

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        settings={settings}
        activeView={activeView}
        onNavigate={(view, tab) => {
          setActiveView(view);
          if (tab) {
            setProfileActiveTab(tab);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Dynamic Content Views */}
      <main className="relative z-10 w-full min-h-[calc(100vh-64px)] pb-24">
        {activeView === "shop" && (
          settings?.siteActive === false && currentUser?.role !== "owner" ? (
            <div className="max-w-md mx-auto my-16 p-8 bg-zinc-900/60 border-2 border-amber-500/30 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="relative inline-flex items-center justify-center p-4 bg-amber-500/10 border border-amber-500/40 rounded-full text-amber-500">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black uppercase text-white tracking-widest">Site Under Maintenance</h2>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  The supreme administrator has temporarily locked listings search, orders placement, and listings sales to upgrade the core servers structure database layers.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                {currentUser ? (
                  <button
                    onClick={() => setActiveView("profile")}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-black uppercase text-xs tracking-widest rounded-xl transition cursor-pointer"
                  >
                    Go to Client Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="w-full py-3 bg-zinc-850 hover:bg-zinc-800 text-white font-black uppercase text-xs tracking-widest rounded-xl transition cursor-pointer"
                  >
                    Sign In Profile Session
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div id="shop-view-wrapper" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-12">
            
            {/* Interactive Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-black border-2 border-amber-500/25 p-6 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
              {/* Opacity Controlled Background Artwork */}
              <div className="absolute inset-0 z-0 overflow-hidden select-none pointer-events-none">
                <img
                  src={moneyHeistBg}
                  alt="Heist Background"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-20 filter brightness-90 contrast-110 transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/75 to-transparent" />
              </div>

              <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-500 uppercase tracking-widest rounded-full">
                  <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> VERIFIED FREEFIRE ACCOUNTS SELLER
                </div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none drop-shadow-md min-h-[3.5rem] md:min-h-[6rem] animate-auto-color">
                  <Typewriter text={settings?.heroHeadline || "BUY & SELL VIP FF ACCOUNTS SECURELY"} />
                </h1>
                <p className="text-xs md:text-sm text-zinc-300 font-sans leading-relaxed drop-shadow-sm">
                  {settings?.heroSubheading || "The most trusted marketplace. Hand-moderated catalog credentials, deposit bank verification slips, and instant coordinate transfers. Over 10,000 satisfied survivors."}
                </p>
              </div>

              {/* Banner Right visual widget */}
              <div className="relative z-10 hidden lg:flex flex-col p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-xs w-72 space-y-3">
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-amber-500/30 blur-md rounded-full pointer-events-none" />
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest block font-bold">🔔 Server Statistics</span>
                <div className="flex items-center justify-between font-bold text-zinc-200">
                  <span className="uppercase font-mono text-[10px]">Asia Active catalogs</span>
                  <span className="text-amber-500 text-sm font-mono">{allCatalogs.filter(c => c.server === "ASIA" && c.status === "available").length} items</span>
                </div>
                <div className="flex items-center justify-between font-bold text-zinc-200">
                  <span className="uppercase font-mono text-[10px]">Total Sold Out</span>
                  <span className="text-red-500 text-sm font-mono">{allCatalogs.filter(c => c.status === "sold").length} VIP</span>
                </div>
              </div>
            </div>

            {/* Dynamic Swapping/Rotating Promotional Banner */}
            {(() => {
              const activeBannerImages = settings?.bannerImages && settings.bannerImages.length > 0
                ? settings.bannerImages
                : defaultBanners;
              const activeImgUrl = activeBannerImages[currentBannerIdx] || defaultBanners[0];

              return (
                <div id="rotating-promo-slider" className="relative w-full h-[220px] md:h-[340px] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950/60 flex items-center justify-center group shadow-xl">
                  {/* Slideshow Image using AnimatePresence for slow, elegant modern cross-fades */}
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentBannerIdx}
                      src={activeImgUrl}
                      alt="Marketplace Slide"
                      referrerPolicy="no-referrer"
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />
                  </AnimatePresence>

                  {/* Gradient overlays for contrast & styling */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent pt-12 z-10">
                    <span className="text-[9px] font-mono tracking-[4px] text-amber-500 uppercase font-black">
                      🛡️ SECURE VERIFIED SPONSOR
                    </span>
                    <h2 className="text-lg md:text-2xl font-black uppercase text-white mt-1 select-none">
                      {settings?.siteName || "FIRE STORE"} COMMUNITY EVENTS & SPONSORS
                    </h2>
                  </div>

                  {/* Swapping dot indicators */}
                  {activeBannerImages.length > 1 && (
                    <div className="absolute bottom-4 right-6 flex items-center gap-1.5 z-20">
                      {activeBannerImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentBannerIdx(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                            i === currentBannerIdx 
                              ? "bg-amber-500 w-6" 
                              : "bg-zinc-650 hover:bg-zinc-400"
                          }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Live Trusted Market Statistics Bento row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              <div className="p-3 md:p-4 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex items-center gap-2.5 md:gap-4 hover:scale-[1.01] transition-transform duration-300 shadow-sm dark:shadow-none">
                <div className="p-2 md:p-3 bg-amber-500/10 rounded-xl shrink-0">
                  <Smile className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base md:text-xl font-black text-zinc-900 dark:text-white font-mono tracking-tight leading-none truncate">
                    {settings?.clientSatisfaction || "99.8% Verified"}
                  </div>
                  <div className="text-[8px] md:text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 font-extrabold mt-1 truncate">
                    Satisfaction
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex items-center gap-2.5 md:gap-4 hover:scale-[1.01] transition-transform duration-300 shadow-sm dark:shadow-none">
                <div className="p-2 md:p-3 bg-emerald-500/10 rounded-xl shrink-0">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base md:text-xl font-black text-zinc-900 dark:text-white font-mono tracking-tight leading-none truncate">
                    {settings?.escrowOrdersCompleted || "14,350+ Trades"}
                  </div>
                  <div className="text-[8px] md:text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 font-extrabold mt-1 truncate">
                    Trades Completed
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex items-center gap-2.5 md:gap-4 hover:scale-[1.01] transition-transform duration-300 shadow-sm dark:shadow-none">
                <div className="p-2 md:p-3 bg-amber-500/10 rounded-xl shrink-0">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-500 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base md:text-xl font-black text-zinc-900 dark:text-white font-mono tracking-tight leading-none truncate">
                    {settings?.fastAndReliableBig || "24/7 Support"}
                  </div>
                  <div className="text-[8px] md:text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 font-extrabold mt-1 truncate">
                    Support Live
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl flex items-center gap-2.5 md:gap-4 hover:scale-[1.01] transition-transform duration-300 shadow-sm dark:shadow-none">
                <div className="p-2 md:p-3 bg-red-500/10 rounded-xl shrink-0">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base md:text-xl font-black text-zinc-900 dark:text-white font-mono tracking-tight leading-none truncate">
                    {settings?.deliverySpeedBig || "Single Day"}
                  </div>
                  <div className="text-[8px] md:text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 font-extrabold mt-1 truncate">
                    Delivery Speed
                  </div>
                </div>
              </div>
            </div>

            {/* Filters panel controls mapping */}
            <div className="flex flex-col xl:flex-row items-center gap-4 bg-zinc-950/25 border border-zinc-900 rounded-2xl p-4">
              {/* Search bar input */}
              <div className="relative w-full xl:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search weapons (Draco, Scar...), outfits, emotes, servers or levels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-2.5 pl-10 pr-4 bg-zinc-900/60 dark:bg-black/40 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Filtering and Sorting Row controls */}
              <div className="flex flex-wrap items-center gap-4 justify-between w-full xl:w-auto">
                {/* Level Filter Tags tab list */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  <span className="text-zinc-500 mr-1 hidden sm:inline">Level Filter:</span>
                  {["ALL", "0-50", "50-70", "70-80", "80-90", "90-100"].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSelectedLevelFilter(lvl)}
                      className={`py-1.5 px-3 rounded-lg transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${
                        selectedLevelFilter === lvl
                          ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Wishlist Priority Sorter Toggle */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  <span className="text-zinc-500 mr-1 hidden sm:inline">Sort Option:</span>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setIsAuthOpen(true);
                        return;
                      }
                      setSortBy(sortBy === "default" ? "wishlist" : "default");
                    }}
                    className={`py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${
                      sortBy === "wishlist"
                        ? "bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] border border-red-500/20 animate-pulse"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-transparent"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${sortBy === "wishlist" ? "fill-white text-white" : "text-zinc-400"}`} />
                    <span>Wishlist First</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            <div id="shop-listings-section" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 scroll-mt-24">
              {paginatedCatalogs.map((item) => (
                <CatalogCard
                  key={item.id}
                  catalog={item}
                  onOpenDetails={(cat) => setSelectedCatalog(cat)}
                  isWishlisted={currentUser?.wishlist?.includes(item.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}

              {filteredCatalogs.length === 0 && (
                <div className="col-span-full py-24 text-center rounded-2xl border border-dashed border-zinc-850 dark:border-zinc-850 bg-zinc-950/10 text-zinc-400">
                  <Gamepad2 className="w-12 h-12 text-zinc-650 mx-auto mb-4 animate-pulse" />
                  <h3 className="font-bold text-zinc-300 uppercase tracking-wide">No catalogues matches</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    No active accounts found matching level range '{selectedLevelFilter}' or search term '{searchQuery}'. Try broadening parameters.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2 font-mono">
                <button
                  disabled={activePage === 1}
                  onClick={() => goToPage(activePage - 1)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-amber-500 rounded text-[10px] font-bold uppercase text-zinc-100 hover:text-amber-500 disabled:opacity-30 disabled:hover:text-zinc-100 disabled:hover:border-zinc-850 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                >
                  PREV
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => goToPage(pg)}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all duration-150 cursor-pointer ${
                      activePage === pg
                        ? "bg-amber-500 text-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.3)] font-black"
                        : "bg-zinc-900 border border-zinc-850 hover:border-amber-500 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={activePage === totalPages}
                  onClick={() => goToPage(activePage + 1)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:border-amber-500 rounded text-[10px] font-bold uppercase text-zinc-100 hover:text-amber-500 disabled:opacity-30 disabled:hover:text-zinc-100 disabled:hover:border-zinc-850 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                >
                  NEXT
                </button>
              </div>
            )}

            {/* Tutorials Section */}
            {allTutorials.length > 0 && settings?.tutorialsEnabled !== false && (
              <div className="mt-16 pt-12 border-t border-zinc-900">
                <div className="text-center md:text-left mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-500 uppercase tracking-widest rounded-full mb-3">
                    🎥 VIDEO TUTORIALS & GUIDES
                  </div>
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                    Official Tutorial Section
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 max-w-xl">
                    Master account security, understand ultimate escrow procedures, and follow step-by-step account delivery instructions.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {allTutorials.map((tutorial) => (
                    <TutorialCard key={tutorial.id} tutorial={tutorial} />
                  ))}
                </div>
              </div>
            )}

            {/* Moderated User Feedbacks reviews section */}
            <ReviewsSection
              currentUser={currentUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          </div>
        )
      )}

        {activeView === "profile" && (
          authLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
              <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                VERIFYING ACCOUNT PROFILE & ROLE...
              </div>
            </div>
          ) : currentUser && currentUser.status !== "banned" ? (
            <ClientProfile
              currentUser={currentUser}
              onLogout={handleLogout}
              allCatalogs={allCatalogs}
              onToggleWishlist={handleToggleWishlist}
              onOpenCatalogDetail={(cat) => setSelectedCatalog(cat)}
              settings={settings}
              initialTab={profileActiveTab}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800 border-dashed max-w-md mx-auto my-12">
              <Lock className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="font-extrabold uppercase text-sm text-zinc-350 tracking-wide">ROLE RESTRICTED ACCESS</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                You must login into an authenticated profile (member, admin, or main owner) to view sensitive customer assets and credential transfers.
              </p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="mt-5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 font-bold uppercase rounded-xl text-zinc-950 text-2xs cursor-pointer tracking-wider"
              >
                Sign In Now
              </button>
            </div>
          )
        )}

        {activeView === "admin" && (
          authLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
              <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                VERIFYING ADMINISTRATIVE CLEARANCE...
              </div>
            </div>
          ) : currentUser && ["admin", "owner"].includes(currentUser.role) ? (
            <AdminDashboard
              currentUser={currentUser}
              settings={settings}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-zinc-900/40 rounded-3xl border border-zinc-800 border-dashed max-w-md mx-auto my-12">
              <Lock className="w-12 h-12 text-zinc-600 mb-4" />
              <h3 className="font-extrabold uppercase text-sm text-zinc-350 tracking-wide">ADMINISTRATOR PERMISSION DIRECTIVE</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Unverified dashboard access denied. This database panel is strictly monitored. Complete your owner authorization check dynamically.
              </p>
            </div>
          )
        )}
      </main>

      {/* Footer bar containing customized settings details */}
      <footer className="relative border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-black py-16 text-xs text-zinc-500 dark:text-zinc-450 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-black text-zinc-800 dark:text-white text-sm uppercase tracking-wider">
              {settings?.siteName || "FIRE STORE"} MARKETPLACE
            </h4>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans max-w-sm">
              We provide manually verified, high-level premium Free Fire accounts with robust security escrow. 100% scam-free handovers backed by manual checkings of screenshots, levels, emotes, and banking-slips validation.
            </p>
            {/* Standard Social Media Icons */}
            {settings && (
              <div className="flex items-center gap-3 text-zinc-400 dark:text-zinc-500">
                {settings.facebookLink && (
                  <a href={settings.facebookLink} target="_blank" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:text-amber-500 border border-zinc-200 dark:border-zinc-800 transition">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings.youtubeLink && (
                  <a href={settings.youtubeLink} target="_blank" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:text-amber-500 border border-zinc-200 dark:border-zinc-800 transition">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {settings.tiktokLink && (
                  <a href={settings.tiktokLink} target="_blank" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:text-amber-500 border border-zinc-200 dark:border-zinc-800 transition">
                    <Tiktok className="w-4 h-4" />
                  </a>
                )}
                {settings.discordLink && (
                  <a href={settings.discordLink} target="_blank" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:text-amber-500 border border-zinc-200 dark:border-zinc-800 transition">
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Escrow / Broadcaster channels added from Tab 5 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider text-xs">
              Live Broadcaster Groups
            </h4>
            <div className="flex flex-col gap-2">
              {settings?.socialChannels && settings.socialChannels.map((chan, idx) => (
                <a
                  key={idx}
                  href={chan.url.startsWith("http") ? chan.url : `https://${chan.url}`}
                  target="_blank"
                  className="flex items-center gap-2 text-zinc-650 dark:text-zinc-300 hover:text-amber-500 hover:underline transition text-2xs truncate"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{chan.name}:</span>
                  <span className="truncate text-zinc-450 dark:text-zinc-500 text-[10px]">{chan.url}</span>
                </a>
              ))}
              {(!settings?.socialChannels || settings.socialChannels.length === 0) && (
                <div className="text-[10px] text-zinc-400 italic">No community subgroups listed at the moment. Check back soon!</div>
              )}
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider text-xs">
              Direct hotlines support
            </h4>
            <div className="space-y-2 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
              {settings?.whatsappContact && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-emerald-500">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span>WhatsApp: {settings.whatsappContact}</span>
                </div>
              )}
              {settings?.callContact && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-amber-500">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span>Call Lines: {settings.callContact}</span>
                </div>
              )}
              <div className="pt-2 text-[10px] text-zinc-400 flex items-center gap-1.5">
                🔒 256-Bit SSL Payment Safeguard
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="font-extrabold text-zinc-800 dark:text-white uppercase tracking-wider text-xs font-sans">Legal</h4>
            <div className="text-[11px] text-zinc-500 leading-normal space-y-1">
              <div>© {new Date().getFullYear()} {settings?.siteName || "FIRE STORE"}</div>
              <div className="text-[9.5px] uppercase font-mono tracking-widest text-zinc-400 dark:text-zinc-600 mt-1.5 leading-snug">
                Garena Free Fire is a trademark of Garena Online Pvt Ltd.
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic sub-footer bar with copyrights and right-aligned Developer tag */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-900 text-[11px] text-zinc-400 dark:text-zinc-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            Authorized Escrow Trading Portal. Operating in accordance with digital security protocols.
          </div>
          <a
            href="https://wa.me/94778066061"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 dark:text-zinc-400 font-extrabold flex items-center gap-1 hover:scale-105 transition-transform duration-200 text-xs uppercase tracking-wide cursor-pointer hover:text-amber-500 dark:hover:text-amber-400"
          >
            Web Design by <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent font-black tracking-normal">Roxzy Creations</span>
          </a>
        </div>
      </footer>

      {/* Global Interactive authentication dialog */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        settings={settings}
        onAuthSuccess={(profile) => {
          if (profile) {
            setCurrentUser(profile);
            // Default shift view
            if (profile.role === "admin" || profile.role === "owner") {
              setActiveView("admin");
            } else {
              setActiveView("profile");
            }
          }
        }}
      />

      {/* Deep accounts details viewing dialog */}
      {selectedCatalog && (
        <CatalogModal
          catalog={selectedCatalog}
          currentUser={currentUser}
          settings={settings}
          onClose={() => setSelectedCatalog(null)}
          onOpenAuth={() => {
            setSelectedCatalog(null);
            setIsAuthOpen(true);
          }}
        />
      )}
    </div>
  );
}
