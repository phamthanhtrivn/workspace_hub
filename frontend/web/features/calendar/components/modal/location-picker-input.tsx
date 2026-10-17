"use client";

import { MapPin, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
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
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          value={query}
          aria-label={ariaLabel}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className={
            className ||
            "h-auto w-full rounded-control border border-input bg-card px-3 py-2 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground hover:border-input focus-visible:border-info focus-visible:ring-2 focus-visible:ring-ring"
          }
        />
        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-panel border border-border bg-card py-1 shadow-panel">
          {suggestions.map((item) => (
            <button
              key={item.place_id}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-background"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-semibold text-foreground">
                  {item.name || item.display_name.split(",")[0]}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
