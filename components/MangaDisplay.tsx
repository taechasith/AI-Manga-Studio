
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface MangaDisplayProps {
  isLoading: boolean;
  imageUrl: string | null;
  error: string | null;
}

const LoadingState: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-lg animate-pulse">
    <SparklesIcon className="w-16 h-16 text-purple-500 animate-ping" />
    <p className="mt-4 text-lg font-semibold text-gray-400">AI กำลังวาดผลงานชิ้นเอก...</p>
    <p className="text-sm text-gray-500">โปรดรอสักครู่</p>
  </div>
);

const Placeholder: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-lg text-center">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1-1m6-3l-2-2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 12a6 6 0 11-12 0 6 6 0 0112 0z" />
    </svg>
    <h3 className="mt-4 text-lg font-medium text-gray-400">ผลงานมังงะของคุณจะปรากฏที่นี่</h3>
    <p className="mt-1 text-sm text-gray-500">อัปโหลดรูปภาพและกดปุ่มสร้างได้เลย!</p>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/20 border-2 border-dashed border-red-500 rounded-lg text-center p-4">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="mt-4 text-lg font-medium text-red-300">เกิดข้อผิดพลาด</h3>
    <p className="mt-1 text-sm text-red-400">{message}</p>
  </div>
);


export const MangaDisplay: React.FC<MangaDisplayProps> = ({ isLoading, imageUrl, error }) => {
  return (
    <div className="w-full h-full flex-grow aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
      {isLoading && <LoadingState />}
      {!isLoading && error && <ErrorState message={error} />}
      {!isLoading && !error && !imageUrl && <Placeholder />}
      {!isLoading && !error && imageUrl && (
        <img src={imageUrl} alt="Generated Manga" className="w-full h-full object-contain" />
      )}
    </div>
  );
};
