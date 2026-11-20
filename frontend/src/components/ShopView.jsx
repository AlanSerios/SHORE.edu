import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, Banknote, CheckCircle2, Cookie, Crown, CupSoda, Edit3, Flame,
  Gift, Hexagon, Info, Loader2, PenTool, Plus, Shield, ShoppingBag, Smartphone,
  Soup, Sparkles, StickyNote, Trash2, Waves, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageShell } from './ui/page';

const ICONS = {
  Banknote, Cookie, Crown, CupSoda, Flame, Gift, Hexagon, PenTool,
  Shield, ShoppingBag, Smartphone, Soup, Sparkles, StickyNote, Waves,
};

const BUILT_IN_IDS = new Set(['1', '2', '3', '4', '5', '6', 'border_fire', 'border_cyber', 'border_gold', 'border_shore', 'border_nebula']);

const COIN_IMAGE = '/shore-coin.png';

function CoinAmount({ amount, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${className}`}>
      <img src={COIN_IMAGE} alt="" className="h-5 w-5" />
      {Number(amount || 0).toLocaleString()} <span className="font-normal">coins</span>
    </span>
  );
}

function RewardArt({ item, large = false }) {
  const Icon = ICONS[item.iconType] || Gift;

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-slate-100/70 ${large ? 'h-48' : 'w-28 shrink-0 sm:h-36 sm:w-full'}`}>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className={`${large ? 'max-h-40 max-w-[75%]' : 'max-h-24 max-w-20 sm:max-h-28 sm:max-w-[72%]'} object-contain`} style={{ imageRendering: 'pixelated' }} />
      ) : (
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-blue-50 text-primary">
          <Icon className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default function ShopView({ userEmail, userRole }) {
  const isAdmin = userRole === 'admin';
  const [inventory, setInventory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [ownedBorders, setOwnedBorders] = useState([]);
  const [equippedBorder, setEquippedBorder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [receiptItem, setReceiptItem] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [equippingId, setEquippingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editInventory, setEditInventory] = useState([]);
  const [savingInventory, setSavingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const modalOpen = Boolean(selectedItem || receiptItem || isEditing);
  const hasInventoryDraft = editInventory.length > 0 && JSON.stringify(editInventory) !== JSON.stringify(inventory);

  useEffect(() => {
    loadShop({ initial: true });
  }, [userEmail]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isPurchasing && !savingInventory) closeModal();

      if (event.key === 'Tab') {
        const dialog = document.querySelector('[role="dialog"]');
        const controls = [...(dialog?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)') || [])];
        const first = controls[0];
        const last = controls[controls.length - 1];

        if (!first) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [modalOpen, isPurchasing, savingInventory]);

  const loadShop = async ({ initial = false } = {}) => {
    if (initial) setLoading(true);

    if (initial) setLoadError('');

    try {
      const responses = await Promise.all([
        fetch('/api/attendance'), fetch('/api/recitations'), fetch('/api/inventory'),
        fetch('/api/purchases'), fetch('/api/users'),
      ]);

      if (responses.some((response) => !response.ok)) throw new Error('Shop information is unavailable.');

      const [attendanceData, recitationsData, inventoryData, purchasesData, usersData] = await Promise.all(responses.map((response) => response.json()));
      const items = Array.isArray(inventoryData.inventory) ? inventoryData.inventory : [];
      const currentUser = (usersData.users || []).find((user) => user.email === userEmail);
      const checkIns = (attendanceData.attendance || []).filter((entry) => entry.email === userEmail && entry.type === 'Time In').length;
      const recitationPoints = (recitationsData.recitations || []).filter((entry) => entry.studentEmail === userEmail).reduce((sum, entry) => sum + Number(entry.score || 0), 0);
      const spent = (purchasesData.purchases || []).filter((purchase) => purchase.studentEmail === userEmail).reduce((sum, purchase) => sum + Number(purchase.price || 0), 0);

      setInventory(items);
      setBalance(Math.max(0, checkIns * 10 + recitationPoints * 5 - spent));
      setOwnedBorders(currentUser?.ownedBorders || []);
      setEquippedBorder(currentUser?.equippedBorder || null);
      setLoadError('');

      return true;
    } catch {
      if (initial) setLoadError('We could not load the rewards shop. Check your connection and try again.');

      return false;
    } finally {
      if (initial) setLoading(false);
    }
  };

  const openItem = (item, event) => {
    openerRef.current = event.currentTarget;
    setSelectedItem(item);
  };

  const openInventory = (event) => {
    openerRef.current = event.currentTarget;

    if (!hasInventoryDraft) setEditInventory(inventory.map((item) => ({ ...item })));
    setInventoryError('');
    setIsEditing(true);
  };

  const closeModal = () => {
    if (isPurchasing || savingInventory) return;
    setSelectedItem(null);
    setReceiptItem(null);
    setIsEditing(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  const confirmPurchase = async () => {
    const item = selectedItem;

    if (!item || isPurchasing) return;

    if (!isAdmin && balance < Number(item.price)) return;

    setIsPurchasing(true);

    try {
      const response = await fetch('/api/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, itemId: item.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) throw new Error(data.error || 'Redemption failed. Please try again.');

      setInventory((current) => current.map((entry) => String(entry.id) === String(item.id) ? { ...entry, stock: Math.max(0, Number(entry.stock) - 1) } : entry));
      setBalance((current) => Math.max(0, current - Number(item.price)));

      if (item.itemType === 'border') setOwnedBorders((current) => [...new Set([...current, item.id])]);
      setSelectedItem(null);
      setReceiptItem(item);
      loadShop();
    } catch (error) {
      toast.error(error.message || 'Redemption failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const equipBorder = async (item) => {
    if (equippingId) return;
    setEquippingId(item.id);

    try {
      const response = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, borderId: item.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) throw new Error(data.error || 'Could not equip this border.');

      setEquippedBorder(item.id);
      toast.success('Avatar border equipped.');
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Could not equip this border.');
    } finally {
      setEquippingId(null);
    }
  };

  const updateEditItem = (id, field, value) => {
    setEditInventory((current) => current.map((item) => String(item.id) === String(id) ? { ...item, [field]: value } : item));
    setInventoryError('');
  };

  const addEditItem = () => {
    setEditInventory((current) => [...current, {
      id: `custom_${Date.now()}`,
      name: '',
      price: 100,
      stock: 10,
      iconType: 'Gift',
    }]);
  };

  const saveInventory = async () => {
    const invalid = editInventory.some((item) => !String(item.name || '').trim()
      || item.price === '' || item.stock === ''
      || !Number.isInteger(Number(item.price)) || Number(item.price) < 0
      || !Number.isInteger(Number(item.stock)) || Number(item.stock) < 0);

    if (invalid) {
      setInventoryError('Each reward needs a name, a whole-number price, and a stock count of zero or more.');

      return;
    }

    const cleaned = editInventory.map((item) => ({ ...item, name: item.name.trim(), price: Number(item.price), stock: Number(item.stock) }));
    setSavingInventory(true);
    setInventoryError('');

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) throw new Error(data.error || 'Could not save inventory.');

      setInventory(cleaned);
      setEditInventory(cleaned.map((item) => ({ ...item })));
      setIsEditing(false);
      requestAnimationFrame(() => openerRef.current?.focus());
      toast.success('Inventory updated.');
    } catch (error) {
      setInventoryError(error.message || 'Could not save inventory. Try again.');
    } finally {
      setSavingInventory(false);
    }
  };

  const physicalItems = inventory.filter((item) => item.itemType !== 'border');
  const borderItems = inventory.filter((item) => item.itemType === 'border');

  const renderItem = (item) => {
    const isBorder = item.itemType === 'border';
    const isOwned = isBorder && ownedBorders.some((id) => String(id) === String(item.id));
    const isEquipped = isBorder && String(equippedBorder) === String(item.id);
    const shortfall = Math.max(0, Number(item.price) - balance);

    return (
      <li key={item.id}>
        <article className="flex h-full overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-md sm:flex-col">
          <RewardArt item={item} />
          <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold leading-snug text-fg">{item.name}</h3>
              {isEquipped && <span className="shrink-0 text-xs font-semibold text-primary">Equipped</span>}
            </div>
            <p className="mt-1 text-xs text-muted">{isBorder ? 'Avatar border' : Number(item.stock) > 0 ? `${item.stock} available` : 'Out of stock'}</p>
            <div className="mt-auto pt-2 sm:pt-5">
              <CoinAmount amount={item.price} className="text-sm text-fg" />
              <p className="mt-1 min-h-5 text-xs text-muted">
                {isOwned ? 'Already yours' : !isAdmin && shortfall > 0 ? `Need ${shortfall.toLocaleString()} more coins` : ' '}
              </p>
              <button type="button" onClick={(event) => openItem(item, event)} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary px-2 text-sm font-semibold text-primary transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:mt-3 sm:px-3">
                {isOwned ? 'View border' : 'View reward'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </article>
      </li>
    );
  };

  if (loading) return (
    <PageShell width="default" aria-busy="true" contentClassName="space-y-5">
      <div className="h-10 w-48 animate-pulse rounded bg-border/70 motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((number) => <div key={number} className="h-72 animate-pulse rounded-xl border border-border bg-white motion-reduce:animate-none" />)}
      </div>
    </PageShell>
  );

  if (loadError) return (
    <PageShell width="default" contentClassName="grid min-h-[55vh] place-items-center" role="alert">
      <div className="max-w-sm text-center">
        <ShoppingBag className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-xl font-bold text-fg">Rewards are unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{loadError}</p>
        <button type="button" onClick={() => loadShop({ initial: true })} className="mt-5 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white">Try again</button>
      </div>
    </PageShell>
  );

  return (
    <PageShell width="default" contentClassName="space-y-7">
      <PageHeader
        title="Rewards Shop"
        description="Use your SHORE coins for supplies and avatar styles."
        actions={(
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div id="balance-container" className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3.5" aria-label={`${balance} SHORE coins available`}>
              <img src={COIN_IMAGE} alt="" className="h-6 w-6" />
              <span className="text-xs text-muted">Your balance</span>
              <strong className="text-lg tabular-nums text-fg">{balance.toLocaleString()}</strong>
            </div>
            {isAdmin && (
              <button type="button" onClick={openInventory} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-3.5 text-sm font-semibold text-fg transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Edit3 className="h-4 w-4" aria-hidden="true" /> {hasInventoryDraft ? 'Continue edits' : 'Manage inventory'}
              </button>
            )}
          </div>
        )}
      />

      <div className="flex flex-col gap-2 border-y border-border py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p><strong className="text-fg">Earn coins:</strong> 10 per attendance check-in and 5 per recitation point.</p>
        <div className="flex gap-4 font-semibold text-primary">
          <a href="#attendance" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Attendance</a>
          <a href="#recitations" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Recitations</a>
        </div>
      </div>

      <div className="space-y-9 pb-4">
        <section aria-labelledby="physical-rewards-title">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="physical-rewards-title" className="text-lg font-bold text-fg sm:text-xl">Physical Rewards</h2>
            <span className="text-sm text-muted">{physicalItems.length} {physicalItems.length === 1 ? 'item' : 'items'}</span>
          </div>
          {physicalItems.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{physicalItems.map(renderItem)}</ul> : <p className="rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted">No physical rewards are available yet.</p>}
        </section>

        <section aria-labelledby="avatar-borders-title">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="avatar-borders-title" className="text-lg font-bold text-fg sm:text-xl">Avatar Borders</h2>
            <span className="text-sm text-muted">{borderItems.length} {borderItems.length === 1 ? 'style' : 'styles'}</span>
          </div>
          {borderItems.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{borderItems.map(renderItem)}</ul> : <p className="rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted">No avatar borders are available yet.</p>}
        </section>
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          {isEditing ? (
            <div role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[90dvh]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
                <div>
                  <h2 id="inventory-dialog-title" className="text-xl font-bold text-fg">Manage inventory</h2>
                  <p className="mt-1 text-sm text-muted">Update prices and stock, then save all changes together.</p>
                </div>
                <button ref={closeButtonRef} type="button" aria-label="Close inventory editor" onClick={closeModal} disabled={savingInventory} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
                {editInventory.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_8rem_auto] sm:items-end">
                    <label className="text-xs font-semibold text-muted">Name<input value={item.name} onChange={(event) => updateEditItem(item.id, 'name', event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-border px-3 text-sm text-fg outline-none focus:border-primary" /></label>
                    <div className="grid grid-cols-2 gap-3 sm:contents">
                      <label className="text-xs font-semibold text-muted">Price<input type="number" inputMode="numeric" min="0" step="1" value={item.price} onChange={(event) => updateEditItem(item.id, 'price', event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-border px-3 text-sm text-fg outline-none focus:border-primary" /></label>
                      <label className="text-xs font-semibold text-muted">Stock<input type="number" inputMode="numeric" min="0" step="1" value={item.stock} onChange={(event) => updateEditItem(item.id, 'stock', event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-border px-3 text-sm text-fg outline-none focus:border-primary" /></label>
                    </div>
                    <label className="text-xs font-semibold text-muted">Icon<select value={item.iconType || 'Gift'} onChange={(event) => updateEditItem(item.id, 'iconType', event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-border px-2 text-sm text-fg outline-none focus:border-primary">{Object.keys(ICONS).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
                    {BUILT_IN_IDS.has(String(item.id)) ? <span className="pb-3 text-center text-xs text-muted">Built-in</span> : <button type="button" aria-label={`Remove ${item.name || 'new reward'}`} onClick={() => setEditInventory((current) => current.filter((entry) => String(entry.id) !== String(item.id)))} className="grid h-11 w-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                ))}
                <button type="button" onClick={addEditItem} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-border px-4 text-sm font-semibold text-primary hover:bg-blue-50"><Plus className="h-4 w-4" /> Add reward</button>
              </div>
              <div className="border-t border-border bg-white px-4 py-3 sm:px-6">
                {inventoryError && <p role="alert" className="mb-2 text-sm font-medium text-red-600">{inventoryError}</p>}
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => { setEditInventory(inventory.map((item) => ({ ...item }))); setInventoryError(''); }} disabled={!hasInventoryDraft || savingInventory} className="min-h-11 text-sm font-semibold text-muted disabled:opacity-50">Discard draft</button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={closeModal} disabled={savingInventory} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted">Close</button>
                    <button type="button" onClick={saveInventory} disabled={!hasInventoryDraft || savingInventory} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{savingInventory && <Loader2 className="h-4 w-4 animate-spin" />} Save changes</button>
                  </div>
                </div>
              </div>
            </div>
          ) : receiptItem ? (
            <div role="dialog" aria-modal="true" aria-labelledby="receipt-dialog-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6">
              <div className="flex justify-end"><button ref={closeButtonRef} type="button" aria-label="Close confirmation" onClick={closeModal} className="grid h-11 w-11 place-items-center rounded-lg text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
              <CheckCircle2 className="h-11 w-11 text-emerald-600" aria-hidden="true" />
              <h2 id="receipt-dialog-title" className="mt-3 text-xl font-bold text-fg">Reward redeemed</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{receiptItem.name} is yours. {receiptItem.itemType === 'border' ? 'You can equip it now from your avatar borders.' : 'Claim it at the SHORE admin desk.'}</p>
              <div className="mt-5 flex justify-end gap-2">
                {receiptItem.itemType === 'border' && <button type="button" onClick={() => equipBorder(receiptItem)} disabled={Boolean(equippingId)} className="min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary">Equip now</button>}
                <button type="button" onClick={closeModal} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white">Done</button>
              </div>
            </div>
          ) : selectedItem && (
            <div role="dialog" aria-modal="true" aria-labelledby="reward-dialog-title" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="relative"><RewardArt item={selectedItem} large /><button ref={closeButtonRef} type="button" aria-label="Close reward details" onClick={closeModal} disabled={isPurchasing} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg bg-white text-fg shadow-sm"><X className="h-5 w-5" /></button></div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{selectedItem.itemType === 'border' ? 'Avatar border' : 'Physical reward'}</p>
                <h2 id="reward-dialog-title" className="mt-1 text-xl font-bold text-fg">{selectedItem.name}</h2>
                <p className="mt-1 text-sm text-muted">{selectedItem.itemType === 'border' ? 'A style for your profile avatar.' : Number(selectedItem.stock) > 0 ? `${selectedItem.stock} available · Collect at the SHORE admin desk after redeeming.` : 'Currently out of stock.'}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4 text-sm">
                  <div><span className="block text-muted">Cost</span><CoinAmount amount={selectedItem.price} className="mt-1 text-fg" /></div>
                  <div><span className="block text-muted">Your balance</span><CoinAmount amount={balance} className="mt-1 text-fg" /></div>
                </div>
                {!isAdmin && balance < Number(selectedItem.price) && !ownedBorders.some((id) => String(id) === String(selectedItem.id)) && (
                  <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-950"><Info className="mr-2 inline h-4 w-4" aria-hidden="true" />You need <strong>{(Number(selectedItem.price) - balance).toLocaleString()} more coins</strong>. Attendance and recitations help you earn them.</div>
                )}
                {isAdmin && balance < Number(selectedItem.price) && <p className="mt-3 text-xs text-muted">Administrators can redeem even when their coin balance is lower than the cost.</p>}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={closeModal} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-muted">Close</button>
                  {selectedItem.itemType === 'border' && ownedBorders.some((id) => String(id) === String(selectedItem.id)) ? (
                    <button type="button" onClick={() => equipBorder(selectedItem)} disabled={String(equippedBorder) === String(selectedItem.id) || Boolean(equippingId)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{String(equippedBorder) === String(selectedItem.id) ? 'Equipped' : equippingId ? 'Equipping…' : 'Equip border'}</button>
                  ) : (
                    <button type="button" onClick={confirmPurchase} disabled={isPurchasing || Number(selectedItem.stock) <= 0 || (!isAdmin && balance < Number(selectedItem.price))} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                      {isPurchasing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {Number(selectedItem.stock) <= 0 ? 'Out of stock' : !isAdmin && balance < Number(selectedItem.price) ? 'Not enough coins' : isPurchasing ? 'Redeeming…' : isAdmin ? 'Redeem as admin' : 'Confirm redemption'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>, document.body,
      )}
    </PageShell>
  );
}
