import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Shield, 
  ArrowUpRight, 
  History,
  Loader2,
  FlaskConical,
  RefreshCcw,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer 
} from 'recharts';
import './App.css';
import { demoTransactions, demoMetrics, demoChartData, demoAlert } from '../../lib/demo-data.js';

const STACKS_API_BASE = 'https://api.hiro.so';
const DEMO_SEARCH_PARAM = 'demo';
const THEME_STORAGE_KEY = 'stx-whale-theme';

const classify = (amt) => {
  if (amt >= 500000) return { label: 'Mega Whale', icon: '🐳' };
  if (amt >= 250000) return { label: 'Humpback Whale', icon: '🐋' };
  if (amt >= 100000) return { label: 'Whale', icon: '🦈' };
  if (amt >= 50000) return { label: 'Shark', icon: '🦈' };
  if (amt >= 5000) return { label: 'Dolphin', icon: '🐬' };
  return { label: 'Regular Transfer', icon: '🐠' };
};

const formatCompactAddress = (value) => {
  if (!value) return 'Unknown';
  const address = String(value);
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatTransactionTime = (timestamp, timestampIso) => {
  const source = timestampIso || (timestamp ? new Date(timestamp * 1000).toISOString() : null);
  if (source) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(source));
  }
  return 'Time unavailable';
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [stxPrice, setStxPrice] = useState({ price: demoMetrics.price, change: demoMetrics.change });
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(() => new URLSearchParams(window.location.search).get(DEMO_SEARCH_PARAM) === '1');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const applyDemoState = () => {
    setTransactions(demoTransactions);
    setStxPrice({ price: demoMetrics.price, change: demoMetrics.change });
    setLoading(false);
    setError('');
  };

  const fetchTransfers = async () => {
    try {
      const { data } = await axios.get(`${STACKS_API_BASE}/extended/v1/tx?unanchored=true&sort=desc&limit=50&type=token_transfer`);
      const results = data.results || [];
      
      const enhancedTransfers = results.map((tx) => {
        const amount = (tx.token_transfer?.amount || 0) / 1e6;
        return {
          id: tx.tx_id,
          amount,
          sender: tx.token_transfer?.sender_address || tx.sender_address,
          recipient: tx.token_transfer?.recipient_address || 'Contract/Unknown',
          timestamp: tx.block_time,
          timestampIso: tx.block_time_iso,
          classification: classify(amount),
        };
      }).filter((tx) => tx.classification.label !== 'Regular Transfer');

      setTransactions(enhancedTransfers.slice(0, 15));
      setError('');
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError('Live feed unavailable. Showing demo alert data.');
      applyDemoState();
    }
  };

  const fetchPrice = async () => {
    try {
      const { data } = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=STXUSDT');
      setStxPrice({
        price: parseFloat(data.lastPrice),
        change: parseFloat(data.priceChangePercent)
      });
    } catch (err) {
      console.error('Price fetch failed:', err);
      if (!demoMode) {
        setStxPrice({ price: demoMetrics.price, change: demoMetrics.change });
      }
    }
  };

  useEffect(() => {
    if (demoMode) {
      applyDemoState();
      return undefined;
    }

    fetchTransfers();
    fetchPrice();
    const interval = setInterval(fetchTransfers, 30000);
    return () => clearInterval(interval);
  }, [demoMode]);

  const toggleDemoMode = () => {
    const nextMode = !demoMode;
    const searchParams = new URLSearchParams(window.location.search);

    if (nextMode) {
      searchParams.set(DEMO_SEARCH_PARAM, '1');
    } else {
      searchParams.delete(DEMO_SEARCH_PARAM);
    }

    const nextUrl = `${window.location.pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
    setLoading(true);
    setDemoMode(nextMode);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="logo">
          <Activity size={32} className="brand-icon" />
          STX<span>Whale</span>Alert 
        </div>
        <div className="header-actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
          <button type="button" className={`demo-toggle ${demoMode ? 'active' : ''}`} onClick={toggleDemoMode}>
            {demoMode ? <RefreshCcw size={16} /> : <FlaskConical size={16} />}
            {demoMode ? 'Back To Live Feed' : 'Open Demo Mode'}
          </button>
          <div className="card-value" style={{ fontSize: '1.25rem' }}>
            ${stxPrice.price.toFixed(3)} 
            <span className={`card-delta ${stxPrice.change >= 0 ? 'plus' : 'minus'}`} style={{ marginLeft: '1rem' }}>
              {stxPrice.change >= 0 ? '+' : ''}{stxPrice.change.toFixed(2)}%
            </span>
          </div>
        </div>
      </header>

      {(demoMode || error) && (
        <section className="demo-banner">
          <div>
            <div className="demo-badge">{demoMode ? 'Demo Mode' : 'Demo Fallback'}</div>
            <strong>{demoAlert.classification}</strong> sample alert for {demoAlert.amount.toLocaleString()} STX.
          </div>
          <div className="demo-banner-meta">
            From {demoAlert.sender} to {demoAlert.recipient}
          </div>
        </section>
      )}

      <section className="stats-grid">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="card-title">Live STX Price</div>
          <div className="card-value">${stxPrice.price.toLocaleString()}</div>
          <div className="card-delta plus">{demoMode ? 'Demo Snapshot' : 'Real-time Feed'}</div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <div className="card-title">24h Volume</div>
          <div className="card-value">${(demoMetrics.dailyVolumeUsd / 1_000_000).toFixed(1)}M</div>
          <div className="card-delta plus">Stacks transfer activity</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
          <div className="card-title">Total Whales Active</div>
          <div className="card-value">{demoMetrics.activeWhales}</div>
          <div className="card-delta minus">Large wallet clusters</div>
        </motion.div>
      </section>

      <div className="main-grid">
        <div className="whale-feed">
          <h2 className="section-heading">
            {loading ? <Loader2 className="section-heading-icon animate-spin" size={24} /> : <History className="section-heading-icon" size={24} />}
            {demoMode ? 'Demo Whale Feed' : 'Recent Transactions'}
          </h2>
          
          {transactions.length === 0 && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
               No active transfers detected in the last few minutes.
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {transactions.map((tx, i) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, x: -25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="feed-item"
              >
                <div className="item-icon">{tx.classification.icon}</div>
                <div className="item-details">
                  <div className="item-title">{tx.classification.label}</div>
                  <div className="item-meta">
                    <span>From: {formatCompactAddress(tx.sender)}</span>
                    <ArrowUpRight size={14} />
                    <span>To: {formatCompactAddress(tx.recipient)}</span>
                  </div>
                  <div className="item-time">{formatTransactionTime(tx.timestamp, tx.timestampIso)}</div>
                  <a
                    className="item-link"
                    href={`https://explorer.hiro.so/txid/${tx.id}?chain=mainnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction
                  </a>
                </div>
                <div className="item-amount">
                  <div className="amount-stx">{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} STX</div>
                  <div className="amount-usd">≈ ${(tx.amount * stxPrice.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Network Security</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--success)' }}>
              <Shield size={32} />
              <div>
                <div style={{ fontWeight: 700 }}>Anchored</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Block #{demoMetrics.networkBlock}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ height: '300px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
             <h3 style={{ marginBottom: '1rem' }}>{demoMode ? 'Demo Price Trend' : 'Price Trend (24h)'}</h3>
             <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={demoChartData}>
                   <Area type="monotone" dataKey="price" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" />
                   <defs>
                     <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
