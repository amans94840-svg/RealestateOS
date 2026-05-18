import type { Property } from "./dashboard-data";

/**
 * Backend-ready placeholders for property data + image uploads.
 *
 * Later:
 * - Connect image uploads to Supabase Storage / Cloudflare R2
 * - Fetch properties from a real API (or serverless function)
 * - Persist image URLs in your DB
 */

export async function fetchProperties(): Promise<Property[]> {
  // TODO: replace with real fetch (Supabase/Postgres, API route, etc.)
  return [];
}

export async function fetchPropertyDetails(propertyId: string): Promise<Property | null> {
  // TODO: later connect this to a Supabase table query or serverless endpoint.
  void propertyId;
  return null;
}

export async function updateProperty(propertyId: string, data: Partial<Property>): Promise<void> {
  // TODO: later persist the patch into Supabase/Postgres and sync images if needed.
  void propertyId;
  void data;
}

export async function uploadPropertyImage(file: File): Promise<string> {
  // TODO: replace with real upload to Supabase Storage / Cloudflare R2
  // For now, return a temporary local URL so the UI can display images.
  return URL.createObjectURL(file);
}

export async function uploadPropertyImages(propertyId: string, files: File[]): Promise<string[]> {
  // TODO: later upload multiple images to Supabase Storage / Cloudflare R2.
  void propertyId;
  return files.map((file) => URL.createObjectURL(file));
}

export async function createPropertyAppointment(propertyId: string): Promise<{
  id: string;
  leadName: string;
  property: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Rescheduled";
}> {
  // TODO: later insert into an appointments table.
  void propertyId;
  return {
    id: `appt-${Date.now()}`,
    leadName: "Property Visitor",
    property: "Selected Property",
    date: new Date().toLocaleDateString(),
    time: "10:00 AM",
    status: "Pending",
  };
}

export async function saveFavoriteProperty(propertyId: string): Promise<void> {
  // TODO: later persist the favorite relation in Supabase.
  void propertyId;
}

export async function shareProperty(propertyId: string, channel: "whatsapp" | "email" | "copy" | "linkedin"): Promise<void> {
  // TODO: later track shares and send from backend if required.
  void propertyId;
  void channel;
}

export async function updatePropertyImages(input: {
  propertyId: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
}): Promise<void> {
  // TODO: replace with real persistence (DB update + storage management)
  void input;
}

