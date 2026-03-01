# Orchestration Plan: Scroll & Pagination Refinement

## Objective
The previous decoupling strategy successfully pinned the horizontal scrollbar and pagination, but caused a regression where the vertical scrollbar disappeared. Additionally, the CSS selectors for the pagination 'Next' (`>`) and 'Prev' (`<`) buttons did not successfully apply the violet opacitied background.

## Phase 1: Planning

### Issue 1: Missing Vertical Scrollbar
The CSS override `.absolute-table .ant-table-body { flex: 1; overflow-y: auto !important; max-height: none !important; }` combined with `scroll={{y: 1}}` appears to have broken the internal height calculation of the Ant Table body, causing it to clip instead of scroll, or expand beyond the viewport without a scrollbar.

**Proposed Fix:**
1. Re-introduce the `ResizeObserver` specifically for the `y` constraint inside the decouple flex container. The `ResizeObserver` was actually successful at calculating the vertical height, its only flaw was trying to account for the pagination *inside* the table wrapper. Since the Pagination is now physically separated as a flex sibling, the `ResizeObserver` only needs to measure the `<div className="absolute-table">` flex-child and subtract the table header height (~40px) to feed the exact pixel value into `scroll={{y: calculatedHeight}}`.
2. This ensures both native scrollbars appear seamlessly without CSS max-height hacks overriding Ant Design's internals.

### Issue 2: Pagination Arrow Styling
The previous selectors targeting `.ant-pagination-prev .ant-pagination-item-link` may be failing due to CSS specificity or the specific markup of Next.js/Ant Design v5. 

**Proposed Fix:**
1. Increase CSS selector specificity and use `button` or nested `span` targets if needed.
2. Target `.ant-pagination-item-link` directly under `.ant-pagination-prev` and `.ant-pagination-next` with `!important` tags for all properties (background, color, border-radius).
3. E.g.: 
```css
li.ant-pagination-prev > button.ant-pagination-item-link,
li.ant-pagination-next > button.ant-pagination-item-link {
    background-color: rgba(139, 92, 246, 0.1) !important;
    border-radius: 50% !important;
    color: #7c3aed !important;
}
```

## Phase 2: Implementation (Parallel)
- **`frontend-specialist`**: Execute the exact React component logic for the `ResizeObserver` on the `.absolute-table` container in `DataPreview` and `DocumentPreview`, and update the `globals.css` with the heavier specificities.
- **`devops-engineer`**: Execute the background docker container compilation.
