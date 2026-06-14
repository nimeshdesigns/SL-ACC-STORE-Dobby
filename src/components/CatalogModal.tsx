import React, { useState, useRef, useEffect } from "react";
import { Catalog, UserProfile, SiteSettings, Order } from "../types";
import { db } from "../firebase";
import { collection, doc, setDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Trophy,
  Tag,
  CreditCard,
  Send,
  Upload,
  AlertCircle,
  FileText,
  Phone,
  MessageSquare,
  Lock,
  Sparkles,
} from "lucide-react";

interface CatalogModalProps {
  catalog: Catalog | null;
  currentUser: UserProfile | null;
  settings: SiteSettings | null;
  onClose: () => void;
  onOpenAuth: () => void;
}

export default function CatalogModal({
  catalog,
  currentUser,
  settings,
  onClose,
  onOpenAuth,
}: CatalogModalProps) {
  const [activeStep, setActiveStep] = useState<"details" | "billing">("details");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form Fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [voiceCall, setVoiceCall] = useState("");
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Status flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize fields with logged-in user profile if available
  useEffect(() => {
    if (currentUser) {
      setClientName(currentUser.name);
      setClientEmail(currentUser.email);
      setWhatsapp(currentUser.whatsappNumber || "");
      setVoiceCall(currentUser.callNumber || "");
    }
  }, [currentUser, catalog]);

  if (!catalog) return null;

  const images = catalog.images && catalog.images.length > 0
    ? catalog.images
    : ["https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80"];

  const handleNextImage = () => {
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  // Convert uploaded image file to lightweight, compressed Base64 string for persistent Firestore receipt tracking
  const handleReceiptFile = (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("File limit exceeded: Please upload a receipt under 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const rawBase64 = reader.result;
        // Compress using Canvas before setting state
        const img = new Image();
        img.src = rawBase64;
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 800;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
            setReceiptBase64(compressedBase64);
            setSubmitError(null);
          } else {
            setReceiptBase64(rawBase64);
            setSubmitError(null);
          }
        };
        img.onerror = () => {
          setReceiptBase64(rawBase64);
          setSubmitError(null);
        };
      }
    };
    reader.onerror = () => {
      setSubmitError("Failed to parse receipt image. Try another file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleReceiptFile(e.dataTransfer.files[0]);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!receiptBase64) {
      setSubmitError("Please upload a picture of the deposit slip or e-receipt.");
      return;
    }
    if (!clientName || !clientEmail || !whatsapp || !voiceCall) {
      setSubmitError("Please fill out your billing name, email, WhatsApp and Voice Call numbers.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderId = "order_" + Math.random().toString(36).substring(2, 11).toUpperCase();
      const orderRef = doc(collection(db, "orders"), orderId);

      const orderPayload: Order = {
        id: orderId,
        catalogId: catalog.id,
        catalogTitle: catalog.title,
        catalogPrice: catalog.price,
        clientId: currentUser.id,
        clientName: clientName,
        clientEmail: clientEmail,
        whatsappNumber: whatsapp,
        callNumber: voiceCall,
        receiptImage: receiptBase64,
        type: "buy",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(orderRef, orderPayload);
      setSubmitSuccess(true);
    } catch (err: any) {
      console.error(err);
      setSubmitError("Transaction submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="catalog-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <AnimatePresence>
        <motion.div
          id="catalog-modal-container"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl text-zinc-900 dark:text-white my-8"
        >
          {/* Close main */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {submitSuccess ? (
            <div id="checkout-success-view" className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black tracking-wider text-amber-500 uppercase mb-3">
                Receipt Verification Pending
              </h2>
              <p className="text-zinc-300 max-w-md mx-auto text-sm leading-relaxed mb-6">
                Excellent! Your order has been registered under verification ticket code. The Admin Team will check your deposit slip bank details and verify payment. Login methods and credentials for this account will appear directly inside your profile inbox shortly!
              </p>
              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-sm font-bold uppercase rounded-xl transition cursor-pointer"
                >
                  Return to Store
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Media Carousel Slider (Left Column) */}
              <div className="md:col-span-6 relative aspect-square md:aspect-auto md:h-[580px] bg-black flex flex-col justify-between">
                <div className="relative w-full h-full flex items-center justify-center group cursor-zoom-in">
                  <img
                    src={images[activeImageIdx]}
                    alt={`Slider image ${activeImageIdx + 1}`}
                    referrerPolicy="no-referrer"
                    onClick={() => setLightboxImage(images[activeImageIdx])}
                    className="w-full h-full object-contain hover:scale-[1.01] transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30 pointer-events-none" />

                  {/* Slider Control arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-3 p-1.5 bg-black/60 hover:bg-amber-500 text-white rounded-lg opacity-40 group-hover:opacity-100 transition duration-150 cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-3 p-1.5 bg-black/60 hover:bg-amber-500 text-white rounded-lg opacity-40 group-hover:opacity-100 transition duration-150 cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Indicator bubbles */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIdx(i)}
                        className={`w-2 h-2 rounded-full transition ${
                          activeImageIdx === i ? "bg-amber-500 w-4" : "bg-zinc-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Checkout Interactive Board (Right Column) */}
              <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between overflow-y-auto md:h-[580px]">
                {activeStep === "details" ? (
                  <div id="catalog-details-view" className="flex flex-col h-full justify-between gap-6">
                    {/* Level & Server Tagline */}
                    <div>
                      <div className="flex gap-2.5 mb-2">
                        <span className="flex items-center gap-1 bg-zinc-950 px-2 py-1 text-xs font-black text-amber-500 rounded border border-amber-500/20 uppercase tracking-widest">
                          <Globe className="w-3.5 h-3.5" />
                          {catalog.server} SERVER
                        </span>
                        <span className="flex items-center gap-1 bg-zinc-950 px-2 py-1 text-xs font-black text-red-500 rounded border border-red-500/20 uppercase tracking-widest">
                          <Trophy className="w-3.5 h-3.5" />
                          LV {catalog.level}
                        </span>
                      </div>

                      <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
                        {catalog.title}
                      </h2>
                      <div className="w-12 h-1 bg-amber-500 mt-2 mb-4" />

                      <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                        {catalog.description || "No customized description provided. This account features elite skins collections, fully activated tier season rewards, and exclusive custom badges."}
                      </p>

                      {/* Attributes (Guns, Clothing, Emotes) */}
                      <div className="space-y-3.5">
                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                            🔫 Gun skins available
                          </span>
                          <span className="text-sm text-zinc-100 font-black font-mono block">
                            {catalog.guns || 0} EXCLUSIVE WEAPONS
                          </span>
                        </div>

                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                            👕 Fashion Sets / Outfit Packs
                          </span>
                          <span className="text-sm text-zinc-100 font-black font-mono block">
                            {catalog.fashion || 0} CLOTHING BUNDLES
                          </span>
                        </div>

                        <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                            🎭 Emotes Unlocked
                          </span>
                          <span className="text-sm text-zinc-100 font-black font-mono block">
                            {catalog.emotes || 0} EMOTES ATTAINED
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer price line */}
                    <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">
                          Unit Cost Price
                        </span>
                        <span className="text-2xl font-black text-amber-500 font-mono">
                          LKR {catalog.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {catalog.status === "sold" ? (
                        <button
                          disabled
                          className="flex items-center gap-1.5 px-6 py-3.5 bg-zinc-800 text-zinc-500 rounded-xl font-bold uppercase text-xs border border-zinc-700 cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" />
                          Sold Out
                        </button>
                      ) : (currentUser && currentUser.status !== "banned") ? (
                        <button
                          onClick={() => setActiveStep("billing")}
                          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                        >
                          Buy Account
                        </button>
                      ) : currentUser ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono italic">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          Checking credentials...
                        </div>
                      ) : (
                        <button
                          onClick={onOpenAuth}
                          className="px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                        >
                          Sign In to Purchase
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitOrder} id="checkout-billing-form" className="flex flex-col h-full justify-between gap-5">
                    {/* Header bar back arrow */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={() => setActiveStep("details")}
                          className="text-xs font-mono text-zinc-400 hover:text-amber-500 uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back to details
                        </button>
                        <span className="text-zinc-400 text-xs font-bold font-mono">
                          STEP 2 OF 2
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-500" /> Administrative Bank Transfer
                      </h3>

                      {/* Bank Options details box */}
                      <div className="my-3.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-zinc-300">
                        <div className="font-bold text-amber-500 mb-1 uppercase tracking-wide">
                          Official Store Deposit details
                        </div>
                        {settings ? (
                          <div className="space-y-2">
                            {settings.bankDetails && (
                              <div>
                                <span className="text-zinc-500 font-mono uppercase text-[9px] block">🏦 Bank Details</span>
                                <span className="font-mono text-zinc-300 block bg-zinc-950/30 p-1 rounded mt-0.5 whitespace-pre-wrap">{settings.bankDetails}</span>
                              </div>
                            )}
                            {settings.ezCashDetails && (
                              <div>
                                <span className="text-zinc-500 font-mono uppercase text-[9px] block">📱 Ez Cash Details</span>
                                <span className="font-mono text-zinc-300 block bg-zinc-950/30 p-1 rounded mt-0.5 whitespace-pre-wrap">{settings.ezCashDetails}</span>
                              </div>
                            )}
                            {settings.otherPaymentDetails && (
                              <div>
                                <span className="text-zinc-500 font-mono uppercase text-[9px] block">💳 Other Platforms</span>
                                <span className="font-mono text-zinc-300 block bg-zinc-950/30 p-1 rounded mt-0.5 whitespace-pre-wrap">{settings.otherPaymentDetails}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-zinc-500">No payment channels loaded. Default Bank Transfer available.</div>
                        )}
                      </div>

                      {/* Billing fields mapping */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                              Receiver Full name
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Doe"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              className="w-full py-2 px-3 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 uppercase focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1">
                              Contact Email
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. user@gmail.com"
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              className="w-full py-2 px-3 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-emerald-400" /> WhatsApp Contact
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="+94 77 XXXXXXX"
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(e.target.value)}
                              className="w-full py-2 px-3 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-mono font-bold block mb-1 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-amber-500" /> Normal voice number
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 077XXXXXXX"
                              value={voiceCall}
                              onChange={(e) => setVoiceCall(e.target.value)}
                              className="w-full py-2 px-3 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Image drag-drop uploader block */}
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-400 uppercase font-mono font-bold block mb-1">
                            Deposit transaction receipt / slip screenshot
                          </label>
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[100px] ${
                              dragActive
                                ? "border-amber-500 bg-amber-500/5"
                                : receiptBase64
                                  ? "border-emerald-500/50 bg-emerald-500/5"
                                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
                            }`}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleReceiptFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            {receiptBase64 ? (
                              <div className="flex items-center gap-2 text-emerald-400">
                                <FileText className="w-8 h-8 shrink-0 text-emerald-400" />
                                <div className="text-left">
                                  <div className="text-xs font-bold uppercase truncate max-w-[200px]">
                                    {receiptBase64.startsWith("data:") ? "Receipt File Loaded" : "Receipt Link Bound"}
                                  </div>
                                  <div className="text-[9px] text-zinc-400">Click or drag/paste to replace</div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-7 h-7 text-zinc-500 mb-1.5 animate-pulse" />
                                <div className="text-xs text-zinc-400 font-medium">
                                  Drag and drop deposit receipt picture here
                                </div>
                                <div className="text-[9px] text-zinc-650 mt-0.5">
                                  Supports JPG, PNG (Max 2MB)
                                </div>
                              </>
                            )}
                          </div>

                          <div className="space-y-1 pt-1 text-left">
                            <span className="text-[10px] text-zinc-450 block font-bold leading-normal">
                              Upload your photos to{" "}
                              <a
                                href="https://imgbb.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-500 hover:text-amber-400 underline font-extrabold"
                              >
                                imgbb.com
                              </a>{" "}
                              and copy the link, then paste it below.
                            </span>
                            <input
                              type="text"
                              value={receiptBase64.startsWith("data:") ? "" : receiptBase64}
                              onChange={(e) => setReceiptBase64(e.target.value)}
                              placeholder="Or paste the direct image URL here"
                              className="w-full py-1.5 px-3 text-2xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Error bar */}
                      {submitError && (
                        <div className="flex items-start gap-2 mt-3 p-2 bg-red-950/40 border border-red-500/20 rounded-xl text-red-200 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>{submitError}</span>
                        </div>
                      )}
                    </div>

                    {/* Submit Order action buttons */}
                    <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">Total cost</span>
                        <span className="text-lg font-extrabold text-amber-500 font-mono">
                          LKR {catalog.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? "PROCESSING..." : "SUBMIT RECEIPT"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bigger image popup lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt="Enlarged account screenshot"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-zinc-800"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
