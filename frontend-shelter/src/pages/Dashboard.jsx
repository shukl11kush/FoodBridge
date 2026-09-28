import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, MapPin, Clock, Utensils, CheckCircle2, AlertCircle, Filter, MessageSquare, HeartHandshake, RotateCcw } from 'lucide-react';
import { MatchScoreBadge } from '../components/MatchScoreBadge';
import { ChatDrawer } from '../components/ChatDrawer';

const DEFAULT_QUERY = {
  quantity_needed: 50,
  quantity_unit: 'PORTIONS',
  food_preferences: ['VEGETARIAN'],
  allergen_exclusions: [],
  max_distance_km: 10.0,
  max_wait_time_minutes: 180
};

export const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const shelterId = user?.shelter?.shelter_id;
  const shelterName = user?.shelter?.shelter_name || "Community Shelter";

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimedClaimId, setClaimedClaimId] = useState(null);
  const [activeChatClaimId, setActiveChatClaimId] = useState(null);

  // AI Matchmaker Query state
  const [query, setQuery] = useState(DEFAULT_QUERY);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async (overrideQuery) => {
    setLoading(true);
    setClaimedClaimId(null);
    const targetQuery = overrideQuery || query;
    try {
      const res = await axios.post(`${API_URL}/listings/search-matches`, targetQuery);
      setMatches(res.data.results);
    } catch (err) {
      console.error("Error fetching AI matches", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    const resetState = {
      quantity_needed: 10,
      quantity_unit: 'PORTIONS',
      food_preferences: [],
      allergen_exclusions: [],
      max_distance_km: 25.0,
      max_wait_time_minutes: 360
    };
    setQuery(resetState);
    fetchMatches(resetState);
  };

  const handleClaim = async (listingId) => {
    try {
      const res = await axios.post(`${API_URL}/listings/${listingId}/claim`, { shelter_id: shelterId });
      const newClaimId = res.data.claim_id;
      setClaimedClaimId(newClaimId);
      // Automatically open the Live Chat Drawer immediately!
      setActiveChatClaimId(newClaimId);
      fetchMatches();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to claim listing.");
    }
  };

  const togglePreference = (pref) => {
    const exists = query.food_preferences.includes(pref);
    setQuery({
      ...query,
      food_preferences: exists
        ? query.food_preferences.filter((p) => p !== pref)
        : [...query.food_preferences, pref]
    });
  };

  const toggleAllergen = (allg) => {
    const exists = query.allergen_exclusions.includes(allg);
    setQuery({
      ...query,
      allergen_exclusions: exists
        ? query.allergen_exclusions.filter((a) => a !== allg)
        : [...query.allergen_exclusions, allg]
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <span className="text-sky-200 text-xs font-semibold uppercase tracking-wider">Shelter & NGO Portal</span>
        <h1 className="text-3xl font-extrabold mt-1">{shelterName}</h1>
        <p className="text-sky-100 text-sm mt-1 max-w-2xl">
          FoodBridge AI evaluates restaurant surplus food against your shelter's beneficiary count, location proximity, and dietary needs.
        </p>
      </div>

      {claimedClaimId && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-base">Listing Claimed Successfully! (Claim #{claimedClaimId})</p>
              <p className="text-xs text-emerald-700">The listing has moved to <strong>My Claims</strong>. You can now chat in real-time with the restaurant to arrange pickup!</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setActiveChatClaimId(claimedClaimId)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Live Chat</span>
            </button>

            <button
              onClick={() => navigate('/my-claims')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-sm"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>View My Claims</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Matchmaker Filter Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-base">
            <Filter className="w-5 h-5 text-sky-600" />
            <span>AI Matchmaking Criteria</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-gray-500 hover:text-sky-700 flex items-center space-x-1 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Portions Needed</label>
            <input
              type="number"
              min="1"
              value={query.quantity_needed}
              onChange={(e) => setQuery({ ...query, quantity_needed: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Max Distance (km)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={query.max_distance_km}
              onChange={(e) => setQuery({ ...query, max_distance_km: parseFloat(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Max Wait Time (mins)</label>
            <input
              type="number"
              min="15"
              step="15"
              value={query.max_wait_time_minutes}
              onChange={(e) => setQuery({ ...query, max_wait_time_minutes: parseInt(e.target.value) || 60 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => fetchMatches()}
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'Calculating Matches...' : 'Run AI Match'}</span>
            </button>
          </div>
        </div>

        {/* Dietary and Allergen Toggles */}
        <div className="pt-2 flex flex-wrap gap-4 text-xs">
          <div>
            <span className="font-semibold text-gray-700 mr-2">Preferences:</span>
            {['VEGETARIAN', 'VEGAN', 'NON-VEGETARIAN'].map((pref) => {
              const active = query.food_preferences.includes(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => togglePreference(pref)}
                  className={`mr-1.5 px-2.5 py-1 rounded-full border transition ${
                    active
                      ? 'bg-sky-100 text-sky-800 border-sky-400 font-semibold'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {pref}
                </button>
              );
            })}
          </div>

          <div>
            <span className="font-semibold text-gray-700 mr-2">Exclude Allergens:</span>
            {['PEANUTS', 'DAIRY', 'GLUTEN'].map((allg) => {
              const active = query.allergen_exclusions.includes(allg);
              return (
                <button
                  key={allg}
                  type="button"
                  onClick={() => toggleAllergen(allg)}
                  className={`mr-1.5 px-2.5 py-1 rounded-full border transition ${
                    active
                      ? 'bg-rose-100 text-rose-800 border-rose-400 font-semibold'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  No {allg}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Ranked Recommendations */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <span>AI Ranked Food Recommendations</span>
            <span className="text-xs bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full font-medium">
              {matches.length} Available
            </span>
          </h2>
        </div>

        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 space-y-3">
            <p>No un-claimed matching food listings found for your current criteria.</p>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-sky-600 hover:underline inline-flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters to See All Donations</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((item) => (
              <div
                key={item.listing_id}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{item.food_name}</h3>
                    <MatchScoreBadge
                      matchScore={item.match_score}
                      breakdown={item.score_breakdown}
                    />
                  </div>

                  <p className="text-sm font-medium text-sky-700 mb-3 flex items-center space-x-1">
                    <Utensils className="w-4 h-4" />
                    <span>{item.restaurant_name}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mb-4">
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold">Quantity:</span>
                      <span>{item.food_quantity} {item.quantity_unit}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{item.distance_km} km away</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className="font-semibold">Dietary:</span>
                      <span>{item.dietary_info || 'Standard'}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Until {new Date(item.pickup_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleClaim(item.listing_id)}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm"
                >
                  Claim This Donation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Chat Drawer */}
      <ChatDrawer
        claimId={activeChatClaimId}
        isOpen={!!activeChatClaimId}
        onClose={() => setActiveChatClaimId(null)}
        senderType="SHELTER"
      />
    </div>
  );
};
