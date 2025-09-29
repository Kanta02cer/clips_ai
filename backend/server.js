const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// FFmpegのパスを設定
ffmpeg.setFfmpegPath(ffmpegStatic);

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// アップロード用のディレクトリを作成
const uploadDir = 'uploads';
const outputDir = 'outputs';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Multer設定（ファイルアップロード用）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1000 * 1024 * 1024 // 1GB制限
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|mov|avi|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('動画ファイルのみアップロード可能です (MP4, MOV, AVI, MKV)'));
        }
    }
});

// Gemini API呼び出し関数
const callGeminiAPI = async (prompt, options = { isJson: false }) => {
    const apiKey = process.env.GEMINI_API_KEY;
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
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("API response was empty.");
        return text;

    } catch (error) {
        console.error("Gemini API call error:", error);
        throw new Error(`AIの呼び出し中にエラーが発生しました: ${error.message}`);
    }
};

// 動画の長さを取得する関数
const getVideoDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration);
            }
        });
    });
};

// 動画をクリップする関数
const createVideoClip = (inputPath, outputPath, startTime, duration) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .seekInput(startTime)
            .duration(duration)
            .outputOptions([
                '-c:v libx264',
                '-c:a aac',
                '-preset fast',
                '-crf 23',
                '-vf scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black',
                '-r 30'
            ])
            .output(outputPath)
            .on('end', () => {
                console.log('動画クリップ作成完了:', outputPath);
                resolve();
            })
            .on('error', (err) => {
                console.error('動画クリップ作成エラー:', err);
                reject(err);
            })
            .run();
    });
};

// ルート
app.get('/', (req, res) => {
    res.json({ message: 'AI動画クリッピングAPIサーバーが稼働中です' });
});

// 動画URL分析API
app.post('/api/analyze-video', async (req, res) => {
    try {
        const { videoUrl } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: '動画URLが必要です' });
        }

        const prompt = `以下の動画URLの内容の主要なテーマやトピックを、日本語の短いキーワード（例：「子猫の成長記録」「京都の観光スポット紹介」）で抽出してください: ${videoUrl}`;
        const summary = await callGeminiAPI(prompt);
        
        res.json({ 
            success: true, 
            topic: summary,
            message: `分析完了。動画テーマ: ${summary}`
        });

    } catch (error) {
        console.error('動画分析エラー:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 動画ファイルアップロードAPI
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '動画ファイルが必要です' });
        }

        const filePath = req.file.path;
        const duration = await getVideoDuration(filePath);

        res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            duration: duration,
            path: filePath
        });

    } catch (error) {
        console.error('ファイルアップロードエラー:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 動画クリップ生成API
app.post('/api/generate-clips', async (req, res) => {
    try {
        const { 
            videoPath, 
            clips, 
            settings 
        } = req.body;

        if (!videoPath || !clips || !Array.isArray(clips)) {
            return res.status(400).json({ error: '必要なパラメータが不足しています' });
        }

        const results = [];
        const outputDir = 'outputs';
        const timestamp = Date.now();

        // 各クリップを生成
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const outputPath = path.join(outputDir, `clip_${timestamp}_${i + 1}.mp4`);
            
            try {
                await createVideoClip(
                    videoPath, 
                    outputPath, 
                    clip.startTime, 
                    clip.duration
                );
                
                results.push({
                    index: i + 1,
                    title: clip.title,
                    subtitle: clip.subtitle,
                    description: clip.description,
                    hashtags: clip.hashtags,
                    startTime: clip.startTime,
                    duration: clip.duration,
                    outputPath: outputPath,
                    downloadUrl: `/download/${path.basename(outputPath)}`
                });
            } catch (error) {
                console.error(`クリップ ${i + 1} の生成エラー:`, error);
                results.push({
                    index: i + 1,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            clips: results,
            message: `${results.length}個のクリップを生成しました`
        });

    } catch (error) {
        console.error('クリップ生成エラー:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ファイルダウンロードAPI
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'outputs', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'ファイルが見つかりません' });
    }
});

// エラーハンドリングミドルウェア
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'ファイルサイズが大きすぎます（最大1GB）' });
        }
    }
    res.status(500).json({ error: error.message });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 サーバーがポート ${PORT} で起動しました`);
    console.log(`📁 アップロードディレクトリ: ${uploadDir}`);
    console.log(`📁 出力ディレクトリ: ${outputDir}`);
});

module.exports = app;
