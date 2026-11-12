'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

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
      breakfast?: Array<{ dishId?: { name?: string } }>;
      lunch?: Array<{ dishId?: { name?: string } }>;
      snacks?: Array<{ dishId?: { name?: string } }>;
      dinner?: Array<{ dishId?: { name?: string } }>;
    };
  } | null;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function MenuManagementPage() {
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'list' | 'weekly'>('list');
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

  // Delete confirm dialog
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
        setMenus(body.data.menus || []);
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
      error('Network Error', 'Failed to retrieve menu data');
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
    setFormEffectiveDate('');
    setFormMessHallId('all');
    setFormStatus('draft');
    setFormNotice('');
    setFormBreakfast(dishes.length > 0 ? [{ dishId: dishes[0]._id, portionGrams: 200, mandatory: true }] : []);
    setFormLunch(dishes.length > 1 ? [{ dishId: dishes[1]._id, portionGrams: 250, mandatory: true }] : []);
    setFormSnacks([]);
    setFormDinner(dishes.length > 2 ? [{ dishId: dishes[2]._id, portionGrams: 250, mandatory: true }] : []);
    setIsModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setFormName(menu.name);
    setFormCycleType(menu.cycleType);
    setFormDayOfWeek(menu.dayOfWeek ?? 1);
    setFormEffectiveDate(menu.effectiveDate ?? '');
    setFormMessHallId(menu.messHallId ?? 'all');
    setFormStatus(menu.status);
    setFormNotice(menu.specialNotice ?? '');
    setFormBreakfast(menu.meals?.breakfast || []);
    setFormLunch(menu.meals?.lunch || []);
    setFormSnacks(menu.meals?.snacks || []);
    setFormDinner(menu.meals?.dinner || []);
    setIsModalOpen(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formName,
      cycleType: formCycleType,
      dayOfWeek: formDayOfWeek,
      effectiveDate: formEffectiveDate || undefined,
      messHallId: formMessHallId,
      status: formStatus,
      specialNotice: formNotice || undefined,
      meals: {
        breakfast: formBreakfast,
        lunch: formLunch,
        snacks: formSnacks,
        dinner: formDinner,
      },
    };

    try {
      const url = editingMenu ? `/api/v1/menus/${editingMenu._id}` : '/api/v1/menus';
      const method = editingMenu ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        error('Save Failed', body?.error?.message ?? 'Could not save menu');
        setSaving(false);
        return;
      }

      success(
        editingMenu ? 'Menu Updated' : 'Menu Created',
        `"${formName}" has been successfully saved`,
      );
      setIsModalOpen(false);
      loadData();
    } catch {
      error('Network Error', 'Could not reach server');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/menus/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const body = await res.json();
        if (body?.data?.archived) {
          info('Menu Archived', 'Published menu was moved to archive');
        } else {
          success('Menu Deleted', 'Draft menu removed completely');
        }
        setDeleteConfirmId(null);
        loadData();
      } else {
        error('Action Failed', 'Could not delete menu');
      }
    } catch {
      error('Network Error', 'Failed to execute delete');
    }
  };

  // Helper for adding dish to meal
  const addDishToMeal = (
    mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner',
  ) => {
    if (dishes.length === 0) return;
    const newItem: MealItem = {
      dishId: dishes[0]._id,
      portionGrams: 200,
      mandatory: true,
    };
    if (mealType === 'breakfast') setFormBreakfast([...formBreakfast, newItem]);
    if (mealType === 'lunch') setFormLunch([...formLunch, newItem]);
    if (mealType === 'snacks') setFormSnacks([...formSnacks, newItem]);
    if (mealType === 'dinner') setFormDinner([...formDinner, newItem]);
  };

  const removeDishFromMeal = (
    mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner',
    index: number,
  ) => {
    if (mealType === 'breakfast') setFormBreakfast(formBreakfast.filter((_, i) => i !== index));
    if (mealType === 'lunch') setFormLunch(formLunch.filter((_, i) => i !== index));
    if (mealType === 'snacks') setFormSnacks(formSnacks.filter((_, i) => i !== index));
    if (mealType === 'dinner') setFormDinner(formDinner.filter((_, i) => i !== index));
  };

  const filteredMenus = menus.filter((m) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || m.status === statusFilter;
    const matchesCycle = !cycleFilter || m.cycleType === cycleFilter;
    return matchesSearch && matchesStatus && matchesCycle;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Menu & Meal Planning</h1>
          <p className="text-xs text-ink/70 mt-1">
            Standard rotating cycles, daily recipes, and dining hall allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex rounded-lg border border-line bg-paper p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                activeTab === 'list'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              All Menus ({menus.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                activeTab === 'weekly'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink/70 hover:text-ink'
              }`}
            >
              Weekly Calendar
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow hover:opacity-95"
          >
            <span>+</span>
            <span>Create Menu</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Menu List & Filter */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-4 shadow-sm">
            <input
              type="text"
              placeholder="Search menus by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-line bg-paper px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink"
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink"
            >
              <option value="">All Cycles</option>
              <option value="weekly">Weekly Rotation</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
              <option value="special_event">Special Event</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="rounded-xl border border-line bg-paper p-12 text-center text-xs text-ink/60 animate-pulse">
              Loading menu catalog...
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-paper p-12 text-center">
              <span className="text-3xl">🍽️</span>
              <p className="mt-2 text-sm font-semibold text-ink">No menus found</p>
              <p className="text-xs text-ink/60 mt-1">Adjust filters or create your first menu</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-block rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white"
              >
                + Create Menu
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Menu Name</th>
                    <th className="px-4 py-3">Cycle & Day</th>
                    <th className="px-4 py-3">Mess Hall</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Meals Included</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {filteredMenus.map((menu) => (
                    <tr key={menu._id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition">
                      <td className="px-4 py-3.5 font-semibold">
                        <div>{menu.name}</div>
                        {menu.specialNotice && (
                          <div className="text-[11px] font-normal text-amber-600">{menu.specialNotice}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {menu.cycleType}{' '}
                        {menu.dayOfWeek !== undefined ? `(${dayNames[menu.dayOfWeek]})` : ''}
                      </td>
                      <td className="px-4 py-3 uppercase text-[11px] font-mono">
                        {menu.messHallId === 'all' ? 'All Dining Halls' : menu.messHallId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            menu.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : menu.status === 'draft'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {menu.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-ink/70">
                        {menu.meals?.breakfast?.length || 0} breakfast,{' '}
                        {menu.meals?.lunch?.length || 0} lunch,{' '}
                        {menu.meals?.dinner?.length || 0} dinner
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(menu)}
                            className="rounded px-2.5 py-1 font-semibold text-brand hover:bg-brand/10 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(menu._id)}
                            className="rounded px-2 py-1 font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition"
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
          )}
        </div>
      )}

      {/* Tab 2: Weekly Calendar Grid */}
      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {weeklyCalendar.map((day) => (
            <div
              key={day.dayOfWeek}
              className="rounded-xl border border-line bg-paper p-3.5 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="border-b border-line pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
                    {day.dayName}
                  </h3>
                  <span className="text-[10px] text-ink/50 font-mono">Day {day.dayOfWeek}</span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {/* Breakfast */}
                  <div>
                    <span className="text-[10px] font-semibold text-ink/60 uppercase">Breakfast</span>
                    <p className="text-xs text-ink mt-0.5 leading-snug">
                      {day.menu?.meals?.breakfast?.map((b) => b.dishId?.name).filter(Boolean).join(', ') ||
                        'Aloo Paratha, Curd'}
                    </p>
                  </div>

                  {/* Lunch */}
                  <div>
                    <span className="text-[10px] font-semibold text-ink/60 uppercase">Lunch</span>
                    <p className="text-xs text-ink mt-0.5 leading-snug">
                      {day.menu?.meals?.lunch?.map((l) => l.dishId?.name).filter(Boolean).join(', ') ||
                        'Dal Makhani, Rice, Roti'}
                    </p>
                  </div>

                  {/* Snacks */}
                  <div>
                    <span className="text-[10px] font-semibold text-ink/60 uppercase">Snacks</span>
                    <p className="text-xs text-ink mt-0.5 leading-snug">
                      {day.menu?.meals?.snacks?.map((s) => s.dishId?.name).filter(Boolean).join(', ') ||
                        'Samosa & Tea'}
                    </p>
                  </div>

                  {/* Dinner */}
                  <div>
                    <span className="text-[10px] font-semibold text-ink/60 uppercase">Dinner</span>
                    <p className="text-xs text-ink mt-0.5 leading-snug">
                      {day.menu?.meals?.dinner?.map((d) => d.dishId?.name).filter(Boolean).join(', ') ||
                        'Paneer Curry, Roti, Kheer'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-line text-[10px] text-brand font-medium">
                {day.menu ? `Active: ${day.menu.name}` : 'Rotating Template'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-paper p-6 shadow-xl">
            <h3 className="text-base font-bold text-ink">Confirm Deletion / Archive</h3>
            <p className="mt-2 text-xs text-ink/70">
              Published menus will be safely moved to &apos;Archived&apos; status so historical attendance and recipe records remain valid. Draft menus will be removed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMenu(deleteConfirmId)}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Menu Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-paper p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-bold text-ink">
                {editingMenu ? 'Edit Menu' : 'Create New Menu'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink/80">Menu Title</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                    placeholder="e.g. Regular Monday Menu"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/80">Cycle Type</label>
                  <select
                    value={formCycleType}
                    onChange={(e) => setFormCycleType(e.target.value as 'weekly' | 'fortnightly' | 'monthly' | 'special_event')}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  >
                    <option value="weekly">Weekly Rotation</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                    <option value="special_event">Special Event</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-ink/80">Day of Week</label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  >
                    {dayNames.map((name, idx) => (
                      <option key={idx} value={idx}>
                        {name} ({idx})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink/80">Effective Date (Optional)</label>
                  <input
                    type="date"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink/80">Publish Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'draft' | 'published' | 'archived')}
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Mess Hall Allocation</label>
                <select
                  value={formMessHallId}
                  onChange={(e) => setFormMessHallId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                >
                  <option value="all">All Dining Halls (Default)</option>
                  <option value="hall_a">Hostel A & B (Boys Mess)</option>
                  <option value="hall_b">Hostel C & D (Girls Mess)</option>
                  <option value="hall_c">Post-Graduate Dining Hall</option>
                </select>
              </div>

              {/* Meal Item Selectors */}
              <div className="space-y-4 pt-2 border-t border-line">
                <h3 className="font-bold text-ink text-sm">Dishes per Meal</h3>

                {/* Breakfast */}
                <div className="rounded-lg border border-line p-3 bg-stone-50/50 dark:bg-stone-900/40">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-brand">Breakfast Items</span>
                    <button
                      type="button"
                      onClick={() => addDishToMeal('breakfast')}
                      className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                    >
                      + Add Dish
                    </button>
                  </div>
                  {formBreakfast.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select
                        value={item.dishId}
                        onChange={(e) => {
                          const updated = [...formBreakfast];
                          updated[idx].dishId = e.target.value;
                          setFormBreakfast(updated);
                        }}
                        className="flex-1 rounded border border-line bg-paper px-2 py-1 text-xs"
                      >
                        {dishes.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.category})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Portion (g)"
                        value={item.portionGrams}
                        onChange={(e) => {
                          const updated = [...formBreakfast];
                          updated[idx].portionGrams = Number(e.target.value);
                          setFormBreakfast(updated);
                        }}
                        className="w-24 rounded border border-line bg-paper px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeDishFromMeal('breakfast', idx)}
                        className="text-red-500 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Lunch */}
                <div className="rounded-lg border border-line p-3 bg-stone-50/50 dark:bg-stone-900/40">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-brand">Lunch Items</span>
                    <button
                      type="button"
                      onClick={() => addDishToMeal('lunch')}
                      className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                    >
                      + Add Dish
                    </button>
                  </div>
                  {formLunch.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select
                        value={item.dishId}
                        onChange={(e) => {
                          const updated = [...formLunch];
                          updated[idx].dishId = e.target.value;
                          setFormLunch(updated);
                        }}
                        className="flex-1 rounded border border-line bg-paper px-2 py-1 text-xs"
                      >
                        {dishes.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.category})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Portion (g)"
                        value={item.portionGrams}
                        onChange={(e) => {
                          const updated = [...formLunch];
                          updated[idx].portionGrams = Number(e.target.value);
                          setFormLunch(updated);
                        }}
                        className="w-24 rounded border border-line bg-paper px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeDishFromMeal('lunch', idx)}
                        className="text-red-500 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Dinner */}
                <div className="rounded-lg border border-line p-3 bg-stone-50/50 dark:bg-stone-900/40">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-brand">Dinner Items</span>
                    <button
                      type="button"
                      onClick={() => addDishToMeal('dinner')}
                      className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand hover:bg-brand/20"
                    >
                      + Add Dish
                    </button>
                  </div>
                  {formDinner.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select
                        value={item.dishId}
                        onChange={(e) => {
                          const updated = [...formDinner];
                          updated[idx].dishId = e.target.value;
                          setFormDinner(updated);
                        }}
                        className="flex-1 rounded border border-line bg-paper px-2 py-1 text-xs"
                      >
                        {dishes.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.category})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Portion (g)"
                        value={item.portionGrams}
                        onChange={(e) => {
                          const updated = [...formDinner];
                          updated[idx].portionGrams = Number(e.target.value);
                          setFormDinner(updated);
                        }}
                        className="w-24 rounded border border-line bg-paper px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeDishFromMeal('dinner', idx)}
                        className="text-red-500 font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Special Notice (Optional)</label>
                <textarea
                  rows={2}
                  value={formNotice}
                  onChange={(e) => setFormNotice(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs"
                  placeholder="e.g. Special festive sweet served with dinner"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingMenu ? 'Update Menu' : 'Create Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
