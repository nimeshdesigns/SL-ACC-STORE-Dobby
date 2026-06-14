import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Tag } from "lucide-react";
import { SiteSettings } from "../types";

interface LightboxModalProps {
  settings: SiteSettings | null;
}

export default function LightboxModal({ settings }: LightboxModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (settings && settings.lightboxEnabled && !hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShown(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (settings && !settings.lightboxEnabled) {
      setIsOpen(false);
    }
  }, [settings, hasShown]);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen || !settings) return null;

  return (
    <div id="lightbox-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/85 backdrop-blur-md">
      <AnimatePresence>
        <motion.div
          id="lightbox-container"
          initial={{ scale: 0.85, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="relative w-full max-w-[290px] sm:max-w-md md:max-w-lg overflow-hidden bg-gradient-to-br from-zinc-900 to-black border-2 border-amber-500/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl text-center text-white"
        >
          {/* Top light rays */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 blur-[50px] pointer-events-none rounded-full" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1 sm:p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-full transition"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Decorative Fire badge */}
          <div className="mx-auto mt-2 sm:mt-4 inline-flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-500 mb-2 sm:mb-4 animate-bounce">
            <Sparkles className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
          </div>

          <h2 className="text-base sm:text-2xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent uppercase mb-1 sm:mb-2">
            {settings.lightboxTitle || "GAMING EVENTS SEASON"}
          </h2>

          <div className="flex justify-center items-center gap-1 text-[9px] sm:text-xs text-amber-400 font-semibold mb-2.5 sm:mb-4">
            <Tag className="w-3 h-3 sm:w-3.5 h-3.5" />
            <span>EXCLUSIVE DISCOUNT EVENT</span>
          </div>

          {/* Visual image */}
          {settings.lightboxImage ? (
            <div className="relative w-full h-24 sm:h-auto sm:aspect-video rounded-xl overflow-hidden mb-3 sm:mb-5 border border-zinc-805 bg-zinc-950">
              <img
                src={settings.lightboxImage}
                alt="Promo advertisement"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="w-full h-24 sm:h-auto sm:aspect-video rounded-xl border border-dashed border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-5 text-zinc-500">
              <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 opacity-40 text-amber-500 animate-pulse" />
              <div className="text-[10px] sm:text-xs px-2 line-clamp-1">Battle Pass discounts, skin releases & cheap vouchers available!</div>
            </div>
          )}

          <p className="text-zinc-350 text-[10px] sm:text-sm md:text-base leading-normal sm:leading-relaxed mb-4 sm:mb-6 font-sans">
            {settings.lightboxDescription || "Enjoy up to 40% OFF all verified VIP accounts today! Contact support or browse our catalogs to make a instant purchase."}
          </p>

          <button
            onClick={handleClose}
            className="w-full py-2 sm:py-3.5 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold tracking-widest text-[11px] sm:text-sm rounded-xl uppercase shadow-lg shadow-amber-600/30 active:scale-95 transition-all text-center cursor-pointer"
          >
            ENTER THE STORE
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
