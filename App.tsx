
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { MangaDisplay } from './components/MangaDisplay';
import { DrawingCanvas } from './components/DrawingCanvas';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { generateMangaFromImage, detectTextBubbles, editTextInImage, Bubble, EditedBubble } from './services/geminiService';
import { fileToBase64, dataURLtoFile } from './utils/fileUtils';
import { TrashIcon } from './components/icons/TrashIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ReloadIcon } from './components/icons/ReloadIcon';
import { PencilIcon } from './components/icons/PencilIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { UploadIcon } from './components/icons/UploadIcon';


const mangaStyles = {
  kodomomuke: {
    name: 'โคโดโมะมุเกะ',
    description: 'สำหรับเด็กเล็ก เนื้อเรื่องเรียบง่าย',
    prompt: 'Kodomomuke manga style, aimed at young children. Features simple, clear line work, large expressive characters, and a bright, wholesome atmosphere. The story should be easy to understand and often teaches a moral lesson.',
  },
  shonen: {
    name: 'โชเน็น',
    description: 'สำหรับเด็กผู้ชาย เน้นแอ็คชั่น',
    prompt: 'Classic Shonen manga style, with dynamic action lines, bold characters, and high-contrast shading suitable for adventure and fight scenes. Emphasizes friendship, perseverance, and growth.',
  },
  shojo: {
    name: 'โชโจะ',
    description: 'สำหรับเด็กผู้หญิง เน้นความรัก',
    prompt: 'Elegant Shojo manga style, with detailed expressive eyes, flowing hair, floral or sparkling motifs, and a strong focus on emotions, romance, and relationships.',
  },
  seinen: {
    name: 'เซเน็น',
    description: 'สำหรับชายหนุ่ม เนื้อหาซับซ้อน',
    prompt: 'Mature Seinen manga style, featuring realistic details, intricate backgrounds, complex characters, and a gritty, cinematic atmosphere. Themes can be psychological, philosophical, or contain mature content.',
  },
  josei: {
    name: 'โจเซย์',
    description: 'สำหรับหญิงสาว เนื้อหาสมจริง',
    prompt: 'Sophisticated Josei manga style, targeting adult women. Features a more realistic and subtle art style, focusing on everyday life, mature relationships, and relatable adult experiences. Can include historical or biographical elements.',
  },
};

const mangaGenres = {
  action: {
    name: 'แอ็คชั่น / ผจญภัย',
    description: 'การต่อสู้ การเดินทาง',
    prompt: 'The story should be an action/adventure, focusing on combat, journeys, or grand adventures.',
  },
  romance: {
    name: 'โรแมนติก',
    description: 'ความรัก ความสัมพันธ์',
    prompt: 'The story should be a romance, focusing on love and relationships.',
  },
  fantasy: {
    name: 'แฟนตาซี',
    description: 'เวทมนตร์ สิ่งเหนือธรรมชาติ',
    prompt: 'The story should be a fantasy, set in a world with magic and supernatural elements.',
  },
  horror: {
    name: 'สยองขวัญ',
    description: 'เรื่องน่ากลัว ชวนขนลุก',
    prompt: 'The story should be a horror, designed to be frightening or chilling.',
  },
  scifi: {
    name: 'ไซไฟ',
    description: 'อนาคต นวัตกรรม',
    prompt: 'The story should be sci-fi, focusing on the future, technological innovations, or science.',
  },
  sports: {
    name: 'กีฬา',
    description: 'การแข่งขัน การฝึกฝน',
    prompt: 'The story should be about sports, focusing on competition or training.',
  },
  comedy: {
    name: 'ตลก',
    description: 'อารมณ์ขัน สนุกสนาน',
    prompt: 'The story should be a comedy, focusing on humor and fun.',
  },
  mystery: {
    name: 'ลึกลับ / สืบสวน',
    description: 'ปริศนา การสืบสวน',
    prompt: 'The story should be a mystery/detective story, focusing on puzzles and investigation.',
  }
};


type MangaStyleKey = keyof typeof mangaStyles;
type MangaGenreKey = keyof typeof mangaGenres;

interface HistoryItem {
  id: string;
  imageUrl: string;
  style: MangaStyleKey | 'reference';
  genre: MangaGenreKey;
  prompt: string;
  timestamp: number;
  referenceImageUrl?: string | null;
}

const App: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<MangaStyleKey | 'reference'>('kodomomuke');
  const [selectedGenre, setSelectedGenre] = useState<MangaGenreKey>('action');
  const [prompt, setPrompt] = useState<string>('');
  const [generatedManga, setGeneratedManga] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputMode, setInputMode] = useState<'upload' | 'draw'>('upload');
  const isInitialMount = useRef(true);
  const mangaDisplayRef = useRef<HTMLDivElement>(null);

  // State for editing feature
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isEditLoading, setIsEditLoading] = useState<boolean>(false);
  const [detectedBubbles, setDetectedBubbles] = useState<Bubble[]>([]);
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({});
  const [originalImageForEdit, setOriginalImageForEdit] = useState<string | null>(null);
  
  // State for reference style
  const [referenceStyleImage, setReferenceStyleImage] = useState<File | null>(null);
  const [referenceStylePreview, setReferenceStylePreview] = useState<string | null>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);


  // Load history from localStorage on initial mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('mangaHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem('mangaHistory');
    }
  }, []);

  // Sync history to localStorage and handle quota errors
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    if (history.length === 0) {
        localStorage.removeItem('mangaHistory');
        return;
    }
    
    let historyToSave = [...history];
    while (true) {
        try {
            localStorage.setItem('mangaHistory', JSON.stringify(historyToSave));
            // If we had to truncate history to make it fit, update the state to match.
            if (historyToSave.length < history.length) {
                console.warn(`History was truncated to ${historyToSave.length} items to fit in localStorage.`);
                setHistory(historyToSave);
            }
            return; // Success
        } catch (e) {
            if (historyToSave.length > 0 && e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                console.warn('Local storage quota exceeded. Removing the oldest history item to make space.');
                historyToSave.pop(); // Remove the oldest item and retry loop
            } else {
                console.error("Failed to save history to localStorage", e);
                return; // Unrecoverable error or history is empty, so stop.
            }
        }
    }
  }, [history]);

  const handleImageAdd = useCallback((files: FileList) => {
    const newFiles = Array.from(files);
    if (newFiles.length === 0) return;

    setImageFiles(prevFiles => [...prevFiles, ...newFiles]);

    const newPreviewsPromises = newFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            reject(new Error("File reading failed"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newPreviewsPromises).then(newPreviews => {
      setImagePreviews(prevPreviews => [...prevPreviews, ...newPreviews]);
    }).catch(err => {
      console.error("Error creating image previews:", err);
      setError("ไม่สามารถแสดงตัวอย่างรูปภาพได้");
    });
  }, []);

  const handleImageRemove = useCallback((index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrawingSave = (dataUrl: string) => {
    const file = dataURLtoFile(dataUrl, `drawing-${Date.now()}.png`);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    handleImageAdd(dataTransfer.files);
    setInputMode('upload');
  };

  const handleReferenceImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setReferenceStyleImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceStylePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateManga = async () => {
    if (imageFiles.length === 0 && inputMode === 'upload') {
      setError('กรุณาอัปโหลดรูปภาพอย่างน้อยหนึ่งภาพ');
      return;
    }
    if (selectedStyle === 'reference' && !referenceStyleImage) {
      setError('กรุณาอัปโหลดรูปภาพอ้างอิงสำหรับสไตล์');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedManga(null);

    try {
      const imageParts = await Promise.all(imageFiles.map(fileToBase64));
      
      let stylePrompt: string;
      if (selectedStyle === 'reference' && referenceStyleImage) {
        const refImagePart = await fileToBase64(referenceStyleImage);
        imageParts.push(refImagePart); // Add reference image to the parts
        stylePrompt = `Use the last uploaded image as a style reference. Replicate its artistic style, color palette, line work, and overall mood for the manga generation. The style is more important than the content of the reference image.`;
      } else if (selectedStyle !== 'reference') {
        stylePrompt = mangaStyles[selectedStyle].prompt;
      } else {
        stylePrompt = ''; // Should not happen due to checks above
      }

      const genrePrompt = mangaGenres[selectedGenre].prompt;
      const fullPrompt = `Task: Generate a single manga panel.
Style Guideline: ${stylePrompt}
Genre Guideline: ${genrePrompt}
User's additional instructions: ${prompt || 'None'}.
Please combine the uploaded images and these instructions to create a cohesive and visually appealing manga panel.`;

      const result = await generateMangaFromImage(imageParts, fullPrompt);
      setGeneratedManga(result);

      const newHistoryItem: HistoryItem = {
        id: new Date().toISOString(),
        imageUrl: result,
        style: selectedStyle,
        genre: selectedGenre,
        prompt,
        timestamp: Date.now(),
        referenceImageUrl: selectedStyle === 'reference' ? referenceStylePreview : null,
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]);
      
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างมังงะ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setGeneratedManga(item.imageUrl);
    setSelectedStyle(item.style);
    setSelectedGenre(item.genre);
    setPrompt(item.prompt);
    setError(null);
    setIsEditing(false);
    if(item.style === 'reference' && item.referenceImageUrl) {
      setReferenceStylePreview(item.referenceImageUrl);
      setReferenceStyleImage(null);
    }
    setImageFiles([]);
    setImagePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const downloadManga = () => {
    if (generatedManga) {
      const link = document.createElement('a');
      link.href = generatedManga;
      link.download = `manga-studio-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEditClick = async () => {
    if (!generatedManga) return;
    setIsEditing(true);
    setIsEditLoading(true);
    setOriginalImageForEdit(generatedManga);
    setEditedTexts({});
    
    try {
      const file = dataURLtoFile(generatedManga, 'manga.png');
      const imagePart = await fileToBase64(file);
      const bubbles = await detectTextBubbles(imagePart);
      setDetectedBubbles(bubbles);
      const initialTexts: Record<number, string> = {};
      bubbles.forEach((bubble, index) => {
        initialTexts[index] = bubble.text;
      });
      setEditedTexts(initialTexts);
    } catch(err: any) {
      setError(err.message || 'ไม่สามารถตรวจจับช่องคำพูดได้');
      setIsEditing(false);
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!originalImageForEdit) return;

    const editedBubbles: EditedBubble[] = detectedBubbles.map((bubble, index) => ({
      ...bubble,
      newText: editedTexts[index] || bubble.text,
    })).filter(bubble => bubble.newText !== bubble.text);

    if (editedBubbles.length === 0) {
      setIsEditing(false);
      return;
    }
    
    setIsEditLoading(true);
    setError(null);
    
    try {
      const file = dataURLtoFile(originalImageForEdit, 'manga.png');
      const imagePart = await fileToBase64(file);
      const newImage = await editTextInImage(imagePart, editedBubbles);
      setGeneratedManga(newImage);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดระหว่างการแก้ไขภาพ');
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDetectedBubbles([]);
    setEditedTexts({});
    setOriginalImageForEdit(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white selection:bg-purple-500 selection:text-white">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Controls Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 p-5 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-300">1. ใส่รูปภาพของคุณ</h2>
              <div className="flex border border-gray-700 rounded-lg p-1 bg-gray-900 mb-4">
                <button onClick={() => setInputMode('upload')} className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${inputMode === 'upload' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  อัปโหลด
                </button>
                <button onClick={() => setInputMode('draw')} className={`w-1/2 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${inputMode === 'draw' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                  วาดเอง
                </button>
              </div>
              {inputMode === 'upload' ? (
                <ImageUploader onImageAdd={handleImageAdd} onImageRemove={handleImageRemove} imagePreviews={imagePreviews} />
              ) : (
                <DrawingCanvas onCancel={() => setInputMode('upload')} onSave={handleDrawingSave} />
              )}
            </div>

            <div className="bg-gray-800 p-5 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-300">2. เลือกสไตล์มังงะ</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(mangaStyles).map(([key, { name }]) => (
                  <button key={key} onClick={() => setSelectedStyle(key as MangaStyleKey)} className={`p-3 text-center rounded-lg transition-all duration-200 border-2 ${selectedStyle === key ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-gray-700 border-gray-600 hover:border-purple-500 hover:bg-gray-600'}`}>
                    <span className="font-semibold text-sm">{name}</span>
                  </button>
                ))}
                <button onClick={() => setSelectedStyle('reference')} className={`p-3 text-center rounded-lg transition-all duration-200 border-2 flex flex-col items-center justify-center gap-1 ${selectedStyle === 'reference' ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-gray-700 border-gray-600 hover:border-purple-500 hover:bg-gray-600'}`}>
                    <ImageIcon className="w-5 h-5" />
                    <span className="font-semibold text-sm">ใช้ภาพอ้างอิง</span>
                </button>
              </div>
              {selectedStyle === 'reference' && (
                <div className="mt-4">
                  <input type="file" accept="image/*" onChange={handleReferenceImageChange} ref={referenceFileInputRef} className="hidden" />
                  <div onClick={() => referenceFileInputRef.current?.click()} className="cursor-pointer bg-gray-700 rounded-lg p-4 border-2 border-dashed border-gray-600 hover:border-purple-400 transition-colors">
                    {referenceStylePreview ? (
                      <div className="relative">
                        <img src={referenceStylePreview} alt="Reference Preview" className="w-full h-auto max-h-40 object-contain rounded" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white font-semibold">เปลี่ยนรูปภาพ</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <UploadIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-semibold">อัปโหลดภาพสไตล์อ้างอิง</p>
                        <p className="text-xs text-gray-500">คลิกเพื่อเลือกไฟล์</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-800 p-5 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-300">3. เลือกแนวเรื่อง</h2>
              <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value as MangaGenreKey)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition">
                {Object.entries(mangaGenres).map(([key, { name }]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-800 p-5 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-300">4. เพิ่มคำสั่ง (ถ้ามี)</h2>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="เช่น: ให้ตัวละครหลักยิ้มอย่างมีความสุขใต้ต้นซากุระ"
                className="w-full p-3 h-28 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition resize-none"
              />
            </div>

            <button
              onClick={handleGenerateManga}
              disabled={isLoading || (inputMode === 'upload' && imageFiles.length === 0)}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-lg rounded-xl shadow-lg hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              <SparklesIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'กำลังสร้าง...' : 'สร้างมังงะของคุณ!'}
            </button>
          </div>

          {/* Display Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="sticky top-24">
              <div ref={mangaDisplayRef} className="relative">
                <MangaDisplay isLoading={isLoading} imageUrl={generatedManga} error={error} />

                {isEditing && !isEditLoading && generatedManga && (
                  <div className="absolute inset-0">
                    {detectedBubbles.map((bubble, index) => {
                      const { x1, y1, x2, y2 } = bubble.box;
                      const width = (x2 - x1) * 100;
                      const height = (y2 - y1) * 100;
                      const left = x1 * 100;
                      const top = y1 * 100;
                      return (
                        <textarea
                          key={index}
                          value={editedTexts[index] || ''}
                          onChange={(e) => setEditedTexts(prev => ({...prev, [index]: e.target.value}))}
                          className="absolute bg-white/80 text-black p-1 border border-purple-500 rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                            fontSize: mangaDisplayRef.current ? `${(mangaDisplayRef.current.clientHeight * height / 100) / 5}px` : '12px'
                          }}
                        />
                      )
                    })}
                  </div>
                )}
                {isEditLoading && (
                   <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                      <SparklesIcon className="w-12 h-12 text-purple-400 animate-spin" />
                      <p className="mt-4 text-lg font-semibold">{isEditing ? 'กำลังหาช่องคำพูด...' : 'กำลังแก้ไขภาพ...'}</p>
                   </div>
                )}
              </div>
              
              {!isLoading && generatedManga && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {isEditing ? (
                    <>
                       <button onClick={handleSaveEdits} disabled={isEditLoading} className="py-2 px-5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                        บันทึกการแก้ไข
                      </button>
                      <button onClick={handleCancelEdit} disabled={isEditLoading} className="py-2 px-5 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={downloadManga} className="flex items-center gap-2 py-2 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">
                        <DownloadIcon className="w-5 h-5"/> ดาวน์โหลด
                      </button>
                      <button onClick={handleGenerateManga} className="flex items-center gap-2 py-2 px-5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
                        <ReloadIcon className="w-5 h-5"/> สร้างใหม่
                      </button>
                      <button onClick={handleEditClick} className="flex items-center gap-2 py-2 px-5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
                        <PencilIcon className="w-5 h-5"/> แก้ไขข้อความ
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center text-purple-300">ประวัติการสร้าง</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {history.map((item) => (
                <div key={item.id} onClick={() => handleHistoryClick(item)} className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 transition-all duration-300 transform hover:-translate-y-1">
                  <img src={item.imageUrl} alt="Generated manga from history" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-white text-sm font-semibold">{item.style === 'reference' ? 'สไตล์อ้างอิง' : mangaStyles[item.style]?.name}</p>
                    <p className="text-gray-300 text-xs">{mangaGenres[item.genre]?.name}</p>
                  </div>
                  <button onClick={(e) => handleDeleteHistory(item.id, e)} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete history item">
                    <TrashIcon className="w-4 h-4"/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
