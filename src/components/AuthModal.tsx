import React, { useState } from "react";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile, UserRole, SiteSettings } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, ShieldAlert, BadgeCheck, Gamepad2, X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile | null) => void;
  settings: SiteSettings | null;
}

export async function checkOrCreateUserProfile(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string,
  customRole?: UserRole
): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      // Keep credentials synchronized and ensure role and status exist
      if (!existing.role) {
        existing.role = "member";
      }
      if (!existing.status) {
        existing.status = "active";
      }
      return existing;
    } else {
      // Setup bootstrapped main owner
      let role: UserRole = "member";
      if (email.toLowerCase() === "nimesh.designs.site@gmail.com") {
        role = "owner";
      } else if (customRole) {
        role = customRole;
      }

      const profile: UserProfile = {
        id: uid,
        email: email,
        name: displayName || "Survivor",
        role: role,
        status: "active",
        photoURL: photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${uid}`,
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, profile);
      } catch (err) {
        console.warn("Failed to set user profile document on server (offline):", err);
      }
      return profile;
    }
  } catch (error) {
    console.warn("Firestore user profile fetch failed (offline/delayed), generating dynamic sync profile:", error);
    // Offline resilience: synthesize valid UserProfile structure derived from Auth User credentials
    let role: UserRole = "member";
    if (email.toLowerCase() === "nimesh.designs.site@gmail.com") {
      role = "owner";
    } else if (customRole) {
      role = customRole;
    }
    return {
      id: uid,
      email: email,
      name: displayName || "Survivor",
      role: role,
      status: "active",
      photoURL: photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${uid}`,
      createdAt: new Date().toISOString(),
    };
  }
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, settings }: AuthModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const storeName = settings?.siteName || "FIRE STORE";

  // Authenticate through Firebase Google Sign-In (Official)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email) {
        const profile = await checkOrCreateUserProfile(
          result.user.uid,
          result.user.email,
          result.user.displayName || "Survivor",
          result.user.photoURL || undefined
        );
        if (profile.status === "banned") {
          await signOut(auth);
          setError("Your account has been banned from accessing this storefront.");
          onAuthSuccess(null);
        } else {
          onAuthSuccess(profile);
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to log in with Google Pop-up.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          id="auth-modal-container"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-sm overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-900 dark:text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-8 h-8 text-amber-500 animate-pulse" />
              <div className="text-xl font-black tracking-wider font-mono text-amber-500 uppercase">
                {storeName} LOGIN
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-zinc-500 dark:text-zinc-300 text-xs mb-6 leading-relaxed">
            Access your secure profile in `{storeName}` to complete purchases, sell accounts under admin escrow, and check order statuses.
          </p>

          {/* Genuine Google Firebase Authorization */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl text-xs uppercase tracking-wide shadow-md transition duration-200 cursor-pointer border border-zinc-800 dark:border-transparent"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.79 5.79 0 0 1 8.2 12.725a5.79 5.79 0 0 1 5.79-5.79c2.519 0 4.114 1.455 4.114 1.455l2.91-2.91S18.528 3.2 13.99 3.2C8.65 3.2 4.2 7.65 4.2 13s4.45 9.8 9.79 9.8c5.44 0 9.53-3.824 9.53-9.53h-11.28Z"
              />
            </svg>
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-200 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

