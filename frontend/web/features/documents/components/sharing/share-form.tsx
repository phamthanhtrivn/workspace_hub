"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Plus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SharePermission } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";
import { searchUserByEmail } from "@/features/chat/api/chat.api";
import { UserSearchResponse } from "@/features/chat/types/chat.types";
import { ShareSuggestionsDropdown } from "./share-suggestions-dropdown";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface ShareModalFormProps {
  documentItemId: string;
  onShareAdded?: () => void;
}

export function ShareModalForm({
  documentItemId,
  onShareAdded,
}: ShareModalFormProps) {
  const intl = useAppIntl();
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for email input
  useEffect(() => {
    if (ignoreSearchRef.current) {
      ignoreSearchRef.current = false;
      return;
    }

    const trimmedInput = emailInput.trim();
    if (!trimmedInput || trimmedInput.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
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
      // Validate if the email exists in the system
      let userExists = false;

      // 1. Check local search results first
      const matchedLocal = searchResults.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );

      if (matchedLocal) {
        userExists = true;
      } else {
        // 2. Perform a single check calling searchUserByEmail to see if exact match exists
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
        throw new Error(
          intl.formatMessage({ id: "documents.userEmailNotFound" }),
        );
      }

      return documentsApi.addShare(documentItemId, email, permission);
    },
    onSuccess: (_, variables) => {
      toast.success(
        intl.formatMessage(
          { id: "documents.sharedAccessWith" },
          { email: variables.email },
        ),
      );
      setEmailInput("");
      setSearchResults([]);
      queryClient.invalidateQueries({
        queryKey: ["document-sharing", documentItemId],
      });
      onShareAdded?.();
    },
    onError: (err: any) => {
      console.error("Failed to add share", err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        intl.formatMessage({ id: "documents.shareAccessFailed" });
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
      <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
        {intl.formatMessage({ id: "documents.shareWithOthers" })}
      </label>
      <div className="flex items-center gap-2">
        <div ref={containerRef} className="relative flex-1">
          {isSearching ? (
            <Loader2
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
            />
          ) : (
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          )}
          <input
            type="text"
            placeholder={intl.formatMessage({
              id: "documents.enterEmailAddress",
            })}
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowSuggestions(true);
              }
            }}
            className="w-full bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:border-blue-500 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 outline-hidden transition-all placeholder:text-slate-400"
          />

          {/* Autocomplete Suggestions Dropdown (YouTube style) */}
          <ShareSuggestionsDropdown
            show={showSuggestions}
            results={searchResults}
            onSelect={handleSelectSuggestion}
          />
        </div>
        <select
          value={permissionInput}
          onChange={(e) =>
            setPermissionInput(e.target.value as SharePermission)
          }
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl py-2.5 px-3 text-xs font-black text-slate-700 outline-hidden transition-all cursor-pointer"
        >
          <option value={SharePermission.VIEWER}>
            {intl.formatMessage({ id: "documents.permission.viewer" })}
          </option>
          <option value={SharePermission.EDITOR}>
            {intl.formatMessage({ id: "documents.permission.editor" })}
          </option>
        </select>
        <button
          type="submit"
          disabled={addShareMutation.isPending}
          className="flex items-center justify-center p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {addShareMutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
        </button>
      </div>
    </form>
  );
}
