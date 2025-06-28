# 🎥 DroidCam QR Scanner Troubleshooting Guide

## Problem: Scanner turns solid green and gets stuck

### ✅ **Quick Fixes Applied:**

1. **Virtual Camera Detection**: System now automatically detects DroidCam and applies optimized settings
2. **Reset Buttons**: Manual controls to unstick the scanner
3. **Slower Scan Rate**: Reduced from 5 to 2 scans per second for virtual cameras
4. **Longer Cooldown**: 3-second cooldown instead of 1 second to prevent rapid re-scanning
5. **Debug Mode**: Manual toggle to force virtual camera optimizations

---

## 🔧 **Testing Steps:**

### Step 1: Check Virtual Camera Detection

1. Open any scanner page (attendance, food, games, bus)
2. Click "Start Camera"
3. Look for **purple notification box** saying "Virtual Camera Detected"
4. Check browser console (F12) for camera device logs

### Step 2: If Virtual Camera NOT Detected

1. Look for **gray "Debug Options"** box
2. Click **"Enable Virtual Camera Mode"** button
3. This forces the optimized DroidCam settings

### Step 3: If Scanner Gets Stuck Green

1. Click **"Reset Scanner"** button in purple box
2. If that doesn't work, click **"Force Refresh"** button
3. This completely restarts the scanning process

### Step 4: Check Browser Console

1. Press F12 to open browser developer tools
2. Go to "Console" tab
3. Look for these debug messages:
   - `📹 All video devices:` - Shows detected cameras
   - `🎥 Virtual camera detected:` - Confirms DroidCam detection
   - `🚀 QR Scanner initialized with settings:` - Shows applied settings
   - `🔍 QR scan result received:` - Shows when QR codes are detected

---

## 🎯 **DroidCam-Specific Settings:**

When virtual camera is detected, the system automatically applies:

- **Resolution**: 1280x720 (instead of 1920x1080)
- **Scan Rate**: 2 per second (instead of 5)
- **Cooldown**: 3 seconds (instead of 1)
- **Pause Time**: 2 seconds (instead of 0.5)
- **Focus/Exposure**: Disabled (avoids virtual camera conflicts)

---

## 📱 **DroidCam Setup Tips:**

### On Your Phone:

1. **Good Lighting**: Ensure bright, even lighting
2. **Steady Position**: Use a phone stand or prop
3. **Clean Camera**: Wipe phone camera lens
4. **Focus**: Tap to focus on QR code area
5. **Distance**: 6-12 inches from QR code

### On Your Computer:

1. **Stable Connection**: Use USB cable instead of WiFi if possible
2. **Close Other Apps**: Close other camera apps
3. **DroidCam Quality**: Set to highest quality in DroidCam settings
4. **Browser**: Use Chrome or Edge for best compatibility

---

## 🔍 **Debug Information:**

### Test Pages Available:

- **Main System**: `http://localhost:3000/admin/register` (or any scanner page)
- **Camera Test**: `http://localhost:3000/test-droidcam.html` (basic camera test)

### Console Commands:

```javascript
// Check available cameras
navigator.mediaDevices.enumerateDevices().then((devices) => {
  console.log(
    "Cameras:",
    devices.filter((d) => d.kind === "videoinput")
  );
});

// Test camera access
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  console.log(
    "Camera access successful:",
    stream.getVideoTracks()[0].getSettings()
  );
});
```

---

## ❌ **Common Issues & Solutions:**

### Issue: "No virtual camera detected"

**Solution**: Click "Enable Virtual Camera Mode" button manually

### Issue: Scanner stays solid green

**Solution**: Click "Reset Scanner" then "Force Refresh"

### Issue: QR codes not being detected

**Solutions**:

1. Ensure QR code fills 60% of green frame
2. Use bright, even lighting
3. Hold steady for 2-3 seconds
4. Try manual input as backup

### Issue: Camera not starting

**Solutions**:

1. Check browser permissions (camera icon in address bar)
2. Close other apps using camera
3. Restart DroidCam app
4. Try different browser

---

## 🚀 **Testing Checklist:**

- [ ] Virtual camera detection working
- [ ] Purple notification appears for DroidCam
- [ ] Reset buttons visible and functional
- [ ] Console shows debug messages
- [ ] QR scanning works without getting stuck
- [ ] Manual toggle works if auto-detection fails

---

## 📞 **If Still Not Working:**

1. **Check Console**: Look for error messages in browser console (F12)
2. **Try Test Page**: Use `http://localhost:3000/test-droidcam.html`
3. **Manual Input**: Use "Manual Input" button as backup
4. **File Upload**: Use "Upload QR Image" for better quality photos

The system should now handle DroidCam much better with these optimizations! 🎯
