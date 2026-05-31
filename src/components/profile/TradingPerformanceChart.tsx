import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';

interface TradingData {
  date: string;
  profit: number;
  volume: number;
  trades: number;
  totalValue: number;
}

interface TradingPerformanceChartProps {
  className?: string;
  userId?: string;
}

const TradingPerformanceChart: React.FC<TradingPerformanceChartProps> = ({ className = '', userId }) => {
  const { user } = useAuthStore();
  const [timeframe, setTimeframe] = useState('30d');
  const [activeMetric, setActiveMetric] = useState<'profit' | 'volume' | 'trades'>('profit');
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realData, setRealData] = useState<TradingData[]>([]);
  const [stats, setStats] = useState({ successRate: 0, totalOrders: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartDrawnRef = useRef(false);

  // Fetch real trading data from database
  useEffect(() => {
    const fetchTradingData = async () => {
      if (!user && !userId) return;

      setIsLoading(true);
      try {
        const targetUserId = userId || user?.steamId;

        // Get date range based on timeframe
        const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch user's orders from database
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select('*')
          .or(`buyer_steam_id.eq.${targetUserId},seller_steam_id.eq.${targetUserId}`)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching orders:', error);
          return;
        }

        // Also get all-time stats
        const { data: allOrders } = await supabase
          .from('orders')
          .select('status')
          .or(`buyer_steam_id.eq.${targetUserId},seller_steam_id.eq.${targetUserId}`);

        if (allOrders) {
          const total = allOrders.length;
          const completed = allOrders.filter(o => o.status === 'completed').length;
          setStats({
            successRate: total > 0 ? (completed / total) * 100 : 0,
            totalOrders: total
          });
        }

        // Process orders into daily data
        const dailyMap = new Map<string, { profit: number; volume: number; trades: number }>();

        // Initialize all days with zero values
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMap.set(dateStr, { profit: 0, volume: 0, trades: 0 });
        }

        // Fill in actual data
        ordersData?.forEach((order: any) => {
          const dateStr = new Date(order.created_at).toISOString().split('T')[0];
          if (!dailyMap.has(dateStr)) return;

          const dayData = dailyMap.get(dateStr)!;
          dayData.trades++;
          dayData.volume += parseFloat(order.total_price || 0);

          // Calculate profit (simplified - could be enhanced)
          if (order.status === 'completed') {
            // Assume 2% platform fee as profit margin
            dayData.profit += parseFloat(order.total_price || 0) * 0.02;
          }
        });

        // Convert to array and sort by date
        const chartData: TradingData[] = [];
        let cumulativeProfit = 0;

        Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, data]) => {
            cumulativeProfit += data.profit;
            chartData.push({
              date,
              profit: Math.round(data.profit),
              volume: Math.round(data.volume),
              trades: data.trades,
              totalValue: Math.round(cumulativeProfit)
            });
          });

        setRealData(chartData);
      } catch (error) {
        console.error('Error processing trading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTradingData();
  }, [user, userId, timeframe]);

  // Always prefer real data over generated data
  const tradingData = useMemo(() => {
    // Show real data if we have ANY orders at all
    if (realData.length > 0) {
      console.log('📊 Using REAL trading data from database:', realData.length, 'data points');
      return realData;
    }

    console.log('📊 No real data found, using demo data');
    // Fallback to generated data if no real data
    const getDaysForTimeframe = (tf: string): number => {
      switch (tf) {
        case '7d': return 7;
        case '30d': return 30;
        case '90d': return 90;
        default: return 30;
      }
    };

    const generateTradingData = (days: number): TradingData[] => {
      const data: TradingData[] = [];
      let baseProfit = 1000;
      let baseVolume = 5000;
      let cumulativeProfit = 0;
      
      // Use seed for consistent data
      const seed = 12345;
      let seedValue = seed;
      const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Create realistic trading patterns
        const weekday = date.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        
        // Lower activity on weekends
        const weekdayMultiplier = isWeekend ? 0.6 : 1.0;
        
        // Add some market cycle patterns
        const cycleTrend = Math.sin((i / days) * Math.PI * 4) * 0.3;
        const randomVariation = (seededRandom() - 0.5) * 0.4;
        
        const profitMultiplier = (1 + cycleTrend + randomVariation) * weekdayMultiplier;
        const volumeMultiplier = (1 + cycleTrend * 0.5 + randomVariation * 0.3) * weekdayMultiplier;
        
        const dayProfit = Math.round(baseProfit * profitMultiplier);
        const dayVolume = Math.round(baseVolume * volumeMultiplier);
        const dayTrades = Math.floor((dayVolume / 1000) * (0.5 + seededRandom() * 0.5));
        
        cumulativeProfit += dayProfit;
        
        data.push({
          date: date.toISOString().split('T')[0],
          profit: dayProfit,
          volume: dayVolume,
          trades: dayTrades,
          totalValue: cumulativeProfit
        });
      }
      
      return data;
    };

    return generateTradingData(getDaysForTimeframe(timeframe));
  }, [timeframe]); // Only regenerate when timeframe changes

  const getMetricValue = (item: TradingData): number => {
    switch (activeMetric) {
      case 'profit': return item.profit;
      case 'volume': return item.volume;
      case 'trades': return item.trades;
      default: return item.profit;
    }
  };

  const getMetricColor = () => {
    switch (activeMetric) {
      case 'profit':
        return { primary: '#A855F7', secondary: '#C084FC', glow: 'rgba(168, 85, 247, 0.4)' };
      case 'volume':
        return { primary: '#9333EA', secondary: '#A855F7', glow: 'rgba(147, 51, 234, 0.4)' };
      case 'trades':
        return { primary: '#7C3AED', secondary: '#8B5CF6', glow: 'rgba(124, 58, 237, 0.4)' };
      default:
        return { primary: '#A855F7', secondary: '#C084FC', glow: 'rgba(168, 85, 247, 0.4)' };
    }
  };

  const colors = getMetricColor();
  const maxValue = Math.max(...tradingData.map(getMetricValue));
  const totalProfit = tradingData.reduce((sum, item) => sum + item.profit, 0);
  const totalVolume = tradingData.reduce((sum, item) => sum + item.volume, 0);
  const totalTrades = tradingData.reduce((sum, item) => sum + item.trades, 0);
  const avgProfit = Math.round(totalProfit / tradingData.length);

  // Draw the chart - only when data actually changes
  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw gradient background
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    backgroundGradient.addColorStop(0, 'rgba(31, 41, 55, 0.3)');
    backgroundGradient.addColorStop(1, 'rgba(17, 24, 39, 0.5)');
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.2)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const gridSpacing = chartWidth / (tradingData.length - 1);
    for (let i = 0; i < tradingData.length; i += Math.ceil(tradingData.length / 8)) {
      const x = padding + i * gridSpacing;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw area under curve
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    
    tradingData.forEach((item, index) => {
      const x = padding + (index / (tradingData.length - 1)) * chartWidth;
      const value = getMetricValue(item);
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      
      if (index === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.closePath();

    const areaGradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    areaGradient.addColorStop(0, colors.glow);
    areaGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Draw main line
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 3;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    tradingData.forEach((item, index) => {
      const x = padding + (index / (tradingData.length - 1)) * chartWidth;
      const value = getMetricValue(item);
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw data points
    ctx.shadowBlur = 0;
    tradingData.forEach((item, index) => {
      const x = padding + (index / (tradingData.length - 1)) * chartWidth;
      const value = getMetricValue(item);
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      
      const isHovered = hoveredPoint?.index === index;
      
      ctx.fillStyle = isHovered ? colors.secondary : colors.primary;
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 8 : 5, 0, Math.PI * 2);
      ctx.fill();

      if (isHovered) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw Y-axis labels
    ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      
      if (activeMetric === 'profit' || activeMetric === 'volume') {
        ctx.fillText(`${Math.round(value).toLocaleString('cs-CZ')}`, padding - 10, y);
      } else {
        ctx.fillText(`${Math.round(value)}`, padding - 10, y);
      }
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelCount = Math.min(6, tradingData.length);
    for (let i = 0; i < labelCount; i++) {
      const dataIndex = Math.floor((i / (labelCount - 1)) * (tradingData.length - 1));
      const x = padding + (dataIndex / (tradingData.length - 1)) * chartWidth;
      const date = new Date(tradingData[dataIndex].date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      ctx.fillText(dateStr, x, padding + chartHeight + 15);
    }

    chartDrawnRef.current = true;
  };

  // Draw chart only when necessary - not on every hover
  useEffect(() => {
    chartDrawnRef.current = false;
    drawChart();
  }, [tradingData, activeMetric, timeframe, maxValue]); // Remove hoveredPoint from dependencies

  // Handle mouse movement without redrawing chart
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !chartDrawnRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    
    if (x >= padding && x <= padding + chartWidth && y >= padding && y <= rect.height - padding) {
      const dataIndex = Math.round(((x - padding) / chartWidth) * (tradingData.length - 1));
      
      if (dataIndex >= 0 && dataIndex < tradingData.length) {
        // Calculate tooltip position relative to container with smart positioning
        let tooltipX = e.clientX - containerRect.left;
        let tooltipY = e.clientY - containerRect.top;
        
        const tooltipWidth = 200;
        const tooltipHeight = 120;
        
        // Adjust X position to keep tooltip in bounds
        if (tooltipX + tooltipWidth > containerRect.width) {
          tooltipX = tooltipX - tooltipWidth - 20;
        } else {
          tooltipX = tooltipX + 15;
        }
        
        // Adjust Y position to keep tooltip in bounds
        if (tooltipY - tooltipHeight < 0) {
          tooltipY = tooltipY + 20;
        } else {
          tooltipY = tooltipY - tooltipHeight - 10;
        }
        
        setHoveredPoint({ 
          index: dataIndex, 
          x: tooltipX, 
          y: tooltipY 
        });
        
        // Only redraw to update the hovered point visual
        requestAnimationFrame(() => {
          if (chartDrawnRef.current) {
            drawChart();
          }
        });
      }
    } else {
      setHoveredPoint(null);
      // Redraw to remove hover effects
      requestAnimationFrame(() => {
        if (chartDrawnRef.current) {
          drawChart();
        }
      });
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPoint(null);
    // Redraw to remove hover effects
    requestAnimationFrame(() => {
      if (chartDrawnRef.current) {
        drawChart();
      }
    });
  };

  const formatValue = (value: number): string => {
    if (activeMetric === 'profit' || activeMetric === 'volume') {
      return `${value.toLocaleString('cs-CZ')} Kč`;
    }
    return value.toString();
  };

  const getMetricIcon = () => {
    switch (activeMetric) {
      case 'profit': return <TrendingUp className="w-4 h-4" />;
      case 'volume': return <DollarSign className="w-4 h-4" />;
      case 'trades': return <Activity className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div ref={containerRef} className={`overflow-hidden relative ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-ink flex items-center">
            <TrendingUp className="w-6 h-6 text-purple-500 mr-2" />
            Trading Performance
          </h3>
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-subtle border border border-line rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
          </select>
        </div>

        {/* Metric Selector */}
        <div className="flex space-x-2">
          {[
            { key: 'profit', label: 'Profit', icon: TrendingUp, color: 'purple' },
            { key: 'volume', label: 'Volume', icon: DollarSign, color: 'purple' },
            { key: 'trades', label: 'Trades', icon: Activity, color: 'purple' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                activeMetric === key
                  ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                  : 'text-ink-muted hover:text-ink hover:bg-subtle'
              }`}
            >
              <Icon size={16} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {totalProfit.toLocaleString('cs-CZ')} Kč
            </div>
            <div className="text-ink-muted text-sm">Total Profit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {totalVolume.toLocaleString('cs-CZ')} Kč
            </div>
            <div className="text-ink-muted text-sm">Total Volume</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {totalTrades}
            </div>
            <div className="text-ink-muted text-sm">Total Trades</div>
          </div>
        </div>

        {/* Interactive Chart */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width="800"
            height="250"
            className="w-full h-60 rounded-lg cursor-crosshair bg-subtle"
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            style={{ display: 'block' }}
          />

          {/* Tooltip - positioned with fixed dimensions */}
          {hoveredPoint !== null && (
            <div
              className="absolute bg-elevated backdrop-blur-sm border border border-line/50 rounded-lg p-3 pointer-events-none z-50 shadow-xl"
              style={{
                left: `${hoveredPoint.x}px`,
                top: `${hoveredPoint.y}px`,
                boxShadow: `0 4px 15px ${colors.glow}`,
                width: '200px',
                transform: hoveredPoint.x > containerRef.current?.offsetWidth! - 220 ? 'translateX(-100%)' : 'none'
              }}
            >
              <div className="text-center">
                <div className="font-semibold text-ink flex items-center justify-center space-x-2 mb-1">
                  {getMetricIcon()}
                  <span>{formatValue(getMetricValue(tradingData[hoveredPoint.index]))}</span>
                </div>
                <div className="text-ink-muted text-sm mb-2">
                  {new Date(tradingData[hoveredPoint.index].date).toLocaleDateString('cs-CZ')}
                </div>
                <div className="text-xs text-ink-dim space-y-1">
                  <div>{tradingData[hoveredPoint.index].trades} trades</div>
                  <div>{tradingData[hoveredPoint.index].volume.toLocaleString('cs-CZ')} Kč volume</div>
                  <div>{tradingData[hoveredPoint.index].profit.toLocaleString('cs-CZ')} Kč profit</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-accent-soft border border border-line rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <span className="text-accent font-medium">Avg Daily Profit</span>
            </div>
            <div className="text-xl font-bold text-ink">
              {avgProfit.toLocaleString('cs-CZ')} Kč
            </div>
            <div className="text-accent text-sm">
              +{((avgProfit / 1000) * 100).toFixed(1)}% ROI
            </div>
          </div>

          <div className="bg-accent-soft border border border-line rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-accent" />
              <span className="text-accent font-medium">Peak Day</span>
            </div>
            <div className="text-xl font-bold text-ink">
              {Math.max(...tradingData.map(d => d.profit)).toLocaleString('cs-CZ')} Kč
            </div>
            <div className="text-accent text-sm">Best performance</div>
          </div>

          <div className="bg-purple-700/10 border border-purple-700/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-accent" />
              <span className="text-accent font-medium">Avg Trades/Day</span>
            </div>
            <div className="text-xl font-bold text-ink">
              {Math.round(totalTrades / tradingData.length)}
            </div>
            <div className="text-accent text-sm">Daily activity</div>
          </div>

          <div className="bg-purple-800/10 border border-purple-800/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <span className="text-accent font-medium">Success Rate</span>
            </div>
            <div className="text-xl font-bold text-ink">
              {stats.totalOrders > 0 ? `${stats.successRate.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-accent text-sm">{stats.totalOrders} total trades</div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="text-ink-muted capitalize">{activeMetric}</span>
            </div>
            {realData.length > 0 ? (
              <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-medium">Live Data</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-yellow-400 text-xs font-medium">Demo Data</span>
              </div>
            )}
          </div>

          <div className="text-ink-dim flex items-center space-x-2">
            <span>Updated: {new Date().toLocaleDateString('cs-CZ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingPerformanceChart;