import React, { useState, useEffect } from 'react';
import VideoUpload from './components/VideoUpload';
import ClipDetailModal from './components/ClipDetailModal';
import { analyzeVideo, generateClips, getDownloadUrl, generateVideoClips } from './services/api';

// --- Helper Components ---

const Slider = ({ label, value, min, max, step = 1, unit = '', onChange, wideLabel = false }) => (
    <div>
        <label className={`block text-sm font-medium text-gray-600 mb-1 ${wideLabel ? 'flex justify-between items-center' : ''}`}>
            <span>{label}</span>
            <span className="font-normal bg-slate-200 text-slate-800 text-xs px-2 py-0.5 rounded-full">{value}{unit}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);

const ToggleSwitch = ({ id, label, checked, onChange }) => (
    <div className="flex justify-between items-center">
        <label htmlFor={id} className="font-medium text-slate-800">{label}</label>
        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
            <input
                type="checkbox"
                name={id}
                id={id}
                checked={checked}
                onChange={onChange}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
                htmlFor={id}
                className="toggle-label block overflow-hidden h-6 rounded-full bg-slate-300 cursor-pointer"
            ></label>
        </div>
    </div>
);

// Token Estimation Component
const TokenEstimation = ({ videoTopic, maxClips, targetAudience, tone }) => {
    const [estimatedTokens, setEstimatedTokens] = useState({ input: 0, output: 0 });
    const [estimatedCost, setEstimatedCost] = useState(0);
    
    const inputCostPer1K = parseFloat(import.meta.env.VITE_TOKEN_COST_PER_1K_INPUT || 0.00075);
    const outputCostPer1K = parseFloat(import.meta.env.VITE_TOKEN_COST_PER_1K_OUTPUT || 0.003);

    useEffect(() => {
        if (videoTopic && maxClips) {
            // URL分析の推定トークン数
            const urlAnalysisTokens = 50;
            
            // 設定提案の推定トークン数
            const settingsTokens = 80;
            
            // クリップ生成の推定トークン数（1クリップあたり）
            const clipGenerationTokens = 200;
            
            const totalInputTokens = urlAnalysisTokens + settingsTokens + (clipGenerationTokens * maxClips);
            const totalOutputTokens = 50 + 100 + (150 * maxClips); // タイトル、説明文、ハッシュタグ
            
            setEstimatedTokens({
                input: totalInputTokens,
                output: totalOutputTokens
            });
            
            const cost = (totalInputTokens / 1000 * inputCostPer1K) + (totalOutputTokens / 1000 * outputCostPer1K);
            setEstimatedCost(cost);
        }
    }, [videoTopic, maxClips, targetAudience, tone, inputCostPer1K, outputCostPer1K]);

  return (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
            <h4 className="font-bold text-blue-800">💰 予算見積もり</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-blue-700">入力トークン:</div>
                    <div className="font-semibold text-blue-900">{estimatedTokens.input.toLocaleString()}</div>
                </div>
      <div>
                    <div className="text-blue-700">出力トークン:</div>
                    <div className="font-semibold text-blue-900">{estimatedTokens.output.toLocaleString()}</div>
                </div>
            </div>
            <div className="text-center">
                <div className="text-blue-700 text-sm">予想コスト</div>
                <div className="text-2xl font-bold text-blue-900">${estimatedCost.toFixed(4)}</div>
      </div>
      </div>
    );
};

export default function App() {
    const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=LXb3EKWsInQ');
    const [videoTopic, setVideoTopic] = useState('');
    const [urlCheckResult, setUrlCheckResult] = useState('');
    const [isCheckingUrl, setIsCheckingUrl] = useState(false);
    const [activeTab, setActiveTab] = useState('url');
    const [clipMode, setClipMode] = useState('ai');
    const [minDuration, setMinDuration] = useState(50);
    const [maxDuration, setMaxDuration] = useState(130);
    const [minClips, setMinClips] = useState(3);
    const [maxClips, setMaxClips] = useState(8);
    const [isTitleGenActive, setIsTitleGenActive] = useState(true);
    const [isSubtitleGenActive, setIsSubtitleGenActive] = useState(true);
    const [fontFamily, setFontFamily] = useState('Yu Gothic');
    const [fontWeight, setFontWeight] = useState('太字');
    const [mainTitle, setMainTitle] = useState({ size: 80, textColor: '#ffffff', strokeColor: '#000000', strokeWidth: 2 });
    const [subtitle, setSubtitle] = useState({ size: 60, textColor: '#ffffff', strokeColor: '#000000', strokeWidth: 2 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [generatedClips, setGeneratedClips] = useState([]);
    const [selectedClip, setSelectedClip] = useState(null);
    const [targetAudience, setTargetAudience] = useState('全般');
    const [tone, setTone] = useState('親しみやすく');
    const [uploadedVideo, setUploadedVideo] = useState(null);
    const [error, setError] = useState('');

    const callGeminiAPI = async (prompt, options = { isJson: false }) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key is not configured');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            ...(options.isJson && {
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: options.schema || {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING" },
                                subtitle: { type: "STRING" },
                                description: { type: "STRING" },
                                hashtags: { type: "ARRAY", items: { type: "STRING" } }
                            },
                            required: ["title", "subtitle", "description", "hashtags"]
                        }
                    }
                }
            })
        };

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API call failed: ${response.status}. ${errorBody}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("API response was empty.");
            return text;

        } catch (error) {
            console.error("Gemini API call error:", error);
            alert(`AIの呼び出し中にエラーが発生しました: ${error.message}`);
            return null;
        }
    };

    const handleUrlCheck = async () => {
        setIsCheckingUrl(true);
        setVideoTopic('');
        setUrlCheckResult('AIがURLを分析中...');
        setError('');
        
        try {
            const result = await analyzeVideo(videoUrl);
            setVideoTopic(result.topic);
            setUrlCheckResult(result.message);
        } catch (error) {
            setUrlCheckResult('❌ 分析に失敗しました。URLを確認してください。');
            setError(error.message);
        }
        setIsCheckingUrl(false);
    };

    const handleVideoUploaded = (videoData) => {
        setUploadedVideo(videoData);
        setVideoTopic(`アップロード動画: ${videoData.originalName}`);
        setUrlCheckResult(`✅ アップロード完了: ${videoData.originalName} (${Math.round(videoData.duration)}秒)`);
        setError('');
    };

    const handleUploadError = (errorMessage) => {
        setError(errorMessage);
        setUploadedVideo(null);
    };

    const handleProcess = async () => {
        if (!videoTopic) {
            alert('先に「接続テスト」を実行して、動画の内容をAIに分析させてください。');
            return;
        }
        
        if (!uploadedVideo && activeTab === 'upload') {
            alert('動画ファイルをアップロードしてください。');
            return;
        }

        setIsProcessing(true);
        setShowResults(false);
        setGeneratedClips([]);
        setStatusMessage('AIがクリップ案を生成中...');
        setError('');

        try {
            // Gemini 2.5 Proを使用した動画切り抜き生成
            if (videoUrl && activeTab === 'url') {
                setStatusMessage('🤖 Gemini 2.5 Proが動画を分析中...');
                
                const videoData = {
                    videoUrl: videoUrl,
                    videoTopic: videoTopic,
                    maxClips: maxClips,
                    targetAudience: targetAudience,
                    tone: tone,
                    minDuration: minDuration,
                    maxDuration: maxDuration
                };

                const result = await generateVideoClips(videoData);
                
                if (result.success) {
                    setGeneratedClips(result.clips);
                    setStatusMessage('✅ AI切り抜き生成完了！');
                } else {
                    throw new Error(result.error || '切り抜き生成に失敗しました');
                }
            } else {
                // 従来の方法（アップロード動画用）
                let clipsData = [];
                if (isTitleGenActive) {
                    setStatusMessage('✨ AIが投稿コンテンツを生成中...');
                    const prompt = `動画テーマ「${videoTopic}」に関するSNS投稿案を${maxClips}個生成してください。ターゲット層は「${targetAudience}」、投稿のトーンは「${tone}」でお願いします。各投稿には、キャッチーな「タイトル」、補足の「サブタイトル」、エンゲージメントを高める2-3文の「説明文」、そして関連性の高い「ハッシュタグ」を5個含めてください。`;
                    try {
                        const responseText = await callGeminiAPI(prompt, { isJson: true });
                        if(responseText) {
                            clipsData = JSON.parse(responseText);
                        }
                    } catch (e) {
                        console.error("Failed to parse clips data:", e);
                        clipsData = Array(maxClips).fill(null).map((_, i) => ({title: `生成タイトル ${i+1}`, subtitle: '生成サブタイトル', description: 'AIが生成した説明文です。', hashtags: ['#サンプル']}));
                    }
                } else {
                     clipsData = Array(maxClips).fill(null).map((_, i) => ({title: `クリップ ${i+1}`, subtitle: '', description: '', hashtags: []}));
                }

                // 動画クリップ生成（アップロードされた動画がある場合）
                if (uploadedVideo) {
                    setStatusMessage('🎬 動画クリップを生成中...');
                    
                    // クリップの時間をランダムに生成
                    const videoDuration = uploadedVideo.duration;
                    const clipsWithTiming = clipsData.map((clip, index) => {
                        const startTime = Math.random() * (videoDuration - maxDuration);
                        const duration = minDuration + Math.random() * (maxDuration - minDuration);
                        
                        return {
                            ...clip,
                            startTime: Math.max(0, startTime),
                            duration: Math.min(duration, videoDuration - startTime)
                        };
                    });

                    const result = await generateClips(uploadedVideo.path, clipsWithTiming, {
                        minDuration,
                        maxDuration,
                        fontFamily,
                        fontWeight,
                        mainTitle,
                        subtitle
                    });

                    // ダウンロードURLを追加
                    const clipsWithDownload = result.clips.map(clip => ({
                        ...clip,
                        downloadUrl: clip.downloadUrl || getDownloadUrl(clip.outputPath?.split('/').pop())
                    }));

                    setGeneratedClips(clipsWithDownload);
                } else {
                    // URL分析のみの場合
                    setGeneratedClips(clipsData);
                }
            }
            
            setIsProcessing(false);
            setShowResults(true);
            setStatusMessage('');
            
        } catch (error) {
            console.error('処理エラー:', error);
            setError(error.message);
            setIsProcessing(false);
            setStatusMessage('');
        }
    };

    const textShadow = (color, width) => {
        if (width === 0) return 'none';
        return `${color} ${width}px 0px 0px, ${color} ${-width}px 0px 0px, ${color} 0px ${width}px 0px, ${color} 0px ${-width}px 0px, ${color} ${width}px ${width}px 0px, ${color} ${-width}px ${-width}px 0px, ${color} ${width}px ${-width}px 0px, ${color} ${-width}px ${width}px 0px`;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">AI動画クリッピングツール</h1>
                <p className="text-slate-600 mt-4 max-w-2xl mx-auto text-lg">
                    YouTube, Instagram, X(Twitter)の動画URLから、AIが最適なハイライトを分析し、バズる縦動画コンテンツを自動生成します。
                </p>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Video Input Section */}
                    <section className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                        <div className="flex border-b border-slate-200 mb-6">
                            <button onClick={() => setActiveTab('url')} className={`py-3 px-4 font-semibold transition-colors text-lg ${activeTab === 'url' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>URLから</button>
                            <button onClick={() => setActiveTab('upload')} className={`py-3 px-4 font-semibold transition-colors text-lg ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>アップロード</button>
                        </div>
                        {activeTab === 'url' ? (
                            <div>
                                <label htmlFor="video-urls" className="block text-base font-semibold text-slate-700 mb-2">動画URL</label>
                                <textarea id="video-urls" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" rows="2" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={e => {setVideoUrl(e.target.value); setVideoTopic(''); setUrlCheckResult('');}}></textarea>
                                <button onClick={handleUrlCheck} disabled={isCheckingUrl || !videoUrl} className="mt-4 w-full bg-slate-800 text-white font-bold text-lg py-3 px-4 rounded-lg hover:bg-slate-900 transition shadow-md hover:shadow-lg disabled:bg-slate-400 disabled:cursor-wait">
                                    {isCheckingUrl ? 'AIが分析中...' : '接続テスト (内容分析)'}
                                </button>
                                {urlCheckResult && <p className={`text-base mt-3 p-3 rounded-lg ${videoTopic ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{urlCheckResult}</p>}
                            </div>
                        ) : (
                            <VideoUpload 
                                onVideoUploaded={handleVideoUploaded}
                                onError={handleUploadError}
                            />
                        )}
                    </section>

                    {/* Clipping Settings */}
                    <section className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">切り抜き設定</h3>
                        <div className="mb-6">
                            <label className="block text-base font-semibold text-slate-700 mb-2">切り抜きモード</label>
                            <div className="flex gap-2 p-1.5 bg-slate-200 rounded-xl">
                                <button onClick={() => setClipMode('ai')} className={`flex-1 py-2.5 rounded-lg text-base font-semibold transition ${clipMode === 'ai' ? 'bg-white text-indigo-600 shadow-md' : 'bg-transparent text-slate-600'}`}>AI自動選択</button>
                                <button onClick={() => setClipMode('manual')} className={`flex-1 py-2.5 rounded-lg text-base font-semibold transition ${clipMode === 'manual' ? 'bg-white text-indigo-600 shadow-md' : 'bg-transparent text-slate-600'}`}>手動指定</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-base font-semibold text-slate-700 mb-2">切り抜き時間</label>
                                <div className="space-y-4 bg-slate-100 p-4 rounded-lg border border-slate-200">
                                    <Slider label="最小時間" value={minDuration} min={10} max={180} unit="秒" onChange={e => setMinDuration(e.target.value)} />
                                    <Slider label="最大時間" value={maxDuration} min={10} max={180} unit="秒" onChange={e => setMaxDuration(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-slate-700 mb-2">切り抜き本数</label>
                                <div className="space-y-4 bg-slate-100 p-4 rounded-lg border border-slate-200">
                                    <Slider label="最小本数" value={minClips} min={1} max={15} unit="本" onChange={e => setMinClips(e.target.value)} />
                                    <Slider label="最大本数" value={maxClips} min={1} max={15} unit="本" onChange={e => setMaxClips(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AI Content Settings */}
                    <section className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">✨ AIコンテンツ設定</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="target-audience" className="block text-base font-semibold text-slate-700 mb-2">ターゲット層</label>
                                <select id="target-audience" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                                    <option>全般</option><option>10代〜20代</option><option>ビジネスパーソン</option><option>ファミリー層</option><option>学生</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="tone" className="block text-base font-semibold text-slate-700 mb-2">投稿のトーン</label>
                                <select id="tone" value={tone} onChange={e => setTone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition">
                                    <option>親しみやすく</option><option>ユーモラス</option><option>フォーマル</option><option>感動的に</option><option>情熱的に</option>
                                </select>
                            </div>
                        </div>
                    </section>
                </div>
                
                {/* Right Sidebar with Token Estimation and Process Button */}
                <div className="lg:col-span-1">
                    <div className="space-y-6">
                        {/* Token Estimation */}
                        <div className="p-6 rounded-2xl shadow-lg border border-slate-200 bg-white">
                            <TokenEstimation 
                                videoTopic={videoTopic}
                                maxClips={maxClips}
                                targetAudience={targetAudience}
                                tone={tone}
                            />
                        </div>

                        {/* Process Button */}
                        <div className="p-6 rounded-2xl shadow-lg border border-slate-200 bg-white sticky top-8">
                            <h3 className="text-2xl font-bold text-slate-800 mb-4">処理実行</h3>
                            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 space-y-3 text-slate-700">
                                <div className="flex justify-between items-center"><span>算定時間</span><span className="font-semibold text-lg">{statusMessage || '0-0分'}</span></div>
                                <hr className="my-3 border-indigo-200"/>
                                <p className="font-semibold">処理内容:</p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>1本の動画を処理</li>
                                    <li>動画テーマ: <span className="font-medium">{videoTopic || '未分析'}</span></li>
                                    <li>ターゲット: <span className="font-medium">{targetAudience} / {tone}</span></li>
                                    <li>合計最大{maxClips}本のクリップを出力</li>
                                </ul>
                            </div>
                            <p className="text-xs text-slate-500 mt-4 text-center">動画URLを入力またはファイルをアップロードして、設定を調整後に「処理開始」ボタンを押してください</p>
                            <button onClick={handleProcess} disabled={isProcessing || !videoTopic} title={!videoTopic ? '先にURLを分析してください' : ''} className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xl py-4 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition duration-300 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                                {isProcessing && <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                               {isProcessing ? statusMessage : '✨ AIクリップ生成開始'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {showResults && (
                <section className="max-w-7xl mx-auto mt-12 animate-fade-in">
                     <h2 className="text-4xl font-extrabold text-slate-800 border-b border-slate-300 pb-4 mb-8">AI生成クリップ</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {generatedClips.map((clip, i) => (
                             <div key={i} onClick={() => setSelectedClip(clip)} className="bg-slate-900 rounded-lg overflow-hidden relative shadow-lg aspect-[9/16] flex flex-col justify-center items-center text-white p-4 group cursor-pointer transform hover:scale-105 transition-transform duration-300" style={{ fontFamily, fontWeight: fontWeight === '太字' ? 'bold' : 'normal' }}>
                                 <div className="absolute inset-0 bg-black opacity-30 group-hover:opacity-50 transition-opacity"></div>
                                 <div className="absolute inset-0 flex flex-col justify-center items-center p-4 text-center z-10">
                                    <h3 style={{ fontSize: `${mainTitle.size / 3}px`, color: mainTitle.textColor, textShadow: textShadow(mainTitle.strokeColor, mainTitle.strokeWidth) }}>{clip.title}</h3>
                                    {isSubtitleGenActive && <p style={{ fontSize: `${subtitle.size / 3}px`, color: subtitle.textColor, textShadow: textShadow(subtitle.strokeColor, subtitle.strokeWidth) }} className="opacity-90 mt-2">{clip.subtitle}</p>}
                                 </div>
                                 <div className="absolute bottom-4 left-4 right-4 text-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="bg-white text-black text-sm font-bold py-1.5 px-4 rounded-full shadow-md">詳細を見る</span>
                                 </div>
                             </div>
                        ))}
                     </div>
                </section>
            )}

            <footer className="text-center mt-20 text-slate-500 text-sm">
                <p>&copy; 2025 AI Video Clipping Tool. All rights reserved.</p>
            </footer>

            {/* Error Display */}
            {error && (
                <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-4 text-red-500 hover:text-red-700">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <ClipDetailModal 
                clip={selectedClip} 
                onClose={() => setSelectedClip(null)} 
                styleOptions={{ fontFamily, fontWeight, mainTitle, subtitle }}
                videoTopic={videoTopic}
                callGeminiAPI={callGeminiAPI}
            />
        </div>
    );
}
