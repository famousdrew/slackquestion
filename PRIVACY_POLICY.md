# Privacy Policy

**Last Updated:** January 14, 2025

**Effective Date:** January 14, 2025

## Our Commitment to Your Privacy

At Slack Question Router, we believe in being transparent about how we collect and use your data. This privacy policy explains in plain language what information we collect, why we collect it, and what rights you have regarding your data.

---

## Quick Summary

Here's what you need to know:

- **What we collect:** Questions you post in Slack channels where our bot is installed, along with basic workspace and user information needed to route those questions
- **Why we collect it:** To detect unanswered questions and escalate them to the right people on your team
- **Your data, your control:** You can request access, deletion, or correction of your data at any time
- **No selling:** We never sell your personal information to anyone, ever
- **Data minimization:** We only collect what we need to provide the service

---

## 1. Who We Are

Slack Question Router ("we," "us," or "our") provides a Slack application that automatically detects questions in your Slack workspace and routes them to appropriate team members when they go unanswered.

**Contact Information:**
- Service Provider: [Your Company Name/Your Name]
- Email: [Your Contact Email]
- Address: [Your Business Address]

For privacy-specific inquiries, please email: [Your Privacy Contact Email]

---

## 2. What Information We Collect

### 2.1 Information from Slack

When you install our app in your Slack workspace, we collect:

**Workspace Information:**
- Workspace/team ID and name
- Channel IDs and names (only for channels where the bot is invited)

**User Information:**
- Slack user IDs
- Display names and real names
- User group memberships (for escalation routing)
- Activity timestamps (when questions are asked or answered)

**Message Content:**
- Text of messages identified as questions
- Message timestamps
- Thread IDs (to track conversations)
- Emoji reactions (specifically ✅, 🚫, and ❓ used to manage question status)

**Authentication Data:**
- OAuth tokens (encrypted and securely stored)
- Bot permissions and scopes

**What We DON'T Collect:**
- We do NOT collect email addresses
- We do NOT collect private direct messages
- We do NOT collect messages that aren't identified as questions
- We do NOT track your browsing activity outside of Slack
- We do NOT collect IP addresses or location data

### 2.2 Generated Information

We create and store:

- Question status (answered/unanswered/dismissed)
- Escalation levels and timestamps
- Response time statistics
- Keywords extracted from questions (for future matching)
- Usage analytics (number of questions, answer rates, etc.)

### 2.3 Automatically Collected Information

Our hosting infrastructure may automatically log:
- Service uptime and performance metrics
- Error logs (which may contain user IDs for debugging)
- Database query performance

---

## 3. How We Use Your Information

### 3.1 Primary Service Functions

We use your information to:

1. **Detect Questions:** Identify messages that are questions using pattern matching
2. **Track Status:** Monitor whether questions have been answered
3. **Route & Escalate:** Notify appropriate team members about unanswered questions
4. **Provide Feedback:** Add emoji reactions to acknowledge detected questions
5. **Display Statistics:** Show workspace admins metrics about question response times

### 3.2 Service Improvement

We may use aggregated, anonymized data to:
- Improve question detection algorithms
- Optimize escalation timing
- Identify common issues or feature requests
- Monitor service performance and reliability

### 3.3 Legal Basis for Processing (GDPR)

We process your personal data based on:

- **Legitimate Interest (Article 6(1)(f) GDPR):** We have a legitimate interest in providing question routing services that help teams respond to inquiries efficiently
- **Contract Performance (Article 6(1)(b) GDPR):** Processing is necessary to deliver the service you've requested by installing our app
- **Consent (Article 6(1)(a) GDPR):** By installing the app, workspace administrators consent to processing on behalf of their organization

---

## 4. How We Share Your Information

### 4.1 Within Your Slack Workspace

By design, our service shares information within your workspace:
- Questions are escalated to configured team members, user groups, or channels
- Statistics may be visible to workspace administrators
- Question status is visible to users in the same channels

### 4.2 Third-Party Service Providers

We share data with the following categories of service providers:

**Cloud Infrastructure Providers:**
- **Database hosting** (e.g., Supabase/PostgreSQL) - stores all question data
- **Application hosting** (e.g., Railway, Render) - runs the bot service
- These providers have access to data only as necessary to provide infrastructure services

**Slack, Inc.:**
- We use Slack's APIs to receive and send messages
- Slack's own privacy policy governs their handling of workspace data
- Visit: https://slack.com/privacy-policy

**No Other Third Parties:**
- We do NOT share data with analytics companies
- We do NOT share data with advertisers
- We do NOT sell or rent your information to anyone

### 4.3 Legal Requirements

We may disclose information if required to:
- Comply with valid legal processes (subpoenas, court orders)
- Protect our rights, property, or safety
- Protect the rights, property, or safety of our users
- Prevent fraud or security threats

We will notify you of legal requests unless prohibited by law.

---

## 5. International Data Transfers

### 5.1 Where We Store Data

Your data may be stored and processed in:
- United States (primary hosting region)
- European Union (if using EU-region database providers)

The specific location depends on your chosen hosting configuration.

### 5.2 GDPR Safeguards

For data transfers from the European Economic Area (EEA) to countries without adequate protection:

- We rely on **Standard Contractual Clauses (SCCs)** approved by the European Commission
- Our infrastructure providers (e.g., AWS, Google Cloud, Supabase) maintain appropriate certifications
- We conduct transfer impact assessments to ensure data protection

### 5.3 UK GDPR

For UK users, we comply with the UK GDPR and Data Protection Act 2018, including using International Data Transfer Agreements/Addendums approved by the UK ICO.

---

## 6. Data Retention

### 6.1 Active Data

- **Questions:** Retained while in "unanswered" status and for statistical purposes after being answered
- **User Information:** Retained while the workspace has an active installation
- **OAuth Tokens:** Retained until the app is uninstalled

### 6.2 Retention Periods

- **Question Data:** Retained indefinitely for analytics unless deletion is requested
- **Escalation Logs:** Retained for 12 months
- **Error Logs:** Retained for 90 days
- **Statistics:** Aggregated statistics may be retained indefinitely (anonymized)

### 6.3 Your Right to Request Deletion

You can request deletion of your data at any time (see Section 8 - Your Rights). Upon request, we will delete data within 30 days unless we have a legal obligation to retain it.

---

## 7. Data Security

### 7.1 Security Measures

We implement industry-standard security measures:

**Technical Safeguards:**
- Encryption in transit (TLS/SSL) for all data transmission
- Encryption at rest for database storage
- OAuth tokens stored encrypted in the database
- Regular security updates and patches

**Access Controls:**
- Minimum necessary access to production data
- Multi-factor authentication (MFA) for administrator accounts
- Audit logging of data access

**Infrastructure Security:**
- Secure hosting with reputable cloud providers
- Regular backups (daily automated backups retained for 7 days)
- Disaster recovery procedures

### 7.2 Your Responsibility

You should:
- Protect your Slack workspace credentials
- Configure appropriate channel permissions in Slack
- Monitor which channels the bot is invited to
- Review escalation settings to ensure appropriate team members are notified

### 7.3 Breach Notification

In the event of a data breach affecting personal information:
- We will notify affected workspace administrators within 72 hours (GDPR requirement)
- We will provide details about the breach, its impact, and remediation steps
- We will notify relevant supervisory authorities as required by law

---

## 8. Your Privacy Rights

### 8.1 Rights Under GDPR (for EU/UK Users)

You have the right to:

1. **Right of Access (Article 15):** Request a copy of all personal data we hold about you
2. **Right to Rectification (Article 16):** Correct inaccurate or incomplete data
3. **Right to Erasure/"Right to be Forgotten" (Article 17):** Request deletion of your data
4. **Right to Restriction (Article 18):** Request we limit processing of your data
5. **Right to Data Portability (Article 20):** Receive your data in a machine-readable format
6. **Right to Object (Article 21):** Object to processing based on legitimate interests
7. **Rights Related to Automated Decision-Making (Article 22):** We do not use automated decision-making or profiling

**How to Exercise Your Rights:**
- Email us at: [Your Privacy Contact Email]
- Include your Slack workspace ID and user ID
- We will respond within 30 days (GDPR requirement)

**Right to Lodge a Complaint:**
You can file a complaint with your local supervisory authority:
- EU users: Find your authority at https://edpb.europa.eu/about-edpb/board/members_en
- UK users: Information Commissioner's Office (ICO) at https://ico.org.uk/

### 8.2 Rights Under CCPA (for California Residents)

California residents have additional rights under the California Consumer Privacy Act (CCPA):

**Right to Know:**
- What personal information we collect
- Sources of that information
- Business purposes for collection
- Categories of third parties we share with
- Specific pieces of information we hold about you

**Right to Delete:**
- Request deletion of personal information (subject to exceptions)

**Right to Opt-Out:**
- **We do NOT sell personal information** - this right does not apply as we have nothing to opt out of

**Right to Non-Discrimination:**
- We will not discriminate against you for exercising your privacy rights
- Same service quality and pricing regardless of requests

**How to Exercise CCPA Rights:**
- Email: [Your Privacy Contact Email]
- We will verify your identity and respond within 45 days
- You may designate an authorized agent to make requests on your behalf

**CCPA Metrics (Annual Disclosure):**
We will publish annual metrics about:
- Number of access requests received and fulfilled
- Number of deletion requests received and fulfilled
- Median response time

### 8.3 Rights Under Other Privacy Laws

**Canada (PIPEDA):**
- Right to access personal information
- Right to challenge accuracy
- Right to withdraw consent

**Nevada Residents:**
- Right to opt-out of the sale of personal information (we do not sell data)

**Other U.S. State Laws:**
- Virginia CDPA, Colorado CPA, Utah UCPA, Connecticut CTDPA - similar rights to CCPA

---

## 9. California-Specific Disclosures

### 9.1 CCPA Categories of Information

In the last 12 months, we have collected the following categories of personal information:

| Category | Examples from Our Service | Collected | Business Purpose |
|----------|---------------------------|-----------|------------------|
| **Identifiers** | Slack user ID, workspace ID, display name, real name | Yes | Service functionality, question routing |
| **Personal information (Cal. Civ. Code § 1798.80(e))** | Name | Yes | Displaying who asked questions |
| **Commercial information** | N/A | No | N/A |
| **Biometric information** | N/A | No | N/A |
| **Internet or network activity** | Message content (questions only), timestamps | Yes | Question detection, tracking |
| **Geolocation data** | N/A | No | N/A |
| **Sensory data** | N/A | No | N/A |
| **Professional or employment information** | User group memberships (e.g., "support team") | Yes | Escalation routing |
| **Education information** | N/A | No | N/A |
| **Inferences** | Keywords extracted from questions, expertise matching | Yes | Future question routing |

### 9.2 Sources of Information

We collect information from:
- Directly from you (via Slack when you post questions)
- Automatically (when the bot monitors channels)
- From your Slack workspace (names, IDs, group memberships)

### 9.3 Business Purposes for Collection

We collect and process data for:
- **Service Delivery:** Detecting questions and routing to team members
- **Analytics:** Providing statistics to workspace administrators
- **Service Improvement:** Improving question detection algorithms
- **Security:** Protecting against fraud and abuse
- **Debugging:** Identifying and fixing technical issues
- **Legal Compliance:** Meeting regulatory obligations

### 9.4 Third Parties We Share With

We share information with:
- **Service providers** (hosting, database) - for infrastructure
- **Slack, Inc.** - as required to use Slack's platform
- **Legal authorities** - only if required by law

### 9.5 Sale of Personal Information

**We do NOT sell personal information** and have not sold personal information in the preceding 12 months.

### 9.6 "Shine the Light" Law

California residents may request information about sharing personal information with third parties for direct marketing purposes. As we do not share data for marketing purposes, this does not apply.

---

## 10. Children's Privacy

Our service is not directed to children under 16 (or 13 in the U.S.).

- We do not knowingly collect information from children
- Slack's Terms of Service require users to be 16+ (or have parental consent)
- If we learn we've collected data from a child, we will delete it promptly
- Parents/guardians can contact us to request deletion

---

## 11. Cookies and Tracking

### 11.1 Our Use of Cookies

**We do NOT use cookies or tracking technologies** for the core service functionality.

Our OAuth installation flow uses:
- **Session cookies** - Strictly necessary for the OAuth authentication process
- These cookies expire after installation is complete

### 11.2 Third-Party Tracking

- We do NOT use third-party analytics (no Google Analytics, no tracking pixels)
- We do NOT use advertising cookies
- Slack may set their own cookies - see Slack's privacy policy

---

## 12. Changes to This Privacy Policy

### 12.1 How We Update This Policy

We may update this privacy policy to reflect:
- Changes in our practices
- Changes in applicable laws
- New features or functionality
- User feedback

### 12.2 Notice of Changes

When we make changes:
- **Material changes:** We will notify workspace administrators via email or Slack message at least 30 days before they take effect
- **Minor changes:** We will update the "Last Updated" date at the top
- **Your continued use** after changes means you accept the new policy

### 12.3 Version History

You can view previous versions of this policy by contacting us.

---

## 13. Data Controller vs. Data Processor

### 13.1 Our Role

**For workspace administrators:** We act as a **data processor** - you (the workspace admin/organization) are the **data controller** who determines what data is processed.

**For individual users:** Your workspace administrator is typically the data controller. We process data on their behalf.

### 13.2 Your Responsibilities as a Workspace Admin

If you install this app, you should:
- Inform your team members about the app's data collection
- Ensure you have legal authority to install the app
- Configure the app appropriately for your organization's needs
- Respond to data subject requests from your team members
- Maintain compliance with your own privacy obligations

---

## 14. Additional Information for EU/UK Users

### 14.1 Legal Representatives

**EU Representative:** [If you have >occasional processing of EU data, appoint an EU rep under Article 27 GDPR]
- Name: [Name]
- Address: [EU Address]
- Email: [Email]

**UK Representative:** [If you process UK data and are not established in the UK]
- Name: [Name]
- Address: [UK Address]
- Email: [Email]

### 14.2 Data Protection Officer

If required by law, our Data Protection Officer can be reached at:
- Email: [DPO Email]

*(Note: DPO is only required if you process data at large scale or special categories of data)*

### 14.3 Supervisory Authority

Our lead supervisory authority is:
- [Your country's data protection authority]
- Website: [Authority website]

---

## 15. Your Workspace's Privacy Obligations

### 15.1 If You're a Workspace Administrator

By installing our app, you represent and warrant that:

- You have authority to install the app and bind your organization
- You have obtained necessary consents from team members
- You have provided required privacy notices to team members
- You comply with applicable privacy laws in your jurisdiction

### 15.2 Recommended Actions

We recommend workspace administrators:

1. **Update your internal privacy policy** to mention this app
2. **Notify team members** about the bot and its data collection
3. **Configure carefully** - only invite the bot to appropriate channels
4. **Review settings** - ensure escalation targets are appropriate
5. **Document your legal basis** for processing under GDPR/local law

---

## 16. Uninstalling the App

### 16.1 How to Uninstall

To uninstall the app and stop data collection:

1. Go to your Slack workspace settings
2. Navigate to Apps > Manage Apps
3. Find "Slack Question Router"
4. Click "Remove App"

### 16.2 What Happens to Your Data

When you uninstall:

- **Immediate:** We stop collecting new data
- **OAuth tokens:** Deleted immediately
- **Historical data:** Retained for 30 days, then deleted (unless you request immediate deletion)
- **Aggregated statistics:** May be retained in anonymized form

To request immediate deletion, email: [Your Privacy Contact Email]

---

## 17. Contact Us

### 17.1 Privacy Questions

For privacy-related questions or to exercise your rights:

- **Email:** [Your Privacy Contact Email]
- **Subject Line:** Use "Privacy Request - [Your Workspace Name]"
- **Response Time:** We respond within 30 days (or as required by law)

### 17.2 General Support

For technical support or general questions:

- **Email:** [Your Support Email]
- **GitHub:** [Your GitHub Issues URL]

### 17.3 Required Information for Requests

When contacting us about your data, please include:
- Your Slack workspace ID or name
- Your Slack user ID (if applicable)
- Specific nature of your request
- Verification information (we may ask for additional verification)

---

## 18. Specific Jurisdictional Rights

### 18.1 Brazil (LGPD)

Brazilian residents have rights under Lei Geral de Proteção de Dados:
- Right to confirmation of processing
- Right to access
- Right to correction
- Right to anonymization, blocking, or deletion
- Right to data portability
- Right to information about public/private entities with data sharing
- Right to information about possibility of not providing consent
- Right to revoke consent

Contact: [Your Contact Email]
National Data Protection Authority (ANPD): https://www.gov.br/anpd/

### 18.2 Australia (Privacy Act)

Australian Privacy Principles (APPs) apply. You have rights to:
- Know what information we hold
- Access your information
- Correct your information
- Complain about privacy breaches

Complaints can be made to:
Office of the Australian Information Commissioner (OAIC): https://www.oaic.gov.au/

---

## 19. Transparency Commitments

### 19.1 What We Promise

- **Plain language:** We explain our practices clearly
- **No dark patterns:** We don't trick you into giving up privacy
- **Data minimization:** We only collect what we need
- **Your control:** You can access, modify, or delete your data
- **No surprises:** We're upfront about what we do with data

### 19.2 What We DON'T Do

- ❌ We don't sell your data
- ❌ We don't use your data for advertising
- ❌ We don't share with data brokers
- ❌ We don't use invasive tracking
- ❌ We don't keep data longer than necessary
- ❌ We don't process special categories of data (health, religion, etc.)
- ❌ We don't make automated decisions that significantly affect you

---

## 20. Legal Information

### 20.1 Governing Law

This privacy policy is governed by:
- Laws of [Your Jurisdiction]
- Applicable privacy laws (GDPR, CCPA, etc.) based on user location

### 20.2 Severability

If any provision of this policy is found invalid, the remaining provisions continue in full effect.

### 20.3 Entire Agreement

This privacy policy, together with our Terms of Service [if you have one], constitutes the entire agreement regarding privacy.

---

## Appendix A: Data Processing Details

### Technical Details for Privacy Officers

**Data Storage:**
- Database: PostgreSQL (encrypted at rest)
- Hosting: [Your hosting provider - Railway/Render/etc.]
- Location: [Data center region]
- Backups: Daily, retained 7 days, encrypted

**Data Access:**
- Access logs: Maintained for 90 days
- Administrator access: Limited to [number] authorized personnel
- MFA required: Yes

**Data Security Certifications:**
- [List any SOC 2, ISO 27001, or other certifications]
- Third-party security audits: [Frequency]

**Subprocessors:**
- Slack, Inc. (API provider)
- [Database hosting provider name]
- [Application hosting provider name]

Updated list available at: [URL or email to request]

---

## Appendix B: Glossary

**Personal Information/Personal Data:** Information that identifies or can be used to identify an individual.

**Data Controller:** Entity that determines the purposes and means of processing personal data.

**Data Processor:** Entity that processes personal data on behalf of a controller.

**Data Subject:** Individual to whom personal data relates.

**Processing:** Any operation performed on personal data (collection, storage, use, sharing, deletion).

**Workspace Administrator:** Person with administrative privileges in a Slack workspace who can install apps.

---

**Document Version:** 1.0
**Last Reviewed:** January 14, 2025
**Next Review Date:** July 14, 2025

---

## Acknowledgment

By installing or using Slack Question Router, you acknowledge that you have read and understood this Privacy Policy.

For workspace administrators: By installing this app, you confirm you have authority to make data processing decisions on behalf of your organization and have fulfilled your obligations to inform affected individuals.

---

*This privacy policy is designed to comply with GDPR, CCPA, UK GDPR, PIPEDA, and other major privacy frameworks. However, it is provided as a template and you should consult with a licensed attorney in your jurisdiction to ensure full compliance with applicable laws.*
