// src/components/ClanProfileOverlay.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api";

interface Clan {
  id: string;
  name: string;
  creator: string;
  rank: string;
  coins_earned: number;
  status: string;
  members: number;
  image_id?: string;
  image_url?: string;
}

interface TopEarner {
  username: string;
  level: string;
  total_coins: number;
  rank: number;
}

interface ClanProfileOverlayProps {
  onClose: () => void;
  clanId: string;
  onApprove: (clanId: string) => void;
  onDisband: (clanId: string) => void;
  onResume: (clanId: string) => void;
  onStatusUpdate: (newStatus: string) => void;
}

const ClanProfileOverlay: React.FC<ClanProfileOverlayProps> = ({
  onClose,
  clanId,
  onApprove,
  onDisband,
  onResume,
  onStatusUpdate,
}) => {
  const [clan, setClan] = useState<Clan | null>(null);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clanImage, setClanImage] = useState<string | null>(null);

  
  useEffect(() => {
    const fetchClanProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No access token found");

       // Fetch clan details
       const clanResponse = await fetch(`${API_BASE_URL}/admin/clan/get_clan/${clanId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!clanResponse.ok) throw new Error("Failed to fetch clan profile");
      const clanData: Clan = await clanResponse.json();
      setClan(clanData);

        // Fetch clan image dynamically
        // Assuming image_id is either part of clanData or can be derived; fallback to clanId if no image_id
        const imageId = clanData.image_id || clanId; // Use image_id if available, otherwise clanId
        const imageResponse = await fetch(
          `${API_BASE_URL}/admin/clan/get_clan/${clanId}/image?image_id=${imageId}`,
          {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }
        );
        if (!imageResponse.ok) {
          console.warn("Failed to fetch clan image, using fallback");
          setClanImage(clanData.image_url || "/logo.png");
        } else {
          const imageBlob = await imageResponse.blob();
          setClanImage(URL.createObjectURL(imageBlob));
        }

        // Fetch top earners
        const topEarnersResponse = await fetch(
          `${API_BASE_URL}/admin/clan/clan/${clanId}/top_earner?page_number=1&page_size=20`,
          {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }
        );
        if (!topEarnersResponse.ok) throw new Error("Failed to fetch top earners");
        const topEarnersData: TopEarner[] = await topEarnersResponse.json();
        setTopEarners(topEarnersData);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    fetchClanProfile();
  }, [clanId]);

  const handleAction = (action: "approve" | "disband" | "resume") => {
    if (action === "approve") {
      onApprove(clanId);
      setClan((prev) => prev ? { ...prev, status: "Active" } : prev);
      onStatusUpdate("Active");
    } else if (action === "disband") {
      onDisband(clanId);
      setClan((prev) => prev ? { ...prev, status: "Disband" } : prev);
      onStatusUpdate("Disband");
    } else if (action === "resume") {
      onResume(clanId);
      setClan((prev) => prev ? { ...prev, status: "Active" } : prev);
      onStatusUpdate("Active");
    }
  };

  if (error)
    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
        <div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto">
          Error: {error}
        </div>
      </div>
    );
  if (!clan)
    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
        <div className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto">
          Loading...
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
      <div
        className="bg-[#202022] rounded-lg p-6 text-white w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative text-center py-5">
          <h1 className="text-xl font-bold text-orange-500">Clan Profile</h1>
          <button className="absolute right-0 top-1/2 -translate-y-1/2" onClick={onClose}>
            <Image src="/cancel.png" alt="Close" width={24} height={24} />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="mb-2 w-20 h-20 relative">
            <Image
              src={clanImage || clan.image_url || "/logo.png"}
              alt="Clan"
              fill
              className="rounded-full object-cover"
              sizes="80px"
            />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold">{clan.name}</h2>
            <p className="text-xs">
              <span
                className={`inline-block w-20 h-8 rounded text-center leading-8 text-xs font-medium ${
                  clan.status.toLowerCase() === "active"
                    ? "bg-[#E7F7EF] text-[#0CAF60]"
                    : clan.status.toLowerCase() === "pending"
                    ? "bg-[#D8CBFD] text-[#551DEC]"
                    : "bg-[#19191A] text-white"
                }`}
              >
                {clan.status}
              </span>
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-orange-500 text-sm font-bold mb-2">Clan Details</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Clan Rank</span>
              <p>{clan.rank}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Clan Creator</span>
              <p>{clan.creator}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Coin Earned</span>
              <p>{clan.coins_earned}</p>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#AEAAAA]">Members</span>
              <p>{clan.members}</p>
            </div>
          </div>
        </div>

        <hr className="border-[#363638] my-4" />
        <div>
          <h3 className="text-orange-500 text-sm font-bold mb-2">Clan Top Earners</h3>
          <hr className="border-[#363638] mb-4" />
          <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium py-3">
            <div />
            <div>User Name</div>
            <div>Level</div>
            <div>Total Coin</div>
            <div>Ranking</div>
          </div>
          {topEarners.length > 0 ? (
            topEarners.map((earner, index) => (
              <div
                key={index}
                className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] gap-3 py-3 text-sm text-white"
              >
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white rounded-full" />
                </div>
                <div>{earner.username}</div>
                <div>{earner.level}</div>
                <div>{earner.total_coins}</div>
                <div>{earner.rank}</div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-[48px_1fr_1fr_1fr_1fr] gap-3 py-3 text-sm text-white">
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white rounded-full" />
              </div>
              <div>-</div>
              <div>-</div>
              <div>-</div>
              <div>-</div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          {clan.status.toLowerCase() === "active" ? (
            <button
              className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 text-xs"
              onClick={() => handleAction("disband")}
            >
              <Image src="/disband.png" alt="Disband" width={20} height={20} />
              Disband
            </button>
          ) : clan.status.toLowerCase() === "pending" ? (
            <>
              <button
                className="flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 text-xs"
                onClick={() => handleAction("disband")}
              >
                <Image src="/disband.png" alt="Disband" width={20} height={20} />
                Disband
              </button>
              <button
                className="flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-xs"
                onClick={() => handleAction("approve")}
              >
                <Image src="/approve.png" alt="Approve" width={20} height={20} />
                Approve
              </button>
            </>
          ) : (
            <button
              className="flex items-center gap-2 bg-white text-black py-2 px-4 rounded-lg hover:bg-gray-200 text-xs"
              onClick={() => handleAction("resume")}
            >
              <Image src="/resume.png" alt="Resume" width={20} height={20} />
              Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClanProfileOverlay;