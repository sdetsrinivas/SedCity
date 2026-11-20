"use client";
import { useCallback, useState } from "react";
import { RequireRole } from "@/modules/auth/RequireRole";
import { BookingForm } from "./BookingForm";
import { MyBookings } from "./MyBookings";

/**
 * Booking needs a signed-in citizen: the booking is made in their name and confirmed to their mobile.
 * Below the form, "My bookings" lists their bookings (reloaded after a new booking) and lets them move one
 * (after a move the form reads the held slots again).
 */
export function BookingService({ uid }: { uid: string }) {
  const [booked, setBooked] = useState(0);
  const [moved, setMoved] = useState(0);
  const onBooked = useCallback(() => setBooked((n) => n + 1), []);
  const onMoved = useCallback(() => setMoved((n) => n + 1), []);
  return (
    <RequireRole role="citizen">
      {(session) => (
        <div>
          <BookingForm uid={uid} session={session} heldVersion={moved} onBooked={onBooked} />
          <MyBookings session={session} version={booked} onMoved={onMoved} />
        </div>
      )}
    </RequireRole>
  );
}
