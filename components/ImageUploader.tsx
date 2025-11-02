import React, { useCallback, useState, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ImageUploaderProps {
  onImageAdd: (files: FileList) => void;
  onImageRemove: (index: number) => void;
  imagePreviews: string[];
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageAdd, onImageRemove, imagePreviews }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImageAdd(event.target.files);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onImageAdd(event.dataTransfer.files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {imagePreviews.map((preview, index) => (
        <div key={index} className="relative w-full aspect-square rounded-lg overflow-hidden group border-2 border-gray-600">
          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onImageRemove(index)}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
              aria-label={`Remove image ${index + 1}`}
            >
              <TrashIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      ))}

      <div
        onClick={handleUploadClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`relative w-full aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-colors duration-300
          ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 hover:border-purple-400 hover:bg-gray-800'}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          multiple // Allow multiple file selection
        />
        <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
          <UploadIcon className="w-10 h-10" />
          <p className="text-sm font-semibold mt-2">เพิ่มรูปภาพ</p>
          <p className="text-xs text-gray-500">ลากและวางไฟล์ที่นี่</p>
        </div>
      </div>
    </div>
  );
};