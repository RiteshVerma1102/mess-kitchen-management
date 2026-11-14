'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface Dish {
  _id: string;
  name: string;
  category: string;
  portionGrams: number;
  costPerPortionPaise: number;
  vegetarian: boolean;
}

interface MealItem {
  dishId: string;
  portionGrams: number;
  mandatory?: boolean;
  notes?: string;
}

interface Menu {
  _id: string;
  name: string;
  cycleType: 'weekly' | 'fortnightly' | 'monthly' | 'special_event';
  dayOfWeek?: number;
  effectiveDate?: string;
  messHallId: string;
  status: 'draft' | 'published' | 'archived';
  meals: {
    breakfast: MealItem[];
    lunch: MealItem[];
    snacks: MealItem[];
    dinner: MealItem[];
  };
  specialNotice?: string;
}

interface WeeklyDaySummary {
  dayOfWeek: number;
  dayName: string;
  menu: {
    _id?: string;
    name?: string;
    meals?: {
      breakfast?: Array<{ dishId?: { name?: string; category?: string } }>;
      lunch?: Array<{ dishId?: { name?: string; category?: string } }>;
      snacks?: Array<{ dishId?: { name?: string; category?: string } }>;
      dinner?: Array<{ dishId?: { name?: string; category?: string } }>;
    };
  } | null;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MenuManagementPage() {
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'weekly' | 'list'>('weekly');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [weeklyCalendar, setWeeklyCalendar] = useState<WeeklyDaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCycleType, setFormCycleType] = useState<'weekly' | 'fortnightly' | 'monthly' | 'special_event'>('weekly');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formMessHallId, setFormMessHallId] = useState('all');
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [formNotice, setFormNotice] = useState('');

  // Form meals
  const [formBreakfast, setFormBreakfast] = useState<MealItem[]>([]);
  const [formLunch, setFormLunch] = useState<MealItem[]>([]);
  const [formSnacks, setFormSnacks] = useState<MealItem[]>([]);
  const [formDinner, setFormDinner] = useState<MealItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [menusRes, dishesRes, weeklyRes] = await Promise.all([
        fetch('/api/v1/menus'),
        fetch('/api/v1/dishes'),
        fetch('/api/v1/menus/weekly'),
      ]);

      if (menusRes.ok) {
        const body = await menusRes.json();
        setMenus(body.data || []);
      }
      if (dishesRes.ok) {
        const body = await dishesRes.json();
        setDishes(body.data || []);
      }
      if (weeklyRes.ok) {
        const body = await weeklyRes.json();
        setWeeklyCalendar(body.data || []);
      }
    } catch {
      error('Network Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingMenu(null);
    setFormName('');
    setFormCycleType('weekly');
    setFormDayOfWeek(1);
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormMessHallId('all');
    setFormStatus('draft');
    setFormNotice('');
    setFormBreakfast([]);
    setFormLunch([]);
    setFormSnacks([]);
    setFormDinner([]);
    setIsModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setFormName(menu.name);
    setFormCycleType(menu.cycleType);
    setFormDayOfWeek(menu.dayOfWeek ?? 1);
    setFormEffectiveDate(menu.effectiveDate ? menu.effectiveDate.slice(0, 10) : '');
    setFormMessHallId(menu.messHallId || 'all');
    setFormStatus(menu.status);
    setFormNotice(menu.specialNotice || '');

    setFormBreakfast(menu.meals?.breakfast || []);
    setFormLunch(menu.meals?.lunch || []);
    setFormSnacks(menu.meals?.snacks || []);
    setFormDinner(menu.meals?.dinner || []);
    setIsModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      error('Validation Error', 'Menu title is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName.trim(),
        cycleType: formCycleType,
        dayOfWeek: formCycleType === 'weekly' ? Number(formDayOfWeek) : undefined,
        effectiveDate: formCycleType === 'special_event' ? formEffectiveDate : undefined,
        messHallId: formMessHallId,
        status: formStatus,
        specialNotice: formNotice.trim() || undefined,
        meals: {
          breakfast: formBreakfast,
          lunch: formLunch,
          snacks: formSnacks,
          dinner: formDinner,
        },
      };

      const url = editingMenu ? `/api/v1/menus/${editingMenu._id}` : '/api/v1/menus';
      const method = editingMenu ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        success('Success', `Menu ${editingMenu ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        loadData();
      } else {
        const body = await res.json();
        error('Error', body.error?.message || 'Failed to save menu');
      }
    } catch {
      error('Network Error', 'Could not connect to server');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/menus/${id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Menu Removed', 'Menu deleted or moved to archive status');
        setDeleteConfirmId(null);
        loadData();
      } else {
        const body = await res.json();
        error('Delete Failed', body.error?.message || 'Cannot delete menu');
      }
    } catch {
      error('Network Error', 'Failed to reach server');
    }
  };

  const addDishToMeal = (
    meal: 'breakfast' | 'lunch' | 'snacks' | 'dinner',
    dishId: string,
  ) => {
    const selectedDish = dishes.find((d) => d._id === dishId);
    if (!selectedDish) return;

    const newItem: MealItem = {
      dishId,
      portionGrams: selectedDish.portionGrams || 150,
      mandatory: true,
    };

    if (meal === 'breakfast') setFormBreakfast([...formBreakfast, newItem]);
    if (meal === 'lunch') setFormLunch([...formLunch, newItem]);
    if (meal === 'snacks') setFormSnacks([...formSnacks, newItem]);
    if (meal === 'dinner') setFormDinner([...formDinner, newItem]);
  };

  const removeDishFromMeal = (
    meal: 'breakfast' | 'lunch' | 'snacks' | 'dinner',
    index: number,
  ) => {
    if (meal === 'breakfast') setFormBreakfast(formBreakfast.filter((_, i) => i !== index));
    if (meal === 'lunch') setFormLunch(formLunch.filter((_, i) => i !== index));
    if (meal === 'snacks') setFormSnacks(formSnacks.filter((_, i) => i !== index));
    if (meal === 'dinner') setFormDinner(formDinner.filter((_, i) => i !== index));
  };

  const filteredMenus = menus.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.specialNotice && m.specialNotice.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter ? m.status === statusFilter : true;
    const matchesCycle = cycleFilter ? m.cycleType === cycleFilter : true;
    return matchesSearch && matchesStatus && matchesCycle;
  });

  // Week days for MenuMate calendar view (Monday - Sunday)
  const menuMateDays = [
    { dayOfWeek: 1, name: 'Monday', dateStr: 'May 11', defaultMain: 'Herb-Crusted Roast Chicken', defaultMain2: 'Paneer Butter Masala', defaultSide: 'Honey-Glazed Roasted Carrots', allergies: ['Gluten', 'Dairy'] },
    { dayOfWeek: 2, name: 'Tuesday', dateStr: 'May 12', defaultMain: 'Thai Red Lentil Curry', defaultMain2: 'Pan-Seared Veg Cutlet', defaultSide: 'Garlic Mashed Potatoes', allergies: ['Gluten'] },
    { dayOfWeek: 3, name: 'Wednesday', dateStr: 'May 13', defaultMain: 'Mushroom & Brie Tart', defaultMain2: 'Slow-Braised Veg Goulash', defaultSide: 'Green Beans with Almonds', allergies: ['Dairy', 'Nuts'] },
    { dayOfWeek: 4, name: 'Thursday', dateStr: 'May 14', defaultMain: 'Baked Kofta with Tomato Salsa', defaultMain2: 'Roasted Aubergine Tagine', defaultSide: 'Saffron Jeera Rice Pilaf', allergies: ['Gluten'] },
    { dayOfWeek: 5, name: 'Friday', dateStr: 'May 15', defaultMain: 'Courgette & Feta Fritters', defaultMain2: 'Golden Fried Corn Dumplings', defaultSide: 'Cucumber Mint Raita', allergies: ['Dairy'] },
    { dayOfWeek: 6, name: 'Saturday', dateStr: 'May 16', defaultMain: 'Hyderabadi Dum Biryani', defaultMain2: 'Chole Bhature Special', defaultSide: 'Gulab Jamun Dessert', allergies: ['Gluten', 'Dairy'] },
    { dayOfWeek: 0, name: 'Sunday', dateStr: 'May 17', defaultMain: 'Special Sunday Thali Feast', defaultMain2: 'Dal Makhani & Butter Naan', defaultSide: 'Moong Dal Halwa', allergies: ['Dairy'] },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar (Unified Design) */}
      <PageHeader
        icon="🍽️"
        title="Weekly Menu Overview"
        description="Plan and manage your weekly dining hall menu schedule, allergen declarations, and portion recipes"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle Pills */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab('weekly')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'weekly'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Weekly Schedule
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeTab === 'list'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 All Menus Table
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              icon={<span>➕</span>}
            >
              Add Menu Plan
            </Button>
          </div>
        }
      />

      {/* View 1: MenuMate 7-Day Weekly Grid View */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          {/* Week Selector Bar */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                ↻ Refresh
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                ← Previous
              </button>
            </div>

            <div className="text-center">
              <span className="text-xs font-bold text-slate-800">May 11 – May 17, 2026</span>
              <span className="block text-[10px] text-slate-400">Week 20 • Standard Rotation Cycle</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
              >
                Next →
              </button>
            </div>
          </div>

          {/* 7 Columns: Monday to Sunday (MenuMate UI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5 items-start">
            {menuMateDays.map((day) => {
              const liveSummary = weeklyCalendar.find((w) => w.dayOfWeek === day.dayOfWeek);
              const lunchDish = liveSummary?.menu?.meals?.lunch?.[0]?.dishId?.name || day.defaultMain;
              const dinnerDish = liveSummary?.menu?.meals?.dinner?.[0]?.dishId?.name || day.defaultMain2;
              const sideDish = liveSummary?.menu?.meals?.breakfast?.[0]?.dishId?.name || day.defaultSide;

              return (
                <div
                  key={day.dayOfWeek}
                  className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  {/* Teal Header Tab */}
                  <div className="bg-gradient-to-r from-teal-700 to-cyan-800 px-3.5 py-2.5 text-center text-white">
                    <h3 className="text-xs font-bold uppercase tracking-wider">{day.name}</h3>
                    <p className="text-[10px] text-teal-100 mt-0.5 font-medium">{day.dateStr}</p>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-3.5 flex-1 flex flex-col justify-between">
                    {/* Main Dishes Block */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 border-b border-teal-50 pb-1">
                        <span>🍲</span>
                        <span>Main Dishes</span>
                      </div>

                      {/* Main Dish 1 */}
                      <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{lunchDish}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          Freshly prepared in kitchen hall with premium ghee & fresh spices.
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {day.allergies.map((a) => (
                            <span key={a} className="rounded bg-teal-50 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Main Dish 2 */}
                      <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{dinnerDish}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          Balanced dinner recipe with seasonal farm vegetables & lentils.
                        </p>
                      </div>
                    </div>

                    {/* Side Dishes Block */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 border-b border-teal-50 pb-1">
                        <span>🥗</span>
                        <span>Side Dishes</span>
                      </div>

                      <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{sideDish}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Steamed basmati rice, tawa chapatis, cucumber salad</p>
                      </div>
                    </div>

                    {/* Footer: Portions & Costing (KasDapur Style) */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-400">Porsi: <strong className="text-slate-700">530</strong></span>
                      <span className="font-bold text-teal-700">₹52.00 / meal</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: All Menus Table (KasDapur MBG Style) */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search menus by title or dietary notice..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                aria-label="Filter by menu status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>

              <select
                aria-label="Filter by menu rotation cycle"
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="">All Cycles</option>
                <option value="weekly">Weekly Rotation</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="special_event">Special Event</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Menu Name</th>
                  <th className="px-4 py-3.5">Cycle Type</th>
                  <th className="px-4 py-3.5">Day / Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Meal Breakdown</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMenus.map((menu) => (
                  <tr key={menu._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{menu.name}</td>
                    <td className="px-4 py-3.5 capitalize">{menu.cycleType.replace('_', ' ')}</td>
                    <td className="px-4 py-3.5">
                      {menu.cycleType === 'weekly' && menu.dayOfWeek !== undefined
                        ? dayNames[menu.dayOfWeek]
                        : menu.effectiveDate
                        ? menu.effectiveDate.slice(0, 10)
                        : 'Rotating'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          menu.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : menu.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {menu.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {menu.meals?.breakfast?.length || 0} breakfast, {menu.meals?.lunch?.length || 0} lunch, {menu.meals?.dinner?.length || 0} dinner
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(menu)}
                          className="rounded-lg px-2.5 py-1 font-bold text-teal-700 hover:bg-teal-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(menu._id)}
                          className="rounded-lg px-2.5 py-1 font-bold text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Create/Edit Menu */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingMenu ? 'Edit Menu Plan' : 'Create New Menu Plan'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Menu Plan Title</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Wednesday Balanced Campus Rotation"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Cycle Type</label>
                  <select
                    value={formCycleType}
                    onChange={(e) => setFormCycleType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="special_event">Special Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Day of Week</label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {dayNames.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Breakfast Dishes Assignment */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-teal-800">🍳 Breakfast Dishes</span>
                  <select
                    aria-label="Add breakfast dish"
                    onChange={(e) => {
                      if (e.target.value) {
                        addDishToMeal('breakfast', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-700"
                  >
                    <option value="">+ Add Dish</option>
                    {dishes.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.portionGrams}g)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 space-y-1.5">
                  {formBreakfast.map((item, idx) => {
                    const dish = dishes.find((d) => d._id === item.dishId);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs">
                        <span>{dish?.name || 'Selected Dish'}</span>
                        <button type="button" onClick={() => removeDishFromMeal('breakfast', idx)} className="text-rose-500 hover:text-rose-700">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lunch Dishes Assignment */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-teal-800">🍛 Lunch Dishes</span>
                  <select
                    aria-label="Add lunch dish"
                    onChange={(e) => {
                      if (e.target.value) {
                        addDishToMeal('lunch', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-700"
                  >
                    <option value="">+ Add Dish</option>
                    {dishes.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.portionGrams}g)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 space-y-1.5">
                  {formLunch.map((item, idx) => {
                    const dish = dishes.find((d) => d._id === item.dishId);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs">
                        <span>{dish?.name || 'Selected Dish'}</span>
                        <button type="button" onClick={() => removeDishFromMeal('lunch', idx)} className="text-rose-500 hover:text-rose-700">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dinner Dishes Assignment */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-teal-800">🍲 Dinner Dishes</span>
                  <select
                    aria-label="Add dinner dish"
                    onChange={(e) => {
                      if (e.target.value) {
                        addDishToMeal('dinner', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-700"
                  >
                    <option value="">+ Add Dish</option>
                    {dishes.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.portionGrams}g)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 space-y-1.5">
                  {formDinner.map((item, idx) => {
                    const dish = dishes.find((d) => d._id === item.dishId);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs">
                        <span>{dish?.name || 'Selected Dish'}</span>
                        <button type="button" onClick={() => removeDishFromMeal('dinner', idx)} className="text-rose-500 hover:text-rose-700">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700"
                >
                  {saving ? 'Saving Plan...' : 'Save Menu Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="mt-2 text-xs text-slate-500">
              Published menus will be archived so historical data is protected. Draft menus will be removed permanently.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMenu(deleteConfirmId)}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
