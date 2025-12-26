"use client";

import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to login or dashboard based on auth state
  redirect("/login");
}
