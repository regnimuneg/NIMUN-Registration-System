# Camera Access on Network IP - Updated for Next.js 15

## Problem
Modern browsers block camera access on non-HTTPS connections when accessing via network IP (like `192.168.1.4:3000`).

## Solutions (Updated for Next.js 15)

### 🚀 Solution 1: Use Next.js 15 HTTPS (Recommended)

1. **Stop current server** (Ctrl+C)

2. **Start HTTPS development server:**
   ```bash
   npm run dev:https-network
   ```

3. **Access via HTTPS:**
   ```
   https://192.168.1.4:3000/member/scanner
   ```

4. **Accept the self-signed certificate warning** (click "Advanced" → "Proceed to 192.168.1.4")

### 🌐 Solution 2: Chrome Insecure Origins (Quick Fix)

1. **Open Chrome and go to:**
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```

2. **Add your network IP:**
   ```
   http://192.168.1.4:3000
   ```

3. **Set to "Enabled"** and restart Chrome

4. **Access your scanner:**
   ```
   http://192.168.1.4:3000/member/scanner
   ```

### 📱 Solution 3: Use Localhost with Port Forwarding

1. **Keep the regular dev server:**
   ```bash
   npm run dev
   ```

2. **Access via localhost:**
   ```
   http://localhost:3000/member/scanner
   ```

3. **For other devices, use Chrome Remote Desktop or similar tools**

### 🔧 Solution 4: Use a Reverse Proxy (Advanced)

Create a simple HTTPS proxy using a tool like `local-ssl-proxy`:

1. **Install globally:**
   ```bash
   npm install -g local-ssl-proxy
   ```

2. **Start your regular dev server:**
   ```bash
   npm run dev:network
   ```

3. **Start SSL proxy in another terminal:**
   ```bash
   local-ssl-proxy --source 3001 --target 3000 --hostname 192.168.1.4
   ```

4. **Access via HTTPS:**
   ```
   https://192.168.1.4:3001/member/scanner
   ```

## 🚀 Quick Start (Recommended)

```bash
# Try HTTPS first (Next.js 15)
npm run dev:https-network

# If that doesn't work, use Chrome flags method:
# 1. Go to chrome://flags/#unsafely-treat-insecure-origin-as-secure
# 2. Add: http://192.168.1.4:3000
# 3. Restart Chrome
# 4. Use: npm run dev:network
```

## 📱 Mobile Testing Tips

- **For iOS Safari:** Use the HTTPS solution (Solution 1)
- **For Android Chrome:** Either HTTPS or Chrome flags work
- **Accept certificate warnings** - this is normal for development
- **Grant camera permissions** when prompted

## Notes

- HTTPS is required for camera access on non-localhost addresses
- Self-signed certificates will show warnings - this is normal for development
- The system now shows smart error messages if camera access fails
- For production, use a proper SSL certificate from a CA 