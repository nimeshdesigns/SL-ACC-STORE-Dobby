import React, { useState, useEffect } from "react";
import { UserProfile, Order, Message, Catalog, CatalogCredentials, SiteSettings } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, query, where, onSnapshot, getDocs, addDoc, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  ShieldCheck,
  Mail,
  MessageSquare,
  History,
  TrendingUp,
  Key,
  DollarSign,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Copy,
  FolderLock,
  Sparkles,
  Heart,
  Search,
} from "lucide-react";

interface ClientProfileProps {
  currentUser: UserProfile;
  onLogout: () => void;
  allCatalogs?: Catalog[];
  onToggleWishlist?: (catalogId: string) => void;
  onOpenCatalogDetail?: (catalog: Catalog) => void;
  settings?: SiteSettings | null;
  initialTab?: string;
}

export default function ClientProfile({
  currentUser,
  onLogout,
  allCatalogs = [],
  onToggleWishlist,
  onOpenCatalogDetail,
  settings,
  initialTab,
}: ClientProfileProps) {
  // Tabs for sub-sections inside the Profile
  type ProfileTab = "dashboard" | "inbox" | "history" | "sell_account" | "wishlist";
  const [activeTab, setActiveTab] = useState<ProfileTab>("dashboard");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as ProfileTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (settings && settings.siteActive === false && currentUser.role !== "owner") {
      if (activeTab === "sell_account" || activeTab === "wishlist") {
        setActiveTab("dashboard");
      }
    }
  }, [settings?.siteActive, currentUser?.role, activeTab]);

  // Client statistics
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientSubmissions, setClientSubmissions] = useState<Catalog[]>([]);

  // Track read messages
  const [readMessageIds, setReadMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`read_messages_${currentUser?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markMessageAsRead = (msgId: string) => {
    if (!readMessageIds.includes(msgId)) {
      const updated = [...readMessageIds, msgId];
      setReadMessageIds(updated);
      try {
        localStorage.setItem(`read_messages_${currentUser?.id}`, JSON.stringify(updated));
      } catch (err) {
        console.error("Local storage error:", err);
      }
    }
  };

  const unreadCount = messages.filter((msg) => !readMessageIds.includes(msg.id)).length;

  // Selected items & Search Query states
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [inboxSearchQuery, setInboxSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  // "Sell Account" Form state
  const [sellTitle, setSellTitle] = useState("");
  const [sellServer, setSellServer] = useState("ASIA");
  const [sellLevel, setSellLevel] = useState<number>(60);
  const [sellPrice, setSellPrice] = useState<number>(10);
  const [sellGuns, setSellGuns] = useState("");
  const [sellFashion, setSellFashion] = useState("");
  const [sellEmotes, setSellEmotes] = useState("");
  const [sellDesc, setSellDesc] = useState("");
  const [sellImages, setSellImages] = useState<string>(""); // comma split

  // Login credentials
  const [loginMethod, setLoginMethod] = useState("Google");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [backupCodes, setBackupCodes] = useState("");
  const [sellerWhatsapp, setSellerWhatsapp] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // States for viewing secret details
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Real-time Profile messages and orders history from Firestore
  useEffect(() => {
    // 1. Fetch Orders for this client
    const qOrders = query(collection(db, "orders"), where("clientId", "==", currentUser.id));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Order;
        list.push({
          ...data,
          id: data.id || doc.id
        });
      });
      setOrders(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "orders");
    });

    // 2. Fetch Messages directed to this client or all users natively restricted by rules
    const qMessages = query(
      collection(db, "messages"),
      where("clientId", "in", [currentUser.id, "all"])
    );
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((doc) => {
        const msg = doc.data() as Message;
        list.push({
          ...msg,
          id: msg.id || doc.id
        });
      });
      setMessages(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "messages");
    });

    // 3. Fetch submissions made by this client
    const qSubmissions = query(
      collection(db, "catalogs"),
      where("sellerId", "==", currentUser.id)
    );
    const unsubSubmissions = onSnapshot(qSubmissions, (snapshot) => {
      const list: Catalog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Catalog;
        list.push({
          ...data,
          id: data.id || doc.id
        });
      });
      setClientSubmissions(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "catalogs");
    });

    return () => {
      unsubOrders();
      unsubMessages();
      unsubSubmissions();
    };
  }, [currentUser]);

  // Submit Freefire Account form for verification
  const handleSellAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellTitle || !sellGuns || !sellFashion || !sellEmotes || !loginUser || !loginPass) {
      setFormError("Please fill out both the Account catalog details AND credentials.");
      return;
    }
    if (sellPrice <= 0 || sellLevel <= 0) {
      setFormError("Price and Level must be positive numbers.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const catalogId = "cat_" + Math.random().toString(36).substring(2, 11).toUpperCase();

      // Split strings to parse image paths arrays
      const customImgList = sellImages
        ? sellImages.split(",").map((s) => s.trim()).filter((s) => s.startsWith("http"))
        : [];
      // Default placeholder gaming assets if user didn't specify up to 5 URLs
      if (customImgList.length === 0) {
        customImgList.push("https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop");
      }

      // 1. Create Catalog Draft in Verification State
      const catalogPayload: Catalog = {
        id: catalogId,
        title: sellTitle,
        images: customImgList.slice(0, 5), // strict lock max 5
        server: sellServer,
        level: Number(sellLevel),
        guns: parseInt(sellGuns, 10) || 0,
        fashion: parseInt(sellFashion, 10) || 0,
        emotes: parseInt(sellEmotes, 10) || 0,
        description: sellDesc,
        price: Number(sellPrice),
        status: "pending_verification",
        sellerId: currentUser.id,
        createdAt: new Date().toISOString(),
      };

      // 2. Create decoupled credentials path
      const credentialsPayload: CatalogCredentials = {
        catalogId: catalogId,
        loginMethod: loginMethod,
        username: loginUser,
        password: loginPass,
        backupCodes: backupCodes,
        sellerWhatsapp: sellerWhatsapp || currentUser.whatsappNumber || "",
      };

      // Write to Firestore (Atomic Simulation helper)
      await setDoc(doc(db, "catalogs", catalogId), catalogPayload);
      await setDoc(doc(db, "catalogCredentials", catalogId), credentialsPayload);

      // Reset form on success
      setSellTitle("");
      setSellGuns("");
      setSellFashion("");
      setSellEmotes("");
      setSellDesc("");
      setSellImages("");
      setLoginUser("");
      setLoginPass("");
      setBackupCodes("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 8000);
    } catch (err: any) {
      setFormError("Failed to register your account submission: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="profile-container-inner" className="max-w-7xl mx-auto px-4 py-8 text-white z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sub-Navigator: Client Quick Card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-zinc-850 bg-zinc-950/40 p-5 text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 options:to-orange-500" />
            <img
              src={currentUser.photoURL || "https://api.dicebear.com/7.x/identicon/svg?seed=ffclient"}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full mx-auto border-2 border-amber-500 bg-zinc-900 object-cover mb-4"
            />
            <h2 className="font-extrabold text-zinc-100 truncate flex items-center justify-center gap-1.5 uppercase">
              {currentUser.name}
              {currentUser.role !== "member" && (
                <ShieldCheck className="w-4.5 h-4.5 text-amber-500 shrink-0" />
              )}
            </h2>
            <p className="text-zinc-550 text-xs font-mono mb-6">{currentUser.email}</p>

            {/* Role tags layout */}
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-6">
              Role: {currentUser.role === "owner" ? "Main Owner" : currentUser.role}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full text-left py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl text-[10px] sm:text-xs font-semibold uppercase flex items-center gap-1.5 lg:gap-2 transition cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> <span className="truncate">Personal Center</span>
              </button>
              <button
                onClick={() => setActiveTab("inbox")}
                className={`w-full text-left py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl text-[10px] sm:text-xs font-semibold uppercase flex items-center justify-between transition cursor-pointer ${
                  activeTab === "inbox"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <span className="flex items-center gap-1.5 lg:gap-2 truncate">
                  <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> My Inbox
                </span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white font-black text-[8px] lg:text-[9px] px-1.5 py-0.5 rounded-full animate-bounce shrink-0">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`w-full text-left py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl text-[10px] sm:text-xs font-semibold uppercase flex items-center gap-1.5 lg:gap-2 transition cursor-pointer ${
                  activeTab === "history"
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <History className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> <span className="truncate">Orders Tracker</span>
              </button>
              {!(settings?.siteActive === false && currentUser.role !== "owner") && (
                <>
                  <button
                    onClick={() => setActiveTab("sell_account")}
                    className={`w-full text-left py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl text-[10px] sm:text-xs font-semibold uppercase flex items-center gap-1.5 lg:gap-2 transition cursor-pointer ${
                      activeTab === "sell_account"
                        ? "bg-amber-500 text-zinc-950"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> <span className="truncate">Sell Account</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("wishlist")}
                    className={`w-full text-left py-2 px-3 lg:py-2.5 lg:px-4 rounded-xl text-[10px] sm:text-xs font-semibold uppercase flex items-center gap-1.5 lg:gap-2 transition cursor-pointer ${
                      activeTab === "wishlist"
                        ? "bg-amber-500 text-zinc-950"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" /> <span className="truncate">My Wishlist</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={onLogout}
              className="mt-8 text-xs font-mono text-zinc-550 hover:text-red-400 underline block mx-auto cursor-pointer"
            >
              Log Out Session
            </button>
          </div>
        </div>

        {/* Right Space Details panel */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {/* TAB: Personal dashboard overview */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {settings?.siteActive === false && currentUser.role !== "owner" && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/35 rounded-2xl flex items-start gap-3 text-amber-500">
                    <span className="w-2.5 h-2.5 mt-1 bg-amber-500 rounded-full animate-pulse shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">Maintenance Mode Active</h4>
                      <p className="text-2xs text-zinc-400 mt-1 leading-normal">
                        The store is currently in main database maintenance. Browsing catalogs is temporarily disabled, and listing submissions or placing new checkout tickets is strictly suspended. Live inbox messages and orders trackers remain fully active.
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats cards mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-950/30 p-5 rounded-2xl border border-zinc-850 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                      {orders.length}
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Placed orders</span>
                      <span className="text-lg font-black text-white">{orders.length} Purchases</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/30 p-5 rounded-2xl border border-zinc-850 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
                      {clientSubmissions.length}
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Submitted catalog</span>
                      <span className="text-lg font-black text-white">{clientSubmissions.length} Listed</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/30 p-5 rounded-2xl border border-zinc-850 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                      {orders.filter((o) => o.status === "delivered").length}
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Delivered Accounts</span>
                      <span className="text-lg font-black text-white">
                        {orders.filter((o) => o.status === "delivered").length} VIP Access
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submissions checklist */}
                <div className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6">
                  <h3 className="font-extrabold uppercase text-sm text-zinc-200 tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" /> Sponsoring Account Catalogues
                  </h3>
                  {clientSubmissions.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 text-xs">
                      No Freefire accounts posted to sell yet. Go to "Sell Account" to list your profile!
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {clientSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 text-xs gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={sub.images && sub.images.length > 0 ? sub.images[0] : ""}
                              alt={sub.title}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-cover rounded bg-zinc-900"
                            />
                            <div>
                              <div className="font-bold text-zinc-200 uppercase">{sub.title}</div>
                              <span className="text-[10px] text-amber-500 font-mono tracking-wider">
                                {sub.server} SERVER | LKR {sub.price.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {sub.status === "pending_verification" && (
                              <span className="px-2 py-0.5 bg-yellow-950/50 text-yellow-500 rounded font-bold uppercase text-[9px] border border-yellow-500/20">
                                Staff verifications pending
                              </span>
                            )}
                            {sub.status === "available" && (
                              <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 rounded font-bold uppercase text-[9px] border border-emerald-500/20">
                                ACTIVE LISTING IN STORE
                              </span>
                            )}
                            {sub.status === "sold" && (
                              <span className="px-2 py-0.5 bg-red-950/50 text-red-400 rounded font-bold uppercase text-[9px] border border-red-500/20">
                                SOLD OUT
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: Message Inbox */}
            {activeTab === "inbox" && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <h3 className="font-black text-lg text-white uppercase tracking-wider mb-2 flex items-center gap-1.5 animate-pulse">
                  <Mail className="w-5 h-5 text-amber-500" /> Notifications Inbox
                </h3>

                {/* Inbox Search input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search inbox messages (title, details)..."
                    value={inboxSearchQuery}
                    onChange={(e) => setInboxSearchQuery(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-zinc-950/40 border border-zinc-850 focus:border-amber-550 focus:outline-none rounded-xl text-zinc-200 font-mono"
                  />
                </div>

                {messages.length === 0 ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/20 text-zinc-500 font-sans text-sm">
                    Your inbox folder is currently empty. Direct deliveries alerts will pop up here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages
                      .filter((msg) => {
                        const term = inboxSearchQuery.toLowerCase();
                        return (
                          msg.title.toLowerCase().includes(term) ||
                          msg.content.toLowerCase().includes(term) ||
                          msg.senderName.toLowerCase().includes(term)
                        );
                      })
                      .map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => {
                            setSelectedMessage(msg);
                            markMessageAsRead(msg.id);
                          }}
                          className={`p-5 rounded-2xl bg-zinc-950/30 border text-xs space-y-2 relative overflow-hidden cursor-pointer transition-all duration-250 hover:scale-[1.005] active:scale-95 group ${
                            !readMessageIds.includes(msg.id)
                              ? "border-amber-500/30 bg-amber-500/[0.02]"
                              : "border-zinc-850 hover:border-amber-500/40 hover:bg-zinc-900/40"
                          }`}
                        >
                          {/* Unread indicator bar on left edge */}
                          {!readMessageIds.includes(msg.id) && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_#ef4444]" />
                          )}

                          <div className="absolute right-4 top-4 text-[9px] text-zinc-650 font-mono">
                            {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-block bg-amber-500/5 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase text-[8px] tracking-wider">
                              FROM: {msg.senderName}
                            </span>
                            {!readMessageIds.includes(msg.id) && (
                              <span className="inline-block bg-red-950/40 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase text-[7px] tracking-widest animate-pulse leading-none">
                                Unread Alert
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-zinc-100 uppercase text-sm tracking-wide group-hover:text-amber-400 transition-colors">
                            {msg.title}
                          </h4>
                          <p className="text-zinc-400 leading-relaxed font-sans line-clamp-2">{msg.content}</p>
                          <div className="text-[10px] text-amber-500/70 font-mono font-bold pt-1 uppercase flex items-center gap-1">
                            Click message to view full details as popup 🔍
                          </div>
                        </div>
                      ))}
                    {messages.filter((msg) => {
                      const term = inboxSearchQuery.toLowerCase();
                      return (
                        msg.title.toLowerCase().includes(term) ||
                        msg.content.toLowerCase().includes(term) ||
                        msg.senderName.toLowerCase().includes(term)
                      );
                    }).length === 0 && (
                      <div className="py-8 text-center text-zinc-550 text-xs font-mono">
                        No matches found for search query.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: Orders Tracking & Account Credentials Delivery */}
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <h3 className="font-black text-lg text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-5 h-5 text-amber-500" /> Purchased Accounts Credentials
                </h3>

                {/* History Search input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search orders (Account title, Ticket Code, Delivery details)..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-zinc-950/40 border border-zinc-850 focus:border-amber-550 focus:outline-none rounded-xl text-zinc-200 font-mono"
                  />
                </div>

                {orders.length === 0 ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/20 text-zinc-500 font-sans text-sm">
                    No transactions registered. Search catalog and complete orders!
                  </div>
                ) : (
                  <div className="space-y-5">
                    {orders
                      .filter((ord) => {
                        const term = historySearchQuery.toLowerCase();
                        return (
                          ord.catalogTitle.toLowerCase().includes(term) ||
                          ord.id.toLowerCase().includes(term) ||
                          (ord.deliveryDetails && ord.deliveryDetails.toLowerCase().includes(term))
                        );
                      })
                      .map((ord) => (
                      <div
                        key={ord.id}
                        className="p-5 rounded-2xl bg-zinc-950/30 border border-zinc-850 flex flex-col justify-between gap-4"
                      >
                        {/* Summary Header line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/60 pb-3 gap-2">
                          <div>
                            <div className="text-xs font-black text-zinc-200 uppercase tracking-wide">
                              {ord.catalogTitle}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Ticket Code: {ord.id} | Paid: LKR {ord.catalogPrice.toLocaleString()}
                            </span>
                          </div>

                          {/* Order Status Badges */}
                          <div className="flex items-center gap-1.5 self-start sm:self-auto">
                            {ord.status === "pending" && (
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-950/50 text-yellow-500 border border-yellow-500/20">
                                <Clock className="w-3 h-3" /> VERIFICATION PENDING
                              </span>
                            )}
                            {ord.status === "accepted" && (
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/50 text-blue-400 border border-blue-500/20">
                                <CheckCircle className="w-3 h-3" /> ACCEPTED
                              </span>
                            )}
                            {ord.status === "declined" && (
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/50 text-red-500 border border-red-500/20">
                                <XCircle className="w-3 h-3" /> SLIP DECLINED
                              </span>
                            )}
                            {ord.status === "delivered" && (
                              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 animate-pulse">
                                <ShieldCheck className="w-3 h-3" /> DELIVERED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status tracking stepper timeline indicator */}
                        {ord.status !== "declined" && (
                          <div className="py-3 px-4 rounded-xl bg-zinc-950/25 border border-zinc-900">
                            <span className="text-[8px] tracking-[0.15em] font-black uppercase font-mono text-zinc-500 block mb-3.5">
                              Real-Time Order status tracking
                            </span>
                            <div className="relative flex items-center justify-between">
                              {/* Background Line Connector */}
                              <div className="absolute left-[12%] right-[12%] top-[13px] h-[2px] bg-zinc-800 z-0" />
                              
                              {/* Active Line Connector */}
                              <div 
                                className="absolute left-[12%] top-[13px] h-[2px] bg-amber-500 transition-all duration-500 z-0"
                                style={{
                                  width: ord.status === "delivered" ? "76%" : ord.status === "accepted" ? "38%" : "0%"
                                }}
                              />

                              {/* STEP 1: Processing */}
                              <div className="flex flex-col items-center text-center z-10 w-[24%]">
                                <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] bg-amber-500 text-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.35)]">
                                  ✓
                                </div>
                                <span className="font-extrabold text-[9px] uppercase tracking-wide text-amber-500 mt-1">Processing</span>
                                <span className="text-[7.5px] font-mono text-zinc-550 leading-none mt-0.5">Slip received</span>
                              </div>

                              {/* STEP 2: Verified */}
                              <div className="flex flex-col items-center text-center z-10 w-[24%]">
                                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] transition-all duration-300 ${
                                  ord.status === "accepted" || ord.status === "delivered"
                                    ? "bg-amber-500 text-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
                                    : "bg-zinc-900 border-2 border-zinc-800 text-zinc-500"
                                }`}>
                                  {ord.status === "accepted" || ord.status === "delivered" ? "✓" : "2"}
                                </div>
                                <span className={`font-extrabold text-[9px] uppercase tracking-wide mt-1 ${
                                  ord.status === "accepted" || ord.status === "delivered" ? "text-amber-500" : "text-zinc-500"
                                }`}>Verified</span>
                                <span className="text-[7.5px] font-mono text-zinc-550 leading-none mt-0.5 font-sans">Payment checked</span>
                              </div>

                              {/* STEP 3: Completed */}
                              <div className="flex flex-col items-center text-center z-10 w-[24%]">
                                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] transition-all duration-300 ${
                                  ord.status === "delivered"
                                    ? "bg-emerald-500 text-zinc-950 shadow-[0_0_8px_rgba(16,185,129,0.35)]"
                                    : "bg-zinc-900 border-2 border-zinc-800 text-zinc-500"
                                }`}>
                                  {ord.status === "delivered" ? "✓" : "3"}
                                </div>
                                <span className={`font-extrabold text-[9px] uppercase tracking-wide mt-1 ${
                                  ord.status === "delivered" ? "text-emerald-400" : "text-zinc-500"
                                }`}>Completed</span>
                                <span className="text-[7.5px] font-mono text-zinc-555 leading-none mt-0.5 font-sans">Account sent</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* If status is DELIVERED, print credentials beautifully! */}
                        {ord.status === "delivered" ? (
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                            <div className="flex items-center gap-1 text-emerald-400 font-black uppercase text-[10px] tracking-widest leading-none">
                              <FolderLock className="w-4.5 h-4.5 text-emerald-400" /> Secure Credentials Credentials Delivery
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mt-1">
                              Your receipt verification succeeded. The account is delivered! Please use the matching credentials below to log in:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                              <div className="p-2.5 bg-zinc-950/60 rounded border border-zinc-800">
                                <span className="text-[9px] text-zinc-650 uppercase font-mono block">Delivery Details</span>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-mono text-zinc-200 select-all whitespace-pre-wrap">{ord.deliveryDetails || "Refer inbox for login"}</span>
                                  <button
                                    onClick={() => copyToClipboard(ord.deliveryDetails || "", ord.id + "details")}
                                    className="p-1 text-zinc-500 hover:text-white rounded transition cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="p-2.5 bg-zinc-950/60 rounded border border-zinc-800">
                                <span className="text-[9px] text-zinc-650 uppercase font-mono block">Direct Helpline WhatsApp</span>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-mono text-zinc-200">{ord.adminWhatsapp || "+94 XXXXXXXX"}</span>
                                  <button
                                    onClick={() => copyToClipboard(ord.adminWhatsapp || "", ord.id + "wa")}
                                    className="p-1 text-zinc-500 hover:text-white rounded transition cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {copiedId && (copiedId.startsWith(ord.id)) && (
                              <span className="text-[9px] text-emerald-500 font-mono block">Copied details to clipboard!</span>
                            )}
                          </div>
                        ) : ord.status === "declined" ? (
                          <div className="p-3 bg-red-950/20 border border-red-500/20 text-xs rounded-xl text-red-200">
                            The deposit slip screenshot submitted for this catalog has been rejected as invalid or fraudulent by store admins. Please submit a support ticket via WhatsApp if this is a mistake.
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Store staff is verifying your deposit receipt. Login details will list right here once approved.</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: Sell Account Form */}
            {activeTab === "sell_account" && (
              <motion.div
                key="sell_account"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-6 text-white space-y-6"
              >
                <div>
                  <h3 className="font-extrabold uppercase text-lg text-white tracking-wider flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-amber-500" /> Monetize Your Freefire Profile
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                    Submit your account listings directly to our portal. Once our administrators check and approve your billing price, the catalog launches in the active shop list automatically. 
                    <span className="text-amber-500 font-semibold block mt-1">🔒 Your password and credentials are highly encrypted and hidden from the public catalog page. Only you, verified admins and owners have access.</span>
                  </p>
                </div>

                <form onSubmit={handleSellAccountSubmit} className="space-y-6">
                  {/* Step A: Catalog Properties */}
                  <div className="space-y-4">
                    <div className="text-xs font-black uppercase text-amber-500 tracking-wider border-b border-zinc-800 pb-1">
                      PART 1: CATALOG DETAILS (Public Display)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Listing Display name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. VIP Vandal Level 72 | Elite skins"
                          value={sellTitle}
                          onChange={(e) => setSellTitle(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs uppercase text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Server Name
                        </label>
                        <select
                          value={sellServer}
                          onChange={(e) => setSellServer(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        >
                          <option value="ASIA">ASIA</option>
                          <option value="EUROPE">EUROPE</option>
                          <option value="BHARAT">BHARAT</option>
                          <option value="NORTH AMERICA">NORTH AMERICA</option>
                          <option value="MIDDLE EAST">MIDDLE EAST</option>
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Account level
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="Level"
                          value={sellLevel}
                          onChange={(e) => setSellLevel(Number(e.target.value))}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-4">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Account Price (LKR)
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="LKR Rs."
                          value={sellPrice}
                          onChange={(e) => setSellPrice(Number(e.target.value))}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="md:col-span-8">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Account images (Enter up to 5 URLs separated by commas)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. https://domain.com/img1.jpg, https://domain.com/img2.jpg"
                          value={sellImages}
                          onChange={(e) => setSellImages(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                          Upload your photos to{" "}
                          <a
                            href="https://imgbb.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-500 hover:text-amber-400 underline font-bold"
                          >
                            imgbb.com
                          </a>{" "}
                          and copy the link, then paste it below.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          🔫 Guns skins (Number)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="e.g. 15"
                          value={sellGuns}
                          onChange={(e) => setSellGuns(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          👕 Fashion outfits sets (Number)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="e.g. 45"
                          value={sellFashion}
                          onChange={(e) => setSellFashion(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          🎭 Emotes Collection (Number)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="e.g. 25"
                          value={sellEmotes}
                          onChange={(e) => setSellEmotes(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                        Sellers custom descriptive note
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Played since Season 4. Extremely clean statistics. Facebook binds ready."
                        value={sellDesc}
                        onChange={(e) => setSellDesc(e.target.value)}
                        className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Step B: Secure Credentials */}
                  <div className="space-y-4 pt-4 border-t border-zinc-900/60 font-sans">
                    <div className="text-xs font-black uppercase text-amber-500 tracking-wider border-b border-zinc-805 dark:border-zinc-800 pb-1 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-500" /> PART 2: PRIVILEGED ACCESS (Admins/Seller only)
                    </div>

                    <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-zinc-800 dark:text-zinc-350 rounded-xl space-y-1 text-xs leading-relaxed">
                      <div className="text-[11px] font-extrabold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        🛡️ Secure Escrow Credentials Protection
                      </div>
                      <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                        This information is isolated, encrypted, and strictly authorized. Only **certified platform moderators and main administrators** can read these credentials to perform manual handovers, password modifications, or authentication audits once standard payments are cleared. Your credentials are never publicly listed or shared with unverified clients, providing a 100% scam-free trade guarantee.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-3">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          LOGIN METHOD
                        </label>
                        <select
                          value={loginMethod}
                          onChange={(e) => setLoginMethod(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        >
                          <option value="Google account">Google Bind</option>
                          <option value="Facebook profile">Facebook Bind</option>
                          <option value="VK Account">VK Bind</option>
                          <option value="Huawei ID">Huawei Bind</option>
                          <option value="Other Method">Other / Custom</option>
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Login ID/Email/Username
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. login.ff@gmail.com"
                          value={loginUser}
                          onChange={(e) => setLoginUser(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          Access Account Password
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Secret characters..."
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          2FA Backup Codes list (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 524589, 632145 (Allows instant delivery)"
                          value={backupCodes}
                          onChange={(e) => setBackupCodes(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                          WhatsApp contact (to notify you when a buyer transfers funds)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +94 XXXXXXXX"
                          value={sellerWhatsapp}
                          onChange={(e) => setSellerWhatsapp(e.target.value)}
                          className="w-full py-2.5 px-3 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission logs status */}
                  {formSuccess && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 p-4 rounded-xl">
                      <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                      <span>Excellent! Your Freefire profile credentials and catalog display details was forwarded. Verification ticket created! It will appear listed in the shop as soon as admins complete safety evaluations.</span>
                    </div>
                  )}
                  {formError && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/10 p-4 rounded-xl">
                      <XCircle className="w-5 h-5 shrink-0 text-red-500" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-zinc-950 font-black tracking-widest text-xs uppercase rounded-xl transition duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? "SUBMITTING LISTING..." : "SUBMIT ACCOUN FOR AUCTION"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* TAB: Wishlist */}
            {activeTab === "wishlist" && (
              <motion.div
                key="wishlist"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="font-black text-lg text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" /> My Saved Wishlist
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">
                    {allCatalogs.filter((c) => currentUser.wishlist?.includes(c.id)).length} items saved
                  </span>
                </div>

                {allCatalogs.filter((c) => currentUser.wishlist?.includes(c.id)).length === 0 ? (
                  <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-850 bg-zinc-950/20 text-zinc-500 font-sans text-sm">
                    No items in your wishlist yet. Tap the heart icon on store listings to add items here!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allCatalogs
                      .filter((c) => currentUser.wishlist?.includes(c.id))
                      .map((item) => (
                        <div key={item.id} className="relative group">
                          <div className="rounded-2xl border border-zinc-850 bg-zinc-950/40 overflow-hidden hover:border-zinc-700 transition relative flex flex-col h-full text-xs">
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                              <img
                                src={item.images?.[0] || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format"}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                              />
                              <div className="absolute top-2 left-2 flex gap-1">
                                <span className="bg-zinc-950/90 text-[9px] font-sans px-1.5 py-0.5 rounded text-amber-500 uppercase tracking-widest border border-amber-500/20">{item.server}</span>
                                <span className="bg-zinc-950/90 text-[9px] font-sans px-1.5 py-0.5 rounded text-red-500 uppercase tracking-widest border border-red-500/20">LV.{item.level}</span>
                              </div>
                              <button
                                onClick={() => onToggleWishlist?.(item.id)}
                                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-zinc-900/90 rounded border border-white/5 transition flex items-center justify-center cursor-pointer active:scale-95 text-red-500"
                              >
                                <Heart className="w-3.5 h-3.5 fill-red-500" />
                              </button>
                            </div>
                            <div className="p-4 flex flex-col justify-between flex-grow gap-3">
                              <div>
                                <h4 className="font-extrabold text-zinc-100 uppercase tracking-wide truncate">{item.title}</h4>
                                <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[9px] text-zinc-500 font-mono text-center">
                                  <div className="bg-zinc-950 rounded py-1 border border-zinc-900">🔫 {item.guns || 0}</div>
                                  <div className="bg-zinc-950 rounded py-1 border border-zinc-900">👕 {item.fashion || 0}</div>
                                  <div className="bg-zinc-950 rounded py-1 border border-zinc-900">🎭 {item.emotes || 0}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2.5">
                                <span className="text-amber-500 font-mono text-xs font-black">LKR {item.price.toLocaleString()}</span>
                                <button
                                  onClick={() => onOpenCatalogDetail?.(item)}
                                  className="py-1 px-3 bg-amber-500 text-zinc-950 font-black tracking-widest text-[8px] uppercase rounded-md transition duration-150 active:scale-95 cursor-pointer hover:bg-amber-400"
                                >
                                  BUY NOW 🛒
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected message interactive detailed coordinates popup modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5 drop-shadow-2xl">
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="border-b border-zinc-900 pb-3.5 mt-2">
              <span className="inline-flex bg-amber-500/5 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase text-[9px] tracking-wider mb-2">
                FROM MODERATOR: {selectedMessage.senderName}
              </span>
              <h3 className="font-black text-lg text-white uppercase tracking-wide leading-snug">
                {selectedMessage.title}
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                Delivered on {new Date(selectedMessage.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="overflow-y-auto max-h-[250px] pr-2 font-sans text-xs text-zinc-350 leading-relaxed bg-zinc-905 border border-zinc-900 rounded-xl p-4 whitespace-pre-wrap select-all selection:bg-amber-500 selection:text-zinc-950">
              {selectedMessage.content}
            </div>

            <p className="text-[10px] text-zinc-550 font-sans italic leading-relaxed">
              💡 Tip: Click inside the message box rules to highlight and double-tap copy credentials. Need help binding? Reach out directly via standard WhatsApp support line.
            </p>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedMessage.content);
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-xl text-[10px] font-bold uppercase transition active:scale-95 cursor-pointer"
              >
                Copy Content
              </button>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-[10px] font-black uppercase transition active:scale-95 cursor-pointer"
              >
                Close Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
