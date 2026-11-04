import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#7c3aed', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'month', label: 'This month' },
  { value: 'prevMonth', label: 'Last month' },
  { value: 'all', label: 'All time' },
];

interface ReportData {
  kpis: {
    grossSales: number; netSales: number; refundTotal: number; discountTotal: number; shippingRevenue: number;
    taxCollected: number; grossProfit: number; totalOrders: number; averageOrderValue: number; productsSold: number;
    totalCustomers: number; newCustomers: number; pendingOrders: number; lowStock: number; outOfStock: number;
  };
  timeSeries: { date: string; revenue: number; orders: number }[];
  byCategory: { name: string; value: number }[];
  paymentBreakdown: { name: string; value: number }[];
  statusDistribution: { name: string; value: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  recentOrders: { id: string; orderNumber: string; customerName?: string | null; status: string; grandTotal: unknown; placedAt: string }[];
}

export default function DashboardPage() {
  const [range, setRange] = useState('30d');
  const { data, isLoading } = useQuery({
    queryKey: ['reports', range],
    queryFn: () => apiClient.get<ReportData>(`/admin/reports/sales?range=${range}`),
  });

  const k = data?.kpis;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Store performance overview"
        actions={
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <Button key={r.value} variant={range === r.value ? 'secondary' : 'ghost'} size="sm" onClick={() => setRange(r.value)}>
                {r.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross sales" value={formatPrice(k?.grossSales ?? 0)} sub="Revenue before discounts/tax" icon={DollarSign} />
        <StatCard label="Net sales" value={formatPrice(k?.netSales ?? 0)} sub="After tax & shipping removed" icon={TrendingUp} />
        <StatCard label="Orders" value={String(k?.totalOrders ?? 0)} sub={`${k?.productsSold ?? 0} items sold`} icon={ShoppingCart} />
        <StatCard label="Avg order value" value={formatPrice(k?.averageOrderValue ?? 0)} sub={`${k?.totalCustomers ?? 0} customers (${k?.newCustomers ?? 0} new)`} icon={Users} />
        <StatCard label="Gross profit" value={formatPrice(k?.grossProfit ?? 0)} sub={`${formatPrice(k?.refundTotal ?? 0)} refunds`} icon={Package} />
        <StatCard label="Refunds" value={formatPrice(k?.refundTotal ?? 0)} sub="Processed & in progress" icon={Package} />
        <StatCard label="Pending orders" value={String(k?.pendingOrders ?? 0)} sub="Awaiting payment" icon={AlertTriangle} trend="down" />
        <StatCard label="Low stock" value={String((k?.lowStock ?? 0) + (k?.outOfStock ?? 0))} sub={`${k?.outOfStock ?? 0} out of stock`} icon={AlertTriangle} trend="down" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Revenue over time</h3>
          {isLoading || !data ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.timeSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Sales by category</h3>
          {isLoading || !data ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                  {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Order status distribution</h3>
          {data && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Payment methods</h3>
          {data && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.paymentBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {data.paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Top products</h3>
          <div className="space-y-2">
            {(data?.topProducts ?? []).slice(0, 6).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="text-muted-foreground">{i + 1}.</span> <span className="truncate">{p.name}</span></span>
                <span className="font-medium">{formatPrice(p.revenue)}</span>
              </div>
            ))}
            {(!data || data.topProducts.length === 0) && <p className="text-sm text-muted-foreground">No data</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Recent orders</h3>
          <Button asChild variant="outline" size="sm"><Link to="/admin/orders">View all</Link></Button>
        </div>
        <div className="divide-y">
          {(data?.recentOrders ?? []).map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center justify-between py-3 text-sm hover:bg-muted/30">
              <div>
                <span className="font-medium">{o.orderNumber}</span>
                <span className="ml-2 text-muted-foreground">{o.customerName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatPrice(Number(o.grandTotal))}</span>
                <Badge variant="secondary">{o.status.toLowerCase().replaceAll('_', ' ')}</Badge>
              </div>
            </Link>
          ))}
          {(!data || data.recentOrders.length === 0) && <p className="py-6 text-center text-sm text-muted-foreground">No orders in this period</p>}
        </div>
      </Card>
    </div>
  );
}
