import { CheckCheck, FileText, Hash, MessageCircle, MessagesSquare, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import type { ChatWelcomeSlideId } from "../../constants/chat-welcome.constants";
import { MeetingIllustration, SearchIllustration, SharedContentIllustration } from "./chat-welcome-tools-illustration";

function ChannelIllustration() {
  return (
    <>
      <rect x="86" y="36" width="276" height="180" rx="14" className="fill-card stroke-border" />
      <path d="M86 82H362" className="stroke-border" />
      <Hash x="104" y="49" size="20" className="text-primary-soft-foreground" />
      <text x="134" y="64" fontSize="13" fontWeight="600" className="fill-foreground">project-updates</text>
      <circle cx="117" cy="113" r="12" className="fill-primary-soft" />
      <UserRound x="110" y="106" size="14" className="text-primary-soft-foreground" />
      <text x="142" y="111" fontSize="12" fontWeight="500" className="fill-foreground">Share the next milestone.</text>
      <rect x="142" y="121" width="154" height="5" rx="2.5" className="fill-muted-foreground/25" />
      <circle cx="117" cy="154" r="12" className="fill-muted" />
      <UserRound x="110" y="147" size="14" className="text-muted-foreground" />
      <text x="142" y="152" fontSize="12" className="fill-foreground">Keep everyone in the loop.</text>
      <rect x="142" y="162" width="120" height="5" rx="2.5" className="fill-muted-foreground/25" />
      <rect x="48" y="192" width="154" height="36" rx="10" className="fill-primary-soft stroke-primary-outline" />
      <Hash x="60" y="202" size="16" className="text-primary-soft-foreground" />
      <text x="84" y="214" fontSize="11" fontWeight="500" className="fill-primary-soft-foreground">design-review</text>
      <MessagesSquare x="338" y="190" size="32" className="text-primary-soft-foreground" strokeWidth="1.5" />
    </>
  );
}

function DirectMessageIllustration() {
  return (
    <>
      <rect x="52" y="44" width="248" height="82" rx="16" className="fill-card stroke-border" />
      <circle cx="80" cy="72" r="13" className="fill-primary-soft" />
      <UserRound x="72" y="64" size="16" className="text-primary-soft-foreground" />
      <text x="105" y="76" fontSize="13" fontWeight="500" className="fill-foreground">Got a minute to sync?</text>
      <rect x="105" y="89" width="133" height="5" rx="2.5" className="fill-muted-foreground/25" />
      <path d="M74 126V140L92 126" className="fill-card stroke-border" strokeLinejoin="round" />
      <rect x="140" y="145" width="248" height="82" rx="16" className="fill-primary" />
      <text x="160" y="177" fontSize="13" fontWeight="500" className="fill-primary-foreground">Let&apos;s work through it.</text>
      <rect x="160" y="191" width="140" height="5" rx="2.5" className="fill-primary-foreground/40" />
      <CheckCheck x="350" y="199" size="16" className="text-primary-foreground" />
      <path d="M368 226V240L349 226" className="fill-primary" />
      <MessageCircle x="337" y="64" size="34" className="text-primary-soft-foreground" strokeWidth="1.5" />
    </>
  );
}

function ThreadIllustration() {
  return (
    <>
      <rect x="54" y="36" width="284" height="76" rx="14" className="fill-card stroke-border" />
      <MessagesSquare x="72" y="55" size="22" className="text-primary-soft-foreground" />
      <text x="108" y="65" fontSize="13" fontWeight="600" className="fill-foreground">One topic, one thread</text>
      <text x="108" y="87" fontSize="11" className="fill-muted-foreground">Keep replies together</text>
      <path d="M84 121V156Q84 166 94 166H115M84 166V211Q84 221 94 221H172" className="stroke-primary-outline" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="124" y="140" width="260" height="50" rx="12" className="fill-card stroke-border" />
      <circle cx="146" cy="165" r="10" className="fill-primary-soft" />
      <UserRound x="139" y="158" size="14" className="text-primary-soft-foreground" />
      <text x="166" y="169" fontSize="11" className="fill-foreground">A reply with the full context</text>
      <rect x="182" y="204" width="183" height="36" rx="10" className="fill-card stroke-border" />
      <FileText x="194" y="213" size="18" className="text-primary-soft-foreground" />
      <text x="221" y="226" fontSize="11" className="fill-foreground">Project brief.pdf</text>
    </>
  );
}

const ILLUSTRATIONS = {
  channels: ChannelIllustration,
  "direct-messages": DirectMessageIllustration,
  threads: ThreadIllustration,
  "shared-content": SharedContentIllustration,
  search: SearchIllustration,
  calls: MeetingIllustration,
} satisfies Record<ChatWelcomeSlideId, ComponentType>;

export function ChatWelcomeIllustration({ slide }: { slide: ChatWelcomeSlideId }) {
  const Illustration = ILLUSTRATIONS[slide];
  return (
    <svg
      viewBox="0 0 440 270"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none mx-auto w-full max-w-sm select-none"
    >
      <rect x="32" y="20" width="376" height="224" rx="36" className="fill-primary-soft" />
      <Illustration />
    </svg>
  );
}
