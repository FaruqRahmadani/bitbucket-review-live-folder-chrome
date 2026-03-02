# Privacy Policy for Bitbucket Review Live Folder

**Last Updated:** March 02, 2026

## 1. Introduction
Bitbucket Review Live Folder ("we", "our", or "the Extension") is a Chrome Extension designed to keep your Bitbucket Pull Requests organized in a live tab group. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we handle your data.

## 2. Data Collection and Usage

### 2.1. Authentication Credentials
The Extension requires your **Bitbucket Username / Email** and an **App Password** to function.
- **Storage:** These credentials are stored **locally on your device** using the Chrome Storage API (`chrome.storage.sync`).
- **Usage:** They are used **exclusively** to authenticate requests to the official Bitbucket API (`https://api.bitbucket.org/*`).
- **No External Transmission:** We **do not** transmit, share, or store your credentials on any third-party servers, analytics platforms, or our own servers. Your data never leaves your browser environment except to communicate directly with Bitbucket.

### 2.2. Pull Request Data
The Extension fetches Pull Request information (links, status, reviewers, participants) from Bitbucket.
- **Usage:** This data is used to open, group, and close browser tabs that correspond to PRs requiring your review.
- **Storage:** This data is not permanently stored. It is fetched in real-time or kept briefly in memory while the extension is running.

## 3. Third-Party Services
The Extension communicates directly with:
- **Bitbucket API:** To fetch repository and pull request data. Please refer to [Atlassian's Privacy Policy](https://www.atlassian.com/legal/privacy-policy) for how they handle your data.

We do **not** use any third-party analytics, tracking cookies, or advertising networks.

## 4. Data Security
- Your App Password is stored in your browser's extension storage sandbox, which is accessible only by this Extension.
- All communication with Bitbucket occurs over a secure, encrypted HTTPS connection.

## 5. Your Rights
Since all data is stored locally on your device:
- **Access & Correction:** You can view and update your stored credentials at any time via the Extension's Settings page.
- **Deletion:** You can delete your stored data by uninstalling the Extension or clearing the Extension's data via Chrome's settings.

## 6. Contact Us
If you have any questions about this Privacy Policy, please contact the developer via the [GitHub Repository](https://github.com/FaruqRahmadani/bitbucket-review-live-folder-chrome).