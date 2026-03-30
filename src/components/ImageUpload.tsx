import React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  images, 
  onChange, 
  maxImages = 5,
  label = "Upload Images"
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images.`);
      return;
    }

    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is too large (> 2MB).`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onChange([...images, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {images.length} / {maxImages}
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {images.map((img, index) => (
          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
            <img src={img} alt={`upload-${index}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-indigo-500/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer group">
            <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>
    </div>
  );
};

