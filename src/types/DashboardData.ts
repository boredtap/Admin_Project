// src/types/DashboardData.ts
export interface DashboardData {
    totalUsers: { total_users: number };
    totalUsersPercentage: number;
    newUsers: { total_new_users: number };
    newUsersPercentage: number;
    totalCoinEarned: { overall_total_coins: number };
    totalCoinEarnedPercentage: number;
    tokenDistributedPercentage: number;
    totalCoinEarnedMonthly: { month: string; amount: number }[]; // Assuming monthly coin data
    totalUsersMonthly: { month: string; count: number }[]; // Assuming monthly user data
    userLevels: { level_name: string; total_users: number }[];
    walletConnections: { status: string; count: number }[]; // Placeholder, adjust as needed
    newUsersList: { username: string; image_url: string }[];
    leaderboardList: { username: string; image_url: string }[];
    recentCoinActivity: { data: number }[];
    recentUserActivity: { data: number }[];
  }