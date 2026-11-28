import { createPageMetadata } from "@/lib/seo";
import { PomodoroView } from "@/features/pomodoro/components/pomodoro-view";

export const metadata = createPageMetadata("/pomodoro");

export default function PomodoroPage() {
  return (
    <section className="w-full">
      <PomodoroView />
    </section>
  );
}
