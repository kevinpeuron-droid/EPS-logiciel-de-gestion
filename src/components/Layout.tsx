import { Outlet, NavLink } from 'react-router-dom';
import { Users, Calendar, ClipboardCheck, Map, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

export function Layout() {
  const navItems = [
    { to: '/', icon: Calendar, label: 'Séances' },
    { to: '/students', icon: Users, label: 'Élèves' },
    { to: '/evaluations', icon: ClipboardCheck, label: 'Évals' },
    { to: '/facilities', icon: Map, label: 'Lieux' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-indigo-600 flex items-center gap-2">
          <span className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <ClipboardCheck className="w-5 h-5" />
          </span>
          EPS-Master
        </h1>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24 max-w-3xl mx-auto w-full">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                )
              }
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
