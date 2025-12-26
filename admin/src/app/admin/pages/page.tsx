"use client";

import { redirect } from "next/navigation";

export default function PagesIndexPage() {
    redirect("/admin/pages/list");
}
