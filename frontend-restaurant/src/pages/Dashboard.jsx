import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { Utensils, Award, Clock, MessageSquare, PlusCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ChatDrawer } from '../components/ChatDrawer';

export const Dashboard = ({ onOpenCreateModal }) => {
  const { user, fetchProfile } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [claimsMap, setClaimsMap] = useState({});
  const [stats, setStats] = useState({ LISTED: 0, CLAIMED: 0, PICKED_UP: 0 });
  const [activeChatClaimId, setActiveChatClaimId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${API_URL}/listings/my-listings?limit=20`);
      setListings(res.data.listings);
      if (res.data.statuses_count) {
        setStats(res.data.statuses_count);
      }

      // Fetch claims to map claim_id to listings
      const claimsRes = await axios.get(`${API_URL}/claims/my-claims`);
      const map = {};
      claimsRes.data.forEach((c) => {
        map[c.listing_id] = c;
      });
      setClaimsMap(map);
    } catch (err) {
      console.error("Dashboard data load error", err);
    }
  };

  const handleCancel = async (listingId) => {
    if (!window.confirm("Are you sure you want to cancel this listing?")) return;
    try {
      await axios.put(`${API_URL}/listings/${listingId}/cancel`, { reason: "Cancelled by restaurant" });
      fetchDashboardData();
    } catch (err) {
      alert("Failed to cancel listing");
    }
  };

  const points = user?.restaurant?.total_reward_points || 0;
  const restName = user?.restaurant?.restaurant_name || "Restaurant Partner";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Restaurant Dashboard</span>
          <h1 className="text-3xl font-extrabold mt-1">{restName}</h1>
          <p className="text-emerald-100 text-sm mt-1">
            Transform surplus meals into community impact. Earn points on every verified pickup!
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="mt-4 md:mt-0 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold px-6 py-3 rounded-2xl shadow-lg flex items-center space-x-2 transition transform hover:-translate-y-0.5"
        >
          <PlusCircle className="w-5 h-5" />
          <span>New Surplus Donation</span>
        </button>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Active Listings</span>
            <h3 className="text-2xl font-bold text-gray-900">{stats.LISTED || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Claimed & Pending</span>
            <h3 className="text-2xl font-bold text-gray-900">{stats.CLAIMED || 0}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Digital Rewards</span>
            <h3 className="text-2xl font-bold text-amber-600">{points} pts</h3>
          </div>
        </div>
      </div>

      {/* Active Listings Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Live Surplus Listings</h2>
          <button onClick={fetchDashboardData} className="text-xs text-emerald-600 font-semibold hover:underline">
            Refresh Status
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Food Item</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Pickup Deadline</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No listings yet. Click "New Surplus Donation" to post your first listing!
                  </td>
                </tr>
              ) : (
                listings.map((item) => {
                  const claim = claimsMap[item.listing_id];
                  return (
                    <tr key={item.listing_id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {item.food_name}
                        {item.created_by_ai && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-medium">
                            AI Generated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.food_quantity} {item.quantity_unit}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(item.pickup_deadline).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'LISTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'CLAIMED'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'PICKED_UP'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        {item.status === 'CLAIMED' && claim && (
                          <button
                            onClick={() => setActiveChatClaimId(claim.claim_id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 inline-flex"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat with Shelter</span>
                          </button>
                        )}

                        {item.status === 'LISTED' && (
                          <button
                            onClick={() => handleCancel(item.listing_id)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Drawer Component */}
      <ChatDrawer
        claimId={activeChatClaimId}
        isOpen={!!activeChatClaimId}
        onClose={() => setActiveChatClaimId(null)}
        senderType="RESTAURANT"
      />
    </div>
  );
};
