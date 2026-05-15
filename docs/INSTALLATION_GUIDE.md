# Installation Guide / 安装指南

**Language** | [English](#english) | [中文](#chinese)

---

## English

### Installation Methods

UserMesh is a **private package** available only through the source repository. It is not published to the public npm registry.

#### Method 1: Git Clone + Link (Recommended for Development)

```bash
# Clone the repository
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh

# Install dependencies
npm install

# Build the package
npm run build

# Create a symbolic link
npm link

# In your project directory
npm link @usermesh/sdk-web
```

**Advantages:**
- Easy to update with latest changes
- Simple to debug and contribute
- Immediate access to new features

**Disadvantages:**
- Requires cloning the repository
- Takes up disk space

#### Method 2: Git URL in package.json (Recommended for Production)

```json
{
  "dependencies": {
    "@usermesh/sdk-web": "git+https://gitcode.com/ctkqiang_sr/UserMesh.git#main"
  }
}
```

Then run:

```bash
npm install
```

**Advantages:**
- Clean, minimal setup
- Automatically fetches latest from main branch
- Works in CI/CD pipelines
- No local cloning required

**Disadvantages:**
- Requires git installed on deployment machine
- Network dependency

#### Method 3: Bun Package Manager

```bash
# Clone and install with bun
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh
bun install
bun run build

# Link in your project
bun link
cd /path/to/your/project
bun link @usermesh/sdk-web
```

Or in `bunfig.toml`:

```toml
[install.scopes]
"@usermesh" = { token = "GITHUB_TOKEN", url = "git+https://gitcode.com/ctkqiang_sr/UserMesh.git#main" }
```

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (or bun 1.0+)
- **TypeScript**: 4.5.0 or higher (for TypeScript projects)

### Verification

After installation, verify UserMesh is properly installed:

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

console.log('UserMesh SDK loaded successfully');
const sdk = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: false,
      googlePropertyIdentifier: 'G-TEST'
    }
  }
});
console.log('SDK instance created');
```

### Troubleshooting

**Problem:** "Module not found" error

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Or if using npm link
npm unlink @usermesh/sdk-web
npm link /path/to/UserMesh
```

**Problem:** TypeScript errors with UserMesh types

**Solution:**
```bash
# Ensure TypeScript is installed
npm install --save-dev typescript@^4.5.0

# Clear TypeScript cache
rm -rf dist
npm run build
```

**Problem:** Permission denied when cloning

**Solution:**
```bash
# Use HTTPS instead of SSH
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git

# Or configure git to use HTTPS
git config --global url."https://".insteadOf git://
```

---

## Chinese

### 安装方法

UserMesh 是一个**私有包**，仅可通过源代码仓库获取，不发布到公共 npm 注册表。

#### 方法 1: Git 克隆 + 链接（推荐开发使用）

```bash
# 克隆仓库
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh

# 安装依赖
npm install

# 构建包
npm run build

# 创建符号链接
npm link

# 在你的项目目录中
npm link @usermesh/sdk-web
```

**优点：**
- 易于更新到最新版本
- 便于调试和贡献
- 立即获得新功能

**缺点：**
- 需要克隆仓库
- 占用磁盘空间

#### 方法 2: package.json 中的 Git URL（推荐生产使用）

```json
{
  "dependencies": {
    "@usermesh/sdk-web": "git+https://gitcode.com/ctkqiang_sr/UserMesh.git#main"
  }
}
```

然后运行：

```bash
npm install
```

**优点：**
- 设置简洁最小化
- 自动获取 main 分支最新版本
- 适用于 CI/CD 管道
- 无需本地克隆

**缺点：**
- 部署机器上需要安装 git
- 依赖网络连接

#### 方法 3: Bun 包管理器

```bash
# 用 bun 克隆并安装
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git
cd UserMesh
bun install
bun run build

# 在你的项目中链接
bun link
cd /path/to/your/project
bun link @usermesh/sdk-web
```

或在 `bunfig.toml` 中：

```toml
[install.scopes]
"@usermesh" = { token = "GITHUB_TOKEN", url = "git+https://gitcode.com/ctkqiang_sr/UserMesh.git#main" }
```

### 系统要求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本（或 bun 1.0+）
- **TypeScript**: 4.5.0 或更高版本（TypeScript 项目）

### 验证安装

安装后，验证 UserMesh 是否正确安装：

```typescript
import { UserMeshAnalyticsSdkClient } from '@usermesh/sdk-web';

console.log('UserMesh SDK 加载成功');
const sdk = new UserMeshAnalyticsSdkClient({
  analyticsIntegrations: {
    googleAnalytics4: {
      isEnabled: false,
      googlePropertyIdentifier: 'G-TEST'
    }
  }
});
console.log('SDK 实例已创建');
```

### 故障排除

**问题：** "Module not found" 错误

**解决方案：**
```bash
# 清除 node_modules 并重新安装
rm -rf node_modules
npm install

# 或如果使用 npm link
npm unlink @usermesh/sdk-web
npm link /path/to/UserMesh
```

**问题：** UserMesh 类型 TypeScript 错误

**解决方案：**
```bash
# 确保已安装 TypeScript
npm install --save-dev typescript@^4.5.0

# 清除 TypeScript 缓存
rm -rf dist
npm run build
```

**问题：** 克隆时权限被拒绝

**解决方案：**
```bash
# 使用 HTTPS 代替 SSH
git clone https://gitcode.com/ctkqiang_sr/UserMesh.git

# 或配置 git 使用 HTTPS
git config --global url."https://".insteadOf git://
```

---

**Questions?** / **有问题？**

- **Email / 邮箱**: ctkqiang@dingtalk.com
- **Repository / 仓库**: https://gitcode.com/ctkqiang_sr/UserMesh.git
