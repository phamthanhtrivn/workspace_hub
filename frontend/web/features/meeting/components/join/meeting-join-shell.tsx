import type { ReactNode } from "react";
import Link from "next/link";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { meetingRoutes } from "../../types/meeting.constants";

interface MeetingJoinShellProps {
  children: ReactNode;
  wide?: boolean;
}

export function MeetingJoinShell({
  children,
  wide = false,
}: MeetingJoinShellProps) {
  const intl = useAppIntl();

  return (
    <main className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-[#f5f9fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-3xl"}`}>
        <Link
          href={meetingRoutes.listPath}
          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          {intl.formatMessage({ id: "meeting.backToMeetings" })}
        </Link>
        {children}
      </div>
    </main>
  );
}
