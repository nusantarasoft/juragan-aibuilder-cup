"use client";

import { redirect } from "next/navigation";

// Portfolio is now integrated into the PM Dashboard
export default function PortfolioRedirect() {
    redirect("/admin/pm/dashboard");
}
