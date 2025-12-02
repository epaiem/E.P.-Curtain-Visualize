import React from 'react';
import { Palette } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">E.P. Curtain Visualize</h1>
              <p className="text-xs text-slate-500 -mt-1">Curtain Design Visualizer</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-medium text-slate-600">
              ออกแบบผ้าม่านตามสไตล์คุณ
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;