import React, { useState, useRef } from 'react';
import Layout from './components/Layout';
import ThreeViewer, { ThreeViewerHandle } from './components/ThreeViewer';
import { GenerationMode, ModelQuality, ProceduralModelSpec } from './types';
import { refinePrompt, generateModelAssets } from './services/hfService';
import { 
  Wand2, 
  Image as ImageIcon, 
  Type, 
  Upload, 
  Download, 
  Share2, 
  Sparkles,
  RefreshCw,
  X,
  Cuboid
} from 'lucide-react';

const App: React.FC = () => {
  // State
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.TEXT_TO_3D);
  const [prompt, setPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedTexture, setGeneratedTexture] = useState<string | undefined>(undefined);
  const [modelSpec, setModelSpec] = useState<ProceduralModelSpec | null>(null);
  const [quality, setQuality] = useState<ModelQuality>(ModelQuality.STANDARD);
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<ThreeViewerHandle | null>(null);

  // Handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefinePrompt = async () => {
    if (!prompt.trim()) return;
    setIsRefining(true);
    try {
      const refined = await refinePrompt(prompt);
      setPrompt(refined);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) return;
    
    setIsGenerating(true);
    setGeneratedTexture(undefined); // Clear previous
    setModelSpec(null);

    try {
      const response = await generateModelAssets(prompt, uploadedImage || undefined);
      setGeneratedTexture(response.textureDataUrl ?? undefined);
      setModelSpec(response.modelSpec);
    } catch (err) {
      console.error("Generation failed", err);
      alert("Failed to generate model. Please check your inputs and API configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearUpload = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleShare = async () => {
    if (!modelSpec) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(modelSpec, null, 2));
      alert('Model blueprint copied to clipboard.');
    } catch (err) {
      console.error('Share failed', err);
      alert('Unable to copy model blueprint. Please copy manually.');
    }
  };

  const handleDownload = () => {
    viewerRef.current?.exportGLB();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-80px)]">
        
        {/* LEFT PANEL: CONTROLS */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Mode Switcher */}
          <div className="bg-zinc-900/50 p-1 rounded-xl flex border border-zinc-800">
            <button
              onClick={() => setMode(GenerationMode.TEXT_TO_3D)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                mode === GenerationMode.TEXT_TO_3D 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Type className="w-4 h-4" />
              Text to 3D
            </button>
            <button
              onClick={() => setMode(GenerationMode.IMAGE_TO_3D)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                mode === GenerationMode.IMAGE_TO_3D 
                  ? 'bg-zinc-800 text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Image to 3D
            </button>
          </div>

          {/* Configuration Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Configuration
            </h2>

            <div className="space-y-6">
              
              {/* Image Upload Area (Only for Image to 3D) */}
              {mode === GenerationMode.IMAGE_TO_3D && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-zinc-300">Reference Image</label>
                  {!uploadedImage ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-zinc-800/50 transition-all group"
                    >
                      <div className="bg-zinc-800 p-3 rounded-full mb-3 group-hover:bg-indigo-500/20 transition-colors">
                        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-400" />
                      </div>
                      <p className="text-sm text-zinc-400 text-center">
                        <span className="text-indigo-400 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700 group">
                      <img src={uploadedImage} alt="Reference" className="w-full h-48 object-cover opacity-80" />
                      <button 
                        onClick={clearUpload}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </div>
              )}

              {/* Text Prompt */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-zinc-300">
                    {mode === GenerationMode.IMAGE_TO_3D ? 'Additional Instructions' : 'Prompt'}
                  </label>
                  <button 
                    onClick={handleRefinePrompt}
                    disabled={isRefining || !prompt}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className={`w-3 h-3 ${isRefining ? 'animate-spin' : ''}`} />
                    {isRefining ? 'Refining...' : 'Enhance Prompt'}
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={mode === GenerationMode.TEXT_TO_3D ? "Describe the 3D model you want to generate..." : "E.g. Make it low poly, change color to red..."}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none h-32"
                />
              </div>

              {/* Quality Settings */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-300">Model Topology</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(ModelQuality).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`text-xs py-2 rounded-lg border transition-all ${
                        quality === q 
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' 
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Action */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt && !uploadedImage)}
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating Assets...
                  </>
                ) : (
                  <>
                    <Cuboid className="w-5 h-5" />
                    Generate 3D Model
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: VIEWER */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-[500px]">
          {/* Toolbar */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Preview</h3>
            <div className="flex gap-2">
              <button 
                disabled={!modelSpec}
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors disabled:opacity-50 disabled:hover:bg-zinc-800"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
              <button 
                disabled={!modelSpec}
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50 disabled:bg-zinc-600 disabled:text-zinc-400"
              >
                <Download className="w-3.5 h-3.5" />
                Download .GLB
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="flex-grow relative rounded-2xl overflow-hidden ring-1 ring-zinc-800 bg-zinc-900">
             <ThreeViewer
               ref={viewerRef}
               textureUrl={generatedTexture}
               modelSpec={modelSpec}
               isGenerating={isGenerating}
             />
             
             {/* Empty State */}
             {!modelSpec && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-500">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700/50">
                    <Cuboid className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm">Configure your settings and click generate</p>
                </div>
             )}
          </div>

          {/* Asset Info Bar */}
          {modelSpec && (
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Seed</p>
                    <p className="text-sm font-mono text-zinc-300">{modelSpec.seed}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Meshes</p>
                    <p className="text-sm font-mono text-zinc-300">{modelSpec.meshes.length}</p>
                  </div>
                   <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Environment</p>
                    <p className="text-sm font-mono text-zinc-300 capitalize">{modelSpec.environment}</p>
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {generatedTexture ? 'Texture + geometry ready' : 'Procedural geometry ready'}
                </div>
             </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default App;