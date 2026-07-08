import React from "react";
import Image from "next/image";
import { Users, ChevronDown, ChevronRight, User } from "lucide-react";
import { useAppDispatch } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";

interface MembersSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeConversation: any;
  memberProfiles: any;
  currentUserId: string | null;
}

export default function MembersSection({
  isExpanded,
  onToggle,
  activeConversation,
  memberProfiles,
  currentUserId,
}: MembersSectionProps) {
  const dispatch = useAppDispatch();

  return (
    <div>
      <div>
        <button
          onClick={onToggle}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
            <Users size={18} className="text-gray-500" />
            Thành viên ({activeConversation?.members?.length || 0})
          </div>
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-2 space-y-2">
            {activeConversation?.members?.map((member: any) => {
              const profile = memberProfiles?.[member.userId];
              const name = profile?.fullName || "User";
              const isMe = member.userId === currentUserId;
              const displayName = isMe ? "Bạn" : name;

              return (
                <div
                  key={member.userId}
                  onClick={() =>
                    !isMe && dispatch(setSelectedProfileUserId(member.userId))
                  }
                  className={`flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition ${
                    !isMe ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xs overflow-hidden">
                    {profile?.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt="Avatar"
                        width={32}
                        height={32}
                        className="rounded-full border-gray-200 border-1"
                      />
                    ) : (
                      <User size={22} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-700">{displayName}</span>
                    {member.role === "OWNER" && (
                      <span className="text-xs bg-blue-100 text-blue-600 text-center w-fit px-2 py-0.5 rounded">
                        Trưởng nhóm
                      </span>
                    )}
                    {member.role === "ADMIN" && (
                      <span className="text-xs bg-gray-100 text-gray-500 text-center w-fit px-2 py-0.5 rounded">
                        Phó nhóm
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <button className="flex items-center gap-3 p-2 text-blue-600 hover:bg-blue-50 rounded-lg w-full transition mt-1">
              <div className="w-8 h-8 rounded-full border border-dashed border-blue-400 flex items-center justify-center">
                <Users size={14} />
              </div>
              <span className="text-sm font-medium">Thêm thành viên</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100 mx-4 my-1"></div>
    </div>
  );
}
