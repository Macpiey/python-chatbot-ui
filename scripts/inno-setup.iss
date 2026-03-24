#define MyAppName "Commodities AI"
#define MyAppVersion "1.0.0"
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
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
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
DisableDirPage=no
DisableProgramGroupPage=no
LicenseFile=..\src\setup\license.txt
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

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
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Custom setup code can be added here

// Show a custom page with privacy policy
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
  LoadStringFromFile(ExpandConstant('{src}\..\src\setup\privacy.txt'), PrivacyPolicyText);
  PrivacyPolicyPage.RichEditViewer.RTFText := PrivacyPolicyText;
end;

// Add custom welcome message
function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := 'Welcome to the ' + '{#MyAppName}' + ' Setup Wizard!' + NewLine + NewLine;
  Result := Result + 'This will install ' + '{#MyAppName}' + ' version ' + '{#MyAppVersion}' + ' on your computer.' + NewLine + NewLine;
  Result := Result + MemoDirInfo + NewLine;
  Result := Result + MemoGroupInfo + NewLine;

  if MemoTasksInfo <> '' then
    Result := Result + NewLine + MemoTasksInfo + NewLine;
end;
