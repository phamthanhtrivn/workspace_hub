import { Moon, Sun } from "lucide-react";

export function DashboardSun({
  now,
  zone,
}: {
  now: string | null;
  zone: string;
}) {
  if (!now) return <span aria-hidden className="h-20 w-24 shrink-0 sm:w-32" />;
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const hours = Number(parts.find((part) => part.type === "hour")?.value);
  const minutes = Number(parts.find((part) => part.type === "minute")?.value);
  const time = hours + minutes / 60;
  const daylight = time >= 6 && time < 18;
  const progress = Math.min(1, Math.max(0, (time - 6) / 12));
  const height = Math.sin(progress * Math.PI) * 26;
  const warmth = Math.sin(progress * Math.PI);
  const hue = 22 + warmth * 22;
  const label = daylight
    ? time < 8
      ? "Sunrise"
      : time >= 16
        ? "Sunset"
        : "Daytime"
    : "Nighttime";

  return (
    <span
      role="img"
      aria-label={`${label} · based on local time, 06:00–18:00`}
      title={`${label} · ${zone}`}
      className="relative inline-block h-20 w-24 shrink-0 overflow-hidden sm:w-32"
    >
      {daylight ? (
        <Sun
          aria-hidden
          size={36}
          className="absolute transition-[transform,color] duration-1000 motion-reduce:transition-none"
          style={{
            left: `calc(8px + ${progress} * (100% - 52px))`,
            bottom: "4px",
            color: `hsl(${hue} 90% 45%)`,
            transform: `translateY(-${height}px)`,
          }}
        />
      ) : (
        <Moon
          aria-hidden
          size={34}
          className="absolute bottom-7 left-1/2 -translate-x-1/2 text-indigo-500"
        />
      )}
      <svg
        aria-hidden
        viewBox="0 0 128 32"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full"
      >
        <path
          d="M8 27C4 27 2 24 2 21C2 17 5 14 10 14C12 8 19 6 25 9C28 2 39 1 45 7C51 4 59 8 60 14C66 12 73 15 73 21C73 25 70 27 65 27Z"
          className="fill-secondary/10"
        />
        <path
          d="M54 30C48 30 44 27 44 23C44 18 48 15 53 15C54 9 61 6 67 9C71 1 84 0 90 8C97 4 107 9 107 16C113 13 122 17 122 23C122 27 118 30 112 30Z"
          className="fill-background stroke-secondary/25"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
