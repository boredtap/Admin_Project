import React, { useState, useEffect } from "react";
import Image from "next/image";

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

interface CreateChallengeOverlayProps {
  onClose: () => void;
  challengeToEdit: ChallengeFormData | null;
  onSubmit: (challengeData: ChallengeFormData) => Promise<void>;
  clans: string[];
  levels: string[];
}

const participantTypes = ["All Users", "Clan(s)", "Level(s)", "Specific User(s)"];

const CreateChallengeOverlay: React.FC<CreateChallengeOverlayProps> = ({
  onClose,
  challengeToEdit,
  onSubmit,
  clans,
  levels,
}) => {
  const [formData, setFormData] = useState<ChallengeFormData>(
    challengeToEdit || {
      challengeName: "",
      challengeReward: "",
      challengeDescription: "",
      launchDate: new Date(),
      challengeDuration: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      participantType: "All Users",
      selectedClans: [],
      selectedLevels: [],
      specificUsers: "",
      image: null,
      imagePreview: "",
    }
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState({
    beneficiaries: false,
    clans: false,
    levels: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    if (challengeToEdit) {
      setFormData({
        id: challengeToEdit.id,
        challengeName: challengeToEdit.challengeName,
        challengeReward: challengeToEdit.challengeReward,
        challengeDescription: challengeToEdit.challengeDescription,
        launchDate: challengeToEdit.launchDate ? new Date(challengeToEdit.launchDate) : new Date(),
        challengeDuration: challengeToEdit.challengeDuration,
        participantType: challengeToEdit.participantType,
        selectedClans: challengeToEdit.selectedClans || [],
        selectedLevels: challengeToEdit.selectedLevels || [],
        specificUsers: challengeToEdit.specificUsers || "",
        image: null,
        imagePreview: challengeToEdit.imagePreview || "",
      });
    }
  }, [challengeToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDurationChange = (field: keyof typeof formData.challengeDuration, value: string) => {
    setFormData((prev) => ({
      ...prev,
      challengeDuration: {
        ...prev.challengeDuration,
        [field]: Math.max(0, parseInt(value) || 0),
      },
    }));
  };

  const handleParticipantSelection = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      participantType: type,
      selectedClans: [],
      selectedLevels: [],
      specificUsers: "",
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
      [field]: prev[field].includes(item) ? prev[field].filter((i) => i !== item) : [...prev[field], item],
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({ ...prev, launchDate: date }));
    setShowDatePicker(false);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "DD-MM-YYYY";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDuration = (): string => {
    const { days, hours, minutes, seconds } = formData.challengeDuration;
    return `${days.toString().padStart(2, "0")}:${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
      <div className="w-48 bg-white rounded-md p-3 shadow-lg z-10">
        <div className="flex justify-between items-center mb-2 text-black">
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
        <div className="grid grid-cols-7 gap-1 mt-2 text-black">
          {days.map((date, index) => (
            <div
              key={index}
              className={`text-center py-1 rounded cursor-pointer text-xs ${
                date
                  ? formData.launchDate && date.toDateString() === formData.launchDate.toDateString()
                    ? "bg-orange-400 text-white"
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

  const CustomTimePicker: React.FC = () => {
    return (
      <div className="w-64 bg-white rounded-md p-4 shadow-lg z-10 text-black">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={formData.challengeDuration.days}
            onChange={(e) => handleDurationChange("days", e.target.value)}
            placeholder="DD"
            className="w-16 h-10 bg-[#19191A] border border-[#363638] rounded-md px-2 text-white text-sm text-center"
          />
          <span>:</span>
          <input
            type="number"
            min="0"
            max="23"
            value={formData.challengeDuration.hours}
            onChange={(e) => handleDurationChange("hours", e.target.value)}
            placeholder="HH"
            className="w-16 h-10 bg-[#19191A] border border-[#363638] rounded-md px-2 text-white text-sm text-center"
          />
          <span>:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={formData.challengeDuration.minutes}
            onChange={(e) => handleDurationChange("minutes", e.target.value)}
            placeholder="MM"
            className="w-16 h-10 bg-[#19191A] border border-[#363638] rounded-md px-2 text-white text-sm text-center"
          />
          <span>:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={formData.challengeDuration.seconds}
            onChange={(e) => handleDurationChange("seconds", e.target.value)}
            placeholder="SS"
            className="w-16 h-10 bg-[#19191A] border border-[#363638] rounded-md px-2 text-white text-sm text-center"
          />
        </div>
      </div>
    );
  };

  const validateFormData = (): boolean => {
    if (!formData.challengeName.trim()) {
      setError("Please enter a challenge name.");
      return false;
    }
    if (!formData.challengeReward || isNaN(Number(formData.challengeReward))) {
      setError("Please enter a valid challenge reward.");
      return false;
    }
    if (!formData.launchDate) {
      setError("Please select a launch date.");
      return false;
    }
    if (
      formData.challengeDuration.days === 0 &&
      formData.challengeDuration.hours === 0 &&
      formData.challengeDuration.minutes === 0 &&
      formData.challengeDuration.seconds === 0
    ) {
      setError("Please set a valid challenge duration.");
      return false;
    }
    if (!formData.participantType) {
      setError("Please select a participant type.");
      return false;
    }
    if (formData.participantType === "Clan(s)" && formData.selectedClans.length === 0) {
      setError("Please select at least one clan.");
      return false;
    }
    if (formData.participantType === "Level(s)" && formData.selectedLevels.length === 0) {
      setError("Please select at least one level.");
      return false;
    }
    if (formData.participantType === "Specific User(s)" && !formData.specificUsers.trim()) {
      setError("Please enter at least one user.");
      return false;
    }
    if (!formData.image && !formData.imagePreview && !challengeToEdit) {
      setError("Please upload an image for the challenge.");
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

    try {
      await onSubmit(formData);
    } catch (err) {
      setError((err as Error).message);
      console.error("Challenge submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderParticipantField = () => {
    if (!formData.participantType || formData.participantType === "All Users") return null;

    switch (formData.participantType) {
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
            name="specificUsers"
            placeholder="Enter users (comma-separated)"
            value={formData.specificUsers}
            onChange={handleInputChange}
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
        className="w-full max-w-xl bg-[#202022] rounded-lg p-6 text-orange-400 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative text-center py-5">
          <h2 className="text-xl font-bold">{challengeToEdit ? "Update Challenge" : "Create New Challenge"}</h2>
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
            <label className="block text-xs mb-1.5">Challenge Name</label>
            <input
              type="text"
              name="challengeName"
              placeholder="Enter challenge name"
              value={formData.challengeName}
              onChange={handleInputChange}
              className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs mb-1.5">Reward</label>
              <div className="relative">
                <input
                  type="number"
                  name="challengeReward"
                  placeholder="Enter challenge reward"
                  value={formData.challengeReward}
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
            <div>
              <label className="block text-xs mb-1.5">Description</label>
              <input
                type="text"
                name="challengeDescription"
                placeholder="Enter challenge description"
                value={formData.challengeDescription}
                onChange={handleInputChange}
                className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-xs mb-1.5">Launch Date</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={formatDate(formData.launchDate)}
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
            <div className="relative">
              <label className="block text-xs mb-1.5">Duration</label>
              <div className="relative">
                <input
                  type="text"
                  value={formatDuration()}
                  readOnly
                  className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 pr-10 text-white text-xs"
                />
                <Image
                  src="/time.png"
                  alt="Time"
                  width={20}
                  height={20}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  onClick={() => setShowTimePicker(!showTimePicker)}
                />
                {showTimePicker && (
                  <div className="absolute top-full left-0 mt-2 z-10">
                    <CustomTimePicker />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs mb-1.5">Participant</label>
              <select
                name="participantType"
                value={formData.participantType}
                onChange={(e) => handleParticipantSelection(e.target.value)}
                className="w-full h-12 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              >
                <option value="">Select participant type</option>
                {participantTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {renderParticipantField() && (
              <div>
                <label className="block text-xs mb-1.5">{formData.participantType}</label>
                {renderParticipantField()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs mb-1.5">Upload Challenge Image</label>
            <div className="h-32 bg-[#19191A] border border-dashed border-[#363638] rounded-md flex flex-col items-center justify-center p-6">
              {formData.imagePreview ? (
                <Image src={formData.imagePreview} alt="Preview" width={50} height={50} />
              ) : (
                <>
                  <Image src="/upload.png" alt="Upload" width={24} height={24} className="mb-2" />
                  <p className="text-xs text-gray-400">
                    Drop your image here or{" "}
                    <label className="text-orange-400 cursor-pointer">
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
            className="w-80 h-14 bg-white text-black rounded-md font-bold text-sm hover:bg-orange-400 mx-auto block disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateChallengeOverlay;