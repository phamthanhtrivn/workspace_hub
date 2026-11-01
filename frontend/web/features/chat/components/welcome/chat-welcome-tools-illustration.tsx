import { FileText, ListChecks, Mic, MonitorUp, NotebookPen, Pin, Search, UserRound, Video } from "lucide-react";

export function SharedContentIllustration() {
  return (
    <>
      <rect x="78" y="38" width="284" height="194" rx="14" className="fill-card stroke-border" />
      <FileText x="98" y="58" size="24" className="text-primary-soft-foreground" />
      <text x="138" y="67" fontSize="13" fontWeight="600" className="fill-foreground">Files</text>
      <text x="138" y="86" fontSize="11" className="fill-muted-foreground">Project brief.pdf</text>
      <path d="M98 103H342M98 167H342" className="stroke-border" />
      <ListChecks x="98" y="122" size="24" className="text-primary-soft-foreground" />
      <text x="138" y="131" fontSize="13" fontWeight="600" className="fill-foreground">Polls</text>
      <text x="138" y="150" fontSize="11" className="fill-muted-foreground">Pick a review time</text>
      <NotebookPen x="98" y="186" size="24" className="text-primary-soft-foreground" />
      <text x="138" y="195" fontSize="13" fontWeight="600" className="fill-foreground">Notes</text>
      <text x="138" y="214" fontSize="11" className="fill-muted-foreground">Meeting takeaways</text>
    </>
  );
}

export function SearchIllustration() {
  return (
    <>
      <rect x="58" y="42" width="324" height="44" rx="12" className="fill-card stroke-border" />
      <Search x="74" y="54" size="20" className="text-primary-soft-foreground" />
      <text x="106" y="69" fontSize="13" className="fill-muted-foreground">Find in conversation</text>
      <rect x="82" y="108" width="276" height="80" rx="14" className="fill-card stroke-border" />
      <circle cx="108" cy="135" r="11" className="fill-primary-soft" />
      <UserRound x="101" y="128" size="14" className="text-primary-soft-foreground" />
      <text x="132" y="139" fontSize="12" fontWeight="500" className="fill-foreground">The final plan is here.</text>
      <rect x="132" y="153" width="153" height="5" rx="2.5" className="fill-muted-foreground/25" />
      <Pin x="128" y="209" size="18" className="text-primary-soft-foreground" />
      <text x="158" y="223" fontSize="12" className="fill-primary-soft-foreground">Pinned messages</text>
    </>
  );
}

export function MeetingIllustration() {
  return (
    <>
      <rect x="68" y="40" width="304" height="160" rx="14" className="fill-card stroke-border" />
      <path d="M220 40V200" className="stroke-border" />
      <circle cx="144" cy="115" r="33" className="fill-primary-soft" />
      <UserRound x="123" y="94" size="42" className="text-primary-soft-foreground" strokeWidth="1.5" />
      <circle cx="296" cy="115" r="33" className="fill-muted" />
      <UserRound x="275" y="94" size="42" className="text-muted-foreground" strokeWidth="1.5" />
      <rect x="143" y="215" width="154" height="36" rx="18" className="fill-primary" />
      <Mic x="160" y="224" size="18" className="text-primary-foreground" />
      <Video x="210" y="224" size="18" className="text-primary-foreground" />
      <MonitorUp x="260" y="224" size="18" className="text-primary-foreground" />
    </>
  );
}
