@echo off
chcp 65001 >nul
title Fuar Cicekcim - yerel sunucu
cd /d "%~dp0"
echo Site su adreste acilacak: http://localhost:8000
echo Kapatmak icin bu pencereyi kapatin.
echo.
start "" http://localhost:8000
where php >nul 2>nul && (php -S localhost:8000 && goto :eof)
where python >nul 2>nul && (python -m http.server 8000 && goto :eof)
where py >nul 2>nul && (py -m http.server 8000 && goto :eof)
where node >nul 2>nul && (npx --yes serve -l 8000 . && goto :eof)
echo.
echo HATA: Bilgisayarda Python, PHP veya Node bulunamadi.
echo Cozum: Microsoft Storedan "Python 3.12" kurun (ucretsiz, 1 dk), sonra bu dosyayi tekrar calistirin.
pause
