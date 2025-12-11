# Smart Commit Message Generator

## সংক্ষিপ্ত বিবরণ

এই টুলটি তোমার Git changes analyze করে এবং [Conventional Commits](https://www.conventionalcommits.org/) specification অনুযায়ী commit message suggest করে।

```
📦 scripts/smart-commit/
├── index.js           # মূল স্ক্রিপ্ট - commit message generator
├── explained.js       # Technical overview (কিভাবে কাজ করে)
├── tutorial.js        # Senior → Junior style tutorial (বাংলা)
├── code-walkthrough.js # Live code demonstration
├── scenarios.js       # Different scenario outputs
└── README.md          # এই ডকুমেন্টেশন
```

---

## 🚀 Quick Start Commands

### মূল কমান্ডগুলো

| কমান্ড | কাজ | কখন ব্যবহার করবে |
|--------|-----|------------------|
| `npm run commit` | Changes analyze করে suggestions দেখায় | সব সময় - এটাই main command |
| `npm run commit:auto` | Best suggestion automatically commit করে | যখন quickly commit করতে চাও |
| `npm run commit:staged` | শুধু staged files analyze করে | `git add` করার পরে |

### শেখার কমান্ডগুলো

| কমান্ড | কাজ | কার জন্য |
|--------|-----|----------|
| `npm run commit:explain` | Technical overview দেখায় | যারা quick overview চায় |
| `npm run commit:tutorial` | Step-by-step tutorial (বাংলা) | নতুন developers |
| `npm run commit:code` | Live code walkthrough | যারা code বুঝতে চায় |
| `npm run commit:scenarios` | Different scenario outputs | examples দেখতে চাইলে |

---

## 📋 Copy-Paste Commands - কোনটা কি করে?

### 1. `npm run commit`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit
```

**কি করে:**
1. `git diff --name-status HEAD` run করে changed files list বের করে
2. প্রতিটা file analyze করে detect করে:
   - কি type (feat, fix, refactor, etc.)
   - কোন scope (auth, user, builder, etc.)
   - কতটা confident suggestion-এ
3. সবচেয়ে relevant commit messages suggest করে
4. Interactive menu দেখায় - তুমি select করতে পারো

**Output Example:**
```
╔══════════════════════════════════════════════════════════════════╗
║                 📊 CHANGE ANALYSIS RESULTS                        ║
╚══════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ 📁 FILES CHANGED: 5                                             │
├─────────────────────────────────────────────────────────────────┤
│ M  src/app/modules/auth/auth.service.ts                        │
│ M  src/app/modules/auth/auth.controller.ts                     │
│ A  src/app/modules/auth/auth.validation.ts                     │
└─────────────────────────────────────────────────────────────────┘

╔══════════════════════════════════════════════════════════════════╗
║                 💡 SUGGESTED COMMIT MESSAGES                      ║
╚══════════════════════════════════════════════════════════════════╝

  1. ✨ feat(auth): add new authentication feature
     Confidence: ████████░░ 85%

  2. 🔧 refactor(auth): improve authentication logic
     Confidence: ██████░░░░ 65%

❯ Select a message (1-2) or press 'c' for custom:
```

---

### 2. `npm run commit:auto`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit:auto
```

**কি করে:**
1. Changes analyze করে (same as `npm run commit`)
2. সবচেয়ে high confidence message automatically select করে
3. সরাসরি `git commit -m "message"` execute করে
4. Commit হয়ে গেলে success message দেখায়

**⚠️ সাবধান:** এটা automatically commit করে দেয়! Sure হয়ে run করো।

**Output Example:**
```
🔍 Analyzing changes...
✅ Found best match with 92% confidence

🚀 Auto-committing with message:
   feat(auth): add password reset functionality

✅ Commit successful!
   Commit hash: abc1234
```

---

### 3. `npm run commit:staged`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit:staged
```

**কি করে:**
1. শুধুমাত্র `git add` করা files analyze করে
2. Unstaged changes ignore করে
3. বাকি সব same as `npm run commit`

**কখন useful:**
```bash
# ধরো তোমার 10টা file change আছে
# কিন্তু তুমি শুধু 3টা commit করতে চাও

git add src/auth/login.ts
git add src/auth/logout.ts
git add src/auth/types.ts

npm run commit:staged  # শুধু এই 3টা file analyze করবে
```

---

### 4. `npm run commit:explain`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit:explain
```

**কি করে:**
- Script কিভাবে কাজ করে তার technical overview দেখায়
- 8টা step-এ explain করে
- Data structures দেখায়
- কোন function কি করে বলে

**কার জন্য:** যারা quickly বুঝতে চায় script-এর architecture

---

### 5. `npm run commit:tutorial`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit:tutorial
```

**কি করে:**
- Senior → Junior conversation style-এ tutorial দেখায়
- সম্পূর্ণ বাংলায় explanation
- 6টা part-এ divide করা
- Practice quiz আছে
- Real-world tips আছে

**কার জন্য:** নতুন developers যারা concept থেকে শিখতে চায়

---

### 6. `npm run commit:code`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit:code
```

**কি করে:**
- তোমার actual git repository-তে run করে
- Real changes নিয়ে live demonstration করে
- প্রতিটা function-এর output দেখায়
- Step by step কিভাবে data transform হচ্ছে দেখায়

**কার জন্য:** যারা code-level understanding চায়

---

### 7. `npm run commit:scenarios`

```bash
# এটা copy-paste করলে যা হবে:
npm run commit:scenarios
```

**কি করে:**
- 14টা different scenario simulate করে
- প্রতিটা scenario-তে কি output হবে দেখায়
- Quick reference table দেয়

**Scenarios include:**
1. Single file change
2. Multiple files, same module
3. Bug fix pattern
4. New feature
5. Documentation update
6. Test files only
7. Mixed changes (feat + fix)
8. Config changes
9. Database/model changes
10. API route changes
11. Large refactoring
12. Dependencies update
13. Build/CI changes
14. Hotfix pattern

---

## 🎯 Conventional Commits Format

এই script যে format follow করে:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types (কমিটের ধরন)

| Type | Emoji | কখন ব্যবহার করবে | Example |
|------|-------|------------------|---------|
| `feat` | ✨ | নতুন feature যোগ করলে | `feat(auth): add Google OAuth login` |
| `fix` | 🐛 | Bug fix করলে | `fix(user): resolve password validation error` |
| `docs` | 📝 | Documentation update | `docs(readme): add API examples` |
| `style` | 💄 | Code style change (formatting) | `style(global): fix indentation` |
| `refactor` | ♻️ | Code restructure (no behavior change) | `refactor(api): simplify error handling` |
| `perf` | ⚡ | Performance improvement | `perf(query): optimize database lookup` |
| `test` | 🧪 | Test add/update | `test(auth): add login unit tests` |
| `build` | 📦 | Build system change | `build(deps): upgrade typescript to 5.0` |
| `ci` | 🔧 | CI/CD changes | `ci(github): add deploy workflow` |
| `chore` | 🔨 | Maintenance tasks | `chore(deps): update npm packages` |
| `revert` | ⏪ | Revert previous commit | `revert: revert login changes` |

### Scopes (কোন module)

Script automatically detect করে:
- `auth`, `user`, `admin` - User management
- `payment`, `stripe` - Payment system
- `message`, `chat`, `notification` - Communication
- `builder`, `query` - Query builders
- `socket`, `realtime` - Real-time features
- `logging`, `trace` - Observability
- `config`, `env` - Configuration
- `test`, `spec` - Testing
- `docs`, `readme` - Documentation

---

## 🔧 কিভাবে কাজ করে (Behind the Scenes)

### Step 1: Git Changes Collect

```javascript
// এই command run করে
const output = execSync('git diff --name-status HEAD');

// Output example:
// M    src/app/modules/auth/auth.service.ts
// A    src/app/modules/user/user.model.ts
// D    src/app/modules/old/deprecated.ts
```

### Step 2: File Status Parse

```javascript
// M = Modified, A = Added, D = Deleted, R = Renamed
const files = [
  { status: 'M', file: 'src/app/modules/auth/auth.service.ts' },
  { status: 'A', file: 'src/app/modules/user/user.model.ts' },
  // ...
];
```

### Step 3: Type Detection

```javascript
// File path এবং content analyze করে type detect করে
// Pattern matching use করে

if (file.includes('.test.') || file.includes('.spec.')) {
  return 'test';
}
if (file.includes('README') || file.endsWith('.md')) {
  return 'docs';
}
// ... more patterns
```

### Step 4: Scope Detection

```javascript
// File path থেকে scope extract করে
// src/app/modules/auth/auth.service.ts → scope: 'auth'
// src/app/builder/QueryBuilder.ts → scope: 'builder'
```

### Step 5: Confidence Calculation

```javascript
// বিভিন্ন factor consider করে confidence score বের করে
// - কতগুলো file same type
// - কতগুলো file same scope
// - Pattern match strength
// - File importance (service > util)
```

### Step 6: Message Generation

```javascript
// Type + Scope + Analyzed content → Message
// feat + auth + "add new function" → "feat(auth): add authentication feature"
```

---

## 📁 File Structure

```
scripts/smart-commit/
│
├── index.js (673 lines)
│   ├── CONFIG object - types, patterns, scopes
│   ├── getChangedFiles() - git diff execute
│   ├── analyzeChanges() - orchestrator function
│   ├── analyzeDiff() - content analysis
│   ├── detectScope() - scope extraction
│   ├── generateCommitSuggestions() - message creation
│   ├── generateSubject() - subject line generation
│   ├── groupFilesByPurpose() - file categorization
│   └── main() - CLI interface
│
├── explained.js - Technical architecture explanation
│
├── tutorial.js - Bangla tutorial with examples
│
├── code-walkthrough.js - Live demonstration
│
├── scenarios.js - Output examples for scenarios
│
└── README.md - This documentation
```

---

## 🎨 Output Customization

### Environment Variables

```bash
# Colors disable করতে
NO_COLOR=1 npm run commit

# Verbose mode
DEBUG=1 npm run commit
```

### CLI Flags

```bash
# Staged files only
npm run commit -- --staged

# Auto commit best match
npm run commit -- --commit

# Specific file analyze
npm run commit -- --file src/auth/login.ts

# JSON output
npm run commit -- --json
```

---

## ❓ FAQ

### Q: কোন commit message টা select করবো?

**A:** Highest confidence টা generally best। তবে:
- তুমি যা করেছো তার সাথে message টা match করছে কিনা দেখো
- খুব generic লাগলে আরেকটা select করো বা custom লেখো

### Q: Script ভুল type detect করলে?

**A:** এটা হতে পারে যদি:
- Unconventional file naming থাকে
- Mixed changes থাকে (feat + fix একসাথে)
- Solution: Changes আলাদা commit করো বা custom message লেখো

### Q: Scope detect হচ্ছে না?

**A:** Scope detect করতে file path analyze করে। যদি:
- `src/app/modules/[name]/` pattern না থাকে
- Unknown folder structure হয়
- তাহলে scope empty থাকতে পারে, manually add করো

### Q: Auto commit safe কি?

**A:** Safe, কিন্তু:
- `git status` আগে check করো
- Unstaged changes থাকলে সেগুলো commit হবে না
- `--staged` flag use করা better practice

---

## 🔗 Related Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Git Commit Best Practices](https://cbea.ms/git-commit/)
- [Semantic Versioning](https://semver.org/)

---

## 🤝 Contributing

এই script improve করতে চাইলে:

1. `index.js` এ নতুন pattern add করতে পারো
2. `CONFIG.PATTERNS` এ regex add করো
3. `CONFIG.SCOPES` এ নতুন scope add করো
4. Test করো: `npm run commit:scenarios`

---

## 📄 License

MIT License - এই project এর সাথে same license।
