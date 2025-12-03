import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Printer, 
  TrendingUp, 
  AlertCircle,
  X,
  QrCode,
  ArrowLeft,
  Image as ImageIcon,
  Edit,
  Lock,
  Unlock,
  Settings,
  Download,
  Save,
  ServerCrash,
  Loader2
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";

// --- Helper: Safely access Env Vars ---
const getEnv = (key, fallback) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || fallback;
    }
  } catch (e) {
    console.warn("Environment variable access failed.");
  }
  return fallback;
};

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "YOUR_API_KEY_HERE"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "your-project.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "your-project-id"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "your-project.appspot.com"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "00000000000"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:00000000:web:00000000")
};

// --- Static App ID ---
const appId = 'manha-pos-v1';

// --- Global Init ---
let app, auth, db;
let initError = null;

// Validation Check
const isConfigConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
                           !firebaseConfig.authDomain.includes("your-project");

if (isConfigConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    initError = e.message;
    console.error("Firebase Init Error:", e);
  }
}

// --- Utility Components (Defined OUTSIDE App to prevent ReferenceErrors) ---

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false }) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-gray-400 shadow-sm",
    danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    warning: "bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {Icon && <Icon size={18} className="mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

const Input = ({ label, value, onChange, placeholder, type = "text", className = "" }) => (
  <div className={`flex flex-col ${className}`}>
    {label && <label className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// Fixed SidebarItem - Defined outside App and accepts props
const SidebarItem = ({ id, icon: Icon, label, activeTab, isLocked, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center w-full p-3 mb-2 rounded-lg transition-colors ${
      activeTab === id 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Icon size={20} className="mr-3" />
    <span className="font-medium">{label}</span>
    {isLocked && (id === 'sales' || id === 'pos' || id === 'settings') && <Lock size={14} className="ml-auto opacity-50"/>}
  </button>
);

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(initError);
  const [loadingStatus, setLoadingStatus] = useState("Initializing System...");
  
  const [activeTab, setActiveTab] = useState('inventory');
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [targetTab, setTargetTab] = useState(null);
  const [securityPin, setSecurityPin] = useState("1234");

  const [viewOrder, setViewOrder] = useState(null); 
  const [salesSearch, setSalesSearch] = useState("");
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isSaleEditModalOpen, setIsSaleEditModalOpen] = useState(false);
  
  const [currentItem, setCurrentItem] = useState({ id: null, name: '', price: '', stock: '', category: '', description: '', imageUrl: '' });
  const [currentSaleEdit, setCurrentSaleEdit] = useState({ id: null, orderNumber: '', dateStr: '', customerName: '', items: [] });

  // --- Auth & Data Initialization ---
  useEffect(() => {
    if (!isConfigConfigured || !auth) {
      setAuthError("Configuration Missing");
      return;
    }

    const initAuth = async () => {
      setLoadingStatus("Connecting to Database...");
      try {
        await signInAnonymously(auth);
        setLoadingStatus("Verifying User...");
      } catch (error) {
        console.error("Auth Error", error);
        setAuthError(error.message);
        setLoadingStatus("Connection Failed");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setAuthError(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Data Listeners ---
  useEffect(() => {
    if (!user || !db) return;

    try {
      const itemsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'items');
      const unsubItems = onSnapshot(itemsRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(data.sort((a, b) => a.name.localeCompare(b.name)));
      }, (err) => console.error("Items fetch error:", err));

      const salesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'sales');
      const unsubSales = onSnapshot(salesRef, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSales(data.sort((a, b) => {
          const dateA = a.createdAt ? a.createdAt.seconds : Number.MAX_SAFE_INTEGER;
          const dateB = b.createdAt ? b.createdAt.seconds : Number.MAX_SAFE_INTEGER;
          return dateB - dateA;
        }));
      }, (err) => console.error("Sales fetch error:", err));

      return () => {
        unsubItems();
        unsubSales();
      };
    } catch (e) {
      console.error("Listener Error:", e);
    }
  }, [user]);

  // --- Implementation Methods ---
  const handleTabChange = (tab) => {
    if (isLocked && (tab === 'sales' || tab === 'pos' || tab === 'settings')) {
      setTargetTab(tab);
      setShowPinModal(true);
    } else {
      setActiveTab(tab);
    }
  };

  const verifyPin = () => {
    if (pinInput === securityPin) {
      setShowPinModal(false);
      setPinInput("");
      if (targetTab) {
        setActiveTab(targetTab);
        setTargetTab(null);
      } else {
        setIsLocked(false);
      }
    } else {
      alert("Incorrect PIN");
      setPinInput("");
    }
  };

  const toggleGlobalLock = () => {
    if (isLocked) {
      setTargetTab(null);
      setShowPinModal(true);
    } else {
      setIsLocked(true);
      setActiveTab('inventory');
    }
  };

  const openAddItem = () => {
    setCurrentItem({ id: null, name: '', price: '', stock: '', category: '', description: '', imageUrl: '' });
    setIsItemModalOpen(true);
  };

  const openEditItem = (item) => {
    setCurrentItem({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!user || !currentItem.name || !currentItem.price) return;
    try {
      const itemData = {
        name: currentItem.name,
        price: parseFloat(currentItem.price),
        stock: parseInt(currentItem.stock) || 0,
        category: currentItem.category,
        description: currentItem.description,
        imageUrl: currentItem.imageUrl,
        updatedAt: serverTimestamp()
      };

      if (currentItem.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'items', currentItem.id), itemData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'items'), {
          ...itemData,
          createdAt: serverTimestamp()
        });
      }
      setIsItemModalOpen(false);
    } catch (e) {
      console.error("Error saving item:", e);
      alert("Failed to save item. Check console.");
    }
  };

  const handleDeleteItem = async (id) => {
    if (isLocked) return alert("Please unlock app first.");
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'items', id));
    } catch (e) {
      console.error("Error deleting item:", e);
    }
  };

  const addToCart = (item) => {
    if (item.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.qty >= item.stock) return prev; 
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateCartQty = (itemId, val, isDirectInput = false) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          let newQty;
          if (isDirectInput) {
            newQty = parseInt(val);
            if (isNaN(newQty)) newQty = 0; 
          } else {
            newQty = item.qty + val;
          }
          if (newQty <= 0 && !isDirectInput) return null; 
          
          const originalItem = items.find(i => i.id === itemId);
          if (originalItem && newQty > originalItem.stock) {
            return { ...item, qty: originalItem.stock };
          }
          return { ...item, qty: Math.max(1, newQty) }; 
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (isLocked) return alert("App is Locked.");
    if (!user || cart.length === 0) return;
    try {
      const now = new Date();
      const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      const saleData = {
        items: cart,
        total: cartTotal,
        itemCount: cart.reduce((acc, i) => acc + i.qty, 0),
        createdAt: serverTimestamp(),
        dateStr: now.toLocaleDateString(),
        timeStr: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        orderNumber: orderNumber,
        customerName: "Walk-in Customer"
      };

      const saleRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'sales'), saleData);

      for (const item of cart) {
        const itemRef = doc(db, 'artifacts', appId, 'users', user.uid, 'items', item.id);
        const currentStock = items.find(i => i.id === item.id)?.stock || 0;
        await updateDoc(itemRef, {
          stock: Math.max(0, currentStock - item.qty)
        });
      }

      setCart([]);
      setActiveTab('sales');
      setViewOrder({ id: saleRef.id, ...saleData });

    } catch (e) {
      console.error("Checkout failed", e);
      alert("Checkout failed. Check console.");
    }
  };

  const openEditSale = (sale) => {
    setCurrentSaleEdit({
      id: sale.id,
      orderNumber: sale.orderNumber,
      dateStr: sale.dateStr,
      customerName: sale.customerName || '',
      items: JSON.parse(JSON.stringify(sale.items || []))
    });
    setIsSaleEditModalOpen(true);
  };

  const updateSaleEditItemQty = (index, newVal) => {
    const qty = parseInt(newVal) || 0;
    setCurrentSaleEdit(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], qty: qty };
      return { ...prev, items: newItems };
    });
  };

  const removeSaleEditItem = (index) => {
    setCurrentSaleEdit(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const handleUpdateSale = async () => {
    if (!user || !currentSaleEdit.id) return;
    try {
      const newTotal = currentSaleEdit.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const newItemCount = currentSaleEdit.items.reduce((acc, item) => acc + item.qty, 0);

      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sales', currentSaleEdit.id), {
        orderNumber: currentSaleEdit.orderNumber,
        dateStr: currentSaleEdit.dateStr,
        customerName: currentSaleEdit.customerName,
        items: currentSaleEdit.items,
        total: newTotal,
        itemCount: newItemCount
      });
      setIsSaleEditModalOpen(false);
      
      if (viewOrder && viewOrder.id === currentSaleEdit.id) {
        setViewOrder(prev => ({ 
          ...prev, 
          ...currentSaleEdit, 
          total: newTotal, 
          itemCount: newItemCount 
        }));
      }
    } catch (e) {
      console.error("Error updating sale:", e);
    }
  };

  const handleBackupData = () => {
    const data = { items: items, sales: sales, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bizdash_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert("Backup downloaded!");
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => 
      (s.orderNumber && s.orderNumber.toLowerCase().includes(salesSearch.toLowerCase())) ||
      s.dateStr.includes(salesSearch) ||
      (s.customerName && s.customerName.toLowerCase().includes(salesSearch.toLowerCase()))
    );
  }, [sales, salesSearch]);

  // --- RENDERS ---

  if (!isConfigConfigured) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white p-8 flex-col">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-700">
          <div className="flex items-center justify-center mb-6 text-red-500">
            <ServerCrash size={64} />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-center">Setup Required</h1>
          <p className="mb-6 text-slate-300 text-center">
            The app cannot connect to Firebase because API keys are missing.
          </p>
          <div className="bg-slate-950 p-4 rounded-lg text-sm font-mono text-blue-300 mb-6 border border-slate-800">
            <p>Error: VITE_FIREBASE_API_KEY not found.</p>
          </div>
          <div className="text-sm text-slate-400">
            <strong>Check Vercel Settings:</strong>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Did you add Environment Variables?</li>
              <li>Did you click 'Redeploy' after adding them?</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 text-red-900 p-8 flex-col">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold mb-2">Connection Failed</h1>
          <p className="text-red-600 mb-4">{authError}</p>
          <div className="text-left text-sm bg-gray-50 p-4 rounded border border-gray-200">
            <strong>Possible Causes:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Anonymous Auth is disabled in Firebase Console.</li>
              <li>Internet connection is unstable.</li>
              <li>API Key is invalid or restricted.</li>
            </ul>
          </div>
          <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-full hover:bg-red-700 transition-colors w-full">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 flex-col">
      <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Manha POS</h2>
      <p className="text-gray-500 font-medium animate-pulse">{loadingStatus}</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4 print:hidden">
        <div className="flex items-center mb-8 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">M</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-800">Manha</h1>
        </div>
        <nav className="flex-1">
          <SidebarItem 
            id="inventory" 
            icon={Package} 
            label="Inventory" 
            activeTab={activeTab} 
            isLocked={isLocked} 
            onClick={handleTabChange} 
          />
          <SidebarItem 
            id="pos" 
            icon={ShoppingCart} 
            label="Point of Sale" 
            activeTab={activeTab} 
            isLocked={isLocked} 
            onClick={handleTabChange} 
          />
          <SidebarItem 
            id="sales" 
            icon={TrendingUp} 
            label="Sales History" 
            activeTab={activeTab} 
            isLocked={isLocked} 
            onClick={handleTabChange} 
          />
          <SidebarItem 
            id="settings" 
            icon={Settings} 
            label="Settings" 
            activeTab={activeTab} 
            isLocked={isLocked} 
            onClick={handleTabChange} 
          />
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
           <button onClick={toggleGlobalLock} className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${isLocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
             {isLocked ? <><Lock size={16} className="mr-2"/> App Locked</> : <><Unlock size={16} className="mr-2"/> App Unlocked</>}
           </button>
           <div className="px-3 py-2 bg-blue-50 rounded-lg text-center">
             <p className="text-xs font-semibold text-blue-800 uppercase">Cloud Sync Active</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto print:overflow-visible h-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 print:hidden sticky top-0 z-10">
          <h2 className="text-xl font-semibold capitalize text-gray-800">{activeTab}</h2>
          <div className="flex items-center space-x-4">
            {activeTab === 'inventory' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64" />
              </div>
            )}
          </div>
        </header>

        {activeTab === 'inventory' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-2">
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-sm text-gray-500">Total Items</span>
                  <p className="text-lg font-bold">{items.length}</p>
                </div>
              </div>
              <Button onClick={openAddItem} icon={Plus}>Add Item</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow group relative">
                  <div className="h-40 bg-gray-100 relative">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <button onClick={() => openEditItem(item)} className="bg-white p-2 rounded-full shadow-md text-blue-500 hover:bg-blue-50"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteItem(item.id)} className="bg-white p-2 rounded-full shadow-md text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 truncate pr-2">{item.name}</h3>
                      <span className="font-bold text-blue-600">৳{item.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.stock} in stock</span>
                      <span className="text-xs text-gray-400 capitalize">{item.category}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="flex h-[calc(100vh-4rem)]">
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200">
              <Input placeholder="Search item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full mb-4" />
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <button key={item.id} onClick={() => addToCart(item)} disabled={item.stock <= 0} className={`text-left p-4 rounded-xl border transition-all ${item.stock > 0 ? 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md' : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gray-800">{item.name}</span>
                      <span className="font-bold text-blue-600">৳{item.price}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${item.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Stock: {item.stock}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="w-96 bg-white flex flex-col shadow-xl z-20">
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-800 flex items-center"><ShoppingCart className="mr-2" size={20} /> Current Sale</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? <div className="text-center text-gray-400 mt-10">Cart is empty</div> : cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">৳{item.price} x {item.qty}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                       <button onClick={() => updateCartQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200">-</button>
                       <input type="number" min="1" value={item.qty} onChange={(e) => updateCartQty(item.id, e.target.value, true)} className="w-12 h-8 text-center border border-gray-300 rounded mx-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                       <button onClick={() => updateCartQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded hover:bg-gray-200">+</button>
                       <button onClick={() => removeFromCart(item.id)} className="ml-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between mb-6 text-xl font-bold text-gray-900"><span>Total</span><span>৳{cartTotal.toFixed(2)}</span></div>
                <Button onClick={handleCheckout} disabled={cart.length === 0} className="w-full py-3 text-lg" variant="primary">Complete Sale</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="p-8 max-w-5xl mx-auto h-full">
            {viewOrder ? (
              <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200 h-full flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden">
                  <Button variant="secondary" onClick={() => setViewOrder(null)} icon={ArrowLeft}>Back</Button>
                  <Button onClick={() => window.print()} icon={Printer}>Print / Save PDF</Button>
                </div>
                <div className="p-8 md:p-12 overflow-y-auto flex-1" id="receipt-area">
                  <div className="flex justify-between items-start border-b-2 border-gray-800 pb-8 mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
                      <p className="text-gray-500 font-medium">{viewOrder.customerName}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold text-gray-800">{viewOrder.orderNumber}</h2>
                      <p className="text-gray-500">
                        {viewOrder.dateStr} 
                        {viewOrder.timeStr && <span className="block text-sm text-gray-400 mt-1">{viewOrder.timeStr}</span>}
                      </p>
                    </div>
                  </div>
                  <table className="w-full mb-8">
                    <thead className="border-b border-gray-200">
                      <tr><th className="text-left py-3 font-bold text-gray-600">Item</th><th className="text-center py-3 font-bold text-gray-600">Qty</th><th className="text-right py-3 font-bold text-gray-600">Price</th><th className="text-right py-3 font-bold text-gray-600">Total</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-4 text-gray-800">{item.name}</td><td className="py-4 text-center text-gray-600">{item.qty}</td><td className="py-4 text-right text-gray-600">৳{item.price.toFixed(2)}</td><td className="py-4 text-right font-medium text-gray-900">৳{(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end border-t border-gray-200 pt-8">
                    <div className="flex justify-between text-xl font-bold text-gray-900 w-64"><span>Grand Total</span><span>৳{viewOrder.total.toFixed(2)}</span></div>
                  </div>
                  <div className="mt-12 text-center">
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${viewOrder.orderNumber}`} alt="QR" className="mx-auto w-24 h-24" />
                     <p className="text-xs text-gray-400 mt-2">Scan to verify</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <h2 className="text-lg font-bold text-gray-800">Sales Records</h2>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input type="text" placeholder="Search orders..." value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-64" />
                   </div>
                 </div>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   <table className="w-full text-left">
                     <thead className="bg-gray-50 border-b border-gray-200">
                       <tr><th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Order #</th><th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th><th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Customer</th><th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Total</th><th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Action</th></tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {filteredSales.map(sale => (
                         <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{sale.orderNumber}</td>
                           <td className="px-6 py-4 text-sm text-gray-600">{sale.dateStr}</td>
                           <td className="px-6 py-4 text-sm text-gray-800">{sale.customerName || 'Walk-in'}</td>
                           <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">৳{sale.total.toFixed(2)}</td>
                           <td className="px-6 py-4 text-center flex justify-center space-x-2">
                             <button onClick={() => setViewOrder(sale)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-full"><FileText size={18} /></button>
                             <button onClick={() => openEditSale(sale)} className="p-2 hover:bg-orange-50 text-orange-500 rounded-full"><Edit size={18} /></button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-2 flex items-center"><Lock className="mr-2" size={20}/> Security</h3>
                <div className="flex items-end space-x-4">
                  <Input label="App PIN Code" value={securityPin} onChange={(e) => setSecurityPin(e.target.value)} type="password" className="flex-1" />
                  <Button variant="success" onClick={() => alert("PIN Updated!")}>Update PIN</Button>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-2 flex items-center"><Save className="mr-2" size={20}/> Data Backup</h3>
                <Button variant="secondary" onClick={handleBackupData} icon={Download} className="w-full">Download Database Backup</Button>
              </Card>
            </div>
          </div>
        )}
      </main>

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={currentItem.id ? "Edit Item" : "Add New Item"}>
        <div className="space-y-4">
          <Input label="Product Name" value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} />
          <div className="flex space-x-4">
             <Input label="Price (BDT)" type="number" className="flex-1" value={currentItem.price} onChange={e => setCurrentItem({...currentItem, price: e.target.value})} />
             <Input label="Stock Qty" type="number" className="flex-1" value={currentItem.stock} onChange={e => setCurrentItem({...currentItem, stock: e.target.value})} />
          </div>
          <Input label="Category" value={currentItem.category} onChange={e => setCurrentItem({...currentItem, category: e.target.value})} />
          <Input label="Image URL" value={currentItem.imageUrl} onChange={e => setCurrentItem({...currentItem, imageUrl: e.target.value})} />
          <Button onClick={handleSaveItem} className="w-full mt-2">Save Changes</Button>
        </div>
      </Modal>

      <Modal isOpen={isSaleEditModalOpen} onClose={() => setIsSaleEditModalOpen(false)} title="Edit Order Details">
        <div className="space-y-4">
          <Input label="Order Number" value={currentSaleEdit.orderNumber} onChange={e => setCurrentSaleEdit({...currentSaleEdit, orderNumber: e.target.value})} />
          <Input label="Date" value={currentSaleEdit.dateStr} onChange={e => setCurrentSaleEdit({...currentSaleEdit, dateStr: e.target.value})} />
          <Input label="Customer Name" value={currentSaleEdit.customerName} onChange={e => setCurrentSaleEdit({...currentSaleEdit, customerName: e.target.value})} />
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-bold text-sm text-gray-700 mb-2">Order Items</h4>
            {currentSaleEdit.items.map((item, index) => (
              <div key={index} className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200 mb-2">
                <span className="flex-1 text-sm font-medium">{item.name}</span>
                <input type="number" min="0" value={item.qty} onChange={(e) => updateSaleEditItemQty(index, e.target.value)} className="w-16 p-1 border border-gray-300 rounded text-sm text-center" />
                <button onClick={() => removeSaleEditItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <Button onClick={handleUpdateSale} className="w-full mt-2">Update Order</Button>
        </div>
      </Modal>

      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Security Check">
        <div className="text-center space-y-4">
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="text-center text-3xl tracking-widest w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" maxLength={4} autoFocus />
          <Button onClick={verifyPin} className="w-full">Unlock</Button>
        </div>
      </Modal>
    </div>
  );
}
