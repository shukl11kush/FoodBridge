import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Building2, Sparkles, HeartHandshake, LogOut, Search } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-sky-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-sky-200" />
            <Link to="/" className="text-xl font-bold tracking-tight hover:text-sky-100">
              FoodBridge <span className="text-xs bg-sky-800 text-sky-200 px-2 py-0.5 rounded-full uppercase ml-1">Shelter & NGO</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-6">
              <Link to="/" className="hover:text-sky-200 text-sm font-medium flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Matchmaker</span>
              </Link>

              <Link to="/directory" className="hover:text-sky-200 text-sm font-medium flex items-center space-x-1">
                <Search className="w-4 h-4" />
                <span>Directory</span>
              </Link>

              <Link to="/my-claims" className="hover:text-sky-200 text-sm font-medium flex items-center space-x-1 bg-sky-800 px-3 py-1.5 rounded-full border border-sky-600">
                <HeartHandshake className="w-4 h-4 text-sky-300" />
                <span>My Claims</span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-sky-200 hover:text-white p-1.5 rounded-md hover:bg-sky-800 transition"
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
