"use client";

import { getApiErrorMessage } from "@/lib/api-error";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Mail } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SharePermission } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { searchUserByEmail } from "@/features/chat/api/chat.api";
import { UserSearchResponse } from "@/features/chat/types/chat.types";
import { ShareSuggestionsDropdown } from "./share-suggestions-dropdown";
import { Combobox, ComboboxInput } from "@/components/ui/combobox";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";


interface ShareModalFormProps {
  documentItemId: string;
  onShareAdded?: () => void;
}

export function ShareModalForm({
  documentItemId,
  onShareAdded,
}: ShareModalFormProps) {
  const [emailInput, setEmailInput] = useState("");
  const [permissionInput, setPermissionInput] = useState<SharePermission>(
    SharePermission.VIEWER,
  );
  const queryClient = useQueryClient();

  // Autocomplete states
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ignoreSearchRef = useRef(false);

  // Debounced search for email input
  useEffect(() => {
    if (ignoreSearchRef.current) {
      ignoreSearchRef.current = false;
      return;
    }

    const trimmedInput = emailInput.trim();
    if (!trimmedInput || trimmedInput.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchUserByEmail(trimmedInput);
        if (response?.success && Array.isArray(response.data)) {
          setSearchResults(response.data);
          setShowSuggestions(response.data.length > 0);
        } else {
          setSearchResults([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error("Error searching user email:", err);
        setSearchResults([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [emailInput]);

  const handleSelectSuggestion = (user: UserSearchResponse) => {
    ignoreSearchRef.current = true;
    setEmailInput(user.email);
    setShowSuggestions(false);
  };

  const addShareMutation = useMutation({
    mutationFn: async ({
      email,
      permission,
    }: {
      email: string;
      permission: SharePermission;
    }) => {
      let userExists = false;

      const matchedLocal = searchResults.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );

      if (matchedLocal) {
        userExists = true;
      } else {
        const searchRes = await searchUserByEmail(email);
        if (searchRes?.success && Array.isArray(searchRes.data)) {
          const hasExactMatch = searchRes.data.some(
            (u: UserSearchResponse) =>
              u.email.toLowerCase() === email.toLowerCase(),
          );
          if (hasExactMatch) {
            userExists = true;
          }
        }
      }

      if (!userExists) {
        throw new Error("User email not found in workspace");
      }

      return documentsApi.addShare(documentItemId, email, permission);
    },
    onSuccess: (_, variables) => {
      toast.success(`Shared access with ${variables.email}`);
      setEmailInput("");
      setSearchResults([]);
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      onShareAdded?.();
    },
    onError: (err: unknown) => {
      console.error("Failed to add share", err);
      const errMsg =
        getApiErrorMessage(err, "Failed to share access");
      toast.error(errMsg);
    },
  });

  const handleAddShare = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const targetEmail = emailInput.trim();
      if (!targetEmail) return;

      addShareMutation.mutate({
        email: targetEmail,
        permission: permissionInput,
      });
    },
    [emailInput, permissionInput, addShareMutation],
  );

  return (
    <form onSubmit={handleAddShare} className="space-y-2">
      <label htmlFor={`share-email-${documentItemId}`} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        Share with others
      </label>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div ref={containerRef} className="relative min-w-0 flex-1">
          <Combobox<UserSearchResponse>
            items={searchResults}
            filter={null}
            value={null}
            inputValue={emailInput}
            onInputValueChange={value => { setEmailInput(value); setSearchResults([]); setShowSuggestions(false); }}
            itemToStringLabel={(user) => user?.email ?? ""}
            open={showSuggestions && searchResults.length > 0}
            onOpenChange={setShowSuggestions}
          >
          {isSearching ? (
            <Spinner className="absolute left-3.5 top-1/2 -translate-y-1/2" />
          ) : (
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          )}
          <ComboboxInput unstyled id={`share-email-${documentItemId}`}
            type="text"
            placeholder="Enter email address..."
            required
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowSuggestions(true);
              }
            }}
            className="w-full bg-background border border-input hover:border-input rounded-control py-2.5 pl-10 pr-4 text-xs font-semibold text-foreground outline-hidden transition-all placeholder:text-muted-foreground"
          />

          <ShareSuggestionsDropdown
            show={showSuggestions}
            results={searchResults}
            onSelect={handleSelectSuggestion}
          />
          </Combobox>
        </div>
        <CustomSelect
          ariaLabel="Share permission"
          value={permissionInput}
          onChange={nextValue =>
            setPermissionInput(nextValue as SharePermission)
          }
          triggerClassName="bg-card border border-input hover:border-input rounded-panel py-2.5 px-3 text-xs font-semibold text-foreground outline-hidden transition-all cursor-pointer"
        >
          <option value={SharePermission.VIEWER}>Can view</option>
          <option value={SharePermission.EDITOR}>Can edit</option>
        </CustomSelect>
        <Button aria-busy={addShareMutation.isPending || undefined} variant="default"
          type="submit"
          disabled={addShareMutation.isPending}
          className="flex items-center justify-center p-2.5 rounded-control transition-all disabled:opacity-50 cursor-pointer"
        >
          {addShareMutation.isPending ? (
            <Spinner tone="inherit" />
          ) : (
            <Plus size={16} />
          )}
        </Button>
      </div>
    </form>
  );
}
