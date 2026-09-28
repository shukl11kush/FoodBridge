import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Sparkles, Utensils, AlertCircle, CheckCircle2, X } from 'lucide-react';

export const CreateListingModal = ({ isOpen, onClose, onListingCreated }) => {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'manual'

  // AI Assistant form state
  const [rawInput, setRawInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    food_name: '',
    food_quantity: 20,
    quantity_unit: 'PORTIONS',
    food_description: '',
    dietary_info: 'Vegetarian',
    allergen_info: '',
    ready_time_offset: 0,
    duration_hours: 3,
    quality_safety_note: 'Freshly prepared and packed in food-grade containers.'
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  if (!isOpen) return null;

  const handleAIAssist = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiError('');
    setAiSuccess(null);

    try {
      const res = await axios.post(`${API_URL}/listings/ai-assist`, { raw_input: rawInput });
      setAiSuccess(res.data);
      if (onListingCreated) onListingCreated();
      setTimeout(() => {
        onClose();
        setAiSuccess(null);
        setRawInput('');
      }, 1200);
    } catch (err) {
      setAiError(err.response?.data?.detail || 'Failed to parse AI listing. Try manual entry.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualLoading(true);
    setManualError('');

    const now = new Date();
    const readyTime = new Date(now.getTime() + manualForm.ready_time_offset * 60000);
    const pickupDeadline = new Date(readyTime.getTime() + manualForm.duration_hours * 3600000);

    try {
      await axios.post(`${API_URL}/listings/manual`, {
        food_name: manualForm.food_name,
        food_quantity: parseFloat(manualForm.food_quantity),
        quantity_unit: manualForm.quantity_unit,
        food_description: manualForm.food_description,
        dietary_info: manualForm.dietary_info,
        allergen_info: manualForm.allergen_info,
        ready_time: readyTime.toISOString(),
        pickup_deadline: pickupDeadline.toISOString(),
        listing_duration_minutes: manualForm.duration_hours * 60,
        quality_safety_note: manualForm.quality_safety_note
      });
      if (onListingCreated) onListingCreated();
      onClose();
    } catch (err) {
      setManualError(err.response?.data?.detail || 'Failed to create listing.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-emerald-700 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Utensils className="w-6 h-6 text-emerald-200" />
            <h2 className="text-xl font-bold">Donate Surplus Food</h2>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'ai'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI Fast Entry</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-600" />
            <span>Manual Form</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeTab === 'ai' ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Type or speak your donation in natural language. FoodBridge AI will extract quantity, unit, ready time, and dietary details automatically!
              </p>

              <form onSubmit={handleAIAssist}>
                <textarea
                  rows={4}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="e.g. 50 portions of vegetable biryani with raita ready now for next 3 hours. Contains dairy."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  required
                />

                {aiError && (
                  <div className="mt-3 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {aiSuccess && (
                  <div className="mt-3 p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm space-y-1 border border-emerald-200">
                    <div className="font-semibold flex items-center space-x-1.5 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Listing Created Successfully!</span>
                    </div>
                    <p><strong>Food:</strong> {aiSuccess.food_name} ({aiSuccess.food_quantity} {aiSuccess.quantity_unit})</p>
                    <p><strong>Confidence:</strong> {(aiSuccess.ai_confidence_score * 100).toFixed(0)}%</p>
                  </div>
                )}

                <div className="mt-5 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={aiLoading || !rawInput.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{aiLoading ? 'AI Parsing...' : 'Post Donation'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {manualError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Food Name *</label>
                <input
                  type="text"
                  required
                  value={manualForm.food_name}
                  onChange={(e) => setManualForm({ ...manualForm, food_name: e.target.value })}
                  placeholder="e.g. Paneer Butter Masala & Rotis"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualForm.food_quantity}
                    onChange={(e) => setManualForm({ ...manualForm, food_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit *</label>
                  <select
                    value={manualForm.quantity_unit}
                    onChange={(e) => setManualForm({ ...manualForm, quantity_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="PORTIONS">PORTIONS</option>
                    <option value="KG">KG</option>
                    <option value="LB">LB</option>
                    <option value="LITERS">LITERS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dietary Category</label>
                  <select
                    value={manualForm.dietary_info}
                    onChange={(e) => setManualForm({ ...manualForm, dietary_info: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Eggetarian">Eggetarian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={manualForm.duration_hours}
                    onChange={(e) => setManualForm({ ...manualForm, duration_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Allergen Information</label>
                <input
                  type="text"
                  value={manualForm.allergen_info}
                  onChange={(e) => setManualForm({ ...manualForm, allergen_info: e.target.value })}
                  placeholder="e.g. Contains peanuts, dairy, gluten"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                >
                  {manualLoading ? 'Saving...' : 'Submit Listing'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
