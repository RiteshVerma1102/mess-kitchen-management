'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderThreshold: number;
  costPerUnitPaise: number;
  totalValuationPaise: number;
  reservedStock: number;
  availableStock: number;
  storageType: string;
  status: 'good' | 'low_stock' | 'out_of_stock';
  supplierName?: string;
}

interface IndentItem {
  ingredientId: string;
  ingredientName: string;
  requestedQuantity: number;
  issuedQuantity: number;
  unit: string;
  unitCostPaise: number;
  totalCostPaise: number;
}

interface Indent {
  _id: string;
  indentNumber: string;
  messHallId: string;
  targetDate: string;
  supplierId?: { _id: string; name: string };
  items: IndentItem[];
  totalAmountPaise: number;
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

interface StockMovement {
  _id: string;
  ingredientId: string;
  ingredientName: string;
  movementType: 'inward_indent' | 'outward_kitchen' | 'adjustment' | 'spoilage_writeoff';
  quantity: number;
  balanceAfter: number;
  unit: string;
  referenceId?: string;
  recordedBy: string;
  recordedAt: string;
  notes?: string;
}

export default function InventoryIndentsPage() {
  const { toast, success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'inventory' | 'indents' | 'movements'>('inventory');

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [kpis, setKpis] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValuationPaise: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Indents state
  const [indents, setIndents] = useState<Indent[]>([]);
  const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);
  const [loadingIndents, setLoadingIndents] = useState(false);

  // Stock movements state
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Modals state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetItem, setAdjustTargetItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'inward_indent' | 'outward_kitchen' | 'adjustment' | 'spoilage_writeoff'>('adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Manual Indent Modal state
  const [showManualIndentModal, setShowManualIndentModal] = useState(false);
  const [manualTargetDate, setManualTargetDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualNotes, setManualNotes] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ ingredientId: string; requestedQuantity: number }>>([
    { ingredientId: '', requestedQuantity: 10 },
  ]);
  const [submittingManualIndent, setSubmittingManualIndent] = useState(false);

  // Fetch Inventory
  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/v1/inventory?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = await res.json();
      const payload = data.data || data;
      setInventoryItems(payload.items || []);
      setKpis(payload.kpis || { totalItems: 0, lowStockCount: 0, outOfStockCount: 0, totalValuationPaise: 0 });
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingInventory(false);
    }
  }, [searchQuery, categoryFilter, statusFilter, error]);

  // Fetch Indents
  const fetchIndents = useCallback(async () => {
    setLoadingIndents(true);
    try {
      const res = await fetch('/api/v1/indents?limit=50');
      if (!res.ok) throw new Error('Failed to load indents');
      const data = await res.json();
      const payload = data.data || data;
      setIndents(payload.indents || []);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingIndents(false);
    }
  }, [error]);

  // Fetch Movements
  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const res = await fetch('/api/v1/inventory/movements?limit=50');
      if (!res.ok) throw new Error('Failed to load stock movements');
      const data = await res.json();
      const payload = data.data || data;
      setMovements(payload.movements || []);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingMovements(false);
    }
  }, [error]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (activeTab === 'indents') fetchIndents();
    if (activeTab === 'movements') fetchMovements();
  }, [activeTab, fetchIndents, fetchMovements]);

  // Submit Stock Adjustment
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetItem) return;
    setSubmittingAdjust(true);
    try {
      const res = await fetch('/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: adjustTargetItem.id,
          quantityChange: Number(adjustQty),
          movementType: adjustType,
          notes: adjustNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Stock adjustment failed');
      }

      success('Inventory stock updated successfully!');
      setShowAdjustModal(false);
      setAdjustQty(0);
      setAdjustNotes('');
      fetchInventory();
      if (activeTab === 'movements') fetchMovements();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Auto Generate Indent from Shortages
  const handleAutoGenerateIndent = async () => {
    try {
      const targetDate = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/v1/indents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'auto',
          messHallId: 'hall_a',
          targetDate,
          notes: 'Auto-generated purchase indent from live stock shortages',
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to auto-generate indent');
      }

      const data = await res.json();
      const indentObj = data.data?.indent || data.indent;
      success(`Purchase Indent ${indentObj?.indentNumber || ''} created successfully!`);
      fetchIndents();
    } catch (err) {
      error((err as Error).message);
    }
  };

  // Submit Manual Indent
  const handleCreateManualIndent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingManualIndent(true);
    try {
      const validItems = manualItems.filter((i) => i.ingredientId && i.requestedQuantity > 0);
      if (validItems.length === 0) {
        throw new Error('Please select at least one ingredient with a quantity');
      }

      const res = await fetch('/api/v1/indents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual',
          messHallId: 'hall_a',
          targetDate: manualTargetDate,
          notes: manualNotes,
          items: validItems,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to create manual indent');
      }

      const data = await res.json();
      const indentObj = data.data?.indent || data.indent;
      success(`Manual Indent ${indentObj?.indentNumber || ''} created successfully!`);
      setShowManualIndentModal(false);
      fetchIndents();
    } catch (err) {
      error((err as Error).message);
    } finally {
      setSubmittingManualIndent(false);
    }
  };

  // Update Indent Status (Approve / Fulfill / Cancel)
  const handleUpdateIndentStatus = async (indentId: string, status: Indent['status']) => {
    try {
      const res = await fetch(`/api/v1/indents/${indentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to update indent status');
      }

      success(`Indent status updated to ${status}!`);
      if (status === 'fulfilled') {
        toast('info', 'Stock Updated', 'Stock levels automatically updated and recorded in ledger.');
        fetchInventory();
      }
      setSelectedIndent(null);
      fetchIndents();
    } catch (err) {
      error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Inventory & Indent Management</h1>
          <p className="text-sm text-slate-500">
            Real-time stock ledger, minimum threshold reorder alerts, purchase indents and stock movement audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAutoGenerateIndent}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <span>⚡</span>
            <span>Auto-Generate Indent from Shortages</span>
          </button>

          <button
            onClick={() => setShowManualIndentModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <span>➕</span>
            <span>New Purchase Indent</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Inspired by Dribbble & MarketMan) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Catalog Items</span>
            <span className="rounded-full bg-slate-100 p-1.5 text-xs">📦</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{kpis.totalItems}</p>
          <span className="text-xs text-slate-400">Tracked raw commodities</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock Warning</span>
            <span className="rounded-full bg-amber-100 p-1.5 text-xs text-amber-600">⚠️</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.lowStockCount}</p>
          <span className="text-xs text-amber-700">Below reorder threshold</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Out of Stock</span>
            <span className="rounded-full bg-rose-100 p-1.5 text-xs text-rose-600">🚨</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{kpis.outOfStockCount}</p>
          <span className="text-xs text-rose-700">Zero inventory remaining</span>
        </div>

        <div className="rounded-xl border border-line bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inventory Valuation</span>
            <span className="rounded-full bg-emerald-100 p-1.5 text-xs text-emerald-600">₹</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            ₹{(kpis.totalValuationPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400">Current warehouse valuation</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-line">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'inventory'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>📋</span>
          <span>Stock Overview & Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('indents')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'indents'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>📑</span>
          <span>Purchase Indents ({indents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'movements'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-ink'
          }`}
        >
          <span>📜</span>
          <span>Stock Movement Ledger</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY CATALOG */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-3 shadow-sm">
            <div className="flex flex-1 items-center gap-2 min-w-[240px]">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search ingredients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium focus:border-brand focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="grain">Grains & Rice</option>
                <option value="pulse">Pulses & Dal</option>
                <option value="vegetable">Vegetables</option>
                <option value="dairy">Dairy</option>
                <option value="spice">Spices</option>
                <option value="oil">Oils & Ghee</option>
                <option value="poultry">Poultry</option>
                <option value="bakery">Bakery</option>
                <option value="dry_ration">Dry Ration</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium focus:border-brand focus:outline-none"
              >
                <option value="">All Stock Statuses</option>
                <option value="good">Normal Stock</option>
                <option value="low_stock">Low Stock Alerts</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ingredient</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Current Stock</th>
                  <th className="px-4 py-3 font-semibold">Reserved (Today)</th>
                  <th className="px-4 py-3 font-semibold">Available Free</th>
                  <th className="px-4 py-3 font-semibold">Reorder Threshold</th>
                  <th className="px-4 py-3 font-semibold">Unit Price</th>
                  <th className="px-4 py-3 font-semibold">Total Value</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loadingInventory ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : inventoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No matching ingredients found.
                    </td>
                  </tr>
                ) : (
                  inventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                      <td className="px-4 py-3 capitalize text-slate-500">{item.category}</td>
                      <td className="px-4 py-3 font-bold text-ink">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {item.reservedStock} {item.unit}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-700">
                        {item.availableStock} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {item.reorderThreshold} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        ₹{(item.costPerUnitPaise / 100).toFixed(2)}/{item.unit}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        ₹{(item.totalValuationPaise / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'out_of_stock' ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                            Out of Stock
                          </span>
                        ) : item.status === 'low_stock' ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Adequate
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setAdjustTargetItem(item);
                            setShowAdjustModal(true);
                          }}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Adjust ±
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE INDENTS */}
      {activeTab === 'indents' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Indent Number</th>
                  <th className="px-4 py-3 font-semibold">Target Date</th>
                  <th className="px-4 py-3 font-semibold">Mess Hall</th>
                  <th className="px-4 py-3 font-semibold">Total Items</th>
                  <th className="px-4 py-3 font-semibold">Est. Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loadingIndents ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Loading purchase indents...
                    </td>
                  </tr>
                ) : indents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No indents on record. Click &quot;Auto-Generate Indent from Shortages&quot; above to create one.
                    </td>
                  </tr>
                ) : (
                  indents.map((ind) => (
                    <tr key={ind._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-ink">{ind.indentNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{ind.targetDate}</td>
                      <td className="px-4 py-3 uppercase text-slate-500">{ind.messHallId}</td>
                      <td className="px-4 py-3 text-slate-600">{ind.items.length} commodities</td>
                      <td className="px-4 py-3 font-bold text-ink">
                        ₹{(ind.totalAmountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          ind.status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ind.status === 'approved'
                            ? 'bg-indigo-100 text-indigo-800'
                            : ind.status === 'submitted'
                            ? 'bg-sky-100 text-sky-800'
                            : ind.status === 'cancelled'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ind.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedIndent(ind)}
                          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENTS LEDGER */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Ingredient</th>
                  <th className="px-4 py-3 font-semibold">Movement Type</th>
                  <th className="px-4 py-3 font-semibold">Quantity Delta</th>
                  <th className="px-4 py-3 font-semibold">Balance After</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loadingMovements ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Loading stock movements...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(m.recordedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{m.ingredientName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          m.movementType === 'inward_indent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.movementType === 'outward_kitchen'
                            ? 'bg-sky-100 text-sky-800'
                            : m.movementType === 'spoilage_writeoff'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${m.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity >= 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {m.balanceAfter} {m.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{m.referenceId || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{m.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showAdjustModal && adjustTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Adjust Stock: {adjustTargetItem.name}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Current balance: <strong>{adjustTargetItem.currentStock} {adjustTargetItem.unit}</strong>
            </p>

            <form onSubmit={handleAdjustStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium focus:border-brand focus:outline-none"
                >
                  <option value="adjustment">Stock Audit Count Adjustment</option>
                  <option value="inward_indent">Direct Inward Delivery (+)</option>
                  <option value="outward_kitchen">Kitchen Draw Deduction (-)</option>
                  <option value="spoilage_writeoff">Spoilage / Damage Writeoff (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  Quantity Change ({adjustTargetItem.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  placeholder="e.g. +10 to add, -5 to deduct"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium focus:border-brand focus:outline-none"
                  required
                />
                <span className="text-xs text-slate-400">
                  New stock will be: {(adjustTargetItem.currentStock + Number(adjustQty)).toFixed(2)} {adjustTargetItem.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Physical inventory reconciliation count"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium focus:border-brand focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {submittingAdjust ? 'Updating...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INDENT DETAIL MODAL */}
      {selectedIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Purchase Indent: {selectedIndent.indentNumber}</h3>
                <p className="text-xs text-slate-500">Target Service Date: {selectedIndent.targetDate}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-800">
                {selectedIndent.status}
              </span>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Commodity</th>
                    <th className="px-4 py-2 font-semibold">Requested Qty</th>
                    <th className="px-4 py-2 font-semibold">Unit Price</th>
                    <th className="px-4 py-2 font-semibold">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selectedIndent.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2.5 font-semibold text-ink">{item.ingredientName}</td>
                      <td className="px-4 py-2.5 font-bold text-ink">{item.requestedQuantity} {item.unit}</td>
                      <td className="px-4 py-2.5 text-slate-600">₹{(item.unitCostPaise / 100).toFixed(2)}</td>
                      <td className="px-4 py-2.5 font-semibold text-ink">₹{(item.totalCostPaise / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
              <span className="font-semibold text-slate-600">Total Purchase Commitment:</span>
              <span className="text-base font-bold text-ink">
                ₹{(selectedIndent.totalAmountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Workflow Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedIndent(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedIndent.status === 'draft' && (
                  <button
                    onClick={() => handleUpdateIndentStatus(selectedIndent._id, 'approved')}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    ✓ Approve Indent
                  </button>
                )}
                {selectedIndent.status === 'approved' && (
                  <button
                    onClick={() => handleUpdateIndentStatus(selectedIndent._id, 'fulfilled')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    📦 Receive & Fulfill (Increment Stock)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW MANUAL INDENT MODAL */}
      {showManualIndentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-paper p-6 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Create Manual Purchase Indent</h3>
            <p className="mt-1 text-xs text-slate-500">Procure commodities directly from authorized suppliers</p>

            <form onSubmit={handleCreateManualIndent} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Required Date</label>
                  <input
                    type="date"
                    value={manualTargetDate}
                    onChange={(e) => setManualTargetDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Mess Hall</label>
                  <input
                    type="text"
                    value="Main Dining Hall (Hall A)"
                    disabled
                    className="mt-1 w-full rounded-lg border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Select Ingredient</label>
                <select
                  value={manualItems[0]?.ingredientId || ''}
                  onChange={(e) => {
                    const newItems = [...manualItems];
                    newItems[0].ingredientId = e.target.value;
                    setManualItems(newItems);
                  }}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium focus:border-brand focus:outline-none"
                  required
                >
                  <option value="">Select commodity...</option>
                  {inventoryItems.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.currentStock} {ing.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Order Quantity</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={manualItems[0]?.requestedQuantity || 10}
                  onChange={(e) => {
                    const newItems = [...manualItems];
                    newItems[0].requestedQuantity = Number(e.target.value);
                    setManualItems(newItems);
                  }}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Procurement Notes</label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Special purchase for upcoming hostel festival"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualIndentModal(false)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManualIndent}
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  {submittingManualIndent ? 'Submitting...' : 'Issue Purchase Indent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
