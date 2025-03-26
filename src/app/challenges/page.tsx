// src/app/challenges/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import CreateChallengeOverlay from "@/components/CreateChallengeOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Challenge {
  id: string;
  name: string;
  description: string;
  launch_date: string;
  reward: number;
  remaining_time: string;
  participants: string[];
  status: string;
}

interface ChallengeFormData {
  id?: string;
  challengeName: string;
  challengeReward: string;
  challengeDescription: string;
  launchDate: Date | null;
  challengeDuration: { days: number; hours: number; minutes: number; seconds: number };
  participantType: string;
  selectedClans: string[];
  selectedLevels: string[];
  specificUsers: string;
  image: File | null;
  imagePreview: string;
}

interface Filters {
  participants: { [key: string]: boolean };
  reward: { [key: string]: boolean };
}

const Challenges = () => {
  const router = useRouter();
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false); // Add this state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Opened Challenges" | "Completed Challenges">("Opened Challenges");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreateChallengeOverlay, setShowCreateChallengeOverlay] = useState(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [filters, setFilters] = useState<Filters>({
    participants: { "All Users": false, "Selected Users": false, "VIP Users": false },
    reward: { "1000-5000": false, "5001-10000": false, "10001+": false },
  });

  const [challengesData, setChallengesData] = useState<{
    "Opened Challenges": Challenge[];
    "Completed Challenges": Challenge[];
  }>({
    "Opened Challenges": [],
    "Completed Challenges": [],
  });

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found");

      const [ongoingResponse, completedResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/challenge/get_challenges?status=ongoing`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
        fetch(`${API_BASE_URL}/admin/challenge/get_challenges?status=completed`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
      ]);

      if (!ongoingResponse.ok || !completedResponse.ok) throw new Error("Failed to fetch challenges");

      const ongoingData: Challenge[] = await ongoingResponse.json();
      const completedData: Challenge[] = await completedResponse.json();

      setChallengesData({
        "Opened Challenges": ongoingData.map((challenge) => ({ ...challenge, status: "ongoing" })),
        "Completed Challenges": completedData.map((challenge) => ({ ...challenge, status: "completed" })),
      });
    } catch (err) {
      setError((err as Error).message);
      console.error("Fetch challenges error:", err);
      router.push("/signin");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const fetchChallengeById = async (challengeId: string): Promise<Challenge | null> => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/admin/challenge/get_challenge_by_id/${challengeId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch challenge details");

      return await response.json();
    } catch (error) {
      console.error("Error fetching challenge by ID:", error);
      return null;
    }
  };

  const handleEditChallenge = async (challenge: Challenge) => {
    const fullChallenge = await fetchChallengeById(challenge.id);
    if (fullChallenge) {
      setSelectedChallenge({
        id: fullChallenge.id,
        challengeName: fullChallenge.name,
        challengeReward: fullChallenge.reward.toString(),
        challengeDescription: fullChallenge.description,
        launchDate: new Date(fullChallenge.launch_date),
        challengeDuration: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        participantType: fullChallenge.participants[0] || "all_users",
        selectedClans: [],
        selectedLevels: [],
        specificUsers: "",
        image: null,
        imagePreview: "",
      });
      setShowCreateChallengeOverlay(true);
    }
    setShowActionDropdown(null);
  };

  const handleCreateChallengeSubmit = async (newChallenge: ChallengeFormData) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found");

      const queryParams = new URLSearchParams({
        name: newChallenge.challengeName,
        description: newChallenge.challengeDescription,
        launch_date: newChallenge.launchDate ? newChallenge.launchDate.toISOString().split("T")[0] : "",
        reward: newChallenge.challengeReward,
        duration: `${newChallenge.challengeDuration.days.toString().padStart(2, "0")}:${newChallenge.challengeDuration.hours
          .toString()
          .padStart(2, "0")}:${newChallenge.challengeDuration.minutes.toString().padStart(2, "0")}:${newChallenge.challengeDuration.seconds
          .toString()
          .padStart(2, "0")}`,
        participants: newChallenge.participantType,
      }).toString();

      const formData = new FormData();
      if (newChallenge.selectedClans.length > 0) {
        newChallenge.selectedClans.forEach((clan) => formData.append("clan", clan));
      }
      if (newChallenge.selectedLevels.length > 0) {
        newChallenge.selectedLevels.forEach((level) => formData.append("level", level));
      }
      if (newChallenge.specificUsers) {
        newChallenge.specificUsers.split(",").forEach((user) => formData.append("specific_users", user.trim()));
      }
      if (newChallenge.image) {
        formData.append("image", newChallenge.image);
      }

      const url = `${API_BASE_URL}/admin/challenge/${newChallenge.id ? "update_challenge" : "create_challenge"}?${queryParams}`;
      const response = await fetch(url, {
        method: newChallenge.id ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit challenge (Status: ${response.status}, Message: ${JSON.stringify(errorData)})`);
      }

      await fetchChallenges();
      setShowSuccessOverlay(true); // Show success overlay
      // Do NOT close the overlay here; let the user close it manually
    } catch (error) {
      console.error("Challenge submission error:", error);
      setError((error as Error).message);
    }
  };

  const handleRowClick = (challengeId: string) => {
    setSelectedRows((prev) =>
      prev.includes(challengeId) ? prev.filter((id) => id !== challengeId) : [...prev, challengeId]
    );
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleTabChange = (tab: "Opened Challenges" | "Completed Challenges") => {
    setActiveTab(tab);
    setSelectedRows([]);
    setShowActionDropdown(null);
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await Promise.all(
        selectedRows.map((challengeId) =>
          fetch(`${API_BASE_URL}/admin/challenge/delete_challenge/${challengeId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      await fetchChallenges();
      setSelectedRows([]);
      setShowDeleteOverlay(false);
    } catch (error) {
      console.error("Error deleting challenges:", error);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((challenge) => ({
      "Challenge Name": challenge.name,
      Description: challenge.description,
      "Start Date": formatDate(new Date(challenge.launch_date)),
      Reward: challenge.reward,
      "Remaining Time": challenge.remaining_time,
      Participants: challenge.participants.join(", "),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Challenges");
    XLSX.writeFile(workbook, "challenges.xlsx");
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getDaysInMonth = (date: Date) => {
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
      <div className="w-64 bg-white rounded-lg p-3 shadow-lg z-10 text-black">
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => changeMonth(-1)} className="text-sm">
            {"<"}
          </button>
          <span className="text-xs">{`${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}</span>
          <button onClick={() => changeMonth(1)} className="text-sm">
            {">"}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-600">
          {weekDays.map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 mt-2">
          {days.map((date, index) => (
            <div
              key={index}
              className={`text-center py-1 rounded cursor-pointer text-xs ${
                date
                  ? selectedDate && date.toDateString() === selectedDate.toDateString()
                    ? "bg-orange-500 text-white"
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

  const filteredData = challengesData[activeTab].filter((challenge) => {
    const participantsMatch = Object.keys(filters.participants).some(
      (p) => filters.participants[p] && challenge.participants.includes(p)
    );
    const rewardMatch = Object.keys(filters.reward).some((range) => {
      if (!filters.reward[range]) return false;
      const [min, max] = range.split("-").map((v) => (v === "10001+" ? Infinity : parseInt(v)));
      return challenge.reward >= min && (max === Infinity || challenge.reward <= max);
    });
    const searchMatch =
      challenge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challenge.participants.join(", ").toLowerCase().includes(searchTerm.toLowerCase());
    return (
      (!Object.values(filters.participants).includes(true) || participantsMatch) &&
      (!Object.values(filters.reward).includes(true) || rewardMatch) &&
      (searchTerm === "" || searchMatch)
    );
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Challenges" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {loading && (
              <div className="flex justify-center items-center h-full">
                <span className="text-orange-500 text-xs">Fetching Challenges...</span>
              </div>
            )}
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            {!loading && !error && (
              <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
                {/* Tabs and Buttons */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4">
                    {["Opened Challenges", "Completed Challenges"].map((tab) => (
                      <span
                        key={tab}
                        className={`text-xs cursor-pointer pb-1 ${
                          activeTab === tab ? "text-white font-bold border-b-2 border-orange-500" : "text-gray-500"
                        }`}
                        onClick={() => handleTabChange(tab as "Opened Challenges" | "Completed Challenges")}
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
                      onClick={() => {
                        setSelectedChallenge(null);
                        setShowCreateChallengeOverlay(true);
                      }}
                    >
                      <Image src="/create.png" alt="Create" width={12} height={12} />
                      New Challenge
                    </button>
                  </div>
                </div>

                {/* Divider Under Tabs */}
                <div className="border-t border-white/20 mb-4"></div>

                {/* Search, Date, Delete */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                    <Image src="/search.png" alt="Search" width={16} height={16} />
                    <input
                      type="text"
                      placeholder="Search by name, status, participants..."
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
                      <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-lg p-4 shadow-lg z-10 text-black">
                        <div className="mb-4">
                          <h4 className="text-xs font-bold mb-2">Participants</h4>
                          {Object.keys(filters.participants).map((participant) => (
                            <label key={participant} className="flex items-center gap-2 text-xs mb-2">
                              <input
                                type="checkbox"
                                checked={filters.participants[participant]}
                                onChange={() =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    participants: { ...prev.participants, [participant]: !prev.participants[participant] },
                                  }))
                                }
                              />
                              {participant}
                            </label>
                          ))}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold mb-2">Reward Range</h4>
                          {Object.keys(filters.reward).map((range) => (
                            <label key={range} className="flex items-center gap-2 text-xs mb-2">
                              <input
                                type="checkbox"
                                checked={filters.reward[range]}
                                onChange={() =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    reward: { ...prev.reward, [range]: !prev.reward[range] },
                                  }))
                                }
                              />
                              {range}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex items-center gap-2 bg-[#19191A] text-white text-xs px-3 py-2 rounded-lg cursor-pointer"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Image src="/Date.png" alt="Date" width={12} height={12} />
                      <span>{selectedDate ? formatDate(selectedDate) : "DD-MM-YYYY"}</span>
                    </button>
                    {showDatePicker && (
                      <div className="absolute right-0 mt-40 z-10">
                        <CustomDatePicker />
                      </div>
                    )}
                    <button
                      className="flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                      onClick={() => selectedRows.length > 0 && setShowDeleteOverlay(true)}
                    >
                      <Image src="/delete.png" alt="Delete" width={12} height={12} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/20 mb-4"></div>

                {/* Table Headers */}
                <div className="grid grid-cols-[40px_2fr_1fr_1.5fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                  <div />
                  <div>Challenge Name</div>
                  <div>Reward</div>
                  <div>Participants</div>
                  <div>Start Date</div>
                  <div>Status</div>
                  <div>Remaining Time</div>
                  <div>Action</div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/20 mb-4"></div>

                {/* Table Content */}
                {filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((challenge, index) => (
                  <div
                    key={challenge.id}
                    className={`grid grid-cols-[40px_2fr_1fr_1.5fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                      selectedRows.includes(challenge.id) ? "bg-white text-black rounded-lg" : "text-white"
                    }`}
                    onClick={() => handleRowClick(challenge.id)}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-4 h-4 border-2 rounded-full cursor-pointer ${
                          selectedRows.includes(challenge.id) ? "bg-black border-black" : "border-white"
                        }`}
                      />
                    </div>
                    <div className="truncate">{challenge.name}</div>
                    <div className="flex items-center gap-2">
                      <Image src="/logo.png" alt="Reward" width={16} height={16} />
                      {challenge.reward}
                    </div>
                    <div className="truncate">{challenge.participants.join(", ")}</div>
                    <div>{formatDate(new Date(challenge.launch_date))}</div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          challenge.status === "ongoing"
                            ? "bg-[#E7F7EF] text-[#0CAF60]"
                            : challenge.status === "completed"
                            ? "bg-[#D8CBFD] text-[#551DEC]"
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {challenge.status}
                      </span>
                    </div>
                    <div>{challenge.remaining_time}</div>
                    <div className="relative">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => handleActionClick(index)}
                      >
                        <span className="text-xs">Action</span>
                        <Image src="/dropdown.png" alt="Dropdown" width={16} height={16} />
                      </div>
                      {showActionDropdown === index && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 text-black p-2">
                          <div
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                            onClick={() => handleEditChallenge(challenge)}
                          >
                            <Image src="/edit.png" alt="Edit" width={12} height={12} />
                            Edit
                          </div>
                          <div
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                            onClick={() => setShowDeleteOverlay(true)}
                          >
                            <Image src="/deletered.png" alt="Delete" width={12} height={12} />
                            Delete
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Divider with Pagination */}
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
                              currentPage === num ? "bg-orange-500 text-black" : ""
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
            )}
          </div>

          {/* Overlays */}
          {showCreateChallengeOverlay && (
        <CreateChallengeOverlay
          onClose={() => {
            setShowCreateChallengeOverlay(false);
            setSelectedChallenge(null);
            setShowSuccessOverlay(false); // Reset success state when closing
          }}
          onSubmit={async (data) => {
            await handleCreateChallengeSubmit(data);
            // Keep the overlay open to show success
          }}
          isEditing={!!selectedChallenge}
          challengeToEdit={selectedChallenge}
        />
      )}
        {showSuccessOverlay && (
            <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
                <Image src="/success.png" alt="Success" width={100} height={100} className="mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-4">Success!</h2>
                <p className="text-xs mb-6">
                Challenge {selectedChallenge ? "updated" : "created"} successfully.
                </p>
                <button
                className="w-full h-12 bg-black text-white rounded-md hover:bg-green-600"
                onClick={() => {
                    setShowSuccessOverlay(false);
                    setShowCreateChallengeOverlay(false);
                    setSelectedChallenge(null);
                }}
                >
                Proceed
                </button>
            </div>
            </div>
        )}
          {showDeleteOverlay && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
              <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
                <Image src="/Red Delete.png" alt="Delete" width={100} height={100} className="mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-4">Delete?</h2>
                <p className="text-xs mb-6">Are you sure to delete this challenge?</p>
                <button
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-red-600 mb-4"
                  onClick={handleDelete}
                >
                  Delete
                </button>
                <button
                  className="text-white underline bg-transparent border-none cursor-pointer text-xs"
                  onClick={() => setShowDeleteOverlay(false)}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Challenges;