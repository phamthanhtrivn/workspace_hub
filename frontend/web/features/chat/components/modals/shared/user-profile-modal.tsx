"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React, { useEffect, useState } from "react";

import { X, User, Phone, Calendar, Info } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { toast } from "sonner";
import { UserProfileResponse } from "@/features/chat/types/chat.types";
import {
  createDirectConversation,
  getPublicProfile,
} from "@/features/chat/api/chat.api";
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";


const UserProfileModal = React.memo(function UserProfileModal() {
  const dispatch = useAppDispatch();
  const selectedProfileUserId = useAppSelector(
    (state) => state.chat.selectedProfileUserId,
  );
  const currentUserId = useAppSelector((state) => state.auth.userId);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!selectedProfileUserId) {
        setUserProfile(null);
        return;
      }

      setLoading(true);
      try {
        const response = await getPublicProfile(selectedProfileUserId);
        if (response?.success) {
          setUserProfile(response.data);
        } else {
          toast.error("Failed to load user profile");
        }
      } catch (err) {
        console.error("Failed to load selected user profile:", err);
        toast.error("Error loading user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [selectedProfileUserId]);

  if (!mounted || !selectedProfileUserId) return null;

  const handleClose = () => {
    dispatch(setSelectedProfileUserId(null));
  };

  const handleMessage = async () => {
    if (!selectedProfileUserId) return;
    try {
      const response = await createDirectConversation(selectedProfileUserId);
      if (response?.success) {
        window.dispatchEvent(
          new CustomEvent("REFRESH_CONVERSATIONS", {
            detail: {
              conversation: response.data,
              selectedProfile: userProfile
                ? {
                    ...userProfile,
                    id: selectedProfileUserId,
                  }
                : {
                    id: selectedProfileUserId,
                    email: null,
                    fullName: null,
                    avatarUrl: null,
                    phoneNumber: null,
                    dob: null,
                    bio: null,
                  },
            },
          }),
        );
        handleClose();
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

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay/40 px-4 transition-opacity duration-200">
      <div className={`${dialogLayout.surface} bg-card rounded-panel w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col border border-border animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
          <h2 className="text-section-title font-semibold text-foreground tracking-tight">
            User Profile
          </h2>
          <Button variant="unstyled" aria-label="Close"
            onClick={handleClose}
            className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-full cursor-pointer transition-colors"
          >
            <X size={20} />
          </Button>
        </div>

        <div className={`${dialogLayout.body} p-6 overflow-y-auto flex-1 bg-card`}>
          {loading ? (
            <div role="status" className="flex flex-col items-center justify-center py-10 gap-3">
              <Spinner size={32} />
              <p className="text-sm font-medium text-muted-foreground">
                Loading profile...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center overflow-hidden border-2 border-border mb-4">
                {userProfile?.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-muted-foreground" />
                )}
              </div>
              <h3 className="text-section-title font-semibold text-foreground">
                {userProfile?.fullName || "Unknown User"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {userProfile?.email || "No email available"}
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
                    <span className="italic">"{userProfile.bio}"</span>
                  ) : (
                    <span>No bio provided</span>
                  )}
                </div>
              </div>

              {currentUserId !== selectedProfileUserId && (
                <Button variant="default"
                  onClick={handleMessage}
                  className="cursor-pointer w-full font-semibold py-3 rounded-control transform transition-all duration-200"
                >
                  Send Message
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return <DialogSurface onClose={handleClose}>{modalContent}</DialogSurface>;
});

export default UserProfileModal;

