import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Users,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Trash2,
  Sparkles,
  BookOpen,
  Building2,
  Filter,
  ArrowRight,
  Search,
  Zap,
  FolderPlus,
  UserPlus,
  X,
  CreditCard,
  Settings2,
  Mail,
  Send,
  Eye,
  MailCheck,
} from 'lucide-react';

export interface PayerGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
  linkedItemIds?: string[];
  customItemPrices?: Record<string, number>; // { [itemId]: amountMinor }
}

export interface BillingItem {
  id: string;
  name: string;
  category: string;
  defaultAmountMinor: number;
  applicableGroupIds?: string[];
  groupPrices?: Record<string, number>; // { [groupId]: amountMinor }
}

export interface Payer {
  id: string;
  name: string;
  identifier: string;
  groupId: string;
  email?: string;
  phone?: string;
}

export interface BillItemLine {
  itemId?: string;
  description: string;
  amountMinor: number;
}

export interface Bill {
  id: string;
  orgId: string;
  token: string;
  payerId?: string;
  payerName: string;
  payerEmail?: string;
  groupId?: string;
  groupName?: string;
  items: BillItemLine[];
  totalAmountMinor: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  sentAt?: string;
  sentCount?: number;
  koraReference?: string;
}

interface BillingManagerProps {
  baseCurrency: string;
  orgName: string;
}

export const BillingManager: React.FC<BillingManagerProps> = ({ baseCurrency, orgName }) => {
  const [subTab, setSubTab] = useState<'invoices' | 'catalog' | 'payers'>('invoices');

  // Server state
  const [bills, setBills] = useState<Bill[]>([]);
  const [groups, setGroups] = useState<PayerGroup[]>([]);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false);
  const [isCohortPricingModalOpen, setIsCohortPricingModalOpen] = useState(false);
  const [activePricingGroup, setActivePricingGroup] = useState<PayerGroup | null>(null);
  const [pricingItemSelections, setPricingItemSelections] = useState<string[]>([]);
  const [pricingItemAmounts, setPricingItemAmounts] = useState<Record<string, string>>({});

  // Single Bill form
  const [singlePayerMode, setSinglePayerMode] = useState<'existing' | 'new'>('existing');
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [manualPayerName, setManualPayerName] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState('');
  const [singleDueDate, setSingleDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );

  // Batch Bill form
  const [batchGroupId, setBatchGroupId] = useState('');
  const [batchItemIds, setBatchItemIds] = useState<string[]>([]);
  const [batchDueDate, setBatchDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [batchSendEmails, setBatchSendEmails] = useState(true);

  // Email & Invoice Dispatch states
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<{
    subject: string;
    html: string;
    text?: string;
    bill?: Bill;
  } | null>(null);
  const [isLoadingEmailPreview, setIsLoadingEmailPreview] = useState(false);
  const [sendingBillId, setSendingBillId] = useState<string | null>(null);
  const [singlePayerEmail, setSinglePayerEmail] = useState('');
  const [singleSendEmail, setSingleSendEmail] = useState(true);

  // Creation forms
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newPayerName, setNewPayerName] = useState('');
  const [newPayerId, setNewPayerId] = useState('');
  const [newPayerGroupId, setNewPayerGroupId] = useState('');

  // UI helpers
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currencySymbol = baseCurrency === 'USD' ? '$' : baseCurrency === 'GBP' ? '£' : baseCurrency === 'EUR' ? '€' : '₦';

  const formatCurrency = (minor: number) => {
    return `${currencySymbol}${(minor / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial bills & catalog config
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [configRes, billsRes] = await Promise.all([
        fetch('/api/v1/billing/config', { headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName } }),
        fetch('/api/v1/bills', { headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName } }),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setGroups(configData.groups || []);
        setItems(configData.items || []);
        setPayers(configData.payers || []);
        if (configData.groups?.length > 0 && !batchGroupId) {
          setBatchGroupId(configData.groups[0].id);
        }
      }

      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setBills(billsData.bills || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [orgName]);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/pay/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    showToast('Payment link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleMarkPaid = async (billId: string) => {
    try {
      await fetch(`/api/v1/bills/${billId}/pay`, {
        method: 'POST',
        headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
      });
      setBills((prev) =>
        prev.map((b) => (b.id === billId ? { ...b, status: 'PAID', paidAt: new Date().toISOString() } : b))
      );
      showToast('Bill marked as PAID.');
    } catch {
      showToast('Error updating status.');
    }
  };

  const handleLoadTemplate = async (template: 'SCHOOL' | 'HOSPITAL' | 'COMPANY' | 'EMPTY') => {
    try {
      const res = await fetch('/api/v1/billing/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        body: JSON.stringify({ template }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setItems(data.items || []);
        setPayers(data.payers || []);
        showToast(`Loaded ${template} preset template!`);
      }
    } catch {
      showToast('Template load failed.');
    }
  };

  // Email Dispatch Handlers
  const handleSendInvoiceEmail = async (billId: string) => {
    try {
      setSendingBillId(billId);
      const res = await fetch(`/api/v1/bills/${billId}/send`, {
        method: 'POST',
        headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
      });
      if (res.ok) {
        const data = await res.json();
        setBills((prev) =>
          prev.map((b) =>
            b.id === billId
              ? {
                  ...b,
                  sentAt: data.bill?.sentAt || new Date().toISOString(),
                  sentCount: (b.sentCount || 0) + 1,
                  payerEmail: data.bill?.payerEmail || b.payerEmail,
                }
              : b
          )
        );
        showToast(`Invoice email dispatched to ${data.deliveredTo}!`);
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Email dispatch failed');
      }
    } catch {
      showToast('Email dispatch failed');
    } finally {
      setSendingBillId(null);
    }
  };

  const handlePreviewEmail = async (b: Bill) => {
    try {
      setIsLoadingEmailPreview(true);
      setIsEmailPreviewOpen(true);
      const res = await fetch(`/api/v1/bills/${b.id}/email-preview`, {
        headers: { Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
      });
      if (res.ok) {
        const data = await res.json();
        setEmailPreviewData({ ...data, bill: b });
      } else {
        showToast('Failed to load email preview');
      }
    } catch {
      showToast('Failed to load email preview');
    } finally {
      setIsLoadingEmailPreview(false);
    }
  };

  // Create Single Bill
  const handleCreateSingleBill = async (e: React.FormEvent) => {
    e.preventDefault();
    let payerName = manualPayerName.trim();
    let payerId: string | undefined = undefined;
    let groupId: string | undefined = undefined;
    let resolvedEmail = singlePayerEmail.trim();

    if (singlePayerMode === 'existing') {
      const foundPayer = payers.find((p) => p.id === selectedPayerId);
      if (foundPayer) {
        payerName = `${foundPayer.name} (${foundPayer.identifier})`;
        payerId = foundPayer.id;
        groupId = foundPayer.groupId;
        if (!resolvedEmail && foundPayer.email) {
          resolvedEmail = foundPayer.email;
        }
      }
    }

    if (!payerName) {
      showToast('Please specify a payer');
      return;
    }

    const billItems: BillItemLine[] = items
      .filter((item) => selectedItemIds.includes(item.id))
      .map((item) => ({
        itemId: item.id,
        description: item.name,
        amountMinor: item.defaultAmountMinor,
      }));

    if (customItemDesc.trim() && parseFloat(customItemAmount) > 0) {
      billItems.push({
        description: customItemDesc.trim(),
        amountMinor: Math.round(parseFloat(customItemAmount) * 100),
      });
    }

    if (billItems.length === 0) {
      showToast('Please select or add at least one fee item');
      return;
    }

    try {
      const res = await fetch('/api/v1/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        body: JSON.stringify({
          payerName,
          payerId,
          payerEmail: resolvedEmail || undefined,
          sendEmail: singleSendEmail,
          groupId,
          items: billItems,
          currency: baseCurrency,
          dueDate: singleDueDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBills([data.bill, ...bills]);
        setIsSingleModalOpen(false);
        setSelectedItemIds([]);
        setCustomItemDesc('');
        setCustomItemAmount('');
        setManualPayerName('');
        setSinglePayerEmail('');
        showToast(
          singleSendEmail && resolvedEmail
            ? `Invoice issued and dispatched via email to ${resolvedEmail}!`
            : `Invoice generated for ${payerName}!`
        );
      }
    } catch {
      showToast('Failed to create invoice');
    }
  };

  // Batch generate bills for whole group
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchGroupId) {
      showToast('Select a group');
      return;
    }
    if (batchItemIds.length === 0) {
      showToast('Select at least one fee item to assess');
      return;
    }

    try {
      const res = await fetch('/api/v1/bills/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        body: JSON.stringify({
          groupId: batchGroupId,
          itemIds: batchItemIds,
          dueDate: batchDueDate,
          currency: baseCurrency,
          sendEmails: batchSendEmails,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBills([...data.bills, ...bills]);
        setIsBatchModalOpen(false);
        setBatchItemIds([]);
        showToast(
          batchSendEmails
            ? `Batch completed: Generated & emailed ${data.count} invoices!`
            : `Batch completed: Generated ${data.count} invoices!`
        );
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.message || 'Batch generation failed');
      }
    } catch {
      showToast('Batch generation failed');
    }
  };

  // Open Cohort Pricing & Fees Modal
  const openCohortPricingModal = (g: PayerGroup) => {
    setActivePricingGroup(g);
    const linked = items
      .filter(
        (it) =>
          (g.linkedItemIds && g.linkedItemIds.includes(it.id)) ||
          (it.applicableGroupIds && it.applicableGroupIds.includes(g.id))
      )
      .map((it) => it.id);
    setPricingItemSelections(linked);

    const initialAmounts: Record<string, string> = {};
    for (const it of items) {
      const currentPriceMinor =
        g.customItemPrices?.[it.id] !== undefined
          ? g.customItemPrices[it.id]
          : it.groupPrices?.[g.id] !== undefined
          ? it.groupPrices[g.id]
          : it.defaultAmountMinor;
      initialAmounts[it.id] = (currentPriceMinor / 100).toString();
    }
    setPricingItemAmounts(initialAmounts);
    setIsCohortPricingModalOpen(true);
  };

  // Quick Bill Cohort
  const handleQuickBillCohort = (g: PayerGroup) => {
    setBatchGroupId(g.id);
    const linked = items
      .filter(
        (it) =>
          (g.linkedItemIds && g.linkedItemIds.includes(it.id)) ||
          (it.applicableGroupIds && it.applicableGroupIds.includes(g.id))
      )
      .map((it) => it.id);
    setBatchItemIds(linked.length > 0 ? linked : items.map((it) => it.id));
    setIsBatchModalOpen(true);
  };

  // Save Cohort Pricing & Fee links
  const handleSaveCohortPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePricingGroup) return;

    const customPricesMinor: Record<string, number> = {};
    for (const itemId of pricingItemSelections) {
      const entered = parseFloat(pricingItemAmounts[itemId]);
      if (!isNaN(entered) && entered >= 0) {
        customPricesMinor[itemId] = Math.round(entered * 100);
      }
    }

    try {
      const res = await fetch(`/api/v1/billing/groups/${activePricingGroup.id}/link-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer clerk_token',
          'x-org-id': orgName,
        },
        body: JSON.stringify({
          itemIds: pricingItemSelections,
          customItemPrices: customPricesMinor,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGroups(groups.map((g) => (g.id === activePricingGroup.id ? data.group : g)));
        if (data.items) {
          setItems(data.items);
        }
        setIsCohortPricingModalOpen(false);
        showToast(`Saved fees and custom pricing for ${activePricingGroup.name}!`);
      } else {
        showToast('Failed to save cohort pricing');
      }
    } catch {
      showToast('Failed to save cohort pricing');
    }
  };

  // Add new group
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch('/api/v1/billing/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        body: JSON.stringify({ name: newGroupName.trim(), code: newGroupCode.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups([...groups, data.group]);
        setNewGroupName('');
        setNewGroupCode('');
        setIsGroupModalOpen(false);
        showToast('Group added successfully');
      }
    } catch {
      showToast('Failed to add group');
    }
  };

  // Add new fee item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newItemAmount);
    if (!newItemName.trim() || isNaN(amountVal)) return;

    try {
      const res = await fetch('/api/v1/billing/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        body: JSON.stringify({
          name: newItemName.trim(),
          category: newItemCategory.trim() || 'General',
          defaultAmountMinor: Math.round(amountVal * 100),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems([...items, data.item]);
        setNewItemName('');
        setNewItemCategory('');
        setNewItemAmount('');
        setIsItemModalOpen(false);
        showToast('Fee item added to catalog');
      }
    } catch {
      showToast('Failed to add item');
    }
  };

  // Add new payer
  const handleAddPayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayerName.trim() || !newPayerId.trim() || !newPayerGroupId) return;

    try {
      const res = await fetch('/api/v1/billing/payers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer clerk_token', 'x-org-id': orgName },
        body: JSON.stringify({
          name: newPayerName.trim(),
          identifier: newPayerId.trim(),
          groupId: newPayerGroupId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPayers([...payers, data.payer]);
        setNewPayerName('');
        setNewPayerId('');
        setIsPayerModalOpen(false);
        showToast('Payer enrolled successfully');
      }
    } catch {
      showToast('Failed to add payer');
    }
  };

  // Filter bills
  const filteredBills = bills.filter((b) => {
    const matchesGroup = filterGroup === 'all' || b.groupId === filterGroup;
    const matchesSearch =
      b.payerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.items.some((i) => i.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            padding: '12px 20px',
            background: '#191c26',
            borderColor: '#38bdf8',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          <CheckCircle2 size={16} color="#38bdf8" />
          <span style={{ fontSize: '0.88rem' }}>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls Bar: Sub-Tabs & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Navigation Sub-Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#141720',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #282d3d',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setSubTab('invoices')}
            className={`btn ${subTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.84rem', border: 'none' }}
          >
            <Receipt size={15} /> Invoices ({bills.length})
          </button>
          <button
            onClick={() => setSubTab('catalog')}
            className={`btn ${subTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.84rem', border: 'none' }}
          >
            <Layers size={15} /> Fee Catalog ({items.length})
          </button>
          <button
            onClick={() => setSubTab('payers')}
            className={`btn ${subTab === 'payers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.84rem', border: 'none' }}
          >
            <Users size={15} /> Cohorts & Payers ({payers.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {subTab === 'invoices' && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setIsBatchModalOpen(true)}
                style={{ padding: '9px 18px', fontSize: '0.84rem' }}
                title="Generate invoices for an entire group at once"
              >
                <Zap size={14} color="#38bdf8" />
                <span>Batch Bill Cohort</span>
              </button>

              <button
                className="btn btn-primary"
                onClick={() => setIsSingleModalOpen(true)}
                style={{ padding: '9px 18px', fontSize: '0.84rem' }}
              >
                <Plus size={15} />
                <span>Create Invoice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: INVOICES
          ========================================================================= */}
      {subTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search payer, invoice #, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-obsidian"
                  style={{ paddingLeft: '38px', paddingRight: '12px', fontSize: '0.85rem' }}
                />
              </div>

              {groups.length > 0 && (
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="select-obsidian"
                  style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Groups ({groups.length})</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quick Template Switcher Note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#8b94a7' }}>Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadTemplate('SCHOOL')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                School
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('HOSPITAL')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                Hospital
              </button>
              <button
                type="button"
                onClick={() => handleLoadTemplate('COMPANY')}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                Company
              </button>
            </div>
          </div>

          {/* Invoices Table / Empty State */}
          {filteredBills.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '56px 20px',
                color: '#8b94a7',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                background: 'rgba(25, 28, 38, 0.4)',
              }}
            >
              <Receipt size={36} color="#38bdf8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                No Invoices Issued Yet
              </h3>
              <p style={{ fontSize: '0.84rem', maxWidth: '380px', margin: '0 auto 20px', color: '#8b94a7', lineHeight: 1.5 }}>
                Issue individual invoices or batch bill an entire cohort (like Grade 1 students) with 1 click.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsBatchModalOpen(true)}
                  style={{ fontSize: '0.84rem' }}
                >
                  <Zap size={14} color="#38bdf8" /> Batch Bill Cohort
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsSingleModalOpen(true)}
                  style={{ fontSize: '0.84rem' }}
                >
                  <Plus size={14} /> Create Invoice
                </button>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <table className="table-obsidian">
                <thead>
                  <tr>
                    <th>INVOICE #</th>
                    <th>PAYER & COHORT</th>
                    <th>BILL ITEMS</th>
                    <th>DUE DATE</th>
                    <th>STATUS</th>
                    <th>EMAIL</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((b) => (
                    <tr key={b.id}>
                      <td className="mono-figure" style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.82rem' }}>
                        {b.id}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>{b.payerName}</div>
                        {b.payerEmail && (
                          <div style={{ fontSize: '0.74rem', color: '#8b94a7', marginTop: '2px' }}>
                            {b.payerEmail}
                          </div>
                        )}
                        {b.groupName && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginTop: '3px' }}>
                            {b.groupName}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                          {b.items.map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#191c26',
                                border: '1px solid #282d3d',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                fontSize: '0.74rem',
                                color: '#cbd5e1',
                              }}
                            >
                              {it.description} ({formatCurrency(it.amountMinor)})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: '#8b94a7', fontSize: '0.82rem' }}>{b.dueDate}</td>
                      <td>
                        {b.status === 'PAID' ? (
                          <span className="badge badge-emerald">PAID</span>
                        ) : (
                          <span className="badge badge-cyan">PENDING</span>
                        )}
                      </td>
                      <td>
                        {b.sentAt ? (
                          <span
                            className="badge badge-emerald"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                            title={`Dispatched to ${b.payerEmail || 'payer'} on ${new Date(b.sentAt).toLocaleString()}`}
                          >
                            <MailCheck size={12} /> Sent ({b.sentCount || 1}x)
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            Not Sent
                          </span>
                        )}
                      </td>
                      <td className="mono-figure" style={{ textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                        {formatCurrency(b.totalAmountMinor)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleSendInvoiceEmail(b.id)}
                            disabled={sendingBillId === b.id}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                            title="Send invoice via email to payer"
                          >
                            <Send size={13} color="#38bdf8" />
                            <span>{sendingBillId === b.id ? 'Sending...' : b.sentAt ? 'Resend' : 'Send'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePreviewEmail(b)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                            title="Preview branded invoice email"
                          >
                            <Eye size={13} color="#94a3b8" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(b.token)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                            title="Copy payment link"
                          >
                            {copiedToken === b.token ? <Check size={13} color="#38bdf8" /> : <Copy size={13} />}
                            <span>{copiedToken === b.token ? 'Copied' : 'Link'}</span>
                          </button>

                          <a
                            href={`/pay/${b.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center' }}
                            title="Open public checkout in new tab"
                          >
                            <ExternalLink size={13} />
                          </a>

                          {b.status !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(b.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.74rem', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                              title="Mark as paid"
                            >
                              <CheckCircle2 size={13} color="#38bdf8" />
                              <span>Mark Paid</span>
                            </button>
                          )}
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

      {/* =========================================================================
          VIEW 2: FEE CATALOG
          ========================================================================= */}
      {subTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Billable Fee & Service Catalog
              </h2>
              <p style={{ color: '#8b94a7', fontSize: '0.82rem', margin: '2px 0 0' }}>
                Predefined items and prices applied to invoices and batch student billing
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsItemModalOpen(true)}>
              <Plus size={15} /> Add Fee Item
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {items.map((item) => (
              <div key={item.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="badge badge-cyan">{item.category}</span>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px' }}>
                    {item.name}
                  </h3>
                </div>
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#8b94a7' }}>Baseline Standard:</span>
                    <span className="mono-figure" style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                      {formatCurrency(item.defaultAmountMinor)}
                    </span>
                  </div>

                  {item.groupPrices && Object.keys(item.groupPrices).length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#8b94a7', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Cohort Pricing:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(item.groupPrices).map(([gid, price]) => {
                          const grp = groups.find((g) => g.id === gid);
                          return (
                            <div key={gid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                              <span style={{ color: '#cbd5e1' }}>{grp?.name || gid}:</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                                {formatCurrency(price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: COHORTS & PAYERS
          ========================================================================= */}
      {subTab === 'payers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section: Groups / Cohorts */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Cohorts / Target Groups
                </h2>
                <p style={{ color: '#8b94a7', fontSize: '0.8rem', margin: '2px 0 0' }}>
                  Classes, wards, or tenant segments used to batch bill groups of payers
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setIsGroupModalOpen(true)} style={{ fontSize: '0.82rem' }}>
                <FolderPlus size={14} /> Add Group
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {groups.map((g) => {
                const count = payers.filter((p) => p.groupId === g.id).length;
                const linkedItems = items.filter(
                  (it) =>
                    (g.linkedItemIds && g.linkedItemIds.includes(it.id)) ||
                    (it.applicableGroupIds && it.applicableGroupIds.includes(g.id))
                );

                const cohortTotalMinor = linkedItems.reduce((sum, it) => {
                  const price =
                    g.customItemPrices?.[it.id] !== undefined
                      ? g.customItemPrices[it.id]
                      : it.groupPrices?.[g.id] !== undefined
                      ? it.groupPrices[g.id]
                      : it.defaultAmountMinor;
                  return sum + price;
                }, 0);

                return (
                  <div key={g.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-neutral">{g.code || 'GRP'}</span>
                        <span style={{ fontSize: '0.78rem', color: '#8b94a7' }}>{count} enrolled</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem' }}>{g.name}</div>
                      {g.description && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0' }}>{g.description}</p>}

                      {/* Linked Fees for this Cohort */}
                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#8b94a7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Assigned Fees ({linkedItems.length})
                          </span>
                          <span className="mono-figure" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8' }}>
                            {formatCurrency(cohortTotalMinor)} / term
                          </span>
                        </div>

                        {linkedItems.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                            No fee items assigned yet
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {linkedItems.map((it) => {
                              const price =
                                g.customItemPrices?.[it.id] !== undefined
                                  ? g.customItemPrices[it.id]
                                  : it.groupPrices?.[g.id] !== undefined
                                  ? it.groupPrices[g.id]
                                  : it.defaultAmountMinor;
                              return (
                                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                                  <span style={{ color: '#cbd5e1' }}>{it.name}</span>
                                  <span style={{ fontFamily: 'monospace', color: '#f8fafc', fontWeight: 600 }}>
                                    {formatCurrency(price)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions: Configure Fees & Bill Cohort */}
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => openCohortPricingModal(g)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        title="Configure assigned fees and custom cohort pricing"
                      >
                        <Settings2 size={13} />
                        <span>Set Fees</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickBillCohort(g)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '7px 10px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        title="Generate invoices for all payers in this cohort"
                      >
                        <Zap size={13} />
                        <span>Bill Cohort</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Enrolled Payers */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Enrolled Payers ({payers.length})
                </h2>
                <p style={{ color: '#8b94a7', fontSize: '0.8rem', margin: '2px 0 0' }}>
                  Students, patients, or clients registered to receive invoices
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsPayerModalOpen(true)} style={{ fontSize: '0.82rem' }}>
                <UserPlus size={14} /> Enroll Payer
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="table-obsidian">
                <thead>
                  <tr>
                    <th>IDENTIFIER / ID</th>
                    <th>NAME</th>
                    <th>ASSIGNED GROUP</th>
                    <th>CONTACT EMAIL</th>
                  </tr>
                </thead>
                <tbody>
                  {payers.map((p) => {
                    const grp = groups.find((g) => g.id === p.groupId);
                    return (
                      <tr key={p.id}>
                        <td className="mono-figure" style={{ color: '#38bdf8', fontWeight: 600 }}>{p.identifier}</td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>{p.name}</td>
                        <td>
                          <span className="badge badge-neutral">{grp?.name || p.groupId}</span>
                        </td>
                        <td style={{ color: '#8b94a7', fontSize: '0.82rem' }}>{p.email || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE SINGLE INVOICE
          ========================================================================= */}
      {isSingleModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsSingleModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '540px', padding: '28px', background: '#141720' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Create Individual Invoice
              </h3>
              <button
                type="button"
                onClick={() => setIsSingleModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#8b94a7', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSingleBill} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-obsidian">Select Payer Mode</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSinglePayerMode('existing')}
                    className={`btn ${singlePayerMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.8rem', flex: 1 }}
                  >
                    Enrolled Payer
                  </button>
                  <button
                    type="button"
                    onClick={() => setSinglePayerMode('new')}
                    className={`btn ${singlePayerMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 14px', fontSize: '0.8rem', flex: 1 }}
                  >
                    Custom Name
                  </button>
                </div>

                {singlePayerMode === 'existing' ? (
                  <select
                    className="select-obsidian"
                    value={selectedPayerId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setSelectedPayerId(pid);
                      const p = payers.find((item) => item.id === pid);
                      if (p?.email) setSinglePayerEmail(p.email);
                    }}
                    required
                  >
                    <option value="">Select Enrolled Payer / Student...</option>
                    {payers.map((p) => {
                      const g = groups.find((grp) => grp.id === p.groupId);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.identifier}) - {g?.name || 'Group'} {p.email ? `• ${p.email}` : ''}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe (Grade 1)"
                    className="input-obsidian"
                    value={manualPayerName}
                    onChange={(e) => setManualPayerName(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="label-obsidian">Recipient Email (for invoice dispatch)</label>
                <input
                  type="email"
                  placeholder="parent@school.com or student@domain.com"
                  className="input-obsidian"
                  value={singlePayerEmail}
                  onChange={(e) => setSinglePayerEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label-obsidian">Select Billable Items</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {items.map((it) => {
                    const isChecked = selectedItemIds.includes(it.id);
                    return (
                      <label
                        key={it.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: isChecked ? 'rgba(56, 189, 248, 0.08)' : '#191c26',
                          border: `1px solid ${isChecked ? '#38bdf8' : '#282d3d'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedItemIds([...selectedItemIds, it.id]);
                              else setSelectedItemIds(selectedItemIds.filter((id) => id !== it.id));
                            }}
                          />
                          <span style={{ fontSize: '0.86rem', color: '#f8fafc', fontWeight: 500 }}>{it.name}</span>
                        </div>
                        <span className="mono-figure" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8' }}>
                          {formatCurrency(it.defaultAmountMinor)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label-obsidian">Payment Due Date</label>
                <input
                  type="date"
                  required
                  className="input-obsidian"
                  value={singleDueDate}
                  onChange={(e) => setSingleDueDate(e.target.value)}
                />
              </div>

              {/* Automatic Email Dispatch Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(56, 189, 248, 0.06)',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={singleSendEmail}
                  onChange={(e) => setSingleSendEmail(e.target.checked)}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                    Send invoice email immediately upon issuance
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#8b94a7' }}>
                    Dispatches branded email with itemized fees and 1-click Korapay payment link
                  </div>
                </div>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSingleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate & Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: BATCH BILL COHORT / GROUP
          ========================================================================= */}
      {isBatchModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsBatchModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '560px', padding: '28px', background: '#141720' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Batch Bill Cohort / Class
                </h3>
                <p style={{ color: '#8b94a7', fontSize: '0.8rem', margin: '2px 0 0' }}>
                  Generate tokenized invoices for every student/payer in a group
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#8b94a7', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-obsidian">Target Group / Class</label>
                <select
                  className="select-obsidian"
                  value={batchGroupId}
                  onChange={(e) => {
                    const newGid = e.target.value;
                    setBatchGroupId(newGid);
                    const grp = groups.find((g) => g.id === newGid);
                    if (grp) {
                      const linked = items
                        .filter(
                          (it) =>
                            (grp.linkedItemIds && grp.linkedItemIds.includes(it.id)) ||
                            (it.applicableGroupIds && it.applicableGroupIds.includes(grp.id))
                        )
                        .map((it) => it.id);
                      if (linked.length > 0) {
                        setBatchItemIds(linked);
                      }
                    }
                  }}
                  required
                >
                  {groups.map((g) => {
                    const count = payers.filter((p) => p.groupId === g.id).length;
                    return (
                      <option key={g.id} value={g.id}>
                        {g.name} ({count} payers enrolled)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="label-obsidian">Select Bill Items to Assess</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {items.map((it) => {
                    const isChecked = batchItemIds.includes(it.id);
                    const selectedGroup = groups.find((g) => g.id === batchGroupId);
                    const itemPrice =
                      selectedGroup?.customItemPrices?.[it.id] !== undefined
                        ? selectedGroup.customItemPrices[it.id]
                        : it.groupPrices?.[batchGroupId] !== undefined
                        ? it.groupPrices[batchGroupId]
                        : it.defaultAmountMinor;
                    const hasCustomPrice =
                      selectedGroup?.customItemPrices?.[it.id] !== undefined ||
                      it.groupPrices?.[batchGroupId] !== undefined;

                    return (
                      <label
                        key={it.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: isChecked ? 'rgba(56, 189, 248, 0.08)' : '#191c26',
                          border: `1px solid ${isChecked ? '#38bdf8' : '#282d3d'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setBatchItemIds([...batchItemIds, it.id]);
                              else setBatchItemIds(batchItemIds.filter((id) => id !== it.id));
                            }}
                          />
                          <div>
                            <span style={{ fontSize: '0.86rem', color: '#f8fafc', fontWeight: 500 }}>{it.name}</span>
                            <div style={{ fontSize: '0.72rem', color: '#8b94a7' }}>Category: {it.category}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="mono-figure" style={{ fontSize: '0.86rem', fontWeight: 700, color: '#38bdf8' }}>
                            {formatCurrency(itemPrice)}
                          </span>
                          {hasCustomPrice && (
                            <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>
                              {selectedGroup?.name} Rate
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Real-time cohort calculation preview */}
              {(() => {
                const selectedGroup = groups.find((g) => g.id === batchGroupId);
                if (!selectedGroup) return null;
                const perStudentTotal = batchItemIds.reduce((sum, id) => {
                  const it = items.find((i) => i.id === id);
                  if (!it) return sum;
                  const price =
                    selectedGroup.customItemPrices?.[it.id] !== undefined
                      ? selectedGroup.customItemPrices[it.id]
                      : it.groupPrices?.[batchGroupId] !== undefined
                      ? it.groupPrices[batchGroupId]
                      : it.defaultAmountMinor;
                  return sum + price;
                }, 0);
                const cohortStudentCount = payers.filter((p) => p.groupId === batchGroupId).length;
                const totalBatchAmount = perStudentTotal * cohortStudentCount;

                return (
                  <div style={{ background: '#191c26', padding: '14px 18px', borderRadius: '12px', border: '1px solid #282d3d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#8b94a7', marginBottom: '6px' }}>
                      <span>Fee per student ({selectedGroup.name}):</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f8fafc' }}>
                        {formatCurrency(perStudentTotal)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8' }}>
                      <span>Total Batch Assessment ({cohortStudentCount} enrolled):</span>
                      <span style={{ fontFamily: 'monospace' }}>
                        {formatCurrency(totalBatchAmount)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="label-obsidian">Due Date</label>
                <input
                  type="date"
                  required
                  className="input-obsidian"
                  value={batchDueDate}
                  onChange={(e) => setBatchDueDate(e.target.value)}
                />
              </div>

              {/* Automatic Email Dispatch Toggle for Batch */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(56, 189, 248, 0.06)',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={batchSendEmails}
                  onChange={(e) => setBatchSendEmails(e.target.checked)}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                    Email invoice & Korapay link to each enrolled payer
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#8b94a7' }}>
                    Dispatches personalized invoice emails with grade-specific pricing directly to student/parent inboxes
                  </div>
                </div>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBatchModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Zap size={14} /> Run Batch Invoicing & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ADD GROUP / COHORT
          ========================================================================= */}
      {isGroupModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '440px', padding: '28px', background: '#141720' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              Add Payer Cohort / Group
            </h3>
            <form onSubmit={handleAddGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-obsidian">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 1, Ward B, Block A"
                  className="input-obsidian"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="label-obsidian">Code / Abbreviation</label>
                <input
                  type="text"
                  placeholder="e.g. G1, WB, BLK-A"
                  className="input-obsidian"
                  value={newGroupCode}
                  onChange={(e) => setNewGroupCode(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsGroupModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: ADD FEE ITEM
          ========================================================================= */}
      {isItemModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsItemModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '440px', padding: '28px', background: '#141720' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              Add Fee Item to Catalog
            </h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-obsidian">Fee / Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Laboratory Practicals"
                  className="input-obsidian"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div>
                <label className="label-obsidian">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Tuition, Lab, Materials, Medical"
                  className="input-obsidian"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="label-obsidian">Standard Amount ({currencySymbol})</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  placeholder="25000"
                  className="input-obsidian"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsItemModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: ENROLL PAYER
          ========================================================================= */}
      {isPayerModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsPayerModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '440px', padding: '28px', background: '#141720' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              Enroll Payer / Student
            </h3>
            <form onSubmit={handleAddPayer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-obsidian">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adaobi Eze"
                  className="input-obsidian"
                  value={newPayerName}
                  onChange={(e) => setNewPayerName(e.target.value)}
                />
              </div>
              <div>
                <label className="label-obsidian">Unique Identifier / ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-2026-001 or PAT-102"
                  className="input-obsidian"
                  value={newPayerId}
                  onChange={(e) => setNewPayerId(e.target.value)}
                />
              </div>
              <div>
                <label className="label-obsidian">Assign to Group / Cohort</label>
                <select
                  required
                  className="select-obsidian"
                  value={newPayerGroupId}
                  onChange={(e) => setNewPayerGroupId(e.target.value)}
                >
                  <option value="">Select Group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPayerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Enroll Payer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: CONFIGURE COHORT FEES & PRICING
          ========================================================================= */}
      {isCohortPricingModalOpen && activePricingGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsCohortPricingModalOpen(false)}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '580px', padding: '28px', background: '#141720', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-cyan">{activePricingGroup.code || 'GRP'}</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Configure Fees for {activePricingGroup.name}
                  </h3>
                </div>
                <p style={{ color: '#8b94a7', fontSize: '0.82rem', margin: 0 }}>
                  Select which fees apply to this cohort and customize the exact amounts students in this cohort owe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCohortPricingModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#8b94a7', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCohortPricing} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#8b94a7', fontSize: '0.85rem' }}>
                    No fee categories exist yet. Add fee items to the catalog first.
                  </div>
                ) : (
                  items.map((it) => {
                    const isChecked = pricingItemSelections.includes(it.id);
                    const defaultAmountMajor = (it.defaultAmountMinor / 100).toLocaleString();
                    const currentAmountVal = pricingItemAmounts[it.id] ?? (it.defaultAmountMinor / 100).toString();

                    return (
                      <div
                        key={it.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: isChecked ? 'rgba(56, 189, 248, 0.04)' : '#191c26',
                          border: `1px solid ${isChecked ? 'rgba(56, 189, 248, 0.3)' : '#282d3d'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPricingItemSelections([...pricingItemSelections, it.id]);
                                } else {
                                  setPricingItemSelections(pricingItemSelections.filter((id) => id !== it.id));
                                }
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>{it.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#8b94a7' }}>
                                Category: {it.category} • Default Baseline: {currencySymbol}{defaultAmountMajor}
                              </div>
                            </div>
                          </label>
                        </div>

                        {isChecked && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '26px' }}>
                            <label style={{ fontSize: '0.78rem', color: '#8b94a7', whiteSpace: 'nowrap' }}>
                              Amount for {activePricingGroup.name}:
                            </label>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8b94a7', fontSize: '0.85rem' }}>
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                required
                                min="0"
                                step="any"
                                value={currentAmountVal}
                                onChange={(e) =>
                                  setPricingItemAmounts({
                                    ...pricingItemAmounts,
                                    [it.id]: e.target.value,
                                  })
                                }
                                className="input-obsidian"
                                style={{ paddingLeft: '26px', fontSize: '0.85rem', height: '36px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Live Cohort Total Preview */}
              <div
                style={{
                  background: '#191c26',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid #282d3d',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8b94a7', textTransform: 'uppercase' }}>
                    Total Fees Per Student in {activePricingGroup.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {pricingItemSelections.length} bill items assigned
                  </div>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
                  {formatCurrency(
                    pricingItemSelections.reduce((sum, id) => {
                      const entered = parseFloat(pricingItemAmounts[id]);
                      return sum + (!isNaN(entered) ? Math.round(entered * 100) : 0);
                    }, 0)
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCohortPricingModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Cohort Fees & Pricing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EMAIL PREVIEW
          ========================================================================= */}
      {isEmailPreviewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsEmailPreviewOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '0',
              background: '#141720',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #282d3d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#191c26',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Invoice Email Preview
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#8b94a7' }}>
                    {emailPreviewData?.bill ? `Recipient: ${emailPreviewData.bill.payerName} (${emailPreviewData.bill.payerEmail || 'Email pending'})` : 'Loading...'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {emailPreviewData?.bill && (
                  <button
                    type="button"
                    onClick={() => {
                      if (emailPreviewData?.bill) {
                        handleSendInvoiceEmail(emailPreviewData.bill.id);
                        setIsEmailPreviewOpen(false);
                      }
                    }}
                    disabled={sendingBillId === emailPreviewData.bill.id}
                    className="btn btn-primary"
                    style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                  >
                    <Send size={13} />
                    <span>{sendingBillId === emailPreviewData.bill.id ? 'Sending...' : 'Send This Email'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#8b94a7', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Email Meta bar */}
            {emailPreviewData && (
              <div style={{ padding: '12px 24px', background: '#12141c', borderBottom: '1px solid #282d3d', fontSize: '0.82rem', color: '#8b94a7' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#64748b' }}>Subject:</span>
                  <span style={{ color: '#f8fafc', fontWeight: 500 }}>{emailPreviewData.subject}</span>
                </div>
              </div>
            )}

            {/* Email Preview Frame */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#0a0d14' }}>
              {isLoadingEmailPreview ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b94a7' }}>
                  <div className="spinner" style={{ margin: '0 auto 14px' }} />
                  <div>Generating responsive email template...</div>
                </div>
              ) : emailPreviewData?.html ? (
                <iframe
                  title="Invoice Email Preview"
                  srcDoc={emailPreviewData.html}
                  style={{
                    width: '100%',
                    minHeight: '480px',
                    border: 'none',
                    borderRadius: '12px',
                    background: '#0a0d14',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8b94a7' }}>
                  No preview available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
