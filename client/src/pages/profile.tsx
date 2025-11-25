import { MobileShell } from "@/components/layout/mobile-shell";
import { User, Settings, Bell, Shield, LogOut, ChevronRight } from "lucide-react";

export default function Profile() {
  return (
    <MobileShell>
      <div className="p-6 pt-12 space-y-8">
        <header>
          <h1 className="text-2xl font-display font-bold mb-1">Profile</h1>
          <p className="text-secondary">Manage your account and preferences.</p>
        </header>

        <section className="bg-surface rounded-2xl p-6 border border-border flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-elevated border border-border flex items-center justify-center">
            <User size={32} className="text-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Moustapha</h2>
            <p className="text-secondary text-sm">Pro Member</p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">Settings</h3>
          
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Settings size={18} />
                </div>
                <span className="font-medium">General</span>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </div>
            <div className="p-4 flex items-center justify-between border-b border-border hover:bg-elevated transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                  <Bell size={18} />
                </div>
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-elevated transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success">
                  <Shield size={18} />
                </div>
                <span className="font-medium">Privacy & Security</span>
              </div>
              <ChevronRight size={18} className="text-secondary" />
            </div>
          </div>
        </section>

        <button className="w-full h-14 bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all rounded-xl text-destructive font-bold flex items-center justify-center gap-2 border border-destructive/20">
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </MobileShell>
  );
}
