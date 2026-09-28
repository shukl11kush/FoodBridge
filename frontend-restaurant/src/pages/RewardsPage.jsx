import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { Award, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export const RewardsPage = () => {
  const { user } = useContext(AuthContext);
  const [rewards, setRewards] = useState(null);
  const restaurantId = user?.restaurant?.restaurant_id;

  useEffect(() => {
    if (restaurantId) {
      fetchRewards();
    }
  }, [restaurantId]);

  const fetchRewards = async () => {
    try {
      const res = await axios.get(`${API_URL}/restaurants/${restaurantId}/rewards`);
      setRewards(res.data);
    } catch (err) {
      console.error("Error fetching rewards", err);
    }
  };

  if (!rewards) {
    return <div className="p-8 text-center text-gray-500">Loading digital rewards dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Digital Rewards & Gamification</h1>
        <p className="text-sm text-gray-500">Earn points for every fulfilled surplus food donation</p>
      </div>

      {/* Rewards Overview Tile */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-8 text-white shadow-xl flex justify-between items-center">
        <div>
          <span className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Total Earned Balance</span>
          <h2 className="text-4xl font-extrabold mt-1">{rewards.total_reward_points} Points</h2>
          <p className="text-amber-100 text-sm mt-1">
            Completed {rewards.donations_completed} verified food donations to shelters.
          </p>
        </div>

        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
          <Award className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">From Donations</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{rewards.points_breakdown.from_donations} pts</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">Bonuses</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{rewards.points_breakdown.from_bonuses} pts</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs text-gray-500 font-semibold uppercase">Redeemed</span>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{rewards.points_breakdown.redeemed} pts</h3>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
        </div>
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Points Earned</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rewards.recent_transactions.map((tx) => (
              <tr key={tx.reward_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">#{tx.reward_id}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    {tx.transaction_type}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-amber-600">+{tx.points_earned} pts</td>
                <td className="px-6 py-4 text-xs">{new Date(tx.transaction_date).toLocaleString()}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{tx.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
