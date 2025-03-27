# Tech Health Appendix Generator

## Setting Up GitHub OAuth Integration

To integrate GitHub OAuth into your project, you'll need to create a GitHub OAuth key and implement the callback for authentication. Follow these steps to set up OAuth for your Next.js application.

### Step 1: Create an OAuth Key on GitHub

1. **Go to GitHub Developer Settings**: Navigate to [GitHub Developer Settings](https://github.com/settings/developers).
2. **Create a new OAuth Application**:
   - Click on "New OAuth App."
   - Fill in the following fields:
     - **Application Name**: Choose a name for your application (e.g., "Tech Health Appendix").
     - **Homepage URL**: The URL where your app will be hosted (usually `http://localhost:3000` during development).
     - **Authorization Callback URL**: The URL where GitHub will redirect users after authentication, e.g., `http://localhost:3000/api/auth/callback/github`.
   
3. **Save the key**: Once you save the application, you'll receive a `Client ID` and `Client Secret`. Keep these credentials safe as you'll need them for the next steps.

```GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-string-here
OPENAI_API_KEY=your-openai-api-key```

### Step 2: Install Dependencies

You need to install `next-auth` to handle the authentication with GitHub.

1. Install `next-auth` in your Next.js project:

   ```bash
   npm install next-auth


## One-Line Pitch
A dynamic pitch deck appendix generator that audits your codebase to build investor confidence.

## Problem Addressed
Startups struggle to convincingly demonstrate technical robustness and manage tech risk in their pitch decks.

## Target Audience / Market
Early-stage startups seeking Series A funding who need to validate their technical health.

## Solution Overview
Users provide read-only access to their GitHub/CI-CD systems; the tool then analyzes code quality, deployment frequency, and technical debt, generating a polished “Tech Health Appendix” complete with peer benchmarks and an optimization roadmap.

## Unique Value Proposition (10x Better)
Transforms technical weaknesses into strategic strengths by offering clear, data-driven insights that resonate with investors.

## Key Features / MVP Feature Ideas
1. Integration with GitHub/CI-CD systems
2. Analysis of code quality, deployment metrics, and tech debt
3. Automated generation of a Tech Health Appendix
4. Peer benchmarking and actionable optimization recommendations

## Notes / Additional Considerations
- Ensure secure handling of code data.
- Consider future expansion to other technical metrics, like security vulnerabilities and system scalability.

## Getting Started

To run the project locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone <repository-url>
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Run the development server:
    ```bash
    npm run dev
    ```
