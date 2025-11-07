# Slack Question Router - Quick Start Guide

**Never Let Questions Go Unanswered**

---

## 🙋 For Team Members (End Users)

### Asking Questions

**Just ask!** The bot automatically detects questions in monitored channels.

- Use `?` to ask questions: "How do I reset a password?"
- Bot adds ❓ emoji when your question is tracked
- No special commands needed

### Marking Answers (Stack Overflow Style)

**You control who gets credit!** As the question asker, mark helpful replies:

1. Someone replies to your question in the thread
2. Add one of these emojis to their helpful reply:
   - ✅ `:white_check_mark:`
   - ✔️ `:heavy_check_mark:`
   - ☑️ `:ballot_box_with_check:`
   - 🎯 `:dart:`
   - 🙏 `:pray:`
3. The reply author gets credit for helping!

**Note:** Only the question asker can mark thread replies. Anyone can still mark the original question.

### What Happens If No One Answers?

The bot automatically escalates unanswered questions:

- **Level 1:** Support team gets tagged in your thread
- **Level 2:** Alert posted to escalation channel
- **Level 3:** Manager notified (if configured)

Timing varies by workspace - ask your admin!

---

## ⚙️ For Workspace Admins

### Initial Setup

1. **Monitor Channels**
   ```
   /qr-config
   ```
   Enable/disable tracking per channel

2. **Set Escalation Timing**
   ```
   /qr-config
   ```
   Configure how long before escalating (default: 2 hours → 4 hours → 24 hours)

3. **Configure Escalation Targets**
   ```
   /qr-targets
   ```
   Set who gets notified at each level:
   - User groups (`@support-team`)
   - Specific users (`@manager`)
   - Alert channels (`#escalations`)

### Key Admin Commands

| Command | What It Does |
|---------|--------------|
| `/qr-config` | View/update workspace settings |
| `/qr-targets` | Manage escalation routing |
| `/qr-stats` | View answer rates and top responders |

### Configuration Options

**Answer Detection Modes:**
- **Emoji Only:** Requires ✅ to mark answered
- **Hybrid:** Thread replies pause escalation, ✅ completes (recommended)
- **Thread Auto:** Any reply marks as answered

**Escalation Levels:**
- **Level 1:** Tag user group in thread (e.g., `@tier2`)
- **Level 2:** Post to private channel (e.g., `#tier_1`)
- **Level 3:** Notify specific user (optional)

### Channel-Specific Settings

Different channels can have different rules:

- **Timing:** Faster escalation for urgent channels
- **Detection Mode:** Strict vs. relaxed answer detection
- **Escalation:** Enable/disable per channel

Use `/qr-config` and select a specific channel to customize.

---

## 💡 Pro Tips

### For Everyone

- **Zendesk Integration:** Side conversations are automatically tracked
- **Privacy First:** No email collection, only public Slack data
- **Thread Replies:** Keep discussions organized - reply in threads!

### For Admins

- **Monitor Stats:** Check `/qr-stats` weekly to identify knowledge gaps
- **Adjust Timing:** Start aggressive (2 min), relax as team learns
- **Test Targets:** Use `/qr-targets` to verify escalation routes work
- **Answer Mode:** `hybrid` works best for most teams

---

## 🆘 Common Questions

**Q: My question wasn't detected**
- Check that the channel is monitored (`/qr-config`)
- Ensure your message has a `?` question mark
- Questions in threads aren't tracked (only parent messages)

**Q: Wrong person got credit for answering**
- Only the **asker** can mark thread replies
- Add the emoji to the helpful **reply**, not the question
- Check you used a supported emoji (✅ ✔️ ☑️ 🎯 🙏)

**Q: How do I stop escalation?**
- Mark the question as answered (any supported emoji)
- Or add 🔕 `:no_bell:` to snooze for 1 hour
- Or add 🚫 `:no_entry:` to dismiss as not a real question

**Q: Can I exclude certain users or bots?**
- Contact your workspace admin
- Bot messages from Zendesk are handled specially
- Other exclusions require configuration

---

## 📊 Understanding Your Stats

Run `/qr-stats` to see:

- **Total Questions:** How many questions this week
- **Answer Rate:** % of questions that got answers
- **Avg Response Time:** How quickly questions are answered
- **Top Responders:** Who's helping the most
- **Channel Breakdown:** Which channels need the most help

Use this data to:
- Recognize helpful team members
- Identify knowledge gaps
- Optimize escalation timing
- Improve documentation

---

## 🔧 Need Help?

- **Check Logs:** Railway dashboard for deployment issues
- **Database:** Supabase for data queries
- **Code:** GitHub repository for bug reports
- **Questions:** Ask in your Slack workspace!

---

**Version:** 1.0 (January 2025)
**Privacy:** No email collection | No PII storage | Self-hostable
**Support:** Open source project maintained by Claude Code

