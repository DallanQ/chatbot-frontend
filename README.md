<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Uses a custom backend for AI model integration
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This application has been configured to use a custom backend for AI model integration. It requires the following environment variables:

- `API_BASE_URL`: The base URL for your custom API (e.g., https://api.yourdomain.com)
- `API_SECRET`: Your authentication secret key for the custom API

The backend API should support:

1. Chat completion streams using the optimized SSE format
2. Title generation for new conversations
3. Proper authentication via Bearer token

The chat API will receive:
- User messages and conversation history
- System prompts and context information
- User type and permissions data

## Deployment

### AWS Amplify Deployment

When deploying to AWS Amplify, add all environment variables in the Amplify console under "Environment variables":

- `AUTH_SECRET`: Generate a random secret for authentication (use https://generate-secret.vercel.app/32)
- `API_BASE_URL`: Your custom backend API base URL (e.g., https://api.yourdomain.com)
- `API_SECRET`: Authentication secret key for your custom API
- `REDIS_URL`: Redis connection URL (if using Redis)
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

The build process will automatically create a `.env.production` file with these variables and set `AUTH_TRUST_HOST=true` for AWS Amplify's reverse proxy.

> **⚠️ Security Note**: This approach stores secrets as environment variables that are accessible during build time and written to `.env.production`. While this simplifies deployment, it's not a security best practice. For production applications with sensitive data, consider using AWS Parameter Store or Secrets Manager for runtime secret injection instead. This tradeoff was made for deployment simplicity.

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

```bash
make install
make dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

## Testing

This application uses Playwright for end-to-end testing. **Important:** Since the frontend now integrates with a custom backend API, you must have the backend running before running tests.

### Prerequisites

1. **Backend Setup**: Ensure your custom backend is running with these commands:
   ```bash
   # In your backend directory:
   make dev
   ```

2. **Frontend Test Setup** (one-time):
   ```bash
   make setup-tests
   ```

### Running Tests

```bash
# Run all tests
make test-all

# Run tests with UI
make test-ui
```

### Troubleshooting Tests

- If the "Ada can resume chat generation..." tests fail intermittently, you may need to increase the `SECOND_REQUEST_DELAY` constant in `/tests/routes/chat.test.ts`. This delay ensures the second request arrives while the first request is actively streaming.

## Backend Integration

This project now uses a custom backend API for all AI model interactions. Key aspects of the implementation:

1. **Server-Side Integration**: All API calls happen server-side, keeping credentials secure
2. **Streaming Protocol**: Uses the AI SDK Data Stream Protocol format
3. **Centralized Module**: Backend API logic is centralized in `/lib/api/backend.ts`

