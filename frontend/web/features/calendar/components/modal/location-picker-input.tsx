"use client";

import { MapPin, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from "@/components/ui/combobox";
import {
  LocationSuggestion,
  searchLocationSuggestions,
} from "../../api/calendar-location.api";


interface LocationPickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function LocationPickerInput({
  value,
  onChange,
  placeholder = "Add location",
  ariaLabel = "Location",
  className,
}: LocationPickerInputProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);



  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed === value) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      searchLocationSuggestions(trimmed, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setIsOpen(results.length > 0);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  const handleSelect = (suggestion: LocationSuggestion) => {
    const nextVal = suggestion.display_name;
    setQuery(nextVal);
    onChange(nextVal);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
  };

  return (
    <Combobox<LocationSuggestion>
      items={suggestions}
      filter={null}
      value={null}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringLabel={(suggestion) => suggestion?.display_name ?? ""}
      open={isOpen && suggestions.length > 0}
      onOpenChange={setIsOpen}
    >
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <ComboboxInput
          aria-label={ariaLabel}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className={
            className ||
            "h-auto w-full rounded-control border border-input bg-card px-3 py-2 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground hover:border-input focus-visible:border-info-outline focus-visible:ring-2 focus-visible:ring-ring"
          }
        />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ComboboxContent aria-label="Location suggestions" className="max-h-56 rounded-panel border-border bg-card px-0 py-1 shadow-panel w-[var(--anchor-width)]">
          <ComboboxList>
          {suggestions.map((item) => (
            <ComboboxItem
              key={item.place_id}
              value={item}
              onClick={() => handleSelect(item)}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-background"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-info-content" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-semibold text-foreground">
                  {item.name || item.display_name.split(",")[0]}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.display_name}
                </p>
              </div>
            </ComboboxItem>
          ))}
          </ComboboxList>
        </ComboboxContent>
      )}
    </div>
    </Combobox>
  );
}
