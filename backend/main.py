import functions_framework
import os
import json
import requests
from google.cloud import storage
from googleapiclient.discovery import build
import tempfile
import subprocess
import uuid

# 環境変数からAPIキーを取得
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY')

# APIキーの存在確認
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")
if not YOUTUBE_API_KEY:
    raise ValueError("YOUTUBE_API_KEY environment variable is required")

# YouTube Data API v3 クライアント（環境変数が設定されている場合のみ）
youtube = None
if YOUTUBE_API_KEY:
    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)

# Google Cloud Storage クライアント（環境変数が設定されている場合のみ）
storage_client = None

def call_gemini_api(prompt, is_json=False, model="gemini-2.5-flash-preview-05-20"):
    """Gemini APIを呼び出す関数"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    if is_json:
        payload["generationConfig"] = {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING"},
                        "subtitle": {"type": "STRING"},
                        "description": {"type": "STRING"},
                        "hashtags": {"type": "ARRAY", "items": {"type": "STRING"}}
                    },
                    "required": ["title", "subtitle", "description", "hashtags"]
                }
            }
        }
    
    try:
        response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'})
        response.raise_for_status()
        
        result = response.json()
        text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
        
        if not text:
            raise Exception("API response was empty.")
        
        return text
        
    except Exception as error:
        print(f"Gemini API call error: {error}")
        raise Exception(f"AIの呼び出し中にエラーが発生しました: {str(error)}")

def extract_video_id(url):
    """YouTube URLから動画IDを抽出する関数"""
    import re
    
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def get_video_info(video_id):
    """YouTube動画の情報を取得する関数"""
    if not youtube:
        raise Exception("YouTube API client is not initialized")
    
    try:
        response = youtube.videos().list(
            part='snippet,contentDetails',
            id=video_id
        ).execute()
        
        if not response['items']:
            raise Exception("動画が見つかりません")
        
        video = response['items'][0]
        snippet = video['snippet']
        content_details = video['contentDetails']
        
        # 動画の長さを秒に変換
        duration = content_details['duration']
        duration_seconds = 0
        if 'PT' in duration:
            duration = duration.replace('PT', '')
            if 'H' in duration:
                hours = int(duration.split('H')[0])
                duration_seconds += hours * 3600
                duration = duration.split('H')[1]
            if 'M' in duration:
                minutes = int(duration.split('M')[0])
                duration_seconds += minutes * 60
                duration = duration.split('M')[1]
            if 'S' in duration:
                seconds = int(duration.replace('S', ''))
                duration_seconds += seconds
        
        return {
            'title': snippet['title'],
            'description': snippet['description'],
            'duration': duration_seconds,
            'channel_title': snippet['channelTitle'],
            'published_at': snippet['publishedAt']
        }
        
    except Exception as error:
        print(f"YouTube API error: {error}")
        raise Exception(f"YouTube動画の情報取得に失敗しました: {str(error)}")

@functions_framework.http
def analyze_video(request):
    """動画URLを分析するCloud Function"""
    
    # CORS設定
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        # リクエストボディを取得
        request_json = request.get_json()
        if not request_json or 'videoUrl' not in request_json:
            return (json.dumps({'error': '動画URLが必要です'}), 400, headers)
        
        video_url = request_json['videoUrl']
        
        # YouTube動画IDを抽出
        video_id = extract_video_id(video_url)
        if not video_id:
            return (json.dumps({'error': '有効なYouTube URLではありません'}), 400, headers)
        
        # 動画情報を取得
        video_info = get_video_info(video_id)
        
        # AIで動画のテーマを分析
        prompt = f"""
        以下のYouTube動画の内容を分析し、主要なテーマやトピックを日本語の短いキーワードで抽出してください。
        
        動画タイトル: {video_info['title']}
        動画説明: {video_info['description'][:500]}...
        チャンネル名: {video_info['channel_title']}
        動画の長さ: {video_info['duration']}秒
        
        例：「子猫の成長記録」「京都の観光スポット紹介」「プログラミング入門講座」のような形式で回答してください。
        """
        
        topic = call_gemini_api(prompt)
        
        return (json.dumps({
            'success': True,
            'topic': topic.strip(),
            'message': f'分析完了。動画テーマ: {topic.strip()}',
            'video_info': {
                'title': video_info['title'],
                'duration': video_info['duration'],
                'channel': video_info['channel_title']
            }
        }), 200, headers)
        
    except Exception as error:
        print(f"Error in analyze_video: {error}")
        return (json.dumps({
            'success': False,
            'error': str(error)
        }), 500, headers)

@functions_framework.http
def generate_video_clips(request):
    """動画切り抜きを生成するCloud Function"""
    
    # CORS設定
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
    
    try:
        # リクエストボディを取得
        request_json = request.get_json()
        if not request_json:
            return (json.dumps({'error': 'リクエストボディが必要です'}), 400, headers)
        
        video_url = request_json.get('videoUrl')
        video_topic = request_json.get('videoTopic', '')
        max_clips = request_json.get('maxClips', 5)
        target_audience = request_json.get('targetAudience', '全般')
        tone = request_json.get('tone', '親しみやすく')
        min_duration = request_json.get('minDuration', 30)
        max_duration = request_json.get('maxDuration', 120)
        
        if not video_url:
            return (json.dumps({'error': '動画URLが必要です'}), 400, headers)
        
        # YouTube動画IDを抽出
        video_id = extract_video_id(video_url)
        if not video_id:
            return (json.dumps({'error': '有効なYouTube URLではありません'}), 400, headers)
        
        # 動画情報を取得
        video_info = get_video_info(video_id)
        
        # Gemini 2.5 Proで動画の切り抜きポイントを分析
        analysis_prompt = f"""
        以下のYouTube動画を分析し、SNS向けの切り抜き動画を生成するための最適なタイミングを特定してください。

        動画情報:
        - タイトル: {video_info['title']}
        - 説明: {video_info['description'][:1000]}...
        - 動画の長さ: {video_info['duration']}秒
        - チャンネル: {video_info['channel_title']}
        - 動画テーマ: {video_topic}

        要件:
        - 切り抜き本数: {max_clips}本
        - ターゲット層: {target_audience}
        - トーン: {tone}
        - 切り抜き時間: {min_duration}-{max_duration}秒

        以下のJSON形式で回答してください:
        {{
            "clips": [
                {{
                    "startTime": 開始時間（秒）,
                    "duration": 長さ（秒）,
                    "title": "キャッチーなタイトル",
                    "subtitle": "サブタイトル",
                    "description": "説明文（2-3文）",
                    "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
                    "reason": "この切り抜きが選ばれた理由"
                }}
            ]
        }}
        """
        
        # Gemini 2.5 Proを使用して分析
        analysis_result = call_gemini_api(analysis_prompt, is_json=True, model="gemini-2.5-pro")
        
        if not analysis_result:
            raise Exception("AI分析に失敗しました")
        
        clips_data = json.loads(analysis_result)
        
        # 結果を整理
        result = {
            'success': True,
            'video_info': video_info,
            'clips': clips_data.get('clips', []),
            'message': f'{len(clips_data.get("clips", []))}個の切り抜き案を生成しました'
        }
        
        return (json.dumps(result), 200, headers)
        
    except Exception as error:
        print(f"Error in generate_video_clips: {error}")
        return (json.dumps({
            'success': False,
            'error': str(error)
        }), 500, headers)

# ルーティング用のメイン関数
@functions_framework.http
def main(request):
    """メインルーティング関数"""
    path = request.path
    
    if path == '/analyze-video' or path == '/':
        return analyze_video(request)
    elif path == '/generate-video-clips':
        return generate_video_clips(request)
    else:
        return (json.dumps({'error': 'Endpoint not found'}), 404, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        })

