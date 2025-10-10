#!/usr/bin/env node

/**
 * 俳句鑑賞＆記録アプリ - Express.jsサーバー
 * Node.js ES Module環境での統一実行
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module環境でのファイルパス取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'docs')));

// JSONパースミドルウェア
app.use(express.json());

// ルートディレクトリでindex.htmlを配信
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// ヘルスチェック
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.3.0',
        environment: 'Node.js ES Module'
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log('🚀 俳句鑑賞アプリサーバー起動');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔧 環境: Node.js ES Module`);
    console.log(`📁 静的ファイル: ${path.join(__dirname, 'docs')}`);
});

// 優雅なシャットダウン
process.on('SIGTERM', () => {
    console.log('🛑 サーバーを停止しています...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 サーバーを停止しています...');
    process.exit(0);
});