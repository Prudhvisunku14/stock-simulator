const nodemailer = require('nodemailer');
const { query } = require('../config/db');

// Create a transporter using Ethereal (test service) or environment variables
const createTransporter = async () => {
    // For development, we'll create a test account on Ethereal
    if (!process.env.EMAIL_USER) {
        let testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }

    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendAlertEmail = async (userId, alert) => {
    try {
        const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        if (!user || !user.email) return;

        const transporter = await createTransporter();

        const info = await transporter.sendMail({
            from: '"StockSim Alerts" <alerts@stocksim.com>',
            to: user.email,
            subject: `🚨 Stock Alert: ${alert.stock_symbol}`,
            text: `Hello ${user.name},\n\nA new alert was triggered for ${alert.stock_symbol}:\n\n${alert.message}\n\nTime: ${new Date(alert.created_at).toLocaleString('en-IN')}\n\nGood luck trading!`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #ef4444;">🚨 Stock Alert: ${alert.stock_symbol}</h2>
                <p>Hello <strong>${user.name}</strong>,</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px;">${alert.message}</p>
                </div>
                <p style="color: #64748b; font-size: 12px;">Triggered at: ${new Date(alert.created_at).toLocaleString('en-IN')}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #94a3b8;">You received this because you are watching ${alert.stock_symbol} on StockSim.</p>
            </div>`
        });

        console.log(`✉️ Email alert sent to ${user.email}: ${nodemailer.getTestMessageUrl(info) || info.messageId}`);
    } catch (err) {
        console.error('❌ Error sending alert email:', err.message);
    }
};

module.exports = { sendAlertEmail };
