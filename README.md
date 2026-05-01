# 甜蜜情侣积分 (Sweet Couple Points)

一个让情侣日常互动游戏化的微信小程序。

## 技术栈

- **前端**: 原生微信小程序（WXML/WXSS/JS）
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）

## 目录结构

```
sweet-couple-points/
├── miniprogram/              # 小程序前端
│   ├── app.js                # 应用入口
│   ├── app.json              # 全局配置（页面注册、tabBar）
│   ├── app.wxss              # 全局样式
│   ├── pages/                # 页面
│   │   ├── index/            # 首页（情侣信息+积分总览）
│   │   ├── tasks/            # 任务列表
│   │   ├── shop/             # 奖励商店
│   │   ├── timeline/         # 积分时间线
│   │   ├── profile/          # 个人中心
│   │   ├── bind/             # 情侣绑定
│   │   ├── anniversary/      # 纪念日
│   │   ├── mood/             # 心情打卡
│   │   └── messages/         # 留言板
│   ├── components/           # 公共组件
│   ├── utils/                # 工具函数
│   ├── images/               # 图片资源
│   └── styles/               # 样式变量
└── cloudfunctions/           # 云函数（后端）
    ├── login/                # 登录获取 openid
    └── quickstartFunctions/  # 业务函数集合
```

## 本地开发

### 1. 安装微信开发者工具

下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. 导入项目

打开微信开发者工具 → 导入项目 → 选择本仓库根目录 → AppID 已写入 `project.config.json`

### 3. 开通云开发

- 在开发者工具左上角点击 "云开发" 按钮
- 创建环境（首次免费）
- 记下环境 ID，填入 `miniprogram/app.js` 的 `env` 字段

### 4. 部署云函数

右键 `cloudfunctions/login` → 上传并部署：云端安装依赖

## 安全须知

- **AppSecret 不要写入代码**。云开发模式下完全不需要它。
- `project.private.config.json` 已加入 `.gitignore`，本地个性化配置不会提交。
- 用户敏感信息（openid 等）只通过云函数获取，不要在前端硬编码。

## MVP 功能清单

- [ ] 微信登录 + 获取 openid
- [ ] 情侣绑定（邀请码/扫码）
- [ ] 积分账本（加分/扣分 + 原因 + 时间线）
- [ ] 任务系统（日常/周期/自定义）
- [ ] 奖励商店（兑换特权）
- [ ] 纪念日提醒
- [ ] 心情打卡
- [ ] 留言板
