import { MobileShell } from "@/components/layout/mobile-shell";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const data = [
  { name: "M", weight: 84.5 },
  { name: "T", weight: 84.8 },
  { name: "W", weight: 84.6 },
  { name: "T", weight: 85.0 },
  { name: "F", weight: 85.2 },
  { name: "S", weight: 85.1 },
  { name: "S", weight: 85.3 },
];

export default function Progress() {
  return (
    <MobileShell>
      <div className="p-6 pt-12 space-y-8">
        <header>
          <h1 className="text-2xl font-display font-bold mb-1">Weekly Progress</h1>
          <p className="text-secondary">You're on track for your 90kg goal.</p>
        </header>

        {/* Weight Chart */}
        <section className="bg-surface rounded-2xl p-6 border border-border">
          <div className="flex justify-between items-end mb-6">
             <div>
               <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">Body Weight</h2>
               <p className="text-3xl font-bold text-white mt-1">85.2 <span className="text-sm text-secondary font-normal">kg</span></p>
             </div>
             <div className="bg-success/10 text-success px-3 py-1 rounded-full text-sm font-bold">
               +0.7kg
             </div>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis 
                  dataKey="name" 
                  stroke="#636366" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2C2C2E', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar 
                  dataKey="weight" 
                  fill="hsl(210 100% 52%)" 
                  radius={[4, 4, 4, 4]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-surface p-5 rounded-2xl border border-border">
              <p className="text-secondary text-xs font-bold uppercase mb-2">Workouts</p>
              <p className="text-3xl font-bold text-white">4/5</p>
              <div className="mt-2 h-1.5 w-full bg-elevated rounded-full overflow-hidden">
                 <div className="h-full bg-work w-[80%]" />
              </div>
           </div>
           <div className="bg-surface p-5 rounded-2xl border border-border">
              <p className="text-secondary text-xs font-bold uppercase mb-2">Avg Rest</p>
              <p className="text-3xl font-bold text-warning">+45s</p>
              <p className="text-xs text-secondary mt-1">vs Target</p>
           </div>
           <div className="bg-surface p-5 rounded-2xl border border-border">
              <p className="text-secondary text-xs font-bold uppercase mb-2">Protein</p>
              <p className="text-3xl font-bold text-success">155g</p>
              <p className="text-xs text-secondary mt-1">Avg Daily</p>
           </div>
           <div className="bg-surface p-5 rounded-2xl border border-border">
              <p className="text-secondary text-xs font-bold uppercase mb-2">Sleep</p>
              <p className="text-3xl font-bold text-white">7h 20m</p>
              <p className="text-xs text-secondary mt-1">Avg Nightly</p>
           </div>
        </section>
      </div>
    </MobileShell>
  );
}
