"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import CreateNewReward from "@/components/CreateNewReward";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Reward {
  id: string;
  title: string;
  reward: string;
  beneficiary: string;
  beneficiaryList: string[];
  expiryDate: string;
  status: string;
  claimRate: string;
}

interface RewardFormData {
  id?: string;
  rewardTitle: string;
  rewardAmount: string;
  expiryDate: Date | null;
  beneficiaryType: string;
  selectedClans: string[];
  selectedLevels: string[];
  specificUsers: string;
  telegramUserId?: string;
  image: File | null;
}

const Rewards: React.FC = () => {
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"All Rewards" | "On-going Rewards" | "Claimed Rewards">("All Rewards");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [rewardsData, setRewardsData] = useState<{
    "All Rewards": Reward[];
    "On-going Rewards": Reward[];
    "Claimed Rewards": Reward[];
  }>({
    "All Rewards": [],
    "On-going Rewards": [],
    "Claimed Rewards": [],
  });
  const [filters, setFilters] = useState<{
    status: { [key: string]: boolean };
    beneficiary: { [key: string]: boolean };
  }>({
    status: { "On-going": false, Claimed: false },
    beneficiary: { "All users": false, Clans: false, Levels: false, "Specific User(s)": false },
  });
  const [showCreateNewReward, setShowCreateNewReward] = useState(false);
  const [rewardToEdit, setRewardToEdit] = useState<RewardFormData | null>(null);
  const [clans, setClans] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);

  const router = useRouter();

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

  interface RawReward {
    id: string;
    reward_title: string;
    reward: string;
    beneficiary: string[];
    expiry_date: string;
    status: string;
    claim_rate: string;
  }

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/reward/get_rewards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch rewards");
      const data: RawReward[] = await response.json();
      const mappedData = data.map((reward) => {
        let displayBeneficiary: string;
        if (reward.beneficiary.length > 1) {
          const isClan = reward.beneficiary.some((b) =>
            clans.some((clan) => clan.toLowerCase() === b.toLowerCase())
          );
          const isLevel = reward.beneficiary.some((b) =>
            levels.some((level) => level.toLowerCase() === b.toLowerCase())
          );
          displayBeneficiary = isClan ? "Clans" : isLevel ? "Levels" : reward.beneficiary[0];
        } else {
          displayBeneficiary = reward.beneficiary[0] || "all_users";
        }

        return {
          id: reward.id,
          title: reward.reward_title,
          reward: reward.reward.toString(),
          beneficiary: displayBeneficiary,
          beneficiaryList: reward.beneficiary,
          expiryDate: reward.expiry_date,
          status: reward.status,
          claimRate: reward.claim_rate.toString(),
        };
      });

      const sortedData = mappedData.sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());

      setRewardsData({
        "All Rewards": sortedData,
        "On-going Rewards": sortedData.filter((r) => r.status === "on_going"),
        "Claimed Rewards": sortedData.filter((r) => r.status === "claimed"),
      });
    } catch (err) {
      setError((err as Error).message);
      console.error("Fetch rewards error:", err);
      router.push("/signin");
    } finally {
      setLoading(false);
    }
  }, [router, refreshToken, clans, levels]);

  useEffect(() => {
    const fetchClansAndLevels = async () => {
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
    };

    fetchClansAndLevels();
  }, []);

  useEffect(() => {
    if (clans.length > 0 && levels.length > 0) fetchRewards();
  }, [fetchRewards, clans, levels]);

  const handleFilterChange = (category: "status" | "beneficiary", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: { ...prev[category], [value]: !prev[category][value] },
    }));
  };

  const handleRowClick = (rewardId: string) => {
    setSelectedRow(rewardId === selectedRow ? null : rewardId);
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleEditReward = (reward: Reward) => {
    setRewardToEdit({
      id: reward.id,
      rewardTitle: reward.title,
      rewardAmount: reward.reward,
      expiryDate: reward.expiryDate ? new Date(reward.expiryDate) : null,
      beneficiaryType:
        reward.beneficiary === "Clans"
          ? "Clan(s)"
          : reward.beneficiary === "Levels"
          ? "Level(s)"
          : reward.beneficiary === "all_users"
          ? "All Users"
          : "Specific User(s)",
      selectedClans: reward.beneficiary === "Clans" ? reward.beneficiaryList : [],
      selectedLevels: reward.beneficiary === "Levels" ? reward.beneficiaryList : [],
      specificUsers: reward.beneficiary === "specific_users" ? reward.beneficiaryList[0] : "",
      telegramUserId: reward.beneficiary === "specific_users" ? reward.beneficiaryList[0] : "",
      image: null,
    });
    setShowCreateNewReward(true);
    setShowActionDropdown(null); // Close dropdown after edit
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_BASE_URL}/admin/reward/delete_reward?reward_id=${selectedRow}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchRewards();
      setSelectedRow(null);
      setShowDeleteOverlay(false);
      setShowActionDropdown(null); // Close dropdown after delete
    } catch (error) {
      console.error("Error deleting reward:", error);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((reward) => ({
      "Reward Title": reward.title,
      Reward: reward.reward,
      Beneficiary: reward.beneficiary,
      "Expiry Date": reward.expiryDate,
      Status: reward.status,
      "Claim Rate": `${reward.claimRate}%`,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rewards");
    XLSX.writeFile(workbook, "rewards.xlsx");
  };

  const filteredData = rewardsData[activeTab].filter((reward) => {
    const statusFiltersActive = Object.values(filters.status).some((v) => v);
    const statusMatch = statusFiltersActive
      ? (filters.status["On-going"] && reward.status === "on_going") ||
        (filters.status["Claimed"] && reward.status === "claimed")
      : true;

    const beneficiaryFiltersActive = Object.values(filters.beneficiary).some((v) => v);
    const beneficiaryMatch = beneficiaryFiltersActive
      ? (filters.beneficiary["All users"] && reward.beneficiary === "all_users") ||
        (filters.beneficiary["Clans"] && reward.beneficiary === "Clans") ||
        (filters.beneficiary["Levels"] && reward.beneficiary === "Levels") ||
        (filters.beneficiary["Specific User(s)"] && reward.beneficiaryList[0]?.includes("specific_users"))
      : true;

    const searchMatch =
      searchTerm === "" ||
      reward.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.beneficiary.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && beneficiaryMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Rewards" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {loading && (
              <div className="flex justify-center items-center h-full">
                <span className="text-orange-500 text-xs">Fetching Rewards...</span>
              </div>
            )}
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            {!loading && !error && (
              <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4">
                    {["All Rewards", "On-going Rewards", "Claimed Rewards"].map((tab) => (
                      <span
                        key={tab}
                        className={`text-xs cursor-pointer pb-1 ${
                          activeTab === tab ? "text-white font-bold border-b-2 border-orange-500" : "text-gray-500"
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
                    <button
                      className="flex items-center gap-2 bg-white text-[#202022] text-xs px-3 py-2 rounded-lg"
                      onClick={() => setShowCreateNewReward(true)}
                    >
                      <Image src="/create.png" alt="Create" width={12} height={12} />
                      New Reward
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 mb-4" />

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                    <Image src="/search.png" alt="Search" width={16} height={16} />
                    <input
                      type="text"
                      placeholder="Search by status, beneficiary..."
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
                        <div>
                          <h4 className="text-xs font-bold mb-2">Beneficiary</h4>
                          {Object.keys(filters.beneficiary).map((beneficiary) => (
                            <label key={beneficiary} className="flex items-center gap-2 text-xs mb-2">
                              <input
                                type="checkbox"
                                checked={filters.beneficiary[beneficiary]}
                                onChange={() => handleFilterChange("beneficiary", beneficiary)}
                              />
                              {beneficiary}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 bg-[#19191A] text-white text-xs px-3 py-2 rounded-lg cursor-pointer">
                      <Image src="/Date.png" alt="Date" width={12} height={12} />
                      <span>DD-MM-YYYY</span>
                    </button>
                    <button
                      className="flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                      onClick={() => selectedRow && setShowDeleteOverlay(true)}
                      disabled={!selectedRow}
                    >
                      <Image src="/delete.png" alt="Delete" width={12} height={12} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 mb-4" />

                <div className="grid grid-cols-[40px_2fr_1fr_1.5fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                  <div />
                  <div>Reward Title</div>
                  <div>Reward</div>
                  <div>Beneficiary</div>
                  <div>Expiry Date</div>
                  <div>Status</div>
                  <div>Claim Rate</div>
                  <div>Action</div>
                </div>

                <div className="border-t border-white/20 mb-4" />

                {filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((reward, index) => (
                  <div
                    key={reward.id}
                    className={`!grid grid-cols-[40px_2fr_1fr_1.5fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                      selectedRow === reward.id ? "bg-white text-black rounded-lg" : "text-white"
                    }`}
                    onClick={() => handleRowClick(reward.id)}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-4 h-4 border-2 rounded-full cursor-pointer flex items-center justify-center ${
                          selectedRow === reward.id ? "border-black bg-black" : "border-white"
                        }`}
                      >
                        {selectedRow === reward.id && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                    <div className="truncate">{reward.title}</div>
                    <div className="flex items-center gap-2">
                      <Image src="/logo.png" alt="Reward" width={16} height={16} />
                      {reward.reward}
                    </div>
                    <div>{reward.beneficiary}</div>
                    <div>{new Date(reward.expiryDate).toLocaleDateString("en-GB")}</div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          reward.status === "on_going"
                            ? "bg-[#E7F7EF] text-[#0CAF60]"
                            : reward.status === "claimed"
                            ? "bg-[#D8CBFD] text-[#551DEC]"
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {reward.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {reward.claimRate}%
                      <Image src="/ArrowRise.png" alt="Increment" width={16} height={16} />
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
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg z-10 text-black p-2">
                          <div
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                            onClick={() => handleEditReward(reward)}
                          >
                            <Image src="/edit.png" alt="Edit" width={12} height={12} />
                            Edit
                          </div>
                          <div
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                            onClick={() => handleDelete()}
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
        </div>

        {showCreateNewReward && (
          <CreateNewReward
            onClose={() => {
              setShowCreateNewReward(false);
              setRewardToEdit(null);
            }}
            rewardToEdit={rewardToEdit}
            onSubmit={async () => {
              await fetchRewards();
            }}
          />
        )}

        {showDeleteOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/Red Delete.png" alt="Delete" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Delete?</h2>
              <p className="text-xs mb-6">Are you sure to delete this reward?</p>
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
  );
};

export default Rewards;