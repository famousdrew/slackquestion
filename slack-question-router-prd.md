# Slack Question Router - Product Requirements Document

**Version:** 1.0
**Last Updated:** November 4, 2024
**Document Owner:** Drew
**Status:** In Development (Phase 1)

---

## Executive Summary

**What:** A Slack bot that monitors channels for unanswered questions, intelligently suggests who should respond, and escalates appropriately to ensure nothing falls through the cracks.

**Why:** In busy Slack workspaces (especially customer support teams), questions get buried in channel noise. Team members who could help don't see them, and askers get frustrated or resort to DMs. This creates knowledge silos and inefficiency.

**For Whom:** Initially for Drew's customer support team (31 people across support, QA, and operations). Later potentially for other teams/companies.

**Success Metrics:**
- Reduce average question response time by 50%
- Increase question answer rate from ~70% to >90%
- Reduce DM volume (people stop bypassing channels)

---

## Problem Statement

### Current Pain Points

**For Question Askers:**
- Questions posted in busy channels go unanswered
- Unclear who to ask for specific topics
- End up DMing people or reposting multiple times
- Frustration leads to bypassing Slack entirely (email, tapping shoulders)

**For Potential Responders:**
- Questions buried in message volume
- Don't realize someone needs their expertise
- Feel guilty when they discover unanswered questions later
- No visibility into what's been handled vs. ignored

**For Team Leads (Drew):**
- No visibility into what questions go unanswered
- Can't track response patterns or bottlenecks
- Hard to identify knowledge gaps in the team
- Manual escalation is reactive, not proactive

### Why This Matters

- **Customer Support Context:** Drew's team handles time-sensitive issues. Unanswered internal questions delay customer resolutions.
- **Post-Merger Integration:** New team members don't know who to ask about legacy systems. Questions about the newly acquired payroll system often go unanswered.
- **Remote Work:** Can't just turn around and ask someone. Async communication means things get lost.
- **Knowledge Distribution:** Some people are overloaded with questions (DMed constantly), others are underutilized.

---

## Goals & Non-Goals

### Goals (MVP - Phase 1)

**Primary Goals:**
1. ✅ Detect questions in monitored Slack channels automatically
2. ✅ Track which questions remain unanswered over time
3. ✅ Suggest potential responders based on simple heuristics
4. ✅ Escalate unanswered questions after configurable time periods
5. ✅ Provide basic analytics on question/answer patterns

**Secondary Goals:**
6. ✅ Learn expertise over time (who answers what topics)
7. ✅ Allow manual configuration of expertise areas
8. ✅ Provide slash commands for quick interactions

### Non-Goals (Not in MVP)

- ❌ AI-powered question detection (using pattern matching for MVP)
- ❌ Advanced NLP topic modeling (simple keyword extraction is fine)
- ❌ Integration with external tools (Zendesk, Jira, etc.)
- ❌ Multi-workspace support (just Drew's workspace)
- ❌ Web dashboard (Slack-only interface)
- ❌ Mobile app
- ❌ Automated answering (bot doesn't try to answer questions)
- ❌ Question quality scoring
- ❌ SLA tracking against formal agreements

---

## User Stories & Scenarios

### User Story 1: Question Detection
**As a** support team member  
**I want** the bot to automatically identify when I ask a question  
**So that** I don't have to manually tag it or use special syntax

**Acceptance Criteria:**
- Bot detects messages ending in "?"
- Bot detects messages starting with question words (how, what, when, where, why, who)
- Bot detects common help patterns ("can someone", "does anyone know")
- Bot ignores rhetorical questions (best effort)
- Bot creates a database record for each detected question

**Example:**
```
Sarah: "How do I bulk update ticket tags in Zendesk?"
[Bot detects this as a question and starts tracking]
```

---

### User Story 2: Expertise Suggestion
**As a** team member with expertise  
**I want** to be notified when there's a question I can answer  
**So that** I can help without constantly monitoring every channel

**Acceptance Criteria:**
- Bot identifies 1-3 people most likely to know the answer
- Notification is sent via DM (not public tag) after a grace period
- DM includes link to question and context
- User can click through to answer or dismiss
- System learns from who actually answers over time

**Example:**
```
[30 minutes after Sarah's question, Marcus gets a DM]

Bot: "👋 There's a question in #customer-support you might be able to help with:

'How do I bulk update ticket tags in Zendesk?'

You've answered 15 Zendesk questions in the past. View in thread: [link]

[I can help] [Not my area] [Already answered]"
```

---

### User Story 3: Escalation
**As a** team lead  
**I want** questions to escalate if they remain unanswered  
**So that** nothing gets lost and I can intervene when needed

**Acceptance Criteria:**
- Configurable escalation time (default: 2 hours for first escalation)
- First escalation: Suggest to 3 people via DM
- Second escalation: Post in thread suggesting people
- Third escalation: DM team lead with summary
- Can mark question as answered to stop escalation
- Can snooze escalation if actively being handled

**Example:**
```
[2 hours after Sarah's question, still no answer]

Bot posts in thread:
"👀 This question has been here for 2 hours. Maybe @marcus or @jen or @alex can help?"

[4 hours later, still no answer]

Bot DMs Drew:
"⚠️ Unanswered question in #customer-support (6 hours old):
'How do I bulk update ticket tags in Zendesk?'
Posted by @sarah
Suggested to: @marcus, @jen, @alex - no response yet"
```

---

### User Story 4: Answer Detection
**As a** user  
**I want** the bot to recognize when my question is answered  
**So that** escalations stop and stats are accurate

**Acceptance Criteria:**
- Bot detects thread replies as potential answers
- Bot looks for positive reactions (✅, 👍) from question asker
- Bot detects "thanks" or similar acknowledgment from asker
- User can manually mark as answered with reaction or command
- Bot stops escalation when answered
- Bot updates expertise score for the answerer

**Example:**
```
Sarah: "How do I bulk update ticket tags in Zendesk?"
Marcus: "You can use the bulk actions menu - select multiple tickets..."
Sarah: ✅ [reacts to Marcus's answer]
[Bot marks question as answered, stops escalation, updates Marcus's Zendesk expertise +1]
```

---

### User Story 5: Configuration
**As a** workspace admin  
**I want** to configure which channels to monitor and escalation settings  
**So that** the bot works appropriately for my team

**Acceptance Criteria:**
- Slash command `/qr-config` opens settings
- Can select which channels to monitor
- Can set escalation time thresholds
- Can set who receives final escalations
- Can enable/disable certain features
- Settings persist across bot restarts

**Example:**
```
/qr-config
[Modal opens]
- Monitor channels: #customer-support, #tech-questions, #general
- First escalation: 2 hours
- Second escalation: 4 hours
- Final escalation DM: @drew
- Enable DM suggestions: Yes
- Grace period before DMs: 30 minutes
[Save]
```

---

### User Story 6: Analytics
**As a** team lead  
**I want** to see statistics on questions and answers  
**So that** I can identify patterns and improve team performance

**Acceptance Criteria:**
- Slash command `/qr-stats` shows summary
- Shows total questions asked (time period)
- Shows answer rate and average response time
- Shows top responders by count
- Shows channels with most unanswered questions
- Shows common topics (based on keywords)

**Example:**
```
/qr-stats

📊 Question Router Stats (Last 7 days)

Questions asked: 47
Answered: 42 (89%)
Unanswered: 5 (11%)
Avg response time: 1.2 hours

Top responders:
• @marcus: 12 answers (Zendesk, integrations)
• @sarah: 9 answers (policies, escalations)
• @jen: 7 answers (reporting, data)

Channels:
• #customer-support: 31 questions, 85% answered
• #tech-questions: 16 questions, 100% answered

Slowest responses:
• "How to handle refunds in new payroll system?" - 18 hours
• "Where is the Q3 sales data?" - 12 hours
```

---

### User Story 7: Expertise Management
**As a** team member  
**I want** to set my areas of expertise  
**So that** I get relevant suggestions and not spam

**Acceptance Criteria:**
- Slash command `/qr-expertise` to manage
- Can add topics/keywords for self
- Can remove topics
- Can view current expertise profile
- System automatically adds topics based on answers
- Can opt out of certain topics

**Example:**
```
/qr-expertise

Your expertise areas:
• Zendesk (confidence: 90% - from 15 answers)
• Payroll integration (confidence: 60% - from 5 answers)
• [Auto-learned from your answers]

Add expertise: [text input]
Remove: [dropdown of current topics]

[Save Changes]
```

---

## User Flows

### Flow 1: Question Asked → Answered (Happy Path)

```
1. Sarah posts: "How do I export all tickets from last month?"
2. Bot detects question (contains "?", starts with "how")
3. Bot stores question in database
4. Bot waits 30 minutes (grace period)
5. Bot checks: still unanswered
6. Bot identifies experts: Marcus (85% Zendesk confidence)
7. Bot DMs Marcus with suggestion
8. Marcus sees DM, clicks through, answers in thread
9. Bot detects answer (thread reply + timing)
10. Bot marks question as answered
11. Bot updates Marcus's expertise score
12. Done ✅
```

### Flow 2: Question Escalated → Team Lead Intervenes

```
1. Sarah posts: "Does anyone know the login for the new payroll system?"
2. Bot detects question
3. Bot waits 30 minutes → still unanswered
4. Bot identifies experts: No one tagged with "payroll" yet (new system)
5. Bot suggests to 3 most active people in channel
6. After 2 hours: still no answer
7. Bot posts in thread: "This has been unanswered for 2 hours..."
8. After 4 hours: still no answer
9. Bot DMs Drew (team lead): "Unanswered question needs attention"
10. Drew sees DM, realizes it's a gap in documentation
11. Drew answers and creates knowledge base article
12. Drew tags question with /qr-resolved
13. Done ✅
```

### Flow 3: False Positive → User Dismisses

```
1. Sarah posts: "Can you believe this weather?"
2. Bot detects as question (starts with "can")
3. Bot waits 30 minutes
4. Sarah reacts with ⛔ emoji (configured as "not a real question")
5. Bot marks as dismissed, no escalation
6. Bot learns: "can you believe" is likely rhetorical
7. Done ✅
```

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────┐
│           Slack Workspace               │
│  (Drew's team: ~31 users, 5-10 channels)│
└───────────────┬─────────────────────────┘
                │
                │ Events API (webhooks)
                │ Socket Mode (dev)
                ▼
┌─────────────────────────────────────────┐
│        Node.js Backend (TypeScript)     │
│                                         │
│  ┌────────────────────────────────┐   │
│  │   Slack Bolt App Framework     │   │
│  │   - Event listeners            │   │
│  │   - Command handlers           │   │
│  │   - Modal interactions         │   │
│  └────────────────┬───────────────┘   │
│                   │                    │
│  ┌────────────────▼───────────────┐   │
│  │   Question Detection Engine    │   │
│  │   - Pattern matching           │   │
│  │   - Keyword extraction         │   │
│  └────────────────┬───────────────┘   │
│                   │                    │
│  ┌────────────────▼───────────────┐   │
│  │   Expertise Matching Engine    │   │
│  │   - Score calculation          │   │
│  │   - Historical analysis        │   │
│  └────────────────┬───────────────┘   │
│                   │                    │
│  ┌────────────────▼───────────────┐   │
│  │   Escalation Engine            │   │
│  │   - BullMQ job queue           │   │
│  │   - Redis for jobs             │   │
│  └────────────────┬───────────────┘   │
└────────────────────┼───────────────────┘
                     │
                     ▼
         ┌────────────────────┐
         │   PostgreSQL DB    │
         │   - Questions      │
         │   - Users          │
         │   - Expertise      │
         │   - Escalations    │
         │   - Config         │
         └────────────────────┘
```

### Tech Stack

**Backend:**
- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express.js (lightweight)
- **Slack SDK:** @slack/bolt

**Database:**
- **PostgreSQL** (via Railway or Supabase)
- **Prisma** ORM for type-safe queries

**Job Queue:**
- **BullMQ** with Redis
- For background escalation checks

**Hosting:**
- **Railway.app** (easy deploy, includes Postgres + Redis)
- Alternative: Render.com

**Development:**
- Socket Mode for local dev (no ngrok needed)
- GitHub for version control
- Claude Code for development assistance

### Database Schema

```sql
-- Workspaces (multi-tenant ready, but only one for MVP)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_team_id VARCHAR(255) UNIQUE NOT NULL,
  team_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Channels being monitored
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  slack_channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  is_monitored BOOLEAN DEFAULT true,
  settings JSONB, -- escalation times, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, slack_channel_id)
);

-- Users in the workspace
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  slack_user_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  real_name VARCHAR(255),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, slack_user_id)
);

-- Questions tracked
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  channel_id UUID REFERENCES channels(id),
  asker_id UUID REFERENCES users(id),
  slack_message_id VARCHAR(255) NOT NULL, -- message ts
  slack_thread_id VARCHAR(255), -- thread_ts if in thread
  message_text TEXT NOT NULL,
  extracted_keywords TEXT[], -- for expertise matching
  asked_at TIMESTAMP NOT NULL,
  answered_at TIMESTAMP,
  answerer_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'unanswered', -- unanswered, answered, dismissed, snoozed
  escalation_level INTEGER DEFAULT 0, -- 0=none, 1=first, 2=second, 3=final
  last_escalated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User expertise (learned over time)
CREATE TABLE user_expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  topic VARCHAR(255) NOT NULL,
  confidence_score FLOAT DEFAULT 0.5, -- 0.0 to 1.0
  answer_count INTEGER DEFAULT 0,
  last_answered_at TIMESTAMP,
  source VARCHAR(50) DEFAULT 'auto', -- auto, manual
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Escalation history
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id),
  escalation_level INTEGER NOT NULL,
  suggested_users UUID[], -- array of user IDs
  action_taken VARCHAR(255), -- 'dm_sent', 'thread_post', 'lead_notified'
  escalated_at TIMESTAMP DEFAULT NOW()
);

-- Workspace configuration
CREATE TABLE workspace_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) UNIQUE,
  first_escalation_minutes INTEGER DEFAULT 120, -- 2 hours
  second_escalation_minutes INTEGER DEFAULT 240, -- 4 hours
  final_escalation_minutes INTEGER DEFAULT 1440, -- 24 hours
  grace_period_minutes INTEGER DEFAULT 30,
  dm_suggestions_enabled BOOLEAN DEFAULT true,
  thread_posts_enabled BOOLEAN DEFAULT true,
  final_escalation_user_id UUID REFERENCES users(id), -- who gets final DM
  settings JSONB, -- additional flexible settings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analytics / stats (optional - can compute from questions table)
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  channel_id UUID REFERENCES channels(id),
  date DATE NOT NULL,
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, channel_id, date)
);
```

### Question Detection Logic

**Pattern-Based Detection (MVP):**

```typescript
interface DetectionConfig {
  questionMarks: boolean; // ends with ?
  questionWords: string[]; // how, what, when, etc.
  helpPatterns: string[]; // can someone, does anyone know
  minLength: number; // ignore very short messages
}

const defaultConfig: DetectionConfig = {
  questionMarks: true,
  questionWords: [
    'how do', 'how can', 'how to', 'how does', 'how would',
    'what is', 'what are', 'what does', 'what\'s',
    'where is', 'where can', 'where do',
    'when should', 'when does', 'when can',
    'why does', 'why is', 'why can\'t',
    'who can', 'who should', 'who knows',
    'which', 'is there', 'are there',
  ],
  helpPatterns: [
    'does anyone know',
    'can someone',
    'anyone know',
    'could someone',
    'help with',
    'need help',
  ],
  minLength: 10, // at least 10 chars
};

function isQuestion(text: string, config = defaultConfig): boolean {
  const normalized = text.toLowerCase().trim();
  
  // Too short
  if (normalized.length < config.minLength) return false;
  
  // Check for question mark
  if (config.questionMarks && normalized.endsWith('?')) return true;
  
  // Check for question word starters
  for (const word of config.questionWords) {
    if (normalized.startsWith(word)) return true;
  }
  
  // Check for help patterns
  for (const pattern of config.helpPatterns) {
    if (normalized.includes(pattern)) return true;
  }
  
  return false;
}
```

**Keyword Extraction (Simple):**

```typescript
function extractKeywords(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are',
    'how', 'what', 'when', 'where', 'why', 'who', 'does',
    'can', 'could', 'should', 'would', 'i', 'you', 'we',
  ]);
  
  // Tokenize and filter
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  // Count frequency
  const freq = new Map<string, number>();
  words.forEach(word => freq.set(word, (freq.get(word) || 0) + 1));
  
  // Return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}
```

### Expertise Matching Algorithm

```typescript
interface ExpertiseMatch {
  userId: string;
  score: number;
  reasons: string[];
}

async function findBestResponders(
  question: Question,
  channelMembers: User[],
  limit: number = 3
): Promise<ExpertiseMatch[]> {
  
  const keywords = question.extractedKeywords;
  const scores: ExpertiseMatch[] = [];
  
  for (const user of channelMembers) {
    if (!user.isActive) continue;
    
    let score = 0;
    const reasons: string[] = [];
    
    // 1. Historical answers in this channel (weight: 2x)
    const answersInChannel = await countAnswersInChannel(user.id, question.channelId);
    if (answersInChannel > 0) {
      score += answersInChannel * 2;
      reasons.push(`${answersInChannel} answers in this channel`);
    }
    
    // 2. Keyword expertise match (weight: 5x per keyword)
    const userExpertise = await getUserExpertise(user.id);
    for (const keyword of keywords) {
      const expertise = userExpertise.find(e => e.topic === keyword);
      if (expertise) {
        score += expertise.confidenceScore * 5;
        reasons.push(`${keyword} expert (${Math.round(expertise.confidenceScore * 100)}%)`);
      }
    }
    
    // 3. Recent activity (more points if answered recently)
    const daysSinceLastAnswer = getDaysSince(user.lastAnsweredAt);
    if (daysSinceLastAnswer < 7) {
      const recencyScore = Math.max(0, 5 - daysSinceLastAnswer);
      score += recencyScore;
      reasons.push(`Active recently`);
    }
    
    // 4. Response rate (prefer people who actually respond when suggested)
    const responseRate = await getUserResponseRate(user.id);
    score += responseRate * 3;
    if (responseRate > 0.7) {
      reasons.push(`High response rate (${Math.round(responseRate * 100)}%)`);
    }
    
    // 5. Penalty for being suggested too frequently (avoid burnout)
    const suggestionsLast24h = await getSuggestionCount(user.id, 24);
    if (suggestionsLast24h > 5) {
      score -= suggestionsLast24h * 0.5;
      reasons.push(`Already suggested ${suggestionsLast24h} times today`);
    }
    
    if (score > 0) {
      scores.push({ userId: user.id, score, reasons });
    }
  }
  
  // Sort by score and return top N
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

### Escalation Logic

```typescript
// Background job that runs every 15 minutes
async function checkEscalations() {
  const config = await getWorkspaceConfig();
  const now = new Date();
  
  // Find questions that need escalation
  const questions = await prisma.question.findMany({
    where: {
      status: 'unanswered',
      OR: [
        // First escalation: grace period + first escalation time passed
        {
          escalationLevel: 0,
          askedAt: {
            lte: new Date(now.getTime() - 
              (config.gracePeriodMinutes + config.firstEscalationMinutes) * 60000)
          }
        },
        // Second escalation
        {
          escalationLevel: 1,
          lastEscalatedAt: {
            lte: new Date(now.getTime() - 
              (config.secondEscalationMinutes - config.firstEscalationMinutes) * 60000)
          }
        },
        // Final escalation
        {
          escalationLevel: 2,
          lastEscalatedAt: {
            lte: new Date(now.getTime() - 
              (config.finalEscalationMinutes - config.secondEscalationMinutes) * 60000)
          }
        }
      ]
    },
    include: {
      channel: true,
      asker: true,
    }
  });
  
  for (const question of questions) {
    await escalateQuestion(question, config);
  }
}

async function escalateQuestion(question: Question, config: WorkspaceConfig) {
  const level = question.escalationLevel + 1;
  
  if (level === 1) {
    // First escalation: DM 3 suggested experts
    const experts = await findBestResponders(question, 3);
    
    for (const expert of experts) {
      await sendExpertDM(expert.userId, question, expert.reasons);
    }
    
    await logEscalation(question.id, level, experts.map(e => e.userId), 'dm_sent');
    
  } else if (level === 2) {
    // Second escalation: Post in thread
    await postThreadSuggestion(question);
    await logEscalation(question.id, level, [], 'thread_post');
    
  } else if (level === 3) {
    // Final escalation: DM team lead
    if (config.finalEscalationUserId) {
      await sendLeadEscalation(config.finalEscalationUserId, question);
      await logEscalation(question.id, level, [config.finalEscalationUserId], 'lead_notified');
    }
  }
  
  // Update question
  await prisma.question.update({
    where: { id: question.id },
    data: {
      escalationLevel: level,
      lastEscalatedAt: new Date(),
    }
  });
}
```

---

## Slack Commands

### `/qr-config` - Configuration

Opens a modal to configure bot settings.

**Fields:**
- Monitor channels (multi-select)
- First escalation time (number input, minutes)
- Second escalation time (number input, minutes)
- Final escalation time (number input, minutes)
- Grace period (number input, minutes)
- Enable DM suggestions (toggle)
- Enable thread posts (toggle)
- Final escalation recipient (user select)

### `/qr-stats [timeframe]` - View Statistics

Shows question/answer statistics.

**Parameters:**
- `timeframe` (optional): `today`, `week`, `month`, `all` (default: `week`)

**Output:**
```
📊 Question Router Stats (Last 7 days)

Questions asked: 47
Answered: 42 (89%)
Unanswered: 5 (11%)
Avg response time: 1.2 hours

Top responders:
• @marcus: 12 answers
• @sarah: 9 answers
• @jen: 7 answers

By channel:
• #customer-support: 31 questions, 85% answered
• #tech-questions: 16 questions, 100% answered

[View Details] button → more detailed breakdown
```

### `/qr-expertise [action]` - Manage Expertise

Manage personal expertise tags.

**Actions:**
- `list` (default) - Show my expertise
- `add [topic]` - Add expertise area
- `remove [topic]` - Remove expertise area

**Examples:**
```
/qr-expertise
→ Shows list of your expertise areas

/qr-expertise add zendesk
→ "Added 'zendesk' to your expertise areas"

/qr-expertise remove payroll
→ "Removed 'payroll' from your expertise areas"
```

### `/qr-resolve [message_link]` - Manually Mark Resolved

Mark a question as answered (useful for false positives or external resolution).

**Example:**
```
/qr-resolve https://workspace.slack.com/archives/C123/p1234567890
→ "Marked question as resolved"
```

### `/qr-dismiss [message_link]` - Dismiss Question

Mark a message as not actually a question (false positive).

**Example:**
```
/qr-dismiss https://workspace.slack.com/archives/C123/p1234567890
→ "Dismissed question. Bot will learn from this."
```

### `/qr-snooze [message_link] [hours]` - Snooze Escalation

Temporarily pause escalation (useful when actively working on answer).

**Example:**
```
/qr-snooze https://workspace.slack.com/archives/C123/p1234567890 2
→ "Snoozed escalation for 2 hours"
```

---

## Message Reactions

The bot recognizes certain reactions as signals:

- ✅ (`:white_check_mark:`) - Mark as answered (from question asker)
- ⛔ (`:no_entry:`) - Dismiss as not a question (from anyone)
- 🔕 (`:no_bell:`) - Snooze escalation for 1 hour (from anyone)
- 👀 (`:eyes:`) - "I'm working on this" (prevents immediate escalation)

---

## Analytics & Reporting

### Key Metrics to Track

**Response Metrics:**
- Total questions asked (by time period)
- Questions answered vs. unanswered
- Average response time
- Median response time
- Response time distribution (histogram)

**User Metrics:**
- Top responders (by count)
- Top responders (by expertise area)
- Response rate per user (answered / suggested)
- User activity (last answered date)

**Channel Metrics:**
- Questions per channel
- Answer rate per channel
- Average response time per channel
- Busiest channels

**Escalation Metrics:**
- Escalation frequency
- Escalation level distribution
- Questions requiring final escalation
- Escalation resolution rate

**Expertise Metrics:**
- Most common question topics
- Coverage gaps (topics with no experts)
- Expertise distribution across team

### Data Exports

Users can export:
- CSV of all questions (with answers, response times)
- JSON of expertise map
- Summary reports (PDF or Markdown)

---

## Development Phases

### Phase 0: Setup (Week 1)
**Goal:** Infrastructure and basic connectivity

**Tasks:**
- [ ] Create Slack app in workspace
- [ ] Set up GitHub repo
- [ ] Initialize Node.js project with TypeScript
- [ ] Install dependencies (@slack/bolt, Prisma, etc.)
- [ ] Set up PostgreSQL database (Railway)
- [ ] Configure Prisma schema
- [ ] Create initial database migration
- [ ] Test basic Slack connectivity (hello world bot)
- [ ] Set up environment variables / secrets

**Deliverable:** Bot can connect to Slack and respond to a test command

---

### Phase 1: Core Detection (Week 2)
**Goal:** Detect and store questions

**Tasks:**
- [ ] Implement pattern-based question detection
- [ ] Implement keyword extraction
- [ ] Create message event listener
- [ ] Store questions in database
- [ ] Handle thread messages properly
- [ ] Test detection accuracy with sample messages
- [ ] Add `/qr-stats` command (basic version)

**Deliverable:** Bot can detect questions and store them in database, basic stats visible

---

### Phase 2: Answer Detection (Week 2-3)
**Goal:** Recognize when questions are answered

**Tasks:**
- [ ] Detect thread replies as potential answers
- [ ] Implement reaction listeners (✅, ⛔, etc.)
- [ ] Mark questions as answered with timestamp
- [ ] Link answerer to question
- [ ] Update expertise scores for answerers
- [ ] Test answer detection accuracy

**Deliverable:** Bot can track question lifecycle (asked → answered)

---

### Phase 3: Expertise System (Week 3)
**Goal:** Learn and manage user expertise

**Tasks:**
- [ ] Build expertise scoring algorithm
- [ ] Implement `/qr-expertise` command
- [ ] Create expertise suggestion logic
- [ ] Manual expertise add/remove
- [ ] Auto-learning from answers
- [ ] Test expertise matching

**Deliverable:** Bot can suggest appropriate people for questions

---

### Phase 4: Escalation Engine (Week 4)
**Goal:** Escalate unanswered questions

**Tasks:**
- [ ] Set up BullMQ + Redis
- [ ] Create background job for checking unanswered questions
- [ ] Implement first escalation (DMs)
- [ ] Implement second escalation (thread post)
- [ ] Implement final escalation (team lead DM)
- [ ] Add escalation configuration
- [ ] Test escalation timing and logic

**Deliverable:** Bot escalates unanswered questions appropriately

---

### Phase 5: Configuration & Commands (Week 4-5)
**Goal:** Make bot configurable

**Tasks:**
- [ ] Implement `/qr-config` modal
- [ ] Save/load configuration from database
- [ ] Implement `/qr-resolve` command
- [ ] Implement `/qr-dismiss` command
- [ ] Implement `/qr-snooze` command
- [ ] Channel selection logic
- [ ] Test all commands

**Deliverable:** Bot is fully configurable via Slack commands

---

### Phase 6: Polish & Deploy (Week 5)
**Goal:** Production ready

**Tasks:**
- [ ] Improve stats command with better formatting
- [ ] Add error handling and logging
- [ ] Write README and documentation
- [ ] Set up monitoring (error tracking)
- [ ] Deploy to Railway
- [ ] Test in production with real team
- [ ] Collect initial feedback
- [ ] Bug fixes

**Deliverable:** Bot running in production, team using it daily

---

## Success Criteria

### Functional Requirements
- ✅ Detects 90%+ of actual questions correctly
- ✅ False positive rate <10%
- ✅ Suggests relevant experts in top 3 suggestions 80% of time
- ✅ Escalations trigger at correct times
- ✅ Answer detection works reliably
- ✅ All commands function correctly
- ✅ Configuration persists correctly

### Performance Requirements
- Response latency <2 seconds for commands
- Background jobs run reliably every 15 minutes
- Database queries optimized (<100ms for common queries)
- Bot doesn't rate limit (respects Slack limits)
- Handles 100+ messages/day without issues

### User Experience
- Easy to configure (takes <5 minutes)
- Clear, helpful notifications
- Not spammy (respects grace periods)
- Intuitive commands
- Helpful error messages

### Business Impact (After 4 weeks)
- 50% reduction in average question response time
- 90%+ question answer rate
- Team satisfaction score 8/10 or higher
- Drew has visibility into question patterns
- Knowledge gaps identified and addressed

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
- AI-powered question detection (Claude API)
- Advanced NLP topic modeling
- Integration with Zendesk (link tickets to questions)
- Web dashboard for detailed analytics
- Expertise recommendations based on Slack profiles
- Question templates / FAQ suggestions
- Custom escalation rules per channel

### Phase 3 Features
- Multi-workspace support (SaaS version)
- Public API for integrations
- Mobile notifications
- Question quality scoring
- Automated follow-ups ("Did this answer your question?")
- Integration with calendar (don't suggest people in meetings)
- Slack workflow builder integration

---

## Risks & Mitigations

### Risk 1: False Positives (Rhetorical Questions)
**Impact:** High - spam notifications, loss of trust  
**Mitigation:** 
- Allow easy dismissal (reaction or command)
- Learn from dismissals
- Conservative detection (favor missing questions over false positives)
- Grace period before taking action

### Risk 2: Expertise Cold Start
**Impact:** Medium - poor suggestions initially  
**Mitigation:**
- Manual expertise seeding during onboarding
- Parse Slack profiles for hints
- Start with conservative suggestions (3-5 people)
- Learn quickly from who actually answers

### Risk 3: Notification Fatigue
**Impact:** High - people ignore or disable bot  
**Mitigation:**
- Limit DM frequency per user (max 5/day)
- Use threads for secondary escalations
- Respect user preferences
- Make DMs actionable and easy to dismiss

### Risk 4: Privacy/Compliance
**Impact:** Low for internal use, High for SaaS  
**Mitigation:**
- Data stored securely
- No message content shared externally
- Clear privacy policy
- User opt-out options

### Risk 5: Technical Complexity
**Impact:** Medium - delays launch  
**Mitigation:**
- Start with simple pattern matching
- Use proven libraries and frameworks
- Claude Code for development assistance
- Iterative approach (MVP first)

---

## Open Questions

1. **Escalation timing:** 2 hours feels right for first escalation, but should it vary by channel or time of day?
2. **DM frequency:** Max 5 suggestions per person per day? Should this be configurable?
3. **Expertise decay:** Should expertise scores decay over time if someone stops answering?
4. **Multi-threading:** If a question spawns a thread, should all thread messages be analyzed?
5. **Integration priority:** Which external tool should we integrate with first? (Zendesk, Jira, Notion?)

---

## Appendix

### Competitor Analysis

**Existing Solutions:**
- **Slack's built-in search:** Doesn't track unanswered questions
- **Threads:** Relies on people checking threads regularly
- **@mentions:** Requires knowing who to ask
- **Custom bots:** Usually simple keyword triggers, no intelligence

**Our Differentiator:**
- Automatic question detection
- Smart expertise matching
- Progressive escalation
- Learning system
- Built for support teams specifically

### References

- Slack Bolt SDK: https://slack.dev/bolt-js/
- Slack Events API: https://api.slack.com/events-api
- Prisma ORM: https://www.prisma.io/
- BullMQ: https://docs.bullmq.io/

---

**Next Steps:**
1. Review this PRD and confirm approach
2. Set up development environment
3. Start Phase 0 (infrastructure setup)
4. Begin building with Claude Code

**Questions or changes?** Update this document as we go!
