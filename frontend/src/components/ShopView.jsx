import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Info, Edit, Plus, Trash2, Save, X, Banknote, Pizza, PenTool, CupSoda, Smartphone, StickyNote, Candy, Cookie, Soup, Gift } from 'lucide-react';
import { toast } from 'sonner';

// Map icon strings to actual Lucide components
const IconMap = {
  Banknote, Pizza, PenTool, CupSoda, Smartphone, StickyNote, Candy, Cookie, Soup, Gift
};

export default function ShopView({ userEmail, userRole }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasingItem, setPurchasingItem] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inventory, setInventory] = useState([]);
  
  // Admin State
  const [isEditing, setIsEditing] = useState(false);
  const [editInventory, setEditInventory] = useState([]);

  useEffect(() => {
    fetchData();
  }, [userEmail]);

  const fetchData = async () => {
    try {
      const [attRes, recRes, invRes, purRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/recitations'),
        fetch('/api/inventory'),
        fetch('/api/purchases')
      ]);
      const attData = await attRes.json();
      const recData = await recRes.json();
      const invData = await invRes.json();
      const purData = await purRes.json();

      setInventory(invData.inventory || []);

      let attCount = 0;
      (attData.attendance || []).forEach(log => {
        if (log.email === userEmail && log.type === 'Time In') {
          attCount += 1;
        }
      });

      let recScore = 0;
      (recData.recitations || []).forEach(rec => {
        if (rec.studentEmail === userEmail) {
          recScore += rec.score;
        }
      });

      let spentCoins = 0;
      (purData.purchases || []).forEach(p => {
        if (p.studentEmail === userEmail) {
          spentCoins += p.price;
        }
      });

      const totalEarned = (attCount * 10) + (recScore * 5);
      setBalance(Math.max(0, totalEarned - spentCoins));
      setLoading(false);
    } catch {
      toast.error('Failed to load shop data.');
      setLoading(false);
    }
  };

  const handlePurchase = async (item) => {
    if (balance < item.price) {
      toast.error("Not enough SHORE coins!");
      return;
    }
    if (item.stock <= 0) {
      toast.error("This item is out of stock!");
      return;
    }

    try {
      const res = await fetch('/api/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, itemId: item.id })
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Failed to purchase item.");
        return;
      }

      setPurchasingItem(item);
      setBalance(prev => prev - item.price);
      
      // Update local stock immediately
      setInventory(prev => prev.map(i => i.id === item.id ? { ...i, stock: i.stock - 1 } : i));

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setPurchasingItem(null);
        toast.success(`Purchased ${item.name}!`);
      }, 2500);

    } catch (e) {
      toast.error("Network error during purchase.");
    }
  };

  const startEditing = () => {
    setEditInventory(JSON.parse(JSON.stringify(inventory)));
    setIsEditing(true);
  };

  const saveInventory = async () => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editInventory)
      });
      if (res.ok) {
        setInventory(editInventory);
        setIsEditing(false);
        toast.success("Inventory updated successfully!");
      } else {
        toast.error("Failed to update inventory.");
      }
    } catch {
      toast.error("Network error saving inventory.");
    }
  };

  const handleEditChange = (id, field, value) => {
    setEditInventory(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteEditItem = (id) => {
    setEditInventory(prev => prev.filter(item => item.id !== id));
  };

  const addEditItem = () => {
    const newItem = {
      id: Date.now(),
      name: "New Item",
      price: 100,
      stock: 10,
      iconType: "Gift",
      color: "bg-gray-100 text-gray-600"
    };
    setEditInventory([...editInventory, newItem]);
  };

  if (loading) return <div className="p-8">Loading Rewards Shop...</div>;

  return (
    <div className="h-full overflow-y-auto bg-canvas pb-20 relative">
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm">
          <div className="w-[400px] h-[400px] bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 border border-border/50 animate-in zoom-in-95 duration-300">
            <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
            <h2 className="text-2xl font-black text-fg mt-4">Purchase Successful!</h2>
            <p className="text-muted text-center mt-2 font-medium">You have redeemed your coins for the {purchasingItem?.name}. Please claim it at the admin desk.</p>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-fg flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" /> Manage Inventory
              </h2>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {editInventory.map(item => (
                <div key={item.id} className="flex flex-wrap items-center gap-4 bg-white border border-border/60 p-4 rounded-xl shadow-sm">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">Item Name</label>
                    <input type="text" value={item.name} onChange={(e) => handleEditChange(item.id, 'name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border/60 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm" />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">Price</label>
                    <input type="number" value={item.price} onChange={(e) => handleEditChange(item.id, 'price', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-border/60 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm" />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">Stock</label>
                    <input type="number" value={item.stock} onChange={(e) => handleEditChange(item.id, 'stock', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-border/60 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm" />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider mb-1 block">Icon Type</label>
                    <select value={item.iconType} onChange={(e) => handleEditChange(item.id, 'iconType', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border/60 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm">
                      {Object.keys(IconMap).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <button onClick={() => deleteEditItem(item.id)} className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              
              <button onClick={addEditItem} className="w-full py-4 border-2 border-dashed border-border/60 rounded-xl text-muted font-bold hover:bg-slate-50 hover:text-fg transition-colors flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> Add New Item
              </button>
            </div>
            
            <div className="p-4 border-t border-border/50 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-lg font-bold text-sm text-muted hover:text-fg hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={saveInventory} className="px-5 py-2.5 rounded-lg font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"><Save className="w-4 h-4" /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        
        {/* Header & Balance */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2rem] border border-border/60 shadow-sm relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-4 shadow-sm">
              <ShoppingBag className="w-3 h-3" />
              Rewards Shop
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-fg mb-2">Spend Your SHORE Coins</h1>
            <p className="text-sm text-muted max-w-md leading-relaxed">Redeem the coins you've earned from attending sessions and actively participating in recitations.</p>
            
            {userRole === 'admin' && (
              <button onClick={startEditing} className="mt-4 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-slate-700 transition-colors">
                <Edit className="w-4 h-4" /> Manage Inventory
              </button>
            )}
          </div>

          <div id="balance-container" className="flex items-center justify-center gap-4 bg-canvas px-6 sm:px-8 py-5 rounded-3xl border border-border/60 shadow-sm relative shrink-0 w-full md:w-auto">
            <img src="/shore-coin.png" alt="SHORE Coin" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted uppercase tracking-wider mb-1">Your Balance</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-fg tracking-tight leading-none">{balance}</span>
                <span className="text-xs sm:text-sm font-bold text-muted ml-1">Coins</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 leading-relaxed font-medium">
            Earn <strong className="font-bold">10 coins</strong> for every attendance 'Time In' and <strong className="font-bold">5 coins</strong> for every point earned in recitations. Keep participating to unlock more rewards!
          </div>
        </div>

        {/* Shop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.map((item) => {
            const IconComp = IconMap[item.iconType] || Gift;
            const isOutOfStock = item.stock <= 0;
            
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden flex flex-col relative transition-all duration-300 ${isOutOfStock ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-md'}`}
              >
                {isOutOfStock && (
                  <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                    Out of Stock
                  </div>
                )}
                
                <div className={`h-48 ${item.color || 'bg-gray-100 text-gray-600'} flex items-center justify-center relative overflow-hidden`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover relative z-10 pixelated" style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <IconComp className="w-16 h-16 relative z-10 drop-shadow-md" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-fg mb-1">{item.name}</h3>
                    <div className="flex items-center gap-1.5 mb-2">
                      <img src="/shore-coin.png" alt="coin" className="w-4 h-4 opacity-70" />
                      <span className="font-bold text-sm text-muted">{item.price} Coins</span>
                    </div>
                    <div className="text-xs font-semibold text-muted/70 mb-4 uppercase tracking-wider">
                      {item.stock} Available
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={showSuccess || isOutOfStock}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                      ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' :
                        balance >= item.price 
                        ? 'bg-fg text-white hover:bg-fg/90 active:scale-95 shadow-sm' 
                        : 'bg-canvas text-muted border border-border/60 cursor-not-allowed'
                      }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {isOutOfStock ? 'Out of Stock' : (balance >= item.price ? 'Redeem Item' : 'Not Enough Coins')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
