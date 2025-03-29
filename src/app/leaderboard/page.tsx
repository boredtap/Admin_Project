"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import UserProfileOverlay, { User } from "@/components/UserProfileOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface LeaderboardApiResponse {
  username: string;
  level_name: string;
  coins_earned: number;
  longest_streak: number;
  rank: number;
  telegram_user_id?: string;
  level?: string;
  image_url?: string;
  clan?: string;
}

interface Filters {
  level: { [key: string]: boolean };
}

const Leaderboard: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const actionDropdownRef = useRef<HTMLDivElement>(null); // Ref for Action dropdown
  const filterDropdownRef = useRef<HTMLDivElement>(null); // Ref for Filter dropdown
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"All Time" | "Daily" | "Weekly" | "Monthly">("All Time");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(8); // Already set to 8
  const [currentPage, setCurrentPage] = useState(1);
  const [leaderboardData, setLeaderboardData] = useState<{
    "All Time": User[];
    "Daily": User[];
    "Weekly": User[];
    "Monthly": User[];
  }>({
    "All Time": [],
    "Daily": [],
    "Weekly": [],
    "Monthly": [],
  });
  const [filters, setFilters] = useState<Filters>({
    level: {
      Novice: false,
      Explorer: false,
      Apprentice: false,
      Warrior: false,
      Master: false,
      Champion: false,
      Tactician: false,
      Specialist: false,
      Conqueror: false,
      Legend: false,
    },
  });

  // Action dropdown outside click handler
  useEffect(() => {
    const handleClickOutsideAction = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideAction);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideAction);
    };
  }, []);

  // Filter dropdown outside click handler
  useEffect(() => {
    const handleClickOutsideFilter = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideFilter);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideFilter);
    };
  }, []);

  useEffect(() => {
    fetchLeaderboardData(activeTab);
  }, [activeTab]);

  const fetchLeaderboardData = async (category: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found");

      const url = `${API_BASE_URL}/admin/leaderboard/?category=${category.toLowerCase().replace(" ", "_")}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      const data: LeaderboardApiResponse[] = await response.json();
      const mappedData: User[] = data.map((item) => ({
        username: item.username,
        level_name: item.level_name,
        coins_earned: item.coins_earned,
        longest_streak: item.longest_streak,
        rank: item.rank,
        telegram_user_id: item.telegram_user_id || "",
        level: item.level ? parseInt(item.level) : 0,
        image_url: item.image_url || "",
        clan: item.clan ? { clan_name: item.clan, in_clan_rank: 0 } : undefined,
      }));
      setLeaderboardData((prev) => ({ ...prev, [category]: mappedData }));
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    }
  };

  const handleFilterChange = (category: "level", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: { ...prev[category], [value]: !prev[category][value] },
    }));
  };

  const clearFilters = () => {
    setFilters({
      level: {
        Novice: false,
        Explorer: false,
        Apprentice: false,
        Warrior: false,
        Master: false,
        Champion: false,
        Tactician: false,
        Specialist: false,
        Conqueror: false,
        Legend: false,
      },
    });
  };

  const handleRowClick = (telegramUserId: string) => {
    setSelectedUserId(telegramUserId);
    setShowOverlay(true);
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleDelete = (telegramUserId: string) => {
    const updatedData = leaderboardData[activeTab].filter(
      (user) => user.telegram_user_id !== telegramUserId
    );
    setLeaderboardData((prev) => ({ ...prev, [activeTab]: updatedData }));
    setShowActionDropdown(null); // Close dropdown after action
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((user) => ({
      Rank: user.rank,
      Username: user.username,
      Level: user.level_name,
      "Coins Earned": user.coins_earned,
      Clan: user.clan?.clan_name || user.clan || "-",
      "Longest Streak": user.longest_streak,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leaderboard");
    XLSX.writeFile(workbook, "leaderboard.xlsx");
  };

  const filteredData = leaderboardData[activeTab].filter((user) => {
    const levelMatch = Object.keys(filters.level).some(
      (level) => filters.level[level] && user.level_name === level
    );
    return !Object.values(filters.level).includes(true) || levelMatch;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Leaderboard" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  {["All Time", "Daily", "Weekly", "Monthly"].map((tab) => (
                    <span
                      key={tab}
                      className={`text-xs cursor-pointer pb-1 ${
                        activeTab === tab
                          ? "text-white font-bold border-b-2 border-[#f9b54c]"
                          : "text-gray-500"
                      }`}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-2 bg-[#19191A] text-white text-xs px-3 py-2 rounded-lg"
                    onClick={handleExport}
                  >
                    <Image src="/download.png" alt="Export" width={12} height={12} />
                    Export
                  </button>
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                  <Image src="/search.png" alt="Search" width={16} height={16} />
                  <input
                    type="text"
                    placeholder="Search by username, clan..."
                    className="flex-1 bg-transparent border-none outline-none text-white text-xs pl-2"
                  />
                  <Image
                    src="/filter.png"
                    alt="Filter"
                    width={16}
                    height={16}
                    className="cursor-pointer"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  />
                  {showFilterDropdown && (
                    <div
                      ref={filterDropdownRef} // Added ref for Filter dropdown
                      className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg p-4 shadow-lg z-10 text-black"
                    >
                      <div className="mb-4">
                        <h4 className="text-xs font-bold mb-2">Level</h4>
                        {Object.keys(filters.level).map((level) => (
                          <label key={level} className="flex items-center gap-2 text-xs mb-2">
                            <input
                              type="checkbox"
                              checked={filters.level[level]}
                              onChange={() => handleFilterChange("level", level)}
                            />
                            {level}
                          </label>
                        ))}
                      </div>
                      <button
                        className="text-red-500 text-xs underline bg-transparent border-none cursor-pointer"
                        onClick={clearFilters}
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                <div />
                <div>Rank</div>
                <div>Username</div>
                <div>Level</div>
                <div>Coin Earned</div>
                <div>Clan</div>
                <div>Longest Streak</div>
                <div>Action</div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              {filteredData.length === 0 ? (
                <div className="text-white text-xs">No users to display</div>
              ) : (
                filteredData
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .map((user, index) => (
                    <div
                      key={user.telegram_user_id || index}
                      className={`grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                        selectedUserId === user.telegram_user_id ? "bg-white text-black rounded-lg" : "text-white"
                      }`}
                      onClick={() => handleRowClick(user.telegram_user_id || "")}
                    >
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-4 h-4 border-2 rounded-full cursor-pointer ${
                            selectedUserId === user.telegram_user_id ? "bg-black border-black" : "border-white"
                          }`}
                        />
                      </div>
                      <div>{user.rank}</div>
                      <div>{user.username}</div>
                      <div>{user.level_name}</div>
                      <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Coin" width={16} height={16} />
                        {user.coins_earned}
                      </div>
                      <div>{user.clan?.clan_name || (typeof user.clan === "string" ? user.clan : "-")}</div>
                      <div>{user.longest_streak}</div>
                      <div className="relative">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(index);
                          }}
                        >
                          <span className="text-xs">Action</span>
                          <Image src="/dropdown.png" alt="Dropdown" width={16} height={16} />
                        </div>
                        {showActionDropdown === index && (
                          <div
                            ref={actionDropdownRef} // Ref already present, kept as is
                            className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 text-black p-2"
                            onClick={(e) => e.stopPropagation()} // Prevent row click from triggering
                          >
                            <div
                              className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                              onClick={() => handleDelete(user.telegram_user_id || "")}
                            >
                              <Image src="/deletered.png" alt="Delete" width={12} height={12} />
                              Delete
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}

              <div className="relative mt-6">
                <div className="border-t border-white/20"></div>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 text-white">
                  <div className="flex items-center gap-2 mb-2 sm:mb-0">
                    <span className="text-xs">Show Result:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-[#19191A] text-white border border-[#363638] rounded px-2 py-1 text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image
                      src="/back-arrow.png"
                      alt="Previous"
                      width={20}
                      height={20}
                      className="cursor-pointer"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    />
                    <div className="flex gap-2 relative">
                      {pageNumbers.map((num) => (
                        <span
                          key={num}
                          className={`px-2 py-1 rounded text-xs cursor-pointer ${
                            currentPage === num ? "bg-[#f9b54c] text-black" : ""
                          }`}
                          onClick={() => setCurrentPage(num)}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                    <Image
                      src="/front-arrow.png"
                      alt="Next"
                      width={20}
                      height={20}
                      className="cursor-pointer"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showOverlay && (
          <UserProfileOverlay
            user={filteredData.find((u) => u.telegram_user_id === selectedUserId) || filteredData[0]}
            onClose={() => setShowOverlay(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Leaderboard;