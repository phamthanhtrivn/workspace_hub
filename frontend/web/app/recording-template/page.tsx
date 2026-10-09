import type { Metadata } from "next";
import { RecordingTemplate } from "@/features/meeting/components/recording-template/recording-template";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Meeting recording",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RecordingTemplatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const url = typeof params.url === "string" ? params.url : "";
  const token = typeof params.token === "string" ? params.token : "";
  const layout =
    params.layout === "grid" || params.layout === "screen"
      ? params.layout
      : "speaker";
  let valid = false;
  try {
    valid = ["ws:", "wss:"].includes(new URL(url).protocol);
  } catch {}
  if (!valid || !token)
    return (
      <main className="flex h-screen items-center justify-center bg-[#101826] text-white">
        Recording connection is required.
      </main>
    );
  return <RecordingTemplate url={url} token={token} initialLayout={layout} />;
}
