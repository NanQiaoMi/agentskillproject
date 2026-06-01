# AgentFlow 大型项目本地化拓展指南 (Local-First Scaling Guide)

针对大型项目，如果依然坚持**“完全在本地完成协作与执行”**（不依赖云端 CI/CD 或外部 PR 流水线），我们可以通过优化本地的**分支隔离、多级门禁、目录分类与索引缓存**来实现支撑大规模代码库开发。

---

## 1. 本地自动化 Git 分支流 (Local Task-Branching)

为了防止多个智能体在同一个本地工作区分支下修改代码导致文件锁冲突或逻辑踩踏，必须引入**本地分支隔离机制**。

### 1.1 执行流改造
升级 `.agentflow/agentflow.py` 以集成以下本地 Git 命令：

1. **接单时自动切分支 (start)**：
   当智能体运行 `python agentflow.py start <id>` 时，脚本在后台自动执行：
   ```bash
   git checkout -b feature/<id>
   ```
   智能体将在该独立分支上进行代码修改。
2. **提审时自动保持最新 (submit)**：
   当运行 `python agentflow.py submit <id>` 时，脚本自动提交并切回基线分支或保持就绪：
   ```bash
   git add .
   git commit -m "feat: complete <id>"
   ```
3. **审查通过后本地自动合并 (review --approve)**：
   当 `claudecode` 运行 `review <id> --approve` 且测试通过后，脚本在本地自动将该特征分支合并回主开发分支（如 `main` 或 `dev`），并删除特征分支：
   ```bash
   git checkout main
   git merge feature/<id> --no-ff
   git branch -d feature/<id>
   ```

这样，整个开发过程在本地是完全分支隔离的，只有审查通过的代码才会合并入主分支，极大提升了本地代码库的稳定性。

---

## 2. 本地多级质量门禁 (Local Quality Gates)

在大型项目中，代码的健康程度不能仅依赖“单元测试”，需要引入多阶段的本地静态/动态检查。

### 2.1 配置文件扩展
在 `.agentflow/config.json` 中定义本地门禁阶段：
```json
{
  "frontend": {
    "lint_command": "eslint src/frontend/ --fix",
    "type_check_command": "tsc --noEmit",
    "test_command": "npm run test"
  },
  "backend": {
    "lint_command": "ruff check src/backend/ --fix",
    "type_check_command": "mypy src/backend/",
    "test_command": "pytest"
  }
}
```

### 2.2 claudecode 执行逻辑
`claudecode` 运行 `review` 时，按顺序在本地静默执行上述三个阶段。任何一个阶段报错，即直接打回。这能保证进入测试阶段的代码已经具备极高的规范性。

---

## 3. 本地任务目录分组管理 (Task Categorization)

当任务量达到上百个时，将所有 `.md` 卡片堆放在 `.agentflow/tasks/` 下会导致目录极其拥挤。

### 3.1 目录层级结构
允许按照**功能模块（Epic）**建立子文件夹：
```text
.agentflow/tasks/
├── auth/               # 用户鉴权模块
│   ├── TASK-001.md
│   └── TASK-002.md
├── payment/            # 支付模块
│   └── TASK-003.md
└── README.md
```
### 3.2 CLI 搜索算法升级
修改 `agentflow.py` 中的 `glob` 扫描算法，使其支持递归扫描：
```python
# 修改前
task_files = glob.glob(os.path.join(TASKS_DIR, "TASK-*.md"))

# 修改后（支持子目录递归）
task_files = glob.glob(os.path.join(TASKS_DIR, "**/TASK-*.md"), recursive=True)
```

---

## 4. 本地 SQLite 缓存索引加速 (Local DB Caching)

在大规模项目中，频繁使用 `glob` 递归读取数百个 Markdown 文件并解析 JSON 头部，会导致 `list` 命令出现 1-2 秒的肉眼可见延迟。

### 4.1 双轨制存储方案
- **真源（Source of Truth）**：依然是 `.md` 任务文件，方便 Git 版本追踪和人眼直接编辑。
- **缓存引擎（Cache Engine）**：引入一个本地的隐藏数据库文件 `.agentflow/tasks.db`。
- **机制**：
  - 当执行 `add`、`start`、`submit` 等写操作时，脚本同时写入 `.md` 文件并向 SQLite 更新对应的行。
  - 当执行 `list` 等纯读操作时，脚本**直接查询 SQLite 数据库**（耗时小于 10 毫秒）。
  - 提供 `python agentflow.py sync` 命令，用于在用户手动修改了 `.md` 卡片后，一键重构 SQLite 缓存。

---

## 5. 本地隔离测试环境 (Local Test Containers)

当 `claudecode` 运行后端测试时，如果测试涉及真实的数据库读写，直接在开发机本地数据库运行可能会污染您的开发数据，或因为端口冲突导致测试失败。

### 5.1 方案
在根目录配置 `docker-compose.test.yml`，每次 `claudecode` 运行自动化测试前，自动在本地启动一个临时的 Docker 容器数据库（如 MySQL/PostgreSQL/Redis），测试完成后自动销毁。这保证了本地测试环境的高度干净和一致。
