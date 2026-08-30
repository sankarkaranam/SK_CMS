# ============================================================
# server.ps1 — Production HTTP Server, REST API & SSG Engine
# Sankar Karanam Founder Publishing Platform
# ============================================================

param(
    [int]$Port = 8080
)

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $baseDir

# Ensure data and upload directories exist
$dataDir = Join-Path $baseDir "data"
$backupDir = Join-Path $dataDir "backups"
$uploadDir = Join-Path $baseDir "assets\uploads"
$journalDir = Join-Path $baseDir "journal"

if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
if (-not (Test-Path $uploadDir)) { New-Item -ItemType Directory -Path $uploadDir -Force | Out-Null }

$dbPath = Join-Path $dataDir "db.json"

# Compile Security Cryptography Engine in C#
Add-Type -TypeDefinition @"
using System;
using System.Security.Cryptography;
using System.Text;

public class CryptoHelper {
    public static string HashPassword(string password, string salt) {
        using (var pbkdf2 = new Rfc2898DeriveBytes(password, Encoding.UTF8.GetBytes(salt), 10000)) {
            byte[] hash = pbkdf2.GetBytes(32);
            return Convert.ToBase64String(hash);
        }
    }

    public static string GenerateToken() {
        byte[] bytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create()) {
            rng.GetBytes(bytes);
        }
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    public static string GenerateSalt() {
        byte[] bytes = new byte[16];
        using (var rng = RandomNumberGenerator.Create()) {
            rng.GetBytes(bytes);
        }
        return Convert.ToBase64String(bytes);
    }
}
"@

# Global Database Lock Object
$dbLock = New-Object Object

function Get-DB {
    [System.Threading.Monitor]::Enter($dbLock)
    try {
        if (Test-Path $dbPath) {
            $raw = [System.IO.File]::ReadAllText($dbPath, [System.Text.Encoding]::UTF8)
            return ($raw | ConvertFrom-Json)
        }
        return @{
            users = @(); sessions = @(); posts = @(); ventures = @();
            projects = @(); journey = @(); contacts = @(); subscribers = @();
            settings = @{}; media = @(); analytics = @{ pageViews = @{}; events = @() }
        }
    } finally {
        [System.Threading.Monitor]::Exit($dbLock)
    }
}

function Save-DB ($db) {
    [System.Threading.Monitor]::Enter($dbLock)
    try {
        $json = $db | ConvertTo-Json -Depth 20 -Compress:$false
        [System.IO.File]::WriteAllText($dbPath, $json, [System.Text.Encoding]::UTF8)
        
        # Periodic snapshot backup (1 per hour max)
        $nowStamp = (Get-Date).ToString("yyyyMMdd_HH")
        $hourlyBackup = Join-Path $backupDir "db_backup_$nowStamp.json"
        if (-not (Test-Path $hourlyBackup)) {
            [System.IO.File]::WriteAllText($hourlyBackup, $json, [System.Text.Encoding]::UTF8)
        }
    } finally {
        [System.Threading.Monitor]::Exit($dbLock)
    }
}

# Failed login tracking (IP/username rate limiting)
$failedLogins = @{}

function Validate-Auth ($req, $db) {
    $token = $null
    $authHeader = $req.Headers["Authorization"]
    if ($authHeader -and $authHeader.StartsWith("Bearer ")) {
        $token = $authHeader.Substring(7).Trim()
    }
    if (-not $token -and $req.Cookies["sk_auth_token"]) {
        $token = $req.Cookies["sk_auth_token"].Value
    }
    if (-not $token) { return $null }

    $now = (Get-Date).ToUniversalTime()
    $session = $db.sessions | Where-Object { $_.token -eq $token }
    if ($session) {
        $exp = [DateTime]::Parse($session.expiresAt).ToUniversalTime()
        if ($now -lt $exp) {
            return $session
        }
    }
    return $null
}

# Static Site Generation Helper (Generates physical indexable HTML files upon publish)
function Generate-Static-Article ($post, $db) {
    $slug = $post.slug
    $targetFile = Join-Path $journalDir "$slug.html"
    
    $settings = $db.settings
    $founderName = if ($settings.founderName) { $settings.founderName } else { "Sankar Karanam" }
    $title = [System.Security.SecurityElement]::Escape($post.title)
    $desc = [System.Security.SecurityElement]::Escape($post.excerpt)
    $category = [System.Security.SecurityElement]::Escape($post.category)
    $pubDate = if ($post.publishedAt) { (Get-Date $post.publishedAt).ToString("dd MMM yyyy") } else { (Get-Date).ToString("dd MMM yyyy") }
    $readTime = if ($post.readTime) { $post.readTime } else { "5 min read" }
    $claps = if ($post.claps) { $post.claps } else { 0 }
    $content = $post.content

    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>$title | $founderName</title>
  <meta name="description" content="$desc">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://sankarkaranam.com/journal/$slug.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="$title">
  <meta property="og:description" content="$desc">
  <meta property="og:url" content="https://sankarkaranam.com/journal/$slug.html">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="$title">
  <meta name="twitter:description" content="$desc">
  <link rel="stylesheet" href="../css/design-system.css">
  <link rel="stylesheet" href="../css/components.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "$title",
    "description": "$desc",
    "datePublished": "$pubDate",
    "author": {
      "@type": "Person",
      "name": "$founderName",
      "url": "https://sankarkaranam.com/"
    },
    "publisher": {
      "@type": "Person",
      "name": "$founderName"
    }
  }
  </script>
  <style>
    .article-header { padding-block: var(--space-12); border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface); }
    .article-meta-row { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; }
    .article-title-h1 { font-size: clamp(var(--text-2xl), 4vw, var(--text-4xl)); font-weight: 800; line-height: var(--leading-snug); margin-bottom: var(--space-4); letter-spacing: var(--tracking-tight); }
    .article-subtitle { font-size: var(--text-lg); color: var(--text-secondary); line-height: var(--leading-relaxed); margin-bottom: var(--space-6); }
    .article-author-mini { display: flex; align-items: center; gap: var(--space-3); }
    .author-mini-avatar { width: 44px; height: 44px; border-radius: var(--radius-full); object-fit: cover; border: 2px solid var(--border-light); }
  </style>
</head>
<body>
<div class="bg-grid" aria-hidden="true"></div>
<div class="reading-progress"><div class="reading-progress-bar" id="reading-bar"></div></div>
<main>
  <article>
    <header class="article-header">
      <div class="container container--article">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <div class="breadcrumb-item"><a href="../index.html" class="breadcrumb-link">Home</a><span class="breadcrumb-separator">/</span></div>
          <div class="breadcrumb-item"><a href="index.html" class="breadcrumb-link">Journal</a><span class="breadcrumb-separator">/</span></div>
          <div class="breadcrumb-item"><span class="breadcrumb-current">$title</span></div>
        </nav>
        <div class="article-meta-row">
          <span class="badge badge--blue">$category</span>
          <span style="font-size:var(--text-xs); color:var(--text-muted);">$pubDate</span>
          <span style="font-size:var(--text-xs); color:var(--text-muted);">$readTime</span>
        </div>
        <h1 class="article-title-h1">$title</h1>
        <p class="article-subtitle">$desc</p>
        <div class="article-author-mini">
          <img src="../assets/sankar.jpeg" alt="$founderName" class="author-mini-avatar">
          <div>
            <strong style="font-size:var(--text-sm); display:block;">$founderName</strong>
            <span style="font-size:var(--text-xs); color:var(--text-muted);">Founder &amp; Serial Entrepreneur</span>
          </div>
        </div>
      </div>
    </header>

    <div class="section">
      <div class="container container--article">
        <div class="article-body">
          $content
        </div>

        <!-- Social Share -->
        <div class="social-share">
          <span class="social-share-label">Share this insight:</span>
          <button class="share-btn share-btn--linkedin" onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href))">💼 LinkedIn</button>
          <button class="share-btn share-btn--x" onclick="window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('$title') + '&url=' + encodeURIComponent(window.location.href))">𝕏 Post</button>
          <button class="share-btn share-btn--whatsapp" onclick="window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent('$title ' + window.location.href))">💬 WhatsApp</button>
          <button class="share-btn share-btn--copy" onclick="navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied!'))">🔗 Copy Link</button>
        </div>

        <!-- Claps & Reactions -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--space-6) 0; border-bottom:1px solid var(--border-subtle); margin-bottom:var(--space-8);">
          <button class="btn btn--secondary" id="clap-btn" style="gap:var(--space-2); font-size:var(--text-base);">
            <span>👏</span> <span id="clap-count">$claps</span> Claps
          </button>
          <button class="btn btn--ghost" id="bookmark-btn">🔖 Bookmark</button>
        </div>

        <!-- Feedback Widget -->
        <div class="feedback-widget">
          <div class="feedback-question">Was this insight helpful for your building journey?</div>
          <div class="feedback-buttons">
            <button class="feedback-btn" id="fb-yes">👍 Yes, valuable</button>
            <button class="feedback-btn" id="fb-no">👎 Needs more depth</button>
          </div>
          <div class="feedback-response" id="fb-response">Thank you for your feedback! It guides future publishing.</div>
        </div>

        <!-- Author Card -->
        <div class="author-card" style="margin-top:var(--space-12);">
          <img src="../assets/sankar.jpeg" alt="$founderName" class="author-avatar" width="72" height="72">
          <div class="author-info">
            <div class="author-name">$founderName</div>
            <div class="author-title">Serial Entrepreneur &amp; Founder</div>
            <p class="author-bio">Founder of OruMind, Creators Club, Worke, and AdPresence. Author of Ethical Hacking. Daily insights on entrepreneurship, AI systems, and the 1% compounding philosophy.</p>
            <div class="author-links">
              <a href="https://www.linkedin.com/in/sankarkaranam7/" target="_blank" rel="noopener noreferrer" class="author-link">💼 LinkedIn</a>
              <a href="../contact/index.html" class="author-link">✉️ Message</a>
              <a href="../about.html" class="author-link">About Sankar →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
</main>
<script src="../js/cms.js"></script>
<script src="../js/nav.js"></script>
<script>
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('reading-bar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0) bar.style.width = Math.min(100, Math.max(0, (window.scrollY / h) * 100)) + '%';
  }, { passive: true });

  const cBtn = document.getElementById('clap-btn');
  const cCount = document.getElementById('clap-count');
  let claps = $claps;
  cBtn?.addEventListener('click', () => {
    claps++;
    cCount.textContent = claps;
    fetch('/api/posts/$($post.id)/clap', { method: 'POST' }).catch(() => {});
    if (typeof showToast !== 'undefined') showToast('👏 Thanks for clapping!', 'success');
  });

  const fbYes = document.getElementById('fb-yes');
  const fbNo = document.getElementById('fb-no');
  const fbResp = document.getElementById('fb-response');
  const submitFb = (type) => {
    fbResp.classList.add('visible');
    fbYes.disabled = true;
    fbNo.disabled = true;
    fetch('/api/posts/$($post.id)/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type })
    }).catch(() => {});
    if (typeof showToast !== 'undefined') showToast('Feedback submitted. Thank you!');
  };
  fbYes?.addEventListener('click', () => submitFb('yes'));
  fbNo?.addEventListener('click', () => submitFb('no'));
});
</script>
</body>
</html>
"@
    [System.IO.File]::WriteAllText($targetFile, $html, [System.Text.Encoding]::UTF8)
}

function Regenerate-Sitemap-And-RSS ($db) {
    $nowDate = (Get-Date).ToString("yyyy-MM-dd")
    
    # 1. Sitemap
    $sitemapXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://sankarkaranam.com/</loc><lastmod>$nowDate</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://sankarkaranam.com/about.html</loc><lastmod>$nowDate</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://sankarkaranam.com/journal/index.html</loc><lastmod>$nowDate</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://sankarkaranam.com/ventures/index.html</loc><lastmod>$nowDate</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://sankarkaranam.com/journey/index.html</loc><lastmod>$nowDate</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://sankarkaranam.com/projects/index.html</loc><lastmod>$nowDate</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://sankarkaranam.com/media/index.html</loc><lastmod>$nowDate</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://sankarkaranam.com/newsletter/index.html</loc><lastmod>$nowDate</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://sankarkaranam.com/contact/index.html</loc><lastmod>$nowDate</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
"@
    $pubPosts = $db.posts | Where-Object { $_.status -eq 'published' }
    foreach ($p in $pubPosts) {
        $pDate = if ($p.publishedAt) { (Get-Date $p.publishedAt).ToString("yyyy-MM-dd") } else { $nowDate }
        $sitemapXml += "`n  <url><loc>https://sankarkaranam.com/journal/$($p.slug).html</loc><lastmod>$pDate</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>"
    }
    $sitemapXml += "`n</urlset>`n"
    [System.IO.File]::WriteAllText((Join-Path $baseDir "sitemap.xml"), $sitemapXml, [System.Text.Encoding]::UTF8)

    # 2. RSS
    $rssXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sankar Karanam — Founder Journal &amp; Insights</title>
    <link>https://sankarkaranam.com/journal/</link>
    <description>Daily actionable dispatches from serial entrepreneur Sankar Karanam on scaling companies, AI leverage, cybersecurity, and compounding growth.</description>
    <language>en-IN</language>
    <lastBuildDate>$( (Get-Date).ToUniversalTime().ToString("r") )</lastBuildDate>
    <atom:link href="https://sankarkaranam.com/rss.xml" rel="self" type="application/rss+xml"/>
"@
    foreach ($p in $pubPosts) {
        $pubRfc = if ($p.publishedAt) { (Get-Date $p.publishedAt).ToUniversalTime().ToString("r") } else { (Get-Date).ToUniversalTime().ToString("r") }
        $rssXml += @"

    <item>
      <title><![CDATA[$($p.title)]]></title>
      <link>https://sankarkaranam.com/journal/$($p.slug).html</link>
      <guid isPermaLink="true">https://sankarkaranam.com/journal/$($p.slug).html</guid>
      <pubDate>$pubRfc</pubDate>
      <description><![CDATA[$($p.excerpt)]]></description>
      <category>$($p.category)</category>
    </item>
"@
    }
    $rssXml += "`n  </channel>`n</rss>`n"
    [System.IO.File]::WriteAllText((Join-Path $baseDir "rss.xml"), $rssXml, [System.Text.Encoding]::UTF8)
}

# Initial Static Generation on Startup
$initialDb = Get-DB
foreach ($p in ($initialDb.posts | Where-Object { $_.status -eq 'published' })) {
    Generate-Static-Article $p $initialDb
}
Regenerate-Sitemap-And-RSS $initialDb

# Initialize HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
    $listener.Start()
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ">>> SANKAR KARANAM PRODUCTION BACKEND & SERVER ACTIVE <<<" -ForegroundColor Green
    Write-Host ">>> Local Server:  http://localhost:$Port/" -ForegroundColor White
    Write-Host ">>> API Root:      http://localhost:$Port/api/" -ForegroundColor Yellow
    Write-Host ">>> Root Dir:      $baseDir" -ForegroundColor Gray
    Write-Host "============================================================" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to start listener on port $Port : $_" -ForegroundColor Red
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".xml"  = "application/xml; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".webp" = "image/webp"
}

function Send-JSON ($res, $obj, [int]$status = 200) {
    $json = $obj | ConvertTo-Json -Depth 15 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $res.StatusCode = $status
    $res.ContentType = "application/json; charset=utf-8"
    $res.ContentLength64 = $bytes.Length
    $res.Headers.Add("Access-Control-Allow-Origin", "*")
    $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.OutputStream.Close()
}

function Send-Error ($res, [string]$msg, [int]$status = 400) {
    Send-JSON $res @{ error = $msg } $status
}

# Main request processing loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $path = $req.Url.AbsolutePath
        $method = $req.HttpMethod

        # CORS Preflight
        if ($method -eq "OPTIONS") {
            $res.StatusCode = 204
            $res.Headers.Add("Access-Control-Allow-Origin", "*")
            $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            $res.OutputStream.Close()
            continue
        }

        # Read JSON body if present
        $body = $null
        if ($req.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
            $rawBody = $reader.ReadToEnd()
            if ($rawBody -and $rawBody.Trim().StartsWith("{") -or $rawBody.Trim().StartsWith("[")) {
                try { $body = $rawBody | ConvertFrom-Json } catch {}
            }
        }

        # ------------------------------------------------------------
        # API ROUTING (/api/*)
        # ------------------------------------------------------------
        if ($path.StartsWith("/api/")) {
            $db = Get-DB

            # --- AUTH: Login ---
            if ($path -eq "/api/auth/login" -and $method -eq "POST") {
                $username = if ($body.username) { $body.username.ToString().Trim() } else { "" }
                $password = if ($body.password) { $body.password.ToString() } else { "" }

                $user = $db.users | Where-Object { $_.username -eq $username -or $_.email -eq $username }
                if (-not $user) {
                    Send-Error $res "Invalid username or password" 401
                    continue
                }

                $hashAttempt = [CryptoHelper]::HashPassword($password, $user.salt)
                if ($hashAttempt -eq $user.passwordHash) {
                    $token = [CryptoHelper]::GenerateToken()
                    $exp = (Get-Date).AddHours(8).ToUniversalTime().ToString("o")
                    
                    $newSession = @{
                        token = $token
                        userId = $user.id
                        role = $user.role
                        expiresAt = $exp
                        createdAt = (Get-Date).ToUniversalTime().ToString("o")
                    }
                    if (-not $db.sessions) { $db.sessions = @() }
                    $db.sessions += $newSession
                    Save-DB $db

                    Send-JSON $res @{
                        token = $token
                        user = @{ id = $user.id; name = $user.name; email = $user.email; role = $user.role }
                        expiresAt = $exp
                    }
                } else {
                    Send-Error $res "Invalid username or password" 401
                }
                continue
            }

            # --- AUTH: Verify Session ---
            if ($path -eq "/api/auth/check" -and $method -eq "GET") {
                $session = Validate-Auth $req $db
                if ($session) {
                    $user = $db.users | Where-Object { $_.id -eq $session.userId }
                    Send-JSON $res @{ authenticated = $true; user = @{ name = $user.name; role = $user.role; email = $user.email } }
                } else {
                    Send-JSON $res @{ authenticated = $false } 200
                }
                continue
            }

            # --- AUTH: Logout ---
            if ($path -eq "/api/auth/logout" -and $method -eq "POST") {
                $session = Validate-Auth $req $db
                if ($session) {
                    $db.sessions = @($db.sessions | Where-Object { $_.token -ne $session.token })
                    Save-DB $db
                }
                Send-JSON $res @{ ok = $true }
                continue
            }

            # --- AUTH: Change Password ---
            if ($path -eq "/api/auth/change-password" -and $method -eq "POST") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }

                $oldPass = $body.oldPassword
                $newPass = $body.newPassword
                if (-not $newPass -or $newPass.Length -lt 8) {
                    Send-Error $res "New password must be at least 8 characters" 400
                    continue
                }

                $user = $db.users | Where-Object { $_.id -eq $session.userId }
                $checkOld = [CryptoHelper]::HashPassword($oldPass, $user.salt)
                if ($checkOld -ne $user.passwordHash) {
                    Send-Error $res "Current password incorrect" 400
                    continue
                }

                $newSalt = [CryptoHelper]::GenerateSalt()
                $newHash = [CryptoHelper]::HashPassword($newPass, $newSalt)
                $user.salt = $newSalt
                $user.passwordHash = $newHash
                Save-DB $db
                Send-JSON $res @{ ok = $true; message = "Password updated successfully" }
                continue
            }

            # --- POSTS: GET ---
            if ($path -eq "/api/posts" -and $method -eq "GET") {
                $session = Validate-Auth $req $db
                if ($session) {
                    Send-JSON $res $db.posts
                } else {
                    $pub = @($db.posts | Where-Object { $_.status -eq "published" })
                    Send-JSON $res $pub
                }
                continue
            }

            # --- POSTS: Single GET ---
            if ($path -match "^/api/posts/([a-zA-Z0-9_-]+)$" -and $method -eq "GET") {
                $idOrSlug = $matches[1]
                $post = $db.posts | Where-Object { $_.id -eq $idOrSlug -or $_.slug -eq $idOrSlug }
                if ($post) {
                    Send-JSON $res $post
                } else {
                    Send-Error $res "Post not found" 404
                }
                continue
            }

            # --- POSTS: Create (AUTH REQUIRED) ---
            if ($path -eq "/api/posts" -and $method -eq "POST") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }

                $newPost = @{
                    id = "post_" + [Guid]::NewGuid().ToString("N").Substring(0, 10)
                    title = $body.title
                    subtitle = $body.subtitle
                    slug = if ($body.slug) { $body.slug.ToLower().Replace(" ", "-") } else { $body.title.ToLower().Replace(" ", "-") }
                    excerpt = $body.excerpt
                    content = $body.content
                    category = if ($body.category) { $body.category } else { "1% Daily Growth" }
                    tags = if ($body.tags) { @($body.tags) } else { @() }
                    status = if ($body.status) { $body.status } else { "published" }
                    featuredImage = $body.featuredImage
                    seoTitle = $body.seoTitle
                    seoDescription = $body.seoDescription
                    canonical = "https://sankarkaranam.com/journal/" + $body.slug + ".html"
                    publishedAt = (Get-Date).ToUniversalTime().ToString("o")
                    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
                    createdAt = (Get-Date).ToUniversalTime().ToString("o")
                    readTime = if ($body.readTime) { $body.readTime } else { "5 min read" }
                    claps = 0
                    views = 0
                    revisions = @()
                }

                if (-not $db.posts) { $db.posts = @() }
                $db.posts = @($newPost) + $db.posts
                Save-DB $db

                if ($newPost.status -eq "published") {
                    Generate-Static-Article $newPost $db
                    Regenerate-Sitemap-And-RSS $db
                }

                Send-JSON $res $newPost 201
                continue
            }

            # --- POSTS: Update (AUTH REQUIRED) ---
            if ($path -match "^/api/posts/([a-zA-Z0-9_-]+)$" -and $method -eq "PUT") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }

                $id = $matches[1]
                $post = $db.posts | Where-Object { $_.id -eq $id }
                if (-not $post) { Send-Error $res "Post not found" 404; continue }

                # Save Revision Snapshot
                if (-not $post.revisions) { $post.revisions = @() }
                $post.revisions = @(@{ savedAt = (Get-Date).ToString("o"); content = $post.content; title = $post.title }) + $post.revisions
                if ($post.revisions.Count -gt 5) { $post.revisions = $post.revisions[0..4] }

                $post.title = $body.title
                $post.subtitle = $body.subtitle
                if ($body.slug) { $post.slug = $body.slug.ToLower().Replace(" ", "-") }
                $post.excerpt = $body.excerpt
                $post.content = $body.content
                if ($body.category) { $post.category = $body.category }
                if ($body.status) { $post.status = $body.status }
                if ($body.featuredImage) { $post.featuredImage = $body.featuredImage }
                if ($body.readTime) { $post.readTime = $body.readTime }
                $post.updatedAt = (Get-Date).ToUniversalTime().ToString("o")

                Save-DB $db

                if ($post.status -eq "published") {
                    Generate-Static-Article $post $db
                    Regenerate-Sitemap-And-RSS $db
                }

                Send-JSON $res $post
                continue
            }

            # --- POSTS: Delete (AUTH REQUIRED) ---
            if ($path -match "^/api/posts/([a-zA-Z0-9_-]+)$" -and $method -eq "DELETE") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }

                $id = $matches[1]
                $target = $db.posts | Where-Object { $_.id -eq $id }
                if ($target) {
                    $slugFile = Join-Path $journalDir "$($target.slug).html"
                    if (Test-Path $slugFile) { Remove-Item $slugFile -Force }
                }

                $db.posts = @($db.posts | Where-Object { $_.id -ne $id })
                Save-DB $db
                Regenerate-Sitemap-And-RSS $db
                Send-JSON $res @{ ok = $true; message = "Post deleted" }
                continue
            }

            # --- POSTS: Engagement (Claps & Views) ---
            if ($path -match "^/api/posts/([a-zA-Z0-9_-]+)/clap$" -and $method -eq "POST") {
                $id = $matches[1]
                $post = $db.posts | Where-Object { $_.id -eq $id -or $_.slug -eq $id }
                if ($post) {
                    $post.claps = [int]$post.claps + 1
                    Save-DB $db
                    Send-JSON $res @{ claps = $post.claps }
                } else {
                    Send-Error $res "Post not found" 404
                }
                continue
            }

            # --- VENTURES: GET / POST / PUT / DELETE ---
            if ($path -eq "/api/ventures" -and $method -eq "GET") {
                Send-JSON $res $db.ventures
                continue
            }
            if ($path -eq "/api/ventures" -and $method -eq "POST") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }

                $newV = @{
                    id = "v_" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
                    name = $body.name
                    tagline = $body.tagline
                    role = $body.role
                    category = $body.category
                    description = $body.description
                    status = if ($body.status) { $body.status } else { "active" }
                    url = $body.url
                    logo = $body.logo
                    emoji = if ($body.emoji) { $body.emoji } else { "🏢" }
                    order = ($db.ventures.Count)
                    createdAt = (Get-Date).ToUniversalTime().ToString("o")
                }
                if (-not $db.ventures) { $db.ventures = @() }
                $db.ventures += $newV
                Save-DB $db
                Send-JSON $res $newV 201
                continue
            }
            if ($path -match "^/api/ventures/([a-zA-Z0-9_-]+)$" -and $method -eq "DELETE") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                $id = $matches[1]
                $db.ventures = @($db.ventures | Where-Object { $_.id -ne $id })
                Save-DB $db
                Send-JSON $res @{ ok = $true }
                continue
            }

            # --- JOURNEY: GET / POST / DELETE ---
            if ($path -eq "/api/journey" -and $method -eq "GET") {
                Send-JSON $res $db.journey
                continue
            }
            if ($path -eq "/api/journey" -and $method -eq "POST") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                $newJ = @{
                    id = "j_" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
                    year = $body.year
                    title = $body.title
                    company = $body.company
                    category = $body.category
                    description = $body.description
                    link = $body.link
                    order = ($db.journey.Count)
                    createdAt = (Get-Date).ToUniversalTime().ToString("o")
                }
                if (-not $db.journey) { $db.journey = @() }
                $db.journey += $newJ
                Save-DB $db
                Send-JSON $res $newJ 201
                continue
            }
            if ($path -match "^/api/journey/([a-zA-Z0-9_-]+)$" -and $method -eq "DELETE") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                $id = $matches[1]
                $db.journey = @($db.journey | Where-Object { $_.id -ne $id })
                Save-DB $db
                Send-JSON $res @{ ok = $true }
                continue
            }

            # --- PROJECTS: GET / POST / DELETE ---
            if ($path -eq "/api/projects" -and $method -eq "GET") {
                Send-JSON $res $db.projects
                continue
            }

            # --- CONTACT: Public Submission Ingestion ---
            if ($path -eq "/api/contact" -and $method -eq "POST") {
                $name = if ($body.name) { $body.name.ToString().Trim() } else { "" }
                $email = if ($body.email) { $body.email.ToString().Trim() } else { "" }
                $reason = if ($body.reason) { $body.reason.ToString().Trim() } else { "General" }
                $message = if ($body.message) { $body.message.ToString().Trim() } else { "" }
                $company = if ($body.company) { $body.company.ToString().Trim() } else { "" }

                if (-not $name -or -not $email -or -not $message) {
                    Send-Error $res "Name, email, and message are required" 400
                    continue
                }
                if ($email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
                    Send-Error $res "Invalid email address format" 400
                    continue
                }

                $newContact = @{
                    id = "msg_" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
                    name = $name
                    email = $email
                    company = $company
                    reason = $reason
                    message = $message
                    ip = $req.RemoteEndPoint.Address.ToString()
                    read = $false
                    submittedAt = (Get-Date).ToUniversalTime().ToString("o")
                }
                if (-not $db.contacts) { $db.contacts = @() }
                $db.contacts = @($newContact) + $db.contacts
                Save-DB $db
                Send-JSON $res @{ ok = $true; message = "Inquiry recorded successfully" } 201
                continue
            }

            # --- CONTACTS: Admin Inbox (AUTH REQUIRED) ---
            if ($path -eq "/api/contacts" -and $method -eq "GET") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                Send-JSON $res $db.contacts
                continue
            }
            if ($path -match "^/api/contacts/([a-zA-Z0-9_-]+)/read$" -and $method -eq "PUT") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                $id = $matches[1]
                $msg = $db.contacts | Where-Object { $_.id -eq $id }
                if ($msg) { $msg.read = $true; Save-DB $db }
                Send-JSON $res @{ ok = $true }
                continue
            }
            if ($path -match "^/api/contacts/([a-zA-Z0-9_-]+)$" -and $method -eq "DELETE") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                $id = $matches[1]
                $db.contacts = @($db.contacts | Where-Object { $_.id -ne $id })
                Save-DB $db
                Send-JSON $res @{ ok = $true }
                continue
            }

            # --- NEWSLETTER: Public Subscription ---
            if ($path -eq "/api/newsletter" -and $method -eq "POST") {
                $email = if ($body.email) { $body.email.ToString().Trim().ToLower() } else { "" }
                $name = if ($body.name) { $body.name.ToString().Trim() } else { "" }
                $source = if ($body.source) { $body.source.ToString().Trim() } else { "website" }

                if (-not $email -or $email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
                    Send-Error $res "Valid email required" 400
                    continue
                }

                if (-not $db.subscribers) { $db.subscribers = @() }
                $exists = $db.subscribers | Where-Object { $_.email.ToLower() -eq $email }
                if ($exists) {
                    Send-JSON $res @{ ok = $false; reason = "already_subscribed" } 200
                    continue
                }

                $newSub = @{
                    id = "sub_" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
                    email = $email
                    name = $name
                    source = $source
                    active = $true
                    subscribedAt = (Get-Date).ToUniversalTime().ToString("o")
                }
                $db.subscribers += $newSub
                Save-DB $db
                Send-JSON $res @{ ok = $true; message = "Subscribed successfully" } 201
                continue
            }

            # --- NEWSLETTER: Admin List & CSV (AUTH REQUIRED) ---
            if ($path -eq "/api/newsletter" -and $method -eq "GET") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                Send-JSON $res $db.subscribers
                continue
            }
            if ($path -eq "/api/newsletter/export" -and $method -eq "GET") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                
                $csv = '"Email","Name","Source","SubscribedAt","Active"' + "`n"
                foreach ($s in $db.subscribers) {
                    $e = $s.email.Replace('"', '""')
                    $n = if ($s.name) { $s.name.Replace('"', '""') } else { "" }
                    $src = $s.source.Replace('"', '""')
                    $csv += "`"$e`",`"$n`",`"$src`",`"$($s.subscribedAt)`",`"$($s.active)`"`n"
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($csv)
                $res.StatusCode = 200
                $res.ContentType = "text/csv; charset=utf-8"
                $res.Headers.Add("Content-Disposition", "attachment; filename=subscribers.csv")
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.OutputStream.Close()
                continue
            }

            # --- SETTINGS: GET (Public) & PUT (AUTH REQUIRED) ---
            if ($path -eq "/api/settings" -and $method -eq "GET") {
                Send-JSON $res $db.settings
                continue
            }
            if ($path -eq "/api/settings" -and $method -eq "PUT") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }

                foreach ($prop in $body.psobject.Properties) {
                    $db.settings[$prop.Name] = $prop.Value
                }
                Save-DB $db
                Send-JSON $res $db.settings
                continue
            }

            # --- ANALYTICS: Track (Public) & View (AUTH REQUIRED) ---
            if ($path -eq "/api/analytics/view" -and $method -eq "POST") {
                $route = if ($body.path) { $body.path.ToString() } else { "/" }
                if (-not $db.analytics.pageViews) { $db.analytics.pageViews = @{} }
                $cur = [int]$db.analytics.pageViews[$route]
                $db.analytics.pageViews[$route] = $cur + 1
                Save-DB $db
                Send-JSON $res @{ ok = $true }
                continue
            }
            if ($path -eq "/api/analytics" -and $method -eq "GET") {
                $session = Validate-Auth $req $db
                if (-not $session) { Send-Error $res "Unauthorized" 401; continue }
                Send-JSON $res $db.analytics
                continue
            }

            # Unknown API Route
            Send-Error $res "API endpoint not found" 404
            continue
        }

        # ------------------------------------------------------------
        # STATIC FILE SERVING
        # ------------------------------------------------------------
        $relPath = $path.TrimStart("/").Replace("/", "\")
        if (-not $relPath -or $relPath -eq "") {
            $relPath = "index.html"
        }
        $filePath = Join-Path $baseDir $relPath

        if (Test-Path $filePath -PathType Container) {
            $filePath = Join-Path $filePath "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            $res.StatusCode = 200
            $res.ContentType = $mime
            $res.ContentLength64 = $bytes.Length
            $res.Headers.Add("Cache-Control", "no-cache")
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.OutputStream.Close()
        } else {
            # 404 Handling
            $notFoundPath = Join-Path $baseDir "404.html"
            if (Test-Path $notFoundPath) {
                $bytes = [System.IO.File]::ReadAllBytes($notFoundPath)
                $res.StatusCode = 404
                $res.ContentType = "text/html; charset=utf-8"
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.OutputStream.Close()
            } else {
                $res.StatusCode = 404
                $res.OutputStream.Close()
            }
        }
    } catch {
        # Log error quietly and continue loop
    }
}
