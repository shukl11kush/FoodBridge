import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { AuthContext } from '../context/AuthContext';
import { ListFilter, PlusCircle, RefreshCw, Utensils } from 'lucide-react';

export const MyListingsPage = ({ onOpenCreateModal }) => {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchListings();
  }, [filterStatus]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const url = filterStatus
        ? `${API_URL}/listings/my-listings?limit=100&status=${filterStatus}`
        : `${API_URL}/listings/my-listings?limit=100`;
      const res = await axios.get(url);
      setListings(res.data.listings || []);
    } catch (err) {
      console.error("Error fetching restaurant listings:", err);
    } finally {
      setLoading(false);
    }
  };

  const restName = user?.restaurant?.restaurant_name || "Restaurant Partner";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donation History & Listings</h1>
          <p className="text-sm text-gray-500">
            Viewing listings for <span className="font-semibold text-emerald-700">{restName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white px-3 py-2 border border-gray-300 rounded-xl">
            <ListFilter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-transparent outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="LISTED">LISTED</option>
              <option value="CLAIMED">CLAIMED</option>
              <option value="PICKED_UP">PICKED_UP</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <button
            onClick={fetchListings}
            className="p-2 border border-gray-300 rounded-xl hover:bg-gray-100 text-gray-600 transition"
            title="Refresh Listings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-xl flex items-center space-x-2 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Surplus Donation</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading listings...</div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-4 bg-emerald-50 text-emerald-600 rounded-full">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No Listings Found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {filterStatus
                ? `No listings with status "${filterStatus}" for ${restName}.`
                : `${restName} hasn't posted any surplus food listings yet.`}
            </p>
            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl inline-flex items-center space-x-2 transition shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Surplus Listing Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Food Item</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Dietary Info</th>
                  <th className="px-6 py-4">Ready Time</th>
                  <th className="px-6 py-4">Pickup Deadline</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.map((l) => (
                  <tr key={l.listing_id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {l.food_name}
                      {l.created_by_ai && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-medium">
                          AI Generated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{l.food_quantity} {l.quantity_unit}</td>
                    <td className="px-6 py-4">{l.dietary_info || 'Standard'}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(l.ready_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(l.pickup_deadline).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          l.status === 'LISTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'CLAIMED'
                            ? 'bg-blue-100 text-blue-800'
                            : l.status === 'PICKED_UP'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
