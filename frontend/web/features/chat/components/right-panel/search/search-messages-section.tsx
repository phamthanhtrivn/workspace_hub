import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Check,
  User,
  Users,
} from "lucide-react";
import {
  searchChannelMessages,
  searchDirectConversationMessages,
} from "../../../api/chat.api";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setHighlightMessageId } from "@/store/chat/chat-slice";
import SearchResultItem from "./search-result-item";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { useActiveChat } from "../../../hooks/useChatQueries";
import { ChatContextType } from "../../../types/chat.types";
import { logApiError } from "@/lib/interceptors";

interface SearchMessagesSectionProps {
  conversationId: string;
  onBack: () => void;
}

export default function SearchMessagesSection({
  conversationId,
  onBack,
}: SearchMessagesSectionProps) {
  const [query, setQuery] = useState("");
  const [senderId, setSenderId] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { activeChat: activeConversation, activeChatType } = useActiveChat();
  const memberProfiles = useChatMemberProfiles();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const dispatch = useAppDispatch();

  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);
  const [senderSearch, setSenderSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsSenderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMembers = useMemo(() => {
    const term = senderSearch.toLowerCase();
    return (
      activeConversation?.members?.filter((m: any) => {
        const name =
          m.userId === currentUserId
            ? "you"
            : (
                memberProfiles?.[m.userId]?.fullName ||
                "User"
              ).toLowerCase();
        return name.includes(term);
      }) || []
    );
  }, [
    activeConversation?.members,
    memberProfiles,
    currentUserId,
    senderSearch,
  ]);

  const getSelectedSenderName = () => {
    if (!senderId) return "Sender";
    if (senderId === currentUserId) return "You";
    return memberProfiles?.[senderId]?.fullName || "User";
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const isDirectMessage = activeChatType === ChatContextType.DIRECT_MESSAGE;
      const searchMessages = isDirectMessage
        ? searchDirectConversationMessages
        : searchChannelMessages;
      const res = await searchMessages(conversationId, query, senderId);
      if (res?.success || res?.data) {
        setResults(res.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      logApiError(err, "Failed to search chat messages");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (messageId: string) => {
    dispatch(setHighlightMessageId(messageId));
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="h-16 px-4 border-b border-border flex items-center gap-3">
        <button aria-label="Back"
          onClick={onBack}
          className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-full transition cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-foreground">
          Search Messages
        </h2>
      </div>

      {/* Search Form */}
      <div className="p-4 border-b border-border flex flex-col gap-3">
        <div className="relative">
          <form onSubmit={handleSearch}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by content or file name..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted border-transparent rounded-control focus:bg-card focus:border-info focus:ring-1 focus:ring-ring outline-none transition"
            />
          </form>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsSenderDropdownOpen(!isSenderDropdownOpen)}
            className="w-full flex items-center justify-between text-sm bg-muted p-2 rounded-control outline-none cursor-pointer hover:bg-accent transition"
          >
            <span className="truncate">{getSelectedSenderName()}</span>
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          </button>

          {isSenderDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg z-20 max-h-64 flex flex-col overflow-hidden shadow-panel">
              <div className="p-2 border-b border-border bg-background">
                <input
                  type="text"
                  value={senderSearch}
                  onChange={(e) => setSenderSearch(e.target.value)}
                  placeholder="Search sender..."
                  className="w-full p-1.5 text-sm bg-card border border-input rounded-control outline-none focus:border-info focus:ring-1 focus:ring-ring transition"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                <div
                  onClick={() => {
                    setSenderId("");
                    setIsSenderDropdownOpen(false);
                  }}
                  className={`p-2 text-sm cursor-pointer rounded-md hover:bg-muted flex items-center justify-between transition ${!senderId ? "bg-info-soft text-info font-medium" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <Users size={12} className="text-muted-foreground" />
                    </div>
                    <span>All Senders</span>
                  </div>
                  {!senderId && <Check size={14} className="shrink-0" />}
                </div>

                {filteredMembers.map((m: any) => {
                  const profile = memberProfiles?.[m.userId];
                  const avatarUrl = profile?.avatarUrl;
                  const isMe = m.userId === currentUserId;
                  const name = isMe
                    ? "You"
                    : profile?.fullName || "User";

                  return (
                    <div
                      key={m.userId}
                      onClick={() => {
                        setSenderId(m.userId);
                        setIsSenderDropdownOpen(false);
                      }}
                      className={`p-2 mt-0.5 text-sm cursor-pointer rounded-md hover:bg-muted flex items-center justify-between transition ${senderId === m.userId ? "bg-info-soft text-info font-medium" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 overflow-hidden">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={12} className="text-muted-foreground" />
                          )}
                        </div>
                        <span className="truncate">{name}</span>
                      </div>
                      {senderId === m.userId && (
                        <Check size={14} className="shrink-0" />
                      )}
                    </div>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No member found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-1">
            {results.map((msg: any) => (
              <SearchResultItem
                key={msg.id}
                message={msg}
                currentUserId={currentUserId}
                memberProfiles={memberProfiles || {}}
                isDirect={activeChatType === ChatContextType.DIRECT_MESSAGE}
                onClick={handleResultClick}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No results found.
          </div>
        )}
      </div>
    </div>
  );
}
