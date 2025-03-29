// src/app/security/page.tsx

"use client";

import React, { useState } from "react";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import { API_BASE_URL } from "@/config/api";

interface FormData {
  userId: string;
  userStatus: "" | "Ban" | "Suspend";
  launchDate: Date | null;
}

interface SuccessResponse {
  message: string;
}

const Security: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    userId: "",
    userStatus: "",
    launchDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      launchDate: date,
    }));
    setShowDatePicker(false);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "DD-MM-YYYY";
    return date.toLocaleDateString("en-GB", {
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
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    );
  };

  const CustomDatePicker: React.FC = () => {
    const days = getDaysInMonth(currentMonth);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    return (
      <div className="absolute top-full mt-2 w-[300px] bg-white rounded-lg p-4 shadow-lg z-10 text-black">
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => changeMonth(-1)} className="text-lg">&lt;</button>
          <span className="text-sm font-medium">
            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="text-lg">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600">
          {weekDays.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {days.map((date, index) => (
            <div
              key={index}
              className={`p-2 rounded cursor-pointer ${
                date
                  ? "hover:bg-gray-100 " +
                    (formData.launchDate &&
                    date &&
                    date.toDateString() === formData.launchDate.toDateString()
                      ? "bg-[#f9b54c] text-white"
                      : "")
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmOverlay(true);
  };

  const handleOverlaySubmit = async () => {
    const endpoint = `${API_BASE_URL}/admin/security/suspend_user/${formData.userId}`;
    const status = formData.userStatus.toLowerCase(); // "ban" or "suspend"
    let url = `${endpoint}?status=${status}`;
    
    if (formData.userStatus === "Suspend" && formData.launchDate) {
      url += `&end_date=${formData.launchDate.toISOString().split("T")[0]}&reason=bad%20guy`;
    }

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${status} user: ${response.status} - ${errorText}`);
      }

      const data: SuccessResponse = await response.json();
      setSuccessMessage(data.message);
      setShowConfirmOverlay(false);
      setShowSuccessOverlay(true);
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message || "An unexpected error occurred");
      } else {
        setErrorMessage("An unexpected error occurred");
      }
      setShowConfirmOverlay(false);
      setShowErrorOverlay(true);
    }
  };

  const handleConfirmOverlayClose = () => {
    setShowConfirmOverlay(false);
  };

  const handleSuccessOverlayClose = () => {
    setShowSuccessOverlay(false);
    setFormData({ userId: "", userStatus: "", launchDate: null }); // Reset form
  };

  const handleErrorOverlayClose = () => {
    setShowErrorOverlay(false);
  };

  return (
    <div className="flex min-h-screen bg-[#19191A]">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Security" />
        <div className="flex-1 pt-28 pl-44 pr-2 bg-[#141414] lg:pl-52 sm:pt-24 sm:pl-0">
          <div className="flex-1 py-4 min-w-0 max-w-[calc(100%)]">
            <div className="bg-[#202022] rounded-lg p-4 border border-white/20">
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row justify-between gap-6 mb-6">
                  <div className="flex-1 flex flex-col">
                    <label className="text-white text-sm font-medium mb-2">User ID</label>
                    <input
                      type="text"
                      name="userId"
                      placeholder="Enter user ID"
                      value={formData.userId}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-lg px-3 text-white text-sm placeholder-[#666]"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <label className="text-white text-sm font-medium mb-2">
                      Change User Status
                    </label>
                    <select
                      name="userStatus"
                      value={formData.userStatus}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-lg px-3 text-white text-sm"
                    >
                      <option value="">Select user status</option>
                      <option value="Ban">Ban</option>
                      <option value="Suspend">Suspend</option>
                    </select>
                  </div>
                </div>

                {formData.userStatus === "Suspend" && (
                  <div className="flex flex-col mb-6 relative">
                    <label className="text-white text-sm font-medium mb-2">Launch Date</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="DD-MM-YYYY"
                        value={formatDate(formData.launchDate)}
                        readOnly
                        className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-lg px-3 text-white text-sm pr-10"
                      />
                      <Image
                        src="/date.png"
                        alt="Date"
                        width={24}
                        height={24}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                      />
                      {showDatePicker && <CustomDatePicker />}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-12 bg-white text-black rounded-lg text-base font-bold hover:bg-[#f9b54c] transition-colors"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Confirmation Overlay */}
        {showConfirmOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-[320px] text-center">
              <Image
                src="/overlay icon.png"
                alt="Overlay Icon"
                width={100}
                height={100}
                className="mb-4 mx-auto"
              />
              <h2 className="text-3xl font-bold mb-4">
                {formData.userStatus === "Ban" ? "Ban User?" : "Suspend User?"}
              </h2>
              <p className="text-sm mb-6">
                {formData.userStatus === "Ban"
                  ? "Are you sure you want to ban this user?"
                  : "Are you sure you want to suspend this user?"}
              </p>
              <button
                onClick={handleOverlaySubmit}
                className="w-full h-12 bg-black text-white rounded-lg text-base font-bold hover:bg-red-600 transition-colors mb-4"
              >
                {formData.userStatus === "Ban" ? "Ban" : "Suspend"}
              </button>
              <button
                onClick={handleConfirmOverlayClose}
                className="text-white text-sm underline bg-transparent border-none cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {showSuccessOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-[320px] text-center">
              <Image
                src="/success.png"
                alt="Success Icon"
                width={100}
                height={100}
                className="mb-4 mx-auto"
              />
              <h2 className="text-3xl font-bold mb-4">Success</h2>
              <p className="text-sm mb-6">{successMessage}</p>
              <button
                onClick={handleSuccessOverlayClose}
                className="w-full h-12 bg-[#0CAF60] text-white rounded-lg text-base font-bold hover:bg-green-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {showErrorOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-[320px] text-center">
              <Image
                src="/error.png" // Add an error icon to your public folder
                alt="Error Icon"
                width={100}
                height={100}
                className="mb-4 mx-auto"
              />
              <h2 className="text-3xl font-bold mb-4">Error</h2>
              <p className="text-sm mb-6">{errorMessage}</p>
              <button
                onClick={handleErrorOverlayClose}
                className="w-full h-12 bg-red-600 text-white rounded-lg text-base font-bold hover:bg-red-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;