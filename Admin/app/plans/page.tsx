'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Plus, Edit, Trash2, DollarSign, Calendar, Users, MessageSquare, Phone, Video } from 'lucide-react';
import toast from 'react-hot-toast';

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: string;
  currency: string;
  duration: number;
  status: number;
  text_sessions: number;
  voice_calls: number;
  video_calls: number;
  features: string[];
  created_at: string;
  subscription_count?: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    duration: 30,
    text_sessions: 0,
    voice_calls: 0,
    video_calls: 0,
    features: '',
    status: 1,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      console.log('🔍 Fetching plans...');
      console.log('Token exists:', !!token);
      
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Plans API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Plans data received:', data);
        setPlans(data.plans);
      } else {
        const errorData = await response.json();
        console.error('❌ Plans API Error:', errorData);
        toast.error(`Failed to fetch plans: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error fetching plans:', error);
      toast.error('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('admin_token');
      const planData = {
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
      };

      const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
        setShowModal(false);
        setEditingPlan(null);
        resetForm();
        fetchPlans();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      duration: plan.duration,
      text_sessions: plan.text_sessions,
      voice_calls: plan.voice_calls,
      video_calls: plan.video_calls,
      features: Array.isArray(plan.features) ? plan.features.join(', ') : '',
      status: plan.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (planId: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Plan deleted successfully');
        fetchPlans();
      } else {
        toast.error('Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'USD',
      duration: 30,
      text_sessions: 0,
      voice_calls: 0,
      video_calls: 0,
      features: '',
      status: 1,
    });
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPlan(null);
    resetForm();
  };

  const formatCurrency = (amount: string, currency: string) => {
    try {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        return `${currency || 'USD'} ${amount}`;
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(numericAmount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currency || 'USD'} ${amount}`;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage subscription plans and pricing
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(plan.price, plan.currency)}
                </div>
                <div className="text-sm text-gray-500">per {plan.duration} days</div>
              </div>

              {plan.description && (
                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {plan.text_sessions} text sessions
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {plan.voice_calls} voice calls
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Video className="h-4 w-4 mr-2" />
                  {plan.video_calls} video calls
                </div>
              </div>

              {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  plan.status === 1 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {plan.status === 1 ? 'Active' : 'Inactive'}
                </span>
                {plan.subscription_count !== undefined && (
                  <span className="text-sm text-gray-500">
                    {plan.subscription_count} subscribers
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Plan Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPlan ? 'Edit Plan' : 'Add New Plan'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input w-full h-20"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="input w-full"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text Sessions
                      </label>
                      <input
                        type="number"
                        value={formData.text_sessions}
                        onChange={(e) => setFormData({ ...formData, text_sessions: parseInt(e.target.value) })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Voice Calls
                      </label>
                      <input
                        type="number"
                        value={formData.voice_calls}
                        onChange={(e) => setFormData({ ...formData, voice_calls: parseInt(e.target.value) })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video Calls
                      </label>
                      <input
                        type="number"
                        value={formData.video_calls}
                        onChange={(e) => setFormData({ ...formData, video_calls: parseInt(e.target.value) })}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Features (comma-separated)
                    </label>
                    <textarea
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      className="input w-full h-20"
                      placeholder="Feature 1, Feature 2, Feature 3"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: parseInt(e.target.value) })}
                      className="input w-full"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingPlan ? 'Update Plan' : 'Create Plan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
