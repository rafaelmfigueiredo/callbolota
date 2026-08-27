@echo off
title Callbolometro - Calculadora de Calorias
cd /d "%~dp0"
echo.
echo  ============================================
echo   Callbolometro - Calculadora de Calorias
echo  ============================================
echo.
echo  Iniciando o sistema no navegador...
echo  (Fica tudo no seu computador, sem custo nenhum.)
echo.
start "" "%~dp0index.html"
echo  Pronto! Se o navegador nao abrir sozinho, abra o arquivo:
echo  %~dp0index.html
echo.
pause