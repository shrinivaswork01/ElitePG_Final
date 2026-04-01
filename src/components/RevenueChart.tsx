import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../utils';

interface RevenueChartProps {
  data: { name: string; revenue: number }[];
  primaryColor?: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, primaryColor = '#4F46E5' }) => {
  const currentMonthRevenue = data[data.length - 1]?.revenue || 0;
  const previousMonthRevenue = data[data.length - 2]?.revenue || 0;
  
  const percentageChange = previousMonthRevenue === 0 
    ? (currentMonthRevenue > 0 ? 100 : 0)
    : Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100);

  const isPositive = percentageChange >= 0;

  return (
    <div className="bg-white dark:bg-[#0d0d0d] p-6 sm:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[100px] rounded-full" />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="currentColor" 
              className="text-gray-100 dark:text-white/5" 
            />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }} 
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
              tick={{ fontSize: 10, fontWeight: 600, fill: '#94A3B8' }}
              tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
            />
            <Tooltip
              cursor={{ stroke: primaryColor, strokeWidth: 2, strokeDasharray: '5 5' }}
              contentStyle={{ 
                backgroundColor: 'rgba(15, 15, 15, 0.9)', 
                backdropFilter: 'blur(12px)',
                borderRadius: '24px', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: `0 25px 50px -12px ${primaryColor}40`,
                padding: '16px'
              }}
              itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
              labelStyle={{ color: '#94A3B8', fontSize: '10px', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(label) => {
                const [year, month] = label.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                return date.toLocaleString('default', { month: 'long', year: 'numeric' });
              }}
              active={true}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={primaryColor}
              strokeWidth={4}
              dot={{ r: 6, fill: primaryColor, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, strokeWidth: 4, stroke: primaryColor + '33', fill: primaryColor }}
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
