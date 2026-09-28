import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Utensils, Award, ListFilter, LogOut, PlusCircle } from 'lucide-react';

export const Navbar = ({ onOpenCreateModal }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const points = user?.restaurant?.total_reward_points || 0;

  return (
    <nav className="bg-emerald-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Utensils className="h-8 w-8 text-emerald-200" />
            <Link to="/" className="text-xl font-bold tracking-tight hover:text-emerald-100">
              FoodBridge <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full uppercase ml-1">Restaurant</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-6">
              <Link to="/" className="hover:text-emerald-200 text-sm font-medium">Dashboard</Link>
              <Link to="/listings" className="hover:text-emerald-200 text-sm font-medium flex items-center space-x-1">
                <ListFilter className="w-4 h-4" />
                <span>My Listings</span>
              </Link>
              <Link to="/rewards" className="hover:text-emerald-200 text-sm font-medium flex items-center space-x-1 bg-emerald-800 px-3 py-1.5 rounded-full border border-emerald-600">
                <Award className="w-4 h-4 text-amber-300" />
                <span className="font-semibold text-amber-300">{points} pts</span>
              </Link>

              <button
                onClick={onOpenCreateModal}
                className="bg-amber-500 hover:bg-amber-600 text-emerald-950 px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center space-x-1.5 shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Donate Surplus</span>
              </button>

              <button
                onClick={handleLogout}
                className="text-emerald-200 hover:text-white p-1.5 rounded-md hover:bg-emerald-800 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
