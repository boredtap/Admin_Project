"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import ProfileOverlay, { User } from "@/components/ProfileOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Filters {
  status: { [key: string]: boolean };
  level: { [key: string]: boolean };
}

const Users: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"All Users" | "Top 1000">("All Users");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(8); // Changed from 5 to 8
  const [currentPage, setCurrentPage] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [usersData, setUsersData] = useState<{
    "All Users": User[];
    "Top 1000": User[];
  }>({
    "All Users": [],
    "Top 1000": [],
  });
  const [filters, setFilters] = useState<Filters>({
    status: { Active: false, Suspended: false, Disband: false },
    level: {
      "Novice-Lv 1": false,
      "Explorer-Lv 2": false,
      "Apprentice-Lv 3": false,
      "Warrior-Lv 4": false,
      "Master - Lv 5": false,
      "Champion - Lv 6": false,
      "Tactician- Lv 7": false,
      "Specialist - Lv 8": false,
      "Conqueror -Lv 9": false,
      "Legend - Lv 10": false,
    },
  });

  const actionDropdownRef = useRef<HTMLDivElement>(null); // Ref for action dropdown
  const filterDropdownRef = useRef<HTMLDivElement>(null); // Ref for filter dropdown

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found");

      const response = await fetch(`${API_BASE_URL}/admin/user_management/users`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch users");
      const data: User[] = await response.json();
      setUsersData({
        "All Users": data,
        "Top 1000": data.slice(0, 1000),
      });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "DD-MM-YYYY";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const handleFilterChange = (category: "status" | "level", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: { ...prev[category], [value]: !prev[category][value] },
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: { Active: false, Suspended: false, Disband: false },
      level: {
        "Novice-Lv 1": false,
        "Explorer-Lv 2": false,
        "Apprentice-Lv 3": false,
        "Warrior-Lv 4": false,
        "Master - Lv 5": false,
        "Champion - Lv 6": false,
        "Tactician- Lv 7": false,
        "Specialist - Lv 8": false,
        "Conqueror -Lv 9": false,
        "Legend - Lv 10": false,
      },
    });
  };

  const handleRowClick = (userId: string) => {
    setSelectedUserId(userId);
    const user = filteredData.find((u) => u.telegram_user_id === userId);
    if (user) {
      setShowOverlay(true);
    }
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleStatusUpdate = (userId: string, newStatus: string) => {
    setUsersData((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab].map((user) =>
        user.telegram_user_id === userId ? { ...user, status: newStatus } : user
      ),
    }));
    if (selectedUserId === userId) {
      const user = filteredData.find((u) => u.telegram_user_id === userId);
      if (user) {
        setShowOverlay(true);
      }
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((user) => ({
      "Telegram ID": user.telegram_user_id,
      Username: user.username,
      Level: `${user.level} - ${user.level_name}`,
      "Coins Earned": user.coins_earned,
      "Invite Count": user.invite_count,
      "Registration Date": formatDate(user.registration_date),
      Status: user.status ?? "Unknown", // Handle null status
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users.xlsx");
  };

  const filteredData = usersData[activeTab].filter((user) => {
    const statusMatch = Object.keys(filters.status).some(
      (status) =>
        filters.status[status] &&
        user.status?.toString().toLowerCase() === status.toLowerCase()
    );
    const levelMatch = Object.keys(filters.level).some(
      (level) =>
        filters.level[level] &&
        user.level_name.toLowerCase().includes(level.toLowerCase().split("-")[0])
    );
    return (
      (!Object.values(filters.status).some((v) => v) || statusMatch) &&
      (!Object.values(filters.level).some((v) => v) || levelMatch)
    );
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Users Mgt" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  {["All Users", "Top 1000"].map((tab) => (
                    <span
                      key={tab}
                      className={`text-xs cursor-pointer pb-1 ${
                        activeTab === tab ? "text-white font-bold border-b-2 border-[#f9b54c]" : "text-gray-500"
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
                    placeholder="Search by name, status..."
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
                      ref={filterDropdownRef} // Added ref for filter dropdown
                      className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg p-4 shadow-lg z-10 text-black"
                    >
                      <div className="mb-4">
                        <h4 className="text-xs font-bold mb-2">Status</h4>
                        {Object.keys(filters.status).map((status) => (
                          <label key={status} className="flex items-center gap-2 text-xs mb-2">
                            <input
                              type="checkbox"
                              checked={filters.status[status]}
                              onChange={() => handleFilterChange("status", status)}
                            />
                            {status}
                          </label>
                        ))}
                      </div>
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
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-2 bg-[#19191A] text-white text-xs px-3 py-2 rounded-lg cursor-pointer"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    <Image src="/Date.png" alt="Date" width={12} height={12} />
                    <span>{formatDate(selectedDate?.toISOString())}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                <div />
                <div>Username</div>
                <div>Level</div>
                <div>Coins Earned</div>
                <div>Invite Count</div>
                <div>Reg. Date</div>
                <div>Status</div>
                <div>Action</div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              {filteredData.length === 0 ? (
                <div className="text-white text-xs">No users to display</div>
              ) : (
                filteredData
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .map((user, index) => {
                    const isActive = user.status?.toString().toLowerCase() === "active";
                    const isSuspended = user.status?.toString().toLowerCase() === "suspend";
                    const isDisband = user.status?.toString().toLowerCase() === "ban";
                    return (
                      <div
                        key={user.telegram_user_id}
                        className={`grid grid-cols-[40px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                          selectedUserId === user.telegram_user_id ? "bg-white text-black rounded-lg" : "text-white"
                        }`}
                        onClick={() => handleRowClick(user.telegram_user_id)}
                      >
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-4 h-4 border-2 rounded-full cursor-pointer flex items-center justify-center ${
                              selectedUserId === user.telegram_user_id ? "border-black bg-black" : "border-white"
                            }`}
                          >
                            {selectedUserId === user.telegram_user_id && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                        <div>{user.username}</div>
                        <div>{user.level_name}</div>
                        <div className="flex items-center gap-2">
                          <Image src="/logo.png" alt="Coin" width={16} height={16} />
                          {user.coins_earned}
                        </div>
                        <div>{user.invite_count}</div>
                        <div>{formatDate(user.registration_date)}</div>
                        <div>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              isActive
                                ? "bg-[#E7F7EF] text-[#0CAF60]"
                                : isSuspended
                                ? "bg-[#FFD8D8] text-[#FF0000]"
                                : isDisband
                                ? "bg-[#D8CBFD] text-[#551DEC]"
                                : "bg-gray-500 text-white"
                            }`}
                          >
                            {user.status ?? "Unknown"}
                          </span>
                        </div>
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
                              ref={actionDropdownRef} // Added ref for action dropdown
                              className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 text-black p-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isActive && (
                                <>
                                  <div
                                    className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                                    onClick={() => handleStatusUpdate(user.telegram_user_id, "suspend")}
                                  >
                                    <Image src="/disband.png" alt="Suspend" width={12} height={12} />
                                    Suspend
                                  </div>
                                  <div
                                    className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                                    onClick={() => handleStatusUpdate(user.telegram_user_id, "ban")}
                                  >
                                    <Image src="/disband.png" alt="Ban" width={12} height={12} />
                                    Ban
                                  </div>
                                </>
                              )}
                              {isSuspended && (
                                <div
                                  className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                                  onClick={() => handleStatusUpdate(user.telegram_user_id, "active")}
                                >
                                  <Image src="/resume2.png" alt="Resume" width={12} height={12} />
                                  Resume
                                </div>
                              )}
                              {isDisband && <div className="text-xs px-2 py-2 text-gray-500">Banned</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
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
          <ProfileOverlay
            user={filteredData.find((u) => u.telegram_user_id === selectedUserId)!}
            onClose={() => setShowOverlay(false)}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default Users;