"use client";

import { useEffect } from "react";

const GUEST_ID_KEY = "negotole_guest_id";

type Props = {
  userId: string | null;
  isGuest: boolean;
};

export function GuestPersistenceHandler({ userId, isGuest }: Props) {
  useEffect(() => {
    if (isGuest && userId) {
      localStorage.setItem(GUEST_ID_KEY, userId);
    }
  }, [userId, isGuest]);

  return null;
}
