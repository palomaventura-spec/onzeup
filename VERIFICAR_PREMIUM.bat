@echo off
echo === PREMIUM v1.2.8 CHECK ===
findstr /C:"1.2.8" package.json
findstr /C:"premium-athlete-site" src\app\[slug]\page.tsx
findstr /C:"premium-media-grid" src\app\globals.css
pause
