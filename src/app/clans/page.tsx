"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import ClanProfileOverlay from "@/components/ClanProfileOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Clan {
  id: string;
  name: string;
  creator: string;
  rank: string;
  coins_earned: number;
  created_at: string;
  status: string;
}

interface Filters {
  status: { Active: boolean; Pending: boolean; Disband: boolean };
  level: Record<string, boolean>;
}

const Clans: React.FC = () => {
  const [selectedClanId, setSelectedClanId] = useState<string | null>(null);
  const [showApproveOverlay, setShowApproveOverlay] = useState(false);
  const [showDisbandOverlay, setShowDisbandOverlay] = useState(false);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string | null>(null);  const [activeTab, setActiveTab] = useState<string>("All Clans");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(8); // Default to 8 rows
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [showClanOverlay, setShowClanOverlay] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Filters>({
    status: { Active: false, Pending: false, Disband: false },
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

  const [clansData, setClansData] = useState<Record<string, Clan[]>>({
    "All Clans": [],
    Active: [],
    "Pending Approval": [],
    Disband: [],
  });

  const actionDropdownRef = useRef<HTMLDivElement>(null); // Ref for action dropdown
    const filterDropdownRef = useRef<HTMLDivElement>(null); // Ref for filter dropdown
  

  // Click outside to close dropdown (from Rewards)
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

  const fetchClans = useCallback(
    async (category: string, page = currentPage, pageSize = rowsPerPage) => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No access token found");

        const categoryMap: Record<string, string> = {
          "All Clans": "all_clans",
          Active: "active",
          "Pending Approval": "pending",
          Disband: "disbanded",
        };
        const apiCategory = categoryMap[category] || "all_clans";

        const response = await fetch(
          `${API_BASE_URL}/admin/clan/get_clans?category=${apiCategory}&page=${page}&page_size=${pageSize}`,
          {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch ${category} clans: ${errorText}`);
        }

        const data: Clan[] = await response.json();
        setClansData((prev) => ({ ...prev, [category]: data }));
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        console.error("Fetch clans error:", err);
      }
    },
    [currentPage, rowsPerPage]
  );

  useEffect(() => {
    fetchClans(activeTab);
  }, [activeTab, fetchClans]);

  const alterClanStatus = async (clanId: string, action: string) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found");

      const response = await fetch(
        `${API_BASE_URL}/admin/clan/alter_clan_status/${clanId}?alter_action=${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }
      );
      if (!response.ok) throw new Error(`Failed to ${action} clan`);

      fetchClans(activeTab);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleApprove = (clanId: string) => {
    setSelectedClanId(clanId);
    setShowApproveOverlay(true);
  };

  const handleDisband = (clanId: string) => {
    setSelectedClanId(clanId);
    setShowDisbandOverlay(true);
  };

  const handleResume = (clanId: string) => {
    setSelectedClanId(clanId);
    setShowResumeOverlay(true);
  };

  const confirmApprove = async () => {
    if (selectedClanId) {
      await alterClanStatus(selectedClanId, "approve");
      setShowApproveOverlay(false);
      setSelectedClanId(null);
      setSelectedRows(null); // Changed from []
      if (showClanOverlay === selectedClanId) {
        setClansData((prev) => ({
          ...prev,
          [activeTab]: prev[activeTab].map((clan) =>
            clan.id === selectedClanId ? { ...clan, status: "Active" } : clan
          ),
        }));
      }
    }
  };

  const confirmDisband = async () => {
    if (selectedClanId) {
      await alterClanStatus(selectedClanId, "disband");
      setShowDisbandOverlay(false);
      setSelectedClanId(null);
      setSelectedRows(null); // Changed from []
      if (showClanOverlay === selectedClanId) {
        setClansData((prev) => ({
          ...prev,
          [activeTab]: prev[activeTab].map((clan) =>
            clan.id === selectedClanId ? { ...clan, status: "Disband" } : clan
          ),
        }));
      }
    }
  };

  const confirmResume = async () => {
    if (selectedClanId) {
      await alterClanStatus(selectedClanId, "resume");
      setShowResumeOverlay(false);
      setSelectedClanId(null);
      setSelectedRows(null); // Changed from []
      if (showClanOverlay === selectedClanId) {
        setClansData((prev) => ({
          ...prev,
          [activeTab]: prev[activeTab].map((clan) =>
            clan.id === selectedClanId ? { ...clan, status: "Active" } : clan
          ),
        }));
      }
    }
  };

  const formatDate = (date: string | Date | null): string => {
    if (!date) return "DD-MM-YYYY";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const CustomDatePicker: React.FC = () => {
    const days = getDaysInMonth(currentMonth);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <div className="w-64 bg-white rounded-md p-3 shadow-lg z-10">
        <div className="flex justify-between items-center mb-2 text-black">
          <button onClick={() => changeMonth(-1)} className="text-sm">{"<"}</button>
          <span className="text-xs">{`${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}</span>
          <button onClick={() => changeMonth(1)} className="text-sm">{">"}</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-600">
          {weekDays.map((day) => (
            <div key={day} className="text-center">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 mt-2 text-black">
          {days.map((date, index) => (
            <div
              key={index}
              className={`text-center py-1 rounded cursor-pointer text-xs ${
                date
                  ? selectedDate && date.toDateString() === selectedDate.toDateString()
                    ? "bg-[#f9b54c] text-white"
                    : "hover:bg-gray-100"
                  : ""
              }`}
              onClick={() => date && handleDateSelect(date)}
            >
              {date ? date.getDate() : ""}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleFilterChange = (category: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [value]: !(prev[category] as Record<string, boolean>)[value],
      },
    }));
  };

  const handleRowClick = (clanId: string) => {
    setSelectedRows(clanId); // Set to single clanId
    setShowClanOverlay(clanId); // Open overlay
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedRows(null); // Changed from []
    setShowActionDropdown(null);
    setSelectedClanId(null);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((clan) => ({
      "Clan Name": clan.name,
      "Owner or Creator": clan.creator,
      "Clan Rank": clan.rank,
      "Total Coin": clan.coins_earned,
      "Creation Date": formatDate(clan.created_at),
      Status: clan.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clans");
    XLSX.writeFile(workbook, "clans.xlsx");
  };

  const filteredData = clansData[activeTab].filter((clan) => {
    const statusMatch = Object.keys(filters.status).some(
      (status) => filters.status[status as keyof typeof filters.status] && clan.status.toLowerCase() === status.toLowerCase()
    );
    const levelMatch = Object.keys(filters.level).some(
      (level: string) => filters.level[level] && clan.rank.toLowerCase().includes(level.toLowerCase().split("-")[0])
    );
    const searchMatch =
      clan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clan.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clan.rank.toLowerCase().includes(searchTerm.toLowerCase());
    return (
      (!Object.values(filters.status).includes(true) || statusMatch) &&
      (!Object.values(filters.level).includes(true) || levelMatch) &&
      (searchTerm === "" || searchMatch)
    );
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Clans" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  {["All Clans", "Active", "Pending Approval", "Disband"].map((tab) => (
                    <span
                      key={tab}
                      className={`text-xs cursor-pointer pb-1 ${
                        activeTab === tab ? "text-white font-bold border-b-2 border-[#f9b54c]" : "text-gray-500"
                      }`}
                      onClick={() => handleTabChange(tab)}
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
                  <button
                    className="flex items-center gap-2 bg-white text-[#202022] text-xs px-3 py-2 rounded-lg"
                  >
                    <Image src="/add.png" alt="Create Clan Challenge" width={12} height={12} />
                    Clan Challenge
                  </button>
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                  <Image src="/search.png" alt="Search" width={16} height={16} />
                  <input
                    type="text"
                    placeholder="Search by name, status, rank..."
                    className="flex-1 bg-transparent border-none outline-none text-white text-xs pl-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                      ref={filterDropdownRef} // Optional: Added ref for filter dropdown
                      className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg p-4 shadow-lg z-10 text-black"
                    >
                    <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg p-4 shadow-lg z-10 text-black">
                      <div className="mb-4">
                        <h4 className="text-xs font-bold mb-2">Clan Status</h4>
                        {Object.keys(filters.status).map((status) => (
                          <label key={status} className="flex items-center gap-2 text-xs mb-2">
                            <input
                              type="checkbox"
                              checked={filters.status[status as keyof typeof filters.status]}
                              onChange={() => handleFilterChange("status", status)}
                            />
                            {status}
                          </label>
                        ))}
                      </div>
                      </div>
                      
                        <h4 className="text-xs font-bold mb-2">Clan Level</h4>
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
                  
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      className="flex items-center gap-2 bg-[#19191A] text-white text-xs px-3 py-2 rounded-lg cursor-pointer"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Image src="/Date.png" alt="Date" width={12} height={12} />
                      <span>{formatDate(selectedDate)}</span>
                    </button>
                    {showDatePicker && (
                      <div className="absolute top-full right-0 mt-2 z-10">
                        <CustomDatePicker />
                      </div>
                    )}
                  </div>
                  <button
                    className="flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                    onClick={() => selectedRows && setShowDisbandOverlay(true)} // Check if selectedRows is truthy
                    disabled={!selectedRows} // Disable if null
                  >
                    <Image src="/delete.png" alt="Delete" width={12} height={12} />
                    Delete
                  </button>
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="grid grid-cols-[40px_1.5fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                <div />
                <div>Clan Name</div>
                <div>Owner or Creator</div>
                <div>Clan Rank</div>
                <div>Total Coin</div>
                <div>Creation Date</div>
                <div>Status</div>
                <div>Action</div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              {filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((clan, index) => (
                <div
                  key={clan.id}
                  className={`grid grid-cols-[40px_1.5fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                    selectedRows === clan.id ? "bg-white text-black rounded-lg" : "text-white"
                  }`}
                  onClick={() => handleRowClick(clan.id)}
                >
                  <div className="flex items-center justify-center">
                    <div
                      className={`w-4 h-4 border-2 rounded-full cursor-pointer flex items-center justify-center ${
                        selectedRows === clan.id ? "border-black bg-black" : "border-white"
                      }`}
                    >
                      {selectedRows === clan.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <div className="truncate">{clan.name}</div>
                  <div>{clan.creator}</div>
                  <div>{clan.rank}</div>
                  <div className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Coin" width={16} height={16} />
                    {clan.coins_earned}
                  </div>
                  <div>{formatDate(clan.created_at)}</div>
                  <div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        clan.status.toLowerCase() === "active"
                          ? "bg-[#E7F7EF] text-[#0CAF60]"
                          : clan.status.toLowerCase() === "pending"
                          ? "bg-[#D8CBFD] text-[#551DEC]"
                          : "bg-[#19191A] text-[#D3D1D1]"
                      }`}
                    >
                      {clan.status}
                    </span>
                  </div>
                  <div className="relative">
                    <button
                      className="flex items-center gap-2 cursor-pointer bg-transparent border-none text-xs text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(index);
                      }}
                    >
                      <span>Action</span>
                      <Image src="/dropdown.png" alt="Dropdown" width={16} height={16} />
                    </button>
                    {showActionDropdown === index && (
                      <div
                        ref={actionDropdownRef}
                        className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-20 text-black p-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {clan.status.toLowerCase() === "disband" ? (
                          <button
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs w-full text-left"
                            onClick={() => {
                              handleResume(clan.id);
                              setShowActionDropdown(null);
                            }}
                          >
                            <Image src="/edit.png" alt="Resume" width={12} height={12} />
                            Resume
                          </button>
                        ) : clan.status.toLowerCase() === "pending" ? (
                          <button
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs w-full text-left"
                            onClick={() => {
                              handleApprove(clan.id);
                              setShowActionDropdown(null);
                            }}
                          >
                            <Image src="/edit.png" alt="Approve" width={12} height={12} />
                            Approve
                          </button>
                        ) : (
                          <>
                            <button
                              className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs w-full text-left"
                              onClick={() => {
                                handleApprove(clan.id);
                                setShowActionDropdown(null);
                              }}
                            >
                              <Image src="/edit.png" alt="Approve" width={12} height={12} />
                              Approve
                            </button>
                            <button
                              className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs w-full text-left"
                              onClick={() => {
                                handleDisband(clan.id);
                                setShowActionDropdown(null);
                              }}
                            >
                              <Image src="/deletered.png" alt="Disband" width={12} height={12} />
                              Disband
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

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

        {showClanOverlay && (
          <ClanProfileOverlay
            onClose={() => setShowClanOverlay(null)}
            clanId={showClanOverlay}
            onApprove={handleApprove}
            onDisband={handleDisband}
            onResume={handleResume}
            onStatusUpdate={(newStatus) =>
              setClansData((prev) => ({
                ...prev,
                [activeTab]: prev[activeTab].map((clan) =>
                  clan.id === showClanOverlay ? { ...clan, status: newStatus } : clan
                ),
              }))
            }
          />
        )}
        {showApproveOverlay && selectedClanId && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/success.png" alt="Approve" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Successful</h2>
              <p className="text-xs mb-6">This clan is successfully approved</p>
              <button
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-green-600 mb-4"
                onClick={confirmApprove}
              >
                Proceed
              </button>
              <button
                className="text-white underline bg-transparent border-none cursor-pointer text-xs"
                onClick={() => setShowApproveOverlay(false)}
              >
                Back
              </button>
            </div>
          </div>
        )}
        {showDisbandOverlay && selectedClanId && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/disband2.png" alt="Disband" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Disband</h2>
              <p className="text-xs mb-6">Are you sure you want to disband this clan?</p>
              <button
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-red-600 mb-4"
                onClick={confirmDisband}
              >
                Disband
              </button>
              <button
                className="text-white underline bg-transparent border-none cursor-pointer text-xs"
                onClick={() => setShowDisbandOverlay(false)}
              >
                Back
              </button>
            </div>
          </div>
        )}
        {showResumeOverlay && selectedClanId && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/resume2.png" alt="Resume" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Resume</h2>
              <p className="text-xs mb-6">Are you sure you want to resume this clan?</p>
              <button
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-green-600 mb-4"
                onClick={confirmResume}
              >
                Resume
              </button>
              <button
                className="text-white underline bg-transparent border-none cursor-pointer text-xs"
                onClick={() => setShowResumeOverlay(false)}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clans;