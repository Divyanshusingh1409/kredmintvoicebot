import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Key, 
  LogOut, 
  Bot,
  AudioWaveform,
  Menu,
  X,
  PhoneForwarded,
  ScrollText
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Call Logs', path: '/logs', icon: ScrollText },
    { name: 'AI Agents', path: '/agents', icon: Bot },
    { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
    { name: 'SIP Integration', path: '/sip', icon: PhoneForwarded },
    { name: 'Live Demo', path: '/live', icon: AudioWaveform },
    { name: 'API Keys', path: '/api-keys', icon: Key },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">K</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Kredmint.ai</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-colors
                ${isActive(item.path) 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} className="mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <button className="flex items-center w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={20} className="mr-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center space-x-4 ml-auto">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-900">Admin User</span>
              <span className="text-xs text-slate-500">admin@kredmint.com</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              A
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;