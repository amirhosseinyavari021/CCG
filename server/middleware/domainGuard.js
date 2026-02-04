// server/middleware/domainGuard.js - SAFE VERSION
/**
 * میدلوار امن برای بررسی دامنه
 * هرگز خطا نمی‌دهد، همیشه next() را فراخوانی می‌کند
 */

import fs from "fs";
import path from "path";

// لاگ فایل
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "domain-guard.log");

function log(...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(" ")}`;
    fs.appendFileSync(logFile, message + "\n", { flag: 'a' });
}

export default function domainGuard(req, res, next) {
    const startTime = Date.now();
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    try {
        // اطلاعات درخواست
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const method = req.method;
        const url = req.originalUrl || req.url;
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // لاگ درخواست
        log(`[${requestId}] ${method} ${url} from ${ip} - ${userAgent.substring(0, 50)}`);
        
        // بررسی ساده برای health endpoint - اجازه بدون بررسی
        if (url === '/api/health' || url === '/health') {
            log(`[${requestId}] Health check - skipping domain validation`);
            return next();
        }
        
        // بررسی origin (اگر وجود دارد)
        const origin = req.headers.origin || req.headers.referer || '';
        
        // لیست دامنه‌های مجاز از env
        const allowedDomains = process.env.ALLOWED_DOMAINS 
            ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim())
            : ['localhost', '127.0.0.1', 'ccg.cando.ac'];
        
        // اگر origin وجود دارد، بررسی کنیم
        if (origin && process.env.NODE_ENV === 'production') {
            let isAllowed = false;
            
            for (const domain of allowedDomains) {
                if (origin.includes(domain)) {
                    isAllowed = true;
                    break;
                }
            }
            
            if (!isAllowed) {
                const duration = Date.now() - startTime;
                log(`[${requestId}] BLOCKED: Origin ${origin} not in allowed domains (${duration}ms)`);
                
                // در حالت production خطا برگردان
                if (process.env.NODE_ENV === 'production') {
                    return res.status(403).json({
                        ok: false,
                        error: "Access denied",
                        message: "Domain not allowed",
                        requestId: requestId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        
        // اطمینان از وجود req.body
        if (!req.body) {
            req.body = {};
        }
        
        // اضافه کردن requestId به req برای ردیابی
        req.requestId = requestId;
        
        const duration = Date.now() - startTime;
        log(`[${requestId}] Allowed - processing (${duration}ms)`);
        
        next();
        
    } catch (error) {
        // هرگز خطا نده - همیشه ادامه بده
        const duration = Date.now() - startTime;
        log(`[${requestId}] ERROR in domainGuard (${duration}ms):`, error.message);
        
        // اطمینان از وجود req.body
        if (!req.body) {
            req.body = {};
        }
        
        // اضافه کردن requestId
        req.requestId = requestId;
        
        // ادامه پردازش
        next();
    }
}
