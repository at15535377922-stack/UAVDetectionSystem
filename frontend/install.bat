@echo off
call npm --version > install_log.txt 2>&1
call node --version >> install_log.txt 2>&1
call npm install >> install_log.txt 2>&1
if exist node_modules (
    echo SUCCESS >> install_log.txt
) else (
    echo FAILED >> install_log.txt
)
