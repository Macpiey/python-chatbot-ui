#define MyAppName "Commodities AI"
; Version is passed via /DMyAppVersion=x.x.x from the build script
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#define MyAppPublisher "Kalya Labs"
#define MyAppURL "https://kalyalabs.com"
#define MyAppExeName "Commodities AI.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
AppId={{B2E9F741-6A4C-4D29-9C8E-7F5A2B3D8C91}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; ===== Per-user install (no admin / no UAC prompt) =====
; Install to %LOCALAPPDATA%\Commodities AI  (like Discord, Slack, VS Code)
DefaultDirName={localappdata}\{#MyAppName}
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=

; Start menu in user's own start menu (not all users)
DefaultGroupName={#MyAppName}

; Don't let the user change install directory in interactive mode
; (keeps it consistent for auto-updates)
DisableDirPage=yes
DisableProgramGroupPage=yes

OutputBaseFilename=Commodities_AI_Setup
OutputDir=..\out\windows-installer
SetupIconFile=..\assets\icon.ico

; Enhanced compression settings for maximum size reduction
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
LZMADictionarySize=1048576
LZMANumFastBytes=273

WizardStyle=modern
; Using the generated bitmap images
WizardImageFile=..\assets\setup\wizard-image.bmp
WizardSmallImageFile=..\assets\setup\icon.bmp
DisableWelcomePage=no
LicenseFile=..\src\setup\license.txt
ArchitecturesInstallIn64BitMode=x64

; Allow the installer to close and restart the app during silent updates
CloseApplications=force
RestartApplications=yes
; Register the app so Inno can detect it's running
AppMutex=CommoditiesAI_SingleInstance

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Main application files
Source: "..\out\Commodities AI-win32-x64\Commodities AI.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\*.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\*.pak"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\*.dat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\*.bin"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\version"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\LICENSE*"; DestDir: "{app}"; Flags: ignoreversion

; Resources directory
Source: "..\out\Commodities AI-win32-x64\resources\*"; DestDir: "{app}\resources"; Flags: ignoreversion recursesubdirs createallsubdirs

; Only include English locale to save space (reduces ~50MB)
Source: "..\out\Commodities AI-win32-x64\locales\en-US.pak"; DestDir: "{app}\locales"; Flags: ignoreversion
Source: "..\out\Commodities AI-win32-x64\locales\en-GB.pak"; DestDir: "{app}\locales"; Flags: ignoreversion

[Icons]
; User-scope start menu and desktop shortcuts (no admin needed)
Name: "{userprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{userprograms}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Launch app after interactive install (when user clicks Finish)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
; ALWAYS launch app after silent/verysilent install (auto-update relaunch)
Filename: "{app}\{#MyAppExeName}"; Flags: nowait skipifdontexist; Check: IsSilentInstall

[Code]
// Check if running in silent mode (for auto-update relaunch)
function IsSilentInstall: Boolean;
begin
  Result := WizardSilent();
end;

// Show a custom page with privacy policy (only in interactive mode)
var
  PrivacyPolicyPage: TOutputMsgMemoWizardPage;

procedure InitializeWizard;
var
  PrivacyPolicyText: AnsiString;
begin
  // Create privacy policy page
  PrivacyPolicyPage := CreateOutputMsgMemoPage(wpLicense,
    'Privacy Policy',
    'Please review our privacy policy',
    'Please read the following privacy policy carefully and click Next to continue:',
    '');

  // Load privacy policy text from file
  if FileExists(ExpandConstant('{src}\..\src\setup\privacy.txt')) then
  begin
    LoadStringFromFile(ExpandConstant('{src}\..\src\setup\privacy.txt'), PrivacyPolicyText);
    PrivacyPolicyPage.RichEditViewer.RTFText := PrivacyPolicyText;
  end;
end;

// Add custom welcome message
function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := 'Welcome to the ' + '{#MyAppName}' + ' Setup Wizard!' + NewLine + NewLine;
  Result := Result + 'This will install ' + '{#MyAppName}' + ' version ' + '{#MyAppVersion}' + ' on your computer.' + NewLine + NewLine;
  Result := Result + MemoDirInfo + NewLine;

  if MemoTasksInfo <> '' then
    Result := Result + NewLine + MemoTasksInfo + NewLine;
end;
