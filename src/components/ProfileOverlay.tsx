"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api";

export interface Achievement {
  total_coin: number;
  completed_tasks?: number; // Made optional to match data
  longest_streak?: number;
  current_streak?: number;
  rank?: string;
  invitees?: number | null;
}

export interface Clan {
  clan_name: string | null;
  in_clan_rank: number | null;
}

export interface User {
  status: string | number | null;
  registration_date: string | undefined;
  coins_earned: number;
  invite_count: number;
  telegram_user_id: string;
  username: string;
  level: number;
  level_name: string;
  image_url?: string;
  overall_achievement?: Achievement;
  today_achievement?: Achievement;
  wallet_address?: string | null;
  clan?: Clan | null;
  created_at?: string;
}

interface ProfileOverlayProps {
  onClose: () => void;
  user: User;
  onStatusUpdate: (userId: string, newStatus: string) => void;
}

const ProfileOverlay: React.FC<ProfileOverlayProps> = ({ onClose, user, onStatusUpdate }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showActionOverlay, setShowActionOverlay] = useState<"ban" | "suspend" | "resume" | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [suspendEndDate, setSuspendEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (user?.telegram_user_id) {
      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem("access_token");
          if (!token) throw new Error("No access token found");

          const url = `${API_BASE_URL}/admin/user_management/user/${user.telegram_user_id}`;
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });
          if (!response.ok) throw new Error(`Failed to fetch user profile: ${response.status}`);
          const data: User = await response.json();
          setProfile({
            ...user,
            ...data,
            overall_achievement: {
              total_coin: user.coins_earned,
              completed_tasks: data.overall_achievement?.completed_tasks,
              longest_streak: data.overall_achievement?.longest_streak,
              current_streak: data.overall_achievement?.current_streak,
              rank: data.overall_achievement?.rank,
              invitees: data.overall_achievement?.invitees,
            },
          });
        } catch (err) {
          setError((err as Error).message);
          console.error("Error fetching profile:", err);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const displayData = profile || {
    ...user,
    overall_achievement: {
      total_coin: user.coins_earned,
      completed_tasks: undefined,
      longest_streak: undefined,
      current_streak: undefined,
      rank: undefined,
      invitees: undefined,
    },
  };

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return "DD-MM-YYYY";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const handleAction = async (action: "ban" | "suspend" | "resume") => {
    const endpoint = `${API_BASE_URL}/admin/security/suspend_user/${displayData.telegram_user_id}`;
    let url = `${endpoint}?status=${action}`;
    if (action === "suspend" && suspendEndDate) {
      url += `&end_date=${suspendEndDate.toISOString().split("T")[0]}&reason=admin_action`;
    }

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to ${action} user: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      const data = await response.json();
      const newStatus = action === "resume" ? "active" : action === "suspend" ? "suspend" : "ban";
      setSuccessMessage(data.message || `${action.charAt(0).toUpperCase() + action.slice(1)} successful`);
      setShowActionOverlay(null);
      setShowSuccessOverlay(true);
      setProfile((prev) => (prev ? { ...prev, status: newStatus } : { ...user, status: newStatus }));
      onStatusUpdate(displayData.telegram_user_id, newStatus);
    } catch (err) {
      setErrorMessage((err as Error).message || "An error occurred");
      setShowActionOverlay(null);
      setShowErrorOverlay(true);
    }
  };

  const CustomDatePicker: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
  
    const getDaysInMonth = (date: Date): (Date | null)[] => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const days: (Date | null)[] = [];
      for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
      return days;
    };
  
    const days = getDaysInMonth(currentMonth);
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
    const changeMonth = (offset: number) => {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
    };
  
    return (
      <div className="absolute top-full mt-2 w-[220px] bg-white rounded-lg p-2 shadow-lg z-10 text-black">
        <div className="flex justify-between items-center mb-1">
          <button onClick={() => changeMonth(-1)} className="text-sm">{"<"}</button>
          <span className="text-xs font-medium">
            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="text-sm">{">"}</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-600">
          {weekDays.map((day, index) => (
            <div key={`${day}-${index}`}>{day}</div> // Use a unique key combining day and index
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {days.map((date, index) => (
            <div
              key={index}
              className={`p-1 rounded cursor-pointer ${
                date
                  ? "hover:bg-gray-100 " +
                    (suspendEndDate && date && date.toDateString() === suspendEndDate.toDateString()
                      ? "bg-orange-500 text-white"
                      : "")
                  : ""
              }`}
              onClick={() => date && setSuspendEndDate(date)}
            >
              {date ? date.getDate() : ""}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) return <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"><div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto">Error: {error}</div></div>;
  if (!displayData.username) return <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"><div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto">Loading...</div></div>;

  const isActive = displayData.status?.toString().toLowerCase() === "active";
  const isSuspended = displayData.status?.toString().toLowerCase() === "suspend";
  const isDisband = displayData.status?.toString().toLowerCase() === "ban";

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative text-center py-5">
          <h1 className="text-xl font-bold text-orange-500">User Profile</h1>
          <button className="absolute right-0 top-1/2 -translate-y-1/2" onClick={onClose}>
            <Image src="/cancel.png" alt="Close" width={24} height={24} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <Image src={displayData.image_url || "/profile-picture.png"} alt="Profile" width={80} height={80} className="rounded-full mb-2" />
          <h2 className="text-lg font-bold">{displayData.username}</h2>
          <p className="text-xs text-orange-500">Level: {displayData.level || "-"} - {displayData.level_name}</p>
          <span
            className={`mt-2 px-2 py-1 rounded text-xs ${
              isActive ? "bg-[#E7F7EF] text-[#0CAF60]" : isSuspended ? "bg-[#FFD8D8] text-[#FF0000]" : isDisband ? "bg-[#D8CBFD] text-[#551DEC]" : "bg-gray-500 text-white"
            }`}
          >
            {displayData.status ?? "Unknown"}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Overall Achievement</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Total Coins</span>
              <p>{displayData.overall_achievement?.total_coin ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Completed Tasks</span>
              <p>{displayData.overall_achievement?.completed_tasks ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Highest Streak</span>
              <p>{displayData.overall_achievement?.longest_streak ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Rank</span>
              <p>{displayData.overall_achievement?.rank ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Invitees</span>
              <p>{displayData.overall_achievement?.invitees ?? "-"}</p>
            </div>
          </div>
        </div>

        <hr className="border-[#363638] my-4" />
        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Today Achievement</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Total Coins</span>
              <p>{displayData.today_achievement?.total_coin ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Completed Tasks</span>
              <p>{displayData.today_achievement?.completed_tasks ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Current Streak</span>
              <p>{displayData.today_achievement?.current_streak ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Rank</span>
              <p>{displayData.today_achievement?.rank ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Invitees</span>
              <p>{displayData.today_achievement?.invitees ?? "-"}</p>
            </div>
          </div>
        </div>

        <hr className="border-[#363638] my-4" />
        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Wallet Address</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between items-center text-sm">
            {displayData.wallet_address ? (
              <>
                <span className="truncate max-w-[400px]">{displayData.wallet_address}</span>
                <button className="bg-red-600 text-white py-1 px-3 rounded-lg hover:bg-red-700 text-xs">Disconnect</button>
              </>
            ) : (
              <>
                <Image src="/wallet.png" alt="Wallet" width={50} height={50} />
                <span>-</span>
              </>
            )}
          </div>
        </div>

        <hr className="border-[#363638] my-4" />
        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Clan</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Clan Name</span>
              <p>{displayData.clan?.clan_name ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">In-Clan Rank</span>
              <p>{displayData.clan?.in_clan_rank ?? "-"}</p>
            </div>
          </div>
        </div>

        <hr className="border-[#363638] my-4" />
        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Registration</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Registration Date</span>
              <p>{formatDate(displayData.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          {isActive && (
            <>
              <button
                className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActionOverlay("suspend");
                }}
              >
                <Image src="/disband.png" alt="Suspend" width={20} height={20} />
                Suspend
              </button>
              <button
                className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActionOverlay("ban");
                }}
              >
                <Image src="/disband.png" alt="Ban" width={20} height={20} />
                Ban
              </button>
            </>
          )}
          {isSuspended && (
            <button
              className="flex items-center gap-2 bg-white text-black/50 py-2 px-4 rounded-lg hover:bg-blue-200 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setShowActionOverlay("resume");
              }}
            >
              <Image src="/resume2.png" alt="Resume" width={20} height={20} />
              Resume
            </button>
          )}
          {isDisband && <p className="text-red-500 text-sm">User is banned</p>}
        </div>
      </div>

      {showActionOverlay && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={() => setShowActionOverlay(null)}>
          <div className="bg-[#202022] rounded-lg p-6 text-white w-[320px] text-center relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-4 top-4" onClick={() => setShowActionOverlay(null)}>
              <Image src="/cancel.png" alt="Close" width={20} height={20} />
            </button>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Image
                src={showActionOverlay === "ban" ? "/disband2.png" : showActionOverlay === "suspend" ? "/disband2.png" : "/resume2.png"}
                alt={`${showActionOverlay} Icon`}
                width={30}
                height={30}
              />
              <h2 className="text-xl font-bold">{`${showActionOverlay.charAt(0).toUpperCase() + showActionOverlay.slice(1)}?`}</h2>
            </div>
            <p className="text-sm mb-6">Are you sure you want to {showActionOverlay} this user?</p>
            <div className="flex flex-col gap-4 text-left">
              <div>
                <label className="text-xs text-[#AEAAAA] mb-1 block">User ID</label>
                <input
                  type="text"
                  value={displayData.username}
                  readOnly
                  className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-lg px-3 text-white text-sm"
                />
              </div>
              {showActionOverlay === "suspend" && (
                <div>
                  <label className="text-xs text-[#AEAAAA] mb-1 block">Suspend Until</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDate(suspendEndDate)}
                      readOnly
                      className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-lg px-3 text-white text-sm text-left pr-10"
                    />
                    <Image
                      src="/date.png"
                      alt="Date"
                      width={20}
                      height={20}
                      className="absolute right-1/2 top-1/2 -translate-y-1/2 transform translate-x-1/2 cursor-pointer"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    />
                    {showDatePicker && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2">
                        <CustomDatePicker />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(showActionOverlay);
              }}
              className="w-full h-10 bg-black text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors mt-6"
            >
              Proceed
            </button>
            <button
              onClick={() => setShowActionOverlay(null)}
              className="text-white text-sm underline bg-transparent border-none cursor-pointer mt-2"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={() => setShowSuccessOverlay(false)}>
          <div className="bg-[#202022] rounded-lg p-6 text-white w-[320px] text-center" onClick={(e) => e.stopPropagation()}>
            <Image src="/success.png" alt="Success Icon" width={100} height={100} className="mb-4 mx-auto" />
            <h2 className="text-3xl font-bold mb-4">Success</h2>
            <p className="text-sm mb-6">{successMessage}</p>
            <button
              onClick={() => {
                setShowSuccessOverlay(false);
                onClose();
              }}
              className="w-full h-12 bg-[#0CAF60] text-white rounded-lg text-base font-bold hover:bg-green-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showErrorOverlay && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={() => setShowErrorOverlay(false)}>
          <div className="bg-[#202022] rounded-lg p-6 text-white w-[320px] text-center" onClick={(e) => e.stopPropagation()}>
            <Image src="/error.png" alt="Error Icon" width={100} height={100} className="mb-4 mx-auto" />
            <h2 className="text-3xl font-bold mb-4">Error</h2>
            <p className="text-sm mb-6">{errorMessage}</p>
            <button
              onClick={() => setShowErrorOverlay(false)}
              className="w-full h-12 bg-red-600 text-white rounded-lg text-base font-bold hover:bg-red-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileOverlay;