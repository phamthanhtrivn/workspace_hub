import { createHomeMetadata } from "@/lib/seo";
import { LandingPage } from "@/features/landing/components/landing-page";

export const metadata = createHomeMetadata();

export default function PublicPage() {
  return <LandingPage />;
}
