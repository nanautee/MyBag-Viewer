$Host.UI.RawUI.WindowTitle = "MBV"
$c = "green"

Write-Host ""
Write-Host "                    .       .       ." -ForegroundColor $c
Write-Host "              .  '     . '     . '     .  " -ForegroundColor $c
Write-Host "           '    .    '    .    '    .    '" -ForegroundColor $c
Write-Host "         .       ╲  . ╲  . ╱  . ╱       ." -ForegroundColor $c
Write-Host "        '    .    ╲  . ╲╱ . ╱  .    .   '" -ForegroundColor $c
Write-Host "       .     .     ╲   ||   ╱     .     ." -ForegroundColor $c
Write-Host "      '    ╱ █╲  .  ╲  ||  ╱  .  ╱█ ╲    '" -ForegroundColor $c
Write-Host "      .   ╱ ███╲ ╲╲  ╲||╱  ╱╱ ╱███ ╲   ." -ForegroundColor $c
Write-Host "      '  ╱ █ █ █╲ ╲╲  ╲||╱  ╱╱ ╱█ █ █╲  '" -ForegroundColor $c
Write-Host "       ╱  █ █ █ █╲ ╲╲ ╲||╱ ╱╱ ╱█ █ █ █╲ " -ForegroundColor $c
Write-Host "       ╲  █ █ █ █╱ ╱╱ ╱||╲ ╲╲ ╲█ █ █ █╱ " -ForegroundColor $c
Write-Host "      '  ╲ █ █ █╱ ╱╱ ╱||╲  ╲╲ ╲█ █ █╱  '" -ForegroundColor $c
Write-Host "      .   ╲ ███╱ ╱╱ ╱ || ╲ ╲╲ ╲███ ╱   ." -ForegroundColor $c
Write-Host "      '    ╲ █╱ ╱╱ ╱  ||  ╲ ╲╲ ╲█╱    '" -ForegroundColor $c
Write-Host "       .     ╲ ╱╱  ╱ . || . ╲  ╲╱     ." -ForegroundColor $c
Write-Host "        '    ╱╲ ╱ ╱  . || .  ╲ ╱╲    '" -ForegroundColor $c
Write-Host "         .  '  ╳  ' .  ||  . '  ╳  '  ." -ForegroundColor $c
Write-Host "           '  . ╱╲ . ' || ' . ╱╲ .  '" -ForegroundColor $c
Write-Host "              '  ╱  '   ||   '  ╲  '" -ForegroundColor $c
Write-Host "                  '  .  ||  .  '" -ForegroundColor $c
Write-Host ""

$lines = @(
    " ███╗   ███╗ ██╗   ██╗",
    " ████╗ ████║ ██║   ██║",
    " ██╔████╔██║ ██║   ██║",
    " ██║╚██╔╝██║ ██║   ██║",
    " ██║ ╚═╝ ██║ ╚██████╔╝",
    " ╚═╝     ╚═╝  ╚═════╝ "
)

$w = 50
$circ = @(
    "         ..::::::::::::::::::::..         ",
    "      .:::::''              '':::::.      ",
    "    .:::'                      '::.    ",
    "   .::'                          '::.   ",
    "  .::'    ╔════════════════════╗   '::.  ",
    " .:'      ║                    ║     ':. ",
    " '::      ║                    ║     :' ",
    " .:'      ║                    ║     ':. ",
    "  '::.    ╚════════════════════╝   .::'  ",
    "   '::.                          .::'   ",
    "    '::.                      .::'    ",
    "      '::::::.          .::::::'      ",
    "         ''::::::::::::::::::::''         "
)

$banner = @(
    "",
    "  ░██████╗██╗  ██╗ ██████╗",
    "  ██╔════╝██║  ██║██╔════╝",
    "  ╚█████╗ ███████║██║     ",
    "  ╚═══██║ ██╔══██║██║     ",
    "  ██████║ ██║  ██║╚██████╗",
    "  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝",
    "",
    "     [ WALLET ANALYZER v3.0 ]",
    "     mybag-viewer.vercel.app",
    ""
)

foreach ($line in $banner) {
    Write-Host $line -ForegroundColor $c
}
Write-Host ""
