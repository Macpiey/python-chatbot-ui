// Environment configuration for API endpoints
// Set prod to true for production environment, false for development

const config = {
  // Environment flag
  prod: false, // Change this to true for production
  
  // API endpoints based on environment
  get apiBaseUrl() {
    return this.prod 
      ? "http://chatbot-ai-alb-446251557.ap-south-1.elb.amazonaws.com" 
      : "http://chatbot-ai-alb-446251557.ap-south-1.elb.amazonaws.com";
  },
  
  get chatStreamUrl() {
    return `${this.apiBaseUrl}/chatstream`;
  },
  
  // Quick reports API (AWS endpoint - same for both environments)
  quickReportsApiUrl: "https://h3mpcj10p8.execute-api.ap-south-1.amazonaws.com/dev/read",

  // Auto-update configuration (GitHub Releases API)
  githubOwner: "Macpiey",
  githubRepo: "python-chatbot-ui",
  get updateCheckUrl() {
    return `https://api.github.com/repos/${this.githubOwner}/${this.githubRepo}/releases/latest`;
  },
  
  // Other configuration options
  get environment() {
    return this.prod ? "production" : "development";
  }
};

export default config;
