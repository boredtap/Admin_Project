// src/app/onboarding/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import SignIn from "@/components/SignIn";

const Onboarding = () => {
  const [loading, setLoading] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setShowSignIn(true);
    }, 2000); // Simulate loading for 2 seconds
    return () => clearTimeout(timer);
  }, []);

  const handleSignInSuccess = () => {
    setShowSignIn(false);
    setShowSuccessOverlay(true);
  };

  const handleSuccessOverlayClose = () => {
    setShowSuccessOverlay(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#19191A] p-6 sm:p-8">
      {loading && (
        <div className="flex w-full max-w-[600px] flex-col items-center justify-center text-center">
          <Image src="/logo.png" alt="Logo" width={300} height={300} className="sm:w-80 sm:h-80" />
          <h1 className="mt-8 text-4xl text-white font-bold sm:text-3xl">BoredTap App</h1>
          <div className="mt-6 h-4 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-0 animate-[load_2s_linear_infinite] bg-orange-400" />
          </div>
        </div>
      )}
      {showSignIn && <SignIn onSignInSuccess={handleSignInSuccess} />}
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
            <p className="text-base mb-8">Welcome to BoredTap Admin!</p>
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
  );
};

export default Onboarding;