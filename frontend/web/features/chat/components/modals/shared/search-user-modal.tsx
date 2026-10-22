"use client";

import { IconButton } from "@/components/ui/icon-button";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useState, useEffect } from "react";

import {
  Search,
  X,
  User,
  ArrowLeft,
  Calendar,
  Phone,
  Info,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  UserProfileResponse,
  UserSearchResponse,
} from "@/features/chat/types/chat.types";
import {
  createDirectConversation,
  getPublicProfile,
  searchUserByEmail,
} from "@/features/chat/api/chat.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogSurface } from "@/components/ui/dialog";


interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (
    conversation: any,
    selectedProfile: UserProfileResponse & { id?: string | null },
  ) => void;
}

const SearchUserModal = React.memo(function SearchUserModal({
  isOpen,
  onClose,
  onConversationCreated,
}: SearchUserModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [error, setError] = useState("");

  // Selected User Profile states
  const [selectedUser, setSelectedUser] = useState<UserSearchResponse | null>(
    null,
  );
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(
    null,
  );
  const [loadingProfile, setLoadingProfile] = useState(false);

  // For portal to work in SSR Next.js safely
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal closes or opens
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setResults([]);
      setError("");
      setSelectedUser(null);
      setUserProfile(null);
    }
  }, [isOpen]);

  // Search as you type debounce
  useEffect(() => {
    if (!email.trim()) {
      setResults([]);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await searchUserByEmail(email);
        const users = response?.success ? response.data : [];
        setResults(users);
        if (users.length === 0) {
          setError("User not found");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Search failed",
        );
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  const handleSelectUser = async (user: UserSearchResponse) => {
    setSelectedUser(user);
    setLoadingProfile(true);
    try {
      const response = await getPublicProfile(user.id);
      setUserProfile(response?.success ? response.data : null);
    } catch (err) {
      toast.error("Failed to load user profile");
      setSelectedUser(null); // Go back if error
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleMessage = async (user: UserSearchResponse) => {
    try {
      const response = await createDirectConversation(user.id);
      if (response && response.success) {
        onConversationCreated?.(response.data, {
          id: user.id,
          email: userProfile?.email || user.email,
          fullName: userProfile?.fullName || user.fullName,
          avatarUrl: userProfile?.avatarUrl || user.avatarUrl,
          phoneNumber: userProfile?.phoneNumber || null,
          dob: userProfile?.dob || null,
          bio: userProfile?.bio || null,
        });
        onClose();
      } else {
        toast.error(
          response?.message || "Failed to start direct conversation",
        );
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to start direct conversation",
      );
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay/40 px-4 transition-opacity duration-200">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col border border-border animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {selectedUser && (
              <Button variant="unstyled" aria-label="Back"
                onClick={() => setSelectedUser(null)}
                className="p-1 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                <ArrowLeft size={20} />
              </Button>
            )}
            <h2 className="text-section-title font-semibold text-foreground tracking-tight">
              {selectedUser
                ? "User Profile"
                : "Add New Connection"}
            </h2>
          </div>
          <Button variant="unstyled" aria-label="Close"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full cursor-pointer transition-colors"
          >
            <X size={20} />
          </Button>
        </div>

        {!selectedUser ? (
          <>
            <div className="px-6 py-5 flex-shrink-0 border-b border-border bg-background">
              <div className="relative group">
                <Input aria-label="Enter user email" unstyled
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter user email..."
                  className="w-full pl-11 pr-4 py-3 bg-card border border-input rounded-control focus:outline-none focus:border-info-outline focus:ring-4 focus:ring-ring transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground"
                />
                <Search
                  className="absolute left-3.5 top-3 text-muted-foreground group-focus-within:text-info-content transition-colors"
                  size={20}
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-card">
              {loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-4 border-border border-t-info rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Searching...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 bg-destructive-soft rounded-full flex items-center justify-center mb-3">
                    <Search size={24} className="text-destructive-content" />
                  </div>
                  <p className="text-destructive-content font-medium">{error}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please check the email address and try again.
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                results.length === 0 &&
                email.trim() !== "" && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-3">
                      <Search size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No matching users found
                    </p>
                  </div>
                )}

              {!loading && results.length > 0 && (
                <div className="flex flex-col gap-2">
                  {results.map((user) => (
                    <div
                      key={user.id}
                      className="w-full text-left group flex items-center justify-between p-3 rounded-panel hover:bg-info-soft/50 border border-transparent hover:border-border transition-all duration-200 cursor-pointer"
                    >
                      <Button variant="unstyled" type="button" onClick={() => handleSelectUser(user)} className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-border">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={22} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-foreground text-sm truncate group-hover:text-info-content transition-colors">
                            {user.fullName || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </Button>
                      <IconButton label="Send Message" showTooltip={false} size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessage(user);
                        }}
                        className="p-2 text-info-content hover:bg-info-soft rounded-control transition-colors shrink-0 cursor-pointer"
                        title="Send Message"
                      >
                        <MessageCircle size={20} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 bg-card">
            {loadingProfile ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 border-4 border-border border-t-info rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-muted-foreground">
                  Loading profile...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center overflow-hidden border-2 border-border mb-4">
                  {userProfile?.avatarUrl || selectedUser.avatarUrl ? (
                    <img
                      src={
                        userProfile?.avatarUrl || selectedUser.avatarUrl || ""
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-section-title font-semibold text-foreground">
                  {userProfile?.fullName ||
                    selectedUser.fullName ||
                    "User"}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {userProfile?.email ||
                    selectedUser.email ||
                    "No email available"}
                </p>

                <div className="w-full bg-background rounded-panel p-4 flex flex-col gap-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Phone size={18} className="text-muted-foreground" />
                    <span>
                      {userProfile?.phoneNumber || "Phone number not provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Calendar size={18} className="text-muted-foreground" />
                    <span>
                      {userProfile?.dob
                        ? new Date(userProfile.dob).toLocaleDateString("en-US")
                        : "Date of birth not provided"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-foreground mt-2 pt-2 border-t border-border">
                    <Info size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                    {userProfile?.bio ? (
                      <span className="italic">"{userProfile?.bio}"</span>
                    ) : (
                      <span>No bio provided</span>
                    )}
                  </div>
                </div>

                <Button variant="default"
                  onClick={() => handleMessage(selectedUser)}
                  className="cursor-pointer w-full font-semibold py-3 rounded-control transform transition-all duration-200"
                >
                  Send Message
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return <DialogSurface onClose={onClose}>{modalContent}</DialogSurface>;
});

export default SearchUserModal;

