// src/components/SignIn.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/config/api";

interface SignInProps {
  onSignInSuccess: () => void;
}

interface SignInResponse {
  access_token: string;
  refresh_token: string;
  message?: string;
}

const SignIn: React.FC<SignInProps> = ({ onSignInSuccess }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          username: userId,
          password,
          scope: "",
          client_id: "string",
          client_secret: "string",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Invalid credentials");
      }

      const data: SignInResponse = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      setSuccessMessage(data.message || "Sign-in successful!");
      setShowSuccessOverlay(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred. Please try again.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessOverlayClose = () => {
    setShowSuccessOverlay(false);
    onSignInSuccess();
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#19191A] p-6 sm:p-8">
      <div className="w-full max-w-[600px] flex flex-col items-center rounded-lg bg-[#202022] p-8 text-white shadow-lg sm:p-10">
        {/* Logo and Title */}
        <div className="flex items-center gap-4 mb-8">
          <Image src="/logo.png" alt="Logo" width={60} height={60} className="sm:w-16 sm:h-16" />
          <h1 className="text-sm sm:text-base font-medium">BoredTap App</h1>
        </div>
        <h2 className="mb-8 text-2xl text-orange-400 font-bold sm:text-3xl">Welcome Admin!</h2>

        {/* Form */}
        <form onSubmit={handleSignIn} className="w-full space-y-6">
          <div>
            <label className="mb-2 block text-left text-sm sm:text-base">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="h-12 w-full rounded-lg border border-[#363638] bg-[#19191A] px-4 text-sm text-white placeholder:text-gray-500 sm:h-14 sm:text-base"
            />
          </div>
          <div>
            <label className="mb-2 block text-left text-sm sm:text-base">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 w-full rounded-lg border border-[#363638] bg-[#19191A] px-4 text-sm text-white placeholder:text-gray-500 sm:h-14 sm:text-base"
            />
          </div>
          {error && <p className="text-red-500 text-sm sm:text-base">{error}</p>}
          <button
            type="submit"
            className={`h-12 w-full rounded-lg bg-orange-400 text-sm font-semibold text-white hover:bg-orange-600 sm:h-14 sm:text-base ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Log In"}
          </button>
        </form>

        {/* Success Overlay */}
        {showSuccessOverlay && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-[#202022] rounded-lg p-8 text-white w-[400px] text-center">
              <Image
                src="/success.png"
                alt="Success Icon"
                width={100}
                height={100}
                className="mb-6 mx-auto"
              />
              <h2 className="text-3xl font-bold mb-6">Success</h2>
              <p className="text-base mb-8">{successMessage}</p>
              <button
                onClick={handleSuccessOverlayClose}
                className="w-full h-12 bg-[#0CAF60] text-base font-semibold text-white rounded-lg hover:bg-green-700 transition-colors"
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

export default SignIn;