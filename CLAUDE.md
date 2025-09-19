# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Catch-Web-WTX is a browser extension built with WXT and Vue 3 that helps users efficiently extract web page information, generate AI summaries, and engage in intelligent conversations. The tool can extract text, images, links, and other information from web pages, and uses AI technology to generate content summaries and extract key information, while providing intelligent dialogue functionality based on web page content.

## Architecture Overview

The project follows a browser extension architecture based on the WXT framework with Vue 3 as the frontend framework. The main modules include:

1. **Data Extraction Module** - Extracts various information from the current browsing page
2. **AI Summary Module** - Uses AI technology to generate webpage content summaries and key information
3. **Intelligent Dialogue Module** - Engages in intelligent dialogue based on webpage content and AI models
4. **Settings Management Module** - Manages user configurations and extension settings
5. **UI Components Module** - Provides user interface components

## Commonly Used Commands

### Development Environment Setup

1. Ensure Node.js is installed (recommended version 16+)
2. Install pnpm: `npm install -g pnpm`

### Dependency Installation

```bash
pnpm install
```

### Development Mode

```bash
# Chrome/Edge
pnpm dev

# Firefox
pnpm dev:firefox
```

### Production Build

```bash
# Chrome/Edge
pnpm build

# Firefox
pnpm build:firefox
```

### Extension Packaging

```bash
# Chrome/Edge
pnpm zip

# Firefox
pnpm zip:firefox
```

### Type Checking

```bash
pnpm compile
```

## Code Structure

```
entrypoints/
├── background.ts        # Background script handling core extension logic
├── content.ts           # Content script interacting with web pages
└── sidepanel/           # Main UI and functionality implementation
    ├── App.vue          # Main application component
    ├── components/      # UI component library
    ├── composables/     # Core business logic encapsulation
    ├── constants/       # Project constants configuration
    ├── types/           # TypeScript type definitions
    ├── utils/           # Utility functions
    └── main.ts          # Module entry point
```

## Key Implementation Details

### Data Flow

1. **Content Script** (`content.ts`) - Injected into web pages to extract information
2. **Background Script** (`background.ts`) - Handles extension core logic and communication
3. **Side Panel** (`sidepanel/`) - Provides the main user interface with tab-based navigation:
   - Results tab: Displays extracted web page data
   - AI tab: Shows AI-generated summaries and key information
   - Chat tab: Enables intelligent dialogue based on webpage content
   - Settings tab: Manages user preferences and configurations

### Core Composables

- `useDataExtractor` - Extracts webpage content (text, images, links, metadata)
- `useAISummary` - Generates AI summaries using OpenAI-compatible APIs
- `useChat` - Manages chat functionality with AI models
- `useSettings` - Handles user preferences and configurations
- `useBookmark` - Manages bookmarked pages and saved data

### AI Integration

The project integrates AI functionality using OpenAI-compatible APIs:
- Default configuration uses Alibaba Cloud's qwen-turbo model
- Configurable through settings (API key, base URL, model selection)
- Two summary types: full content summary and key information extraction

### Data Storage

- Uses Supabase for persistent data storage
- Browser storage for temporary/cache data
- Bookmark functionality to save extracted data and AI summaries

## Development Guidelines

1. Use TypeScript for all development
2. Follow Vue 3 Composition API patterns
3. Adhere to WXT framework best practices
4. Separate components and logic using composables
5. Use ESLint and Prettier for consistent code style

## Testing Strategy

Currently, the project does not include automated testing. Recommended additions:
1. Unit tests for core logic in composables
2. Component tests for Vue components
3. End-to-end tests for complete functionality flows

## Important Dependencies

- **WXT** - Browser extension development framework
- **Vue 3** - Frontend framework with Composition API
- **Supabase** - Backend-as-a-Service for data storage
- **OpenAI** - SDK for AI model integration
- **Marked** - Markdown parsing library