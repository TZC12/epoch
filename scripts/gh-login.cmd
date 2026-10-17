@echo off
rem GitHub 授权（设备码）。用一次即可，之后 npm run deploy 自动取 gh 的登录态，不用再碰令牌字符串。
if not defined HTTPS_PROXY set HTTPS_PROXY=http://127.0.0.1:7897
if not defined HTTP_PROXY set HTTP_PROXY=http://127.0.0.1:7897
if not defined NO_PROXY set NO_PROXY=localhost,127.0.0.1
if not defined GH_PATH set GH_PATH=C:\Users\24801\.qoder\tools\gh-dist\bin\gh.exe

echo 正在打开 GitHub 授权页面。窗口里会显示 one-time code（形如 XXXX-XXXX），
echo 把它填进浏览器并点 Authorize 即可。不要关闭本窗口。
echo.
"%GH_PATH%" auth login --hostname github.com --git-protocol https --web
echo.
echo 若上方出现 "Logged in to github.com as ..."，授权成功，关掉本窗口回对话说一声。
echo 若报连接超时，说明代理没开 —— 打开 Clash/加速器后重新双击本文件。
pause
