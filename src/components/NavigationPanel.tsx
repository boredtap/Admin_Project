// File Path: src/components/NavigationPanel.tsx

"use client";

import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

interface MenuItem {
  name: string;
  icon: string;
  path: string;
}

const NavigationPanel: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    { name: "Dashboard", icon: "/logo.png", path: "/dashboard" },
    { name: "Tasks", icon: "/task.png", path: "/tasks" },
    { name: "Rewards", icon: "/reward.png", path: "/rewards" },
    { name: "Challenges", icon: "/challenge.png", path: "/challenges" },
    { name: "Clans", icon: "/clan.png", path: "/clans" },
    { name: "Leaderboard", icon: "/leaderboard12-icon.png", path: "/leaderboard" },
    { name: "Boosts", icon: "/boostx2.png", path: "/boosts" },
    { name: "Levels", icon: "/level.png", path: "/levels" },
    { name: "Users Mgt", icon: "/user management.png", path: "/users" },
    // { name: "Security", icon: "/security.png", path: "/security" },
  ];

  return (
    <div className="w-38 lg:w-48 h-screen bg-[#202022] text-white flex flex-col pt-5 fixed overflow-y-auto">
      <div className="flex items-center justify-start px-4 mb-10">
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="mr-2"
        />
        <span className="text-lg font-bold">BoredTap</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-start space-y-2">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center px-4 py-3 w-full cursor-pointer transition-colors relative ${
                pathname === item.path ? "text-[#f9b54c] bg-gray-700" : "hover:bg-gray-700"
              }`}
              onClick={() => router.push(item.path)}
            >
              {pathname === item.path && (
                <div className="absolute left-0 h-full w-1 bg-[#f9b54c] rounded-r-md"></div>
              )}
              <Image
                src={item.icon}
                alt={item.name}
                width={20}
                height={20}
                className="mr-3"
              />
              <span className="text-xs">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavigationPanel;
