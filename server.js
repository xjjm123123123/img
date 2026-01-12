require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Helper to wrap Vercel-style handlers
const wrapHandler = (handlerPath) => {
    const handler = require(handlerPath);
    return async (req, res) => {
        try {
            await handler(req, res);
        } catch (error) {
            console.error(`Error in ${handlerPath}:`, error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    };
};

// API Routes
app.get('/api/config', wrapHandler('./api/config.js'));
app.post('/api/github/upload', wrapHandler('./api/github/upload.js'));
app.post('/api/feishu/records/search', wrapHandler('./api/feishu/records/search.js'));
app.post('/api/feishu/records', wrapHandler('./api/feishu/records/index.js'));
app.put('/api/feishu/records/:record_id', (req, res) => {
    // Vercel serverless functions get query params in req.query
    // Express puts route params in req.params
    // We need to merge them for the handler to work as expected
    req.query = { ...req.query, ...req.params };
    const handler = require('./api/feishu/records/[record_id].js');
    handler(req, res);
});

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
