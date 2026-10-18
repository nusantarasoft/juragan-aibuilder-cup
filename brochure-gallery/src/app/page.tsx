import React from "react";
import BrochureGalleryApp from "@/components/BrochureGalleryApp";
import { fetchBrochuresFromDb } from "@/lib/serverStorage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { brochures } = await fetchBrochuresFromDb();
  return <BrochureGalleryApp initialBrochures={brochures} />;
}
