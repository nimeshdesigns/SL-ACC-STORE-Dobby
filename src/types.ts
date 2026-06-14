export type UserRole = "member" | "admin" | "owner";
export type UserStatus = "active" | "banned";
export type CatalogStatus = "available" | "sold" | "pending_verification";
export type OrderStatus = "pending" | "accepted" | "declined" | "delivered";
export type OrderType = "buy" | "sell";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  whatsappNumber?: string;
  callNumber?: string;
  createdAt: string;
  wishlist?: string[];
}

export interface Catalog {
  id: string;
  title: string;
  images: string[];
  server: string;
  level: number;
  guns: number;
  fashion: number;
  emotes: number;
  description: string;
  price: number;
  status: CatalogStatus;
  sellerId?: string;
  createdAt: string;
}

export interface CatalogCredentials {
  catalogId: string;
  loginMethod: string;
  username: string;
  password: string;
  backupCodes?: string;
  sellerWhatsapp?: string;
}

export interface Order {
  id: string;
  catalogId: string;
  catalogTitle: string;
  catalogPrice: number;
  clientId: string;
  clientName: string;
  clientEmail: string;
  whatsappNumber: string;
  callNumber: string;
  receiptImage: string; // Base64 representation or illustrative image URL
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  deliveryDetails?: string; // Credentials delivered by admin
  adminWhatsapp?: string;   // Admin Whatsapp for support
}

export interface Message {
  id: string;
  clientId: string; // 'all' for system announcements, or specific UID
  senderId: string;
  senderName: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface SiteSettings {
  id: string; // always 'site'
  siteName: string;
  siteLogo: string;
  bankDetails: string;
  ezCashDetails: string;
  otherPaymentDetails: string;
  whatsappContact: string;
  callContact: string;
  facebookLink: string;
  youtubeLink: string;
  tiktokLink: string;
  discordLink: string;
  lightboxEnabled: boolean;
  lightboxImage: string;
  lightboxTitle: string;
  lightboxDescription: string;
  socialChannels?: { name: string; url: string }[];
  clientSatisfaction?: string;
  escrowOrdersCompleted?: string;
  fastAndReliableBig?: string;
  fastAndReliableSmall?: string;
  deliverySpeedBig?: string;
  deliverySpeedSmall?: string;
  additionalBillingDetails?: string;
  bannerImages?: string[];
  heroHeadline?: string;
  heroSubheading?: string;
  tutorialsEnabled?: boolean;
  siteActive?: boolean;
}

export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  clientPhoto: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface VisitCount {
  id: string; // date 'YYYY-MM-DD'
  count: number;
}

export interface Tutorial {
  id: string;
  title: string;
  youtubeId: string;
  youtubeLink: string;
  createdAt: string;
}
