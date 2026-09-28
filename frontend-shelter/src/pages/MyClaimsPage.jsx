import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { HeartHandshake, MessageSquare, CheckCircle2, Clock, Utensils, Building2 } from 'lucide-react';
import { ChatDrawer } from '../components/ChatDrawer';

export const MyClaimsPage = () => {
  const { user } = useContext(AuthContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChatClaimId, setActiveChatClaimId] = useState(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/claims/my-claims`);
      setClaims(res.data);
    } catch (err) {
      console.error("Error fetching claims", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickup = async (claimId) => {
    if (!window.confirm("Confirm that food donation has been successfully picked up?")) return;
    try {
      await axios.put(`${API_URL}/claims/${claimId}/pickup`, { notes: "Received in good condition" });
      alert("Pickup confirmed! Restaurant earned digital reward points.");
      fetchClaims();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to complete pickup.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Claimed Food Donations</h1>
          <p className="text-sm text-gray-500">Coordinate pickup with restaurants before the 2.5-hour claim auto-reversion</p>
        </div>
        <button onClick={fetchClaims} className="text-xs text-sky-600 font-semibold hover:underline">
          Refresh Claims
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          Loading your claimed food donations...
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 space-y-3">
          <HeartHandshake className="w-12 h-12 text-sky-300 mx-auto" />
          <p className="text-base font-semibold text-gray-700">No active claims found.</p>
          <p className="text-xs text-gray-400">Visit the AI Matchmaker or Directory to claim surplus food from local restaurants!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {claims.map((c) => (
            <div
              key={c.claim_id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-lg">{c.food_name || "Food Donation"}</h3>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      c.claim_status === 'CLAIMED'
                        ? 'bg-blue-100 text-blue-800'
                        : c.claim_status === 'PICKED_UP'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {c.claim_status}
                  </span>
                </div>

                {c.restaurant_name && (
                  <p className="text-xs font-semibold text-sky-700 mb-3 flex items-center space-x-1">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>{c.restaurant_name}</span>
                  </p>
                )}

                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1.5 mb-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Claim ID:</span>
                    <span>#{c.claim_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Quantity:</span>
                    <span>{c.food_quantity} {c.quantity_unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Claimed At:</span>
                    <span>{new Date(c.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {c.claim_status === 'CLAIMED' && (
                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                      <span className="font-semibold text-amber-700 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pickup Timer:</span>
                      </span>
                      <span className="font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        {c.time_remaining_minutes} mins left
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {c.claim_status === 'CLAIMED' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setActiveChatClaimId(c.claim_id)}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Live Chat</span>
                  </button>

                  <button
                    onClick={() => handlePickup(c.claim_id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Picked Up</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ChatDrawer
        claimId={activeChatClaimId}
        isOpen={!!activeChatClaimId}
        onClose={() => setActiveChatClaimId(null)}
        senderType="SHELTER"
      />
    </div>
  );
};
