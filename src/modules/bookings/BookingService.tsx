"use client";
import { RequireRole } from "@/modules/auth/RequireRole";
import { BookingForm } from "./BookingForm";

/** Booking needs a signed-in citizen: the booking is made in their name and confirmed to their mobile. */
export function BookingService({ uid }: { uid: string }) {
  return <RequireRole role="citizen">{(session) => <BookingForm uid={uid} session={session} />}</RequireRole>;
}
