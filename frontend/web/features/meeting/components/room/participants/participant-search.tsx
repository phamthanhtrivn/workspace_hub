import { Search } from "lucide-react";

interface ParticipantSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function ParticipantSearch({
  placeholder,
  value,
  onChange,
}: ParticipantSearchProps) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm text-slate-200">
      <Search className="h-4 w-4 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-slate-500"
      />
    </label>
  );
}
