
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ImageUpload from './components/ImageUpload';
import StyleCard from './components/StyleCard';
import Login from './components/Login';
import { INTERIOR_STYLES, CURTAIN_COLORS, CURTAIN_LAYERS } from './constants';
import { InteriorStyle, CurtainOption, CurtainColor, CurtainLayer } from './types';
import { generateCurtainDesign, analyzeRoomSettings } from './services/geminiService';
import { saveDesign, getUserDesigns, DesignRecord } from './services/databaseService';
import { Sparkles, RefreshCcw, Download, XCircle, Check, Wand2, History, Clock, ChevronRight, AlertTriangle, ExternalLink, User as UserIcon } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [analysisReasoning, setAnalysisReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DesignRecord[]>([]);
  const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'success' | 'permission-error' | 'index-error' | 'error'>('idle');
  const [indexCreationUrl, setIndexCreationUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
      if (currentUser) {
        loadHistory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async (uid: string) => {
    setHistoryStatus('loading');
    setIndexCreationUrl(null);
    try {
      const data = await getUserDesigns(uid);
      setHistory(data);
      setHistoryStatus('success');
    } catch (err: any) {
      console.error("History load error:", err);
      if (err.message === 'PERMISSION_DENIED') {
        setHistoryStatus('permission-error');
      } else if (err.message === 'INDEX_REQUIRED') {
        setHistoryStatus('index-error');
        // ใช้ URL ที่ให้มาใน Prompt หรือดึงจาก Error Object
        setIndexCreationUrl(err.indexUrl || "https://console.firebase.google.com/v1/r/project/ep-curtain-auth/firestore/indexes?create_composite=Cldwcm9qZWN0cy9lcC1jdXJ0YWluLWF1dGgvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2N1cnRhaW5fZGVzaWducy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC");
      } else {
        setHistoryStatus('error');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !selectedCurtain || !selectedColor || !selectedLayer || !user) return;

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
      
      setIsSaving(true);
      await saveDesign(user.uid, originalImage, resultImage, {
        style: selectedStyle?.name || 'Unknown',
        curtain: selectedCurtain.name,
        color: selectedColor.name,
        layer: selectedLayer.name
      });
      loadHistory(user.uid);
    } catch (err: any) {
      console.error("Generation/Save error:", err);
      if (err.message?.includes('PERMISSION_DENIED')) {
        setError('ไม่สามารถบันทึกได้: กรุณาตรวจสอบ Firebase Rules ทั้ง Firestore และ Storage (ดู Console F12)');
      } else {
        setError('เกิดข้อผิดพลาดในการสร้างหรือบันทึกภาพ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  const handleSmartAnalysis = async () => {
    if (!originalImage) return;
    
    setIsAnalyzing(true);
    setAnalysisReasoning(null);
    setError(null);

    try {
      const analysis = await analyzeRoomSettings(originalImage);
      
      const style = INTERIOR_STYLES.find(s => s.id === analysis.styleId) || INTERIOR_STYLES[0];
      setSelectedStyle(style);

      let curtain = style.curtains.find(c => 
        c.name.toLowerCase().includes(analysis.curtainTypeKeyword.toLowerCase()) ||
        c.id.toLowerCase().includes(analysis.curtainTypeKeyword.toLowerCase())
      );
      if (!curtain) curtain = style.curtains[0];
      setSelectedCurtain(curtain);

      const color = CURTAIN_COLORS.find(c => c.id === analysis.colorId) || CURTAIN_COLORS[0];
      setSelectedColor(color);

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

  const downloadImage = (url?: string) => {
    const targetUrl = url || generatedImage;
    if (targetUrl) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = `ep-decor-design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isLayerSelectionDisabled = () => {
    if (!selectedCurtain) return true;
    const lowerName = selectedCurtain.name.toLowerCase();
    const lowerId = selectedCurtain.id.toLowerCase();
    return lowerName.includes('blinds') || 
           lowerName.includes('มู่ลี่') || 
           lowerName.includes('ม่านปรับแสง') || 
           lowerId.includes('sheer');
  };

  React.useEffect(() => {
    if (selectedCurtain && isLayerSelectionDisabled()) {
      setSelectedLayer(CURTAIN_LAYERS[0]);
    }
  }, [selectedCurtain]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header userEmail={user?.email} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        {!originalImage && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              🏡 แต่งบ้านสไตล์นี้... เลือกม่านแบบไหนถึงจะปัง?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              ลองออกแบบม่านที่ใช่สำหรับห้องของคุณด้วย AI เพียงอัปโหลดรูปถ่าย เลือกสไตล์ แล้วดูผลลัพธ์ทันที!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            {!originalImage ? (
              <ImageUpload onImageSelected={setOriginalImage} />
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white flex items-center justify-center min-h-[400px]">
                  {isGenerating ? (
                    <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                      <p className="text-lg font-medium text-slate-700 animate-pulse">กำลังออกแบบม่านให้คุณ...</p>
                      <p className="text-sm text-slate-500 mt-2">AI กำลังทำงานและบันทึกลงระบบคลาวด์...</p>
                    </div>
                  ) : null}

                  {generatedImage ? (
                    <img src={generatedImage} alt="Generated Design" className="w-full h-auto block" />
                  ) : (
                    <img src={originalImage} alt="Original Room" className="w-full h-auto block" />
                  )}
                  
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                     {generatedImage ? (
                        <span className="bg-purple-600/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md flex items-center">
                           <Sparkles className="w-3 h-3 mr-1" /> AI Design
                        </span>
                     ) : (
                        <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md">
                           📷 Original
                        </span>
                     )}
                  </div>

                   <button onClick={handleReset} className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-slate-700 p-2 rounded-full shadow-lg backdrop-blur transition-all">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                {generatedImage && !isGenerating && (
                  <div className="flex justify-center gap-4">
                     <button onClick={() => setGeneratedImage(null)} className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                       <RefreshCcw className="w-4 h-4 mr-2" /> ดูรูปเดิม
                     </button>
                     <button onClick={() => downloadImage()} className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 font-bold transition-all transform hover:-translate-y-0.5">
                       <Download className="w-4 h-4 mr-2" /> บันทึกรูป
                     </button>
                  </div>
                )}
                
                {isSaving && (
                  <div className="text-center text-xs text-blue-600 flex items-center justify-center">
                    <Clock className="w-3 h-3 mr-1 animate-spin" /> กำลังซิงค์ข้อมูลกับ Firebase...
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* History Section with ID for Scroll */}
            <section id="history-section" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden scroll-mt-20">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <History className="w-5 h-5 mr-2 text-blue-600" />
                    ประวัติการออกแบบของคุณ
                  </h3>
                  <p className="text-[10px] text-slate-500 flex items-center mt-1">
                    <UserIcon className="w-2.5 h-2.5 mr-1" />
                    ข้อมูลผูกกับ: <span className="font-bold ml-1">{user?.email}</span>
                  </p>
                </div>
                {history.length > 0 && <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-full w-fit">{history.length} ผลงาน</span>}
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
                {historyStatus === 'loading' && (
                  <div className="p-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>กำลังดึงข้อมูลส่วนตัว...</p>
                  </div>
                )}

                {historyStatus === 'permission-error' && (
                  <div className="p-8 text-center bg-amber-50">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-slate-800 font-bold mb-1">สิทธิ์การเข้าถึงถูกปฏิเสธ (Permissions Denied)</p>
                    <p className="text-slate-500 text-sm mb-4">
                      กรุณาตรวจสอบว่าคุณได้กด "Publish" ในหน้า Firebase Rules ทั้งส่วนของ Firestore Database และ Storage แล้วหรือยัง
                    </p>
                    <button onClick={() => loadHistory(user.uid)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md">
                      <RefreshCcw className="w-4 h-4 mr-2" /> ลองใหม่อีกครั้ง
                    </button>
                  </div>
                )}

                {historyStatus === 'index-error' && (
                  <div className="p-8 text-center bg-blue-50">
                    <ExternalLink className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                    <p className="text-slate-800 font-bold mb-1">ต้องสร้าง Index สำหรับการค้นหา</p>
                    <p className="text-slate-500 text-sm mb-4">
                      Firestore ต้องการ "Composite Index" เพื่อเรียงลำดับประวัติของคุณ <br/>
                      กรุณาคลิกปุ่มด้านล่างเพื่อไปที่หน้า Firebase Console และกดยืนยันการสร้าง Index
                    </p>
                    {indexCreationUrl && (
                      <a 
                        href={indexCreationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg mb-4"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> คลิกที่นี่เพื่อสร้าง Index (เฉพาะเจ้าของโปรเจกต์)
                      </a>
                    )}
                    <div className="mt-2">
                      <button onClick={() => loadHistory(user.uid)} className="text-sm font-bold text-blue-600 hover:underline">คลิกที่นี่เพื่อลองโหลดข้อมูลใหม่หลังจากกดสร้าง Index แล้ว (อาจใช้เวลา 1-2 นาที)</button>
                    </div>
                  </div>
                )}

                {historyStatus === 'success' && history.length > 0 ? (
                  history.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200 shadow-sm transition-transform group-hover:scale-105">
                        <img src={item.generatedImageUrl} className="w-full h-full object-cover" alt="Design" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-slate-800 truncate">{item.curtainName}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold">{item.styleName}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{item.colorName} • {item.layerName}</p>
                        <p className="text-[10px] text-slate-400 flex items-center">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          {item.createdAt?.toDate().toLocaleDateString('th-TH')} {item.createdAt?.toDate().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => downloadImage(item.generatedImageUrl)}
                          className="p-2 text-blue-600 bg-white border border-blue-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm"
                          title="ดาวน์โหลดรูป"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setGeneratedImage(item.generatedImageUrl);
                            setOriginalImage(item.originalImageUrl);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="p-2 text-slate-600 bg-white border border-slate-100 hover:bg-slate-800 hover:text-white rounded-lg transition-all shadow-sm"
                          title="ดูรายละเอียด"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : historyStatus === 'success' ? (
                  <div className="p-16 text-center text-slate-400">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-bold text-slate-600">ยังไม่มีประวัติการออกแบบ</p>
                    <p className="text-xs mt-1">เริ่มอัปโหลดรูปและออกแบบม่านเพื่อบันทึกผลงานแรกของคุณ!</p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-8">
            {originalImage && !isGenerating && (
              <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-1 rounded-2xl shadow-xl mb-6">
                 <button onClick={handleSmartAnalysis} disabled={isAnalyzing} className="w-full bg-white hover:bg-opacity-95 text-slate-800 rounded-xl py-4 px-6 flex items-center justify-between transition-all">
                   <div className="flex items-center">
                     <div className={`bg-violet-100 p-2 rounded-lg mr-3 ${isAnalyzing ? 'animate-pulse' : ''}`}>
                       <Wand2 className={`w-6 h-6 text-violet-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
                     </div>
                     <div className="text-left">
                       <h3 className="font-bold text-lg text-violet-900">AI อัจฉริยะ (Smart Analysis)</h3>
                       <p className="text-sm text-slate-500">{isAnalyzing ? 'กำลังวิเคราะห์...' : 'แนะนำม่านที่เหมาะกับห้องคุณ'}</p>
                     </div>
                   </div>
                 </button>
                 {analysisReasoning && (
                   <div className="bg-white/90 mx-1 mb-1 mt-1 p-3 rounded-lg text-sm text-violet-800 border border-violet-100 animate-fade-in">
                      <span className="font-semibold">💡 AI แนะนำ: </span> {analysisReasoning}
                   </div>
                 )}
              </div>
            )}

            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs mr-2 shadow-sm">1</span>
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

            {selectedStyle && (
              <section className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs mr-2 shadow-sm">2</span>
                  เลือกรูปแบบผ้าม่าน
                </h3>
                <div className="space-y-3">
                  {selectedStyle.curtains.map((curtain) => (
                    <button
                      key={curtain.id}
                      onClick={() => setSelectedCurtain(curtain)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between
                        ${selectedCurtain?.id === curtain.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}
                      `}
                    >
                      <div>
                        <div className="font-bold text-slate-800">{curtain.name}</div>
                        <div className="text-xs text-slate-500">{curtain.description}</div>
                      </div>
                      {selectedCurtain?.id === curtain.id && <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-sm"><Check className="w-3 h-3 text-white" /></div>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {selectedCurtain && !isLayerSelectionDisabled() && (
               <section className="animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs mr-2 shadow-sm">3</span>
                     เลือกชั้นผ้าม่าน
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                     {CURTAIN_LAYERS.map((layer) => (
                        <button key={layer.id} onClick={() => setSelectedLayer(layer)} className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col ${selectedLayer?.id === layer.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                           <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800">{layer.name}</span>
                              {selectedLayer?.id === layer.id && <Check className="w-4 h-4 text-blue-600" />}
                           </div>
                           <span className="text-[10px] text-slate-500">{layer.description}</span>
                        </button>
                     ))}
                  </div>
               </section>
            )}

            {selectedCurtain && selectedLayer && (
               <section className="animate-fade-in">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs mr-2 shadow-sm">{isLayerSelectionDisabled() ? '3' : '4'}</span>
                     เลือกสีผ้าม่าน
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                     {CURTAIN_COLORS.map((color) => (
                        <button key={color.id} onClick={() => setSelectedColor(color)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${selectedColor?.id === color.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 scale-105 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                           <div className={`w-8 h-8 rounded-full mb-2 shadow-inner border ${color.class}`}></div>
                           <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{color.name}</span>
                        </button>
                     ))}
                  </div>
               </section>
            )}

            <div className="pt-4 border-t border-slate-200 sticky bottom-4 z-10">
              <button
                disabled={!originalImage || !selectedCurtain || !selectedColor || !selectedLayer || isGenerating}
                onClick={handleGenerate}
                className={`w-full py-4 rounded-2xl text-lg font-bold flex items-center justify-center transition-all shadow-xl
                  ${!originalImage || !selectedCurtain || !selectedColor || !selectedLayer || isGenerating ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 hover:shadow-blue-200/50 transform hover:scale-[1.02]'}
                `}
              >
                {isGenerating ? (
                  <><Clock className="w-5 h-5 mr-2 animate-spin" /> กำลังสร้างและบันทึก...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> เริ่มออกแบบทันที</>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-500 py-8 text-center text-sm border-t border-slate-800">
        <p className="font-bold text-slate-400 mb-1">E.P. DECOR - CURTAIN VISUALIZE</p>
        <p>© 2024 ออกแบบและบันทึกข้อมูลผ่านระบบ Cloud ปลอดภัย 100%</p>
        <div className="mt-4 flex justify-center gap-4 text-xs">
          <span className="bg-slate-800 px-2 py-1 rounded">User: {user?.email}</span>
          <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded">Database Online</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
