import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { cn } from '../utils';

interface RevenueChartProps {
  data: { name: string; revenue: number }[];
  primaryColor?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, primaryColor }) => {
  const extractBaseColor = (colorStr?: string) => {
    if (!colorStr) return '#4f46e5';
    if (!colorStr.includes('gradient')) return colorStr;
    const match = colorStr.match(/(?:#[a-fA-F0-9]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\))/);
    return match ? match[0] : '#4f46e5';
  };

  const chartColor = extractBaseColor(primaryColor);
  const areaGradient = { start: chartColor, end: chartColor };

  const currentMonthRevenue = data[data.length - 1]?.revenue || 0;
  const previousMonthRevenue = data[data.length - 2]?.revenue || 0;

  const percentageChange = previousMonthRevenue === 0
    ? (currentMonthRevenue > 0 ? 100 : 0)
    : Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);

  const isPositive = percentageChange >= 0;

  return (
    <div className="bg-white dark:bg-[#0d0d0d] p-6 sm:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 blur-[100px] rounded-full" style={{ backgroundColor: `${chartColor}10` }} />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <TrendingUp className="w-4 h-4" style={{ color: chartColor }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Revenue Analytics</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white">₹{currentMonthRevenue.toLocaleString()}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total revenue this month</p>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto",
          isPositive
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(percentageChange)}% vs last month
        </div>
      </div>

      <div className="flex-1 min-h-[250px] w-full">
        {data.length === 0 || data.every(d => d.revenue === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
            <BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">No revenue data available</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Check back once payments are recorded</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaGradient.start} stopOpacity={0.8} />
                  <stop offset="50%" stopColor={areaGradient.end} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={areaGradient.end} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={areaGradient.start} />
                  <stop offset="100%" stopColor={areaGradient.end} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={chartColor}
                strokeOpacity={0.2}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                dy={15}
                tickFormatter={(value) => {
                  const [year, month] = value.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleString('default', { month: 'short' });
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
              />
              <Tooltip
                cursor={{ stroke: chartColor, strokeWidth: 2, strokeDasharray: '5 5' }}
                contentStyle={{
                  backgroundColor: `${chartColor}CC`, // Theme color at 80% opacity
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: `0 20px 40px -12px ${chartColor}66`,
                  padding: '16px'
                }}
                itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                labelStyle={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '10px', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                labelFormatter={(label) => {
                  const [year, month] = label.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                }}
                active={true}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={chartColor}
                strokeWidth={5}
                strokeLinecap="round"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                dot={{ r: 6, fill: "#fff", stroke: chartColor, strokeWidth: 3 }}
                activeDot={{
                  r: 10,
                  strokeWidth: 4,
                  stroke: "#fff",
                  fill: chartColor,
                  className: "animate-pulse shadow-lg"
                }}
                animationDuration={2000}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
