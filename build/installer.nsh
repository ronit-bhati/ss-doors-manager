!macro customCheckAppRunning
  ; Wine can misreport the generated process check as still running after the
  ; installer has already tried to close the app. Let installation continue.
  DetailPrint "Skipping running app check for Wine-compatible install."
!macroend
