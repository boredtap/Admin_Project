// src/components/UserProfileOverlay.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api";
import CreateNewReward, { RewardFormData } from "./CreateNewReward"; // Import RewardFormData

export interface Achievement {
  total_coin: number; // Matches backend field name
  completed_tasks: number;
  longest_streak?: number; // Optional in leaderboard response
  current_streak?: number; // Optional in leaderboard response
  rank: string; // String to match "#1" or "0"
  invitees?: number | null; // Can be null in today_achievement
}

export interface Clan {
  clan_name: string | null;
  in_clan_rank: number | null;
}

export interface User {
  telegram_user_id?: string; // Not in response, but passed from parent
  username: string;
  level?: number; // Number in leaderboard response
  level_name: string;
  image_url?: string;
  overall_achievement?: Achievement;
  today_achievement?: Achievement;
  wallet_address?: string | null;
  clan?: Clan | null;
  coins_earned?: number; // Fallback from parent component
  longest_streak?: number; // Fallback from parent component
  rank?: number; // Fallback from parent component
}

interface UserProfileOverlayProps {
  onClose: () => void;
  user: User;
}

const UserProfileOverlay: React.FC<UserProfileOverlayProps> = ({ onClose, user }) => {
    const [profile, setProfile] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showRewardOverlay, setShowRewardOverlay] = useState(false); // State for reward overlay

  useEffect(() => {
    if (user?.telegram_user_id) {
      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem("access_token");
          if (!token) throw new Error("No access token found");

          const url = `${API_BASE_URL}/admin/leaderboard/leaderboard_profile?telegram_user_id=${user.telegram_user_id}`;
          console.log("Fetching profile from:", url);
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
          console.log("Fetched profile data:", data);
          setProfile(data);
        } catch (err) {
          setError((err as Error).message);
          console.error("Error fetching profile:", err);
        }
      };
      fetchProfile();
    } else {
      console.log("No telegram_user_id provided, using initial user data:", user);
      setProfile(user); // Fallback to initial user data
    }
  }, [user]);

  const displayData = profile || user || {};

  const handleRewardSubmit = async (rewardData: RewardFormData) => {
    // Logic to handle reward submission (could call an API or update state)
    console.log("Reward submitted:", rewardData);
    setShowRewardOverlay(false); // Close overlay on success
  };


  if (error) {
    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
        <div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!displayData.username) {
    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
        <div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
      <div
        className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative text-center py-5">
          <h1 className="text-xl font-bold text-orange-500">User Profile</h1>
          <button className="absolute right-0 top-1/2 -translate-y-1/2" onClick={onClose}>
            <Image src="/cancel.png" alt="Close" width={24} height={24} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="mb-2">
            <Image
              src={displayData.image_url || "/profile-picture.png"}
              alt="Profile"
              width={80}
              height={80}
              className="rounded-full"
              onError={() => console.error("Image load failed:", displayData.image_url)}
            />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">{displayData.username}</h2>
            <p className="text-xs text-orange-500">
              Level: {displayData.level || "-"} - {displayData.level_name}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Overall Achievement</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Total Coins</span>
              <p>{displayData.overall_achievement?.total_coin ?? displayData.coins_earned ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Completed Tasks</span>
              <p>{displayData.overall_achievement?.completed_tasks ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Highest Streak</span>
              <p>{displayData.overall_achievement?.longest_streak ?? displayData.longest_streak ?? "-"}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Rank</span>
              <p>{displayData.overall_achievement?.rank ?? displayData.rank ?? "-"}</p>
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
                <button className="bg-red-600 text-white py-1 px-3 rounded-lg hover:bg-red-700 text-xs">
                  Disconnect
                </button>
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

        <div className="flex justify-center gap-4 mt-6">
          <button
            className="flex items-center gap-2 bg-[#0CAF60] text-white py-2 px-4 rounded-lg hover:bg-green-700 text-xs"
            onClick={() => setShowRewardOverlay(true)} // Open reward overlay
          >
            <Image src="/add2.png" alt="Reward" width={20} height={20} />
            Reward
          </button>
        </div>
      </div>

      {/* Reward Overlay */}
      {showRewardOverlay && (
        <CreateNewReward
          onClose={() => setShowRewardOverlay(false)}
          rewardToEdit={null} // No editing, creating new reward
          onSubmit={handleRewardSubmit}
          prefilledUser={displayData} // Pass user data for pre-filling
        />
      )}
    </div>
  );
};

export default UserProfileOverlay;