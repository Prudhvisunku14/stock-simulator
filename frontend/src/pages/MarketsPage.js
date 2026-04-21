import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stocksAPI } from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Globe,
  Briefcase,
  Cpu,
  Zap,
  Car,
  ShoppingBag,
  PlusCircle,
  Database,
  BarChart2,
  Construction
} from 'lucide-react';

const MarketsPage = () => {
  const [stocks, setStocks] = useState([]);
  const [allStocks, setAllStocks] = useState([]); // Keep a full list for sector counts
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [filter, selectedSector]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let res;
      if (selectedSector) {
        res = await stocksAPI.getBySector(selectedSector);
      } else {
        switch (filter) {
          case 'GAINERS': res = await stocksAPI.getTopGainers(); break;
          case 'LOSERS':  res = await stocksAPI.getTopLosers(); break;
          case 'ACTIVE':  res = await stocksAPI.getMostActive(); break;
          default:        res = await stocksAPI.getAll(); break;
        }
      }
      setStocks(res.data.data);
      
      // Also fetch all once to get sector counts if we don't have them
      if (allStocks.length === 0) {
        const allRes = await stocksAPI.getAll();
        setAllStocks(allRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setFilter('ALL');
    setSelectedSector(null);
    
    if (term.length > 1) {
      try {
        const res = await stocksAPI.getAll(term);
        setStocks(res.data.data);
      } catch (err) {
        console.error('Search error:', err);
      }
    } else if (term.length === 0) {
      fetchData();
    }
  };

  const categories = [
    { id: 'ALL', name: 'All Stocks' },
    { id: 'GAINERS', name: 'Top Gainers', icon: ArrowUpRight, color: 'text-success' },
    { id: 'LOSERS', name: 'Top Losers', icon: ArrowDownRight, color: 'text-danger' },
    { id: 'ACTIVE', name: 'Most Active', icon: Activity, color: 'text-primary' }
  ];

  const sectorIcons = {
    'Banking': Briefcase,
    'IT Services': Cpu,
    'Energy': Zap,
    'Automobile': Car,
    'Consumer Goods': ShoppingBag,
    'Pharma': PlusCircle,
    'Metals': Database,
    'Telecom': BarChart2,
    'Infrastructure': Construction
  };

  const sectorList = ['Banking', 'IT Services', 'Energy', 'Automobile', 'Consumer Goods', 'Pharma', 'Metals', 'Telecom', 'Infrastructure'];

  // Simple Mini Sparkline Component
  const Sparkline = ({ color }) => {
    return (
        <svg width="60" height="24" viewBox="0 0 60 24" className="overflow-visible">
            <path 
                d={color === 'text-success' 
                    ? "M0,18 L10,12 L20,15 L30,8 L40,10 L50,4 L60,6" 
                    : "M0,4 L10,10 L20,8 L30,15 L40,12 L50,18 L60,16"}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={color}
            />
        </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
             <Globe className="w-8 h-8 text-primary" />
             Market Explorer
           </h1>
           <p className="text-sm font-medium text-gray-500">Real-time Indian Equities & Sector Trends</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                    type="text"
                    placeholder="Search by symbol or name..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-sm"
                />
            </div>

            <div className="flex bg-white border border-gray-200 rounded-2xl p-1 shadow-sm overflow-x-auto no-scrollbar w-full md:w-auto">
                {categories.map((cat) => (
                    <button 
                      key={cat.id}
                      onClick={() => {
                          setFilter(cat.id);
                          setSelectedSector(null);
                          setSearchTerm('');
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${filter === cat.id && !selectedSector ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Featured Sectors Horizontal Scroll */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Sectors & Industries</h2>
              {selectedSector && (
                  <button 
                    onClick={() => setSelectedSector(null)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                      View All
                  </button>
              )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
              {sectorList.map(sector => {
                  const Icon = sectorIcons[sector] || Globe;
                  const count = allStocks.filter(s => s.sector === sector).length;
                  const isActive = selectedSector === sector;

                  return (
                    <div 
                        key={sector} 
                        onClick={() => {
                            setSelectedSector(sector);
                            setFilter('SECTOR');
                            setSearchTerm('');
                        }}
                        className={`px-5 py-4 rounded-2xl shadow-sm min-w-[170px] flex-shrink-0 cursor-pointer transition-all duration-300 border ${isActive ? 'bg-primary border-primary text-white shadow-lg -translate-y-1' : 'bg-white border-gray-100 text-gray-900 hover:border-primary/30 hover:shadow-md'}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-primary/5'}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {count}
                            </span>
                        </div>
                        <p className={`text-xs font-black uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-gray-400'}`}>Sector</p>
                        <p className="text-sm font-black truncate">{sector}</p>
                    </div>
                  );
              })}
          </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6,7,8,9].map(i => (
                <div key={i} className="card h-40 animate-pulse bg-gray-50 border-gray-100 rounded-3xl" />
            ))}
        </div>
      ) : (
        <>
            {stocks.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-bold">No stocks found matching your criteria.</p>
                    <button onClick={() => {setFilter('ALL'); setSelectedSector(null); setSearchTerm(''); fetchData();}} className="btn btn-primary btn-sm">Clear Filters</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                    {stocks.map((stock) => (
                        <div 
                            key={stock.symbol}
                            onClick={() => navigate(`/stock/${stock.symbol}`)}
                            className="bg-white border border-gray-100 rounded-3xl p-5 hover:border-primary/30 hover:shadow-premium transition-all duration-300 cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden"
                        >
                            {/* Background Pattern */}
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <Database className="w-20 h-20 rotate-12" />
                            </div>

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center font-black text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                            {stock.symbol.substring(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 group-hover:text-primary transition-colors">{stock.symbol}</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[100px]">{stock.company_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right z-10">
                                        <p className="font-black text-gray-900">
                                            {stock.price ? `₹${parseFloat(stock.price).toLocaleString('en-IN')}` : '₹ ---'}
                                        </p>
                                        <div className={`flex items-center justify-end gap-1 font-bold text-[10px] ${parseFloat(stock.change_percent || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {parseFloat(stock.change_percent || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {stock.change_percent != null ? `${parseFloat(stock.change_percent) >= 0 ? '+' : ''}${parseFloat(stock.change_percent).toFixed(2)}%` : '0.00%'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-auto border-t border-gray-50 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sector</span>
                                    <span className="text-[11px] font-bold text-gray-600 truncate max-w-[80px]">
                                        {stock.sector}
                                    </span>
                                </div>
                                <Sparkline color={stock.change_percent >= 0 ? 'text-success' : 'text-danger'} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default MarketsPage;
