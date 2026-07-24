import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Search, ChevronDown, Check, User } from "lucide-react";
import { searchConversationMessages } from "../../api/chat.api";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setHighlightMessageId } from "@/store/chat/chat-slice";
import SearchResultItem from "./search-result-item";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";

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

  const { activeConversation } = useAppSelector(
    (state) => state.chat,
  );
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
            ? "bạn"
            : (memberProfiles?.[m.userId]?.fullName || "user").toLowerCase();
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
    if (!senderId) return "Người gửi";
    if (senderId === currentUserId) return "Bạn";
    return memberProfiles?.[senderId]?.fullName || "User";
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await searchConversationMessages(
        conversationId,
        query,
        senderId,
      );
      if (res?.success || res?.data) {
        setResults(res.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  console.log(results);

  const handleResultClick = (messageId: string) => {
    dispatch(setHighlightMessageId(messageId));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-800">Tìm kiếm tin nhắn</h2>
      </div>

      {/* Search Form */}
      <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
        <div className="relative">
          <form onSubmit={handleSearch}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo nội dung hoặc tên tệp..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border-transparent rounded-md focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition"
            />
          </form>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsSenderDropdownOpen(!isSenderDropdownOpen)}
            className="w-full flex items-center justify-between text-sm bg-gray-100 p-2 rounded-md outline-none cursor-pointer hover:bg-gray-200 transition"
          >
            <span className="truncate">{getSelectedSenderName()}</span>
            <ChevronDown size={14} className="text-gray-500 shrink-0" />
          </button>

          {isSenderDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-64 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                <input
                  type="text"
                  value={senderSearch}
                  onChange={(e) => setSenderSearch(e.target.value)}
                  placeholder="Tìm người gửi..."
                  className="w-full p-1.5 text-sm bg-white border border-gray-200 rounded-md outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
                />
              </div>
              <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                <div
                  onClick={() => {
                    setSenderId("");
                    setIsSenderDropdownOpen(false);
                  }}
                  className={`p-2 text-sm cursor-pointer rounded-md hover:bg-gray-100 flex items-center justify-between transition ${!senderId ? "bg-blue-50 text-blue-600 font-medium" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User size={12} className="text-gray-500" />
                    </div>
                    <span>Tất cả người gửi</span>
                  </div>
                  {!senderId && <Check size={14} className="shrink-0" />}
                </div>

                {filteredMembers.map((m: any) => {
                  const profile = memberProfiles?.[m.userId];
                  const avatarUrl = profile?.avatarUrl;
                  const isMe = m.userId === currentUserId;
                  const name = isMe ? "Bạn" : profile?.fullName || "Người dùng";

                  return (
                    <div
                      key={m.userId}
                      onClick={() => {
                        setSenderId(m.userId);
                        setIsSenderDropdownOpen(false);
                      }}
                      className={`p-2 mt-0.5 text-sm cursor-pointer rounded-md hover:bg-gray-100 flex items-center justify-between transition ${senderId === m.userId ? "bg-blue-50 text-blue-600 font-medium" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={12} className="text-gray-500" />
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
                  <div className="p-4 text-sm text-gray-500 text-center">
                    Không tìm thấy thành viên
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
          <div className="p-4 text-center text-sm text-gray-500">
            Đang tìm kiếm...
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-1">
            {results.map((msg: any) => (
              <SearchResultItem
                key={msg.id}
                message={msg}
                currentUserId={currentUserId}
                memberProfiles={memberProfiles || {}}
                isDirect={activeConversation?.type === "DIRECT"}
                onClick={handleResultClick}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            Không tìm thấy kết quả nào.
          </div>
        )}
      </div>
    </div>
  );
}
