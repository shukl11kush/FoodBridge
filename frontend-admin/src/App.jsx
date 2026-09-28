import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from './config';
import { ShieldCheck, Utensils, Building2, Award, Clock, Activity, RefreshCw, Trash2 } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminMsg, setAdminMsg] = useState('');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchDashboard();
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data.user_type !== 'ADMIN') {
        throw new Error("Admin access required.");
      }
      const jwt = res.data.access_token;
      localStorage.setItem('admin_token', jwt);
      axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
      setToken(jwt);
      const dashRes = await axios.get(`${API_URL}/admin/dashboard`);
      setDashboard(dashRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_token');
        setToken('');
      }
    }
  };

  const handleTriggerRevert = async () => {
    try {
      const res = await axios.post(`${API_URL}/admin/trigger-revert-job`);
      setAdminMsg(`Revert Job Completed: ${res.data.reverted_claims} claims reverted.`);
      fetchDashboard();
    } catch (err) {
      alert("Failed to trigger revert job.");
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("ARE YOU SURE? This will purge all test listings, claims, chat messages, and reset reward points.")) return;
    try {
      const res = await axios.post(`${API_URL}/admin/reset-database`);
      setAdminMsg(res.data.message);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reset database.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    setDashboard(null);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-purple-100 rounded-full text-purple-700 mb-3">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FoodBridge Admin Portal</h1>
            <p className="text-sm text-gray-500 mt-1">Read-only platform metrics & operational controls</p>
          </div>

          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-xl">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@foodbridge.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 rounded-xl text-sm transition"
            >
              {loading ? 'Authenticating...' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="p-8 text-center text-gray-500">Loading admin dashboard...</div>;
  }

  const { metrics, listings_by_status, top_donors, restaurants = [], shelters = [] } = dashboard;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-purple-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-7 h-7 text-purple-200" />
            <span className="font-bold text-xl">FoodBridge <span className="text-xs bg-purple-900 px-2 py-0.5 rounded-full uppercase">Admin Ops</span></span>
          </div>
          <button onClick={handleLogout} className="text-xs text-purple-200 hover:text-white font-semibold">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Platform System Metrics</h1>
            <p className="text-xs text-gray-500">Real-time overview of active listings, shelters, and fulfillment success</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleTriggerRevert}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Trigger 2.5h Auto-Revert</span>
            </button>

            <button
              onClick={handleResetDatabase}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset System Database</span>
            </button>
          </div>
        </div>

        {adminMsg && (
          <div className="p-4 bg-purple-50 border border-purple-200 text-purple-800 rounded-2xl text-xs font-semibold">
            {adminMsg}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 uppercase font-semibold">Restaurants</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-1">{metrics.total_restaurants}</h2>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 uppercase font-semibold">Shelters / NGOs</span>
            <h2 className="text-3xl font-extrabold text-gray-900 mt-1">{metrics.total_shelters}</h2>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 uppercase font-semibold">Active Listings</span>
            <h2 className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.active_listings}</h2>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 uppercase font-semibold">Pickup Success Rate</span>
            <h2 className="text-3xl font-extrabold text-purple-700 mt-1">{(metrics.pickup_success_rate * 100).toFixed(0)}%</h2>
          </div>
        </div>

        {/* Status Distribution & Top Donors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Listings Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Listings Status Breakdown</h3>
            <div className="space-y-3 text-sm">
              {Object.entries(listings_by_status).map(([st, count]) => (
                <div key={st} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                  <span className="font-semibold text-gray-700">{st}</span>
                  <span className="px-3 py-1 bg-white rounded-full font-bold border border-gray-200 text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Donors Leaderboard */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Top Donor Leaderboard</h3>
            <div className="space-y-3 text-sm">
              {top_donors.map((d, idx) => (
                <div key={d.restaurant_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-purple-700 text-white font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{d.restaurant_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-purple-700">{d.total_reward_points} pts</span>
                    <span className="text-[10px] text-gray-500">{d.total_donations} donations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Registered Restaurants Directory */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-purple-700" />
              <h3 className="font-bold text-gray-900 text-lg">Available Restaurants ({restaurants.length})</h3>
            </div>
          </div>
          {restaurants.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No registered restaurants found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase">
                    <th className="p-3">ID</th>
                    <th className="p-3">Restaurant Name</th>
                    <th className="p-3">Login Email</th>
                    <th className="p-3">Location / Address</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Donations</th>
                    <th className="p-3 text-right">Reward Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {restaurants.map((r) => (
                    <tr key={r.restaurant_id} className="hover:bg-purple-50/50 transition">
                      <td className="p-3 font-mono text-gray-400">#{r.restaurant_id}</td>
                      <td className="p-3 font-semibold text-gray-900">{r.restaurant_name}</td>
                      <td className="p-3 text-purple-700 font-mono">{r.email || 'N/A'}</td>
                      <td className="p-3">{r.address}, {r.city}</td>
                      <td className="p-3">{r.phone_number || 'N/A'}</td>
                      <td className="p-3 text-right font-semibold">{r.total_donations_count}</td>
                      <td className="p-3 text-right font-bold text-purple-700">{r.total_reward_points} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Registered Shelters & NGOs Directory */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-700" />
              <h3 className="font-bold text-gray-900 text-lg">Available Shelters & NGOs ({shelters.length})</h3>
            </div>
          </div>
          {shelters.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No registered shelters found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase">
                    <th className="p-3">ID</th>
                    <th className="p-3">Shelter Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Login Email</th>
                    <th className="p-3">Location / Address</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Beneficiaries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {shelters.map((s) => (
                    <tr key={s.shelter_id} className="hover:bg-purple-50/50 transition">
                      <td className="p-3 font-mono text-gray-400">#{s.shelter_id}</td>
                      <td className="p-3 font-semibold text-gray-900">{s.shelter_name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold text-[10px]">
                          {s.shelter_type}
                        </span>
                      </td>
                      <td className="p-3 text-purple-700 font-mono">{s.email || 'N/A'}</td>
                      <td className="p-3">{s.address}, {s.city}</td>
                      <td className="p-3">{s.phone_number || 'N/A'}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{s.beneficiaries_count || 'N/A'} people</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
