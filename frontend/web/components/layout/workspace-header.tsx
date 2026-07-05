"use client";

import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Trash2,
  MessageSquareText,
  CheckSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { clearCredentials } from "@/store/auth/auth-slice";
import { logoutApi } from "@/features/auth/api/auth.api";
import { getUserProfile } from "@/features/user-setting/api/user-setting.api";
import { UserProfile } from "@/features/user-setting/types/user-setting.types";
import Image from "next/image";
import { toast } from "react-toastify";
import { socketService } from "@/features/chat/api/socket.service";

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/features/notification/api/notification.api";
import {
  setNotifications,
  addNotification,
  markReadSuccess,
  markAllReadSuccess,
  deleteNotificationSuccess,
} from "@/features/notification/store/notification.slice";

interface WorkspaceHeaderProps {
  currentTitle: string;
  onMenuClick: () => void;
  onOpenSettings: (tab: "profile" | "settings" | "sessions") => void;
}

export default function WorkspaceHeader({
  currentTitle,
  onMenuClick,
  onOpenSettings,
}: WorkspaceHeaderProps) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { email, accessToken } = useAppSelector((state) => state.auth);

  const notifications = useAppSelector((state) => state.notification.list);
  const unreadCount = useAppSelector((state) => state.notification.unreadCount);

  const [isNotiDropdownOpen, setIsNotiDropdownOpen] = useState(false);
  const notiDropdownRef = useRef<HTMLDivElement>(null);
  const [notiTab, setNotiTab] = useState<"all" | "unread">("all");

  const [userProfile, setUserProfile] = useState<UserProfile>(
    {} as UserProfile,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile();
        if (response.success && response.data) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    if (!accessToken) return;
    const fetchNotis = async () => {
      try {
        const response = await getNotifications(1, 20);
        if (response.data) {
          dispatch(
            setNotifications({
              list: response.data,
              total: response.pagination.total,
              unreadCount: response.pagination.unreadCount,
            }),
          );
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    fetchNotis();
  }, [accessToken, dispatch]);

  // Connect to Notification WebSocket
  useEffect(() => {
    if (!accessToken) return;
    
    // Dynamically import to avoid circular dependencies if any
    import("@/features/notification/api/notification-socket.service").then(({ notificationSocketService }) => {
      notificationSocketService.connect(accessToken);
      const socket = notificationSocketService.getSocket();

      if (socket) {
        const handleNewNotification = (noti: any) => {
          dispatch(addNotification(noti));
          toast.info(
            <div className="flex flex-col text-left">
              <span className="font-bold text-sm text-slate-800">{noti.title}</span>
              <span className="text-xs text-slate-600 mt-0.5">{noti.content}</span>
            </div>,
            { autoClose: 4000 },
          );
        };

        socket.on("new_notification", handleNewNotification);
      }
    });

    return () => {
      import("@/features/notification/api/notification-socket.service").then(({ notificationSocketService }) => {
        const socket = notificationSocketService.getSocket();
        if (socket) {
          socket.off("new_notification");
        }
        notificationSocketService.disconnect();
      });
    };
  }, [accessToken, dispatch]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutApi();
      toast.success("Đăng xuất thành công");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Đăng xuất thất bại");
    } finally {
      dispatch(clearCredentials());
      setIsLoggingOut(false);
      router.push("/login");
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
      if (
        notiDropdownRef.current &&
        !notiDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotiDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      dispatch(markReadSuccess(id));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      dispatch(markAllReadSuccess());
      toast.success("Đã đọc tất cả thông báo");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDeleteNoti = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent dropdown item click
    try {
      await deleteNotification(id);
      dispatch(deleteNotificationSuccess(id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleItemClick = async (noti: any) => {
    if (!noti.isRead) {
      await handleMarkAsRead(noti.id);
    }
    setIsNotiDropdownOpen(false);
    if (noti.link) {
      router.push(noti.link);
    }
  };

  const getNotiIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "CHAT":
        return <MessageSquareText className="h-4 w-4 text-blue-500" />;
      case "INVITATION":
        return <User className="h-4 w-4 text-purple-500" />;
      case "TASK":
        return <CheckSquare className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  };

  const filteredNotis = notifications.filter((noti) => {
    if (notiTab === "unread") return !noti.isRead;
    return true;
  });

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-gray-50 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Mobile Menu */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="-ml-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
              <span>Workspace</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="truncate">{currentTitle}</span>
            </div>
            <h2 className="truncate text-xl font-black text-[var(--color-primary-dark)]">
              {currentTitle}
            </h2>
          </div>
        </div>

        {/* Middle: Search Bar */}
        <div className="hidden flex-1 max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm transition hover:border-slate-300 md:flex cursor-text">
          <Search className="h-4 w-4" strokeWidth={2} />
          <span className="flex-1 text-left">Search workspace...</span>
          <div className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-400">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Notifications Button & Dropdown */}
          <div className="relative" ref={notiDropdownRef}>
            <button
              onClick={() => setIsNotiDropdownOpen(!isNotiDropdownOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotiDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-slate-100 bg-white p-3 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">Thông báo</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                        {unreadCount} mới
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-100 pb-1.5 mb-2 text-xs font-semibold text-slate-500">
                  <button
                    onClick={() => setNotiTab("all")}
                    className={`pb-1 px-1 transition relative cursor-pointer ${
                      notiTab === "all" ? "text-slate-800 font-bold border-b-2 border-blue-500" : "hover:text-slate-700"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setNotiTab("unread")}
                    className={`pb-1 px-1 transition relative cursor-pointer ${
                      notiTab === "unread" ? "text-slate-800 font-bold border-b-2 border-blue-500" : "hover:text-slate-700"
                    }`}
                  >
                    Chưa đọc
                  </button>
                </div>

                {/* List Area */}
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  {filteredNotis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Bell className="h-8 w-8 text-slate-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-medium">Không có thông báo nào</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {filteredNotis.map((noti) => (
                        <div
                          key={noti.id}
                          onClick={() => handleItemClick(noti)}
                          className={`group flex items-start gap-3 rounded-xl p-2.5 transition text-left cursor-pointer hover:bg-slate-50 relative ${
                            !noti.isRead ? "bg-blue-50/30" : ""
                          }`}
                        >
                          {/* Left icon / avatar */}
                          <div className="relative shrink-0 mt-0.5">
                            {noti.senderId ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsNotiDropdownOpen(false);
                                  router.push(`/users/${noti.senderId}`);
                                }}
                                className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-slate-100 hover:ring-blue-400 transition cursor-pointer"
                              >
                                {noti.senderAvatar ? (
                                  <Image
                                    src={noti.senderAvatar}
                                    alt="Sender"
                                    width={32}
                                    height={32}
                                    className="object-cover h-8 w-8"
                                  />
                                ) : (
                                  <div className="grid h-full w-full place-items-center bg-slate-100 text-xs font-bold text-slate-600">
                                    {(noti.senderName || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100">
                                {getNotiIcon(noti.type)}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="text-xs text-slate-700 leading-normal break-words">
                              {noti.senderId && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsNotiDropdownOpen(false);
                                    router.push(`/users/${noti.senderId}`);
                                  }}
                                  className="font-bold text-slate-800 hover:text-blue-600 hover:underline mr-1 cursor-pointer"
                                >
                                  {noti.senderName || "Thành viên"}
                                </span>
                              )}
                              {noti.content}
                            </p>
                            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                              {formatTimeAgo(noti.createdAt)}
                            </span>
                          </div>

                          {/* Right elements */}
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => handleDeleteNoti(e, noti.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 transition cursor-pointer"
                              title="Xóa thông báo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {!noti.isRead && (
                            <span className="absolute right-3 top-4 h-2 w-2 rounded-full bg-blue-500 group-hover:hidden" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--color-primary-dark)] shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
              aria-label="Open user menu"
            >
              {userProfile.avatarUrl ? (
                <Image
                  src={userProfile.avatarUrl}
                  alt="Avatar"
                  width={44}
                  height={44}
                  className="rounded-full"
                />
              ) : (
                <User size={22} className="text-gray-700" />
              )}
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-800">{}</p>
                  <p className="text-xs font-semibold text-slate-500 truncate">
                    {email || "email@example.com"}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenSettings("profile");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Hồ sơ cá nhân
                  </button>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenSettings("settings");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                    Cài đặt chung
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer mt-1 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
