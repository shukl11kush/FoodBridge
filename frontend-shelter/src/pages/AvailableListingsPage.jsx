import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { Search, MapPin, Clock, Utensils, MessageSquare, CheckCircle2 } from 'lucide-react';
import { ChatDrawer } from '../components/ChatDrawer';

export const AvailableListingsPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const shelterId = user?.shelter?.shelter_id;
  const [listings, setListings] = useState([]);
  const [cityFilter, setCityFilter] = useState('Kanpur');
  const [activeChatClaimId, setActiveChatClaimId] = useState(null);
  const [claimedClaimId, setClaimedClaimId] = useState(null);

  useEffect(() => {
    fetchListings();
  }, [cityFilter]);

  const fetchListings = async () => {
    try {
      const res = await axios.get(`${API_URL}/listings/available?city=${cityFilter}`);
      setListings(res.data.listings);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaim = async (listingId) => {
    try {
      const res = await axios.post(`${API_URL}/listings/${listingId}/claim`, { shelter_id: shelterId });
      const newClaimId = res.data.claim_id;
      setClaimedClaimId(newClaimId);
      setActiveChatClaimId(newClaimId);
      fetchListings();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to claim listing.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Food Donation Directory</h1>
          <p className="text-sm text-gray-500">Browse all live surplus food listings in your city</p>
        </div>

        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Search by city..."
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white"
          />
        </div>
      </div>

      {claimedClaimId && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Listing Claimed! (Claim #{claimedClaimId})</span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setActiveChatClaimId(claimedClaimId)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Chat</span>
            </button>
            <button
              onClick={() => navigate('/my-claims')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
            >
              View My Claims
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {listings.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            No un-claimed listings currently available in {cityFilter}.
          </div>
        ) : (
          listings.map((l) => (
            <div key={l.listing_id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">{l.food_name}</h3>
                <p className="text-xs text-sky-700 font-medium mb-3">{l.restaurant_name}</p>

                <div className="text-xs text-gray-600 space-y-1 mb-4">
                  <p><strong>Quantity:</strong> {l.food_quantity} {l.quantity_unit}</p>
                  <p><strong>Dietary:</strong> {l.dietary_info || 'Standard'}</p>
                  <p><strong>Deadline:</strong> {new Date(l.pickup_deadline).toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={() => handleClaim(l.listing_id)}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 rounded-xl text-sm transition"
              >
                Claim Listing
              </button>
            </div>
          ))
        )}
      </div>

      <ChatDrawer
        claimId={activeChatClaimId}
        isOpen={!!activeChatClaimId}
        onClose={() => setActiveChatClaimId(null)}
        senderType="SHELTER"
      />
    </div>
  );
};
