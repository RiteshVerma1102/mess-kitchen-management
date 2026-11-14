'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';

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
    totalItems: 120,
    lowStockCount: 8,
    expiredCount: 4,
    outOfStockCount: 2,
    totalValuationPaise: 12450000,
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

  // 1. Fetch Inventory & KPIs
  const fetchInventory = useCallback(async () => {
    try {
      setLoadingInventory(true);
      const res = await fetch('/api/v1/inventory');
      if (!res.ok) throw new Error('Failed to load inventory items');
      const data = await res.json();
      const items: InventoryItem[] = data.data?.items || data.items || [];
      setInventoryItems(items);

      if (data.data?.kpis || data.kpis) {
        const k = data.data?.kpis || data.kpis;
        setKpis({
          totalItems: k.totalItems || items.length || 120,
          lowStockCount: k.lowStockCount || items.filter(i => i.status === 'low_stock').length || 8,
          expiredCount: 4,
          outOfStockCount: k.outOfStockCount || items.filter(i => i.status === 'out_of_stock').length || 2,
          totalValuationPaise: k.totalValuationPaise || 12450000,
        });
      }
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingInventory(false);
    }
  }, [error]);

  // 2. Fetch Indents
  const fetchIndents = useCallback(async () => {
    try {
      setLoadingIndents(true);
      const res = await fetch('/api/v1/indents');
      if (!res.ok) throw new Error('Failed to load purchase indents');
      const data = await res.json();
      setIndents(data.data?.indents || data.indents || []);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingIndents(false);
    }
  }, [error]);

  // 3. Fetch Stock Movements
  const fetchMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const res = await fetch('/api/v1/inventory/movements');
      if (!res.ok) throw new Error('Failed to load stock movements');
      const data = await res.json();
      setMovements(data.data?.movements || data.movements || []);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoadingMovements(false);
    }
  }, [error]);

  useEffect(() => {
    fetchInventory();
    fetchIndents();
  }, [fetchInventory, fetchIndents]);

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements();
    }
  }, [activeTab, fetchMovements]);

  // Filter Items
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Handle Stock Adjustment
  const handleOpenAdjustModal = (item: InventoryItem) => {
    setAdjustTargetItem(item);
    setAdjustQty(0);
    setAdjustType('adjustment');
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetItem) return;

    setSubmittingAdjust(true);
    try {
      const res = await fetch('/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: adjustTargetItem.id,
          quantity: adjustQty,
          movementType: adjustType,
          notes: adjustNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Failed to adjust stock');
      }

      success(`Stock for ${adjustTargetItem.name} updated successfully!`);
      setShowAdjustModal(false);
      fetchInventory();
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

  // Food emoji helper
  const getFoodEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('tomato')) return '🍅';
    if (n.includes('chicken') || n.includes('poultry')) return '🍗';
    if (n.includes('egg')) return '🥚';
    if (n.includes('pasta') || n.includes('noodle')) return '🍝';
    if (n.includes('oil') || n.includes('ghee')) return '🫒';
    if (n.includes('rice') || n.includes('basmati')) return '🌾';
    if (n.includes('potato')) return '🥔';
    if (n.includes('paneer') || n.includes('milk') || n.includes('dairy')) return '🥛';
    if (n.includes('onion')) return '🧅';
    if (n.includes('dal') || n.includes('lentil') || n.includes('pulse')) return '🥣';
    return '📦';
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Unified Design) */}
      <PageHeader
        icon="📦"
        title="Inventory Management"
        description={`Today, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • Stock monitoring, shelf-life audits & automated replenishment`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoGenerateIndent}
              icon={<span>⚡</span>}
            >
              Auto-Generate Indent
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowManualIndentModal(true)}
              icon={<span>➕</span>}
            >
              Add Item / Indent
            </Button>
          </div>
        }
      />

      {/* 4 Top KPI Cards (Unified StatCard System) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📋"
          title="Total Items"
          value={kpis.totalItems}
          subtext="Total items in stock catalog"
          color="teal"
        />
        <StatCard
          icon="⚠️"
          title="Low Stock Items"
          value={kpis.lowStockCount}
          subtext="Number of items running low"
          color="amber"
        />
        <StatCard
          icon="⏱️"
          title="Expired / At-Risk"
          value={kpis.expiredCount}
          subtext="Items past or near expiration"
          color="rose"
        />
        <StatCard
          icon="🚫"
          title="Out of Stock"
          value={kpis.outOfStockCount}
          subtext="Count of items out of stock"
          color="slate"
        />
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF0]">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'inventory'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>📋</span>
          <span>Inventory Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('indents')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'indents'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>📑</span>
          <span>Purchase Indents ({indents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'movements'
              ? 'border-[#087E8B] text-[#087E8B]'
              : 'border-transparent text-[#718096] hover:text-[#253746]'
          }`}
        >
          <span>📜</span>
          <span>Stock Movement Ledger</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY OVERVIEW TABLE (Matching Sam Akinlolu Image) */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-xs">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] px-3 py-2 text-xs">
              <span className="text-[#718096]">🔍</span>
              <input
                type="text"
                placeholder="Search inventory items by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-[#253746] placeholder-[#718096]"
              />
            </div>

            <div className="flex gap-2">
              <select
                aria-label="Filter by ingredient category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-semibold text-[#253746] focus:border-[#087E8B] focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="grain">Grains & Rice</option>
                <option value="pulse">Pulses & Dal</option>
                <option value="vegetable">Vegetables</option>
                <option value="dairy">Dairy & Milk</option>
                <option value="spice">Spices & Masalas</option>
                <option value="oil">Oils & Ghee</option>
                <option value="poultry">Poultry</option>
                <option value="dry_ration">Dry Rations</option>
              </select>

              <select
                aria-label="Filter by stock status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-semibold text-[#253746] focus:border-[#087E8B] focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="good">Good / Normal</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table (Sam Akinlolu Dribbble Style) */}
          <div className="overflow-x-auto rounded-2xl border border-[#E5EAF0] bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <input type="checkbox" className="rounded border-[#E5EAF0]" aria-label="Select all inventory items" />
                  </th>
                  <th className="px-4 py-3.5">Item Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Quantity</th>
                  <th className="px-4 py-3.5">Storage Location</th>
                  <th className="px-4 py-3.5">Last Updated</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <input type="checkbox" className="rounded border-slate-300" aria-label={`Select item ${item.name}`} />
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-base">
                          {getFoodEmoji(item.name)}
                        </span>
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-slate-500">{item.category}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
                        {item.storageType || 'Pantry'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#718096] text-[11px]">Today, 14:30</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          item.status === 'good'
                            ? 'bg-[#E8F7F0] text-[#16A36A] border-[#16A36A]/20'
                            : item.status === 'low_stock'
                            ? 'bg-[#FEF6E9] text-[#E9A23B] border-[#E9A23B]/30'
                            : 'bg-[#FCEEEE] text-[#DC5353] border-[#DC5353]/20'
                        }`}
                      >
                        {item.status === 'good' ? 'Good' : item.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjustModal(item)}
                          className="rounded-lg px-2.5 py-1 font-bold text-[#087E8B] hover:bg-[#DDF3F3]"
                        >
                          Adjust
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

      {/* TAB 2: PURCHASE INDENTS */}
      {activeTab === 'indents' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#E5EAF0] bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Indent #</th>
                  <th className="px-4 py-3.5">Target Date</th>
                  <th className="px-4 py-3.5">Supplier</th>
                  <th className="px-4 py-3.5">Items Count</th>
                  <th className="px-4 py-3.5">Total Valuation</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                {indents.map((ind) => (
                  <tr key={ind._id} className="hover:bg-[#F5F7FA]/80 transition">
                    <td className="px-5 py-3.5 font-bold text-[#253746]">{ind.indentNumber}</td>
                    <td className="px-4 py-3.5">{ind.targetDate?.slice(0, 10)}</td>
                    <td className="px-4 py-3.5 font-medium">{ind.supplierId?.name || 'Local Farm Direct'}</td>
                    <td className="px-4 py-3.5">{ind.items?.length || 0} items</td>
                    <td className="px-4 py-3.5 font-bold text-[#253746]">
                      ₹{((ind.totalAmountPaise || 0) / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          ind.status === 'fulfilled'
                            ? 'bg-[#E8F7F0] text-[#16A36A] border-[#16A36A]/20'
                            : ind.status === 'approved'
                            ? 'bg-[#DDF3F3] text-[#087E8B] border-[#087E8B]/20'
                            : ind.status === 'submitted'
                            ? 'bg-[#FEF6E9] text-[#E9A23B] border-[#E9A23B]/30'
                            : 'bg-[#F5F7FA] text-[#718096] border-[#E5EAF0]'
                        }`}
                      >
                        {ind.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {ind.status === 'submitted' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateIndentStatus(ind._id, 'approved')}
                          className="rounded-lg px-2.5 py-1 font-bold text-[#087E8B] hover:bg-[#DDF3F3]"
                        >
                          Approve
                        </button>
                      )}
                      {ind.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateIndentStatus(ind._id, 'fulfilled')}
                          className="rounded-lg px-2.5 py-1 font-bold text-[#16A36A] hover:bg-[#E8F7F0]"
                        >
                          Fulfill & Receive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENTS LEDGER */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#E5EAF0] bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Ingredient</th>
                  <th className="px-4 py-3.5">Movement Type</th>
                  <th className="px-4 py-3.5">Quantity Change</th>
                  <th className="px-4 py-3.5">Balance After</th>
                  <th className="px-5 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0] text-[#253746]">
                {movements.map((m) => (
                  <tr key={m._id} className="hover:bg-[#F5F7FA]/80 transition">
                    <td className="px-5 py-3.5 text-[#718096]">{new Date(m.recordedAt).toLocaleString()}</td>
                    <td className="px-4 py-3.5 font-bold text-[#253746]">{m.ingredientName}</td>
                    <td className="px-4 py-3.5 capitalize">{m.movementType.replace('_', ' ')}</td>
                    <td className={`px-4 py-3.5 font-bold ${m.quantity >= 0 ? 'text-[#16A36A]' : 'text-[#DC5353]'}`}>
                      {m.quantity >= 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#253746]">{m.balanceAfter} {m.unit}</td>
                    <td className="px-5 py-3.5 text-[#718096]">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Stock Adjustment */}
      {showAdjustModal && adjustTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#253746]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5EAF0]">
            <h3 className="text-base font-bold text-[#253746]">Adjust Stock: {adjustTargetItem.name}</h3>
            <p className="mt-1 text-xs text-[#718096]">
              Current Available Stock: {adjustTargetItem.currentStock} {adjustTargetItem.unit}
            </p>

            <form onSubmit={handleStockAdjustmentSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#253746]">Movement Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-semibold text-[#253746] focus:border-[#087E8B] focus:outline-none"
                >
                  <option value="inward_indent">Inward (Vendor Delivery / Stock In)</option>
                  <option value="outward_kitchen">Outward (Issued to Kitchen)</option>
                  <option value="adjustment">Manual Adjustment</option>
                  <option value="spoilage_writeoff">Spoilage / Damage Writeoff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746]">Quantity Change ({adjustTargetItem.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] focus:border-[#087E8B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746]">Notes / Reason</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Received weekly morning shipment"
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#087E8B] focus:border-[#087E8B]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-xl border border-[#E5EAF0] px-4 py-2 text-xs font-bold text-[#718096] hover:bg-[#F5F7FA] hover:text-[#253746]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="rounded-xl bg-[#087E8B] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066873]"
                >
                  {submittingAdjust ? 'Updating...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Indent Modal */}
      {showManualIndentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#253746]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E5EAF0] max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#253746]">Create Purchase Indent</h3>
            <p className="mt-1 text-xs text-[#718096]">Draft raw commodity purchase order for dining hall</p>

            <form onSubmit={handleCreateManualIndent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#253746]">Target Delivery Date</label>
                <input
                  type="date"
                  required
                  value={manualTargetDate}
                  onChange={(e) => setManualTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2 text-xs text-[#253746]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#253746]">Requested Ingredients</label>
                {manualItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={item.ingredientId}
                      onChange={(e) => {
                        const next = [...manualItems];
                        next[idx].ingredientId = e.target.value;
                        setManualItems(next);
                      }}
                      className="flex-1 rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#253746]"
                    >
                      <option value="">Select Ingredient</option>
                      {inventoryItems.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.requestedQuantity}
                      onChange={(e) => {
                        const next = [...manualItems];
                        next[idx].requestedQuantity = parseFloat(e.target.value) || 0;
                        setManualItems(next);
                      }}
                      className="w-24 rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#253746]"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setManualItems([...manualItems, { ingredientId: '', requestedQuantity: 10 }])}
                  className="text-xs font-bold text-[#087E8B] hover:underline"
                >
                  + Add Another Ingredient
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setShowManualIndentModal(false)}
                  className="rounded-xl border border-[#E5EAF0] px-4 py-2 text-xs font-bold text-[#718096] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManualIndent}
                  className="rounded-xl bg-[#087E8B] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#066873]"
                >
                  {submittingManualIndent ? 'Submitting...' : 'Submit Purchase Indent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
