"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api"; // Adjust path as needed

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

interface CreateBoosterOverlayProps {
  onClose: () => void;
  boostToEdit: BoostFormData | null;
  onSubmit: (boostData: BoostFormData) => Promise<void>;
}

const boosterLevels = Array.from({ length: 10 }, (_, i) => (i + 1).toString());

const CreateBoosterOverlay: React.FC<CreateBoosterOverlayProps> = ({ onClose, boostToEdit, onSubmit }) => {
  const [formData, setFormData] = useState<BoostFormData>({
    name: "",
    description: "",
    level: "",
    upgradeCost: "",
    effect: "",
    condition: "",
    image: null,
  });
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    if (boostToEdit) {
      setFormData(boostToEdit);
      setImagePreview(boostToEdit.image ? URL.createObjectURL(boostToEdit.image) : "");
    }
  }, [boostToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLevelSelection = (level: string) => {
    setFormData((prev) => ({ ...prev, level }));
    setShowLevelDropdown(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
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
      !formData.name ||
      !formData.description ||
      !formData.level ||
      !formData.upgradeCost ||
      !formData.effect ||
      !formData.condition
    ) {
      setError("All fields except image are required.");
      return;
    }
  
    if (isNaN(Number(formData.upgradeCost))) {
      setError("Upgrade cost must be a valid number.");
      return;
    }
  
    try {
      const queryParams = new URLSearchParams({
        name: formData.name,
        description: formData.description,
        level: formData.level,
        effect: formData.effect,
        upgrade_cost: formData.upgradeCost,
        condition: formData.condition,
      }).toString();
  
      const formDataToSend = new FormData();
      if (formData.image) {
        formDataToSend.append("image", formData.image);
      }
  
      const endpoint = boostToEdit ? "edit_extra_boost" : "create_extra_boost";
      const method = boostToEdit ? "PUT" : "POST";
      const url = boostToEdit
        ? `${API_BASE_URL}/admin/boost/${endpoint}?${queryParams}&extra_boost_id=${boostToEdit.id}`
        : `${API_BASE_URL}/admin/boost/${endpoint}?${queryParams}`;
  
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formDataToSend,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to submit booster (Status: ${response.status})`);
      }
  
      const result = await response.json();
  
      // Show success overlay and call parent onSubmit
      setShowSuccessOverlay(true);
      await onSubmit({
        ...formData,
        id: boostToEdit?.id || result.id, // Assuming the API returns the new booster ID
      });
    } catch (err) {
      setError((err as Error).message);
      console.error("Booster submission error:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="w-full max-w-lg bg-[#202022] rounded-lg p-6 text-[#f9b54c] max-h-[90vh] overflow-y-auto">
        <div className="relative text-center py-3">
          <h2 className="text-xl font-bold">{boostToEdit ? "Update Booster" : "Create Booster"}</h2>
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
            <label className="block text-xs mb-1.5">Booster Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter booster name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs mb-1.5">Booster Description</label>
              <input
                type="text"
                name="description"
                placeholder="Enter booster description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-xs mb-1.5">Booster Level</label>
              <div
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs flex items-center justify-between cursor-pointer"
                onClick={() => setShowLevelDropdown(!showLevelDropdown)}
              >
                {formData.level || "Select Level"}
                <span>▼</span>
              </div>
              {showLevelDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[#19191A] border border-[#363638] rounded-md shadow-lg z-10">
                  {boosterLevels.map((level) => (
                    <div
                      key={level}
                      className="px-3 py-2 text-white text-xs hover:bg-[#363638] cursor-pointer"
                      onClick={() => handleLevelSelection(level)}
                    >
                      Level {level}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-xs mb-1.5">Booster Upgrade Cost</label>
              <div className="relative">
                <input
                  type="number"
                  name="upgradeCost"
                  placeholder="Enter upgrade cost"
                  value={formData.upgradeCost}
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
            <div>
              <label className="block text-xs mb-1.5">Booster Effect</label>
              <input
                type="text"
                name="effect"
                placeholder="Enter booster effect (e.g., +5)"
                value={formData.effect}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5">Booster Condition</label>
            <input
              type="text"
              name="condition"
              placeholder="Enter booster condition"
              value={formData.condition}
              onChange={handleInputChange}
              className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5">Upload Booster Image</label>
            <div className="h-28 bg-[#19191A] border border-dashed border-[#363638] rounded-md flex flex-col items-center justify-center p-4">
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
              {imagePreview && (
                <div className="mt-2">
                  <Image
                    src={imagePreview}
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
            className="w-full h-11 bg-white text-black rounded-md font-bold text-sm hover:bg-[#f9b54c]"
          >
            Submit
          </button>
        </form>

        {showSuccessOverlay && (
          <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-6 text-white w-80 text-center">
              <Image src="/success.png" alt="Success" width={80} height={80} className="mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Successful</h2>
              <p className="text-xs mb-6">Your booster is successfully {boostToEdit ? "updated" : "created"}.</p>
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

export default CreateBoosterOverlay;