// src/app/boosts/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import CreateBoosterOverlay from "@/components/CreateBoosterOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Boost {
  id: string;
  name: string;
  description: string;
  level: number | string;
  effect: string;
  upgrade_cost: string | number;
  condition: string;
}

interface BoostFormData {
  id?: string;
  name: string;
  description: string;
  level: string;
  upgradeCost: string;
  effect: string;
  condition: string;
  image: File | null;
}

const Boosts: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"Boost" | "Multiplier" | "Recharging Speed" | "Autobot Tapping">("Boost");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [boostsData, setBoostsData] = useState<{
    "Boost": Boost[];
    "Multiplier": Boost[];
    "Recharging Speed": Boost[];
    "Autobot Tapping": Boost[];
  }>({
    "Boost": [],
    "Multiplier": [],
    "Recharging Speed": [],
    "Autobot Tapping": [],
  });
  const [filters, setFilters] = useState<{
    level: { [key: string]: boolean };
  }>({
    level: {
      "1": false,
      "2": false,
      "3": false,
      "4": false,
      "5": false,
      "6": false,
      "7": false,
      "8": false,
      "9": false,
      "10": false,
    },
  });
  const [showCreateBoosterOverlay, setShowCreateBoosterOverlay] = useState(false);
  const [boostToEdit, setBoostToEdit] = useState<BoostFormData | null>(null);

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

  const fetchBoosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/boost/extra_boosters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch boosts");
      const data: Boost[] = await response.json();

      // Segment the boosts based on their names
      const segmentedBoosts = {
        "Boost": data.filter(boost => boost.name.toLowerCase() === "boost"),
        "Multiplier": data.filter(boost => boost.name.toLowerCase() === "multiplier"),
        "Recharging Speed": data.filter(boost => boost.name.toLowerCase() === "recharging speed"),
        "Autobot Tapping": data.filter(boost => boost.name.toLowerCase() === "auto-bot tapping")
      };
      
      setBoostsData(segmentedBoosts);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      console.error("Fetch boosts error:", errorMessage);
      router.push("/signin");
    } finally {
      setLoading(false);
    }
  }, [router, refreshToken]);

  useEffect(() => {
    fetchBoosts();
  }, [fetchBoosts]);

  // Rest of the functions remain largely the same, just updating type references
  const handleFilterChange = (category: "level", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: { ...prev[category], [value]: !prev[category][value] },
    }));
  };

  const handleRowClick = (boostId: string) => {
    setSelectedRows((prev) =>
      prev.includes(boostId) ? prev.filter((id) => id !== boostId) : [...prev, boostId]
    );
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleEditUpgradeCost = async (boost: Boost) => {
    setShowActionDropdown(null);
    const newCost = prompt("Enter new upgrade cost:", boost.upgrade_cost.toString());
    if (newCost) {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(
          `${API_BASE_URL}/admin/boost/edit_upgrade_cost?extra_boost_id=${boost.id}&upgrade_cost=${newCost}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Failed to update boost cost");
        await fetchBoosts();
      } catch (error) {
        console.error("Error updating boost cost:", error);
        setError("Failed to update boost upgrade cost");
      }
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await Promise.all(
        selectedRows.map((boostId) =>
          fetch(`${API_BASE_URL}/admin/boost/extra_booster?extra_boost_id=${boostId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      await fetchBoosts();
      setSelectedRows([]);
      setShowDeleteOverlay(false);
    } catch (error) {
      console.error("Error deleting boosts:", error);
      setError("Failed to delete selected boosts");
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((boost) => ({
      Name: boost.name,
      Description: boost.description,
      Level: boost.level,
      Effect: boost.effect,
      "Upgrade Cost": boost.upgrade_cost,
      Condition: boost.condition,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Boosts");
    XLSX.writeFile(workbook, "boosts.xlsx");
  };

  const filteredData = boostsData[activeTab].filter((boost) => {
    const levelMatch = Object.keys(filters.level).some(
      (level) => filters.level[level] && boost.level.toString() === level
    );
    const searchMatch =
      boost.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boost.effect.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boost.condition.toLowerCase().includes(searchTerm.toLowerCase());
    return (
      (!Object.values(filters.level).some((v) => v) || levelMatch) &&
      (searchTerm === "" || searchMatch)
    );
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Boosts" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {loading && (
              <div className="flex justify-center items-center h-full">
                <span className="text-[#f9b54c] text-xs">Fetching Boosts...</span>
              </div>
            )}
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            {!loading && !error && (
              <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
                {/* Tabs and Buttons */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4">
                    {["Boost", "Multiplier", "Recharging Speed", "Autobot Tapping"].map((tab) => (
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
                    <button
                      className="flex items-center gap-2 bg-white text-[#202022] text-xs px-3 py-2 rounded-lg"
                      onClick={() => setShowCreateBoosterOverlay(true)}
                    >
                      <Image src="/create.png" alt="Create" width={12} height={12} />
                      Create Booster
                    </button>
                  </div>
                </div>

                {/* Rest of the JSX remains the same */}
                <div className="border-t border-white/20 mb-4"></div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                    <Image src="/search.png" alt="Search" width={16} height={16} />
                    <input
                      type="text"
                      placeholder="Search by name, effect..."
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
                          <h4 className="text-xs font-bold mb-2">Boost Level</h4>
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
                      onClick={() => setShowDeleteOverlay(true)}
                    >
                      <Image src="/delete.png" alt="Delete" width={12} height={12} />
                      Delete
                    </button>
                  </div>
                </div>
                <div className="border-t border-white/20 mb-4"></div>
                <div className="grid grid-cols-[40px_2fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                  <div />
                  <div>Name</div>
                  <div>Description</div>
                  <div>Level</div>
                  <div>Effect</div>
                  <div>Upgrade Cost</div>
                  <div>Condition</div>
                  <div>Action</div>
                </div>
                <div className="border-t border-white/20 mb-4"></div>
                {filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((boost, index) => (
                  <div
                    key={boost.id}
                    className={`grid grid-cols-[40px_2fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                      selectedRows.includes(boost.id) ? "bg-white text-black rounded-lg" : "text-white"
                    }`}
                    onClick={() => handleRowClick(boost.id)}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-4 h-4 border-2 rounded-full cursor-pointer ${
                          selectedRows.includes(boost.id) ? "bg-black border-black" : "border-white"
                        }`}
                      />
                    </div>
                    <div className="truncate">{boost.name}</div>
                    <div className="truncate">{boost.description}</div>
                    <div>{boost.level}</div>
                    <div>{boost.effect}</div>
                    <div className="flex items-center gap-2">
                      <Image src="/logo.png" alt="Cost" width={16} height={16} />
                      {boost.upgrade_cost}
                    </div>
                    <div>{boost.condition}</div>
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
                            onClick={() => handleEditUpgradeCost(boost)}
                          >
                            <Image src="/edit.png" alt="Edit" width={12} height={12} />
                            Edit Cost
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
            )}
          </div>
        </div>

        {showCreateBoosterOverlay && (
          <CreateBoosterOverlay
            onClose={() => {
              setShowCreateBoosterOverlay(false);
              setBoostToEdit(null);
            }}
            boostToEdit={boostToEdit}
            onSubmit={async (boostData) => {
              const token = localStorage.getItem("access_token");
              const formData = new FormData();
              Object.entries(boostData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  formData.append(
                    key === "upgradeCost" ? "upgrade_cost" : key,
                    value.toString()
                  );
                }
              });
              await fetch(`${API_BASE_URL}/admin/boost/${boostData.id ? "update_boost" : "create_boost"}`, {
                method: boostData.id ? "PUT" : "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              });
              await fetchBoosts();
              setShowCreateBoosterOverlay(false);
              setBoostToEdit(null);
            }}
          />
        )}
        {showDeleteOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/Red Delete.png" alt="Delete" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Delete?</h2>
              <p className="text-xs mb-6">Are you sure to delete this boost?</p>
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

export default Boosts;