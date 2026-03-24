# Link Commodities AI - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Technical Stack](#technical-stack)
5. [Project Structure](#project-structure)
6. [Core Components](#core-components)
7. [Services](#services)
8. [Data Flow](#data-flow)
9. [Key Functionalities](#key-functionalities)
10. [Build & Deployment](#build--deployment)
11. [Configuration](#configuration)

---

## Project Overview

**Link Commodities AI** is a desktop application built with Electron and React that provides an intelligent chatbot interface for analyzing commodity market data. The application enables users to interact with AI models to get insights, visualizations, and reports on various commodity markets, particularly focusing on coffee (Arabica and Robusta) price analysis and forecasting.

### Key Highlights
- **Desktop Application**: Cross-platform Electron app (Windows, macOS, Linux)
- **AI-Powered Chat**: Real-time streaming chat interface with AI models
- **Data Visualization**: Advanced charting capabilities with multi-axis support
- **Quick Reports**: Pre-configured analysis reports for common queries
- **Authentication**: Secure AWS Cognito-based authentication
- **Real-time Streaming**: Server-Sent Events (SSE) for live response streaming

---

## Features

### 1. **AI Chat Interface**
- **Streaming Responses**: Real-time streaming of AI responses using Server-Sent Events (SSE)
- **Multiple Conversations**: Support for multiple concurrent chat conversations
- **Message History**: Persistent conversation history with session management
- **Message Editing**: Edit and resend user messages to regenerate AI responses
- **Stop Generation**: Ability to stop AI response generation mid-stream
- **Thinking Indicator**: Visual indicator showing AI's thinking process with status messages and reasoning

### 2. **Data Visualization**
- **Multi-Axis Charts**: Support for complex multi-axis line charts with different scales
- **Chart Types**: Line charts, bar charts, and multi-axis visualizations
- **Interactive Charts**: Hover tooltips, zoom capabilities, and responsive design
- **Split View**: Side-by-side view of chat and charts for better analysis
- **Fullscreen Mode**: Fullscreen chart viewing for detailed analysis
- **Chart Export**: Copy chart data and configurations

### 3. **Quick Reports System**
- **Pre-configured Reports**: Access to 60+ pre-configured analysis reports
- **Model Categories**:
  - **SARIMAX**: Time series forecasting models
  - **Simple Linear Regression (SLR)**: Linear relationship analysis
  - **XGBOOST**: Gradient boosting machine learning models
- **Report Categories**:
  - Arabica Roaster Coverage (ICE Price analysis)
  - Robusta Roaster Coverage (LIFFE Price analysis)
  - GFS Arabica (Global Forecast System for Arabica)
  - GFS Robusta (Global Forecast System for Robusta)
  - ICO Price Models (International Coffee Organization)
- **Combined Forecast**: One-click access to combined forecast analysis

### 4. **Authentication & Security**
- **AWS Cognito Integration**: Secure user authentication
- **JWT Token Management**: Automatic token handling and refresh
- **Session Management**: Persistent login sessions
- **Role-Based Access**: Support for admin and user roles
- **Secure API Communication**: All API calls authenticated with Bearer tokens

### 5. **User Interface**
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Adapts to different screen sizes
- **Collapsible Sidebar**: Space-efficient conversation management
- **Typewriter Effect**: Smooth text animation for AI responses
- **Markdown Support**: Rich text formatting in messages
- **Copy to Clipboard**: Easy text selection and copying

### 6. **Advanced Features**
- **Clarification Messages**: AI can ask for clarification when queries are ambiguous
- **Suggestion Chips**: Quick action suggestions based on AI responses
- **Error Handling**: Graceful error handling with user-friendly messages
- **Connection Management**: Automatic reconnection and connection status indicators
- **Timeout Handling**: 15-minute timeout for long-running queries

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  BrowserWindow (1200x800)                              │  │
│  │  - Window Management                                   │  │
│  │  - DevTools (Development Only)                         │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Renderer Process (React)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  App Component (Main Entry Point)                      │  │
│  │  ├── LoginScreen                                       │  │
│  │  ├── Chat Interface                                    │  │
│  │  │   ├── Conversation List (Sidebar)                   │  │
│  │  │   ├── Message Display                               │  │
│  │  │   │   ├── User Messages                             │  │
│  │  │   │   ├── AI Messages                               │  │
│  │  │   │   │   ├── Text Messages                         │  │
│  │  │   │   │   ├── Chart Messages                       │  │
│  │  │   │   │   └── Structured Messages                   │  │
│  │  │   │   └── Thinking Indicator                        │  │
│  │  │   └── Input Area                                    │  │
│  │  │       ├── Text Input                                │  │
│  │  │       ├── Quick Reports Dropdown                    │  │
│  │  │       └── Combined Forecast Button                 │  │
│  │  └── Split View (Chart + Chat)                        │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Services Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  AuthService     │  │  ApiService       │                │
│  │  - Cognito Auth │  │  - Chat API       │                │
│  │  - JWT Tokens   │  │  - Quick Reports  │                │
│  │  - User State   │  │  - Auth Headers   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (AWS)                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Chat Stream API │  │  Quick Reports API│                │
│  │  (ELB)           │  │  (Lambda)         │                │
│  │  - SSE Streaming │  │  - Pre-made Reports│                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
App.jsx (Main Container)
├── LoginScreen (Authentication)
└── Chat Interface
    ├── Sidebar
    │   ├── ConversationList
    │   └── LogoutButton
    ├── ChatArea
    │   ├── MessagesContainer
    │   │   ├── UserMessage
    │   │   ├── EnhancedMessage (Text)
    │   │   ├── MarkdownStructuredMessage (Charts + Text)
    │   │   ├── ChartRenderer (Legacy Charts)
    │   │   ├── ClarificationMessage
    │   │   └── ThinkingIndicator
    │   └── InputContainer
    │       ├── TextInput
    │       ├── AIModelsDropdown (Quick Reports)
    │       ├── CombinedForecastButton
    │       └── SendButton
    └── SplitView (Optional)
        ├── Left: Chat Messages
        └── Right: Chart Visualization
```

---

## Technical Stack

### Frontend
- **React 19.1.0**: UI framework
- **Electron 36.1.0**: Desktop application framework
- **React Icons**: Icon library (Feather Icons)
- **React Markdown**: Markdown rendering with GitHub Flavored Markdown support
- **Recharts 2.15.4**: Charting library for data visualization
- **Chart.js 4.4.9**: Alternative charting library (legacy support)
- **AWS Amplify 6.0.18**: AWS services integration (Cognito)

### Build Tools
- **Webpack 5.99.7**: Module bundler
- **Babel**: JavaScript transpiler
- **Electron Forge 7.8.0**: Electron packaging and distribution
- **Cross-env**: Cross-platform environment variables

### Utilities
- **UUID**: Unique identifier generation
- **JWT Decode**: JWT token parsing
- **XLSX**: Excel file handling (for potential exports)

### Backend Integration
- **AWS Cognito**: User authentication
- **AWS ELB**: Load balancer for chat API
- **AWS Lambda**: Serverless functions for quick reports
- **Server-Sent Events (SSE)**: Real-time streaming protocol

---

## Project Structure

```
ai-chat-electron/
├── src/
│   ├── components/           # React components
│   │   ├── App.jsx           # Main application component
│   │   ├── LoginScreen.jsx   # Authentication screen
│   │   ├── AIModelsDropdown.jsx  # Quick reports dropdown
│   │   ├── MarkdownStructuredMessage.jsx  # Chart + text messages
│   │   ├── ChartRenderer.jsx      # Legacy chart renderer
│   │   ├── ThinkingIndicator.jsx  # AI thinking display
│   │   ├── UserMessage.jsx        # User message component
│   │   ├── EnhancedMessage.jsx    # Text message component
│   │   ├── ClarificationMessage.jsx  # Clarification prompts
│   │   ├── SuggestionChips.jsx    # Quick action suggestions
│   │   ├── FullscreenChartModal.jsx  # Fullscreen chart view
│   │   └── ... (other components)
│   ├── services/            # Business logic services
│   │   ├── authService.js    # Authentication service
│   │   └── apiService.js     # API communication service
│   ├── utils/               # Utility functions
│   │   └── quickReportsProcessor.js  # Quick reports processing
│   ├── config/              # Configuration files
│   │   └── environment.js   # Environment configuration
│   ├── setup/               # Setup/installer files
│   ├── index.js             # Electron main process
│   ├── preload.js           # Preload script (security bridge)
│   ├── renderer.js          # React entry point
│   ├── index.html           # HTML template
│   └── index.css            # Global styles
├── assets/                  # Application assets
│   ├── icon.ico             # Windows icon
│   ├── icon.icns            # macOS icon
│   └── setup/               # Installer assets
├── scripts/                 # Build scripts
│   ├── build-windows-installer.js
│   ├── build-mac-installer.js
│   └── ...
├── package.json             # Dependencies and scripts
├── webpack.config.js        # Webpack configuration
├── forge.config.js          # Electron Forge configuration
└── DOCUMENTATION.md         # This file
```

---

## Core Components

### 1. App.jsx
**Main application component** that orchestrates the entire application.

**Key Responsibilities:**
- Authentication state management
- Conversation management (create, switch, delete)
- Message handling (send, receive, edit)
- Streaming response processing
- Split view management
- Dark mode toggle
- API communication coordination

**State Management:**
- `conversations`: Array of conversation objects
- `currentConversation`: Active conversation ID
- `authState`: Authentication status
- `isTyping`: Typing indicator state
- `isSplitViewActive`: Split view state
- `darkMode`: Theme preference

### 2. LoginScreen.jsx
**Authentication interface** using AWS Cognito.

**Features:**
- Username/password login
- Password visibility toggle
- Error handling and display
- Loading states
- Auto-redirect on successful login

### 3. MarkdownStructuredMessage.jsx
**Advanced message component** for rendering charts and structured content.

**Capabilities:**
- JSON parsing and validation
- Chart rendering (Recharts)
- Multi-axis chart support
- Summary text rendering
- Split view integration
- Fullscreen chart modal
- Text selection and copying
- Typewriter animation

**Chart Types Supported:**
- Line charts
- Bar charts
- Multi-axis charts (left/right Y-axes)
- Dotted line styles
- Custom color schemes

### 4. AIModelsDropdown.jsx
**Quick reports selector** with hierarchical menu structure.

**Structure:**
```
Quick Reports
├── SARIMAX
│   ├── Arabica Roaster Coverage
│   ├── Robusta Roaster Coverage
│   ├── GFS Arabica
│   ├── GFS Robusta
│   └── ICO Price Model
├── Simple Linear Regression
│   └── (Same subcategories)
└── XGBOOST
    └── (Same subcategories)
```

**Features:**
- Three-level navigation (Category → Subcategory → Option)
- Loading states per option
- API integration for fetching reports
- Automatic chart rendering

### 5. ThinkingIndicator.jsx
**AI thinking process visualizer** (inspired by ChatGPT's thinking display).

**Features:**
- Status message display (replaces previous with animation)
- Accumulated thinking content (paragraphs)
- Collapsible/expandable interface
- Duration tracking
- Gradient animations
- Auto-expand on first content

### 6. ChartRenderer.jsx
**Legacy chart renderer** using Chart.js (for backward compatibility).

**Features:**
- Chart.js integration
- Rainfall comparison charts
- Time-series visualization
- Enhanced chart mode toggle

---

## Services

### 1. authService.js
**Authentication service** managing user sessions and tokens.

**Key Methods:**
- `initializeAuth()`: Check for existing session
- `handleSignIn()`: Process sign-in events
- `handleSignOut()`: Process sign-out events
- `getIdTokenFromLocalStorage()`: Retrieve JWT token
- `getUserEmail()`: Get current user email
- `getUserGroupsFromToken()`: Extract user roles
- `addListener()`: Subscribe to auth state changes

**State Management:**
- Singleton pattern
- Event-driven updates via AWS Amplify Hub
- JWT token caching in localStorage

### 2. apiService.js
**API communication service** for backend interactions.

**Key Methods:**
- `sendChatMessage()`: Send chat message with streaming
- `getReadyMadeLLMAnalysis()`: Fetch quick reports
- `getAuthHeaders()`: Generate authenticated headers
- `makeAuthenticatedRequest()`: Generic authenticated request handler
- `testConnection()`: Health check

**Features:**
- Automatic token injection
- Error handling (401 redirects to login)
- AbortController support for cancellation
- Environment-based URL configuration

### 3. quickReportsProcessor.js
**Utility functions** for processing quick reports API responses.

**Functions:**
- `processQuickReportsResponse()`: Parse API response
- `processChartData()`: Transform chart data
- `generateChartString()`: Generate chart configuration string
- `getAPIParameters()`: Map option IDs to API parameters
- `generateReportTitle()`: Generate user-friendly titles

**Parameter Mapping:**
- Maps 60+ report options to API parameters
- Handles different model types (SARIMAX, SLR, XGBOOST)
- Supports commodity-specific parameters (ARABICA, ROBUSTA)

---

## Data Flow

### 1. User Authentication Flow

```
User Input (LoginScreen)
    ↓
signIn() (AWS Amplify)
    ↓
AWS Cognito Authentication
    ↓
Hub Event: 'signedIn'
    ↓
authService.handleSignIn()
    ↓
JWT Token Extraction
    ↓
State Update (authState)
    ↓
App.jsx Re-render
    ↓
Show Chat Interface
```

### 2. Message Sending Flow

```
User Types Message
    ↓
handleSendMessage()
    ↓
Add User Message to State
    ↓
sendMessageToAPI()
    ↓
apiService.sendChatMessage()
    ├── Create AbortController
    ├── Add Authorization Header
    └── POST /chatstream
    ↓
Backend Processing
    ↓
SSE Stream Response
    ↓
processStreamingResponse()
    ├── Parse SSE Events
    │   ├── event: 'thinking'
    │   ├── event: 'status'
    │   ├── event: 'message'
    │   └── event: 'clarification'
    └── Update UI in Real-time
    ↓
Display Messages
```

### 3. Quick Report Flow

```
User Selects Quick Report
    ↓
AIModelsDropdown.handleOptionClick()
    ↓
getAPIParameters(optionId)
    ↓
apiService.getReadyMadeLLMAnalysis()
    ↓
AWS Lambda Function
    ↓
processQuickReportsResponse()
    ├── Extract chart data
    ├── Extract summary
    └── Generate message object
    ↓
Add to Conversation
    ↓
Auto-activate Split View (if chart exists)
    ↓
Render Chart + Summary
```

### 4. Chart Rendering Flow

```
Message with Chart Data
    ↓
MarkdownStructuredMessage
    ↓
Parse JSON Content
    ├── Check for chart object
    ├── Check for summary
    └── Validate data structure
    ↓
DynamicChart Component
    ├── Process chart data
    ├── Calculate axis domains
    ├── Generate ticks
    └── Render with Recharts
    ↓
Display Chart
    ├── Normal View
    ├── Split View
    └── Fullscreen Modal
```

---

## Key Functionalities

### 1. Streaming Response Processing

The application uses **Server-Sent Events (SSE)** for real-time streaming:

**Event Types:**
- `thinking`: AI reasoning process (accumulated paragraphs)
- `status`: Current processing status (replaces previous)
- `message`: Final message content (text, chart, or report)
- `clarification`: Request for user clarification
- `error`: Error messages
- `ping`: Keep-alive messages (filtered out)

**Processing Logic:**
1. Accumulate data for each event type
2. Process complete events when empty line detected
3. Filter out technical content (Database_response, pipeline queries)
4. Parse JSON messages (charts, reports)
5. Update UI incrementally

### 2. Chart Data Processing

**Multi-Axis Chart Support:**
- Automatic axis assignment (left/right)
- Domain calculation with 5% padding
- Tick generation for clean labels
- Color coordination per axis
- Dotted line support for forecast data

**Data Transformation:**
- Month number to month name conversion
- Date formatting and sorting
- Null value handling
- Numeric type validation
- Nested data flattening

### 3. Conversation Management

**Session Management:**
- Each conversation has unique `sessionId`
- Session ID format: `SES{timestamp}{random}`
- Messages linked to session for context
- User ID tracking for analytics

**Conversation Operations:**
- Create new conversation
- Switch between conversations
- Auto-generate titles from first message
- Message editing (removes subsequent AI responses)
- Conversation persistence (in-memory, can be extended to localStorage)

### 4. Error Handling

**Error Types:**
- Network errors (connection lost)
- Authentication errors (401 → redirect to login)
- Timeout errors (15-minute limit)
- User-initiated stops (no error message)
- API errors (graceful degradation)

**Error Recovery:**
- Automatic retry for transient errors
- User-friendly error messages
- Connection status indicators
- Graceful fallbacks

### 5. Split View System

**Activation:**
- Auto-activate when chart message detected
- Manual toggle via button
- User preference setting

**Layout:**
- Left panel: Chat messages (collapsed sidebar)
- Right panel: Chart visualization
- Divider with toggle button
- Fullscreen option

**State Management:**
- Tracks active split view message ID
- Prevents duplicate activations
- Handles view switching animations

---

## Build & Deployment

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build renderer bundle
npm run build

# Watch mode for development
npm run dev
```

### Production Build

```bash
# Build production bundle
npm run build:prod

# Package application
npm run package

# Create distributables
npm run make

# Platform-specific builds
npm run make:win    # Windows
npm run make:mac    # macOS
```

### Installer Creation

```bash
# Windows installer (Inno Setup)
npm run setup:win:inno

# macOS DMG
npm run setup:mac

# Build all installers
npm run build:setup
```

### Build Configuration

**Webpack (`webpack.config.js`):**
- Entry: `src/renderer.js`
- Output: `src/renderer.bundle.js`
- Babel transpilation for Electron 36.1.0
- CSS loader for styles
- Source maps in development

**Electron Forge (`forge.config.js`):**
- ASAR packaging for code protection
- Icon configuration for all platforms
- Code signing setup (Windows/macOS)
- Notarization for macOS
- File exclusion for smaller package size

---

## Configuration

### Environment Configuration (`src/config/environment.js`)

```javascript
{
  prod: false,  // Toggle between dev/prod
  apiBaseUrl: "http://chatbot-ai-alb-...",  // Chat API endpoint
  chatStreamUrl: "/chatstream",  // Streaming endpoint
  quickReportsApiUrl: "https://...execute-api.../read",  // Quick reports API
}
```

**API Endpoints:**
- **Chat API**: ELB endpoint for streaming chat
- **Quick Reports API**: AWS Lambda function endpoint
- Both use same authentication (JWT tokens)

### AWS Amplify Configuration (`src/amplifyconfigurations.json`)

Contains AWS Cognito configuration:
- User pool ID
- Client ID
- Region
- Authentication flow

### Application Settings

**Window Configuration:**
- Default size: 1200x800
- DevTools: Only in development mode
- Context isolation: Enabled (security)
- Node integration: Disabled (security)

**Security Features:**
- Context isolation enabled
- Preload script for secure IPC
- JWT token validation
- HTTPS for API calls (production)

---

## Advanced Features

### 1. Thinking Process Visualization

The application displays AI's thinking process similar to ChatGPT:

- **Status Messages**: Dynamic status updates (e.g., "Analyzing data...", "Generating chart...")
- **Thinking Content**: Accumulated reasoning paragraphs
- **Duration Tracking**: Shows how long AI took to think
- **Collapsible Interface**: Users can expand/collapse thinking details
- **Animation**: Smooth transitions and gradient effects

### 2. Message Filtering

Intelligent filtering of technical content:
- Backend error messages
- Pipeline queries (MongoDB aggregation)
- Technical metadata
- Database response objects

### 3. Chart Intelligence

**Automatic Features:**
- Axis assignment based on data scale
- Color coordination for multi-axis charts
- Tick optimization for readability
- Responsive sizing based on view mode
- X-axis label rotation for long labels

**Chart Types:**
- **Line Charts**: Time-series data
- **Bar Charts**: Categorical comparisons
- **Multi-Axis Charts**: Different scales on left/right axes
- **Dotted Lines**: Forecast/prediction data

### 4. Quick Reports System

**60+ Pre-configured Reports:**
- **SARIMAX Models**: 15 reports
- **SLR Models**: 15 reports
- **XGBOOST Models**: 15 reports
- **GFS Models**: 15+ reports (Arabica & Robusta)

**Report Categories:**
- Price analysis (ICE, LIFFE, ICO)
- Stock analysis (STU, World Stock)
- Weather analysis (Rainfall, DOD)
- Technical indicators (RSI, Funds Position)

### 5. User Experience Enhancements

- **Typewriter Effect**: Smooth text animation
- **Auto-scroll**: Automatic scrolling to latest message
- **Message Timestamps**: Time display for each message
- **Copy to Clipboard**: Easy text selection and copying
- **Dark Mode**: Complete theme switching
- **Responsive Layout**: Adapts to window size
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line

---

## Security Considerations

### 1. Authentication
- JWT tokens stored securely in localStorage
- Automatic token refresh via AWS Amplify
- 401 errors trigger automatic logout
- Session validation on app startup

### 2. API Security
- All API calls include Authorization headers
- Bearer token authentication
- HTTPS in production
- CORS handling

### 3. Electron Security
- Context isolation enabled
- Node integration disabled
- Preload script for secure IPC
- Content Security Policy (CSP) ready

### 4. Data Privacy
- User data not stored locally (except session)
- Messages processed in real-time
- No persistent chat history (can be added)
- Secure token handling

---

## Future Enhancements

### Potential Features
1. **Persistent Storage**: Save conversations to local database
2. **Export Functionality**: Export charts and reports to PDF/Excel
3. **Search**: Search through conversation history
4. **Favorites**: Bookmark important reports
5. **Custom Reports**: User-defined report configurations
6. **Notifications**: Desktop notifications for long-running queries
7. **Offline Mode**: Cache recent data for offline access
8. **Multi-language Support**: Internationalization
9. **Accessibility**: Screen reader support, keyboard navigation
10. **Analytics**: Usage tracking and insights

---

## Troubleshooting

### Common Issues

**1. Authentication Failures**
- Check AWS Cognito configuration
- Verify user credentials
- Check network connectivity
- Review browser console for errors

**2. Chart Not Rendering**
- Verify chart data format
- Check browser console for errors
- Ensure Recharts is properly loaded
- Validate JSON structure

**3. Streaming Not Working**
- Check API endpoint connectivity
- Verify SSE support in backend
- Check network tab for streaming events
- Review timeout settings

**4. Build Errors**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify Electron version
- Review webpack configuration

---

## Support & Maintenance

### Development Team
- **Author**: udbhav_sephora
- **Email**: Udbhav.Koka@sephora.com
- **Organization**: Kalyalabs

### Version Information
- **Application Version**: 1.0.0
- **Electron Version**: 36.1.0
- **React Version**: 19.1.0
- **License**: MIT

### Dependencies
See `package.json` for complete list of dependencies and versions.

---

## Conclusion

Link Commodities AI is a sophisticated desktop application that combines the power of AI, real-time data streaming, and advanced data visualization to provide comprehensive commodity market analysis. The application's modular architecture, comprehensive error handling, and user-friendly interface make it a powerful tool for market analysts and researchers.

The codebase is well-structured, maintainable, and follows modern React and Electron best practices. The integration with AWS services provides scalability and security, while the real-time streaming capabilities ensure a responsive user experience.

---

**Last Updated**: 2024
**Documentation Version**: 1.0








