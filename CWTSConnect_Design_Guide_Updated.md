# CWTSConnect UI/UX Design Guide

## 1. Design Direction
CWTSConnect should follow a clean, professional, and academic interface style. The design must support readability, easy navigation, and clear presentation of records, monitoring data, DSS results, evaluations, and reports.

### Core Principles
- Keep the layout simple and uncluttered.
- Use consistent components across all user roles.
- Maintain clear visual hierarchy.
- Prioritize readability and usability.
- Use responsive layouts for desktop, tablet, and mobile.
- Do not rely on color alone for status and meaning.

---

## 2. Final Color Palette
The system will use a simplified color palette based on the selected palette and white.

| Color Role | Hex Code | Suggested Use |
|---|---|---|
| Primary Dark Green | `#0B3D2E` | Sidebar, main brand color, major navigation |
| Secondary Green | `#145A3A` | Header, section headers, secondary navigation |
| Accent Green | `#2F7D5B` | Buttons, active states, highlights |
| Support Beige | `#CBBFA6` | Soft highlight areas, summary cards, section accents |
| Dark Neutral | `#1B1F23` | Main text, icons, labels |
| White | `#FFFFFF` | Main background, cards, forms, content surfaces |

---

## 3. 60-30-10 Rule
To keep the interface balanced, the colors should follow the 60-30-10 rule.

### 60% — Dominant Colors
- `#FFFFFF`
- Used for main background, content areas, forms, cards, and tables.

### 30% — Secondary Colors
- `#0B3D2E`
- `#145A3A`
- Used for sidebar, header, structural UI, section titles, and navigation.

### 10% — Accent Color
- `#2F7D5B`
- Used for primary buttons, active states, links, and important highlights.

### Support Color
- `#CBBFA6`
- Used for light emphasis areas, summary blocks, and secondary surfaces.

### Neutral Text Color
- `#1B1F23`
- Used for text, icons, dividers, and strong contrast elements.

---

## 4. Suggested UI Application

### Sidebar
- Background: `#0B3D2E`
- Text: `#FFFFFF`
- Active item: `#2F7D5B`

### Header
- Background: `#145A3A`
- Text: `#FFFFFF`

### Main Content Area
- Background: `#FFFFFF`
- Text: `#1B1F23`

### Buttons
- Primary button: `#2F7D5B`
- Primary button text: `#FFFFFF`
- Hover state: `#145A3A`

### Cards
- Standard card background: `#FFFFFF`
- Highlighted/summary card background: `#CBBFA6`
- Card text: `#1B1F23`

### Text
- Primary text: `#1B1F23`
- Inverse text on dark backgrounds: `#FFFFFF`

---

## 5. Typography

### Font Family
- **Primary:** Inter
- **Fallback:** Arial, Helvetica, sans-serif

### Font Sizes
| Element | Size | Weight |
|---|---:|---:|
| H1 / Page Title | 32px | 700 |
| H2 / Section Title | 24px | 700 |
| H3 / Subsection | 20px | 600 |
| Card Title | 18px | 600 |
| Body Text | 14–16px | 400 |
| Button Text | 14px | 600 |
| Table Text | 14px | 400–500 |
| Label | 13–14px | 500 |
| Caption | 12px | 400 |

---

## 6. Text Colors
| Purpose | Hex |
|---|---|
| Primary Text | `#1B1F23` |
| Secondary Text | `#145A3A` |
| Inverse Text | `#FFFFFF` |
| Soft Text / Supporting Labels | `#2F7D5B` |

---

## 7. Spacing System
Use an 8px-based spacing system.

| Token | Value |
|---|---:|
| XS | 4px |
| SM | 8px |
| MD | 16px |
| LG | 24px |
| XL | 32px |
| 2XL | 48px |

---

## 8. Component Rules

### Buttons
- Height: 40–44px
- Border radius: 8px
- Horizontal padding: 16–20px

### Inputs
- Height: 44px
- Border radius: 8px
- Background: `#FFFFFF`
- Border: use a subtle neutral stroke or soft dark border
- Focus: emphasize with `#2F7D5B`

### Cards
- Background: `#FFFFFF`
- Border radius: 10–12px
- Padding: 20–24px
- Use subtle shadows only

### Tables
- Header may use `#145A3A` with white text or a light neutral header with dark text.
- Row text should use `#1B1F23`.
- Support search, filter, sort, and pagination for large datasets.

### Status Badges
Recommended semantic usage:
- Success: use green-based styling
- Warning: use beige or a warm warning color if needed
- Error: use a separate red color if necessary for alerts

> Note: Even though the main system palette is simplified, functional semantic colors may still be used for alerts, errors, warnings, and success messages when needed.

---

## 9. Layout Rules

### Desktop
- Sidebar: 240–260px
- Header: 64px
- Main content padding: 24–32px

### Tablet
- Collapsible sidebar
- Drawer-based navigation
- Tables may scroll horizontally

### Mobile
- Single-column layout
- Stacked cards and forms
- Sidebar becomes drawer navigation

---

## 10. Role Consistency
The Student, Community Official, and NSTP Official/Coordinator interfaces should use the same visual system.

These should stay consistent across all roles:
- Color palette
- Font family
- Font sizes
- Button style
- Form style
- Table style
- Card style
- Icon style
- Spacing rules

Only these should differ:
- Available modules
- Navigation items
- Dashboard content
- User permissions

---

## 11. DSS Interface Rules
Because the DSS is a major system feature, its interface must clearly show:
- Community request details
- Eligible students
- Location compatibility
- Skills/request compatibility
- Final suitability score
- Ranking
- Recommended students
- Coordinator final decision

Use the accent green `#2F7D5B` for important DSS actions such as **Run Matching**, **View Recommendation**, and **Approve Deployment**.

---


## 12. Skeleton Loading Design Guide

Skeleton loaders should be used while pages, cards, tables, dashboards, and DSS results are waiting for data. The skeleton must reflect the expected layout of the actual content so users can understand what is loading without seeing sudden layout changes.

### General Skeleton Rules
- Use skeletons for content that normally takes noticeable time to load, especially dashboards, tables, profile data, monitoring records, analytics, and DSS results.
- Match the size, spacing, and shape of the final component as closely as possible.
- Keep the loading layout stable. Do not let cards, rows, or sections jump when real data appears.
- Do not use green accent colors for ordinary skeleton blocks because green is reserved for branding, actions, and status meaning.
- Use a subtle shimmer or pulse animation only when needed.
- Avoid showing both a spinner and a full skeleton for the same content area.
- Replace the skeleton immediately after the requested data becomes available.
- If loading fails, replace the skeleton with a clear error state and a **Retry** action.

### Skeleton Colors
Use only the existing CWTSConnect palette with opacity adjustments.

| Skeleton Element | Recommended Style |
|---|---|
| Main skeleton block | `#CBBFA6` at approximately 30–40% opacity |
| Lighter skeleton block | `#CBBFA6` at approximately 18–25% opacity |
| Skeleton on dark green surfaces | `#FFFFFF` at approximately 15–20% opacity |
| Shimmer highlight | `#FFFFFF` at approximately 25–35% opacity |
| Skeleton container/background | `#FFFFFF` |

### Shape and Radius
- Text line skeleton: **6–12px radius**
- Button skeleton: **8px radius**
- Input skeleton: **8px radius**
- Card skeleton: **12px radius**
- Avatar/profile placeholder: **50% radius / circular**
- Status badge skeleton: **999px radius**

### Recommended Skeleton Sizes
| Content Type | Skeleton Size |
|---|---|
| Page title | 220–320px width × 28–32px height |
| Section title | 160–240px width × 20–24px height |
| Body text line | 60–90% container width × 12–16px height |
| Short label | 80–140px width × 12–14px height |
| Input field | Full available width × 44px height |
| Primary button | 120–180px width × 40–44px height |
| Dashboard stat value | 80–120px width × 28–36px height |
| Table row text | 50–85% of column width × 12–14px height |

### Dashboard Skeleton
For Student, Community Official, and NSTP Official/Coordinator dashboards:
- Keep the page header visible if it does not depend on server data.
- Show skeleton cards in the same grid used by the final summary cards.
- Each card may contain a small label skeleton, a larger value skeleton, and an optional icon placeholder.
- Use the same number of placeholder cards as the first visible dashboard row whenever practical.

Example structure:

```text
┌────────────────────┐  ┌────────────────────┐
│ ███████            │  │ █████████          │
│ ███████████        │  │ █████████████      │
│              ○     │  │              ○     │
└────────────────────┘  └────────────────────┘
```

### Table Skeleton
Use table skeletons for Student Management, Requirement Management, Community Requests, Attendance, Service Hours, Evaluations, and Reports.

Rules:
- Keep the actual table header visible when its labels are already known.
- Show approximately **5–8 skeleton rows** for the first loading state.
- Each cell should use a short horizontal skeleton bar instead of one full-width block.
- Maintain the same row height as the final table, approximately **48–56px**.
- Action columns may use small rounded button placeholders.

### Form and Detail Page Skeleton
For profile, requirement details, request details, deployment details, and evaluation pages:
- Show label and value placeholders separately.
- Input-like content should use a full-width 44px skeleton block.
- Keep the final field spacing, usually **16px** between fields.
- Do not make disabled-looking real controls appear while loading; use dedicated skeleton shapes instead.

### DSS Skeleton
The DSS loading state should preserve the sequence and structure of the decision process without displaying fake scores.

Recommended loading areas:
1. Community request summary
2. Eligibility list
3. Quantification values
4. Normalized criteria
5. SAW computation area
6. Ranking and recommendation table

Rules:
- Never display temporary or fabricated DSS scores while computation is still running.
- Use neutral skeleton bars for score cells until the actual values are ready.
- The **Run Matching** button may change to a clear loading state after it is activated.
- Disable final approval actions until ranking and recommendations are fully available.

### Analytics Skeleton
For charts and analytics:
- Keep chart titles and filter controls visible if already available.
- Use a rectangular placeholder that matches the final chart dimensions.
- Summary cards above the chart should have their own skeleton states.
- Do not animate fake chart bars or lines that may be mistaken for actual results.

### Loading Animation
A subtle shimmer may move horizontally across skeleton blocks.

Recommended behavior:
- Duration: approximately **1.2–1.8 seconds** per cycle
- Motion: smooth and continuous
- Avoid fast flashing or high-contrast animation
- Respect reduced-motion preferences; use a static or gentle pulse skeleton when motion reduction is enabled

### When Not to Use Skeletons
Do not use skeleton loaders for:
- Very short button actions that finish almost immediately
- Simple confirmation dialogs
- Single small icons
- Immediate local interactions that do not require data fetching

For short actions, a button-level loading indicator or small spinner is more appropriate.

### Skeleton Consistency Rule
All three user roles should use the same skeleton colors, animation behavior, border radius, and spacing. Only the layout should change according to the actual screen being loaded.

---

## 13. Quick Design Tokens Summary
| Design Element | Standard |
|---|---|
| Primary Font | Inter |
| Background | `#FFFFFF` |
| Main Brand Color | `#0B3D2E` |
| Secondary Structural Color | `#145A3A` |
| Accent Color | `#2F7D5B` |
| Support Color | `#CBBFA6` |
| Main Text | `#1B1F23` |
| Button Radius | 8px |
| Card Radius | 12px |
| Standard Input Height | 44px |
| Body Font Size | 14–16px |

---

## 14. Final Palette Summary
- **Primary Dark Green:** `#0B3D2E`
- **Secondary Green:** `#145A3A`
- **Accent Green:** `#2F7D5B`
- **Support Beige:** `#CBBFA6`
- **Dark Neutral:** `#1B1F23`
- **White:** `#FFFFFF`

This palette gives CWTSConnect a clean, professional, and nature-inspired academic identity while keeping the interface simple and consistent.
