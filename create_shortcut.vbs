Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "C:\Users\Alan Serios\Downloads\SHORE Skwela 5.0.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)

oLink.TargetPath = "C:\Users\Alan Serios\Downloads\SHORE_Web_App\start.bat"
oLink.WorkingDirectory = "C:\Users\Alan Serios\Downloads\SHORE_Web_App"
oLink.Description = "SHORE 5.0 Report Generator"
oLink.IconLocation = "C:\Users\Alan Serios\Downloads\SHORE_Web_App\app_icon.ico"
oLink.Save

' Also create one on the Desktop
sDesktopLink = oWS.SpecialFolders("Desktop") & "\SHORE Skwela 5.0.lnk"
Set oLink2 = oWS.CreateShortcut(sDesktopLink)
oLink2.TargetPath = "C:\Users\Alan Serios\Downloads\SHORE_Web_App\start.bat"
oLink2.WorkingDirectory = "C:\Users\Alan Serios\Downloads\SHORE_Web_App"
oLink2.Description = "SHORE 5.0 Report Generator"
oLink2.IconLocation = "C:\Users\Alan Serios\Downloads\SHORE_Web_App\app_icon.ico"
oLink2.Save

WScript.Echo "Shortcut created successfully."
