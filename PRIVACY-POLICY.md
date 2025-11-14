# Privacy Policy

**Last Updated: November 14, 2025**

**Slack Question Router** ("we", "us", "our", or "the Application")

## Introduction

This Privacy Policy explains how Slack Question Router collects, uses, stores, and protects your data when you use our Slack application. We are committed to transparency and protecting your privacy in compliance with GDPR, CCPA, and other applicable data protection laws.

**By using Slack Question Router, you consent to the data practices described in this policy.**

## 1. Information We Collect

### 1.1 Data Collected Automatically

When you install and use Slack Question Router, we automatically collect:

**Workspace Information:**
- Workspace ID and name
- Workspace team domain
- Installation timestamp

**Channel Information:**
- Channel IDs and names where the bot is added
- Channel type (public/private)
- Channel monitoring status

**User Information:**
- User IDs (Slack's unique identifiers)
- User display names
- User real names (when available from Slack API)
- User timezone (for analytics only)

**Message Data:**
- Message content from monitored channels (only to detect questions)
- Message timestamps
- Thread timestamps (for tracking replies)
- Message author information

**Reaction Data:**
- Reaction types (✅, 🚫, ❓, etc.)
- User who added/removed reactions
- Timestamp of reaction events

**User Group Information:**
- User group IDs and handles
- User group names
- Members of user groups (for escalation purposes)

### 1.2 Data You Provide

**Configuration Data:**
- Escalation timing settings (minutes before escalation)
- Answer detection mode preferences (emoji_only, thread_auto, hybrid)
- Escalation targets (users, user groups, channels)
- Custom escalation levels and priorities

**Command Usage:**
- Slash command invocations (e.g., `/qr-stats`, `/qr-config`)
- Command parameters and options
- User who executed commands

### 1.3 Data We Do NOT Collect

We explicitly do NOT collect:

- Email addresses (removed in compliance update)
- Password or authentication credentials (handled by Slack)
- Direct messages or private conversations (unless explicitly monitored)
- Files or attachments
- Slack workspace billing information
- Sensitive personal data (health, financial, biometric data)
- Data from channels where the bot is not added

## 2. How We Use Your Data

### 2.1 Primary Purposes

We use your data exclusively for:

**Question Detection and Tracking:**
- Identifying questions in monitored channels using pattern matching
- Storing questions in our database for tracking
- Adding visual feedback (❓ emoji) to detected questions

**Answer Detection:**
- Monitoring reactions (✅) to mark questions as answered
- Tracking thread replies (in thread_auto and hybrid modes)
- Calculating response times and answer rates

**Escalation Management:**
- Notifying designated users, user groups, or channels when questions remain unanswered
- Sending direct messages to escalation targets with question context
- Posting alerts in escalation channels with links to original questions

**Analytics and Statistics:**
- Generating workspace-level question statistics
- Calculating average response times
- Providing per-channel breakdowns
- Displaying trends over time

**Service Operation:**
- Maintaining workspace configuration and preferences
- Authenticating API requests to Slack
- Logging errors and system events for debugging
- Monitoring service health and performance

### 2.2 What We Do NOT Do With Your Data

We explicitly do NOT:

- **Sell your data** to third parties
- **Share your data** for marketing or advertising purposes
- **Use your data to train AI models** or for any purpose outside the Application
- **Access data from channels** where the bot is not installed
- **Read or process direct messages** between users
- **Retain data indefinitely** (see Data Retention below)

## 3. Data Retention

We maintain strict data retention policies to minimize data storage and comply with GDPR Article 5 (storage limitation):

### 3.1 Question Data Retention

| Data Type | Retention Period | Auto-Deletion |
|-----------|------------------|---------------|
| **Answered questions** | 90 days | Yes, automatic |
| **Dismissed questions** | 30 days | Yes, automatic |
| **Unanswered questions** | 365 days | Yes, automatic |

**Automated Cleanup:**
- Our system runs daily cleanup jobs at 2 AM UTC
- Old questions are permanently deleted (not soft-deleted)
- Deletion is logged for audit purposes

### 3.2 Configuration Data Retention

| Data Type | Retention Period |
|-----------|------------------|
| **Workspace settings** | While you use the Service |
| **Escalation targets** | While you use the Service |
| **Channel monitoring settings** | While you use the Service |

**Upon Uninstallation:**
- All configuration data is deleted within 30 days
- Question data follows the retention schedule above
- Logs are retained for 90 days for security purposes

### 3.3 Customizing Retention

Workspace administrators can request custom retention periods by contacting support@slackquestionrouter.com. Custom retention must comply with applicable laws and our data minimization principles.

## 4. Data Storage and Security

### 4.1 Where We Store Your Data

Your data is stored in:

**Primary Database:**
- PostgreSQL database hosted on secure cloud infrastructure
- Location: [Specify region, e.g., "US East (Virginia)" or "EU (Frankfurt)"]
- Backup location: [Specify backup region if different]

**Application Servers:**
- Hosted on [Railway/Render/AWS/etc.]
- Location: [Specify region]

### 4.2 Security Measures

We implement industry-standard security practices:

**Encryption:**
- All data in transit is encrypted using TLS 1.2 or higher
- Database connections use SSL/TLS encryption
- Slack API tokens are encrypted at rest

**Access Controls:**
- Role-based access control (RBAC) for administrative functions
- Multi-factor authentication for system administrators
- Principle of least privilege for all access

**Infrastructure Security:**
- Regular security patches and updates
- Firewall protection and network segmentation
- Intrusion detection and monitoring
- DDoS protection

**Application Security:**
- Input validation and sanitization
- Protection against SQL injection, XSS, and CSRF attacks
- Rate limiting to prevent abuse
- Secure coding practices and code reviews

**Monitoring and Logging:**
- Comprehensive logging of security events
- Real-time alerting for suspicious activity
- Regular security audits and penetration testing

### 4.3 Security Incident Response

In the event of a data breach:

1. We will investigate and contain the incident within 24 hours
2. Affected users will be notified within 72 hours (GDPR requirement)
3. We will notify Slack at security@slack.com as required
4. We will provide details on the breach scope and remediation steps
5. We will file reports with relevant data protection authorities if required

**Report security concerns to:** security@slackquestionrouter.com

## 5. Data Sharing and Third Parties

### 5.1 Third-Party Services

We share limited data with these third-party service providers:

**Slack Technologies, LLC:**
- Purpose: Core application functionality via Slack API
- Data shared: All data described in Section 1
- Privacy Policy: https://slack.com/privacy-policy

**Database Provider (e.g., Supabase, AWS RDS):**
- Purpose: Data storage and management
- Data shared: All application data
- Security: Encrypted connections, access controls

**Hosting Provider (e.g., Railway, Render, AWS):**
- Purpose: Application hosting and infrastructure
- Data shared: Application logs, system metrics
- Security: Secure cloud infrastructure with compliance certifications

**Monitoring Services (if applicable):**
- Purpose: Error tracking and performance monitoring
- Data shared: Error logs, performance metrics (anonymized)
- No user content or personal data is shared

### 5.2 No Third-Party Marketing

We do NOT share your data with:
- Advertising networks
- Marketing platforms
- Data brokers
- Analytics services (except anonymized usage metrics)

### 5.3 Legal Requirements

We may disclose your data if required by law:
- To comply with legal obligations or court orders
- To protect our rights, property, or safety
- To investigate fraud or security issues
- In connection with a merger, acquisition, or sale of assets (with notice)

## 6. Your Rights and Choices

### 6.1 GDPR Rights (EU/EEA/UK Users)

If you are located in the European Economic Area, United Kingdom, or other GDPR-applicable jurisdictions:

**Right to Access (Article 15):**
- Request a copy of all personal data we hold about you
- Receive data in structured, machine-readable format (JSON or CSV)

**Right to Rectification (Article 16):**
- Request correction of inaccurate or incomplete data
- Update your configuration settings via `/qr-config`

**Right to Erasure (Article 17) - "Right to be Forgotten":**
- Request deletion of your personal data
- Use `/qr-delete-data` command to delete specific questions
- Uninstall the app to delete all workspace data

**Right to Restrict Processing (Article 18):**
- Request limitation of how we process your data
- Temporarily disable monitoring for specific channels

**Right to Data Portability (Article 20):**
- Receive your data in portable format (JSON, CSV)
- Transfer data to another service

**Right to Object (Article 21):**
- Object to processing for specific purposes
- Opt-out of certain data collection (where applicable)

**Right to Withdraw Consent (Article 7):**
- Withdraw consent at any time by uninstalling the app

**Right Not to Be Subject to Automated Decision-Making (Article 22):**
- Our question detection is pattern-based, not automated decision-making
- No automated decisions with legal or significant effects are made

### 6.2 CCPA Rights (California Users)

If you are a California resident:

**Right to Know:**
- Request disclosure of personal data collected, used, or shared

**Right to Delete:**
- Request deletion of your personal data

**Right to Opt-Out:**
- Opt-out of sale of personal data (Note: We do NOT sell personal data)

**Right to Non-Discrimination:**
- We will not discriminate against you for exercising your rights

### 6.3 How to Exercise Your Rights

**Via Slack Commands:**
- `/qr-delete-data` - Delete specific question data
- Uninstall the app - Delete all workspace data

**Via Email:**
- **Data requests:** privacy@slackquestionrouter.com
- **General support:** support@slackquestionrouter.com
- **Security concerns:** security@slackquestionrouter.com

**Response Time:**
- We will respond to all requests within 30 days (GDPR requirement)
- Complex requests may take up to 60 days with notification

**Verification:**
- We may request verification of your identity to protect your data
- Typically requires confirmation from workspace administrator

## 7. Children's Privacy

Slack Question Router is not intended for use by individuals under 16 years of age. We do not knowingly collect personal data from children. If we discover that we have collected data from a child, we will delete it immediately.

If you believe a child has provided us with personal data, contact us at privacy@slackquestionrouter.com.

## 8. International Data Transfers

### 8.1 Cross-Border Transfers

If you are located outside the region where our servers are hosted, your data may be transferred internationally. We ensure adequate protection through:

- **Standard Contractual Clauses (SCCs)** approved by the European Commission
- **Adequacy decisions** for transfers to approved jurisdictions
- **Privacy Shield frameworks** (where applicable)

### 8.2 Data Localization

For users with specific data residency requirements, we can discuss:
- Regional hosting options
- On-premises deployment (enterprise plans)
- Custom data processing agreements

Contact sales@slackquestionrouter.com for enterprise data localization.

## 9. Cookies and Tracking

### 9.1 Cookies

Our Slack application does NOT use cookies. All authentication is handled through Slack's OAuth tokens.

If we provide a web dashboard in the future, we will update this policy to describe cookie usage.

### 9.2 Analytics

We collect anonymized usage analytics to improve the Application:
- Command usage frequency (no content)
- Feature adoption rates
- Error rates and types
- Performance metrics

**Analytics are anonymized and do not contain:**
- Message content
- User names or identifiers
- Workspace-specific information

## 10. Changes to This Privacy Policy

### 10.1 Notification of Changes

We may update this Privacy Policy periodically. Material changes will be notified via:

- **Email notification** to workspace administrators
- **In-app notification** when using the Application
- **Updated "Last Updated" date** at the top of this document
- **Changelog** posted on our website

### 10.2 Effective Date

Changes take effect:
- **Immediately** for new users
- **30 days after notification** for existing users

Continued use after changes take effect constitutes acceptance of the updated Privacy Policy.

### 10.3 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | November 14, 2025 | Initial privacy policy |

## 11. Compliance Certifications

We are committed to maintaining compliance with:

- **GDPR** (General Data Protection Regulation) - EU/EEA/UK
- **CCPA** (California Consumer Privacy Act) - California, USA
- **Slack App Security Requirements**
- **SOC 2 Type II** [If applicable - add when certified]
- **ISO 27001** [If applicable - add when certified]

## 12. Data Protection Officer

For privacy-related inquiries, contact our Data Protection Officer:

**Email:** dpo@slackquestionrouter.com
**Response Time:** Within 5 business days

For EU/EEA users, you also have the right to lodge a complaint with your local data protection authority.

## 13. Contact Information

**General Privacy Questions:**
Email: privacy@slackquestionrouter.com

**Data Subject Requests:**
Email: privacy@slackquestionrouter.com
Subject Line: "Data Subject Request - [Your Workspace Name]"

**Security Incidents:**
Email: security@slackquestionrouter.com

**General Support:**
Email: support@slackquestionrouter.com
Website: [Your Website]

**Mailing Address:**
[Your Company Name]
[Street Address]
[City, State, ZIP]
[Country]

---

## Summary of Key Points

**What data we collect:**
- Message content from monitored channels (for question detection only)
- User IDs, display names, and interaction data
- Workspace and channel configuration

**How we use it:**
- Detect and track questions
- Route unanswered questions to support teams
- Generate statistics and analytics

**How long we keep it:**
- Answered questions: 90 days
- Dismissed questions: 30 days
- Unanswered questions: 365 days
- Configuration: While you use the Service

**Your rights:**
- Access, correct, delete, or export your data
- Withdraw consent by uninstalling the app
- Contact privacy@slackquestionrouter.com

**We do NOT:**
- Sell your data
- Share data for marketing
- Use data to train AI models
- Retain data indefinitely

---

**Version 1.0**
**Effective Date: November 14, 2025**
**Last Reviewed: November 14, 2025**
