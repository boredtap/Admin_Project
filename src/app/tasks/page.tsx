"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import CreateTaskOverlay from "@/components/CreateTaskOverlay";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "@/config/api";

interface Task {
  id: string;
  task_name: string;
  task_type: string;
  task_description: string;
  task_status: string;
  task_reward: string;
  task_participants: string;
  image_url?: string;
}

interface TaskFormData {
  id?: string;
  taskName: string;
  taskType: string;
  description: string;
  participants: string;
  status: string;
  deadline: Date | null;
  reward: string;
  image: File | null;
}

const Tasks: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"All Tasks" | "In-Game" | "Special" | "Social">("All Tasks");
  const [showActionDropdown, setShowActionDropdown] = useState<number | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksData, setTasksData] = useState<{
    "All Tasks": Task[];
    "In-Game": Task[];
    "Special": Task[];
    "Social": Task[];
  }>({
    "All Tasks": [],
    "In-Game": [],
    "Special": [],
    "Social": [],
  });
  const [filters, setFilters] = useState<{
    status: { [key: string]: boolean };
    type: { [key: string]: boolean };
  }>({
    status: { Active: false, Inactive: false, Paused: false },
    type: { "In-Game": false, Special: false, Social: false },
  });
  
  const [showCreateTaskOverlay, setShowCreateTaskOverlay] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskFormData | null>(null);
  const actionDropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        console.log("Click outside detected, closing dropdown");
        setShowActionDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/task/all_tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data: Task[] = await response.json();
      setTasksData({
        "All Tasks": data,
        "In-Game": data.filter((task) => task.task_type === "in-game"),
        "Special": data.filter((task) => task.task_type === "special"),
        "Social": data.filter((task) => task.task_type === "social"),
      });
    } catch (err) {
      setError((err as Error).message);
      console.error("Fetch tasks error:", err);
      router.push("/signin");
    } finally {
      setLoading(false);
    }
  }, [router, refreshToken]);

  useEffect(() => {
    fetchTasks();
    const ws = new WebSocket("wss://bt-coins.onrender.com/ws");
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setTasksData((prev) => ({ ...prev, ...message }));
    };
    return () => ws.close();
  }, [fetchTasks]);

  const handleFilterChange = (category: "status" | "type", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: { ...prev[category], [value]: !prev[category][value] },
    }));
  };

  const handleRowClick = (taskId: string) => {
    setSelectedRows((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleActionClick = (index: number) => {
    console.log("Action clicked, toggling dropdown for index:", index);
    setShowActionDropdown(showActionDropdown === index ? null : index);
  };

  const handleEditTask = async (task: Task) => {
    console.log("Edit button clicked for task:", task.id);
    setShowActionDropdown(null);
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }
      const response = await fetch(`${API_BASE_URL}/admin/task/tasks_by_id?task_id=${task.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch task details");
      const fullTaskDetails: Task = await response.json();
      const taskData: TaskFormData = {
        id: fullTaskDetails.id,
        taskName: fullTaskDetails.task_name,
        taskType: fullTaskDetails.task_type,
        description: fullTaskDetails.task_description,
        participants: fullTaskDetails.task_participants,
        status: fullTaskDetails.task_status,
        deadline: null, // Adjust if backend provides deadline
        reward: fullTaskDetails.task_reward,
        image: null, // Adjust if backend provides image
      };
      console.log("handleEditTask - taskToEdit set to:", taskData);
      setTaskToEdit(taskData);
      setShowCreateTaskOverlay(true);
    } catch (error) {
      console.error("Error fetching task details:", error);
      setError("Failed to load task details for editing.");
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) return;
    console.log("handleDelete called, selectedRows:", selectedRows);
    try {
      let token = localStorage.getItem("access_token");
      if (!token || isTokenExpired(token)) {
        token = await refreshToken();
        if (!token) return;
      }
      await Promise.all(
        selectedRows.map((taskId) =>
          fetch(`${API_BASE_URL}/admin/task/delete_task?task_id=${taskId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      await fetchTasks();
      setSelectedRows([]);
      setShowDeleteOverlay(false);
    } catch (error) {
      console.error("Error deleting tasks:", error);
      setError("Failed to delete selected tasks.");
    }
  };

  const handleExport = () => {
    const dataToExport = filteredData.map((task) => ({
      "Task Name": task.task_name,
      "Task Type": task.task_type,
      Description: task.task_description,
      Status: task.task_status,
      Reward: task.task_reward,
      Participants: task.task_participants,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, "tasks.xlsx");
  };

  const filteredData = tasksData[activeTab].filter((task) => {
    const statusFiltersActive = Object.values(filters.status).some((v) => v);
    const statusMatch = statusFiltersActive
      ? (filters.status["Active"] && task.task_status === "active") ||
        (filters.status["Inactive"] && task.task_status === "inactive") ||
        (filters.status["Paused"] && task.task_status === "paused")
      : true;

    const typeFiltersActive = Object.values(filters.type).some((v) => v);
    const typeMatch = typeFiltersActive
      ? (filters.type["In-Game"] && task.task_type === "in-game") ||
        (filters.type["Special"] && task.task_type === "special") ||
        (filters.type["Social"] && task.task_type === "social")
      : true;

    const searchMatch =
      searchTerm === "" ||
      task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task_status.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && typeMatch && searchMatch;
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  useEffect(() => {
    console.log("Overlay state check - showCreateTaskOverlay:", showCreateTaskOverlay);
    console.log("Overlay state check - showDeleteOverlay:", showDeleteOverlay);
    console.log("Current taskToEdit:", taskToEdit);
  }, [showCreateTaskOverlay, showDeleteOverlay, taskToEdit]);

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Tasks" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            {loading && (
              <div className="flex justify-center items-center h-full">
                <span className="text-[#f9b54c] text-xs">Fetching Tasks...</span>
              </div>
            )}
            {error && <div className="text-red-500 text-center text-xs">Error: {error}</div>}
            {!loading && !error && (
              <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-4">
                    {["All Tasks", "In-Game", "Special", "Social"].map((tab) => (
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
                      onClick={() => {
                        console.log("Create Task clicked");
                        setTaskToEdit(null);
                        setShowCreateTaskOverlay(true);
                      }}
                    >
                      <Image src="/create.png" alt="Create" width={12} height={12} />
                      Create Task
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 mb-4" />

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center bg-[#19191A] rounded-lg w-full max-w-[500px] h-[54px] p-4 relative sm:h-10">
                    <Image src="/search.png" alt="Search" width={16} height={16} />
                    <input
                      type="text"
                      placeholder="Search by type, status..."
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
                          <h4 className="text-xs font-bold mb-2">Task Status</h4>
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
                          <h4 className="text-xs font-bold mb-2">Task Type</h4>
                          {Object.keys(filters.type).map((type) => (
                            <label key={type} className="flex items-center gap-2 text-xs mb-2">
                              <input
                                type="checkbox"
                                checked={filters.type[type]}
                                onChange={() => handleFilterChange("type", type)}
                              />
                              {type}
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
                      onClick={() => {
                        console.log("Top Delete clicked, selectedRows:", selectedRows);
                        if (selectedRows.length > 0) setShowDeleteOverlay(true);
                      }}
                      disabled={selectedRows.length === 0}
                    >
                      <Image src="/delete.png" alt="Delete" width={12} height={12} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/20 mb-4" />

                <div className="grid grid-cols-[40px_2fr_1fr_2fr_1fr_1fr_1fr_1fr] gap-3 text-[#AEAAAA] text-xs font-medium mb-2">
                  <div />
                  <div>Task Name</div>
                  <div>Task Type</div>
                  <div>Description</div>
                  <div>Status</div>
                  <div>Reward</div>
                  <div>Participants</div>
                  <div>Action</div>
                </div>

                <div className="border-t border-white/20 mb-4" />

                {filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((task, index) => (
                  <div
                    key={task.id}
                    className={`grid grid-cols-[40px_2fr_1fr_2fr_1fr_1fr_1fr_1fr] gap-3 py-3 text-xs ${
                      selectedRows.includes(task.id) ? "bg-white text-black rounded-lg" : "text-white"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(task.id);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-4 h-4 border-2 rounded-full cursor-pointer flex items-center justify-center ${
                          selectedRows.includes(task.id) ? "border-black bg-black" : "border-white"
                        }`}
                      >
                        {selectedRows.includes(task.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                    <div className="truncate">{task.task_name}</div>
                    <div>{task.task_type}</div>
                    <div className="truncate">{task.task_description}</div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          task.task_status.toLowerCase() === "active"
                            ? "bg-[#E7F7EF] text-[#0CAF60]"
                            : task.task_status.toLowerCase() === "inactive"
                            ? "bg-[#D8CBFD] text-[#551DEC]"
                            : task.task_status.toLowerCase() === "paused"
                            ? "bg-[#19191A] text-[#D3D1D1]"
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {task.task_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Image src="/logo.png" alt="Reward" width={16} height={16} />
                      {task.task_reward}
                    </div>
                    <div>{task.task_participants}</div>
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
                          <button
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs w-full text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTask(task);
                            }}
                          >
                            <Image src="/edit.png" alt="Edit" width={12} height={12} />
                            Edit
                          </button>
                          <button
                            className="flex items-center gap-2 px-2 py-2 hover:bg-gray-100 cursor-pointer text-xs w-full text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("Delete button clicked for task:", task.id);
                              setSelectedRows([task.id]);
                              setShowDeleteOverlay(true);
                              setShowActionDropdown(null);
                            }}
                          >
                            <Image src="/deletered.png" alt="Delete" width={12} height={12} />
                            Delete
                          </button>
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

        {showCreateTaskOverlay && (
          <CreateTaskOverlay
            onClose={() => {
              console.log("Closing CreateTaskOverlay");
              setShowCreateTaskOverlay(false);
              setTaskToEdit(null);
            }}
            taskToEdit={taskToEdit}
            onSubmit={async (taskData) => {
              console.log("CreateTaskOverlay submitted with data:", taskData);
              let token = localStorage.getItem("access_token");
              if (!token || isTokenExpired(token)) {
                token = await refreshToken();
                if (!token) throw new Error("Token refresh failed");
              }

              // Log taskToEdit and taskData.id for clarity
              console.log("taskToEdit at submission:", taskToEdit);
              console.log("taskData.id at submission:", taskData.id);

              if (!taskData.id && taskToEdit) {
                throw new Error("Task ID is missing for update operation");
              }

              const queryParams = new URLSearchParams({
                ...(taskData.id ? { task_id: taskData.id } : {}),
                task_name: taskData.taskName,
                task_type: taskData.taskType,
                task_description: taskData.description,
                task_status: taskData.status,
                task_reward: taskData.reward,
                task_deadline: taskData.deadline
                  ? taskData.deadline.toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0],
              }).toString();

              const formData = new FormData();
              formData.append("task_participants", taskData.participants);
              if (taskData.image) {
                formData.append("task_image", taskData.image);
              }

              const endpoint = taskData.id ? "update_task" : "create_task";
              const method = taskData.id ? "PUT" : "POST";

              console.log(`Submitting to ${endpoint} with method ${method}, query:`, queryParams);
              console.log("FormData participants:", taskData.participants, "image:", taskData.image?.name);

              const response = await fetch(`${API_BASE_URL}/admin/task/${endpoint}?${queryParams}`, {
                method,
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error("API error response:", errorData);
                throw new Error(errorData.message || `Failed to ${taskData.id ? "update" : "create"} task`);
              }

              const responseData = await response.json();
              console.log("API response:", responseData);

              await fetchTasks();
            }}
          />
        )}

        {showDeleteOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/Red Delete.png" alt="Delete" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Delete?</h2>
              <p className="text-xs mb-6">
                Are you sure to delete {selectedRows.length} task{selectedRows.length > 1 ? "s" : ""}?
              </p>
              <button
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-red-600 mb-4"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Confirm Delete clicked");
                  handleDelete();
                }}
              >
                Delete
              </button>
              <button
                className="text-white underline bg-transparent border-none cursor-pointer text-xs"
                onClick={() => {
                  console.log("Cancel Delete clicked");
                  setShowDeleteOverlay(false);
                }}
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

export default Tasks;