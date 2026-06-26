"use server";

import { signIn } from "@/lib/auth";

export async function guestSignIn(formData: FormData) {
  await signIn("credentials", formData);
}
