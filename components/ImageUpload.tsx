import React, { useRef } from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (base64: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full aspect-video bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 hover:border-blue-400 transition-colors group cursor-pointer relative overflow-hidden"
         onClick={() => fileInputRef.current?.click()}>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="z-10 flex flex-col items-center text-center">
        <div className="bg-white p-4 rounded-full shadow-md mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          อัปโหลดรูปหน้าต่างของคุณ
        </h3>
        <p className="text-sm text-slate-500 max-w-xs">
          คลิกเพื่อเลือกรูป หรือถ่ายรูปหน้าต่างห้องที่ต้องการติดม่าน
        </p>
        
        <div className="mt-6 flex gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <ImageIcon className="w-3 h-3 mr-1" /> ใช้รูปถ่าย
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                <Camera className="w-3 h-3 mr-1" /> ใช้กล้อง
            </span>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
