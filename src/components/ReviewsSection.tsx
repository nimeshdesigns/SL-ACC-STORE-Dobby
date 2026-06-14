import React, { useState, useEffect } from "react";
import { Review, UserProfile } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { Star, MessageSquare, AlertCircle, Sparkles, Send, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReviewsSectionProps {
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

export default function ReviewsSection({ currentUser, onOpenAuth }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "highest">("newest");
  
  // Status flags
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // Read only 'approved' feedback for general public
    const q = query(
      collection(db, "reviews"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Review[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Review);
      });
      setReviews(items);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!newComment.trim()) {
      setSubmitError("Review comment cannot be empty!");
      return;
    }
    if (newComment.length > 500) {
      setSubmitError("Review comment cannot exceed 500 characters!");
      return;
    }

    const reviewId = "rev_" + Math.random().toString(36).substring(2, 11).toUpperCase();
    try {
      const reviewRef = doc(collection(db, "reviews"), reviewId);

      const payload: Review = {
        id: reviewId,
        clientId: currentUser.id,
        clientName: currentUser.name,
        clientPhoto: currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.id}`,
        rating: newRating,
        comment: newComment,
        status: "pending", // starts as pending verification
        createdAt: new Date().toISOString(),
      };

      await setDoc(reviewRef, payload);
      setNewComment("");
      setNewRating(5);
      setSubmitSuccess(true);
      setSubmitError(null);
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      setSubmitError("Failed to save review: " + err.message);
      handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review forever?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
    } catch (err: any) {
      alert("Failed to delete review: " + (err.message || err));
      handleFirestoreError(err, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  const getStarColor = (index: number, rating: number) => {
    return index < rating ? "text-amber-500 fill-amber-500" : "text-zinc-650";
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === "highest") {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div id="reviews-board-wrapper" className="mt-16 border-t border-zinc-200 dark:border-zinc-800/80 pt-16 max-w-7xl mx-auto px-4 md:px-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="text-amber-500 font-extrabold uppercase text-xs tracking-widest flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 animate-spin text-amber-500" /> CUSTOMER REVIEWS
          </div>
          <h2 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-wider">
            User Experience Feedbacks
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="font-bold text-lg text-zinc-800 dark:text-zinc-100">
            {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "5.0"}
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            / 5.0 ({reviews.length} rated)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form to submit */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-805/80 rounded-2xl p-6 h-fit text-zinc-800 dark:text-white shadow-sm dark:shadow-none">
          <h3 className="font-bold uppercase tracking-wider text-sm mb-1.5 flex items-center gap-1.5 text-zinc-800 dark:text-white">
            <MessageSquare className="w-4 h-4 text-amber-500" /> Rate our services
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
            Share your experience! Positive and negative feedbacks are scrutinized by staff to ensure premium accounts deliveries.
          </p>

          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating Stars clickable selectors */}
            <div>
              <label className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-widest block mb-1">
                Selected Rating Star Counts
              </label>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setNewRating(i + 1)}
                    className="p-1 focus:outline-none transition-transform hover:scale-115 cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        i < newRating ? "text-amber-500 fill-amber-500" : "text-zinc-300 dark:text-zinc-650"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-widest block">
                  Feedback Comment Detail
                </label>
                <span className={`text-[10px] font-mono font-bold ${newComment.length >= 500 ? "text-red-500 animate-pulse" : newComment.length >= 450 ? "text-amber-500" : "text-zinc-400 dark:text-zinc-500"}`}>
                  {newComment.length} / 500
                </span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={500}
                placeholder="Write your store feedback review description here..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full text-xs p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-zinc-800 dark:text-zinc-200 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Response messages banner */}
            {submitSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/10 p-2.5 rounded-xl">
                <span>Your review has been logged! Staff will moderate shortly.</span>
              </div>
            )}
            {submitError && (
              <div className="flex items-start gap-1.5 text-xs text-red-400 bg-red-950/20 border border-red-500/10 p-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{submitError}</span>
              </div>
            )}

            {currentUser ? (
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Submit Feedback
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-300 font-bold uppercase text-xs rounded-xl cursor-pointer border border-zinc-200 dark:border-zinc-700"
              >
                Sign In to Rate
              </button>
            )}
          </form>
        </div>

        {/* Right Column: List of reviews */}
        <div className="lg:col-span-8 space-y-4">
          {reviews.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-900/60 pb-3 gap-3 mr-1">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-mono">
                Verified Testimonials ({reviews.length})
              </span>
              <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-900 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setSortBy("newest")}
                  className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all cursor-pointer ${
                    sortBy === "newest"
                      ? "bg-amber-500 text-zinc-950 shadow font-mono"
                      : "text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-150 font-mono"
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("highest")}
                  className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all cursor-pointer ${
                    sortBy === "highest"
                      ? "bg-amber-500 text-zinc-950 shadow font-mono"
                      : "text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-150 font-mono"
                  }`}
                >
                  Highest Rating
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-zinc-500 font-mono text-sm">
              Loading active customer reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950/20 text-zinc-500 font-sans text-sm">
              No moderated reviews listed yet. Be the first to share your purchase receipt verification story!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-900 shadow-md dark:shadow-none flex flex-col justify-between gap-4"
                >
                  <div>
                    {/* Header: User avatar & stars */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rev.clientPhoto || "https://api.dicebear.com/7.x/identicon/svg?seed=ffclient"}
                          alt={rev.clientName}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-950"
                        />
                        <div>
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide truncate max-w-[150px]">
                            {rev.clientName}
                          </div>
                          <div className="text-[9px] text-zinc-500 dark:text-zinc-550 font-mono">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Stars count indicator */}
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3.5 h-3.5 ${getStarColor(idx, rev.rating)}`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-sans min-h-[46px]">
                      "{rev.comment}"
                    </p>
                  </div>

                  {currentUser && (currentUser.id === rev.clientId || ["admin", "owner"].includes(currentUser.role)) && (
                    <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1 px-2.5 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-red-500 rounded bg-zinc-50 hover:bg-red-500/10 dark:bg-zinc-900/40 dark:hover:bg-red-950/40 border border-zinc-200/50 dark:border-zinc-800/40 cursor-pointer transition-colors font-mono font-bold uppercase"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete review
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
