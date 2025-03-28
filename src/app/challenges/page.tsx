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

const Challenges: React.FC = () => {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Opened Challenges" | "Completed Challenges">("Opened Challenges");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [showCreateChallengeOverlay, setShowCreateChallengeOverlay] = useState(false);
  const [challengeToEdit, setChallengeToEdit] = useState<ChallengeFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [clans, setClans] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
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

  const isTokenExpired = (token: string): boolean => {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  };

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refresh || "",
          client_id: "string",
          client_secret: "string",
        }),
      });
      if (!response.ok) throw new Error("Failed to refresh token");
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      return data.access_token;
    } catch {
      router.push("/signin");
      return null;
    }
  }, [router]);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }

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
  }, [router, refreshToken]);

  const fetchClansAndLevels = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const [clanResponse, levelResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/clan/get_clans?category=all_clans&page=1&page_size=20`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }),
        fetch(`${API_BASE_URL}/admin/levels/get_levels`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }),
      ]);

      if (clanResponse.ok) {
        const clanData = await clanResponse.json();
        setClans(clanData.map((clan: { name: string }) => clan.name));
      }

      if (levelResponse.ok) {
        const levelData = await levelResponse.json();
        setLevels(levelData.map((level: { name: string }) => level.name.toLowerCase()));
      }
    } catch (err) {
      console.error("Error fetching clans or levels:", err);
    }
  }, []);

  useEffect(() => {
    fetchClansAndLevels();
    fetchChallenges();
  }, [fetchChallenges, fetchClansAndLevels]);

  const handleEditChallenge = (challenge: Challenge) => {
    setChallengeToEdit({
      id: challenge.id,
      challengeName: challenge.name,
      challengeReward: challenge.reward.toString(),
      challengeDescription: challenge.description,
      launchDate: new Date(challenge.launch_date),
      challengeDuration: parseDuration(challenge.remaining_time),
      participantType: challenge.participants.length > 0 ? getParticipantTypeDisplay(challenge.participants[0]) : "All Users",
      selectedClans: challenge.participants[0] === "clan" ? challenge.participants : [],
      selectedLevels: challenge.participants[0] === "level" ? challenge.participants : [],
      specificUsers: challenge.participants[0] === "specific_users" ? challenge.participants.join(", ") : "",
      image: null,
      imagePreview: "",
    });
    setShowCreateChallengeOverlay(true);
    setShowActionDropdown(null);
  };

  const parseDuration = (duration: string) => {
    const [days, hours, minutes, seconds] = duration.split(":").map(Number);
    return { days: days || 0, hours: hours || 0, minutes: minutes || 0, seconds: seconds || 0 };
  };

  const getParticipantTypeDisplay = (type: string) => {
    switch (type) {
      case "all_users": return "All Users";
      case "clan": return "Clan(s)";
      case "level": return "Level(s)";
      case "specific_users": return "Specific User(s)";
      default: return "All Users";
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
      setShowActionDropdown(null);
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
                        setChallengeToEdit(null);
                        setShowCreateChallengeOverlay(true);
                      }}
                    >
                      <Image src="/create.png" alt="Create" width={12} height={12} />
                      New Challenge
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 mb-4" />

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
                      className="flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                      onClick={() => selectedRows.length > 0 && setShowDeleteOverlay(true)}
                      disabled={selectedRows.length === 0}
                    >
                      <Image src="/delete.png" alt="Delete" width={12} height={12} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 mb-4" />

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

                <div className="border-t border-white/20 mb-4" />

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
                        className={`w-4 h-4 border-2 rounded-full cursor-pointer flex items-center justify-center ${
                          selectedRows.includes(challenge.id) ? "border-black bg-black" : "border-white"
                        }`}
                      >
                        {selectedRows.includes(challenge.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
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
                            : "bg-[#D8CBFD] text-[#551DEC]"
                        }`}
                      >
                        {challenge.status}
                      </span>
                    </div>
                    <div>{challenge.remaining_time}</div>
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
                            onClick={() => {
                              setSelectedRows([challenge.id]);
                              setShowDeleteOverlay(true);
                              setShowActionDropdown(null);
                            }}
                          >
                            <Image src="/deletered.png" alt="Delete" width={12} height={12} />
                            Delete
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="relative mt-6">
                  <div className="border-t border-white/20" />
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

          {showCreateChallengeOverlay && (
            <CreateChallengeOverlay
              onClose={() => {
                setShowCreateChallengeOverlay(false);
                setChallengeToEdit(null);
              }}
              challengeToEdit={challengeToEdit}
              onSubmit={async (data) => {
                await handleCreateChallengeSubmit(data);
              }}
              clans={clans} // Pass clans as prop
              levels={levels} // Pass levels as prop
            />
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

  async function handleCreateChallengeSubmit(newChallenge: ChallengeFormData) {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No access token found");

      const queryParams = new URLSearchParams({
        challenge_id: newChallenge.id || "",
        name: newChallenge.challengeName,
        description: newChallenge.challengeDescription,
        launch_date: newChallenge.launchDate ? newChallenge.launchDate.toISOString().split("T")[0] : "",
        reward: newChallenge.challengeReward,
        duration: `${newChallenge.challengeDuration.days.toString().padStart(2, "0")}:${newChallenge.challengeDuration.hours
          .toString()
          .padStart(2, "0")}:${newChallenge.challengeDuration.minutes.toString().padStart(2, "0")}:${newChallenge.challengeDuration.seconds
          .toString()
          .padStart(2, "0")}`,
        participants: getParticipantType(newChallenge.participantType),
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

      const url = newChallenge.id
        ? `${API_BASE_URL}/admin/challenge/update_challenge?${queryParams}`
        : `${API_BASE_URL}/admin/challenge/create_challenge?${queryParams}`;
      const response = await fetch(url, {
        method: newChallenge.id ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to submit challenge: ${JSON.stringify(errorData)}`);
      }

      await fetchChallenges();
      setShowCreateChallengeOverlay(false);
      setChallengeToEdit(null);
    } catch (error) {
      console.error("Challenge submission error:", error);
      setError((error as Error).message);
    }
  }

  function getParticipantType(type: string): string {
    switch (type) {
      case "All Users": return "all_users";
      case "Clan(s)": return "clan";
      case "Level(s)": return "level";
      case "Specific User(s)": return "specific_users";
      default: return "all_users";
    }
  }
};

export default Challenges;