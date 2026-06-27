"use client";

import { useEffect } from "react";

const GUEST_TOKEN_KEY = "negotole_guest_token";

type Props = {
  guestToken: string | null;
};

export function GuestPersistenceHandler({ guestToken }: Props) {
  useEffect(() => {
    if (guestToken) {
      localStorage.setItem(GUEST_TOKEN_KEY, guestToken);
    }
  }, [guestToken]);

  return null;
}
