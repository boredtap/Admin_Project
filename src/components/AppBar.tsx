"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import SearchResults from "./SearchResults";

interface AppBarProps {
  screenName: string;
  isDashboard?: boolean;
}

const AppBar: React.FC<AppBarProps> = ({ screenName, isDashboard = false }) => {
  const currentDate = new Date();
  const time = currentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showResults, setShowResults] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(query.trim().length > 0);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSearchQuery("");
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowResults(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  return (
    <>
      <div
        className={`fixed top-0 left-44 right-4 z-[${
          isDashboard ? "1000" : "10"
        }] h-28 bg-[#202022] text-white rounded-b-lg shadow-lg flex items-center justify-between py-5 px-8 lg:left-52 lg:right-2 md:h-24 md:px-6 sm:h-20 sm:left-36 sm:right-4 xs:left-0 xs:right-4 xs:px-4`}
      >
        {/* Left Section: Screen Name and Time/Date */}
        <div className="flex items-center gap-120 md:gap-40 min-w-0">
          <span className="text-2xl font-bold text-[#f9b54c] whitespace-nowrap lg:text-xl sm:text-lg truncate">
            {screenName}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-3xl font-bold lg:text-2xl sm:text-xl">{time}</span>
            <span className="text-sm text-gray-400 lg:text-xs truncate">{date}</span>
          </div>
        </div>

        {/* Right Section: Search Bar, Notification, and Profile */}
        <div className="flex items-center gap-8 sm:gap-4 min-w-0" ref={searchRef}>
          <div className="flex h-[54px] w-[350px] items-center gap-3 rounded-lg bg-[#19191A] p-4 sm:h-10 sm:w-[250px] sm:p-2 xs:w-[150px] max-w-full">
            <Image
              src="/search.png"
              alt="Search"
              width={20}
              height={20}
              className="sm:h-4 sm:w-4 flex-shrink-0"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent text-sm text-white outline-none sm:text-xs truncate"
            />
          </div>
          <Image
            src="/notification.png"
            alt="Notification"
            width={24}
            height={24}
            className="sm:h-5 sm:w-5 flex-shrink-0"
          />
          <div className="flex items-center min-w-0">
            <Image
              src="/profile-picture.png"
              alt="Profile"
              width={50}
              height={50}
              className="mr-2.5 rounded-full sm:h-8 sm:w-8 flex-shrink-0"
            />
            <div className="flex flex-col text-left min-w-0">
              <span className="text-base font-bold sm:text-sm truncate">Israel A.</span>
              <span className="text-xs text-[#f9b54c] sm:text-[10px] truncate">Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conditionally render SearchResults */}
      {showResults && <SearchResults query={searchQuery} />}
    </>
  );
};

export default AppBar;