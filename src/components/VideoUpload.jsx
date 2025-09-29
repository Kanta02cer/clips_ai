import React, { useState, useRef } from 'react';
import { uploadVideo } from '../services/api';

const VideoUpload = ({ onVideoUploaded, onError }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file) return;

        // ファイル形式チェック
        const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
        if (!allowedTypes.includes(file.type)) {
            onError('動画ファイルのみアップロード可能です (MP4, MOV, AVI)');
            return;
        }

        // ファイルサイズチェック（1GB）
        if (file.size > 1000 * 1024 * 1024) {
            onError('ファイルサイズが大きすぎます（最大1GB）');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // プログレスシミュレーション
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + Math.random() * 10;
                });
            }, 200);

            const result = await uploadVideo(file);
            
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            setTimeout(() => {
                onVideoUploaded(result);
                setIsUploading(false);
                setUploadProgress(0);
            }, 500);

        } catch (error) {
            clearInterval(progressInterval);
            onError(error.message);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="flex items-center justify-center w-full">
            <label 
                htmlFor="dropzone-file" 
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    dragActive 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploading ? (
                        <div className="w-10 h-10 mb-4">
                            <svg className="animate-spin w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : (
                        <svg className="w-10 h-10 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                    )}
                    
                    {isUploading ? (
                        <div className="text-center">
                            <p className="mb-2 text-base text-indigo-600 font-semibold">アップロード中...</p>
                            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                                <div 
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-slate-500">{Math.round(uploadProgress)}%</p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-2 text-base text-slate-500">
                                <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-500">MP4, MOV, AVI (MAX. 1GB)</p>
                        </>
                    )}
                </div>
                <input 
                    id="dropzone-file" 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept="video/mp4,video/mov,video/avi,video/quicktime"
                    disabled={isUploading}
                />
            </label>
        </div>
    );
};

export default VideoUpload;
