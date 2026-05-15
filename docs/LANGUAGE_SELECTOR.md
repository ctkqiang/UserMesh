# 🌐 UserMesh Documentation / UserMesh 文档

Choose your language / 选择你的语言:

## English 🇺🇸

### Quick Navigation

1. **[Installation Guide](INSTALLATION_GUIDE.md)** - How to install UserMesh in your project
2. **[Getting Started](GETTING_STARTED.md)** - 5-minute setup guide
3. **[API Reference](api/API_REFERENCE.md)** - Complete API documentation
4. **[Examples](examples/EXAMPLES.md)** - Real-world usage examples
5. **[Developer Guide](guides/DEVELOPER_GUIDE.md)** - Comprehensive guide
6. **[Architecture](architecture/ARCHITECTURE.md)** - System design overview
7. **[Contributing](contributing/CONTRIBUTING.md)** - How to contribute

### All Files

| Document | Purpose |
|----------|---------|
| **README.md** | Project overview and features |
| **INSTALLATION_GUIDE.md** | Installation methods and troubleshooting |
| **GETTING_STARTED.md** | Quick start guide (5 minutes) |
| **guides/DEVELOPER_GUIDE.md** | Complete developer guide |
| **api/API_REFERENCE.md** | All methods and types |
| **examples/EXAMPLES.md** | Domain-specific examples |
| **architecture/ARCHITECTURE.md** | System architecture |
| **architecture/INTEGRATIONS.md** | Platform integrations |
| **contributing/CONTRIBUTING.md** | Development guide |

---

## 中文 🇨🇳

### 快速导航

1. **[安装指南](INSTALLATION_GUIDE.md)** - 如何在你的项目中安装 UserMesh
2. **[快速开始](GETTING_STARTED_ZH.md)** - 5 分钟设置指南
3. **[API 参考](api/API_REFERENCE.md)** - 完整的 API 文档（英文）
4. **[示例](examples/EXAMPLES_ZH.md)** - 真实世界的使用示例
5. **[开发者指南](guides/DEVELOPER_GUIDE_ZH.md)** - 全面的开发指南
6. **[架构](architecture/ARCHITECTURE.md)** - 系统设计概述（英文）
7. **[贡献代码](contributing/CONTRIBUTING.md)** - 如何贡献（英文）

### 所有文件

| 文档 | 用途 |
|------|------|
| **README.md** | 项目概览和功能特性 |
| **INSTALLATION_GUIDE.md** | 安装方法和故障排除 |
| **GETTING_STARTED_ZH.md** | 快速开始指南（5 分钟） |
| **guides/DEVELOPER_GUIDE_ZH.md** | 完整开发者指南 |
| **api/API_REFERENCE.md** | 所有方法和类型（英文） |
| **examples/EXAMPLES_ZH.md** | 领域特定的示例 |
| **architecture/ARCHITECTURE.md** | 系统架构（英文） |
| **architecture/INTEGRATIONS.md** | 平台集成（英文） |
| **contributing/CONTRIBUTING.md** | 开发指南（英文） |

---

## 文档状态 / Documentation Status

| Document | English | 中文 | Status |
|----------|---------|------|--------|
| Installation | ✅ | ✅ | Complete |
| Getting Started | ✅ | ✅ | Complete |
| API Reference | ✅ | 🔄 | In Progress |
| Developer Guide | ✅ | 🔄 | In Progress |
| Examples | ✅ | ✅ | Complete |
| Architecture | ✅ | 🔄 | Partial |
| Contributing | ✅ | 🔄 | Partial |

**Legend:**
- ✅ Complete / 完成
- 🔄 In Progress / 进行中
- ⏳ Planned / 计划中

---

## Quick Start / 快速开始

### English

```bash
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh
npm install
npm run build
npm link
```

Then read: **[Getting Started](GETTING_STARTED.md)**

### 中文

```bash
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh
npm install
npm run build
npm link
```

然后阅读: **[快速开始](GETTING_STARTED_ZH.md)**

---

## Key Features / 主要特性

**One SDK, Multiple Platforms / 一个 SDK，多个平台**

```typescript
// 记录一次事件
await sdk.recordAnalyticsEvent('user_signup', {
  method: 'email',
  plan: 'premium'
});

// 自动发送到所有已启用的平台：
// ✅ Google Analytics 4
// ✅ PostHog
// ✅ Mixpanel
// ✅ Microsoft Clarity
// ✅ Custom HTTP Endpoints
```

---

## Support / 支持

### English

- **Email**: ctkqiang@dingtalk.com
- **Repository**: https://gitcode.com/ctkqiang_sr/UserMesh.git
- **Issues**: Open an issue on the repository

### 中文

- **邮箱**: ctkqiang@dingtalk.com
- **仓库**: https://gitcode.com/ctkqiang_sr/UserMesh.git
- **问题**: 在仓库中提交 Issue

---

**Version** / **版本**: 1.0.0  
**Last Updated** / **最后更新**: 2026-05-15  
**Author** / **作者**: 钟智强 (ctkqiang@dingtalk.com)
