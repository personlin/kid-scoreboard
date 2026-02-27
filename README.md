# 🏆 家庭計分板 (Kid Scoreboard)

歡迎來到家庭計分板應用！這是一個親子友善的家庭獎勵系統，用於激勵孩子完成任務和管理願望兌換。

## ✨ 功能特色

### 📊 孩子計分板 (`/board`)
- 🎯 實時顯示每位孩子的累積積分
- 🌈 彩色漸層卡片設計，視覺吸引力強
- 🔄 自動每 10 秒刷新（適合展示在家中螢幕上）
- 📋 待執行願望清單
- 🔢 **數字 PIN 門禁**：進入前須輸入數字密碼（由家長在管理區設定）；未設定則直接開放

### 👨‍💼 家長管理區 (`/admin`)
- ⭐ **快速加扣分**：一鍵加減 1/2/5 分
- 📝 **一般加扣分**：輸入任意正負整數分數與理由，靈活獎勵或扣分
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

- 🔒 **計分看板密碼設定**：
  - 設定 1–8 位數字 PIN，儲存於 Supabase `settings` 資料表
  - 所有裝置即時同步，無跨瀏覽器問題
  - 留空則撤除密碼保護

### � 歷史紀錄 (`/history`)
- 🔍 依孩子查詢加扣分紀錄（最近 100 筆）
  - 顯示時間、點數變化（色碼 ±）、原因（任務名稱 / 快速加扣分 / 一般加扣分：理由）、備註
- 🎁 依孩子查詢願望兌換紀錄（最近 100 筆）
  - 顯示兌換時間、願望名稱、點數、狀態（⏳ 待執行 / ✅ 已完成）、完成時間
- 所有時間戳以 `Asia/Taipei` 時區顯示

### 🔐 安全性

| 頁面 | 認證方式 |
|------|----------|
| `/admin` | Supabase Email / Password 登入（AuthGate）|
| `/history` | Supabase Email / Password 登入（AuthGate）|
| `/board` | 數字 PIN 門禁（BoardPinGate），PIN 儲存於 Supabase `settings`；未設定則直接開放；**管理員已登入時自動跳過 PIN** |

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
│   ├── page.tsx          # 首頁（快速入口）
│   ├── admin/page.tsx    # 家長管理頁面
│   ├── board/page.tsx    # 孩子計分板
│   ├── history/page.tsx  # 加扣分與兌換歷史紀錄
│   ├── layout.tsx        # 通用佈局
│   └── globals.css       # 全域樣式
├── components/
│   ├── AuthGate.tsx      # Email/Password 認證守衛（admin / history）
│   └── BoardPinGate.tsx  # 數字 PIN 門禁（board）
└── lib/
    └── supabaseClient.ts # Supabase 客戶端配置 + errMsg() 工具函式
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

### Point Events（加扣分紀錄，資料表名 `point_events`）
- `kid_id`: 孩子 ID
- `delta`: 點數變化（正為加分、負為扣分）
- `kind`: 事件類型（`'task'` 任務 / `'manual'` 手動 / `'redeem'` 兌換扣分）
- `reason`: 說明文字（任務名稱、手動備註等）
- `task_id`: 關聯的任務 ID（非任務時為 null）
- `redemption_id`: 關聯的兌換 ID（非兌換時為 null）
- `event_date`: 事件日期（用於每日任務去重）
- `created_at`: 紀錄時間

### Settings（系統設定，資料表名 `settings`）
- `key`: 設定鍵值（目前使用 `board_pin`）
- `value`: 設定值（文字）
- RLS：匿名可讀（供 BoardPinGate 驗證）、已登入者可寫（供管理員修改）

### Redemptions（兌換紀錄）
- `kid_id`: 孩子 ID
- `reward_id`: 願望 ID
- `status`: `'pending'` 或 `'done'`
- `redeemed_at`: 兌換時間
- `done_at`: 完成時間
- `note`: 備註

## 🎯 使用流程

### 孩子視角
1. 打開 [/board](http://localhost:3000/board)，輸入家長設定的數字 PIN
2. 查看自己的積分與待執行願望
3. 完成任務後點擊「每日任務」領取點數（每日任務當天只能領一次）
4. 累積足夠點數後點擊「願望兌換」選擇想要的獎勵

### 家長視角（初次設定）
1. 打開 [/admin](http://localhost:3000/admin)，以 Supabase 帳號登入
2. **新增孩子**：在孩子管理區建立孩子資料
3. **設定任務**：在「任務管理」區新增每日任務與點數
4. **設定願望**：在「願望管理」區新增可兌換的獎勵
5. **設定 PIN**：在「計分看板密碼」區設定數字 PIN，儲存後跨裝置同步

### 家長視角（日常使用）
1. 使用「快速加扣分」按鈕（±1/2/5）即時獎勵或扣分
2. 使用「一般加扣分」輸入自訂分數與理由，進行彈性加扣分
3. 查看「待執行願望」，為孩子兌現承諾後標記完成
4. 點擊「📋 紀錄」前往 [/history](http://localhost:3000/history)，依孩子查看加扣分與兌換紀錄
5. 登入後直接前往 [/board](http://localhost:3000/board) 查看計分板，無需再輸入 PIN

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
