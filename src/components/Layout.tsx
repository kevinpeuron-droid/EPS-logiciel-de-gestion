import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardCheck, Map, Settings, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const navItems = [
    { to: '/', icon: Calendar, label: 'Séances' },
    { to: '/students', icon: Users, label: 'Élèves' },
    { to: '/evaluations', icon: ClipboardCheck, label: 'Évals' },
    { to: '/sports', icon: Activity, label: 'Sports' },
    { to: '/facilities', icon: Map, label: 'Lieux' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] text-zinc-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight text-primary-600 flex items-center gap-3 font-display">
          <span className="bg-gradient-to-br from-primary-500 to-primary-700 text-white p-2 rounded-xl shadow-sm">
            <ClipboardCheck className="w-5 h-5" />
          </span>
          EPS-Master
        </h1>
        <button className="p-2.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all">
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-32 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-xl border border-zinc-200/50 rounded-3xl shadow-2xl z-20 px-2 py-2">
        <div className="flex justify-between items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-primary-50 text-primary-600 shadow-sm scale-105" 
                    : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50"
                )
              }
            >
              <item.icon className={cn("w-6 h-6 mb-0.5", "transition-transform duration-300")} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
