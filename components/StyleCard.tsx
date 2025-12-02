import React from 'react';
import { InteriorStyle } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface StyleCardProps {
  style: InteriorStyle;
  isSelected: boolean;
  onSelect: (style: InteriorStyle) => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(style)}
      className={`relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all duration-300 w-full h-full
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]' 
          : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
        </div>
      )}
      
      <div className="text-3xl mb-3">{style.icon}</div>
      <h3 className="font-bold text-slate-800 mb-1">{style.name}</h3>
      <p className="text-xs text-slate-500 line-clamp-3">{style.description}</p>
    </button>
  );
};

export default StyleCard;
