"use client";

import React, { useState, useEffect, useCallback, useRef} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import CreateLevelOverlay from "@/components/CreateLevelOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Level {
  id: string;
  name: string;
  badge: string; // This will store the image URL or blob URL after fetching
  level: number;
  requirement: string;
}

interface LevelFormData {
  id?: string;
  name: string;
  requirement: string;
  level: string;
  badgeImage: File | null;
}

type LevelFilterKey =
  | "Novice"
  | "Explorer"
  | "Apprentice"
  | "Warrior"
  | "Master"
  | "Champion"
  | "Tactician"
  | "Specialist"
  | "Conqueror"
  | "Legend";

  const Levels: React.FC = () => {
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"Levels">("Levels");
    const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(8); // Changed from 5 to 8
    const [currentPage, setCurrentPage] = useState(1);
    // const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
    // const [levelToDelete, setLevelToDelete] = useState<string | null>(null);
    const [showCreateOverlay, setShowCreateOverlay] = useState(false);
    const [levelToEdit, setLevelToEdit] = useState<LevelFormData | null>(null);
    const [levelsData, setLevelsData] = useState<{ Levels: Level[] }>({ Levels: [] });
    const [filters, setFilters] = useState<{ level: Record<LevelFilterKey, boolean> }>({
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
  
    const router = useRouter();
    const actionDropdownRef = useRef<HTMLDivElement>(null); // Ref for action dropdown
    const filterDropdownRef = useRef<HTMLDivElement>(null); // Ref for filter dropdown
    
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

  const fetchLevels = useCallback(async () => {
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }
      console.log("Token used for fetch:", token);
  
      // Fetch level data
      const response = await fetch(`${API_BASE_URL}/admin/levels/get_levels`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch levels: ${response.status} - ${errorText}`);
      }
  
      const data: Level[] = await response.json();
      console.log("Fetched levels data:", data);
  
      // Fetch badge images for each level
      const levelsWithImages = await Promise.all(
        data.map(async (level) => {
          try {
            const url = `/api/admin/dashboard/images/image?image_id=${level.id}`;
            console.log("Fetching image from:", url);
            const imageResponse = await fetch(url, {
              headers: {
                Authorization: `Bearer ${token}`,
                // Remove Accept header to allow any content type (e.g., image/png)
              },
            });
  
            if (!imageResponse.ok) {
              const errorText = await imageResponse.text();
              throw new Error(
                `Failed to fetch badge for level ${level.id}: ${imageResponse.status} - ${errorText}`
              );
            }
  
            const contentType = imageResponse.headers.get("Content-Type");
            console.log(`Badge image Content-Type for level ${level.id}:`, contentType);
  
            const imageBlob = await imageResponse.blob();
            return { ...level, badge: URL.createObjectURL(imageBlob) };
          } catch (err) {
            console.error(`Error fetching badge for level ${level.id}:`, err);
            return { ...level, badge: "/logo.png" };
          }
        })
      );
  
      setLevelsData({ Levels: levelsWithImages });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      console.error("Fetch levels error:", err);
      router.push("/signin");
    }
  }, [router, refreshToken]);


  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

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

  const decodeLevelName = (encodedName: string): string => {
    try {
      return decodeURIComponent(encodedName);
    } catch (e) {
      console.warn("Failed to decode level name:", encodedName, e);
      return encodedName;
    }
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

  const handleFilterChange = (category: "level", value: LevelFilterKey) => {
    setFilters((prev) => ({
      ...prev,
      [category]: { ...prev[category], [value]: !prev[category][value] },
    }));
  };

  const handleRowClick = (levelId: string) => {
    setSelectedRows((prev) =>
      prev.includes(levelId) ? prev.filter((id) => id !== levelId) : [...prev, levelId]
    );
  };

  const handleActionClick = (index: number) => {
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  // const handleDelete = (levelId: string) => {
  //   setLevelToDelete(levelId);
  //   setShowDeleteOverlay(true);
  //   setShowActionDropdown(null); // Close dropdown when delete is clicked
  // };

  // const handleDeleteConfirmed = async () => {
  //   if (!levelToDelete) return;

  //   try {
  //     const token = localStorage.getItem("access_token");
  //     if (!token) throw new Error("No access token found");

  //     const response = await fetch(`${API_BASE_URL}/admin/levels/delete_level/${levelToDelete}`, {
  //       method: "DELETE",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         Accept: "application/json",
  //       },
  //     });

  //     if (!response.ok) throw new Error("Failed to delete level");

  //     setLevelsData((prev) => ({
  //       ...prev,
  //       Levels: prev.Levels.filter((level) => level.id !== levelToDelete),
  //     }));
  //     setSelectedRows([]);
  //     // setShowDeleteOverlay(false);
  //     // setLevelToDelete(null);
  //     setError(null);
  //   } catch (err) {
  //     setError((err as Error).message);
  //     console.error("Delete level error:", err);
  //   }
  // };

  const handleExport = () => {
    const dataToExport = filteredData.map((level) => ({
      Name: decodeLevelName(level.name) || "N/A",
      Badge: level.badge || "N/A",
      Level: level.level || "N/A",
      Requirement: level.requirement || "N/A",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Levels");
    XLSX.writeFile(workbook, "levels.xlsx");
  };

  const filteredData = levelsData[activeTab].filter((level) => {
    const levelMatch = Object.keys(filters.level).some(
      (lvl) => filters.level[lvl as LevelFilterKey] && level.name?.toLowerCase().includes(lvl.toLowerCase())
    );
    return !Object.values(filters.level).some((v) => v) || levelMatch;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Levels" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
              {/* Tabs and Buttons */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                  <span
                    className={`text-xs cursor-pointer pb-1 ${
                      activeTab === "Levels"
                        ? "text-white font-bold border-b-2 border-[#f9b54c]"
                        : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("Levels")}
                  >
                    Levels
                  </span>
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
                    onClick={() => setShowCreateOverlay(true)}
                  >
                    <Image src="/add.png" alt="Create" width={12} height={12} />
                    Create Level
                  </button>
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                  <Image src="/search.png" alt="Search" width={16} height={16} />
                  <input
                    type="text"
                    placeholder="Search levels..."
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
                        <h4 className="text-xs font-bold mb-2">Level</h4>
                        {Object.keys(filters.level).map((level) => (
                          <label key={level} className="flex items-center gap-2 text-xs mb-2">
                            <input
                              type="checkbox"
                              checked={filters.level[level as LevelFilterKey]}
                              onChange={() => handleFilterChange("level", level as LevelFilterKey)}
                            />
                            {level}
                          </label>
                        ))}
                      </div>
                      <button
                        className="text-xs text-[#f9b54c] underline"
                        onClick={clearFilters}
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* <button
                    className="flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg"
                    onClick={() => handleDelete(selectedRows[0])}
                    disabled={selectedRows.length !== 1}
                  >
                    <Image src="/delete.png" alt="Delete" width={12} height={12} />
                    Delete
                  </button> */}
                </div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              <div className="grid grid-cols-[40px_1.5fr_2fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                <div />
                <div>Name</div>
                <div>Badge</div>
                <div>Level</div>
                <div>Requirement</div>
                <div>Action</div>
              </div>

              <div className="border-t border-white/20 mb-4"></div>

              {filteredData.length === 0 ? (
                <div className="text-white text-center text-xs">No levels to display</div>
              ) : (
                filteredData
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .map((level, index) => (
                    <div
                      key={level.id}
                      className={`grid grid-cols-[40px_1.5fr_2fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                        selectedRows.includes(level.id) ? "bg-white text-black rounded-lg" : "text-white"
                      }`}
                      onClick={() => handleRowClick(level.id)}
                    >
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-4 h-4 border-2 rounded-full cursor-pointer ${
                            selectedRows.includes(level.id) ? "bg-black border-black" : "border-white"
                          }`}
                        />
                      </div>
                      <div className="truncate">{decodeLevelName(level.name) || "N/A"}</div>
                      <div className="flex items-center gap-2">
                        <Image
                          src={level.badge || "/logo.png"}
                          alt="Badge"
                          width={16}
                          height={16}
                          className="object-cover"
                        />
                        <span className="truncate">{level.badge ? "Badge" : "N/A"}</span>
                      </div>
                      <div>{level.level || "N/A"}</div>
                      <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Requirement" width={16} height={16} />
                        {level.requirement || "N/A"}
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
                            <div
                              className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                              onClick={() => {
                                setLevelToEdit({
                                  id: level.id,
                                  name: level.name,
                                  requirement: level.requirement,
                                  level: level.level.toString(),
                                  badgeImage: null,
                                });
                                setShowCreateOverlay(true);
                                setShowActionDropdown(null);
                              }}
                            >
                              <Image src="/edit.png" alt="Edit" width={12} height={12} />
                              Edit
                            </div>
                            {/* <div
                              className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                              onClick={() => handleDelete(level.id)}
                            >
                              <Image src="/deletered.png" alt="Delete" width={12} height={12} />
                              Delete
                            </div> */}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
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

          {/* Overlays */}
          {showCreateOverlay && (
            <CreateLevelOverlay
              onClose={() => {
                setShowCreateOverlay(false);
                setLevelToEdit(null);
              }}
              levelToEdit={levelToEdit}
              onSubmit={async (newLevel) => {
                try {
                  const token = localStorage.getItem("access_token");
                  if (!token) throw new Error("No access token found");

                  const formData = new FormData();
                  formData.append("name", newLevel.name);
                  formData.append("requirement", newLevel.requirement);
                  formData.append("level", newLevel.level);
                  if (newLevel.badgeImage) {
                    formData.append("badge", newLevel.badgeImage);
                  }

                  const url = newLevel.id
                    ? `${API_BASE_URL}/admin/levels/update_level/${newLevel.id}`
                    : `${API_BASE_URL}/admin/levels/create_level`;
                  const method = newLevel.id ? "PUT" : "POST";

                  const response = await fetch(url, {
                    method,
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });

                  if (!response.ok) throw new Error("Failed to submit level");

                  await fetchLevels(); // Refresh the levels list with updated images
                  setShowCreateOverlay(false);
                  setLevelToEdit(null);
                } catch (err) {
                  setError((err as Error).message);
                  console.error("Level submission error:", err);
                }
              }}
            />
          )}
          {/* {showDeleteOverlay && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
              <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
                <Image src="/Red Delete.png" alt="Delete" width={100} height={100} className="mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-4">Delete?</h2>
                <p className="text-xs mb-6">Are you sure to delete this level?</p>
                <button
                  className="w-full bg-black text-white py-2 rounded-lg hover:bg-red-600 mb-4"
                  onClick={handleDeleteConfirmed}
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
          )} */}
        </div>
      </div>
    </div>
  );
};

export default Levels;