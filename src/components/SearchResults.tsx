"use client";

import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import Link from "next/link";

interface GenericItem {
  [key: string]: unknown;
}

// Updated SearchResponse interface to match backend format
interface SearchResponse {
  [category: string]: GenericItem;  // Changed to a single item per category
}

interface SearchResultsProps {
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query }) => {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchSearchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        console.log("Access token:", token);
        if (!token) throw new Error("No authentication token found");

        const encodedQuery = encodeURIComponent(query.trim());
        const url = `${API_BASE_URL}/admin/dashboard/search?query=${encodedQuery}`;
        console.log("Fetching from URL:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        console.log("Response status:", response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.log("Error response text:", errorText);
          throw new Error(`Search failed: ${response.status} - ${errorText}`);
        }

        // Process the API response to match the SearchResponse interface
        const data = await response.json();
        console.log("Original API Response:", JSON.stringify(data, null, 2));

        const processedResults: SearchResponse = {};
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((item) => {
            const category = Object.keys(item)[0]; // Extract category name ("user_1", etc.)
            processedResults[category] = item[category]; // Assign the item to its category
          });
        }

        console.log("Processed Results:", JSON.stringify(processedResults, null, 2));
        setResults(processedResults);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (query.trim()) {
      fetchSearchResults();
    } else {
      setResults(null);
      setError(null);
    }
  }, [query]);

  const highlightMatch = (text: string, query: string) => {
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="text-[#f9b54c] font-bold">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const getDisplayName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      users: "Leaderboard",
      user_management: "User Mgt",
      clans: "Clan",
      tasks: "Tasks",
      rewards: "Rewards",
      challenges: "Challenges",
      levels: "Levels",
    };
    // Updated to handle the category names from the backend (e.g., "user_1")
    return categoryMap[category] || "User";
  };

  const getRelevantDetails = (item: GenericItem, category: string) => {
    console.log("getRelevantDetails - Category:", category, "Item:", item);
    // Adjusted to use properties directly from the item
    return (
      <>
        <span className="text-gray-400">
          {typeof item.coins_earned === "number"
            ? item.coins_earned.toLocaleString()
            : "N/A"}
        </span>
        <span className="text-gray-400 mx-2">•</span>
        <span className="text-gray-400">
          {typeof item.registration_date === "string" &&
            !isNaN(Date.parse(item.registration_date))
            ? new Date(item.registration_date).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            : "N/A"}
        </span>
        <span className="text-gray-400 mx-2">•</span>
        <span className="text-[#f9b54c]">
          {typeof item.level_name === "string" ? item.level_name : "N/A"}
        </span>
      </>
    );
  };

  const getHighlightField = (item: GenericItem) => {
    const field = item.username || item.name || Object.values(item)[0]?.toString() || "";
    console.log("Highlight field for item:", item, "Field:", field);
    return field;
  };

  const getViewLink = (item: GenericItem, category: string) => {
    switch (category) {
      case "users":
      case "user_management":
        return `/dashboard/users/${item.telegram_user_id || item.id}`;
      case "clans":
        return `/dashboard/clans/${item.id}`;
      default:
        return "#";
    }
  };

  return (
    <div className="fixed top-28 left-44 right-4 bottom-0 bg-[#202022] z-40 text-white overflow-y-auto lg:left-52 lg:right-2 sm:left-36 sm:right-4 xs:left-0 xs:right-4">
      <div className="p-8 md:p-6 sm:p-4">
        <h2 className="text-2xl font-bold text-[#f9b54c] mb-6">
          Search Results for: {query}
        </h2>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {error && <p className="text-sm text-red-500">Error: {error}</p>}

        {!loading && !error && results && Object.keys(results).length > 0 ? (  // Check if results has data
          Object.entries(results).map(([category, item]) => {  // Changed items to item
            console.log(`Category: ${category}, Item:`, item);  // Log item instead of items
            return (
              item && (  // Check if item exists
                <div key={category} className="mb-6">
                  <div
                    className="flex items-center justify-between py-2 border-b border-[#363638]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-400 min-w-[100px]">
                        {getDisplayName(category)}
                      </span>
                      <span className="text-sm">
                        {highlightMatch(String(getHighlightField(item)), query)}
                      </span>
                      {getRelevantDetails(item, category)}
                    </div>
                    <Link
                      href={getViewLink(item, category)}
                      className="text-sm text-[#f9b54c] hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            );
          })
        ) : (
          !loading && !error && <p className="text-sm text-gray-400">No results found for: {query}</p>
        )}
      </div>
    </div>
  );
};

export default SearchResults;