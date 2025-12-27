
import React from 'react';
import { LogOut, Palette, History, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ userEmail, onLogout }) => {
  const scrollToHistory = () => {
    const element = document.getElementById('history-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            
            <div className="hidden xs:block">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">E.P. Curtain</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Visualize AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {userEmail && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <div className="flex items-center text-xs font-semibold text-slate-500">
                  <UserIcon className="w-3 h-3 mr-1" />
                  Logged in as
                </div>
                <div className="text-sm font-bold text-slate-800">{userEmail}</div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button 
                onClick={scrollToHistory}
                className="flex items-center px-3 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-100"
              >
                <History className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">ประวัติของฉัน</span>
              </button>

              {onLogout && (
                <button 
                  onClick={onLogout}
                  className="flex items-center p-2 sm:px-3 sm:py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">ออก</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
