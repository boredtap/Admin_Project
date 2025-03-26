"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api";

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

interface CreateTaskOverlayProps {
  onClose: () => void;
  taskToEdit: TaskFormData | null;
  onSubmit: (taskData: TaskFormData) => Promise<void>;
}

const CreateTaskOverlay: React.FC<CreateTaskOverlayProps> = ({ onClose, taskToEdit, onSubmit }) => {
  const [formData, setFormData] = useState<TaskFormData>({
    taskName: "",
    taskType: "",
    description: "",
    participants: "",
    status: "",
    deadline: null,
    reward: "",
    image: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      console.log("Task to edit:", taskToEdit); // Debug log
      setFormData(taskToEdit);
    }
  }, [taskToEdit]);

  const taskTypes = ["in-game", "special", "social"];
  const participantLevels = [
    "all_users",
    "novice",
    "explorer",
    "apprentice",
    "warrior",
    "master",
    "champion",
    "tactician",
    "specialist",
    "conqueror",
    "legend",
  ];
  const statusOptions = ["active", "inactive", "paused"];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("No authentication token found. Please sign in.");
      return;
    }

    // Validate required fields
    if (
      !formData.taskName ||
      !formData.taskType ||
      !formData.description ||
      !formData.status ||
      !formData.reward ||
      !formData.participants
    ) {
      setError("All fields except image and deadline are required.");
      return;
    }

    if (taskToEdit && !formData.id) {
      setError("Task ID is missing for update operation.");
      return;
    }

    // Construct query parameters
    const queryParams = new URLSearchParams({
      ...(taskToEdit ? { task_id: formData.id || "" } : {}), // Use formData.id
      task_name: formData.taskName,
      task_type: formData.taskType,
      task_description: formData.description,
      task_status: formData.status,
      task_reward: formData.reward,
      task_deadline: formData.deadline ? formData.deadline.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    }).toString();

    // Construct form data for multipart fields
    const formDataToSend = new FormData();
    formDataToSend.append("task_participants", formData.participants);
    if (formData.image && !taskToEdit) { // Only append image for create or if explicitly changed
      formDataToSend.append("task_image", formData.image);
    }

    try {
      const url = `${API_BASE_URL}/admin/task/${taskToEdit ? "update_task" : "create_task"}?${queryParams}`;
      console.log("Request URL:", url); // Debug log
      const response = await fetch(url, {
        method: taskToEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server response:", errorData);
        throw new Error(errorData.message || `Failed to ${taskToEdit ? "update" : "create"} task (Status: ${response.status})`);
      }

      setShowSuccessOverlay(true);
      await onSubmit(formData);
    } catch (err) {
      setError((err as Error).message);
      console.error("Task submission error:", err);
    }
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({ ...prev, deadline: date }));
    setShowDatePicker(false);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "DD-MM-YYYY";
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
                  ? formData.deadline && date.toDateString() === formData.deadline.toDateString()
                    ? "bg-orange-500 text-white"
                    : "hover:bg-gray-100"
                  : ""
              }`}
              onClick={() => date && handleDateChange(date)}
            >
              {date ? date.getDate() : ""}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="w-full max-w-lg bg-[#202022] rounded-lg p-6 text-orange-500 max-h-[90vh] overflow-y-auto">
        <div className="relative text-center py-3">
          <h2 className="text-xl font-bold">{taskToEdit ? "Update Task" : "Create Task"}</h2>
          <button className="absolute right-0 top-1/2 -translate-y-1/2" onClick={onClose}>
            <Image src="/cancel.png" alt="Close" width={24} height={24} />
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-xs text-center mb-4">
            Error: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs mb-1.5">Task Name</label>
            <input
              type="text"
              name="taskName"
              placeholder="Enter task name"
              value={formData.taskName}
              onChange={handleInputChange}
              className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs mb-1.5">Task Type</label>
              <select
                name="taskType"
                value={formData.taskType}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              >
                <option value="">Select task type</option>
                {taskTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1.5">Task Description</label>
              <input
                type="text"
                name="description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs mb-1.5">Task Participants</label>
              <select
                name="participants"
                value={formData.participants}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              >
                <option value="">Select participant level</option>
                {participantLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1.5">Task Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              >
                <option value="">Select status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-xs mb-1.5">Task Deadline</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={formatDate(formData.deadline)}
                  readOnly
                  className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs pr-10"
                />
                <Image
                  src="/date.png"
                  alt="Date"
                  width={20}
                  height={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                />
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 z-10">
                    <CustomDatePicker />
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs mb-1.5">Task Reward</label>
              <div className="relative">
                <input
                  type="number"
                  name="reward"
                  placeholder="Enter task reward"
                  value={formData.reward}
                  onChange={handleInputChange}
                  className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs pr-10"
                  required
                />
                <Image
                  src="/logo.png"
                  alt="Coin"
                  width={20}
                  height={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5">Upload Task Image</label>
            <div className="h-28 bg-[#19191A] border border-dashed border-[#363638] rounded-md flex flex-col items-center justify-center p-4">
              <Image src="/upload.png" alt="Upload" width={24} height={24} className="mb-2" />
              <p className="text-xs text-gray-400">
                Drop your image here or{" "}
                <label className="text-orange-500 cursor-pointer">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  Browse
                </label>
              </p>
              {formData.image && (
                <div className="mt-2">
                  <Image
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    width={48}
                    height={48}
                    className="rounded"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-white text-black rounded-md font-bold text-sm hover:bg-orange-500"
          >
            Submit
          </button>
        </form>

        {showSuccessOverlay && (
          <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/success.png" alt="Success" width={80} height={80} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Successful</h2>
              <p className="text-xs mb-6">Your task is successfully {taskToEdit ? "updated" : "created"}.</p>
              <button
                className="w-full bg-black text-white py-2 rounded-md hover:bg-green-600 mb-4"
                onClick={onClose}
              >
                Proceed
              </button>
              <button
                className="text-white underline bg-transparent border-none cursor-pointer text-xs"
                onClick={() => setShowSuccessOverlay(false)}
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

export default CreateTaskOverlay;