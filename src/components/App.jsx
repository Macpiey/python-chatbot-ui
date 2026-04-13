import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  FiSend,
  FiSquare,
  FiMenu,
  FiMoon,
  FiSun,
  FiLogOut,
  FiBarChart2,
  FiMaximize2,
  FiChevronRight,
  FiChevronLeft,
  FiColumns,
  FiEdit3,
  FiCopy,
  FiSidebar,
  FiTrendingUp,
  FiRefreshCw,
} from "react-icons/fi";
import EnhancedMessage from "./EnhancedMessage";
import ChartRenderer from "./ChartRenderer";
import MarkdownStructuredMessage from "./MarkdownStructuredMessage";
import ClarificationMessage from "./ClarificationMessage";
import ChartTestComponent from "./ChartTestComponent";
import SuggestionChips from "./SuggestionChips";
import LoginScreen from "./LoginScreen";
import FullscreenChartModal from "./FullscreenChartModal";
import UserMessage from "./UserMessage";
import ThinkingIndicator from "./ThinkingIndicator";
import AIModelsDropdown from "./AIModelsDropdown";
import CombinedForecastDropdown from "./CombinedForecastDropdown";
import UpdateModal from "./UpdateModal";

import authService from "../services/authService";
import apiService from "../services/apiService";
import config from "../config/environment";
import { processQuickReportsResponse, generateChartString } from "../utils/quickReportsProcessor";


const API_URL = config.chatStreamUrl;

// Function to get current user ID (email) from auth service
const getCurrentUserId = () => {
  const userEmail = authService.getUserEmail();
  return userEmail || "UNKNOWN_USER";
};

const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `SES${timestamp}${random}`;
};

function App() {
  // Authentication state
  const [authState, setAuthState] = useState(authService.getAuthState());

  const [input, setInput] = useState("");
  const initialConvId = uuidv4();
  const initialSessionId = generateSessionId();
  const [conversations, setConversations] = useState([
    { id: initialConvId, title: "New Chat", messages: [], sessionId: initialSessionId },
  ]);
  const [currentConversation, setCurrentConversation] = useState(initialConvId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [engagementMessage, setEngagementMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(""); // Dynamic status from API
  const [thinkingContent, setThinkingContent] = useState([]); // Accumulated thinking paragraphs
  const [thinkingStartTime, setThinkingStartTime] = useState(null); // Track thinking start time
  const [thinkingDuration, setThinkingDuration] = useState(0); // Total thinking duration
  const [isThinkingComplete, setIsThinkingComplete] = useState(false); // Whether thinking is done

  const [activeTypingConversation, setActiveTypingConversation] =
    useState(null);
  const [apiConnected, setApiConnected] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState([]);

  // App version state
  const [appVersion, setAppVersion] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Split-view state management
  const [isSplitViewActive, setIsSplitViewActive] = useState(false);
  const [splitViewData, setSplitViewData] = useState(null);
  const [userPrefersSplitView, setUserPrefersSplitView] = useState(true); // Global default preference
  const [activeSplitViewMessageId, setActiveSplitViewMessageId] = useState(null); // Track which message is in split view
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);
  const [isSwitchingViews, setIsSwitchingViews] = useState(false); // Track when switching between views
  const [isLoadingCombinedForecast, setIsLoadingCombinedForecast] = useState(false);

  const messagesEndRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const pendingResponsesRef = useRef({});
  const requestQueueRef = useRef([]);
  const abortControllersRef = useRef({});
  const userStoppedRef = useRef({});

  // Refs for thinking state to avoid closure issues
  const thinkingStateRef = useRef({
    statusMessage: "",
    thinkingContent: [],
    thinkingStartTime: null,
    thinkingDuration: 0,
    hasBeenAttached: false  // Track if thinking data has been attached to a message
  });

  const currentMessages = React.useMemo(() => {
    if (currentConversation === null) return [];
    const conversation = conversations.find(
      (conv) => conv.id === currentConversation
    );
    return conversation ? conversation.messages : [];
  }, [conversations, currentConversation]);

  // Function to detect if a message contains charts
  const hasChartContent = useCallback((message) => {
    if (!message) return false;

    // Check for direct chart properties
    if (message.chart || message.rawData) {
      return true;
    }

    // Check for markdown_structured type with chart content
    if (message.type === "markdown_structured" && message.text) {
      // For multiaxis type, check if it actually has chart data, not just summary
      if (message.text.includes('"type":"multiaxis"')) {
        try {
          const jsonData = JSON.parse(message.text);
          // Only consider it chart content if it has actual chart data
          return !!(jsonData.chart && jsonData.chart.data && jsonData.chart.data.length > 0);
        } catch (e) {
          // If parsing fails, fall back to other indicators
        }
      }

      // Check for other chart indicators
      const chartIndicators = ['CHART_TYPE', '"chart":', '"chartType":', 'raw_data'];
      return chartIndicators.some(indicator => message.text.includes(indicator));
    }

    return false;
  }, []);

  // Function to extract chart data from a message
  const extractChartData = useCallback((message) => {
    if (!message) return null;

    // Direct chart data
    if (message.chart || message.rawData) {
      return {
        chartData: message.chart,
        rawData: message.rawData,
        textContent: message.text,
        messageType: message.type
      };
    }

    // For markdown_structured messages, we'll let the component handle parsing
    if (message.type === "markdown_structured") {
      return {
        textContent: message.text,
        messageType: message.type,
        fullMessage: message
      };
    }

    return null;
  }, []);

  // Effect to manage split-view state based on current messages
  useEffect(() => {
    if (!currentMessages || currentMessages.length === 0) {
      setIsSplitViewActive(false);
      setSplitViewData(null);
      return;
    }

    // Check the last few messages for chart content
    const recentMessages = currentMessages.slice(-5); // Check last 5 messages
    const chartMessage = recentMessages.reverse().find(msg => hasChartContent(msg)); // Find most recent chart message

    console.log("🔍 Split-view effect triggered:", {
      hasChartMessage: !!chartMessage,
      chartMessageId: chartMessage?.id,
      chartMessageHasThinkingData: !!chartMessage?.thinkingData,
      userPrefersSplitView
    });

    if (chartMessage && userPrefersSplitView) {
      // Auto-activate split view for new chart messages if user prefers it
      activateSplitViewForMessage(chartMessage);
    } else if (!chartMessage) {
      // No chart in the latest message, deactivate split view
      deactivateSplitView();
    }
  }, [currentMessages, hasChartContent, extractChartData]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.addListener((newAuthState) => {
      setAuthState(newAuthState);
    });

    return unsubscribe;
  }, []);

  // Fetch app version on mount
  useEffect(() => {
    if (window.updater) {
      window.updater.getCurrentVersion().then((version) => {
        console.log('[App] App version:', version);
        setAppVersion(version);
      });
    }
  }, []);

  // Manual check for updates handler
  const handleCheckForUpdates = useCallback(() => {
    if (window.updater && !isCheckingUpdate) {
      setIsCheckingUpdate(true);
      console.log('[App] Manual update check triggered');
      window.updater.checkForUpdate().then((result) => {
        console.log('[App] Manual update check result:', result);
        setIsCheckingUpdate(false);
      }).catch(() => {
        setIsCheckingUpdate(false);
      });
    }
  }, [isCheckingUpdate]);

  useEffect(() => {
    if (messagesEndRef.current && !isSwitchingViews) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages, typingText, isSwitchingViews]);

  // Effect to handle scrolling after view switching
  useEffect(() => {
    if (isSwitchingViews) {
      // Use a timeout to ensure the DOM has updated after view switch
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        setIsSwitchingViews(false);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isSwitchingViews]);

  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };



  const clearTypingAnimation = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  };

  const updateConversationTitle = (convId, message) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === convId && conv.title === "New Chat") {
          const words = message.text.split(" ").slice(0, 4).join(" ");
          const title =
            words.length > 30 ? words.substring(0, 30) + "..." : words;
          return { ...conv, title: title || "New Chat" };
        }
        return conv;
      })
    );
  };

  const handleApiError = (_, conversationId = null, isUserStopped = false) => {
    const convId = conversationId || currentConversation;
    if (convId === null) {
      console.log("Cannot handle API error for null conversation");
      return;
    }
    if (pendingResponsesRef.current[convId]?.received) {
      console.log(
        `Already received a response for conversation ${convId}, not showing error`
      );
      return;
    }

    // Don't show error message if user manually stopped the request
    if (isUserStopped || userStoppedRef.current[convId]) {
      console.log("Request was manually stopped by user, not showing error message");
      clearTypingAnimation();
      setIsTyping(false);
      setTypingText("");
      setActiveTypingConversation(null);
      if (pendingResponsesRef.current[convId]) {
        pendingResponsesRef.current[convId].received = true;
        if (pendingResponsesRef.current[convId].timeoutId) {
          clearTimeout(pendingResponsesRef.current[convId].timeoutId);
          pendingResponsesRef.current[convId].timeoutId = null;
        }
      }
      return;
    }

    clearTypingAnimation();
    setIsTyping(false);
    setTypingText("");
    setActiveTypingConversation(null);
    if (pendingResponsesRef.current[convId]) {
      pendingResponsesRef.current[convId].received = true;
      if (pendingResponsesRef.current[convId].timeoutId) {
        clearTimeout(pendingResponsesRef.current[convId].timeoutId);
        pendingResponsesRef.current[convId].timeoutId = null;
      }
    }
    const errorMessage = {
      id: Date.now(),
      text: "Sorry, I couldn't get a response from the AI service. Please check your internet connection and try again.",
      timestamp: Date.now(),
      sender: "system",
    };
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === convId) {
          return {
            ...conv,
            messages: [...conv.messages, errorMessage],
          };
        }
        return conv;
      })
    );
  };

  const sendMessageToAPI = async (message, conversationId) => {
    if (conversationId === null) {
      console.error("Cannot send message for null conversation");
      return false;
    }

    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      console.error("Conversation not found");
      return false;
    }

    try {
      if (pendingResponsesRef.current[conversationId]) {
        console.log(`Clearing existing pending response for conversation ${conversationId}`);
        if (abortControllersRef.current[conversationId]) {
          abortControllersRef.current[conversationId].abort();
          delete abortControllersRef.current[conversationId];
        }
        delete pendingResponsesRef.current[conversationId];
      }

      const abortController = new AbortController();
      abortControllersRef.current[conversationId] = abortController;

      const currentUserId = getCurrentUserId();
      const requestBody = {
        message: message,
        user_id: currentUserId,
        session_id: conversation.sessionId
      };

      console.log("Sending HTTP request:", JSON.stringify(requestBody, null, 2));

      pendingResponsesRef.current[conversationId] = {
        received: false,
        timeoutId: setTimeout(() => {
          console.error(`Timeout for conversation ${conversationId}`);

          // Check if user manually stopped the request or if response was already received
          const isUserStopped = userStoppedRef.current[conversationId];
          const responseReceived = pendingResponsesRef.current[conversationId]?.received;

          if (responseReceived) {
            console.log(`Response already received for conversation ${conversationId}, ignoring timeout`);
            return;
          }

          if (isUserStopped) {
            console.log(`User stopped conversation ${conversationId}, ignoring timeout`);
            return;
          }

          abortController.abort();
          handleApiError(null, conversationId, isUserStopped);

          if (conversationId === activeTypingConversation) {
            setIsTyping(false);
            setTypingText("");
            setActiveTypingConversation(null);
          }
        }, 900000), // 15 minutes timeout
      };

      requestQueueRef.current.push(conversationId);

      const response = await apiService.sendChatMessage(
        message,
        currentUserId,
        conversation.sessionId,
        abortController.signal
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await processStreamingResponse(response, conversationId);

      console.log(`Message sent for conversation ${conversationId}`);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return false;
      }
      console.error("Error sending message:", error);
      setConnectionError(true);

      // Check if user manually stopped the request
      const isUserStopped = userStoppedRef.current[conversationId];
      handleApiError(null, conversationId, isUserStopped);
      return false;
    } finally {
      if (abortControllersRef.current[conversationId]) {
        delete abortControllersRef.current[conversationId];
      }
      // Clean up user stopped flag
      if (userStoppedRef.current[conversationId]) {
        delete userStoppedRef.current[conversationId];
      }
    }
  };

  // Helper function to check if message contains filtered content
  const shouldFilterMessage = (text) => {
    if (!text || typeof text !== 'string') return false;

    const filterPatterns = [
      // Backend error messages - only filter exact error patterns
      /^\{'error':\s*'Failed to parse Claude output'/,
      /AIMessage\(content=/,
      /additional_kwargs=/,
      /response_metadata=/,
      /usage_metadata=/,

      // Pipeline queries and technical content - only filter exact technical patterns
      /\$match.*\$addFields.*\$project/s,
      /ISODate\(/,
      /\$dateFromString/,
      /\$dateToString/,
      /"pipeline":\s*\[/,
      /\$gte.*\$lte/,
    ];

    return filterPatterns.some(pattern => pattern.test(text));
  };



  // Function to process accumulated event data
  const processEventData = (eventType, eventData, conversationId) => {
    console.log("🔄 Processing accumulated event data:", eventType, eventData.substring(0, 100) + "...");

    if (eventType === 'message') {
      const cleanedContent = eventData.replace(/: ping - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\+\d{2}:\d{2}/g, '').trim();
      if (cleanedContent) {
        console.log("📨 Processing complete message event:", cleanedContent.substring(0, 100) + "...");

        try {
          // 1. Check for Database_response JSON (skip it)
          if (cleanedContent.includes('"action":"Database_response"') && cleanedContent.startsWith('{') && cleanedContent.endsWith('}')) {
            console.log("🚫 Database_response detected - skipping as requested");
            return; // Skip Database_response completely
          }

          // 2. Check for chart JSON (with type field - includes summary-only charts)
          else if (cleanedContent.includes('"type":') && cleanedContent.startsWith('{') && cleanedContent.endsWith('}')) {
            console.log("📊 Chart/Summary message detected");
            try {
              const chartData = JSON.parse(cleanedContent);

              // Calculate thinking duration at message creation time using ref
              const thinkingState = thinkingStateRef.current;
              const calculatedDuration = thinkingState.thinkingStartTime ? Date.now() - thinkingState.thinkingStartTime : 0;

              // Only attach thinking data to the FIRST message in the response sequence
              const shouldAttachThinking = thinkingState.thinkingStartTime && !thinkingState.hasBeenAttached;

              const chartMessage = {
                id: Date.now() + Math.random(),
                text: JSON.stringify(chartData),
                timestamp: Date.now(),
                sender: "ai",
                type: "markdown_structured",
                // Attach thinking data only to first message
                thinkingData: shouldAttachThinking ? {
                  statusMessage: thinkingState.statusMessage || "",
                  thinkingContent: [...thinkingState.thinkingContent],
                  thinkingDuration: calculatedDuration,
                } : null,
              };

              // Mark thinking data as attached so subsequent messages don't get it
              if (shouldAttachThinking) {
                thinkingStateRef.current.hasBeenAttached = true;
              }

              setConversations((prevConversations) =>
                prevConversations.map((conv) => {
                  if (conv.id === conversationId) {
                    return {
                      ...conv,
                      messages: [...conv.messages, chartMessage],
                    };
                  }
                  return conv;
                })
              );

              // Update thinking duration state for live indicator
              setThinkingDuration(calculatedDuration);
              setIsThinkingComplete(true);

              console.log("✅ Chart/Summary message added with thinking data:", {
                hasThinkingData: !!chartMessage.thinkingData,
                duration: calculatedDuration,
                statusMessage: thinkingState.statusMessage,
                thinkingParagraphs: thinkingState.thinkingContent.length,
                thinkingData: chartMessage.thinkingData,
                isFirstMessage: shouldAttachThinking
              });
            } catch (e) {
              console.log("❌ Failed to parse chart JSON:", e);
            }
          }
          // 3. Check for report JSON (extract report content)
          else if (cleanedContent.includes('"report":') && cleanedContent.startsWith('{') && cleanedContent.endsWith('}')) {
            console.log("📋 Report message detected");
            try {
              const reportData = JSON.parse(cleanedContent);
              if (reportData.report) {
                // Calculate thinking duration at message creation time using ref
                const thinkingState = thinkingStateRef.current;
                const calculatedDuration = thinkingState.thinkingStartTime ? Date.now() - thinkingState.thinkingStartTime : 0;

                // Only attach thinking data to the FIRST message in the response sequence
                const shouldAttachThinking = thinkingState.thinkingStartTime && !thinkingState.hasBeenAttached;

                const reportMessage = {
                  id: Date.now() + Math.random(),
                  text: reportData.report,
                  timestamp: Date.now(),
                  sender: "ai",
                  type: "text",
                  // Attach thinking data only to first message
                  thinkingData: shouldAttachThinking ? {
                    statusMessage: thinkingState.statusMessage || "",
                    thinkingContent: [...thinkingState.thinkingContent],
                    thinkingDuration: calculatedDuration,
                  } : null,
                };

                // Mark thinking data as attached so subsequent messages don't get it
                if (shouldAttachThinking) {
                  thinkingStateRef.current.hasBeenAttached = true;
                }

                setConversations((prevConversations) =>
                  prevConversations.map((conv) => {
                    if (conv.id === conversationId) {
                      return {
                        ...conv,
                        messages: [...conv.messages, reportMessage],
                      };
                    }
                    return conv;
                  })
                );

                // Update thinking duration state for live indicator
                setThinkingDuration(calculatedDuration);
                setIsThinkingComplete(true);

                console.log("✅ Report message added with thinking data:", {
                  hasThinkingData: !!reportMessage.thinkingData,
                  duration: calculatedDuration,
                  statusMessage: thinkingState.statusMessage,
                  thinkingParagraphs: thinkingState.thinkingContent.length,
                  thinkingData: reportMessage.thinkingData,
                  isFirstMessage: shouldAttachThinking
                });
              }
            } catch (e) {
              console.log("❌ Failed to parse report JSON:", e);
            }
          }
          // 4. Check for regular text/markdown (not JSON)
          else if (!cleanedContent.startsWith('{') && !cleanedContent.endsWith('}')) {
            console.log("📝 Text message detected");

            // Calculate thinking duration at message creation time using ref
            const thinkingState = thinkingStateRef.current;
            const calculatedDuration = thinkingState.thinkingStartTime ? Date.now() - thinkingState.thinkingStartTime : 0;

            // Only attach thinking data to the FIRST message in the response sequence
            const shouldAttachThinking = thinkingState.thinkingStartTime && !thinkingState.hasBeenAttached;

            const textMessage = {
              id: Date.now() + Math.random(),
              text: cleanedContent,
              timestamp: Date.now(),
              sender: "ai",
              type: "text",
              // Attach thinking data only to first message
              thinkingData: shouldAttachThinking ? {
                statusMessage: thinkingState.statusMessage || "",
                thinkingContent: [...thinkingState.thinkingContent],
                thinkingDuration: calculatedDuration,
              } : null,
            };

            // Mark thinking data as attached so subsequent messages don't get it
            if (shouldAttachThinking) {
              thinkingStateRef.current.hasBeenAttached = true;
            }

            setConversations((prevConversations) =>
              prevConversations.map((conv) => {
                if (conv.id === conversationId) {
                  return {
                    ...conv,
                    messages: [...conv.messages, textMessage],
                  };
                }
                return conv;
              })
            );

            // Update thinking duration state for live indicator
            setThinkingDuration(calculatedDuration);
            setIsThinkingComplete(true);

            console.log("✅ Text message added with thinking data:", {
              hasThinkingData: !!textMessage.thinkingData,
              duration: calculatedDuration,
              statusMessage: thinkingState.statusMessage,
              thinkingParagraphs: thinkingState.thinkingContent.length,
              thinkingData: textMessage.thinkingData,
              isFirstMessage: shouldAttachThinking
            });
          }
          // 4. Everything else is ignored (Database_response, errors, etc.)
          else {
            console.log("🚫 Ignoring message:", cleanedContent.substring(0, 100) + "...");
          }

        } catch (messageError) {
          console.error("❌ Error processing complete message:", messageError);
          console.error("❌ Message content:", cleanedContent);
        }
      }
    }
    else if (eventType === 'clarification') {
      console.log("📞 Clarification event detected");
      const cleanedContent = eventData.replace(/: ping - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\+\d{2}:\d{2}/g, '').trim();
      if (cleanedContent) {
        const clarificationMessage = {
          id: Date.now() + Math.random(),
          text: cleanedContent,
          timestamp: Date.now(),
          sender: "ai",
          type: "clarification",
        };

        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, clarificationMessage],
              };
            }
            return conv;
          })
        );

        console.log("✅ Clarification message added");
      }
    }
    else if (eventType === 'error') {
      console.log("❌ Error event detected");
      const cleanedContent = eventData.replace(/: ping - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\+\d{2}:\d{2}/g, '').trim();
      if (cleanedContent) {
        const errorMessage = {
          id: Date.now() + Math.random(),
          text: cleanedContent,
          timestamp: Date.now(),
          sender: "system",
          type: "error",
        };

        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, errorMessage],
              };
            }
            return conv;
          })
        );

        console.log("✅ Error message added");
      }
    }
    else if (eventType === 'status') {
      console.log("💭 Status event detected");
      const cleanedContent = eventData.replace(/: ping - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\+\d{2}:\d{2}/g, '').trim();
      if (cleanedContent) {
        // Replace previous status message (not accumulate)
        setStatusMessage(cleanedContent);
        thinkingStateRef.current.statusMessage = cleanedContent;
        console.log("✅ Status message updated:", cleanedContent);
      }
    }
    else if (eventType === 'thinking') {
      console.log("🧠 Thinking event detected");
      const cleanedContent = eventData.replace(/: ping - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\+\d{2}:\d{2}/g, '').trim();
      if (cleanedContent) {
        // Accumulate thinking content as paragraphs
        setThinkingContent(prev => {
          // If no previous content, start a new paragraph
          if (prev.length === 0) {
            console.log("✅ Thinking content first paragraph:", cleanedContent);
            const newContent = [cleanedContent];
            thinkingStateRef.current.thinkingContent = newContent;
            return newContent;
          }

          const lastParagraph = prev[prev.length - 1];

          // Improved paragraph detection logic
          // Check various indicators for new paragraph
          const prevEndsWithPunctuation = /[.!?:]\s*$/.test(lastParagraph);
          const prevEndsWithPeriod = /\.\s*$/.test(lastParagraph);
          const currentStartsWithUppercase = /^[A-Z]/.test(cleanedContent);
          const currentStartsWithNumber = /^\d+[\.)]\s/.test(cleanedContent); // Numbered lists
          const currentStartsWithBullet = /^[-•*]\s/.test(cleanedContent); // Bullet points

          // Check for special formatting indicators
          const currentIsHeading = /^\*\*[A-Z]/.test(cleanedContent); // **HEADING**
          const currentIsListItem = currentStartsWithNumber || currentStartsWithBullet;

          // Check if current content looks like a continuation
          const startsWithLowercase = /^[a-z]/.test(cleanedContent);
          const startsWithComma = /^,/.test(cleanedContent);
          const startsWithConjunction = /^(and|but|or|so|yet|for|nor)\s/i.test(cleanedContent);
          const startsWithConnector = /^(because|since|although|however|therefore|thus|hence|moreover|furthermore|additionally|also)\s/i.test(cleanedContent);

          // Check paragraph length - if previous is very short, might be a heading
          const prevIsShort = lastParagraph.length < 50;
          const prevIsLong = lastParagraph.length > 200;

          // Determine if we should create a new paragraph
          let shouldCreateNewParagraph = false;

          // Always new paragraph for headings and list items
          if (currentIsHeading || currentIsListItem) {
            shouldCreateNewParagraph = true;
          }
          // New paragraph if previous ended with period and current starts with uppercase
          else if (prevEndsWithPeriod && currentStartsWithUppercase && !startsWithConnector) {
            shouldCreateNewParagraph = true;
          }
          // New paragraph if previous ended with punctuation and current is uppercase (not a connector)
          else if (prevEndsWithPunctuation && currentStartsWithUppercase && !startsWithConjunction && !startsWithConnector) {
            shouldCreateNewParagraph = true;
          }
          // Append if starts with lowercase, comma, or conjunction
          else if (startsWithLowercase || startsWithComma || startsWithConjunction || startsWithConnector) {
            shouldCreateNewParagraph = false;
          }
          // If previous paragraph is very long and current starts with uppercase, create new paragraph
          else if (prevIsLong && currentStartsWithUppercase) {
            shouldCreateNewParagraph = true;
          }
          // Default: append if previous doesn't end with sentence punctuation
          else {
            shouldCreateNewParagraph = prevEndsWithPunctuation && currentStartsWithUppercase;
          }

          if (shouldCreateNewParagraph) {
            console.log("✅ Thinking content new paragraph:", cleanedContent);
            const newContent = [...prev, cleanedContent];
            thinkingStateRef.current.thinkingContent = newContent;
            return newContent;
          } else {
            // Append to previous paragraph
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            // Add space if needed
            const separator = updated[lastIndex].endsWith(' ') || cleanedContent.startsWith(' ') ? '' : ' ';
            updated[lastIndex] = updated[lastIndex] + separator + cleanedContent;
            console.log("✅ Thinking content appended to paragraph:", updated[lastIndex].substring(0, 100) + "...");
            thinkingStateRef.current.thinkingContent = updated;
            return updated;
          }
        });
      }
    }
  };

  const processStreamingResponse = async (response, conversationId) => {
    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let clarificationText = '';
      let messageText = ''; // For accumulating regular text messages

      // EventStream processing variables
      let currentEventData = ''; // Accumulate data for current event
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') {
            // Empty line indicates end of current event - process accumulated data
            if (currentEvent && currentEventData.trim()) {
              console.log("🔄 End of event detected, processing:", currentEvent);
              processEventData(currentEvent, currentEventData.trim(), conversationId);
              currentEventData = ''; // Reset for next event
            }
            continue;
          }

          console.log("Processing line:", line);

          if (line.startsWith('event:')) {
            // Process any accumulated data from previous event first
            if (currentEvent && currentEventData.trim()) {
              console.log("🔄 New event detected, processing previous:", currentEvent);
              processEventData(currentEvent, currentEventData.trim(), conversationId);
            }

            // Start new event
            currentEvent = line.substring(6).trim();
            currentEventData = '';
            console.log("SSE event type:", currentEvent);
          } else if (line.startsWith('data:')) {
            const dataContent = line.substring(5).trim();
            console.log("SSE data content:", dataContent, "for event:", currentEvent);

            if (currentEvent === 'ping' || dataContent.includes(':ping')) {
              console.log("Skipping ping event");
              continue;
            }

            // Accumulate data for current event
            if (dataContent) {
              if (currentEventData) {
                currentEventData += '\n' + dataContent;
              } else {
                currentEventData = dataContent;
              }
            }
          }
          // All immediate processing removed - now using event accumulation only









            // Clarification processing moved to event accumulation
            // Error processing moved to event accumulation
            // All other processing moved to event accumulation
        }
      }

      // Process any remaining event data at the end of stream
      if (currentEvent && currentEventData.trim()) {
        console.log("🔄 End of stream, processing final event:", currentEvent);
        processEventData(currentEvent, currentEventData.trim(), conversationId);
      }

      if (pendingResponsesRef.current[conversationId]) {
        pendingResponsesRef.current[conversationId].received = true;
        clearTimeout(pendingResponsesRef.current[conversationId].timeoutId);
        delete pendingResponsesRef.current[conversationId];
      }

      clearTypingAnimation();
      setIsTyping(false);
      setTypingText("");

      // Calculate thinking duration and mark as complete
      if (thinkingStartTime) {
        const duration = Date.now() - thinkingStartTime;
        setThinkingDuration(duration);
        setIsThinkingComplete(true);
        // Don't clear - keep thinking content visible permanently
      }

      setActiveTypingConversation(null);

      // No longer needed - each message event is processed individually

      // Final processing is no longer needed since we process messages individually
      // Only handle any remaining embedded JSON reports if they exist
      // OLD LOGIC - DISABLED to prevent duplicates
      if (messageText.trim() && messageText.includes('{"report":')) {
        console.log("⚠️ Skipping old messageText processing to prevent duplicates");
        // OLD LOGIC DISABLED
        // const messages = splitMessageWithEmbeddedJSON(messageText.trim());
        // setConversations...
      }

      // Handle clarification messages
      if (clarificationText.trim()) {
        console.log("Processing clarification message:", clarificationText.trim());

        const clarificationResponse = {
          id: Date.now() + 2,
          text: clarificationText.trim(),
          timestamp: Date.now(),
          sender: "ai",
          type: "clarification",
        };

        // Extract suggestions from clarification text
        const suggestions = extractSuggestionsFromText(clarificationText.trim());
        if (suggestions.length > 0) {
          setCurrentSuggestions(suggestions);
        }

        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: [...conv.messages, clarificationResponse],
              };
            }
            return conv;
          })
        );
      }

      // Process any remaining accumulated data at the end
      if (currentEvent && currentEventData.trim()) {
        processEventData(currentEvent, currentEventData.trim(), conversationId);
      }

    } catch (error) {
      console.error("❌ Error processing streaming response:", error);
      console.error("❌ Error stack:", error.stack);
      console.error("❌ Error name:", error.name);
      console.error("❌ Error message:", error.message);

      // Check if this was a user-initiated stop
      const isUserStopped = userStoppedRef.current[conversationId];

      // Don't show error for AbortError when user stopped the request
      if (error.name === 'AbortError' && isUserStopped) {
        console.log("Streaming response aborted by user, not showing error");
        return;
      }

      handleApiError(null, conversationId, isUserStopped);
    }
  };

  const transformDataForCharts = (rawData) => {
    try {
      if (!rawData || !Array.isArray(rawData)) {
        console.log("No raw data to transform");
        return null;
      }

      console.log("Input raw data:", rawData);

      if (rawData.length > 0 && typeof rawData[0] === 'object') {
        const monthNames = {
          1: 'January', 2: 'February', 3: 'March', 4: 'April',
          5: 'May', 6: 'June', 7: 'July', 8: 'August',
          9: 'September', 10: 'October', 11: 'November', 12: 'December'
        };

        const processedData = rawData.map(item => {
          const newItem = { ...item };

          if (item.month && !item.monthName) {
            newItem.monthName = monthNames[item.month] || `Month ${item.month}`;
          }

          if (!item.date && item.monthName) {
            newItem.date = item.monthName;
          }

          return newItem;
        });

        if (processedData[0]?.month) {
          processedData.sort((a, b) => a.month - b.month);
        }

        console.log("Processed data for charts:", processedData);
        return processedData;
      }

      if (rawData.length > 0 && rawData[0].data && Array.isArray(rawData[0].data)) {
        console.log("Detected nested data structure - flattening");

        const flattenedData = {};

        rawData.forEach(sourceData => {
          const stateName = sourceData.state;
          if (sourceData.data && Array.isArray(sourceData.data)) {
            sourceData.data.forEach(dataPoint => {
              const key = dataPoint.year || dataPoint.month || dataPoint.date || Object.keys(dataPoint)[0];
              if (!flattenedData[key]) {
                flattenedData[key] = { ...dataPoint };
              }
              flattenedData[key][stateName] = dataPoint.total_rainfall || dataPoint.value || dataPoint.rainfall;
            });
          }
        });

        const result = Object.values(flattenedData);
        console.log("Flattened data:", result);
        return result;
      }

      console.log("Returning data as-is");
      return rawData;
    } catch (error) {
      console.error("Error transforming data:", error);
      return rawData;
    }
  };

  // processStepsData function removed - Database_response processing no longer needed

  // Helper function to detect if JSON is truncated
  const isJSONTruncated = (text) => {
    // Check for common truncation patterns
    const truncationPatterns = [
      /\{"chart":[^}]*$/,  // Starts with chart but doesn't close
      /\{"table":\s*\[[^\]]*$/,  // Starts with table but doesn't close
      /,"Price":\s*\d+\.?\d*$/,  // Ends with incomplete price data
      /\{"date":\s*"[^"]*$/,  // Incomplete date entry
    ];

    return truncationPatterns.some(pattern => pattern.test(text.trim()));
  };

  const splitMessageWithEmbeddedJSON = (messageText) => {
    const messages = [];
    let baseTimestamp = Date.now();

    // Check if the message appears to be truncated
    if (isJSONTruncated(messageText)) {
      console.log("⚠️ Detected truncated JSON message, skipping:", messageText.substring(messageText.length - 100));
      return messages; // Return empty array to skip truncated messages
    }

    // Look for all JSON patterns in the text (Database_response processing removed)
    const simpleReportPattern = /\{"report":\s*"[^"]*"\s*\}/gs;
    // New pattern for chart JSON format - more flexible to handle truncated JSON
    const chartPattern = /\{\s*"chart":\s*\{[^}]*"chartType"[^}]*\}/gs;

    let matches = [];
    let match;

    // Find chart format matches
    while ((match = chartPattern.exec(messageText)) !== null) {
      matches.push({
        content: match[0],
        start: match.index,
        end: match.index + match[0].length,
        type: 'chart_only'
      });
    }

    // Find all simple report matches (only if no other matches found)
    if (matches.length === 0) {
      while ((match = simpleReportPattern.exec(messageText)) !== null) {
        matches.push({
          content: match[0],
          start: match.index,
          end: match.index + match[0].length,
          type: 'simple'
        });
      }
    }

    if (matches.length > 0) {
      // Sort matches by position
      matches.sort((a, b) => a.start - b.start);

      let currentPos = 0;

      matches.forEach((match) => {
        // Add text before this JSON
        if (match.start > currentPos) {
          const textSegment = messageText.substring(currentPos, match.start).trim();
          if (textSegment && !shouldFilterMessage(textSegment)) {
            messages.push({
              id: baseTimestamp,
              text: textSegment,
              timestamp: baseTimestamp,
              sender: "ai",
              type: "text",
            });
            baseTimestamp += 1;
          }
        }

        // Determine message type based on JSON content (Database_response removed)
        let messageType = "text";
        try {
          const parsedJSON = JSON.parse(match.content);
          if (parsedJSON.chart) {
            messageType = "markdown_structured"; // Chart format
          } else if (parsedJSON.report) {
            messageType = "text"; // Simple report without chart data
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }

        // Add the JSON content as a separate message
        messages.push({
          id: baseTimestamp,
          text: messageType === "markdown_structured" ? match.content : (JSON.parse(match.content).report || match.content),
          timestamp: baseTimestamp,
          sender: "ai",
          type: messageType,
        });
        baseTimestamp += 1;

        currentPos = match.end;
      });

      // Add remaining text after last JSON
      if (currentPos < messageText.length) {
        const remainingText = messageText.substring(currentPos).trim();
        if (remainingText && !shouldFilterMessage(remainingText)) {
          messages.push({
            id: baseTimestamp,
            text: remainingText,
            timestamp: baseTimestamp,
            sender: "ai",
            type: "text",
          });
        }
      }
    } else {
      // No JSON found, treat as regular text
      if (!shouldFilterMessage(messageText)) {
        messages.push({
          id: baseTimestamp,
          text: messageText,
          timestamp: baseTimestamp,
          sender: "ai",
          type: "text",
        });
      }
    }

    console.log("Split message into", messages.length, "parts:", messages);
    return messages;
  };



  const handleStopMessage = () => {
    console.log("Stop button clicked - aborting current request");

    const currentTypingConv = activeTypingConversation;

    // Mark this conversation as user-stopped to prevent error messages
    if (currentTypingConv) {
      userStoppedRef.current[currentTypingConv] = true;
    }

    // Abort the current request if it exists
    if (currentTypingConv && abortControllersRef.current[currentTypingConv]) {
      abortControllersRef.current[currentTypingConv].abort();
      delete abortControllersRef.current[currentTypingConv];
    }

    // Clear pending response tracking and mark as received to prevent timeout
    if (currentTypingConv && pendingResponsesRef.current[currentTypingConv]) {
      if (pendingResponsesRef.current[currentTypingConv].timeoutId) {
        clearTimeout(pendingResponsesRef.current[currentTypingConv].timeoutId);
      }
      // Mark as received to prevent any further timeout handling
      pendingResponsesRef.current[currentTypingConv].received = true;
      delete pendingResponsesRef.current[currentTypingConv];
    }

    // Clear typing animation
    clearTypingAnimation();
    setIsTyping(false);
    setTypingText("");
    setStatusMessage(""); // Clear status message when stopped
    setThinkingContent([]); // Clear thinking content
    setThinkingStartTime(null); // Reset thinking timer
    setThinkingDuration(0);
    setIsThinkingComplete(false);
    setActiveTypingConversation(null);

    // Add a user-friendly stop message instead of an error
    if (currentTypingConv) {
      const stopMessage = {
        id: Date.now(),
        text: "✋ You have decided to stop the response. Feel free to send a new message below.",
        timestamp: Date.now(),
        sender: "system",
        type: "stop"
      };

      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === currentTypingConv) {
            return {
              ...conv,
              messages: [...conv.messages, stopMessage],
            };
          }
          return conv;
        })
      );
    }

    console.log("Request stopped successfully");
  };

  // Handle quick report selection from dropdown
  const handleQuickReportSelect = (quickReportMessage, reportTitle) => {
    if (!currentConversation) return;

    console.log("Adding quick report to conversation:", quickReportMessage);

    // Add the quick report message to the current conversation
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            messages: [...conv.messages, quickReportMessage],
          };
        }
        return conv;
      })
    );

    // Update conversation title if it's the first message - use the report title instead of message text
    const currentConv = conversations.find(conv => conv.id === currentConversation);
    if (currentConv && currentConv.messages.length === 0) {
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === currentConversation && conv.title === "New Chat") {
            return { ...conv, title: reportTitle || "Quick Report Analysis" };
          }
          return conv;
        })
      );
    }

    // Enable split view for chart display
    if (quickReportMessage.type === "markdown_structured") {
      setIsSplitViewActive(true);
    }
  };

  // Handle Combined Forecast selection (GFS or STU)
  const handleCombinedForecast = async (forecastType, commodity = 'ALL') => {
    if (!currentConversation) return;
    if (isTyping && activeTypingConversation === currentConversation) return;
    if (isLoadingCombinedForecast) return;

    setIsLoadingCombinedForecast(true);
    try {
      // Determine API parameters based on forecast type
      const dependent = forecastType.startsWith('stu') ? 'stu_price' : 'gfs_price';
      
      // Call the API with Combined Forecast parameters
      console.log(`Calling Combined Forecast API for ${forecastType.toUpperCase()}, Commodity: ${commodity}`);
      const apiResponse = await apiService.getReadyMadeLLMAnalysis(
        dependent,
        "all_models",
        "all_forecast",
        commodity
      );

      // Process the response
      const processedData = processQuickReportsResponse(apiResponse);

      // Create a message object that mimics the normal chat flow
      const chartJsonData = {
        summary: processedData.summary,
        type: processedData.type
      };

      // Only include chart if it exists
      if (processedData.chart && !processedData.isSummaryOnly) {
        chartJsonData.chart = processedData.chart;
      }

      const combinedForecastMessage = {
        id: Date.now(),
        text: JSON.stringify(chartJsonData),
        timestamp: Date.now(),
        sender: "ai",
        type: "markdown_structured",
        isQuickReport: true
      };

      // Add the combined forecast message to the current conversation
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === currentConversation) {
            return {
              ...conv,
              messages: [...conv.messages, combinedForecastMessage],
            };
          }
          return conv;
        })
      );

      // Update conversation title if it's the first message
      const currentConv = conversations.find(conv => conv.id === currentConversation);
      if (currentConv && currentConv.messages.length === 0) {
        const isStu = forecastType.startsWith('stu');
        const forecastTypeLabel = isStu ? 'STU' : 'GFS';
        const commodityLabel = isStu && commodity !== 'ALL' ? ` - ${commodity}` : '';
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === currentConversation && conv.title === "New Chat") {
              return { ...conv, title: `Combined Forecast Analysis - ${forecastTypeLabel}${commodityLabel}` };
            }
            return conv;
          })
        );
      }

      // Enable split view for chart display
      setIsSplitViewActive(true);

    } catch (error) {
      console.error('Error fetching combined forecast:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoadingCombinedForecast(false);
    }
  };

  const handleSendMessage = () => {
    if (input.trim() === "" || currentConversation === null) return;

    // Clear any previous user stopped flag for this conversation
    if (userStoppedRef.current[currentConversation]) {
      delete userStoppedRef.current[currentConversation];
    }

    const newMessage = {
      id: Date.now(),
      text: input.trim(),
      timestamp: Date.now(),
      sender: "user",
    };

    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
          };
        }
        return conv;
      })
    );

    updateConversationTitle(currentConversation, newMessage);

    const messageText = input;
    setInput("");

    // Clear suggestions when sending a message
    setCurrentSuggestions([]);

    setIsTyping(true);
    setTypingText("");
    // Reset thinking state for new response
    const startTime = Date.now();
    setStatusMessage("");
    setThinkingContent([]);
    setThinkingStartTime(startTime);
    setThinkingDuration(0);
    setIsThinkingComplete(false);
    // Update ref and reset hasBeenAttached flag
    thinkingStateRef.current = {
      statusMessage: "",
      thinkingContent: [],
      thinkingStartTime: startTime,
      thinkingDuration: 0,
      hasBeenAttached: false  // Reset for new response
    };
    setActiveTypingConversation(currentConversation);

    sendMessageToAPI(messageText, currentConversation);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isTyping && activeTypingConversation === currentConversation) {
        handleStopMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const extractSuggestionsFromText = (text) => {
    const suggestions = [];

    // Try to find suggestion text
    const suggestionMatch = text.match(/Suggestion:\s*([^]*?)(?=You may|$)/i);
    if (suggestionMatch) {
      const suggestionText = suggestionMatch[1].trim();

      // Split by common delimiters and clean up
      const parts = suggestionText
        .split(/[,;]|\sand\s|\sor\s/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.length < 100) // Filter reasonable length suggestions
        .slice(0, 3); // Limit to 3 suggestions

      suggestions.push(...parts);
    }

    return suggestions;
  };

  const handleSuggestionClick = (suggestionText) => {
    // Clean up the suggestion text and set it as input
    const cleanText = suggestionText.trim();
    setInput(cleanText);

    // Focus the input field
    const inputElement = document.querySelector('.message-input');
    if (inputElement) {
      inputElement.focus();
    }
  };

  const handleDismissSuggestions = () => {
    setCurrentSuggestions([]);
  };

  // Activate split-view for a specific message
  const activateSplitViewForMessage = (message) => {
    const chartData = extractChartData(message);
    if (chartData) {
      setIsSplitViewActive(true);
      setSplitViewData(chartData);
      setActiveSplitViewMessageId(message.id);
      // Don't hide sidebar, just collapse it (handled by useEffect above)
    }
  };

  // Deactivate split-view
  const deactivateSplitView = () => {
    setIsSplitViewActive(false);
    setSplitViewData(null);
    setActiveSplitViewMessageId(null);
    // Sidebar expand/collapse is handled by useEffect above
  };

  // Toggle sidebar collapse
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Auto-collapse sidebar in split view
  useEffect(() => {
    if (isSplitViewActive) {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [isSplitViewActive]);

  // Toggle global split-view preference
  const toggleGlobalSplitViewPreference = () => {
    setUserPrefersSplitView(!userPrefersSplitView);
  };

  // Toggle split-view for current active message (from divider button)
  const toggleSplitView = () => {
    setIsSwitchingViews(true); // Mark that we're switching views

    if (isSplitViewActive) {
      // Currently in split view - deactivate it
      deactivateSplitView();
    } else {
      // Not in split view - try to activate for the last chart message
      const currentMessages = conversations[currentConversation]?.messages || [];
      const lastChartMessage = [...currentMessages].reverse().find(msg =>
        msg.sender === "ai" && extractChartData(msg)
      );

      if (lastChartMessage) {
        activateSplitViewForMessage(lastChartMessage);
      }
    }
  };

  // Handle fullscreen from default view
  const handleFullscreenFromDefaultView = (message) => {
    const chartData = extractChartData(message);
    if (chartData) {
      setSplitViewData(chartData);
      setIsFullscreenChart(true);
    }
  };

  // Handle user message edit
  const handleUserMessageEdit = (originalMessage, newText) => {
    const currentConv = conversations.find(conv => conv.id === currentConversation);
    if (!currentConv) return;

    const messageIndex = currentConv.messages.findIndex(
      msg => msg.id === originalMessage.id
    );

    if (messageIndex === -1) return;

    // Update the message text and remove all messages after it
    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversation) {
        const updatedMessages = [...conv.messages];
        updatedMessages[messageIndex] = {
          ...originalMessage,
          text: newText
        };

        // Remove all messages after the edited message (AI responses)
        const messagesToKeep = updatedMessages.slice(0, messageIndex + 1);

        return {
          ...conv,
          messages: messagesToKeep
        };
      }
      return conv;
    });

    setConversations(updatedConversations);

    // Clear any active split view since we're removing AI responses
    deactivateSplitView();

    setConversations(updatedConversations);

    // Get the session ID for the current conversation
    if (!currentConv?.sessionId) return;

    // Set typing state
    setIsTyping(true);
    setActiveTypingConversation(currentConversation);
    setTypingText("");
    const startTime = Date.now();
    setStatusMessage(""); // Clear accumulated status from previous message
    setThinkingContent([]); // Clear thinking content
    setThinkingStartTime(startTime); // Start thinking timer
    setThinkingDuration(0);
    setIsThinkingComplete(false);
    // Update ref
    thinkingStateRef.current = {
      statusMessage: "",
      thinkingContent: [],
      thinkingStartTime: startTime,
      thinkingDuration: 0
    };

    // Send directly to API without using the input area
    sendMessageToAPI(newText, currentConversation);
  };

  // Handle user message copy
  const handleUserMessageCopy = (message) => {
    console.log('Message copied:', message.text);
  };

  const handleAuthSuccess = (newAuthState) => {
    console.log('Authentication successful:', newAuthState);
    setAuthState(newAuthState);
  };

  const switchConversation = (convId) => {
    console.log(`*** SWITCHING CONVERSATION *** From: ${currentConversation} To: ${convId}`);
    clearTypingAnimation();
    setIsTyping(false);
    setTypingText("");
    setActiveTypingConversation(null);
    setCurrentSuggestions([]); // Clear suggestions when switching conversations

    // Reset split-view when switching conversations
    deactivateSplitView();

    setCurrentConversation(convId);
  };

  const createNewConversation = () => {
    const newId = uuidv4();
    const newSessionId = generateSessionId();
    console.log("*** CREATING NEW CONVERSATION ***");
    const newConversation = {
      id: newId,
      title: "New Chat",
      messages: [],
      sessionId: newSessionId,
    };
    console.log(`*** NEW CONVERSATION CREATED *** ID: ${newId}, Session: ${newSessionId}`);
    // Add new conversation at the beginning to show latest on top
    setConversations((prevConvs) => [newConversation, ...prevConvs]);
    setCurrentConversation(newId);
    requestQueueRef.current = requestQueueRef.current.filter(
      (id, index, self) => self.indexOf(id) === index
    );
  };

  const testAPIConnection = async () => {
    setConnectionError(false);

    try {
      console.log(`Testing API connection to ${API_URL}`);
      setApiConnected(true);
      console.log("API connection test successful");
      return true;
    } catch (error) {
      console.error("Error testing API connection:", error);
      setConnectionError(true);
      setApiConnected(false);
      return false;
    }
  };

  useEffect(() => {
    testAPIConnection();
    return () => {
      Object.values(abortControllersRef.current).forEach(controller => {
        controller.abort();
      });
      abortControllersRef.current = {};
      userStoppedRef.current = {};
    };
  }, []);
  useEffect(() => {
    return () => {
      clearTypingAnimation();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textareas = document.querySelectorAll('.message-input');
    textareas.forEach(textarea => {
      const adjustHeight = () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
      };

      textarea.addEventListener('input', adjustHeight);
      adjustHeight(); // Initial adjustment

      return () => textarea.removeEventListener('input', adjustHeight);
    });
  }, [input]);



  // If user is not authenticated, show login screen
  if (!authState.isAuthenticated) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      {/* Auto-update modal */}
      <UpdateModal darkMode={darkMode} />

      <header className="app-header">
        <div className="header-left">
          <div className="app-title">
            <span className="app-title-main">Commodities AI</span>
            <span className="app-title-sub">by Kalya Labs</span>
          </div>
        </div>

        <div className="header-right">
          <button onClick={toggleDarkMode} className="icon-button">
            {darkMode ? <FiSun className="icon" /> : <FiMoon className="icon" />}
          </button>
        </div>
      </header>

      <div className="main-container">
        {testMode ? (
          <ChartTestComponent />
        ) : (
          <>
        {sidebarOpen && (
          <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
              <div className="sidebar-controls">
                <button
                  onClick={toggleSidebarCollapse}
                  className="sidebar-collapse-btn"
                >
                  <FiSidebar className="collapse-icon" />
                  {sidebarCollapsed && <div className="sidebar-tooltip">Expand</div>}
                </button>
                {!sidebarCollapsed && (
                  <button
                    onClick={createNewConversation}
                    className="sidebar-new-chat-btn"
                  >
                    <FiEdit3 className="new-chat-icon" />
                    <span>New chat</span>
                  </button>
                )}
              </div>
            </div>

            {sidebarCollapsed && (
              <div className="sidebar-menu-collapsed">
                <button
                  onClick={() => {
                    createNewConversation();
                    setSidebarCollapsed(false);
                  }}
                  className="sidebar-menu-item-collapsed"
                >
                  <FiEdit3 className="menu-icon" />
                  <div className="sidebar-tooltip">New Chat</div>
                </button>

                {/* Logout Button for Collapsed Sidebar */}
                {authState.isAuthenticated && (
                  <button
                    onClick={() => authService.signOutUser()}
                    className="sidebar-menu-item-collapsed"
                  >
                    <FiLogOut className="menu-icon" />
                    <div className="sidebar-tooltip">Logout</div>
                  </button>
                )}
              </div>
            )}

            {!sidebarCollapsed && (
              <>
                <div className="sidebar-section-title">Conversations</div>
                <div className="conversation-list">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => switchConversation(conv.id)}
                      className={`conversation-item ${
                        currentConversation === conv.id ? "active" : ""
                      }`}
                    >
                      <span className="conversation-title">{conv.title}</span>
                    </div>
                  ))}
                </div>

                {/* Logout Button for Expanded Sidebar */}
                {authState.isAuthenticated && (
                  <div className="sidebar-logout">
                    <button
                      onClick={() => authService.signOutUser()}
                      className="sidebar-logout-btn"
                    >
                      <FiLogOut className="logout-icon" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}

                {/* Version info + Check for Updates */}
                {appVersion && (
                  <div style={{
                    padding: '8px 16px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--gray-200)',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--gray-400)',
                      fontWeight: '500',
                      letterSpacing: '0.02em',
                    }}>
                      v{appVersion}
                    </span>
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdate}
                      title="Check for updates"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: isCheckingUpdate ? 'wait' : 'pointer',
                        color: 'var(--gray-400)',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        opacity: isCheckingUpdate ? 0.5 : 0.7,
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      <FiRefreshCw
                        size={12}
                        style={{
                          animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none',
                        }}
                      />
                      <span>{isCheckingUpdate ? 'Checking...' : 'Check updates'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentConversation === null ? (
          <div className="chat-area-wrapper">
            <div className="chat-container">
              <div className="messages-container">
                <div className="empty-state">
                  <div className="empty-state-content">
                    <h2 className="empty-state-title">
                      Loading conversation...
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <React.Fragment key={`fragment-${currentConversation}`}>
            <div className={`chat-area-wrapper ${isSplitViewActive ? 'split-view' : ''}`}>
              {isSplitViewActive ? (
                // Split view layout
                <>
                  <div className="split-view-left">
                    <div className="chat-container">
                      <div className="messages-container">
                        {currentMessages.length === 0 && !isTyping ? (
                          <div className="empty-state">
                            <div className="empty-state-content">
                              <h2 className="empty-state-title">
                                How can I help you today?
                              </h2>
                              <div className="empty-state-input">
                                <div className="input-wrapper">
                                  <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={isTyping && activeTypingConversation === currentConversation ? "AI is responding..." : "Ask anything..."}
                                    className="message-input"
                                    rows="1"
                                    disabled={isTyping && activeTypingConversation === currentConversation}
                                  />
                                  <AIModelsDropdown
                                    darkMode={darkMode}
                                    disabled={isTyping && activeTypingConversation === currentConversation}
                                    onQuickReportSelect={handleQuickReportSelect}
                                  />
                                  <CombinedForecastDropdown
                                    darkMode={darkMode}
                                    disabled={isTyping && activeTypingConversation === currentConversation || isLoadingCombinedForecast}
                                    onForecastSelect={handleCombinedForecast}
                                  />
                                  {isTyping && activeTypingConversation === currentConversation ? (
                                    <button
                                      onClick={handleStopMessage}
                                      className="send-button stop-button"
                                    >
                                      <FiSquare size={18} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleSendMessage}
                                      disabled={!input.trim()}
                                      className={`send-button ${!input.trim() ? 'disabled' : ''}`}
                                    >
                                      <FiSend size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {currentMessages.map((message) => {
                              // Debug logging for thinking data
                              if (message.sender === "ai") {
                                console.log("🔍 Rendering AI message:", {
                                  id: message.id,
                                  hasThinkingData: !!message.thinkingData,
                                  thinkingData: message.thinkingData
                                });
                              }

                              return (
                              <div
                                key={message.id}
                                className={`message-wrapper ${
                                  message.sender === "user"
                                    ? "user-message"
                                    : message.sender === "system"
                                    ? "system-message"
                                    : "ai-message"
                                }`}
                              >
                                {/* Show thinking indicator above AI messages that have thinking data */}
                                {message.sender === "ai" && message.thinkingData && message.thinkingData.thinkingDuration > 0 && (
                                  <div className="thinking-wrapper" style={{ marginBottom: '12px' }}>
                                    <ThinkingIndicator
                                      statusMessage={message.thinkingData.statusMessage}
                                      thinkingContent={message.thinkingData.thinkingContent}
                                      isActive={false}
                                      isComplete={true}
                                      thinkingDuration={message.thinkingData.thinkingDuration}
                                    />
                                  </div>
                                )}
                                {message.sender === "user" ? (
                                  <UserMessage
                                    message={message}
                                    formatTime={formatTime}
                                    onEdit={handleUserMessageEdit}
                                    onCopy={handleUserMessageCopy}
                                  />
                                ) : message.type === "clarification" ? (
                                  <ClarificationMessage
                                    message={message}
                                    formatTime={formatTime}
                                    onSuggestionClick={handleSuggestionClick}
                                  />
                                ) : message.type === "markdown_structured" ? (
                                  <MarkdownStructuredMessage
                                    message={message}
                                    formatTime={formatTime}
                                    splitView={true}
                                    onSplitViewToggle={activateSplitViewForMessage}
                                    isSplitViewActive={activeSplitViewMessageId === message.id}
                                    canToggleSplitView={true}
                                    onFullscreen={handleFullscreenFromDefaultView}
                                    darkMode={darkMode}
                                  />
                                ) : (message.chart && message.rawData) || (message.chart && !message.rawData) ? (
                                  <ChartRenderer
                                    chartString={message.chart}
                                    rawData={message.rawData}
                                    message={message}
                                    formatTime={formatTime}
                                    onFullscreen={handleFullscreenFromDefaultView}
                                    darkMode={darkMode}
                                  />
                                ) : message.rawData && !message.chart ? (
                                  <EnhancedMessage
                                    message={message}
                                    formatTime={formatTime}
                                  />
                                ) : (
                                  <EnhancedMessage
                                    message={message}
                                    formatTime={formatTime}
                                  />
                                )}
                              </div>
                            );
                            })}
                            {isTyping &&
                              activeTypingConversation === currentConversation && (
                                <div className="thinking-wrapper">
                                  {typingText || (
                                    <ThinkingIndicator
                                      statusMessage={statusMessage}
                                      thinkingContent={thinkingContent}
                                      isActive={true}
                                      isComplete={isThinkingComplete}
                                      thinkingDuration={thinkingDuration}
                                      className="split-view-thinking"
                                    />
                                  )}
                                </div>
                              )}
                          </>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      {(currentMessages.length > 0 || isTyping) && (
                        <div className="input-container">
                        <div className="input-wrapper">
                          <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={isTyping && activeTypingConversation === currentConversation ? "AI is responding..." : "Ask anything..."}
                            className="message-input"
                            rows="1"
                            disabled={isTyping && activeTypingConversation === currentConversation}
                          />
                          <AIModelsDropdown
                            darkMode={darkMode}
                            disabled={isTyping && activeTypingConversation === currentConversation}
                            onQuickReportSelect={handleQuickReportSelect}
                          />
                          <CombinedForecastDropdown
                            darkMode={darkMode}
                            disabled={isTyping && activeTypingConversation === currentConversation || isLoadingCombinedForecast}
                            onForecastSelect={handleCombinedForecast}
                          />
                          {isTyping && activeTypingConversation === currentConversation ? (
                            <button
                              onClick={handleStopMessage}
                              className="send-button stop-button"
                            >
                              <FiSquare className="icon" />
                            </button>
                          ) : (
                            <button
                              onClick={handleSendMessage}
                              disabled={input.trim() === ""}
                              className={`send-button ${
                                input.trim() === "" ? "disabled" : ""
                              }`}
                            >
                              <FiSend className="icon" />
                            </button>
                          )}
                        </div>
                      </div>
                      )}
                    </div>
                  </div>

                  {/* Split-view toggle button */}
                  <div className="split-view-divider">
                    <button
                      onClick={toggleSplitView}
                      className="split-view-toggle"
                      title={userPrefersSplitView ? "Switch to combined view" : "Switch to split view"}
                    >
                      {userPrefersSplitView ? <FiChevronRight /> : <FiColumns />}
                    </button>
                  </div>

                  <div className="split-view-right">
                    <div className="split-view-chart-container">
                      <div className="split-view-chart-header">
                        <div className="split-view-chart-title">
                          <FiBarChart2 />
                          Data Visualization
                        </div>
                        <div className="split-view-chart-actions">
                          <button
                            className="split-view-fullscreen-btn"
                            onClick={() => setIsFullscreenChart(true)}
                          >
                            <FiMaximize2 />
                            Fullscreen
                          </button>
                        </div>
                      </div>
                      <div className="split-view-chart-content">
                        {splitViewData && splitViewData.messageType === "markdown_structured" ? (
                          <MarkdownStructuredMessage
                            message={splitViewData.fullMessage}
                            formatTime={formatTime}
                            chartOnly={true}
                            darkMode={darkMode}
                          />
                        ) : splitViewData && (splitViewData.chartData || splitViewData.rawData) ? (
                          <ChartRenderer
                            chartString={splitViewData.chartData}
                            rawData={splitViewData.rawData}
                            message={splitViewData}
                            formatTime={formatTime}
                            darkMode={darkMode}
                          />
                        ) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                            <p>No chart data available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Normal single view layout
                <div className="chat-container">
                  <div className="messages-container">
                    {currentMessages.length === 0 && !isTyping ? (
                      <div className="empty-state">
                        <div className="empty-state-content">
                          <h2 className="empty-state-title">
                            How can I help you today?
                          </h2>
                          <div className="empty-state-input">
                            <div className="input-wrapper">
                              <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={isTyping && activeTypingConversation === currentConversation ? "AI is responding..." : "Ask anything..."}
                                className="message-input"
                                rows="1"
                                disabled={isTyping && activeTypingConversation === currentConversation}
                              />
                              <AIModelsDropdown
                                darkMode={darkMode}
                                disabled={isTyping && activeTypingConversation === currentConversation}
                                onQuickReportSelect={handleQuickReportSelect}
                              />
                              <CombinedForecastDropdown
                                darkMode={darkMode}
                                disabled={isTyping && activeTypingConversation === currentConversation || isLoadingCombinedForecast}
                                onForecastSelect={handleCombinedForecast}
                              />
                              {isTyping && activeTypingConversation === currentConversation ? (
                                <button
                                  onClick={handleStopMessage}
                                  className="send-button stop-button"
                                >
                                  <FiSquare size={18} />
                                </button>
                              ) : (
                                <button
                                  onClick={handleSendMessage}
                                  disabled={!input.trim()}
                                  className={`send-button ${!input.trim() ? 'disabled' : ''}`}
                                >
                                  <FiSend size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {currentMessages.map((message) => {
                          // Debug logging for thinking data
                          if (message.sender === "ai") {
                            console.log("🔍 Rendering AI message (normal view):", {
                              id: message.id,
                              hasThinkingData: !!message.thinkingData,
                              thinkingData: message.thinkingData
                            });
                          }

                          return (
                          <div
                            key={message.id}
                            className={`message-wrapper ${
                              message.sender === "user"
                                ? "user-message"
                                : message.sender === "system"
                                ? "system-message"
                                : "ai-message"
                            }`}
                          >
                            {/* Show thinking indicator above AI messages that have thinking data */}
                            {message.sender === "ai" && message.thinkingData && message.thinkingData.thinkingDuration > 0 && (
                              <div className="thinking-wrapper" style={{ marginBottom: '12px' }}>
                                <ThinkingIndicator
                                  statusMessage={message.thinkingData.statusMessage}
                                  thinkingContent={message.thinkingData.thinkingContent}
                                  isActive={false}
                                  isComplete={true}
                                  thinkingDuration={message.thinkingData.thinkingDuration}
                                />
                              </div>
                            )}
                            {message.sender === "user" ? (
                              <UserMessage
                                message={message}
                                formatTime={formatTime}
                                onEdit={handleUserMessageEdit}
                                onCopy={handleUserMessageCopy}
                              />
                            ) : message.type === "clarification" ? (
                              <ClarificationMessage
                                message={message}
                                formatTime={formatTime}
                                onSuggestionClick={handleSuggestionClick}
                              />
                            ) : message.type === "markdown_structured" ? (
                              <MarkdownStructuredMessage
                                message={message}
                                formatTime={formatTime}
                                onSplitViewToggle={activateSplitViewForMessage}
                                isSplitViewActive={activeSplitViewMessageId === message.id}
                                canToggleSplitView={true}
                                onFullscreen={handleFullscreenFromDefaultView}
                                darkMode={darkMode}
                              />
                            ) : (message.chart && message.rawData) || (message.chart && !message.rawData) ? (
                              <ChartRenderer
                                chartString={message.chart}
                                rawData={message.rawData}
                                message={message}
                                formatTime={formatTime}
                                onFullscreen={handleFullscreenFromDefaultView}
                                darkMode={darkMode}
                              />
                            ) : message.rawData && !message.chart ? (
                              <EnhancedMessage
                                message={message}
                                formatTime={formatTime}
                              />
                            ) : (
                              <EnhancedMessage
                                message={message}
                                formatTime={formatTime}
                              />
                            )}
                          </div>
                        );
                        })}
                        {isTyping &&
                          activeTypingConversation === currentConversation && (
                            <div className="thinking-wrapper">
                              {typingText || (
                                <ThinkingIndicator
                                  statusMessage={statusMessage}
                                  thinkingContent={thinkingContent}
                                  isActive={true}
                                  isComplete={isThinkingComplete}
                                  thinkingDuration={thinkingDuration}
                                  className="normal-view-thinking"
                                />
                              )}
                            </div>
                          )}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  {(currentMessages.length > 0 || isTyping) && (
                    <div className="input-container">
                    <div className="input-wrapper">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={isTyping && activeTypingConversation === currentConversation ? "AI is responding..." : "Ask anything..."}
                        className="message-input"
                        rows="1"
                        disabled={isTyping && activeTypingConversation === currentConversation}
                      />
                      <AIModelsDropdown
                        darkMode={darkMode}
                        disabled={isTyping && activeTypingConversation === currentConversation}
                        onQuickReportSelect={handleQuickReportSelect}
                      />
                      <CombinedForecastDropdown
                        darkMode={darkMode}
                        disabled={isTyping && activeTypingConversation === currentConversation || isLoadingCombinedForecast}
                        onForecastSelect={handleCombinedForecast}
                      />
                      {isTyping && activeTypingConversation === currentConversation ? (
                        <button
                          onClick={handleStopMessage}
                          className="send-button stop-button"
                        >
                          <FiSquare className="icon" />
                        </button>
                      ) : (
                        <button
                          onClick={handleSendMessage}
                          disabled={input.trim() === ""}
                          className={`send-button ${
                            input.trim() === "" ? "disabled" : ""
                          }`}
                        >
                          <FiSend className="icon" />
                        </button>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>
          </React.Fragment>
        )}
        </>
        )}
      </div>

      {/* Fullscreen Chart Modal */}
      <FullscreenChartModal
        isOpen={isFullscreenChart}
        onClose={() => setIsFullscreenChart(false)}
        splitViewData={splitViewData}
        formatTime={formatTime}
        darkMode={darkMode}
      />


    </div>
  );
}

export default App;
