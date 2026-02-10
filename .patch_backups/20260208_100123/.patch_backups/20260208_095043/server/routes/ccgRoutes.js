// server/routes/ccgRoutes.js - COMPLETE FIXED VERSION
import express from "express";
import { runAI } from "../utils/aiClient.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// لاگ فایل
const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "ccg-api.log");

function log(...args) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${args.join(" ")}`;
    console.log(message);
    fs.appendFileSync(logFile, message + "\n", { flag: 'a' });
}

log("[CCG_ROUTES] Loading complete ccgRoutes.js");

// ========== HELPER FUNCTIONS ==========

function normalizeRequest(body = {}) {
    const now = Date.now();
    
    return {
        mode: String(body.mode || "generate").toLowerCase(),
        lang: String(body.lang || "fa").toLowerCase(),
        user_request: String(body.user_request || body.userRequest || body.request || body.prompt || "").trim(),
        os: String(body.os || "linux").toLowerCase(),
        cli: String(body.cli || body.shell || "bash").toLowerCase(),
        outputType: String(body.outputType || "markdown").toLowerCase(),
        knowledgeLevel: String(body.knowledgeLevel || body.level || "intermediate").toLowerCase(),
        vendor: body.vendor ? String(body.vendor).toLowerCase() : "",
        deviceType: body.deviceType ? String(body.deviceType).toLowerCase() : "",
        version: body.version || "1.0",
        timestamp: now,
        requestId: body.requestId || `req_${now.toString(36)}`
    };
}

function validateRequest(normalized) {
    const errors = [];
    
    if (!normalized.user_request) {
        errors.push("user_request is required");
    }
    
    if (normalized.user_request.length > 5000) {
        errors.push("user_request is too long (max 5000 characters)");
    }
    
    const validModes = ["generate", "explain", "analyze", "compare", "error", "script"];
    if (!validModes.includes(normalized.mode)) {
        errors.push(`Invalid mode. Must be one of: ${validModes.join(", ")}`);
    }
    
    const validLangs = ["fa", "en", "ar", "fr", "de"];
    if (!validLangs.includes(normalized.lang)) {
        errors.push(`Invalid language. Must be one of: ${validLangs.join(", ")}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function checkServiceStatus() {
    const hasOpenAI = process.env.OPENAI_API_KEY && 
                     process.env.OPENAI_API_KEY.length > 30 &&
                     !process.env.OPENAI_API_KEY.includes("your_");
    
    const hasMongoDB = process.env.MONGO_URI && 
                      process.env.MONGO_URI.includes("mongodb://");
    
    return {
        hasOpenAI,
        hasMongoDB,
        openaiStatus: hasOpenAI ? "✅ پیکربندی شده" : "❌ نیاز به تنظیم",
        mongoStatus: hasMongoDB ? "✅ پیکربندی شده" : "⚠️ تنظیم نشده"
    };
}

function createMockResponse(normalized, serviceStatus) {
    const { hasOpenAI, hasMongoDB, openaiStatus, mongoStatus } = serviceStatus;
    const now = new Date();
    
    let command = "";
    if (normalized.user_request.toLowerCase().includes("list") || normalized.user_request.includes("لیست")) {
        command = "ls -la";
    } else if (normalized.user_request.toLowerCase().includes("directory") || normalized.user_request.includes("پوشه")) {
        command = "pwd";
    } else if (normalized.user_request.toLowerCase().includes("process") || normalized.user_request.includes("پردازش")) {
        command = "ps aux | head -20";
    } else if (normalized.user_request.toLowerCase().includes("network") || normalized.user_request.includes("شبکه")) {
        command = "ifconfig || ip addr";
    } else {
        command = `echo "دستور برای: ${normalized.user_request.substring(0, 50)}..."`;
    }
    
    const markdown = `# 🚀 پاسخ CCG API
**وضعیت:** ${hasOpenAI ? 'اتصال به OpenAI برقرار' : 'استفاده از حالت تستی'}

## 📝 اطلاعات درخواست
- **حالت:** \`${normalized.mode}\`
- **زبان:** \`${normalized.lang}\`
- **سیستم عامل:** \`${normalized.os}\`
- **شل:** \`${normalized.cli}\`
- **سطح دانش:** \`${normalized.knowledgeLevel}\`

## 💻 دستور تولید شده
\`\`\`${normalized.cli}
${command}
\`\`\`

## 📋 توضیحات
این دستور ${normalized.os === 'linux' ? 'برای سیستم‌های لینوکس' : 
                normalized.os === 'windows' ? 'برای ویندوز (PowerShell)' : 
                normalized.os === 'mac' ? 'برای macOS' : 'برای سیستم شما'} طراحی شده است.

## ⚠️ نکات مهم
1. قبل از اجرا، دستور را بررسی کنید
2. در محیط تست اجرا شود
3. از دسترسی‌های لازم اطمینان حاصل کنید

## 🔧 وضعیت سرویس‌ها
- **OpenAI API:** ${openaiStatus}
- **MongoDB:** ${mongoStatus}
- **زمان تولید:** ${now.toLocaleString('fa-IR')}
- **شناسه درخواست:** ${normalized.requestId}

---
*این یک پاسخ آزمایشی است. برای دریافت پاسخ واقعی، تنظیمات API را کامل کنید.*`;

    return {
        ok: true,
        markdown: markdown,
        tool: {
            primary: {
                command: command,
                description: "دستور اصلی تولید شده",
                platform: normalized.os,
                shell: normalized.cli
            },
            explanation: "این یک پاسخ آزمایشی از CCG API است. در حالت واقعی، پاسخ توسط هوش مصنوعی تولید می‌شود.",
            warnings: [
                "⚠️ در حال استفاده از حالت آزمایشی",
                "⚠️ پاسخ واقعی هوش مصنوعی فعال نیست",
                "⚠️ لطفا تنظیمات API را بررسی کنید"
            ],
            alternatives: [
                "برای راهنمایی: https://docs.ccg.cando.ac",
                "پشتیبانی: support@cando.ac"
            ]
        },
        timestamp: now.toISOString(),
        requestId: normalized.requestId,
        debug: {
            normalized: normalized,
            services: serviceStatus,
            mock: true,
            version: "3.2.0"
        }
    };
}

// ========== ROUTES ==========

// Middleware
router.use((req, res, next) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    req.requestId = requestId;
    
    log(`[${requestId}] CCG API: ${req.method} ${req.path}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        const bodyStr = JSON.stringify(req.body);
        const maxLength = 1000;
        if (bodyStr.length > maxLength) {
            log(`[${requestId}] Body (truncated): ${bodyStr.substring(0, maxLength)}... [+${bodyStr.length - maxLength} chars]`);
        } else {
            log(`[${requestId}] Body: ${bodyStr}`);
        }
    }
    
    next();
});

// POST /api/ccg - اصلی
router.post("/", async (req, res) => {
    const startTime = Date.now();
    
    try {
        log(`[${req.requestId}] Processing CCG request...`);
        
        // نرمالایز کردن درخواست
        const normalized = normalizeRequest(req.body);
        log(`[${req.requestId}] Normalized:`, JSON.stringify(normalized));
        
        // اعتبارسنجی
        const validation = validateRequest(normalized);
        if (!validation.isValid) {
            log(`[${req.requestId}] Validation failed:`, validation.errors);
            return res.status(400).json({
                ok: false,
                error: "Validation failed",
                details: validation.errors,
                requestId: req.requestId,
                timestamp: new Date().toISOString()
            });
        }
        
        log(`[${req.requestId}] Request validated successfully`);
        
        // بررسی وضعیت سرویس‌ها
        const serviceStatus = checkServiceStatus();
        log(`[${req.requestId}] Service status:`, JSON.stringify(serviceStatus));
        
        // اگر OpenAI تنظیم شده، سعی در اتصال
        if (serviceStatus.hasOpenAI) {
            try {
                log(`[${req.requestId}] Attempting to call OpenAI...`);
                
                // فراخوانی OpenAI
                const aiResult = await runAI(normalized);
                
                const response = {
                    ok: true,
                    markdown: aiResult.markdown,
                    tool: aiResult.tool,
                    timestamp: new Date().toISOString(),
                    requestId: normalized.requestId,
                    source: "openai",
                    model: aiResult.raw?.model || process.env.AI_PRIMARY_MODEL || "gpt-3.5-turbo"
                };
                
                const duration = Date.now() - startTime;
                log(`[${req.requestId}] OpenAI response sent (${duration}ms)`);
                
                return res.json(response);
                
            } catch (openaiError) {
                log(`[${req.requestId}] OpenAI error:`, openaiError.message);
                // ادامه با mock
            }
        }
        
        // ارسال پاسخ mock
        const mockResponse = createMockResponse(normalized, serviceStatus);
        const duration = Date.now() - startTime;
        
        log(`[${req.requestId}] Mock response sent (${duration}ms)`);
        return res.json(mockResponse);
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        log(`[${req.requestId}] UNEXPECTED ERROR (${duration}ms):`, error.message);
        log(`[${req.requestId}] Stack:`, error.stack);
        
        return res.status(500).json({
            ok: false,
            error: "Internal server error",
            message: error.message,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
            duration: duration,
            debug: process.env.NODE_ENV === "development" ? {
                stack: error.stack,
                rawError: error.toString()
            } : undefined
        });
    }
});

// GET /api/ccg/ping - برای تست
router.get("/ping", (req, res) => {
    log(`[${req.requestId || "ping"}] Ping requested`);
    
    const serviceStatus = checkServiceStatus();
    
    return res.json({
        ok: true,
        service: "ccg",
        version: "3.2.0",
        status: "operational",
        timestamp: Date.now(),
        services: serviceStatus,
        endpoints: {
            main: "POST /api/ccg",
            ping: "GET /api/ccg/ping",
            health: "GET /api/health",
            info: "GET /api/info"
        }
    });
});

// GET /api/ccg/status - وضعیت دقیق
router.get("/status", (req, res) => {
    const serviceStatus = checkServiceStatus();
    const now = new Date();
    
    const status = {
        ok: true,
        system: {
            name: "CCG API",
            version: "3.2.0",
            environment: process.env.NODE_ENV || "development",
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: now.toISOString()
        },
        services: {
            openai: {
                configured: serviceStatus.hasOpenAI,
                status: serviceStatus.openaiStatus,
                model: process.env.AI_PRIMARY_MODEL || "gpt-4.1"
            },
            mongodb: {
                configured: serviceStatus.hasMongoDB,
                status: serviceStatus.mongoStatus,
                uri_configured: !!process.env.MONGO_URI
            },
            api: {
                status: "operational",
                endpoints: 4,
                rate_limiting: "enabled"
            }
        },
        statistics: {
            requests_today: 0,
            avg_response_time: 0,
            uptime_days: (process.uptime() / 86400).toFixed(2)
        }
    };
    
    return res.json(status);
});

// POST /api/ccg/test - تست endpoint
router.post("/test", (req, res) => {
    log(`[${req.requestId || "test"}] Test endpoint called`);
    
    return res.json({
        ok: true,
        message: "CCG API test endpoint is working",
        received: req.body,
        server_info: {
            version: "3.2.0",
            pid: process.pid,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        },
        request_details: {
            method: req.method,
            path: req.path,
            headers: Object.keys(req.headers),
            ip: req.ip
        }
    });
});

// 404 برای routes خاص ccg
router.use((req, res) => {
    log(`[${req.requestId || "404"}] CCG route not found: ${req.method} ${req.originalUrl}`);
    
    return res.status(404).json({
        ok: false,
        error: "CCG API route not found",
        available_routes: {
            "POST /": "Main CCG endpoint",
            "GET /ping": "Ping endpoint",
            "GET /status": "Status endpoint",
            "POST /test": "Test endpoint"
        },
        request: {
            method: req.method,
            path: req.path,
            timestamp: new Date().toISOString()
        }
    });
});

log("[CCG_ROUTES] All routes registered successfully");

export default router;
