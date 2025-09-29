import React, { useState } from 'react';

const ClipDetailModal = ({ clip, onClose, styleOptions, videoTopic, callGeminiAPI }) => {
    if (!clip) return null;

    const [copySuccess, setCopySuccess] = useState('');
    const [currentDescription, setCurrentDescription] = useState(clip.description);
    const [isEditing, setIsEditing] = useState(false);

    const copyToClipboard = async (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess('コピーしました！');
            setTimeout(() => setCopySuccess(''), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setCopySuccess('コピーに失敗しました。');
            setTimeout(() => setCopySuccess(''), 2000);
        }
    };
    
    const handleMagicEdit = async (instruction) => {
        setIsEditing(true);
        const prompt = `以下のSNS投稿用の文章を、テーマ「${videoTopic}」の文脈を維持しつつ、「${instruction}」という指示に従って編集してください。\n\n# 元の文章\n${currentDescription}\n\n# 編集後の文章:`;
        const editedText = await callGeminiAPI(prompt, { isJson: false });
        if (editedText) {
            setCurrentDescription(editedText);
        }
        setIsEditing(false);
    };

    const textShadow = (color, width) => {
        if (width === 0) return 'none';
        return `${color} ${width}px 0px 0px, ${color} ${-width}px 0px 0px, ${color} 0px ${width}px 0px, ${color} 0px ${-width}px 0px, ${color} ${width}px ${width}px 0px, ${color} ${-width}px ${-width}px 0px, ${color} ${width}px ${-width}px 0px, ${color} ${-width}px ${width}px 0px`;
    }

    const MagicEditButton = ({ instruction, children }) => (
        <button onClick={() => handleMagicEdit(instruction)} disabled={isEditing} className="text-xs bg-slate-200 text-slate-800 font-semibold py-1 px-3 rounded-full hover:bg-slate-300 transition disabled:opacity-50 disabled:cursor-wait">
            {children}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale" style={{'--delay': '100ms'}} onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-3xl">&times;</button>
                    <h2 className="text-3xl font-bold text-slate-800 mb-6">✨ AI生成コンテンツ</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900 rounded-lg overflow-hidden relative shadow-lg aspect-[9/16] flex flex-col justify-center items-center text-white p-4 ring-2 ring-slate-200" style={{ fontFamily: styleOptions.fontFamily, fontWeight: styleOptions.fontWeight === '太字' ? 'bold' : 'normal' }}>
                            <div className="absolute inset-0 bg-black opacity-30"></div>
                            <div className="absolute inset-0 flex flex-col justify-center items-center p-4 text-center z-10">
                                <h3 style={{ fontSize: `${styleOptions.mainTitle.size / 2.5}px`, color: styleOptions.mainTitle.textColor, textShadow: textShadow(styleOptions.mainTitle.strokeColor, styleOptions.mainTitle.strokeWidth) }}>{clip.title}</h3>
                                {clip.subtitle && <p style={{ fontSize: `${styleOptions.subtitle.size / 2.5}px`, color: styleOptions.subtitle.textColor, textShadow: textShadow(styleOptions.subtitle.strokeColor, styleOptions.subtitle.strokeWidth) }} className="opacity-90 mt-2">{clip.subtitle}</p>}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-slate-600 mb-2">説明文</h4>
                                <div className="p-3 bg-slate-50 rounded-lg border text-base text-slate-700 relative">
                                    <textarea value={currentDescription} onChange={e => setCurrentDescription(e.target.value)} className="w-full h-32 bg-transparent border-0 p-0 focus:ring-0 resize-none"></textarea>
                                    <button onClick={() => copyToClipboard(currentDescription)} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-md bg-slate-100 hover:bg-slate-200 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L3.293 8.5H.5A.5.5 0 0 1 0 8z"/></svg>
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-600">✨ AIで編集:</span>
                                    {isEditing ? (
                                        <div className="flex items-center text-sm text-slate-500">
                                            <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            編集中...
                                        </div>
                                    ) : (
                                        <>
                                            <MagicEditButton instruction="短くする">短く</MagicEditButton>
                                            <MagicEditButton instruction="絵文字を追加する">絵文字追加</MagicEditButton>
                                            <MagicEditButton instruction="プロフェッショナルに">プロっぽく</MagicEditButton>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-600 mb-2">ハッシュタグ</h4>
                                <div className="p-3 bg-slate-50 rounded-lg border relative">
                                    <div className="flex flex-wrap gap-2">
                                        {clip.hashtags?.map((tag, i) => (
                                            <span key={i} className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full">{tag}</span>
                                        ))}
                                    </div>
                                    <button onClick={() => copyToClipboard(clip.hashtags.join(' '))} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-md bg-slate-100 hover:bg-slate-200 transition">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 8a.5.5 0 0 1 .5-.5h3.793l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L3.293 8.5H.5A.5.5 0 0 1 0 8z"/></svg>
                                    </button>
                                </div>
                            </div>
                            {clip.downloadUrl && (
                                <div>
                                    <h4 className="font-bold text-slate-600 mb-2">動画クリップ</h4>
                                    <div className="p-3 bg-slate-50 rounded-lg border">
                                        <a 
                                            href={clip.downloadUrl} 
                                            download 
                                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            クリップをダウンロード
                                        </a>
                                    </div>
                                </div>
                            )}
                             {copySuccess && <div className="text-center text-sm text-green-600 bg-green-100 p-2 rounded-lg mt-4 animate-fade-in">{copySuccess}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClipDetailModal;
