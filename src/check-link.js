const messages = {
  unknown: 'לא נבדק ❓',
  'unknown-video': 'לא נבדק ❓',
  custom: 'נחסם ❌',
  deny: 'נחסם ❌',
  'special-site': 'נחסם ❌',
  indev: 'מחפשים פתרונות... 🤔',
};


const tooltip = document.createElement('div');
tooltip.id = 'custom-ctrl-tooltip';
document.body.appendChild(tooltip);

let currentTarget = null;
let isLoading = false;

document.addEventListener('mouseover', async (event) => {
  const link = event.target.closest('a');
  if (link && event.ctrlKey) {
    if (currentTarget !== link) {
      hideTooltip();
    } else if (isLoading) {
      return;
    }
    currentTarget = link;
    try {
      isLoading = true;
      tooltip.textContent = 'בודק...';
      tooltip.style.display = 'inline-block';
      updateSmartPosition(link);
      const data = await chrome.runtime.sendMessage({ type: 'checkLink', url: link.href });
      if (currentTarget === link) {
        const message = !data
          ? '⚠️ שגיאה בקבלת מידע'
          : !data.block
            ? 'פתוח ✅'
            : messages[data.block] || data.block;
        tooltip.textContent = message;
        // נעדכן את המיקום שוב כדי להתאים לגודל החדש של ההודעה
        updateSmartPosition(link);
      }
    } catch (e) {
      if (currentTarget === link) {
        tooltip.textContent = '⚠️ שגיאה בקבלת מידע';
        updateSmartPosition(link);
      }
    } finally {
      isLoading = false;
    }
  } else if (currentTarget && currentTarget !== link) {
    hideTooltip();
  }
});

document.addEventListener('mouseout', (event) => {
  const link = event.target.closest('a');
  if (link) {
    hideTooltip();
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'Control') {
    hideTooltip();
  }
});

// --- 4. פונקציית הסתרה (מעודכנת לניקוי חץ דינמי) ---
function hideTooltip() {
  tooltip.style.display = 'none';
  currentTarget = null;
  isLoading = false;
  // ניקוי המחלקות הדינמיות (כפי שסיכמנו)
  tooltip.classList.remove('arrow-up', 'arrow-down');
}


// --- 5. פונקציית המיקום החכם (מעודכנת לטיפול בחץ) ---
function updateSmartPosition(element) {
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const padding = 10;

  // ננקה מחלקות קודמות לפני חישוב חדש
  tooltip.classList.remove('arrow-up', 'arrow-down');

  // --- 1. חישוב אנכי (למעלה/למטה) ---

  let top;
  let arrowDirection;

  // ברירת מחדל: מתחת לאלמנט
  const defaultTop = rect.bottom + gap;

  // בדיקה: האם חורג מתחתית המסך?
  if (defaultTop + tooltipRect.height > window.innerHeight) {
    // אם כן: מציגים מעל האלמנט
    top = rect.top - tooltipRect.height - gap;
    arrowDirection = 'arrow-down';
  } else {
    // אם לא: מציגים מתחת לאלמנט
    top = defaultTop;
    arrowDirection = 'arrow-up';
  }

  // הוספת המחלקה המתאימה
  tooltip.classList.add(arrowDirection);

  // הוספת הגלילה (Scroll)
  top += window.scrollY;


  // --- 2. חישוב אופקי (מרכז/הזזה לצדדים) ---

  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  if (left < padding) {
    left = padding;
  } else if (left + tooltipRect.width > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width - padding;
  }

  left += window.scrollX;

  // --- 3. השמה סופית ---
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

// --- 6. עדכון מיקום בזמן גלילה (אותו דבר) ---
window.addEventListener('scroll', () => {
  if (tooltip.style.display === 'block' && currentTarget) {
    updateSmartPosition(currentTarget);
  }
});