import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ImageUpload from './components/ImageUpload';
import StyleCard from './components/StyleCard';
import Login from './components/Login';
import { INTERIOR_STYLES, CURTAIN_COLORS, CURTAIN_LAYERS } from './constants';
import { InteriorStyle, CurtainOption, CurtainColor, CurtainLayer } from './types';
import { generateCurtainDesign, analyzeRoomSettings } from './services/geminiService';
import { Sparkles, RefreshCcw, Download, XCircle, Check, Layers, Wand2 } from 'lucide-react';
import { auth } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // App State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<InteriorStyle | null>(null);
  const [selectedCurtain, setSelectedCurtain] = useState<CurtainOption | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<CurtainLayer | null>(null);
  const [selectedColor, setSelectedColor] = useState<CurtainColor | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReasoning, setAnalysisReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !selectedCurtain || !selectedColor || !selectedLayer) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const resultImage = await generateCurtainDesign(
        originalImage, 
        selectedCurtain.promptModifier,
        selectedColor.prompt,
        selectedLayer.prompt
      );
      setGeneratedImage(resultImage);
    } catch (err: any) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการสร้างภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSmartAnalysis = async () => {
    if (!originalImage) return;
    
    setIsAnalyzing(true);
    setAnalysisReasoning(null);
    setError(null);

    try {
      const analysis = await analyzeRoomSettings(originalImage);
      
      // 1. Match Style
      const style = INTERIOR_STYLES.find(s => s.id === analysis.styleId) || INTERIOR_STYLES[0];
      setSelectedStyle(style);

      // 2. Match Curtain Type within that Style
      // Search for keyword in the name or id of the curtain options for this style
      let curtain = style.curtains.find(c => 
        c.name.toLowerCase().includes(analysis.curtainTypeKeyword.toLowerCase()) ||
        c.id.toLowerCase().includes(analysis.curtainTypeKeyword.toLowerCase())
      );
      // Fallback if strict keyword match fails (e.g. "Bamboo" vs "Wooden")
      if (!curtain) curtain = style.curtains[0];
      setSelectedCurtain(curtain);

      // 3. Match Color
      const color = CURTAIN_COLORS.find(c => c.id === analysis.colorId) || CURTAIN_COLORS[0];
      setSelectedColor(color);

      // 4. Match Layer
      const layer = CURTAIN_LAYERS.find(l => l.id === analysis.layerId) || CURTAIN_LAYERS[0];
      setSelectedLayer(layer);

      setAnalysisReasoning(analysis.reasoning);

    } catch (err) {
      console.error(err);
      setError('ไม่สามารถวิเคราะห์รูปภาพได้ กรุณาลองเลือกด้วยตนเอง');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setSelectedStyle(null);
    setSelectedCurtain(null);
    setSelectedLayer(null);
    setSelectedColor(null);
    setAnalysisReasoning(null);
    setError(null);
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `ep-decor-design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper to check if layer selection is disabled (e.g. for Sheer Only or Blinds)
  const isLayerSelectionDisabled = () => {
    if (!selectedCurtain) return true;
    // Disable layer selection for Blinds, Wooden, Vertical, or Sheer Only types
    const lowerName = selectedCurtain.name.toLowerCase();
    const lowerId = selectedCurtain.id.toLowerCase();
    return lowerName.includes('blinds') || 
           lowerName.includes('มู่ลี่') || 
           lowerName.includes('ม่านปรับแสง') || 
           lowerId.includes('sheer');
  };

  // Effect to auto-select layer 1 if disabled
  React.useEffect(() => {
    if (selectedCurtain && isLayerSelectionDisabled()) {
      setSelectedLayer(CURTAIN_LAYERS[0]); // Default to 1 layer
    } else if (selectedCurtain && !selectedLayer) {
      setSelectedLayer(null);
    }
  }, [selectedCurtain]);

  // Render Loading
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Render Login if not authenticated
  if (!user) {
    return <Login />;
  }

  // Render Main App if authenticated
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {/* Intro Section */}
        {!originalImage && (
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              🏡 แต่งบ้านสไตล์นี้... เลือกม่านแบบไหนถึงจะปัง?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              ลองออกแบบม่านที่ใช่สำหรับห้องของคุณด้วย AI เพียงอัปโหลดรูปถ่าย เลือกสไตล์ แล้วดูผลลัพธ์ทันที!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Image Area */}
          <div className="lg:col-span-7 space-y-6">
            {!originalImage ? (
              <ImageUpload onImageSelected={setOriginalImage} />
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white flex items-center justify-center min-h-[300px]">
                  {isGenerating ? (
                    <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-lg font-medium text-slate-700 animate-pulse">กำลังออกแบบม่านให้คุณ...</p>
                      <p className="text-sm text-slate-500 mt-2">AI กำลังวิเคราะห์ห้องและจัดวางผ้าม่าน</p>
                    </div>
                  ) : null}

                  {generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Generated Design" 
                      className="w-full h-auto block"
                    />
                  ) : (
                    <img 
                      src={originalImage} 
                      alt="Original Room" 
                      className="w-full h-auto block"
                    />
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                     {generatedImage ? (
                        <span className="bg-purple-600/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md">
                           ✨ AI Design
                        </span>
                     ) : (
                        <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md">
                           📷 Original
                        </span>
                     )}
                  </div>

                  {/* Reset Button (Absolute) */}
                   <button 
                    onClick={handleReset}
                    className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-slate-700 p-2 rounded-full shadow-lg backdrop-blur transition-all"
                    title="Start Over"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Compare/Download Actions */}
                {generatedImage && !isGenerating && (
                  <div className="flex justify-center gap-4">
                     <button 
                       onClick={() => setGeneratedImage(null)}
                       className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                     >
                       <RefreshCcw className="w-4 h-4 mr-2" /> ดูรูปเดิม
                     </button>
                     <button 
                       onClick={downloadImage}
                       className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 font-bold transition-all transform hover:-translate-y-0.5"
                     >
                       <Download className="w-4 h-4 mr-2" /> บันทึกรูป
                     </button>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* AI Analysis Button */}
            {originalImage && !isGenerating && (
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-1 rounded-2xl shadow-lg mb-6">
                 <button
                   onClick={handleSmartAnalysis}
                   disabled={isAnalyzing}
                   className="w-full bg-white hover:bg-opacity-95 text-slate-800 rounded-xl py-4 px-6 flex items-center justify-between transition-all"
                 >
                   <div className="flex items-center">
                     <div className={`bg-violet-100 p-2 rounded-lg mr-3 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                       <Wand2 className={`w-6 h-6 text-violet-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
                     </div>
                     <div className="text-left">
                       <h3 className="font-bold text-lg text-violet-900">AI อัจฉริยะ (Smart Analysis)</h3>
                       <p className="text-sm text-slate-500">
                         {isAnalyzing ? 'กำลังวิเคราะห์ห้องของคุณ...' : 'วิเคราะห์ห้องและแนะนำผ้าม่านที่เหมาะสม'}
                       </p>
                     </div>
                   </div>
                 </button>
                 {analysisReasoning && (
                   <div className="bg-white/90 mx-1 mb-1 mt-1 p-3 rounded-lg text-sm text-violet-800 border border-violet-100">
                      <span className="font-semibold">💡 AI แนะนำ: </span> 
                      {analysisReasoning}
                   </div>
                 )}
              </div>
            )}

            {/* Step 1: Choose Style */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs mr-2">1</span>
                เลือกสไตล์ห้องของคุณ
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {INTERIOR_STYLES.map((style) => (
                  <div key={style.id} className="h-32">
                    <StyleCard 
                      style={style} 
                      isSelected={selectedStyle?.id === style.id}
                      onSelect={(s) => {
                        setSelectedStyle(s);
                        setSelectedCurtain(null);
                        setSelectedLayer(null);
                        setSelectedColor(null);
                        setAnalysisReasoning(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Step 2: Choose Curtain */}
            {selectedStyle && (
              <section className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs mr-2">2</span>
                  เลือกรูปแบบผ้าม่าน (Curtain Style)
                </h3>
                <div className="space-y-3">
                  {selectedStyle.curtains.map((curtain) => (
                    <button
                      key={curtain.id}
                      onClick={() => setSelectedCurtain(curtain)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between
                        ${selectedCurtain?.id === curtain.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                        }
                      `}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{curtain.name}</div>
                        <div className="text-sm text-slate-500">{curtain.description}</div>
                      </div>
                      {selectedCurtain?.id === curtain.id && (
                         <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                             <Check className="w-3 h-3 text-white" />
                         </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Step 3: Choose Layers (Only for fabrics) */}
            {selectedCurtain && !isLayerSelectionDisabled() && (
               <section className="animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs mr-2">3</span>
                     เลือกชั้นผ้าม่าน (Layers)
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                     {CURTAIN_LAYERS.map((layer) => (
                        <button
                           key={layer.id}
                           onClick={() => setSelectedLayer(layer)}
                           className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col
                              ${selectedLayer?.id === layer.id
                                 ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                 : 'border-slate-200 bg-white hover:border-blue-300'
                              }
                           `}
                        >
                           <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800">{layer.name}</span>
                              {selectedLayer?.id === layer.id && <Check className="w-4 h-4 text-blue-500" />}
                           </div>
                           <span className="text-xs text-slate-500">{layer.description}</span>
                        </button>
                     ))}
                  </div>
               </section>
            )}

            {/* Step 4: Choose Color */}
            {selectedCurtain && selectedLayer && (
               <section className="animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs mr-2">{isLayerSelectionDisabled() ? '3' : '4'}</span>
                     เลือกสีผ้าม่าน (Curtain Color)
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                     {CURTAIN_COLORS.map((color) => (
                        <button
                           key={color.id}
                           onClick={() => setSelectedColor(color)}
                           className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                              ${selectedColor?.id === color.id
                                 ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 scale-105 shadow-sm'
                                 : 'border-slate-200 bg-white hover:border-blue-300'
                              }
                           `}
                        >
                           <div className={`w-8 h-8 rounded-full mb-2 shadow-inner border ${color.class}`}></div>
                           <span className="text-xs font-medium text-slate-700 text-center leading-tight">{color.name}</span>
                        </button>
                     ))}
                  </div>
               </section>
            )}

            {/* Generate Action */}
            <div className="pt-4 border-t border-slate-200">
              <button
                disabled={!originalImage || !selectedCurtain || !selectedColor || !selectedLayer || isGenerating}
                onClick={handleGenerate}
                className={`w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center transition-all shadow-lg
                  ${!originalImage || !selectedCurtain || !selectedColor || !selectedLayer || isGenerating
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-200/50 transform hover:scale-[1.02]'
                  }
                `}
              >
                {isGenerating ? (
                  'กำลังประมวลผล...'
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    ออกแบบผ้าม่าน
                  </>
                )}
              </button>
              {!originalImage && (
                <p className="text-center text-xs text-slate-400 mt-3">
                  กรุณาอัปโหลดรูปภาพก่อนเริ่มใช้งาน
                </p>
              )}
            </div>
            
            {/* Promo / Tip */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-100">
               <h4 className="font-bold text-amber-800 text-sm mb-1">💡 E.P. DECOR Tip</h4>
               <p className="text-xs text-amber-700 leading-relaxed">
                  การเลือกสีม่านที่ตัดกับสีผนังจะทำให้ห้องดูมีมิติ หรือเลือกสีโทนเดียวกันเพื่อให้ห้องดูกว้างขึ้น
               </p>
            </div>

          </div>
        </div>
      </main>

      {/* Copyright Footer */}
      <footer className="bg-slate-800 text-slate-400 py-6 text-center text-sm">
        <p>โปรแกรมนี้เป็นลิขสิทธ์ของ EPDECOR แต่เพียงผู้เดียว</p>
      </footer>
    </div>
  );
};

export default App;