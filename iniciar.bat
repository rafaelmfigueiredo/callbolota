@echo off
title Callbolometro - Calculadora de Calorias
cd /d "%~dp0"
echo.
echo  ============================================
echo   Callbolometro - Calculadora de Calorias
echo  ============================================
echo.
echo  Iniciando o servidor local...
echo  (Fica tudo no seu computador, sem custo nenhum.)
echo.

where py >nul 2>&1
if %errorlevel%==0 (
	start "Callbolometro servidor" /min py server.py
) else (
	where python >nul 2>&1
	if %errorlevel%==0 (
		start "Callbolometro servidor" /min python server.py
	) else (
		echo Python nao foi encontrado neste computador.
		echo Abrindo o arquivo diretamente como alternativa...
		start "" "%~dp0index.html"
		pause
		exit /b
	)
)

ping 127.0.0.1 -n 3 >nul
start "" "http://127.0.0.1:8000/index.html"
echo  Sistema aberto em http://127.0.0.1:8000
echo  Deixe esta janela aberta enquanto usar o sistema.
echo.
pause