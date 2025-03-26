// src/app/dashboard/page.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import NavigationPanel from "@/components/NavigationPanel";
import AppBar from "@/components/AppBar";
import { Chart, registerables } from "chart.js";
import { DashboardData } from "@/types/DashboardData";
import { API_BASE_URL } from "@/config/api";

Chart.register(...registerables);

const Dashboard: React.FC = () => {
  const recentActivitiesChartRef = useRef<Chart | null>(null);
  const userLevelChartRef = useRef<Chart | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: { total_users: 0 },
    totalUsersPercentage: 0,
    newUsers: { total_new_users: 0 },
    newUsersPercentage: 0,
    totalCoinEarned: { overall_total_coins: 0 },
    totalCoinEarnedPercentage: 0,
    tokenDistributedPercentage: 0,
    totalCoinEarnedMonthly: [],
    totalUsersMonthly: [],
    userLevels: [],
    walletConnections: [],
    newUsersList: [],
    leaderboardList: [],
    recentCoinActivity: [],
    recentUserActivity: [],
  });

  const isTokenExpired = (token: string): boolean => {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  };

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken || "",
          client_id: "string",
          client_secret: "string",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        return data.access_token;
      } else {
        throw new Error("Failed to refresh token");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      router.push("/signin");
      return null;
    }
  }, [router]);

  const fetchData = useCallback(
    async (endpoint: string, key: keyof DashboardData) => {
      try {
        let token = localStorage.getItem("access_token");
        if (!token || isTokenExpired(token)) {
          token = await refreshToken();
          if (!token) return;
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Error fetching ${key}: ${response.statusText}`);
        const data = await response.json();
        console.log(`Fetched ${key}:`, data); // Debug log

        setDashboardData((prev) => {
          if (key === "totalUsers") {
            const percentage = parseFloat(data.percentage_increase) || 0;
            return { ...prev, totalUsers: { total_users: data.total_users }, totalUsersPercentage: percentage };
          } else if (key === "newUsers") {
            const percentage = parseFloat(data.percentage_increase) || 0;
            return { ...prev, newUsers: { total_new_users: data.total_new_users }, newUsersPercentage: percentage };
          } else if (key === "totalCoinEarned") {
            const percentage = parseFloat(data.percentage_increase) || 0;
            return { ...prev, totalCoinEarned: { overall_total_coins: data.overall_total_coins }, totalCoinEarnedPercentage: percentage };
          }
          return { ...prev, [key]: data };
        });
      } catch (error) {
        console.error(`Error fetching ${key}:`, error);
        router.push("/signin");
      }
    },
    [router, refreshToken]
  );

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const endpoints = [
      ["/admin/dashboard/overall_total_users", "totalUsers"],
      ["/admin/dashboard/total_new_users", "newUsers"],
      ["/admin/dashboard/overall_total_coins_earned", "totalCoinEarned"],
      ["/admin/dashboard/new_users", "newUsersList"],
      ["/admin/dashboard/leaderboard", "leaderboardList"],
      ["/admin/dashboard/coins/recent_activity", "recentCoinActivity"],
      ["/admin/dashboard/users/recent_activity", "recentUserActivity"],
      ["/admin/dashboard/levels/chart_data", "userLevels"],
    ];

    if (!token || isTokenExpired(token)) {
      refreshToken().then((newToken) => {
        if (newToken) endpoints.forEach(([url, key]) => fetchData(url, key as keyof DashboardData));
      });
    } else {
      endpoints.forEach(([url, key]) => fetchData(url, key as keyof DashboardData));
    }

    ws.current = new WebSocket("wss://bored-tap-api.onrender.com/ws");
    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setDashboardData((prev) => ({ ...prev, ...message }));
    };
    ws.current.onclose = () => console.log("WebSocket connection closed");

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [fetchData, refreshToken]);

  useEffect(() => {
    const coinActivity: { [key: string]: number } = typeof dashboardData.recentCoinActivity[0]?.data === 'object' ? dashboardData.recentCoinActivity[0].data : {};
    const userActivity: { [key: string]: number } = typeof dashboardData.recentUserActivity[0]?.data === 'object' ? dashboardData.recentUserActivity[0].data : {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const coinData = months.map((_, idx) => coinActivity[(idx + 1).toString()] || 0);
    const userData = months.map((_, idx) => userActivity[(idx + 1).toString()] || 0);

    const ctx = document.getElementById("recent-activities-graph") as HTMLCanvasElement;
    if (recentActivitiesChartRef.current) recentActivitiesChartRef.current.destroy();
    if (ctx) {
      recentActivitiesChartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            { label: "Total Coin Earned", data: coinData, borderColor: "#F28C38", borderWidth: 2, fill: false, tension: 0.1 },
            { label: "Total Users", data: userData, borderColor: "#0CAF60", borderWidth: 2, fill: false, tension: 0.1 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { title: { display: true, text: "Months" } }, y: { title: { display: true, text: "Count" }, beginAtZero: true } },
          plugins: { legend: { position: "top" } },
        },
      });
    }

    return () => {
      if (recentActivitiesChartRef.current) recentActivitiesChartRef.current.destroy();
    };
  }, [dashboardData.recentCoinActivity, dashboardData.recentUserActivity]);

  useEffect(() => {
    const userLevelData = dashboardData.userLevels.map((item) => item.total_users);
    const userLevelLabels = dashboardData.userLevels.map((item) => item.level_name);
    const userLevelCtx = document.getElementById("user-level-chart") as HTMLCanvasElement;

    if (userLevelChartRef.current) userLevelChartRef.current.destroy();
    if (userLevelCtx) {
      userLevelChartRef.current = new Chart(userLevelCtx, {
        type: "bar",
        data: {
          labels: userLevelLabels,
          datasets: [
            { label: "Number of Users", data: userLevelData, backgroundColor: "#79797A", borderColor: "#79797A", borderWidth: 1, borderRadius: 4, barPercentage: 0.3, categoryPercentage: 0.8 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { maxRotation: 45, minRotation: 45 } }, y: { beginAtZero: true } }, plugins: { legend: { display: false } } },
      });
    }

    return () => {
      if (userLevelChartRef.current) userLevelChartRef.current.destroy();
    };
  }, [dashboardData.userLevels]);

  return (
    <div className="flex min-h-screen w-full bg-[#19191A] text-white">
      <NavigationPanel />
      <div className="flex-1 flex flex-col">
        <AppBar screenName="Dashboard" />
        <div className="flex flex-1 w-full pt-24 pl-44 pr-4 lg:pl-52 lg:pr-55 md:pt-20 md:pl-6 md:pr-8 sm:pl-4 sm:pr-4 sm:pt-16">
          <div className="flex-1 py-6 min-w-0">
            <div className="mb-8">
              <h2 className="mb-4 text-sm text-orange-400 font-semibold sm:text-xs">Overview</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/20 bg-[#202022] p-4 h-36 flex flex-col justify-between transition-transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <Image src="/invite.png" alt="Total Users" width={28} height={28} />
                    <span className={`flex items-center text-xs ${dashboardData.totalUsersPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                      <Image src={dashboardData.totalUsersPercentage >= 0 ? "/ArrowRise.png" : "/ArrowFall.png"} alt="Change" width={16} height={16} />
                      {typeof dashboardData.totalUsersPercentage === "number" ? dashboardData.totalUsersPercentage.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold sm:text-xl">{dashboardData.totalUsers.total_users}</div>
                  <div className="text-sm text-orange-400 sm:text-xs">Total Users</div>
                </div>
                <div className="rounded-lg border border-white/20 bg-[#202022] p-4 h-36 flex flex-col justify-between transition-transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <Image src="/invite.png" alt="New Users" width={28} height={28} />
                    <span className={`flex items-center text-xs ${dashboardData.newUsersPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                      <Image src={dashboardData.newUsersPercentage >= 0 ? "/ArrowRise.png" : "/ArrowFall.png"} alt="Change" width={16} height={16} />
                      {typeof dashboardData.newUsersPercentage === "number" ? dashboardData.newUsersPercentage.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold sm:text-xl">{dashboardData.newUsers.total_new_users}</div>
                  <div className="text-sm text-orange-400 sm:text-xs">Total New Users</div>
                </div>
                <div className="rounded-lg border border-white/20 bg-[#202022] p-4 h-36 flex flex-col justify-between transition-transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <Image src="/logo.png" alt="Total Coin Earned" width={28} height={28} />
                    <span className={`flex items-center text-xs ${dashboardData.totalCoinEarnedPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                      <Image src={dashboardData.totalCoinEarnedPercentage >= 0 ? "/ArrowRise.png" : "/ArrowFall.png"} alt="Change" width={16} height={16} />
                      {typeof dashboardData.totalCoinEarnedPercentage === "number" ? dashboardData.totalCoinEarnedPercentage.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold sm:text-xl">{dashboardData.totalCoinEarned.overall_total_coins}</div>
                  <div className="text-sm text-orange-400 sm:text-xs">Total Coin Earned</div>
                </div>
                <div className="rounded-lg border border-white/20 bg-[#202022] p-4 h-36 flex flex-col justify-between transition-transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <Image src="/logo.png" alt="Token Distributed" width={28} height={28} />
                    <span className="flex items-center text-xs text-green-500">
                      <Image src="/ArrowRise.png" alt="Increment" width={16} height={16} />
                      {typeof dashboardData.tokenDistributedPercentage === "number" ? dashboardData.tokenDistributedPercentage.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold sm:text-xl">0</div>
                  <div className="text-sm text-orange-400 sm:text-xs">Token Distributed</div>
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-lg border border-white/20 bg-[#202022] p-6">
              <h2 className="mb-4 text-sm text-orange-400 font-semibold sm:text-xs">Recent Activities</h2>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div className="flex gap-3">
                  <span className="border-b-2 border-orange-400 pb-1 text-sm font-semibold sm:text-xs">Total Coin Earned</span>
                  <span className="text-gray-500 text-sm sm:text-xs">|</span>
                  <span className="text-gray-500 text-sm sm:text-xs">Total Users</span>
                </div>
                <div className="flex gap-3">
                  <span className="border-b-2 border-orange-400 pb-1 text-sm font-semibold sm:text-xs">This Year</span>
                  <span className="text-gray-500 text-sm sm:text-xs">|</span>
                  <span className="text-gray-500 text-sm sm:text-xs">Last Year</span>
                </div>
              </div>
              <div className="h-80 sm:h-96"><canvas id="recent-activities-graph" /></div>
            </div>

            <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
              <div className="flex-1 rounded-lg border border-white/20 bg-[#202022] p-6 h-80">
                <h2 className="mb-4 text-sm text-orange-400 font-semibold sm:text-xs">User Level</h2>
                <div className="h-64"><canvas id="user-level-chart" /></div>
              </div>
              <div className="flex-1 rounded-lg border border-white/20 bg-[#202022] p-6 h-80">
                <h2 className="mb-4 text-sm text-orange-400 font-semibold sm:text-xs">Wallet Connection</h2>
                <div className="h-64 flex items-center justify-center">
                  <span className="text-sm sm:text-xs">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block fixed top-32 right-4 w-48 h-[calc(100vh-8rem)]">
            <div className="rounded-lg bg-[#202022] p-3 pt-4 overflow-y-auto h-full border border-white/20">
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs text-orange-400 font-semibold">New Users</h3>
                  <div className="flex items-center gap-1 text-xs text-white cursor-pointer hover:text-orange-400" onClick={() => router.push("/users")}>
                    <span>See all</span>
                    <Image src="/front-arrow.png" alt="See all" width={10} height={10} />
                  </div>
                </div>
                <div className="rounded-lg bg-[#333] p-2">
                  <ul className="list-none p-0 m-0">
                    {dashboardData.newUsersList.slice(0, 10).map((user, index) => (
                      <li key={index} className="mb-2 flex items-center gap-2">
                        <Image src={user.image_url || "/default-profile.png"} alt="Profile" width={20} height={20} className="rounded-full" />
                        <span className="text-xs truncate">{user.username}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs text-orange-400 font-semibold">Leaderboard</h3>
                  <div className="flex items-center gap-1 text-xs text-white cursor-pointer hover:text-orange-400" onClick={() => router.push("/leaderboard")}>
                    <span>See all</span>
                    <Image src="/front-arrow.png" alt="See all" width={10} height={10} />
                  </div>
                </div>
                <div className="rounded-lg bg-[#333] p-2">
                  <ul className="list-none p-0 m-0">
                    {dashboardData.leaderboardList.slice(0, 10).map((leader, index) => (
                      <li key={index} className="mb-2 flex items-center gap-2">
                        <Image src={leader.image_url || "/profile-picture.png"} alt="Profile" width={20} height={20} className="rounded-full" />
                        <span className="text-xs truncate">{leader.username}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;