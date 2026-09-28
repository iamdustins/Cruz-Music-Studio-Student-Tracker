# Cruz Music Studio - Local Preview Server
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Cruz Music Studio - Student Attendance Tracker Preview  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting local preview on http://localhost:8080..." -ForegroundColor Green
Write-Host ""
Write-Host "Demo PINs for testing:" -ForegroundColor White
Write-Host "  • Family PIN (2 Siblings):  4421" -ForegroundColor Cyan
Write-Host "  • Instructor PIN (Sarah):   1102" -ForegroundColor Cyan
Write-Host "  • Studio Admin PIN:         9900" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl + C to stop the preview server." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:8080"
python -m http.server 8080 -d frontend
