export type UserRole = "private_person" | "client";
export type SubscriptionTier = "free" | "premium";
export type ModerationStrictness = "low" | "medium" | "high";
export type AppointmentStatus = "draft" | "pending" | "confirmed" | "cancelled" | "completed";
export type BotConfirmationStatus = "none" | "sent" | "confirmed" | "declined" | "expired";
export type ModeratedVerdict = "clean" | "spam" | "profanity" | "mixed";

export interface TokenOut {
  access_token: string;
  token_type: string;
}

export interface UserOut {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  moderation_enabled: boolean;
  moderation_strictness: ModerationStrictness;
}

export interface ClientOut {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  last_visit_at: string | null;
  tags: string[];
  created_at: string;
}

export interface HistoryOut {
  id: number;
  event_type: string;
  body: string | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ServiceOut {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  image_url?: string | null;
  category?: string | null;
  created_at: string;
}

export interface CatalogServiceOut {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  provider_id: number;
  provider_name: string;
  image_url?: string | null;
  category?: string | null;
}

export interface ProviderOut {
  id: number;
  full_name: string;
  services_count: number;
}

export interface SlotOut {
  starts_at: string;
  ends_at: string;
}

export interface DaySlotsOut {
  date: string;
  slots: SlotOut[];
}

export interface AppointmentOut {
  id: number;
  client_id: number | null;
  client_user_id?: number | null;
  service_id?: number | null;
  provider_id?: number | null;
  provider_name?: string | null;
  service_title?: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  bot_confirmation_status: BotConfirmationStatus;
  notes: string | null;
}

export interface RetentionItemOut {
  client_id: number;
  client_name: string;
  reason: string;
  suggested_action: string;
  score: number;
}

export interface ModerationCheckOut {
  verdict: ModeratedVerdict;
  flags: string[];
  sanitized_suggestion: string | null;
}

export interface WorkingHourOut {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
}
