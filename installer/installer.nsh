; Extra NSIS steps for electron-builder.

!macro customUnInstall
  ; Remove the "Start with Windows" entry – but not during an update, where the
  ; old version is uninstalled first and the new one re-registers on launch.
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.timesheetdog.app"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "com.timesheetdog.app"
  ${endIf}
!macroend
