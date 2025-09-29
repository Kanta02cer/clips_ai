// API呼び出し用のサービス関数

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 動画URL分析
export const analyzeVideo = async (videoUrl) => {
    const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl }),
    });

    if (!response.ok) {
        throw new Error(`分析に失敗しました: ${response.status}`);
    }

    return await response.json();
};

// 動画ファイルアップロード
export const uploadVideo = async (file) => {
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${API_BASE_URL}/upload-video`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`アップロードに失敗しました: ${response.status}`);
    }

    return await response.json();
};

// 動画クリップ生成
export const generateClips = async (videoPath, clips, settings) => {
    const response = await fetch(`${API_BASE_URL}/generate-clips`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            videoPath,
            clips,
            settings,
        }),
    });

    if (!response.ok) {
        throw new Error(`クリップ生成に失敗しました: ${response.status}`);
    }

    return await response.json();
};

// ファイルダウンロードURL生成
export const getDownloadUrl = (filename) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';
    return `${baseUrl}/download/${filename}`;
};
