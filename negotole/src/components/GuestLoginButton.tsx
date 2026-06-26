"use client";

import { guestSignIn } from "@/lib/actions";
import { useEffect, useRef } from "react";

const GUEST_ID_KEY = "negotole_guest_id";

export function GuestLoginButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GUEST_ID_KEY);
    if (stored && inputRef.current) {
      inputRef.current.value = stored;
    }
  }, []);

  return (
    <form action={guestSignIn}>
      <input ref={inputRef} type="hidden" name="guestUserId" defaultValue="" />
      <input type="hidden" name="redirectTo" value="/" />
      <button
        type="submit"
        className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full px-4 py-2 min-h-[44px] inline-flex items-center shadow-lg shadow-indigo-500/20 transition sm:text-sm"
      >
        ゲストとしてログイン
      </button>
    </form>
  );
}
