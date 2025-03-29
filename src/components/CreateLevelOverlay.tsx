"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/config/api";

interface LevelFormData {
  id?: string;
  name: string;
  requirement: string;
  level: string;
  badgeImage: File | null;
}

interface CreateLevelOverlayProps {
  onClose: () => void;
  levelToEdit?: LevelFormData | null;
  onSubmit: (levelData: LevelFormData & { id: string }) => Promise<void>;
}

const CreateLevelOverlay: React.FC<CreateLevelOverlayProps> = ({ onClose, levelToEdit, onSubmit }) => {
  const [formData, setFormData] = useState<LevelFormData>({
    name: "",
    requirement: "",
    level: "",
    badgeImage: null,
  });
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
    if (levelToEdit) {
      setFormData({
        name: levelToEdit.name || "",
        requirement: levelToEdit.requirement || "",
        level: levelToEdit.level || "",
        badgeImage: null, // New image upload, existing badge not shown unless provided
      });
      setImagePreview(levelToEdit.badgeImage ? URL.createObjectURL(levelToEdit.badgeImage) : "");
    }
  }, [levelToEdit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, badgeImage: file }));
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
    if (!formData.name.trim()) {
      setError("Please enter a level name.");
      return;
    }
    if (!formData.requirement || isNaN(Number(formData.requirement))) {
      setError("Please enter a valid numeric level requirement.");
      return;
    }
    if (!formData.level || isNaN(Number(formData.level))) {
      setError("Please enter a valid numeric level value.");
      return;
    }
    if (!formData.badgeImage && !levelToEdit) {
      setError("Please upload a badge image for the level.");
      return;
    }

    try {
      const queryParams = new URLSearchParams({
        name: encodeURIComponent(formData.name),
        level: formData.level,
        requirement: formData.requirement,
      }).toString();

      const formDataToSend = new FormData();
      if (formData.badgeImage) {
        formDataToSend.append("badge", formData.badgeImage);
      }

      const endpoint = levelToEdit ? "update_level" : "create_level";
      const method = levelToEdit ? "PUT" : "POST";
      const url = levelToEdit
        ? `${API_BASE_URL}/admin/levels/${endpoint}?${queryParams}&level_id=${levelToEdit.id}`
        : `${API_BASE_URL}/admin/levels/${endpoint}?${queryParams}`;

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
        throw new Error(errorData.message || `Failed to submit level (Status: ${response.status})`);
      }

      const result = await response.json();
      const newLevel: LevelFormData & { id: string } = {
        id: levelToEdit?.id || result.id,
        name: decodeURIComponent(result.name || formData.name),
        level: result.level || formData.level,
        requirement: result.requirement || formData.requirement,
        badgeImage: formData.badgeImage,
      };

      setShowSuccessOverlay(true);
      await onSubmit(newLevel);
    } catch (err) {
      setError((err as Error).message);
      console.error("Level submission error:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="w-full max-w-lg bg-[#202022] rounded-lg p-6 text-[#f9b54c] max-h-[90vh] overflow-y-auto">
        <div className="relative text-center py-3">
          <h2 className="text-xl font-bold">{levelToEdit ? "Update Level" : "Create Level"}</h2>
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
            <label className="block text-xs mb-1.5">Level Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter level name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label className="block text-xs mb-1.5">Level Requirement</label>
              <div className="relative">
                <input
                  type="number"
                  name="requirement"
                  placeholder="Enter requirement (e.g., coins)"
                  value={formData.requirement}
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
              <label className="block text-xs mb-1.5">Level</label>
              <input
                type="number"
                name="level"
                placeholder="Enter level (e.g., 1)"
                value={formData.level}
                onChange={handleInputChange}
                className="w-full h-10 bg-[#19191A] border border-[#363638] rounded-md px-3 text-white text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5">Upload Level Badge</label>
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
              <p className="text-xs mb-6">
                Your level is successfully {levelToEdit ? "updated" : "created"}.
              </p>
              <button
                className="w-full bg-black text-white py-2 rounded-md hover:bg-green-600 mb-4"
                onClick={() => {
                  setShowSuccessOverlay(false);
                  onClose();
                }}
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

export default CreateLevelOverlay;