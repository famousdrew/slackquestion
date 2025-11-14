# Privacy Policy Setup Guide

This guide helps you customize the privacy policy template for your Slack Question Router deployment.

## Required Customizations

Before publishing your privacy policy, you MUST replace the following placeholders with your actual information:

### 1. Your Contact Information (Section 1)

Replace these placeholders:
- `[Your Company Name/Your Name]` - Your legal business name or personal name
- `[Your Contact Email]` - General contact email
- `[Your Business Address]` - Your legal business address
- `[Your Privacy Contact Email]` - Email specifically for privacy requests (can be same as contact email)

### 2. CCPA Contact (Section 8.2)

- `[Your Privacy Contact Email]` - Email for California residents to exercise rights

### 3. Data Location (Section 5.1)

Update based on where you're actually hosting:
- If using Railway/Render in US: "United States"
- If using EU region: Add specific EU country
- Update the "specific location depends on..." sentence to reflect YOUR actual setup

### 4. Retention Periods (Section 6.2)

Review and adjust if needed:
- Question data retention: Currently "indefinite" - consider if you want a specific period
- Escalation logs: Currently "12 months" - adjust to your needs
- Error logs: Currently "90 days" - standard practice but you can adjust

### 5. Breach Notification Contact (Section 7.3)

Confirm you have a process to notify users within 72 hours per GDPR requirements.

### 6. EU/UK Representatives (Section 14.1)

**Important:** You may need EU/UK representatives if:
- You're NOT established in the EU/UK
- AND you process EU/UK data beyond occasional processing

If required, fill in:
- EU Representative name, address, email
- UK Representative name, address, email

If NOT required, you can remove this entire section or add:
```
Not applicable - we are established in the EU/UK
```

### 7. Data Protection Officer (Section 14.2)

**Important:** DPO is required if you:
- Are a public authority, OR
- Conduct large-scale systematic monitoring, OR
- Process special categories of data at large scale

For most small deployments of this app, a DPO is **NOT required**. You can either:
- Remove this section, OR
- Update it to say "Not required - we do not process data at scale requiring a DPO"

If you DO need a DPO:
- `[DPO Email]` - DPO contact email

### 8. Supervisory Authority (Section 14.3)

Replace with YOUR country's data protection authority:
- `[Your country's data protection authority]` - e.g., "German Federal Commissioner for Data Protection"
- `[Authority website]` - Link to their website

Examples:
- Germany: https://www.bfdi.bund.de/
- France: https://www.cnil.fr/
- Ireland: https://www.dataprotection.ie/
- USA: Not applicable (no federal DPA, use state-specific if applicable)

### 9. Governing Law (Section 20.1)

- `[Your Jurisdiction]` - e.g., "the State of California" or "England and Wales"

### 10. Technical Details (Appendix A)

Update the following to match YOUR actual deployment:

```markdown
**Data Storage:**
- Database: PostgreSQL (encrypted at rest)
- Hosting: [Railway / Render / Your hosting provider]
- Location: [US-East / EU-West / Your specific region]
- Backups: [Your actual backup schedule]

**Data Access:**
- Administrator access: Limited to [1 / 2 / your number] authorized personnel

**Subprocessors:**
- Slack, Inc. (API provider)
- [Supabase / Your database provider]
- [Railway / Render / Your hosting provider]
```

---

## Optional Customizations

### 1. Add a Terms of Service Link

If you create a Terms of Service document, reference it in:
- Section 1 (Who We Are)
- Section 20.3 (Entire Agreement)

### 2. Add Your Logo/Branding

Consider adding your company logo at the top of the document for a more professional appearance.

### 3. Customize Retention Periods

Review Section 6.2 and adjust retention periods based on:
- Your business needs
- Industry standards
- Legal requirements in your jurisdiction

### 4. Add Industry-Specific Requirements

If you operate in regulated industries (healthcare, finance), you may need to add:
- HIPAA compliance statements (healthcare)
- SOX compliance (finance)
- Industry-specific data handling procedures

---

## Compliance Checklist

Before publishing, verify:

- [ ] All `[placeholder]` text has been replaced
- [ ] Contact emails are correct and monitored
- [ ] You've consulted with a lawyer if processing data from EU, California, or other regulated regions
- [ ] Data retention periods match your actual practices
- [ ] Subprocessors list is accurate
- [ ] You have processes in place to respond to data requests within stated timeframes (30 days)
- [ ] You have a breach notification process (72 hours for GDPR)
- [ ] The policy is accessible to users (link from app documentation, website, etc.)

---

## Where to Publish Your Privacy Policy

Once customized, you should:

1. **Host it publicly:**
   - Add to your website
   - GitHub repository (for open-source projects)
   - Include URL in your Slack app's "App Directory" listing

2. **Reference it in your app:**
   - Update `portfolio-page.html` to link to privacy policy
   - Add to README.md
   - Include in OAuth installation flow

3. **Notify users:**
   - Send announcement in Slack when installing
   - Update App Home to include privacy policy link
   - Include in any user documentation

---

## Updating the Privacy Policy

When you make changes:

1. Update the "Last Updated" date at the top
2. Document changes in a changelog (optional but recommended)
3. Notify users if changes are material (GDPR requires this)
4. Keep a version history for at least 3 years

---

## Getting Legal Review

**Important:** This template is comprehensive but is NOT a substitute for legal advice.

You should consult with a licensed attorney if:
- You process data from EU/UK residents (GDPR compliance)
- You have California customers (CCPA compliance)
- You handle sensitive data
- You operate in regulated industries
- You're unsure about any requirements

Consider consulting with:
- Privacy lawyer in your jurisdiction
- Data protection specialist
- Legal services like Rocket Lawyer, LegalZoom (for basic review)

---

## Quick Start Example

Here's what a completed Section 1 might look like:

**Before:**
```markdown
**Contact Information:**
- Service Provider: [Your Company Name/Your Name]
- Email: [Your Contact Email]
- Address: [Your Business Address]
```

**After:**
```markdown
**Contact Information:**
- Service Provider: Acme Solutions Inc.
- Email: support@acmesolutions.com
- Address: 123 Main Street, San Francisco, CA 94105, USA

For privacy-specific inquiries, please email: privacy@acmesolutions.com
```

---

## Resources

### Privacy Frameworks
- **GDPR:** https://gdpr.eu/
- **CCPA:** https://oag.ca.gov/privacy/ccpa
- **UK GDPR:** https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/

### Privacy Policy Generators (for comparison)
- Termly: https://termly.io/
- TermsFeed: https://www.termsfeed.com/
- iubenda: https://www.iubenda.com/

### Compliance Tools
- OneTrust (enterprise)
- TrustArc (enterprise)
- Enzuzo (small business)

---

## Need Help?

If you have questions about customizing this privacy policy:

1. Review the applicable laws for your jurisdiction
2. Consult the resources above
3. Seek legal counsel for specific advice
4. Feel free to use community resources (Reddit r/gdpr, privacy forums)

---

**Remember:** The goal is transparency and user trust. When in doubt, disclose more rather than less, and always give users control over their data.
