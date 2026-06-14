import React from "react";
import { Catalog } from "../types";
import { Trophy, Globe, ShoppingCart, Lock, Heart } from "lucide-react";
import { motion } from "motion/react";

interface CatalogCardProps {
  key?: string;
  catalog: Catalog;
  onOpenDetails: (catalog: Catalog) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (catalogId: string) => void;
}

export default function CatalogCard({ catalog, onOpenDetails, isWishlisted, onToggleWishlist }: CatalogCardProps) {
  const isSold = catalog.status === "sold";
  const isPending = catalog.status === "pending_verification";

  // Use elegant stock gaming thumbnails if no custom graphics are provided
  const thumbnail = catalog.images && catalog.images.length > 0 
    ? catalog.images[0] 
    : "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60";

  return (
    <motion.div
      id={`catalog-card-${catalog.id}`}
      whileHover={{ y: -4 }}
      onClick={() => onOpenDetails(catalog)}
      transition={{ duration: 0.15 }}
      className={`catalog-card-container group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border cursor-pointer ${
        isSold 
          ? "border-zinc-200 dark:border-zinc-800 opacity-75" 
          : isPending 
            ? "border-yellow-500/40" 
            : "border-zinc-200 dark:border-zinc-800/80 hover:border-amber-500/50 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-amber-500/5"
      } shadow-md dark:shadow-none transition-all duration-200 text-zinc-900 dark:text-white`}
    >
      {/* Glow highlight on hover */}
      {!isSold && !isPending && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition duration-300" />
      )}

      {/* Account images & badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950/90">
        <img
          src={thumbnail}
          alt={catalog.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-305 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 dark:from-zinc-950 via-transparent to-transparent opacity-90 pointer-events-none" />

        {/* Server & Level badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
          <span className="flex items-center gap-1 rounded-md bg-zinc-950/90 px-2 py-1 text-[10px] font-bold text-amber-500 border border-amber-500/30 uppercase tracking-wider">
            <Globe className="w-3 h-3" />
            {catalog.server}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-zinc-950/90 px-2 py-1 text-[10px] font-bold text-red-500 border border-red-500/30 uppercase tracking-wider">
            <Trophy className="w-3 h-3" />
            LV. {catalog.level}
          </span>
        </div>

        {/* Wishlist toggle heart button overlay */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(catalog.id);
            }}
            className="absolute top-3 right-3 z-25 p-1.5 rounded-lg bg-black/60 hover:bg-zinc-900/90 text-white border border-white/5 transition flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "text-red-500 fill-red-500 stroke-red-500" : "text-zinc-300 hover:text-red-400"}`} />
          </button>
        )}

        {/* Sold Watermark or Verification watermark */}
        {isSold && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 backdrop-blur-[1px]">
            <span className="skew-y-[-6deg] rotate-[-12deg] border-4 border-red-500/80 px-4 py-2 font-black text-xl tracking-widest text-red-500 bg-black/80 rounded-lg shadow-lg shadow-red-500/20 uppercase">
              Sold Out
            </span>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
            <span className="skew-y-[-4deg] border-2 border-yellow-500 px-3 py-1.5 font-bold text-sm tracking-wider text-yellow-500 bg-black/95 rounded-md shadow-md uppercase">
              Verifying Listing
            </span>
          </div>
        )}
      </div>

      {/* Body content */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <h3 className="line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors uppercase tracking-wide">
            {catalog.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-sans min-h-[32px]">
            {catalog.description || "No custom description specified. Highly customized skins collection, gun status items loaded."}
          </p>

          {/* Quick stats columns */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
            <div className="rounded-lg bg-zinc-100/80 dark:bg-zinc-950/40 p-1.5 border border-zinc-200 dark:border-zinc-800/40 text-center">
              <span className="block text-zinc-500/80 dark:text-zinc-550 text-[8px] uppercase font-bold">🔫 Guns</span>
              <span className="block text-zinc-800 dark:text-zinc-200 font-extrabold truncate">{catalog.guns || 0}</span>
            </div>
            <div className="rounded-lg bg-zinc-100/80 dark:bg-zinc-950/40 p-1.5 border border-zinc-200 dark:border-zinc-800/40 text-center">
              <span className="block text-zinc-500/80 dark:text-zinc-550 text-[8px] uppercase font-bold">👕 Fashion</span>
              <span className="block text-zinc-800 dark:text-zinc-200 font-extrabold truncate">{catalog.fashion || 0}</span>
            </div>
            <div className="rounded-lg bg-zinc-100/80 dark:bg-zinc-950/40 p-1.5 border border-zinc-200 dark:border-zinc-800/40 text-center">
              <span className="block text-zinc-500/80 dark:text-zinc-550 text-[8px] uppercase font-bold">🎭 Emotes</span>
              <span className="block text-zinc-800 dark:text-zinc-200 font-extrabold truncate">{catalog.emotes || 0}</span>
            </div>
          </div>
        </div>

        {/* Price & button line */}
        <div className="mt-4 pt-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800/50">
          <div>
            <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Pricing</span>
            <span className="font-extrabold text-amber-500 dark:text-amber-500 text-lg leading-tight font-mono">
              LKR {catalog.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation(); // Stop parent click trigger from firing twice!
              onOpenDetails(catalog);
            }}
            className={`flex items-center gap-1 rounded-xl py-2 px-3.5 text-xs font-bold uppercase transition duration-150 active:scale-95 cursor-pointer ${
              isSold 
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-700 cursor-not-allowed" 
                : isPending 
                  ? "bg-zinc-100 dark:bg-zinc-800 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20" 
                  : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold shadow-md shadow-orange-500/10 hover:shadow-orange-500/20"
            }`}
          >
            {isSold ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Sold
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                Details
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
