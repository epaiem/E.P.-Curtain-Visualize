import React from 'react';
import { LogOut, Palette } from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">E.P. Curtain Visualize</h1>
              <p className="text-xs text-slate-500 -mt-1">Curtain Design Visualizer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm font-medium text-slate-600">
              ออกแบบผ้าม่านตามสไตล์คุณ
            </span>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
              >
                <LogOut className="w-3 h-3 mr-1" />
                ออกจากระบบ
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;