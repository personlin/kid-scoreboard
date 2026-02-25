# 🏆 家庭計分板 (Kid Scoreboard)

歡迎來到家庭計分板應用！這是一個親子友善的家庭獎勵系統，用於激勵孩子完成任務和管理願望兌換。

## ✨ 功能特色

### 📊 孩子計分板 (`/board`)
- 🎯 實時顯示每位孩子的累積積分
- 🌈 彩色漸層卡片設計，視覺吸引力強
- 🔄 自動每 10 秒刷新（適合展示在家中螢幕上）
- 📋 待執行願望清單

### 👨‍💼 家長管理區 (`/admin`)
- ⭐ **快速加扣分**：一鍵加減 1/2/5 分
- ✅ **任務管理**：
  - 建立、編輯、排序、刪除任務
  - 支援每日任務（同一天只能領一次）
  - 孩子可直接領取任務點數
  
- 🎁 **願望管理**：
  - 建立和管理可兌換的願望
  - 設定兌換所需點數
  - 孩子可直接兌換願望
  
- 🌟 **待執行願望追蹤**：
  - 檢視所有待完成的兌換
  - 標記願望已完成

### 🔐 安全性
- Supabase 認證門禁（AuthGate）
- 家長管理區需認證登入

## 🚀 快速開始

### 前置需求
- Node.js 18+
- npm 或 yarn
- Supabase 帳號（用於認證和數據庫）

### 安裝依賴
```bash
npm install
```

### 環境配置
在根目錄建立 `.env.local` 檔案，設定 Supabase 連線資訊：
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 開發模式
```bash
npm run dev
```

在瀏覽器打開 [http://localhost:3000](http://localhost:3000) 查看應用。

### 生產構建
```bash
npm run build
npm start
```

## 📚 專案結構

```
src/
├── app/
│   ├── page.tsx          # 首頁
│   ├── admin/page.tsx    # 家長管理頁面
│   ├── board/page.tsx    # 孩子計分板
│   ├── layout.tsx        # 通用佈局
│   └── globals.css       # 全域樣式
├── components/
│   └── AuthGate.tsx      # 認證守衛
└── lib/
    └── supabaseClient.ts # Supabase 客戶端配置
```

## 🛠️ 開發工具

### 代碼檢查
```bash
npm run lint
```

### 構建驗證
```bash
npm run build
```

所有代碼已使用 TypeScript 進行型別檢查。

## 📱 UI 設計

該應用採用親子友善的設計原則：
- 🎨 彩色漸層背景和按鈕
- 😊 大量表情符號增加視覺吸引力
- 📏 大字型和高對比度
- ♿ 響應式設計，支援各種螢幕尺寸

## 🔄 資料模型

### Kids（孩子）
- `id`: 唯一識別符
- `name`: 孩子名字
- `sort_order`: 顯示順序

### Tasks（任務）
- `title`: 任務名稱
- `points`: 獲得點數
- `is_daily`: 是否為每日限制任務
- `active`: 是否啟用
- `sort_order`: 顯示順序

### Rewards（願望）
- `title`: 願望名稱
- `cost_points`: 兌換所需點數
- `active`: 是否啟用
- `sort_order`: 顯示順序

### Redemptions（兌換紀錄）
- `kid_id`: 孩子 ID
- `reward_id`: 願望 ID
- `status`: 'pending' 或 'done'
- `redeemed_at`: 兌換時間
- `done_at`: 完成時間

## 🎯 使用流程

### 孩子視角
1. 打開 [/board](http://localhost:3000/board) 查看計分板
2. 完成家長指定的任務時，點擊「每日任務」領取點數
3. 累積足夠點數後，點擊「願望兌換」選擇想要的獎勵

### 家長視角
1. 打開 [/admin](http://localhost:3000/admin) 進入管理區
2. **設定任務和願望**：
   - 在「任務管理」區新增每日任務
   - 在「願望管理」區新增可兌換的獎勵
3. **管理積分**：
   - 使用「快速加扣分」按鈕獎勵或懲罰
   - 查看「待執行願望」了解進度
4. **追蹤進度**：標記完成的願望

## 📦 技術棧

- **框架**: [Next.js 16.1.6](https://nextjs.org)
- **UI框架**: [React 19](https://react.dev)
- **語言**: [TypeScript](https://www.typescriptlang.org)
- **後端**: [Supabase](https://supabase.com)
- **代碼檢查**: [ESLint](https://eslint.org)

## 📝 版本

- **版本**: 0.1.0
- **狀態**: 開發中

## 🤝 貢獻

歡迎提交 Issues 和 Pull Requests！

## 📄 授權

此專案為私人應用。

---

製作於 ❤️ 為了家庭和孩子們的成長
