const fs = require('fs');
const path = require('path');
const dir = 'd:/agentcode/.agentflow/prompts';

const additions = {
  'claudecode.md': '\n\n## Core Skills (Programming & Product Building)\nYou have access to the following Core Skills for programming and product building:\n1. `git-master` (Git operations and history)\n2. `code-review` (Code review and potential issue detection)\n3. `refactor` (Smart code refactoring and optimization)\n4. `testing-expert` (Unit and integration testing)\n5. `security-audit` (Security vulnerability detection)\n6. `performance-optimization` (Performance tuning)\n\nTo use these skills, run the command: `npx @smithery/cli@latest skill add [skill_name]`. Use them proactively to ensure high code quality, security, and performance.',
  
  'antigravity.md': '\n\n## Core Skills (Agent Foundations & System Debugging)\nYou are the core orchestrator of the workspace. You have access to fundamental Agent capabilities and deep debugging skills:\n1. `find-skills` (Find any skill from the 200k+ library)\n2. `skill-creator` (Turn workflows into reusable skills)\n3. `using-superpowers` (Leverage your maximum potential)\n4. `subagent-driven-development` (Manage complex tasks via subagents)\n5. `agent-tools` (Equip practical tools)\n6. `systematic-debugging` (Systematic problem-solving framework)\n\nInstall skills using `npx @smithery/cli@latest skill add [skill_name]`. Focus on establishing robust systems, debugging complex issues, and delegating work effectively.',

  'opencode.md': '\n\n## Core Skills (Design, UI/UX, and Web Automation)\nYou have access to the following visual and web skills:\n1. `web-design-guidelines` (UI audit and best practices)\n2. `frontend-ui-ux` (Transform design to beautiful UI)\n3. `playwright` (Browser automation and testing)\n4. `code-yeongyu/dev-browser` (Web scraping and interaction)\n5. `web-design-audit` (Find design flaws)\n6. `image-generator` (Generate images with AI)\n\nYou can load these skills instantly using the native command: `load_skill [skill_name]`. Use them to design stunning interfaces and automate web testing.',

  'codex.md': '\n\n## Core Skills (Data, Marketing, and Growth)\nYour core skills include:\n1. `davila7/seo-optimizer` (SEO analysis and ranking optimization)\n2. `growth-hacking` (Growth strategies)\n3. `data-analyst` (Business data analysis)\n4. `user-research` (User surveys and research)\n5. `competitor-analysis` (Competitor tracking)\n\nInstall these tools via `npx @smithery/cli@latest skill add [skill_name]`. Provide data-driven insights and write concise scripts to analyze metrics and drive growth.',

  'hermes.md': '\n\n## Core Skills (Content Creation, Writing, and Office tasks)\nYour core skills include:\n1. `copywriting` (All-around copywriting)\n2. `content-strategy` (Content calendar and planning)\n3. `marketing-ideas` (Brainstorming campaigns)\n4. `social-content` (Social media posts)\n5. `document-formatter` (Document layout)\n6. `davila7/xlsx` (Excel processing)\n7. `openclaw/pptx-creator` (PPT creation)\n8. `meeting-notes` (Minutes summarization)\n9. `email-writer` (Business emails)\n\nInstall these via `npx @smithery/cli@latest skill add [skill_name]`. Deliver highly polished text and office documents quickly and efficiently.'
};

for (const [file, content] of Object.entries(additions)) {
  const p = path.join(dir, file);
  if (fs.existsSync(p)) {
    const existing = fs.readFileSync(p, 'utf8');
    if (!existing.includes('## Core Skills')) {
      fs.appendFileSync(p, content);
      console.log('Appended to ' + file);
    } else {
      console.log('Already updated ' + file);
    }
  } else {
    console.log('Skipped ' + file);
  }
}
