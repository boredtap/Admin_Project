import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api";
import { User } from "./UserProfileOverlay";

export interface RewardFormData {
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

interface CreateNewRewardProps {
  onClose: () => void;
  rewardToEdit: RewardFormData | null;
  onSubmit: (rewardData: RewardFormData) => Promise<void>;
  prefilledUser?: User | null;
}

const beneficiaryTypes = ["All Users", "Clan(s)", "Level(s)", "Specific User(s)"];

const CreateNewReward: React.FC<CreateNewRewardProps> = ({
  onClose,
  rewardToEdit,
  onSubmit,
  prefilledUser,
}) => {
  const [formData, setFormData] = useState<RewardFormData>({
    rewardTitle: prefilledUser ? "Admin Reward" : "",
    rewardAmount: "",
    expiryDate: new Date(),
    beneficiaryType: prefilledUser ? "Specific User(s)" : "",
    selectedClans: [],
    selectedLevels: [],
    specificUsers: prefilledUser?.username || "",
    telegramUserId: prefilledUser?.telegram_user_id || "",
    image: null,
  });
  const [clans, setClans] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [defaultImageUrl] = useState(prefilledUser ? "/logo.png" : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState({
    beneficiaries: false,
    clans: false,
    levels: false,
  });
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    if (rewardToEdit) {
      setFormData({
        id: rewardToEdit.id,
        rewardTitle: rewardToEdit.rewardTitle,
        rewardAmount: rewardToEdit.rewardAmount,
        expiryDate: rewardToEdit.expiryDate ? new Date(rewardToEdit.expiryDate) : new Date(),
        beneficiaryType: getBeneficiaryTypeReverse(rewardToEdit.beneficiaryType),
        selectedClans: rewardToEdit.selectedClans || [],
        selectedLevels: rewardToEdit.selectedLevels || [],
        specificUsers: rewardToEdit.specificUsers || "",
        telegramUserId: rewardToEdit.telegramUserId || "",
        image: null,
      });
    } else if (prefilledUser) {
      setFormData({
        rewardTitle: "Admin Reward",
        rewardAmount: "",
        expiryDate: new Date(),
        beneficiaryType: "Specific User(s)",
        selectedClans: [],
        selectedLevels: [],
        specificUsers: prefilledUser.username || "",
        telegramUserId: prefilledUser.telegram_user_id || "",
        image: null,
      });
    }
  }, [rewardToEdit, prefilledUser]);

  useEffect(() => {
    const fetchClansAndLevels = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No authentication token found. Please sign in.");
        return;
      }

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
          const data = await clanResponse.json();
          setClans(data.map((clan: { name: string }) => clan.name));
        }

        if (levelResponse.ok) {
          const data = await levelResponse.json();
          setLevels(data.map((level: { name: string }) => level.name.toLowerCase()));
        }
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching clans or levels:", err);
      }
    };

    fetchClansAndLevels();
  }, []);

  const getBeneficiaryTypeReverse = (beneficiary: string): string => {
    switch (beneficiary) {
      case "all_users": return "All Users";
      case "clan": return "Clan(s)";
      case "level": return "Level(s)";
      case "specific_users": return "Specific User(s)";
      default: return "";
    }
  };

  const getBeneficiaryType = (type: string): string => {
    switch (type) {
      case "All Users": return "all_users";
      case "Clan(s)": return "clan";
      case "Level(s)": return "level";
      case "Specific User(s)": return "specific_users";
      default: return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBeneficiarySelection = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      beneficiaryType: type,
      selectedClans: [],
      selectedLevels: [],
      specificUsers: prefilledUser ? prev.specificUsers : "",
      telegramUserId: prefilledUser ? prev.telegramUserId : "",
    }));
    setShowDropdown((prev) => ({ ...prev, beneficiaries: false }));
  };

  const toggleDropdown = (field: keyof typeof showDropdown) => {
    setShowDropdown((prev) => ({
      beneficiaries: false,
      clans: false,
      levels: false,
      [field]: !prev[field],
    }));
  };

  const handleCheckboxChange = (field: "selectedClans" | "selectedLevels", item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((i) => i !== item)
        : [...prev[field], item],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({ ...prev, expiryDate: date }));
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
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div className="w-48 bg-white rounded-md p-3 shadow-lg z-10">
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
                  ? formData.expiryDate && date.toDateString() === formData.expiryDate.toDateString()
                    ? "bg-[#f9b54c] text-white"
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

  const validateFormData = (): boolean => {
    if (!formData.rewardTitle.trim()) {
      setError("Please enter a reward title.");
      return false;
    }
    if (!formData.rewardAmount || isNaN(Number(formData.rewardAmount))) {
      setError("Please enter a valid reward amount.");
      return false;
    }
    if (!formData.expiryDate) {
      setError("Please select an expiry date.");
      return false;
    }
    if (!formData.beneficiaryType) {
      setError("Please select a beneficiary type.");
      return false;
    }
    if (formData.beneficiaryType === "Clan(s)" && formData.selectedClans.length === 0) {
      setError("Please select at least one clan.");
      return false;
    }
    if (formData.beneficiaryType === "Level(s)" && formData.selectedLevels.length === 0) {
      setError("Please select at least one level.");
      return false;
    }
    if (formData.beneficiaryType === "Specific User(s)" && !formData.telegramUserId) {
      setError("Please enter a Telegram User ID.");
      return false;
    }
    if (!formData.image && !rewardToEdit && !prefilledUser) {
      setError("Please upload an image for the reward.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!validateFormData()) {
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("No authentication token found. Please sign in.");
      setIsSubmitting(false);
      return;
    }

    const queryParams = new URLSearchParams({
      reward_title: formData.rewardTitle,
      reward: parseInt(formData.rewardAmount).toString(),
      expiry_date: formData.expiryDate
        ? formData.expiryDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      beneficiary: getBeneficiaryType(formData.beneficiaryType),
    });

    const formDataBody = new FormData();

    if (formData.beneficiaryType === "Clan(s)") {
      formData.selectedClans.forEach((clan) => formDataBody.append("clan", clan));
    } else if (formData.beneficiaryType === "Level(s)") {
      formData.selectedLevels.forEach((level) => formDataBody.append("level", level));
    } else if (formData.beneficiaryType === "Specific User(s)" && formData.telegramUserId) {
      formDataBody.append("specific_users", formData.telegramUserId);
    }

    if (formData.image) {
      formDataBody.append("reward_image", formData.image);
    } else if (prefilledUser && !formData.image) {
      try {
        const response = await fetch("/logo.png");
        if (response.ok) {
          const blob = await response.blob();
          formDataBody.append("reward_image", blob, "logo.png");
        }
      } catch (imgErr) {
        console.warn("Failed to load default image:", imgErr);
      }
    }

    try {
      const url = rewardToEdit
        ? `${API_BASE_URL}/admin/reward/update_reward?reward_id=${rewardToEdit.id}&${queryParams.toString()}`
        : `${API_BASE_URL}/admin/reward/create_reward?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: rewardToEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formDataBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${rewardToEdit ? "update" : "create"} reward: ${errorText}`);
      }

      await onSubmit(formData);
      setShowSuccessOverlay(true);
    } catch (err) {
      setError((err as Error).message);
      console.error("Reward submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBeneficiaryField = () => {
    if (!formData.beneficiaryType || formData.beneficiaryType === "All Users") return null;

    if (prefilledUser) {
      return (
        <input
          type="text"
          name="specificUsers"
          value={formData.specificUsers}
          readOnly
          className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs opacity-50 cursor-not-allowed"
        />
      );
    }

    switch (formData.beneficiaryType) {
      case "Clan(s)":
        return (
          <div className="relative">
            <div
              className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 flex items-center justify-between text-white text-xs cursor-pointer"
              onClick={() => toggleDropdown("clans")}
            >
              {formData.selectedClans.length > 0 ? formData.selectedClans.join(", ") : "Select Clans"}
              <Image src="/dropdown.png" alt="Dropdown" width={16} height={16} />
            </div>
            {showDropdown.clans && (
              <div className="absolute top-full left-0 mt-1 w-full bg-[#19191A] border border-[#363638] rounded-md max-h-48 overflow-y-auto z-10">
                {clans.map((clan) => (
                  <label key={clan} className="flex items-center gap-2 px-3 py-2 text-white text-xs hover:bg-[#363638]">
                    <input
                      type="checkbox"
                      checked={formData.selectedClans.includes(clan)}
                      onChange={() => handleCheckboxChange("selectedClans", clan)}
                      className="w-4 h-4"
                    />
                    {clan}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      case "Level(s)":
        return (
          <div className="relative">
            <div
              className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 flex items-center justify-between text-white text-xs cursor-pointer"
              onClick={() => toggleDropdown("levels")}
            >
              {formData.selectedLevels.length > 0 ? formData.selectedLevels.join(", ") : "Select Levels"}
              <Image src="/dropdown.png" alt="Dropdown" width={16} height={16} />
            </div>
            {showDropdown.levels && (
              <div className="absolute top-full left-0 mt-1 w-full bg-[#19191A] border border-[#363638] rounded-md max-h-48 overflow-y-auto z-10">
                {levels.map((level) => (
                  <label key={level} className="flex items-center gap-2 px-3 py-2 text-white text-xs hover:bg-[#363638]">
                    <input
                      type="checkbox"
                      checked={formData.selectedLevels.includes(level)}
                      onChange={() => handleCheckboxChange("selectedLevels", level)}
                      className="w-4 h-4"
                    />
                    {level}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      case "Specific User(s)":
        return (
          <input
            type="text"
            name="telegramUserId"
            placeholder="Enter Telegram ID"
            value={formData.telegramUserId || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                telegramUserId: e.target.value,
                specificUsers: e.target.value,
              }))
            }
            className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[#202022] rounded-lg p-6 text-[#f9b54c] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative text-center py-5">
          <h2 className="text-xl font-bold">{rewardToEdit ? "Update Reward" : "Create New Reward"}</h2>
          <button className="absolute right-0 top-1/2 -translate-y-1/2" onClick={onClose}>
            <Image src="/cancel.png" alt="Close" width={24} height={24} />
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-xs text-center mb-4">
            Error: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs mb-1.5">Reward Title</label>
            <input
              type="text"
              name="rewardTitle"
              placeholder="Enter reward title"
              value={formData.rewardTitle}
              onChange={handleInputChange}
              className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              readOnly={!!prefilledUser}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs mb-1.5">Reward</label>
              <div className="relative">
                <input
                  type="number"
                  name="rewardAmount"
                  placeholder="Enter reward amount"
                  value={formData.rewardAmount}
                  onChange={handleInputChange}
                  className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 pr-10 text-white text-xs"
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

            <div className="relative">
              <label className="block text-xs mb-1.5">Expiry Date</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={formatDate(formData.expiryDate)}
                  readOnly
                  className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 pr-10 text-white text-xs"
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
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs mb-1.5">Beneficiary</label>
              <select
                name="beneficiaryType"
                value={formData.beneficiaryType}
                onChange={(e) => handleBeneficiarySelection(e.target.value)}
                className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                disabled={!!prefilledUser}
                required
              >
                <option value="">Select beneficiary type</option>
                {beneficiaryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {renderBeneficiaryField() && (
              <div>
                <label className="block text-xs mb-1.5">{formData.beneficiaryType}</label>
                {renderBeneficiaryField()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs mb-1.5">Upload Reward Image</label>
            <div className="h-32 bg-[#19191A] border border-dashed border-[#363638] rounded-md flex flex-col items-center justify-center p-6">
              {formData.image ? (
                <Image src={URL.createObjectURL(formData.image)} alt="Preview" width={50} height={50} />
              ) : defaultImageUrl ? (
                <Image src={defaultImageUrl} alt="Default" width={50} height={50} />
              ) : (
                <>
                  <Image src="/upload.png" alt="Upload" width={24} height={24} className="mb-2" />
                  <p className="text-xs text-gray-400">
                    Drop your image here or{" "}
                    <label className="text-[#f9b54c] cursor-pointer">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      Browse
                    </label>
                  </p>
                  <p className="text-xs text-gray-400">Support: jpg, jpeg, png</p>
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-80 h-14 bg-white text-black rounded-md font-bold text-sm hover:bg-[#f9b54c] mx-auto block disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        {showSuccessOverlay && (
          <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50" onClick={() => setShowSuccessOverlay(false)}>
            <div
              className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src="/success.png" alt="Success" width={100} height={100} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Success!</h2>
              <p className="text-xs mb-6">
                Reward {rewardToEdit ? "updated" : "created"} successfully.
              </p>
              <button
                className="w-full h-12 bg-black text-white rounded-md hover:bg-green-600 mb-4"
                onClick={() => {
                  setShowSuccessOverlay(false);
                  onClose();
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateNewReward;