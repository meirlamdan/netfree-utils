## NetFree-Utils

A Chrome extension for netfree users.

> ⚠️ **תוסף זה מיועד אך ורק למשתמשי NetFree ([netfree.link](https://netfree.link))**
> הפונקציונליות מסתמכת על ה-API הפנימי של רשת NetFree ולא תעבוד ללא חיבור אליה.
>
> ⚠️ **This extension is intended exclusively for NetFree users ([netfree.link](https://netfree.link))**
> All functionality relies on NetFree's internal API and will not work without an active NetFree connection.

### ✨ מה התוסף עושה?

#### 1. 🔗 בודק קישורים בזמן אמת (Ctrl + ריחוף)

על ידי לחיצה פשוטה על מקש ה-Control (Ctrl) וריחוף מעל כל קישור אינטרנט, התוסף מציג טולטיפ כדי להציג את הסטטוס הנוכחי של הקישור מבלי לדרוש מהמשתמש ללחוץ או לעזוב את הדף.

#### 2. 📝 סיכום קישורים חסומים (פופאפ)

התוסף מנטר באופן פעיל בקשות רשת בלשונית הנוכחית. הוא עוקב אחר כל הכתובות (URLs) שמקבלות אות חסימה (HTTP 418) ומציג רשימה מאורגנת של קישורים חסומים אלו בחלון פופאפ ייעודי, הנגיש דרך אייקון התוסף.

#### 3. ▶️ סימון על סרטוני יוטיוב האם הוא פתוח בנטפרי

התוסף בודק אוטומטית כל סרטון ברשימת יוטיוב ומציג ליד כותרתו תג קטן המציין האם פתוח ✅, חסום ❌, לא נבדק ❓ — עוד לפני שלוחצים עליו.

#### 4. 👥 סימון קהילות Reddit (סאברדיטים)

בכל מקום שבו מוצג שם קהילה (r/xxx) — בתוצאות החיפוש, בפיד ובסרגל הצד — מופיע תג קטן המציין האם הקהילה פתוחה ✅, חסומה ❌ או לא נבדקה ❓ בנטפרי.

### Features

- check link if it's blocked by netfree or not, (when hover over link and press alt key or ctrl key)
- Status badges on YouTube video lists (open / blocked / unchecked)
- Status badges on Reddit community (subreddit) names (open / blocked / unchecked)
- ~~replace blocked youtube iframes with a placeholder with the video thumbnail~~ (in progress)
- Floating popup showing blocked URLs on the current tab (this feature is based on the great idea and implementation in [NetFree Helper](https://github.com/yossef7525/netfree-helper) by [yossef7525](https://github.com/yossef7525))
- More features coming in the future

## Installation

1. Clone the repository
2. Open chrome://extensions/ in your browser
3. Enable developer mode
4. Click on "Load unpacked" and select the cloned repository folder

## 💡 Got Ideas?

We'd love to hear them!  
The goal of this extension is to make life easier for NetFree users.  
If you have feature ideas, issues you've noticed, or improvements to suggest –  
please [open an issue](https://github.com/meirlamdan/netfree-utils/issues)

